import { createServerFn } from "@tanstack/react-start";
import { prisma } from "../db";
import { authMiddleware } from "./auth-middleware";
import { z } from "zod";

// ─── Get all categories for a tenant (public, by tenantId) ───────────────────
export const getCategoriesByTenant = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: tenantId }) => {
    return prisma.category.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });
  });

// ─── Get own categories (auth) ────────────────────────────────────────────────
export const getMyCategories = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("No tenant found");
    return prisma.category.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });
  });

// ─── Create category ─────────────────────────────────────────────────────────
export const createCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ name: z.string().min(1).max(50).trim() }))
  .handler(async ({ data, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("No tenant found");

    // Check duplicate name for this tenant
    const existing = await prisma.category.findFirst({
      where: { tenantId, name: { equals: data.name, mode: "insensitive" } },
    });
    if (existing) throw new Error("Kategori dengan nama ini sudah ada");

    // Append at end
    const last = await prisma.category.findFirst({
      where: { tenantId },
      orderBy: { sortOrder: "desc" },
    });
    const nextSortOrder = last ? last.sortOrder + 1 : 0;

    return prisma.category.create({
      data: { name: data.name, tenantId, sortOrder: nextSortOrder },
    });
  });

// ─── Rename category ─────────────────────────────────────────────────────────
export const updateCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().uuid(), name: z.string().min(1).max(50).trim() }))
  .handler(async ({ data, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("No tenant found");

    const existing = await prisma.category.findFirst({ where: { id: data.id, tenantId } });
    if (!existing) throw new Error("Kategori tidak ditemukan");

    // Duplicate name check (exclude self)
    const dup = await prisma.category.findFirst({
      where: { tenantId, name: { equals: data.name, mode: "insensitive" }, NOT: { id: data.id } },
    });
    if (dup) throw new Error("Nama kategori sudah dipakai");

    // Also update category string on products that used old name
    await prisma.product.updateMany({
      where: { tenantId, category: existing.name },
      data: { category: data.name },
    });

    return prisma.category.update({
      where: { id: data.id },
      data: { name: data.name },
    });
  });

// ─── Delete category ─────────────────────────────────────────────────────────
export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.string().uuid())
  .handler(async ({ data: id, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("No tenant found");

    const cat = await prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new Error("Kategori tidak ditemukan");

    // Nullify category on products that used this category
    await prisma.product.updateMany({
      where: { tenantId, category: cat.name },
      data: { category: null },
    });

    await prisma.category.delete({ where: { id } });
    return { success: true };
  });

// ─── Reorder categories ───────────────────────────────────────────────────────
export const reorderCategories = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.array(z.string().uuid()))
  .handler(async ({ data: orderedIds, context }) => {
    const tenantId = context.tenant?.id;
    if (!tenantId) throw new Error("No tenant found");

    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.category.updateMany({
          where: { id, tenantId },
          data: { sortOrder: idx },
        })
      )
    );

    return { success: true };
  });
