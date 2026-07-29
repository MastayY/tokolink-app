import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Category, LinkItem, Product, Tenant } from "./types";

// ---------- Auth ----------
type AuthState = {
  user: any | null;
  isLoading: boolean;
  setUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: async () => {
    const { supabase } = await import("./supabase");
    await supabase.auth.signOut();
    set({ user: null });
  },
}));

import { updateTenant } from "../server/tenant.functions";
import { createProduct, updateProduct, deleteProduct } from "../server/product.functions";
import { addLink, updateLink, deleteLink } from "../server/link.functions";
import { createCategory, updateCategory as updateCategoryFn, deleteCategory } from "../server/category.functions";

type TenantState = {
  tenant: Tenant | null;
  setTenant: (t: Tenant | null) => void;
  updateSettings: (t: Partial<Tenant>) => Promise<void>;
  addLink: (l: Omit<LinkItem, "id">) => Promise<void>;
  updateLink: (id: string, l: Partial<LinkItem>) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
};

export const useTenant = create<TenantState>((set) => ({
  tenant: null,
  setTenant: (tenant) => set({ tenant }),
  updateSettings: async (t) => {
    const updated = await updateTenant({ data: t });
    set((s) => ({ tenant: s.tenant ? { ...s.tenant, ...updated } : (updated as any) }));
  },
  addLink: async (l) => {
    const newLink = await addLink({ data: l });
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          links: [...s.tenant.links, newLink],
        },
      };
    });
  },
  updateLink: async (id, l) => {
    const updated = await updateLink({ data: { id, data: l } });
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          links: s.tenant.links.map((x) => (x.id === id ? updated : x)),
        },
      };
    });
  },
  removeLink: async (id) => {
    await deleteLink({ data: id });
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          links: s.tenant.links.filter((x) => x.id !== id),
        },
      };
    });
  },
  addProduct: async (p) => {
    const newProduct = await createProduct({ data: p });
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          products: [...s.tenant.products, newProduct as any],
        },
      };
    });
  },
  updateProduct: async (id, p) => {
    const updated = await updateProduct({ data: { id, data: p } });
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          products: s.tenant.products.map((x) => (x.id === id ? (updated as any) : x)),
        },
      };
    });
  },
  removeProduct: async (id) => {
    await deleteProduct({ data: id });
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          products: s.tenant.products.filter((x) => x.id !== id),
        },
      };
    });
  },
  addCategory: async (name) => {
    const newCat = await createCategory({ data: { name } });
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          categories: [...s.tenant.categories, newCat as Category],
        },
      };
    });
  },
  renameCategory: async (id, name) => {
    const updated = await updateCategoryFn({ data: { id, name } });
    set((s) => {
      if (!s.tenant) return {};
      // also update category string on products that used the old name
      const oldName = s.tenant.categories.find((c) => c.id === id)?.name;
      return {
        tenant: {
          ...s.tenant,
          categories: s.tenant.categories.map((c) =>
            c.id === id ? (updated as Category) : c
          ),
          products: s.tenant.products.map((p) =>
            p.category === oldName ? { ...p, category: (updated as Category).name } : p
          ),
        },
      };
    });
  },
  removeCategory: async (id) => {
    const catName = useTenant.getState().tenant?.categories.find((c) => c.id === id)?.name;
    await deleteCategory({ data: id });
    set((s) => {
      if (!s.tenant) return {};
      return {
        tenant: {
          ...s.tenant,
          categories: s.tenant.categories.filter((c) => c.id !== id),
          // nullify category on products that belonged to this category
          products: s.tenant.products.map((p) =>
            p.category === catName ? { ...p, category: null } : p
          ),
        },
      };
    });
  },
}));

// ---------- Cart (per session, not persisted) ----------
type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  totalQty: () => number;
  totalPrice: () => number;
};

export const useCart = create<CartState>((set, get) => ({
  items: [],
  add: (item) =>
    set((s) => {
      const found = s.items.find((i) => i.key === item.key);
      if (found) {
        return {
          items: s.items.map((i) => (i.key === item.key ? { ...i, qty: i.qty + item.qty } : i)),
        };
      }
      return { items: [...s.items, item] };
    }),
  inc: (key) =>
    set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i)) })),
  dec: (key) =>
    set((s) => ({
      items: s.items
        .map((i) => (i.key === key ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    })),
  remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
  clear: () => set({ items: [] }),
  totalQty: () => get().items.reduce((sum, i) => sum + i.qty, 0),
  totalPrice: () => get().items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0),
}));

export function buildWhatsAppUrl(
  phone: string,
  storeName: string,
  items: CartItem[],
  total: number,
  note?: string,
) {
  const lines = [
    `Halo *${storeName}*, saya mau order pesanan berikut ya:\n`,
    ...items.map((i) => {
      const priceFormatted = (i.unitPrice * i.qty).toLocaleString("id-ID");
      const variantText = i.variantName ? ` (${i.variantName})` : "";
      return `▪ ${i.qty}x ${i.productName}${variantText}\n  Rp${priceFormatted}`;
    }),
    "",
    note ? `*Catatan:*\n${note}\n` : "",
    `*Total Pesanan: Rp${total.toLocaleString("id-ID")}*\n`,
    `Mohon info instruksi pembayarannya ya. Terima kasih! 🙏`,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}
