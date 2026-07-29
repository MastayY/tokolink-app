// src/routes/api.checkout.cancel.ts
// Called by the client when the user closes the Midtrans Snap popup without paying.
// Immediately marks the order CANCELLED so it doesn't pollute the seller's dashboard
// with zombie PENDING_PAYMENT orders that would otherwise linger until webhook expiry (~24h).
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { z } from "zod";

const bodySchema = z.object({
  orderCode: z.string().min(1),
});

export const Route = createFileRoute("/api/checkout/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "orderCode required" }, { status: 422 });
        }

        const { orderCode } = parsed.data;

        // Only cancel if still PENDING_PAYMENT — safe to call multiple times (idempotent)
        const result = await prisma.order.updateMany({
          where: { orderCode, status: "PENDING_PAYMENT" },
          data: { status: "CANCELLED" },
        });

        console.log(
          result.count > 0
            ? `[api/checkout/cancel] Cancelled order ${orderCode} (user closed Snap popup)`
            : `[api/checkout/cancel] Order ${orderCode} already past PENDING_PAYMENT — no-op`
        );

        return Response.json({ cancelled: result.count > 0 });
      },
    },
  },
});
