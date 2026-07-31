// src/routes/api.checkout.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { checkoutBodySchema } from "@/lib/schemas";
import { createSnapTransaction } from "@/lib/midtrans";
import { getBiteshipRates, type BiteshipCourierRate } from "@/lib/biteship";
import { checkRateLimit, checkoutLimiter, redis } from "@/lib/ratelimit";
import { buildShippingCacheKey } from "./api.shipping.rates";
import { randomBytes } from "crypto";

function generateOrderCode(): string {
  return "TL-" + randomBytes(4).toString("hex").toUpperCase();
}

type StockReservation = { productId?: string; variantId?: string; qty: number; wasVariant: boolean };

/** Sanitize error messages to prevent leaking internal UUIDs, DB errors, or technical details to users. */
function sanitizeErrorMessage(rawMessage: string | undefined, fallback: string): string {
  if (!rawMessage) return fallback;
  if (
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(rawMessage) ||
    /prisma|postgres|database|sql|invocation|uuid/i.test(rawMessage)
  ) {
    return fallback;
  }
  return rawMessage;
}

/** Release stock reservations made during pre-reservation on checkout failure. */
async function releaseStockReservations(
  reservations: StockReservation[],
): Promise<void> {
  await Promise.all(
    reservations.map((r) => {
      if (r.wasVariant && r.variantId) {
        return prisma.productVariantOption.updateMany({
          where: { id: r.variantId },
          data: { stock: { increment: r.qty } },
        });
      } else if (r.productId) {
        return prisma.product.updateMany({
          where: { id: r.productId },
          data: { stock: { increment: r.qty } },
        });
      }
      return Promise.resolve();
    }),
  );
}

