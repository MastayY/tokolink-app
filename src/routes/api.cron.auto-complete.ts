// src/routes/api.cron.auto-complete.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { isValidCronSecret } from "@/lib/auth-utils";

const DAYS_BEFORE_AUTO_COMPLETE = 7;

export const Route = createFileRoute("/api/cron/auto-complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isValidCronSecret(request.headers.get("authorization") ?? "")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const cutoff = new Date(Date.now() - DAYS_BEFORE_AUTO_COMPLETE * 24 * 60 * 60 * 1000);

        // Find orders that have been SHIPPED/DELIVERED for more than 7 days
        const staleOrders = await prisma.order.findMany({
          where: {
            status: { in: ["SHIPPED", "DELIVERED"] },
            shippedAt: { lte: cutoff },
          },
          include: {
            tenant: {
              select: { bankCode: true, bankAccountNumber: true, bankAccountName: true },
            },
          },
        });

        let completed = 0;
        let errors = 0;

        for (const order of staleOrders) {
          try {
            const now = new Date();
            const paidAtPlusBuffer = order.paidAt
              ? new Date(order.paidAt.getTime() + 3 * 24 * 60 * 60 * 1000)
              : now;
            const tomorrowFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const scheduledAt = paidAtPlusBuffer > tomorrowFromNow ? paidAtPlusBuffer : tomorrowFromNow;

            const { tenant } = order;
            await prisma.$transaction([
              prisma.order.update({
                where: { id: order.id },
                data: { status: "COMPLETED", completedAt: now },
              }),
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
                      update: { scheduledAt },
                    }),
                  ]
                : []),
            ]);
            completed++;
          } catch (err) {
            console.error(`[cron/auto-complete] Failed for order ${order.id}:`, err);
            errors++;
          }
        }

        console.log(`[cron/auto-complete] Completed: ${completed}, Errors: ${errors}`);
        return Response.json({ completed, errors, total: staleOrders.length });
      },
    },
  },
});
