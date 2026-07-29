// src/routes/api.shipping.rates.ts
import { createFileRoute } from "@tanstack/react-router";
import { getBiteshipRates } from "@/lib/biteship";
import { prisma } from "@/db";
import { shippingRateBodySchema } from "@/lib/schemas";
import { checkRateLimit, shippingRatesLimiter, redis } from "@/lib/ratelimit";

/** TTL for cached shipping rates in seconds (15 minutes). */
const SHIPPING_CACHE_TTL = 900;

/**
 * Build a deterministic Upstash key for a set of shipping rates.
 * Same key is used at checkout to look up the cached quote.
 * Key is scoped to tenant (origin) + destination + total weight.
 */
export function buildShippingCacheKey(
  tenantId: string,
  destinationAreaId: string,
  totalWeightGrams: number,
): string {
  return `shippingRates:${tenantId}:${destinationAreaId}:${totalWeightGrams}`;
}

export const Route = createFileRoute("/api/shipping/rates")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── SECURITY: Rate limit ───────────────────────────────────────────
        const limited = await checkRateLimit(shippingRatesLimiter, request);
        if (limited) return limited;

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

          // ── Cache rates server-side so checkout can verify price ─────────
          const totalWeightGrams = cartItems.reduce(
            (sum, i) => sum + i.weightGrams * i.qty,
            0,
          );
          const cacheKey = buildShippingCacheKey(tenantId, destinationAreaId, totalWeightGrams);

          // Fire-and-forget: don't block the response on cache write
          void redis.set(cacheKey, JSON.stringify(rates), { ex: SHIPPING_CACHE_TTL });

          return Response.json({ rates });
        } catch (err) {
          console.error("[api/shipping/rates]", err);
          return Response.json({ error: "Gagal mengambil tarif pengiriman" }, { status: 502 });
        }
      },
    },
  },
});
