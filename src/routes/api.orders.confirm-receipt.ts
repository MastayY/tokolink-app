// src/routes/api.orders.confirm-receipt.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { orderLookupSchema } from "@/lib/schemas";
import { sendEmailSellerOrderCompleted } from "@/lib/notifications";

export const Route = createFileRoute("/api/orders/confirm-receipt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = orderLookupSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Data tidak valid" }, { status: 422 });
        }

        const order = await prisma.order.findFirst({
          where: {
            orderCode: parsed.data.orderCode,
            buyerPhone: parsed.data.phone,
          },
        });

        if (!order) {
          return Response.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
        }

        if (!["SHIPPED", "DELIVERED"].includes(order.status)) {
          return Response.json(
            { error: "Pesanan belum dikirim" },
            { status: 409 }
          );
        }

        const now = new Date();
        // Schedule payout: MAX(now + 1 day, paidAt + 3 days) to account for Snap settlement
        const paidAtPlusBuffer = order.paidAt
          ? new Date(order.paidAt.getTime() + 3 * 24 * 60 * 60 * 1000)
          : now;
        const tomorrowFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const scheduledAt = paidAtPlusBuffer > tomorrowFromNow ? paidAtPlusBuffer : tomorrowFromNow;

        const tenant = await prisma.tenant.findUnique({
          where: { id: order.tenantId },
          select: {
            name: true,
            bankCode: true,
            bankAccountNumber: true,
            bankAccountName: true,
            user: { select: { email: true } },
          },
        });

        await prisma.$transaction([
          prisma.order.update({
            where: { id: order.id },
            data: { status: "COMPLETED", completedAt: now },
          }),
          // NOTE — Orphaned Payout guard:
          // If tenant has NOT filled in bank details yet, no Payout row is created here.
          // The gap is caught by the cron in api/cron/payouts which queries COMPLETED orders
          // that have no associated Payout row and whose tenant NOW has bank info.
          ...(tenant?.bankCode && tenant?.bankAccountNumber && tenant?.bankAccountName
            ? [
                prisma.payout.upsert({
                  where: { orderId: order.id },
                  create: {
                    orderId: order.id,
                    tenantId: order.tenantId,
                    amount: order.sellerPayout,
                    bankCode: tenant.bankCode,
                    bankAccountNumber: tenant.bankAccountNumber,
                    bankAccountName: tenant.bankAccountName,
                    scheduledAt,
                  },
                  update: { scheduledAt }, // idempotent: refresh schedule if already exists
                }),
              ]
            : []),
        ]);

        // Notify seller that order is completed (fire-and-forget)
        if (tenant?.user?.email) {
          void sendEmailSellerOrderCompleted({
            sellerEmail: tenant.user.email,
            sellerName: tenant.name,
            orderCode: order.orderCode,
            sellerPayout: order.sellerPayout,
            autoCompleted: false,
          });
        }

        return Response.json({ success: true });
      },
    },
  },
});
