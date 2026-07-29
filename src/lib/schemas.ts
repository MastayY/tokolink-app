import { z } from "zod";

export const tenantSlugSchema = z
  .string()
  .min(3, "Slug minimal 3 karakter")
  .max(30, "Slug maksimal 30 karakter")
  .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)");

export const createTenantSchema = z.object({
  slug: tenantSlugSchema,
  name: z.string().min(2, "Nama minimal 2 karakter").max(50, "Nama maksimal 50 karakter"),
  tagline: z.string().max(100, "Tagline maksimal 100 karakter").default(""),
  avatar: z.string().url("URL avatar tidak valid").or(z.literal("")).default(""),
  whatsapp: z
    .string()
    .regex(/^62\d{9,15}$/, "Nomor WhatsApp harus diawali dengan 62 (contoh: 628123456789)")
    .or(z.literal(""))
    .default(""),
  recaptchaToken: z.string().optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

export const productVariantOptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nama opsi harus diisi").max(50),
  priceDelta: z.number().int().min(0, "Selisih harga tidak boleh negatif").default(0),
  weightGrams: z.number().int().min(1).optional().nullable(),
});

export const productVariantGroupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nama varian harus diisi").max(50), // e.g. "Ukuran", "Warna"
  options: z.array(productVariantOptionSchema).min(1, "Harus ada minimal 1 opsi varian"),
});

export const baseProductSchema = z.object({
  name: z.string().min(1, "Nama produk harus diisi").max(100),
  description: z.string().max(500, "Deskripsi maksimal 500 karakter").default(""),
  basePrice: z.number().int().min(0, "Harga dasar tidak boleh negatif"),
  image: z.string().url("URL gambar tidak valid").or(z.literal("")).default(""),
  weightGrams: z.number().int().min(0, "Berat tidak boleh negatif").default(500),
  isDigital: z.boolean().default(false),
  trackStock: z.boolean().default(false),
  stock: z.number().int().min(0).nullable().optional(),
  category: z.string().max(50).trim().nullable().optional(),
  digitalDeliveryType: z.enum(["AUTO_TEXT", "MANUAL"]).nullable().optional(),
  digitalDeliveryText: z.string().max(2000).nullable().optional(),
  variantGroups: z.array(productVariantGroupSchema).optional().default([]),
});

export const createProductSchema = baseProductSchema.superRefine((data, ctx) => {
  if (data.isDigital && data.digitalDeliveryType === "AUTO_TEXT") {
    if (!data.digitalDeliveryText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Teks/link pengiriman wajib diisi untuk produk digital otomatis.",
        path: ["digitalDeliveryText"],
      });
    }
  }
});

export const updateProductSchema = baseProductSchema.partial();

export const createLinkSchema = z.object({
  label: z.string().min(1, "Label harus diisi").max(50),
  url: z.string().url("URL tidak valid").or(z.literal("#")),
  icon: z.string().max(50).nullable().optional(),
});

export const updateLinkSchema = createLinkSchema.partial();

// ── Checkout / Shipping schemas ───────────────────────────────────────────────

export const cartItemInputSchema = z.object({
  productId: z.string().uuid("ID produk tidak valid"),
  variantId: z.string().optional(),
  name: z.string().min(1, "Nama produk wajib diisi").max(100),
  variantName: z.string().optional(),
  price: z.number().int().min(0, "Harga tidak boleh negatif"),
  qty: z.number().int().min(1, "Jumlah produk minimal 1").max(99),
  weightGrams: z.number().int().min(0).default(0),
});

export const checkoutBodySchema = z.object({
  tenantId: z.string().uuid(),
  buyerName: z.string().min(2, "Nama pembeli minimal 2 karakter").max(100),
  buyerPhone: z.string().regex(/^62\d{9,15}$/, "Nomor WhatsApp harus diawali 62"),
  shippingAddress: z.string().max(500).optional(),
  shippingAreaId: z.string().optional(),
  shippingAreaLabel: z.string().optional(),
  shippingCost: z.number().int().min(0),
  courierCompany: z.string().optional(),
  courierType: z.string().optional(),
  cartItems: z.array(cartItemInputSchema).min(1, "Keranjang kosong"),
  note: z.string().max(300).optional(),
});

export const shippingRateBodySchema = z.object({
  tenantId: z.string().uuid(),
  destinationAreaId: z.string().min(1),
  cartItems: z.array(
    z.object({
      name: z.string(),
      price: z.number().int(),
      weightGrams: z.number().int().min(1),
      qty: z.number().int().min(1),
    })
  ).min(1),
});

export const orderLookupSchema = z.object({
  orderCode: z.string().regex(/^TL-[A-F0-9]{8}$/),
  phone: z.string().regex(/^62\d{9,15}$/),
});

export const reviewSubmitSchema = z.object({
  orderId: z.string().uuid(),
  orderCode: z.string().regex(/^TL-[A-F0-9]{8}$/),
  buyerPhone: z.string().regex(/^62\d{9,15}$/),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const updateShippingSchema = z.object({
  shippingOriginAreaId: z.string().min(1),
  shippingOriginLabel: z.string().min(1),
});

export const updateBankAccountSchema = z.object({
  bankCode: z.string().min(2).max(10),
  bankAccountNumber: z.string().regex(/^\d{6,20}$/, "Nomor rekening hanya angka"),
  bankAccountName: z.string().min(2).max(100),
});

