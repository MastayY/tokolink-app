// src/routes/api.orders.lookup.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { orderLookupSchema } from "@/lib/schemas";
import { checkRateLimit, orderLookupLimiter } from "@/lib/ratelimit";

export const Route = createFileRoute("/api/orders/lookup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // ── SECURITY: Rate limit ───────────────────────────────────────────
        const limited = await checkRateLimit(orderLookupLimiter, request);
        if (limited) return limited;

        const url = new URL(request.url);
        const parsed = orderLookupSchema.safeParse({
          orderCode: url.searchParams.get("orderCode"),
          phone: url.searchParams.get("phone"),
        });

        if (!parsed.success) {
          return Response.json({ error: "Parameter tidak valid" }, { status: 400 });
        }

        const order = await prisma.order.findFirst({
          where: {
            orderCode: parsed.data.orderCode,
            buyerPhone: parsed.data.phone,
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    isDigital: true,
                    digitalDeliveryType: true,
                  },
                },
              },
            },
            review: { select: { id: true } },
            tenant: { select: { name: true, slug: true } },
          },
        });

        if (!order) {
          return Response.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
        }

        return Response.json({ order });
      },
    },
  },
});
