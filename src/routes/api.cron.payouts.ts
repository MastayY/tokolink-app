// src/routes/api.cron.payouts.ts
import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/db";
import { executeIrisPayout } from "@/lib/midtrans";
import { isValidCronSecret } from "@/lib/auth-utils";
import {
  sendEmailSellerPayoutSuccess,
  notifySellerWhatsAppPayoutSuccess,
  sendEmailSellerPayoutFailed,
  alertAdminPayoutFailed,
} from "@/lib/notifications";

export const Route = createFileRoute("/api/cron/payouts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isValidCronSecret(request.headers.get("authorization") ?? "")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();

        // ── Phase 0: Expire zombie PENDING_PAYMENT orders ───────────────────
        // Safety net for cases where the client-side cancel API call failed
        // (e.g. user had no network, or closed the browser tab entirely).
        // Midtrans Snap tokens expire after 24h, so we mark anything older
        // than 25h as EXPIRED to keep the seller dashboard clean.
        const expiryCutoff = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
        const expired = await prisma.order.updateMany({
          where: {
            status: "PENDING_PAYMENT",
            createdAt: { lte: expiryCutoff },
          },
          data: { status: "EXPIRED" },
        });
        if (expired.count > 0) {
          console.log(`[cron/payouts] Expired ${expired.count} zombie PENDING_PAYMENT orders`);
        }

        // ── Phase 1: Backfill orphaned payouts ──────────────────────────────
        // Catch orders that were COMPLETED while the seller had no bank info.
        // Now that the seller may have filled it in, create the missing Payout row.
        const orphanedOrders = await prisma.order.findMany({
          where: {
            status: "COMPLETED",
            payout: null, // no Payout row exists yet
          },
          include: {
            tenant: {
              select: { bankCode: true, bankAccountNumber: true, bankAccountName: true },
            },
          },
          take: 50,
        });

        let backfilled = 0;
        for (const order of orphanedOrders) {
          const { tenant } = order;
          if (!tenant?.bankCode || !tenant?.bankAccountNumber || !tenant?.bankAccountName) {
            continue; // seller still hasn't filled bank info — skip, check again next run
          }
          // Schedule payout: MAX(completedAt + 1d, paidAt + 3d) — same formula as confirm-receipt
          const completedPlusOne = order.completedAt
            ? new Date(order.completedAt.getTime() + 24 * 60 * 60 * 1000)
            : now;
          const paidPlusThree = order.paidAt
            ? new Date(order.paidAt.getTime() + 3 * 24 * 60 * 60 * 1000)
            : now;
          const scheduledAt = completedPlusOne > paidPlusThree ? completedPlusOne : paidPlusThree;

          try {
            await prisma.payout.create({
              data: {
                orderId: order.id,
                tenantId: order.tenantId,
                amount: order.sellerPayout,
                bankCode: tenant.bankCode,
                bankAccountNumber: tenant.bankAccountNumber,
                bankAccountName: tenant.bankAccountName,
                scheduledAt,
              },
            });
            backfilled++;
          } catch {
            // upsert-like safety: if already exists (race condition), ignore duplicate
          }
        }

        if (backfilled > 0) {
          console.log(`[cron/payouts] Backfilled ${backfilled} orphaned payout rows`);
        }

        // ── Phase 2: Disburse due payouts via Iris ──────────────────────────
        // Find payouts scheduled for today or earlier, not yet processed
        const duePayout = await prisma.payout.findMany({
          where: {
            status: "SCHEDULED",
            scheduledAt: { lte: now },
          },
          take: 50, // process max 50 per cron run to avoid timeouts
        });

        let paid = 0;
        let failed = 0;

        for (const payout of duePayout) {
          // SECURITY: Atomic per-row claim via updateMany.
          const claim = await prisma.payout.updateMany({
            where: { id: payout.id, status: "SCHEDULED" }, // atomic claim
            data: { status: "PROCESSING" },
          });
          if (claim.count === 0) {
            // Another invocation already claimed this payout — skip it
            continue;
          }
          try {
            const result = await executeIrisPayout({
              beneficiaryName: payout.bankAccountName,
              beneficiaryAccount: payout.bankAccountNumber,
              beneficiaryBank: payout.bankCode,
              amount: payout.amount,
              notes: `Tokolink payout untuk order ${payout.orderId}`,
            });

            await prisma.payout.update({
              where: { id: payout.id },
              data: {
                status: "PAID",
                irisReferenceNo: result.reference_no,
                paidAt: now,
              },
            });

            // Opsi B: secondary lookup for seller contact info
            const sellerInfo = await prisma.tenant.findUnique({
              where: { id: payout.tenantId },
              select: { name: true, whatsapp: true, user: { select: { email: true } } },
            });
            if (sellerInfo) {
              void sendEmailSellerPayoutSuccess({
                sellerEmail: sellerInfo.user?.email ?? "",
                sellerName: sellerInfo.name,
                orderCode: payout.orderId,
                amount: payout.amount,
                bankAccountNumber: payout.bankAccountNumber,
              });
              if (sellerInfo.whatsapp) {
                void notifySellerWhatsAppPayoutSuccess({
                  sellerPhone: sellerInfo.whatsapp,
                  orderCode: payout.orderId,
                  amount: payout.amount,
                });
              }
            }

            paid++;
          } catch (err: any) {
            console.error(`[cron/payouts] Iris failed for payout ${payout.id}:`, err);
            const failureReason = err.message ?? "Iris API error";
            await prisma.payout.update({
              where: { id: payout.id },
              data: {
                status: "FAILED",
                failureReason,
              },
            });

            // Opsi B: secondary lookup for seller contact info
            const sellerInfoFail = await prisma.tenant.findUnique({
              where: { id: payout.tenantId },
              select: { name: true, user: { select: { email: true } } },
            });
            if (sellerInfoFail) {
              void sendEmailSellerPayoutFailed({
                sellerEmail: sellerInfoFail.user?.email ?? "",
                sellerName: sellerInfoFail.name,
                orderCode: payout.orderId,
                amount: payout.amount,
              });
            }
            void alertAdminPayoutFailed({
              orderCode: payout.orderId,
              tenantId: payout.tenantId,
              amount: payout.amount,
              failureReason,
            });

            failed++;
          }
        }

        console.log(`[cron/payouts] Paid: ${paid}, Failed: ${failed}, Total: ${duePayout.length}, Backfilled: ${backfilled}`);
        return Response.json({ paid, failed, total: duePayout.length, backfilled });
      },
    },
  },
});
