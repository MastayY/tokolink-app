// src/routes/api.orders.confirm-receipt.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { orderLookupSchema } from "@/lib/schemas";
import { markOrderCompleted } from "@/lib/order-lifecycle";

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
          return Response.json({ error: "Pesanan belum dikirim" }, { status: 409 });
        }

        await markOrderCompleted(order.id, { autoCompleted: false });

        return Response.json({ success: true });
      },
    },
  },
});
