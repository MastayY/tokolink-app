// src/routes/api.checkout.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { checkoutBodySchema } from "@/lib/schemas";
import { createSnapTransaction } from "@/lib/midtrans";
import { randomBytes } from "crypto";

function generateOrderCode(): string {
  return "TL-" + randomBytes(4).toString("hex").toUpperCase();
}

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = checkoutBodySchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 422 });
        }

        const {
          tenantId,
          buyerName,
          buyerPhone,
          shippingAddress,
          shippingAreaId,
          shippingAreaLabel,
          shippingCost,
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
            email: true,
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

        if (!tenant.shippingOriginAreaId) {
          return Response.json(
            { error: "Toko belum mengatur alamat asal pengiriman." },
            { status: 422 }
          );
        }

        // ── SECURITY: Re-verify prices + weights from DB ─────────────────────
        // NEVER trust client-supplied price. Anyone with DevTools can set price=1.
        // We re-fetch actual Product.basePrice + variant priceDelta from DB here
        // and REPLACE the client values entirely.
        const productIds = [...new Set(cartItems.map((i) => i.productId))];
        const products = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            tenantId, // also enforces all items belong to THIS store (not another tenant's product)
          },
          include: { variantGroups: { include: { options: true } } },
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
            let weightGrams = product.weightGrams;

            // If a variant is selected, add its priceDelta and use its weight override
            if (item.variantId) {
              const option = product.variantGroups
                .flatMap((g) => g.options)
                .find((o) => o.id === item.variantId);
              if (!option) {
                throw new Error(`Variant ${item.variantId} tidak ditemukan untuk produk ${item.productId}`);
              }
              unitPrice += option.priceDelta;
              weightGrams = option.weightGrams ?? weightGrams;
            }

            // Return item with server-verified price + weight; ignore client's values
            return { ...item, price: unitPrice, weightGrams };
          });
        } catch (err: any) {
          return Response.json({ error: err.message ?? "Data produk tidak valid" }, { status: 422 });
        }

        // Calculate financials (all IDR integer) — using VERIFIED prices
        const subtotal = verifiedItems.reduce((s, i) => s + i.price * i.qty, 0);
        const commissionPct = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? "5");
        const platformFee = Math.round(subtotal * commissionPct / 100);
        const sellerPayout = subtotal + shippingCost - platformFee;
        const grossAmount = subtotal + shippingCost;

        const orderCode = generateOrderCode();

        // Snap item list (product items + shipping line) — using VERIFIED prices
        const snapItems = [
          ...verifiedItems.map((i) => ({
            id: i.productId,
            name: i.name.slice(0, 50),
            price: i.price,
            quantity: i.qty,
          })),
          {
            id: "SHIPPING",
            name: `Ongkos Kirim (${courierCompany.toUpperCase()})`,
            price: shippingCost,
            quantity: 1,
          },
        ];

        // SAFETY: Persist Order to DB FIRST (status PENDING_PAYMENT), then create Snap token.
        let order: Awaited<ReturnType<typeof prisma.order.create>>;
        try {
          order = await prisma.order.create({
            data: {
              orderCode,
              tenantId,
              buyerName,
              buyerPhone,
              shippingAddress,
              shippingAreaId,
              shippingAreaLabel,
              subtotal,
              shippingCost,
              platformFee,
              sellerPayout,
              courierCompany,
              courierType,
              note: note ?? null,
              items: {
                create: verifiedItems.map((i) => ({
                  productId: i.productId,
                  variantId: i.variantId ?? null,
                  productName: i.name,
                  variantName: i.variantName ?? null,
                  qty: i.qty,
                  priceSnapshot: i.price,   // server-verified price
                  weightGrams: i.weightGrams, // server-verified weight
                })),
              },
            },
          });
        } catch (err) {
          console.error("[api/checkout] DB write failed:", err);
          return Response.json({ error: "Gagal membuat pesanan. Coba lagi." }, { status: 500 });
        }

        // Create Snap transaction — DB row already exists, safe to fail here
        let snapResult: { token: string; redirect_url: string };
        try {
          snapResult = await createSnapTransaction({
            orderId: orderCode, // Midtrans order_id = our orderCode
            grossAmount,
            buyerName,
            buyerPhone,
            items: snapItems,
          });
        } catch (err) {
          console.error("[api/checkout] Snap error:", err);
          // Mark order CANCELLED so the row is not left dangling as PENDING_PAYMENT forever
          await prisma.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED" },
          });
          return Response.json(
            { error: "Gagal membuat sesi pembayaran. Coba lagi." },
            { status: 502 }
          );
        }

        // Update order with the Snap token
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentToken: snapResult.token },
        });

        return Response.json({
          orderId: order.id,
          orderCode: order.orderCode,
          snapToken: snapResult.token,
        });
      },
    },
  },
});
