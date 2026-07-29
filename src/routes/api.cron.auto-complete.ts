// src/routes/api.cron.auto-complete.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { isValidCronSecret } from "@/lib/auth-utils";
import { markOrderCompleted } from "@/lib/order-lifecycle";

const DAYS_BEFORE_AUTO_COMPLETE = 7;

export const Route = createFileRoute("/api/cron/auto-complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isValidCronSecret(request.headers.get("authorization") ?? "")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const cutoff = new Date(Date.now() - DAYS_BEFORE_AUTO_COMPLETE * 24 * 60 * 60 * 1000);

        const staleOrders = await prisma.order.findMany({
          where: {
            status: { in: ["SHIPPED", "DELIVERED"] },
            shippedAt: { lte: cutoff },
          },
          select: { id: true },
        });

        let completed = 0;
        let errors = 0;

        for (const { id } of staleOrders) {
          try {
            await markOrderCompleted(id, { autoCompleted: true });
            completed++;
          } catch (err) {
            console.error(`[cron/auto-complete] Failed for order ${id}:`, err);
            errors++;
          }
        }

        console.log(`[cron/auto-complete] Completed: ${completed}, Errors: ${errors}`);
        return Response.json({ completed, errors, total: staleOrders.length });
      },
    },
  },
});
