// src/server/order.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { authMiddleware } from "@/server/auth-middleware";
import { OrderStatus } from "@prisma/client";

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      status: z.nativeEnum(OrderStatus).optional(),
      page: z.number().int().min(1).default(1),
    })
  )
  .handler(async ({ data, context }) => {
    const PAGE_SIZE = 20;
    const where = {
      tenantId: context.tenant!.id,
      ...(data.status ? { status: data.status } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  isDigital: true,
                  digitalDeliveryType: true,
                },
              },
            },
          },
          review: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (data.page - 1) * PAGE_SIZE,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page: data.page, pageSize: PAGE_SIZE };
  });

export const getMyEarnings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const payouts = await prisma.payout.findMany({
      where: { tenantId: context.tenant!.id },
      include: { order: { select: { orderCode: true, buyerName: true, completedAt: true } } },
      orderBy: { scheduledAt: "desc" },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const pendingTotal = payouts
      .filter((p) => p.status === "SCHEDULED" || p.status === "PROCESSING")
      .reduce((s, p) => s + p.amount, 0);

    const paidThisMonth = payouts
      .filter((p) => p.status === "PAID" && p.paidAt && p.paidAt >= monthStart)
      .reduce((s, p) => s + p.amount, 0);

    return { payouts, summary: { pendingTotal, paidThisMonth } };
  });

export const getOverviewData = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const tenantId = context.tenant!.id;

    const [orders, reviews, productsCount, linksCount] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      prisma.review.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          order: {
            select: { buyerName: true, orderCode: true },
          },
        },
      }),
      prisma.product.count({ where: { tenantId } }),
      prisma.link.count({ where: { tenantId } }),
    ]);

    const paidOrders = orders.filter(
      (o) => o.status === "PAID" || o.status === "SHIPPED" || o.status === "COMPLETED"
    );
    const totalEarnings = paidOrders.reduce((sum, o) => sum + o.sellerPayout, 0);

    const ratingSum = reviews.reduce((s, r) => s + r.rating, 0);
    const avgRating = reviews.length > 0 ? Number((ratingSum / reviews.length).toFixed(1)) : 0;

    // Build past 6 months revenue trend chart data
    const monthsData: Array<{ month: string; amount: number; ordersCount: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = d.toLocaleDateString("id-ID", { month: "short" });

      const monthOrders = paidOrders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= d && orderDate < nextD;
      });

      const monthSum = monthOrders.reduce((sum, o) => sum + o.sellerPayout, 0);

      monthsData.push({
        month: monthLabel,
        amount: monthSum,
        ordersCount: monthOrders.length,
      });
    }

    return {
      stats: {
        totalEarnings,
        totalOrders: orders.length,
        activeProducts: productsCount,
        activeLinks: linksCount,
        avgRating,
        totalReviews: reviews.length,
      },
      recentOrders: orders.slice(0, 5),
      recentReviews: reviews.slice(0, 3),
      chartData: monthsData,
    };
  });

// Orders in PAID status are exactly the queue needing seller action (create shipment).
// Used by the sidebar badge — cheap COUNT query, no pagination needed.
export const getPendingActionCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const count = await prisma.order.count({
      where: { tenantId: context.tenant!.id, status: "PAID" },
    });
    return { count };
  });

export const markDigitalItemDelivered = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ orderItemId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("Unauthorized");

    const item = await prisma.orderItem.findUnique({
      where: { id: data.orderItemId },
      include: {
        order: {
          include: {
            tenant: { select: { name: true, slug: true } },
          },
        },
        product: { select: { isDigital: true, digitalDeliveryType: true } },
      },
    });

    if (!item) throw new Error("Item tidak ditemukan");
    if (item.order.tenantId !== tenantId) throw new Error("Tidak diizinkan");
    if (!item.product?.isDigital || item.product?.digitalDeliveryType !== "MANUAL") {
      throw new Error("Item ini bukan produk digital manual");
    }
    if (item.deliveredAt) {
      return { alreadyDelivered: true };
    }

    const deliveryNow = new Date();
    await prisma.orderItem.update({
      where: { id: item.id },
      data: { deliveredAt: deliveryNow },
    });

    // Send WhatsApp notification to buyer with digital delivery info
    if (item.order.buyerPhone) {
      const { notifyBuyerWhatsAppDigitalDelivery } = await import("@/lib/notifications");
      void notifyBuyerWhatsAppDigitalDelivery({
        buyerPhone: item.order.buyerPhone,
        buyerName: item.order.buyerName,
        orderCode: item.order.orderCode,
        storeName: item.order.tenant.name,
        storeSlug: item.order.tenant.slug,
        productName: item.productName,
        digitalDeliverySnapshot: item.digitalDeliverySnapshot || "Item digital telah diserahkan oleh penjual.",
      });
    }

    const { checkAndCompleteOrderIfEligible } = await import("@/lib/order-lifecycle");
    await checkAndCompleteOrderIfEligible(item.order.id);

    return { alreadyDelivered: false };
  });

