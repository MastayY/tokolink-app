// src/routes/api.orders.lookup.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { orderLookupSchema } from "@/lib/schemas";

export const Route = createFileRoute("/api/orders/lookup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
            items: true,
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
