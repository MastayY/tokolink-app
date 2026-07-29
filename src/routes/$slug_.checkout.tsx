// src/routes/$slug_.checkout.tsx
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { motion } from "framer-motion";
import { useCart } from "@/lib/store";

import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/$slug_/checkout")({
  loader: async ({ params }) => {
    const { getTenant } = await import("@/server/tenant.functions");
    try {
      const store = await getTenant({ data: params.slug });
      return { store };
    } catch {
      return { store: null };
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Checkout — ${loaderData?.store?.name ?? "Tokolink"}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  pendingComponent: () => (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <Spinner className="h-5 w-5" />
        <span>Memuat checkout...</span>
      </div>
    </div>
  ),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { store } = Route.useLoaderData();
  const { slug } = useParams({ from: "/$slug_/checkout" });
  const items = useCart((s) => s.items);

  // Load Snap.js
  useEffect(() => {
    const scriptSrc =
      import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === "true"
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";
    const existing = document.querySelector(`script[src="${scriptSrc}"]`);
    if (existing) return;
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.setAttribute("data-client-key", import.meta.env.VITE_MIDTRANS_CLIENT_KEY ?? "");
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  if (!store) return <p className="p-8 text-center text-muted-foreground">Toko tidak ditemukan.</p>;
  if (items.length === 0) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Keranjang kamu kosong.</p>
        <Link to="/$slug" params={{ slug }} className="underline text-sm font-medium">
          Kembali ke toko
        </Link>
      </div>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <Link to="/$slug" params={{ slug }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Kembali ke toko
          </Link>
          <h1 className="mt-4 text-2xl font-display font-semibold">Checkout</h1>
          <p className="text-sm text-muted-foreground mt-1">{store.name}</p>
        </div>

        <CheckoutForm tenantId={store.id} storeSlug={slug} />
      </div>
    </motion.main>
  );
}
