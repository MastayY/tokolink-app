// src/lib/order-lifecycle.ts
// Shared server-side order lifecycle helpers. SERVER-ONLY.
import { prisma } from "@/db";
import {
  sendEmailSellerOrderCompleted,
  notifyBuyerWhatsAppCompleted,
} from "@/lib/notifications";

/** MAX(now + 1 day, paidAt + 3 days) — payout scheduling buffer. */
export function computePayoutSchedule(paidAt: Date | null): Date {
  const now = new Date();
  const paidAtPlusBuffer = paidAt
    ? new Date(paidAt.getTime() + 3 * 24 * 60 * 60 * 1000)
    : now;
  const tomorrowFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return paidAtPlusBuffer > tomorrowFromNow ? paidAtPlusBuffer : tomorrowFromNow;
}

/**
 * Marks an order COMPLETED, schedules Payout if tenant has bank details,
 * fires seller completion notification. Idempotent via status guard in updateMany.
 */
export async function markOrderCompleted(
  orderId: string,
  opts: { autoCompleted: boolean },
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tenant: {
        select: {
          name: true,
          bankCode: true,
          bankAccountNumber: true,
          bankAccountName: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!order) {
    console.error(`[order-lifecycle] markOrderCompleted: order ${orderId} not found`);
    return;
  }

  const now = new Date();
  const scheduledAt = computePayoutSchedule(order.paidAt);
  const { tenant } = order;

  // Interactive transaction: payout upsert is ONLY executed when updateMany actually
  // changed the row (count === 1). Array-form $transaction would build the payout
  // upsert eagerly before knowing the result, causing a spurious scheduledAt reset
  // if markOrderCompleted is called twice for the same order in a race.
  await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: orderId, status: { notIn: ["COMPLETED", "CANCELLED", "EXPIRED"] } },
      data: { status: "COMPLETED", completedAt: now },
    });

    if (
      result.count === 1 &&
      tenant?.bankCode &&
      tenant?.bankAccountNumber &&
      tenant?.bankAccountName
    ) {
      await tx.payout.upsert({
        where: { orderId },
        create: {
          orderId,
          tenantId: order.tenantId,
          amount: order.sellerPayout,
          bankCode: tenant.bankCode,
          bankAccountNumber: tenant.bankAccountNumber,
          bankAccountName: tenant.bankAccountName,
          scheduledAt,
        },
        update: { scheduledAt },
      });
    }
  });

  if (tenant?.user?.email) {
    void sendEmailSellerOrderCompleted({
      sellerEmail: tenant.user.email,
      sellerName: tenant.name,
      orderCode: order.orderCode,
      sellerPayout: order.sellerPayout,
      autoCompleted: opts.autoCompleted,
    });
  }

  if (order.buyerPhone) {
    void notifyBuyerWhatsAppCompleted({
      buyerPhone: order.buyerPhone,
      buyerName: order.buyerName,
      orderCode: order.orderCode,
      storeName: tenant.name,
      storeSlug: tenant.slug,
    });
  }
}

/**
 * After a digital item is delivered, re-evaluate whether the order can complete.
 * Only completes if: order is PAID + has NO physical items + ALL items have deliveredAt set.
 */
export async function checkAndCompleteOrderIfEligible(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { isDigital: true } },
        },
      },
    },
  });

  if (!order || order.status !== "PAID") return;

  const hasPhysicalItem = order.items.some((i) => !i.product.isDigital);
  if (hasPhysicalItem) return;

  const allDelivered = order.items.every((i) => i.deliveredAt !== null);
  if (!allDelivered) return;

  await markOrderCompleted(orderId, { autoCompleted: false });
}