/** Resolve server-authoritative shipping cost from Upstash cache or Biteship fallback. */
async function resolveShippingCost(params: {
  tenantId: string;
  destinationAreaId: string;
  totalWeightGrams: number;
  courierCompany: string;
  courierType: string;
  originAreaId: string;
  cartItems: Array<{ name: string; price: number; weightGrams: number; qty: number }>;
}): Promise<{ cost: number; updatedFromServer: boolean }> {
  const cacheKey = buildShippingCacheKey(
    params.tenantId,
    params.destinationAreaId,
    params.totalWeightGrams,
  );

  // Try cache first
  const cached = await redis.get<string>(cacheKey);
  if (cached) {
    let rates: BiteshipCourierRate[];
    try {
      rates = typeof cached === "string" ? JSON.parse(cached) : (cached as unknown as BiteshipCourierRate[]);
    } catch {
      rates = [];
    }
    const match = rates.find(
      (r) =>
        r.courier_code === params.courierCompany &&
        r.courier_service_code === params.courierType,
    );
    if (match) return { cost: match.price, updatedFromServer: false };
  }

  // Cache miss — re-fetch from Biteship server-side
  const freshRates = await getBiteshipRates({
    originAreaId: params.originAreaId,
    destinationAreaId: params.destinationAreaId,
    items: params.cartItems.map((i) => ({
      name: i.name,
      value: i.price,
      weight: i.weightGrams,
      quantity: i.qty,
    })),
  });

  // Refresh cache for next call
  void redis.set(cacheKey, JSON.stringify(freshRates), { ex: 900 });

  const match = freshRates.find(
    (r) =>
      r.courier_code === params.courierCompany &&
      r.courier_service_code === params.courierType,
  );

  if (!match) {
    throw new Error("Opsi kurir tidak tersedia. Pilih ulang pengiriman.");
  }

  return { cost: match.price, updatedFromServer: true };
}

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── SECURITY: Rate limit ───────────────────────────────────────────
        const limited = await checkRateLimit(checkoutLimiter, request);
        if (limited) return limited;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = checkoutBodySchema.safeParse(body);
        if (!parsed.success) {
          const firstMessage = parsed.error.issues[0]?.message ?? "Data checkout tidak valid";
          return Response.json({ error: firstMessage }, { status: 422 });
        }

        const {
          tenantId,
          buyerName,
          buyerPhone,
          shippingAddress,
          shippingAreaId,
          shippingAreaLabel,
          // shippingCost from client is intentionally NOT used — server resolves it from cache
          courierCompany,
          courierType,
          cartItems,
          note,
        } = parsed.data;

        // Verify tenant exists and has shipping configured
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            slug: true,
            whatsapp: true,
            shippingOriginAreaId: true,
            bankCode: true,
            bankAccountNumber: true,
            bankAccountName: true,
          },
        });

        if (!tenant) {
          return Response.json({ error: "Toko tidak ditemukan" }, { status: 404 });
        }

        // ── SECURITY: Re-verify prices + weights from DB ──────────────────
        const productIds = [...new Set(cartItems.map((i) => i.productId))];
        const products = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            tenantId,
          },
          include: {
            variantGroups: {
              include: {
                options: {
                  select: { id: true, priceDelta: true, weightGrams: true, stock: true },
                },
              },
            },
          },
        });

        if (products.length !== productIds.length) {
          return Response.json(
            { error: "Satu atau lebih produk tidak ditemukan di toko ini." },
            { status: 422 }
          );
        }

        let verifiedItems: typeof cartItems;
        try {
          verifiedItems = cartItems.map((item) => {
            const product = products.find((p) => p.id === item.productId)!;
            let unitPrice = product.basePrice;
            let weightGrams = product.isDigital ? 0 : product.weightGrams;

            if (item.variantId) {
              const selectedOptionIds = item.variantId.split(",").map((s) => s.trim()).filter(Boolean);
              const allOptions = product.variantGroups.flatMap((g) => g.options);
              const matchedOptions = allOptions.filter((o) => selectedOptionIds.includes(o.id));

              if (matchedOptions.length === 0) {
                throw new Error(`Varian "${item.variantName || item.name}" tidak ditemukan. Silakan perbarui keranjang Anda.`);
              }

              for (const option of matchedOptions) {
                unitPrice += option.priceDelta;
                weightGrams = option.weightGrams ?? weightGrams;
              }
            }

            return { ...item, price: unitPrice, weightGrams };
          });
        } catch (err: any) {
          const safeMessage = sanitizeErrorMessage(err?.message, "Data produk tidak valid. Silakan perbarui keranjang Anda.");
          return Response.json({ error: safeMessage }, { status: 422 });
        }

        // ── Stock: Atomic pre-reservation (variant-aware) ─────────────────────
        const stockReservations: StockReservation[] = [];
        const stockErrors: string[] = [];

        for (const item of verifiedItems) {
          const product = products.find((p) => p.id === item.productId)!;
          if (!product.trackStock) continue;

          if (item.variantId) {
            const selectedOptionIds = item.variantId.split(",").map((s) => s.trim()).filter(Boolean);
            const allOptions = product.variantGroups.flatMap((g) => g.options);
            const matchedOptions = allOptions.filter((o) => selectedOptionIds.includes(o.id));

            for (const option of matchedOptions) {
              if (option.stock !== null) {
                const result = await prisma.productVariantOption.updateMany({
                  where: { id: option.id, stock: { gte: item.qty } },
                  data: { stock: { decrement: item.qty } },
                });
                if (result.count === 0) {
                  stockErrors.push(`Stok varian "${item.variantName ?? item.name}" tidak mencukupi.`);
                } else {
                  stockReservations.push({ variantId: option.id, qty: item.qty, wasVariant: true });
                }
              }
            }
          } else {
            if (product.stock !== null) {
              const result = await prisma.product.updateMany({
                where: { id: item.productId, stock: { gte: item.qty } },
                data: { stock: { decrement: item.qty } },
              });
              if (result.count === 0) {
                stockErrors.push(`Stok "${product.name}" tidak mencukupi (tersisa ${product.stock ?? 0}).`);
              } else {
                stockReservations.push({ productId: item.productId, qty: item.qty, wasVariant: false });
              }
            }
          }
        }

        if (stockErrors.length > 0) {
          await releaseStockReservations(stockReservations);
          return Response.json({ error: stockErrors[0] }, { status: 409 });
        }

        // ── Digital-only detection ─────────────────────────────────────────────────────
        const hasPhysicalItem = verifiedItems.some((item) => {
          const product = products.find((p) => p.id === item.productId)!;
          return !product.isDigital;
        });

        if (hasPhysicalItem && !shippingAreaId) {
          return Response.json(
            { error: "Produk fisik dalam keranjang memerlukan data pengiriman." },
            { status: 422 },
          );
        }

        if (hasPhysicalItem && !tenant.shippingOriginAreaId) {
          return Response.json(
            { error: "Toko belum mengatur alamat asal pengiriman." },
            { status: 422 },
          );
        }

        // ── SECURITY: Resolve shipping cost from server-side cache ─────────
        let serverShippingCost = 0;
        let shippingCostUpdated = false;

        if (hasPhysicalItem) {
          const totalWeightGrams = verifiedItems.reduce((s, i) => s + i.weightGrams * i.qty, 0);
          try {
            const resolved = await resolveShippingCost({
              tenantId,
              destinationAreaId: shippingAreaId!,
              totalWeightGrams,
              courierCompany: courierCompany!,
              courierType: courierType!,
              originAreaId: tenant.shippingOriginAreaId!,
              cartItems: verifiedItems.map((i) => ({
                name: i.name,
                price: i.price,
                weightGrams: i.weightGrams,
                qty: i.qty,
              })),
            });
            serverShippingCost = resolved.cost;
            shippingCostUpdated = resolved.updatedFromServer;
          } catch (err: any) {
            const safeMessage = sanitizeErrorMessage(err?.message, "Gagal memverifikasi tarif pengiriman. Silakan coba lagi.");
            return Response.json(
              { error: safeMessage },
              { status: 422 },
            );
          }
        }

        // Calculate financials using server-verified shipping cost
        const subtotal = verifiedItems.reduce((s, i) => s + i.price * i.qty, 0);
        const commissionPct = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? "5");
        const platformFee = Math.round(subtotal * commissionPct / 100);
        const sellerPayout = subtotal + serverShippingCost - platformFee;
        const grossAmount = subtotal + serverShippingCost;

        const orderCode = generateOrderCode();

        const snapItems = [
          ...verifiedItems.map((i) => ({
            id: i.productId,
            name: i.name.slice(0, 50),
            price: i.price,
            quantity: i.qty,
          })),
          ...(hasPhysicalItem && serverShippingCost > 0
            ? [{
                id: "SHIPPING",
                name: `Ongkos Kirim (${(courierCompany ?? "KURIR").toUpperCase()})`,
                price: serverShippingCost,
                quantity: 1,
              }]
            : []),
        ];

        let order: Awaited<ReturnType<typeof prisma.order.create>>;
        try {
          order = await prisma.order.create({
            data: {
              orderCode,
              tenantId,
              buyerName,
              buyerPhone,
              shippingAddress: shippingAddress ?? "",
              shippingAreaId: shippingAreaId ?? null,
              shippingAreaLabel: shippingAreaLabel ?? null,
              subtotal,
              shippingCost: serverShippingCost,  // server-authoritative, not client value
              platformFee,
              sellerPayout,
              courierCompany: hasPhysicalItem ? (courierCompany ?? null) : null,
              courierType: hasPhysicalItem ? (courierType ?? null) : null,
              note: note ?? null,
              items: {
                create: verifiedItems.map((i) => ({
                  productId: i.productId,
                  variantId: i.variantId ?? null,
                  productName: i.name,
                  variantName: i.variantName ?? null,
                  qty: i.qty,
                  priceSnapshot: i.price,
                  weightGrams: i.weightGrams,
                })),
              },
            },
          });
        } catch (err) {
          console.error("[api/checkout] DB write failed:", err);
          await releaseStockReservations(stockReservations);
          return Response.json({ error: "Gagal membuat pesanan. Coba lagi." }, { status: 500 });
        }

        let snapResult: { token: string; redirect_url: string };
        try {
          snapResult = await createSnapTransaction({
            orderId: orderCode,
            grossAmount,
            buyerName,
            buyerPhone,
            items: snapItems,
          });
        } catch (err) {
          console.error("[api/checkout] Snap error:", err);
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });
          await releaseStockReservations(stockReservations);
          return Response.json(
            { error: "Gagal membuat sesi pembayaran. Coba lagi." },
            { status: 502 }
          );
        }

        await prisma.order.update({
          where: { id: order.id },
          data: { paymentToken: snapResult.token },
        });

        return Response.json({
          orderId: order.id,
          orderCode: order.orderCode,
          snapToken: snapResult.token,
          // Inform frontend if server updated the shipping price during cache miss
          shippingCostUpdated,
          serverShippingCost,
        });
      },
    },
  },
});
