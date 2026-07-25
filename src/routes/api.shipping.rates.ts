// src/routes/api.shipping.rates.ts
import { createFileRoute } from "@tanstack/react-router";
import { getBiteshipRates } from "@/lib/biteship";
import { prisma } from "@/db";
import { shippingRateBodySchema } from "@/lib/schemas";

export const Route = createFileRoute("/api/shipping/rates")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = shippingRateBodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 422 });
        }

        const { tenantId, destinationAreaId, cartItems } = parsed.data;

        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { shippingOriginAreaId: true },
        });

        if (!tenant?.shippingOriginAreaId) {
          return Response.json(
            { error: "Toko belum mengatur alamat asal pengiriman." },
            { status: 422 }
          );
        }

        try {
          const rates = await getBiteshipRates({
            originAreaId: tenant.shippingOriginAreaId,
            destinationAreaId,
            items: cartItems.map((i) => ({
              name: i.name,
              value: i.price,
              weight: i.weightGrams,
              quantity: i.qty,
            })),
          });
          return Response.json({ rates });
        } catch (err) {
          console.error("[api/shipping/rates]", err);
          return Response.json({ error: "Gagal mengambil tarif pengiriman" }, { status: 502 });
        }
      },
    },
  },
});
