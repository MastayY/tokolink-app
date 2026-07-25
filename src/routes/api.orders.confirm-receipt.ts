// src/routes/api.orders.confirm-receipt.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { orderLookupSchema } from "@/lib/schemas";

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
          select: { bankCode: true, bankAccountNumber: true, bankAccountName: true },
        });

        await prisma.$transaction([
          prisma.order.update({
            where: { id: order.id },
            data: { status: "COMPLETED", completedAt: now },
          }),
          // NOTE — Orphaned Payout guard:
          // If tenant has NOT filled in bank details yet, no Payout row is created here.
          // The order still becomes COMPLETED (buyer confirmed receipt), which is correct.
          // The gap is caught by the cron in Plan C Task C8 (api/cron/payouts), which
          // also queries COMPLETED orders that have no associated Payout row and whose
          // tenant NOW has bank info — and creates the missing Payout row retroactively.
          // This means: seller filling in bank details later will eventually get paid
          // without any manual intervention.
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

        return Response.json({ success: true });
      },
    },
  },
});
