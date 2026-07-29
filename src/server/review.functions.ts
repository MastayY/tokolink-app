import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";

export const getStorefrontReviews = createServerFn({ method: "GET" })
  .validator(
    z.object({
      slug: z.string(),
      rating: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });

    if (!tenant) throw new Error("Store not found");

    const whereCondition: any = { tenantId: tenant.id };
    if (data.rating && data.rating >= 1 && data.rating <= 5) {
      whereCondition.rating = data.rating;
    }

    const reviews = await prisma.review.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            buyerName: true,
            createdAt: true,
            items: {
              select: {
                productName: true,
                variantName: true,
                qty: true,
              },
            },
          },
        },
      },
    });

    // Calculate rating distribution & average
    const allReviews = await prisma.review.findMany({
      where: { tenantId: tenant.id },
      select: { rating: true },
    });

    const totalCount = allReviews.length;
    const ratingSum = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avgRating = totalCount > 0 ? Number((ratingSum / totalCount).toFixed(1)) : 0;

    const distribution = {
      5: allReviews.filter((r) => r.rating === 5).length,
      4: allReviews.filter((r) => r.rating === 4).length,
      3: allReviews.filter((r) => r.rating === 3).length,
      2: allReviews.filter((r) => r.rating === 2).length,
      1: allReviews.filter((r) => r.rating === 1).length,
    };

    return {
      reviews,
      avgRating,
      totalCount,
      distribution,
    };
  });

export const getMyReviews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("No tenant found");

    const reviews = await prisma.review.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            orderCode: true,
            buyerName: true,
            buyerPhone: true,
            createdAt: true,
            items: {
              select: {
                productName: true,
                variantName: true,
                qty: true,
              },
            },
          },
        },
      },
    });

    const totalCount = reviews.length;
    const ratingSum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avgRating = totalCount > 0 ? Number((ratingSum / totalCount).toFixed(1)) : 0;

    const distribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      reviews,
      avgRating,
      totalCount,
      distribution,
    };
  });
