import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { createProductSchema, updateProductSchema } from "../lib/schemas";
import { z } from "zod";

// Fetch all products for a specific tenant (public)
export const getProducts = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: tenantId }) => {
    return await prisma.product.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
      include: {
        variantGroups: {
          orderBy: { sortOrder: "asc" },
          include: {
            options: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });
  });

// Create product (auth required)
export const createProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createProductSchema)
  .handler(async ({ data, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) {
      throw new Error("No tenant found for this user");
    }

    // Get max sortOrder to append
    const maxProduct = await prisma.product.findFirst({
      where: { tenantId },
      orderBy: { sortOrder: "desc" },
    });
    const nextSortOrder = maxProduct ? maxProduct.sortOrder + 1 : 0;

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description || "",
        basePrice: data.basePrice,
        weightGrams: data.weightGrams ?? 500,
        image: data.image || "",
        sortOrder: nextSortOrder,
        tenantId,
        isDigital: data.isDigital ?? false,
        trackStock: data.trackStock ?? false,
        stock: data.trackStock ? (data.stock ?? null) : null,
        category: data.category?.trim() || null,
        digitalDeliveryType: data.isDigital ? (data.digitalDeliveryType ?? null) : null,
        digitalDeliveryText:
          data.isDigital && data.digitalDeliveryType === "AUTO_TEXT"
            ? (data.digitalDeliveryText ?? null)
            : null,
        variantGroups: {
          create: data.variantGroups?.map((group, groupIdx) => ({
            name: group.name,
            sortOrder: groupIdx,
            options: {
              create: group.options.map((opt, optIdx) => ({
                name: opt.name,
                priceDelta: opt.priceDelta,
                weightGrams: opt.weightGrams ?? null,
                sortOrder: optIdx,
              })),
            },
          })),
        },
      },
      include: {
        variantGroups: {
          include: {
            options: true,
          },
        },
      },
    });

    return product;
  });

// Update product (auth required, ownership check)
export const updateProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().uuid(),
      data: updateProductSchema,
    }),
  )
  .handler(async ({ data: { id, data }, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) {
      throw new Error("No tenant found for this user");
    }

    // Verify ownership
    const existingProduct = await prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!existingProduct) {
      throw new Error("Unauthorized: Product not found or does not belong to your store");
    }

    // Run update in transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 1. If variantGroups are supplied in the update, clear the old ones first
      if (data.variantGroups !== undefined) {
        await tx.productVariantGroup.deleteMany({
          where: { productId: id },
        });
      }

      // 2. Perform the product update
      return await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          basePrice: data.basePrice,
          weightGrams: data.weightGrams,
          image: data.image,
          isDigital: data.isDigital,
          trackStock: data.trackStock,
          stock: data.trackStock === false ? null : data.stock,
          category: data.category?.trim() ?? undefined,
          digitalDeliveryType: data.isDigital === false ? null : data.digitalDeliveryType,
          digitalDeliveryText:
            data.isDigital && data.digitalDeliveryType === "AUTO_TEXT"
              ? data.digitalDeliveryText
              : null,
          variantGroups: data.variantGroups
            ? {
                create: data.variantGroups.map((group, groupIdx) => ({
                  name: group.name,
                  sortOrder: groupIdx,
                  options: {
                    create: group.options.map((opt, optIdx) => ({
                      name: opt.name,
                      priceDelta: opt.priceDelta,
                      weightGrams: opt.weightGrams ?? null,
                      sortOrder: optIdx,
                    })),
                  },
                })),
              }
            : undefined,
        },
        include: {
          variantGroups: {
            orderBy: { sortOrder: "asc" },
            include: {
              options: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      });
    });

    return updatedProduct;
  });

// Delete product (auth required, ownership check)
export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.string().uuid())
  .handler(async ({ data: id, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) {
      throw new Error("No tenant found for this user");
    }

    // Verify ownership
    const existingProduct = await prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!existingProduct) {
      throw new Error("Unauthorized: Product not found or does not belong to your store");
    }

    // Delete product (variantGroups and options will be cascade-deleted by database foreign keys)
    await prisma.product.delete({
      where: { id },
    });

    return { success: true };
  });
