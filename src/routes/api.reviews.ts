// src/routes/api.reviews.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { reviewSubmitSchema } from "@/lib/schemas";

export const Route = createFileRoute("/api/reviews")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = reviewSubmitSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 422 });
        }

        const { orderId, orderCode, buyerPhone, rating, comment } = parsed.data;

        // Verify ownership (orderCode + phone acts as buyer auth)
        const order = await prisma.order.findFirst({
          where: { id: orderId, orderCode, buyerPhone, status: "COMPLETED" },
          include: { review: { select: { id: true } } },
        });

        if (!order) {
          return Response.json(
            { error: "Pesanan tidak ditemukan atau belum selesai" },
            { status: 404 }
          );
        }

        if (order.review) {
          return Response.json(
            { error: "Ulasan sudah pernah diberikan" },
            { status: 409 }
          );
        }

        await prisma.review.create({
          data: {
            orderId,
            tenantId: order.tenantId,
            rating,
            comment: comment ?? null,
          },
        });

        return Response.json({ success: true });
      },
    },
  },
});
