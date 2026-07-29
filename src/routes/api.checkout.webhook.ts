// src/routes/api.checkout.webhook.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { verifyWebhookSignature, getMidtransTransactionStatus } from "@/lib/midtrans";
import {
  sendEmailSellerNewOrder,
  notifySellerWhatsAppNewOrder,
  alertAdminPayoutFailed,
  notifyBuyerWhatsAppPaid,
  notifyBuyerWhatsAppDigitalDelivery,
} from "@/lib/notifications";
import { checkRateLimit, webhookLimiter } from "@/lib/ratelimit";
import { renderDeliveryText } from "@/lib/digital-delivery";
import { checkAndCompleteOrderIfEligible } from "@/lib/order-lifecycle";

export const Route = createFileRoute("/api/checkout/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── SECURITY: Rate limit ───────────────────────────────────────────
        const limited = await checkRateLimit(webhookLimiter, request);
        if (limited) return limited;

        let body: Record<string, string>;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        // ── SECURITY: Layer 1 — HMAC-SHA512 signature ─────────────────────
        const isValid = verifyWebhookSignature({
          orderId: body.order_id ?? "",
          statusCode: body.status_code ?? "",
          grossAmount: body.gross_amount ?? "",
          signatureKey: body.signature_key ?? "",
        });

        if (!isValid) {
          console.warn("[webhook] Invalid signature for order:", body.order_id);
          return Response.json({ error: "Invalid signature" }, { status: 401 });
        }

        const orderCode = body.order_id;
        const transactionStatus = body.transaction_status;
        const fraudStatus = body.fraud_status;

        // Idempotency: find existing order
        const order = await prisma.order.findUnique({
          where: { orderCode },
          include: {
            tenant: {
              select: {
                name: true,
                slug: true,
                whatsapp: true,
                bankCode: true,
                bankAccountNumber: true,
                bankAccountName: true,
                user: { select: { email: true } },
              },
            },
          },
        });

        if (!order) {
          // Not our order — ack and ignore
          return Response.json({ received: true });
        }

        const isPaymentCapture =
          (transactionStatus === "capture" && fraudStatus === "accept") ||
          transactionStatus === "settlement";

        const isPaymentDenied =
          transactionStatus === "deny" ||
          transactionStatus === "cancel" ||
          transactionStatus === "expire";

        // ── SECURITY: Layer 2 — Independent Midtrans status API check ──────
        // Only for payment-capture events. Denials are lower-risk and can be
        // processed from the webhook payload alone.
        if (isPaymentCapture) {
          let statusData: Awaited<ReturnType<typeof getMidtransTransactionStatus>>;
          try {
            statusData = await getMidtransTransactionStatus(orderCode);
          } catch (err) {
            console.error("[webhook] Midtrans status API call failed:", err);
            // Return 200 to prevent Midtrans from retrying aggressively.
            // Manual reconciliation handles persistent failures.
            return Response.json({ received: true });
          }

          // Verify Midtrans's own systems confirm the transaction is paid
          const midtransConfirmed =
            statusData.status_code === "200" &&
            (statusData.transaction_status === "settlement" ||
              (statusData.transaction_status === "capture" &&
                statusData.fraud_status === "accept"));

          if (!midtransConfirmed) {
            console.warn(
              "[webhook] Midtrans status API disagrees with webhook payload.",
              {
                orderCode,
                webhookStatus: transactionStatus,
                apiStatus: statusData.transaction_status,
              },
            );
            // Return 200 — do NOT mark as paid. Log for manual review.
            return Response.json({ received: true });
          }

          // Verify gross_amount from Midtrans API matches our DB record
          // Compare against DB (not webhook payload) — deepest check
          const apiGrossAmount = Math.round(parseFloat(statusData.gross_amount));
          const dbGrossAmount = order.subtotal + order.shippingCost;
          if (apiGrossAmount !== dbGrossAmount) {
            console.error(
              "[webhook] AMOUNT MISMATCH — Midtrans API gross_amount differs from DB.",
              { orderCode, apiGrossAmount, dbGrossAmount },
            );
            return Response.json({ received: true });
          }

          // ── Both layers passed — process payment ────────────────────────
          // Atomic conditional update prevents double-notification on concurrent retries
          const now = new Date();
          const updateResult = await prisma.order.updateMany({
            where: { id: order.id, status: "PENDING_PAYMENT" },
            data: {
              status: "PAID",
              paymentRef: body.transaction_id ?? null,
              paidAt: now,
            },
          });

          if (updateResult.count === 1) {
            // Send WA notification to Buyer confirming payment received
            if (order.buyerPhone) {
              void notifyBuyerWhatsAppPaid({
                buyerPhone: order.buyerPhone,
                buyerName: order.buyerName,
                orderCode: order.orderCode,
                storeName: order.tenant.name,
                storeSlug: order.tenant.slug,
              });
            }

            // Fetch items with product config for stock + digital delivery
            const itemsWithProduct = await prisma.orderItem.findMany({
              where: { orderId: order.id },
              include: {
                product: {
                  select: {
                    isDigital: true,
                    trackStock: true,
                    digitalDeliveryType: true,
                    digitalDeliveryText: true,
                  },
                },
              },
            });

            // ── Stock: atomic conditional decrement ───────────────────────
            const stockItems = itemsWithProduct.filter((i) => i.product?.trackStock && i.productId);
            if (stockItems.length > 0) {
              const decrementResults = await Promise.all(
                stockItems.map((item) =>
                  prisma.product.updateMany({
                    where: { id: item.productId!, stock: { gte: item.qty } },
                    data: { stock: { decrement: item.qty } },
                  }),
                ),
              );
              const oversold = decrementResults.some((r) => r.count === 0);
              if (oversold) {
                console.error(
                  `[webhook] OVERSELL DETECTED for order ${order.orderCode} — admin alert fired`,
                  { orderId: order.id },
                );
                void alertAdminPayoutFailed({
                  orderCode: order.orderCode,
                  tenantId: order.tenantId,
                  amount: order.subtotal,
                  failureReason: `OVERSELL: stok habis saat atomic decrement pada order ${order.orderCode}. Cek manual dan refund jika perlu.`,
                });
              }
            }

            // ── Digital: auto-deliver AUTO_TEXT items ──────────────────────
            const autoTextItems = itemsWithProduct.filter(
              (item) =>
                item.product?.isDigital &&
                item.product?.digitalDeliveryType === "AUTO_TEXT" &&
                item.product?.digitalDeliveryText,
            );

            if (autoTextItems.length > 0) {
              const deliveryNow = new Date();
              await Promise.all(
                autoTextItems.map(async (item) => {
                  const snapshot = renderDeliveryText(item.product!.digitalDeliveryText!, {
                    buyerName: order.buyerName,
                    orderCode: order.orderCode,
                  });
                  await prisma.orderItem.update({
                    where: { id: item.id },
                    data: {
                      deliveredAt: deliveryNow,
                      digitalDeliverySnapshot: snapshot,
                    },
                  });

                  // Send digital product via WhatsApp directly to buyer
                  if (order.buyerPhone) {
                    void notifyBuyerWhatsAppDigitalDelivery({
                      buyerPhone: order.buyerPhone,
                      buyerName: order.buyerName,
                      orderCode: order.orderCode,
                      storeName: order.tenant.name,
                      storeSlug: order.tenant.slug,
                      productName: item.productName,
                      digitalDeliverySnapshot: snapshot,
                    });
                  }
                }),
              );

              // If pure-digital and all items now delivered → complete immediately
              await checkAndCompleteOrderIfEligible(order.id);
            }

            // Only the winning request fires notifications
            void sendEmailSellerNewOrder({
              sellerEmail: order.tenant.user.email,
              sellerName: order.tenant.name,
              orderCode,
              buyerName: order.buyerName,
              subtotal: order.subtotal,
            });

            if (order.tenant.whatsapp) {
              void notifySellerWhatsAppNewOrder({
                sellerPhone: order.tenant.whatsapp,
                orderCode,
                buyerName: order.buyerName,
                subtotal: order.subtotal,
              });
            }
          }
        }

        if (isPaymentDenied) {
          await prisma.order.updateMany({
            where: { id: order.id, status: "PENDING_PAYMENT" },
            data: { status: transactionStatus === "expire" ? "EXPIRED" : "CANCELLED" },
          });
        }

        return Response.json({ received: true });
      },
    },
  },
});
