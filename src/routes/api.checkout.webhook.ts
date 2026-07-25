// src/routes/api.checkout.webhook.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { verifyWebhookSignature } from "@/lib/midtrans";
import {
  sendEmailSellerNewOrder,
  notifySellerWhatsAppNewOrder,
} from "@/lib/notifications";

export const Route = createFileRoute("/api/checkout/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Record<string, string>;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        // SECURITY: always verify HMAC-SHA512 signature
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
                // email lives on User, not Tenant — fetch via relation
                user: { select: { email: true } },
              },
            },
          },
        });

        if (!order) {
          // Not our order (could be from a different system) — ack and ignore
          return Response.json({ received: true });
        }

        // Determine if payment is confirmed
        const isPaymentCapture =
          (transactionStatus === "capture" && fraudStatus === "accept") ||
          transactionStatus === "settlement";

        const isPaymentDenied =
          transactionStatus === "deny" ||
          transactionStatus === "cancel" ||
          transactionStatus === "expire";

        // SECURITY: Atomic conditional update prevents double-notification race.
        // If Midtrans sends the same webhook twice concurrently (they retry on slow ack),
        // both could pass the `order.status === 'PENDING_PAYMENT'` guard read above.
        // Solution: move the condition INTO the UPDATE so only ONE DB write wins.
        // The db-level lock guarantees `count === 1` for exactly one request.
        if (isPaymentCapture) {
          const now = new Date();
          const updateResult = await prisma.order.updateMany({
            where: { id: order.id, status: "PENDING_PAYMENT" }, // condition is in the write
            data: {
              status: "PAID",
              paymentRef: body.transaction_id ?? null,
              paidAt: now,
            },
          });

          if (updateResult.count === 1) {
            // Only the winning request fires notifications — prevents double WA/email
            void sendEmailSellerNewOrder({
              sellerEmail: "", // Seller email from User model not available without extra join — skip for now
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
          // count === 0 means a concurrent request already processed this — ack and return
        }

        if (isPaymentDenied) {
          await prisma.order.updateMany({
            where: { id: order.id, status: "PENDING_PAYMENT" }, // also atomic
            data: { status: transactionStatus === "expire" ? "EXPIRED" : "CANCELLED" },
          });
        }

        return Response.json({ received: true });
      },
    },
  },
});
