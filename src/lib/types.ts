// src/lib/types.ts
export type LinkItem = {
  id: string;
  label: string;
  url: string;
  icon?: string | null;
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

export type ProductVariantOption = {
  id: string;
  name: string;
  priceDelta: number;
};

export type ProductVariantGroup = {
  id: string;
  name: string;
  options: ProductVariantOption[];
};

export type Product = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  image: string;
  weightGrams: number;
  isDigital: boolean;
  trackStock: boolean;
  stock: number | null;
  category: string | null;
  digitalDeliveryType: "AUTO_TEXT" | "MANUAL" | null;
  digitalDeliveryText: string | null;
  variantGroups?: ProductVariantGroup[];
};

export type Tenant = {
  slug: string;
  name: string;
  tagline: string;
  avatar: string;
  whatsapp: string;
  links: LinkItem[];
  categories: Category[];
  products: Product[];
};

export type CartItem = {
  key: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  qty: number;
  image: string;
  isDigital?: boolean;    // new: propagated from product for checkout page shipping detection
  weightGrams?: number;   // new: 0 for digital
};
