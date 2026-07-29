import { createFileRoute, notFound } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { Product } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getTenant } from "@/server/tenant.functions";
import { StorefrontHeader } from "@/components/storefront/storefront-header";
import { ProductCard } from "@/components/storefront/product-card";
import { VariantSheet } from "@/components/storefront/variant-sheet";
import { FloatingCart } from "@/components/storefront/floating-cart";
import { StorefrontReviews } from "@/components/storefront/storefront-reviews";
import { getAppUrl } from "@/lib/utils";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    try {
      const tenant = await getTenant({ data: params.slug });
      if (!tenant) throw notFound();
      return { tenant };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    const tenant = loaderData?.tenant;
    const appUrl = getAppUrl();
    const ogImage = tenant
      ? `${appUrl}/api/og/${tenant.slug}`
      : `${appUrl}/og-main.png`;

    return {
      meta: [
        { title: tenant ? `${tenant.name} — Tokolink` : "Toko — Tokolink" },
        {
          name: "description",
          content: tenant?.tagline || "Kunjungi toko kami di Tokolink.",
        },
        { property: "og:title", content: tenant ? `${tenant.name} — Tokolink` : "Toko — Tokolink" },
        {
          property: "og:description",
          content: tenant?.tagline || "Kunjungi toko kami di Tokolink.",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${appUrl}/${tenant?.slug || ""}` },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: `${appUrl}/${tenant?.slug || ""}` }],
    };
  },
  component: Storefront,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-5xl">404</h1>
        <p className="mt-2 text-muted-foreground">Toko tidak ditemukan.</p>
      </div>
    </div>
  ),
});

function Storefront() {
  const { tenant } = Route.useLoaderData();
  const [selecting, setSelecting] = useState<Product | null>(null);
  const [productPage, setProductPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Use seller-managed category order; fall back to product-derived if tenant has no managed categories
  const categories: string[] =
    tenant.categories && tenant.categories.length > 0
      ? tenant.categories
          .map((c) => c.name)
          .filter((name) => tenant.products.some((p) => p.category === name))
      : Array.from(
          new Set(tenant.products.map((p) => p.category).filter(Boolean) as string[])
        );

  const filteredProducts = tenant.products.filter((p) => {
    const matchesSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === null || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Reset to page 1 when filters change
  useEffect(() => { setProductPage(1); }, [search, selectedCategory]);

  const PRODUCTS_PER_PAGE = 6;
  const totalProducts = filteredProducts.length;
  const totalProductPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE) || 1;
  const paginatedProducts = filteredProducts.slice(
    (productPage - 1) * PRODUCTS_PER_PAGE,
    productPage * PRODUCTS_PER_PAGE,
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: tenant.name,
          description: tenant.tagline,
          image: tenant.avatar,
          telephone: tenant.whatsapp,
          url: `${getAppUrl()}/${tenant.slug}`,
          priceRange: "$$",
          itemListElement: tenant.products.map((p, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            item: {
              "@type": "Product",
              name: p.name,
              description: p.description,
              image: p.image,
              offers: {
                "@type": "Offer",
                price: p.basePrice,
                priceCurrency: "IDR",
                availability: "https://schema.org/InStock",
              },
            },
          })),
        })}
      </script>

      {/* Header */}
      <StorefrontHeader tenant={tenant} />

      {/* Catalog */}
      <section className="mx-auto mt-16 max-w-2xl px-4">
        {/* Sticky search + category filter bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 pt-2 -mx-4 px-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />

          {categories.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  selectedCategory === null
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    selectedCategory === cat
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 mt-3 flex items-baseline justify-between px-2">
          <h2 className="font-display text-lg font-medium tracking-tight">Katalog</h2>
          <span className="text-xs text-muted-foreground">{totalProducts} produk</span>
        </div>

        {totalProducts === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50 text-xs text-muted-foreground">
            Belum ada produk di katalog.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {paginatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p as any} delay={i * 0.04} onSelect={() => setSelecting(p as any)} />
              ))}
            </div>

            {/* Catalog Pagination Controls */}
            {totalProductPages > 1 && (
              <div className="mt-6 flex items-center justify-between px-2 text-xs">
                <button
                  disabled={productPage === 1}
                  onClick={() => setProductPage((p) => Math.max(p - 1, 1))}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 transition disabled:opacity-40 hover:bg-secondary cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Sebelum
                </button>
                <span className="text-muted-foreground">
                  Halaman <strong className="text-foreground">{productPage}</strong> dari {totalProductPages}
                </span>
                <button
                  disabled={productPage === totalProductPages}
                  onClick={() => setProductPage((p) => Math.min(p + 1, totalProductPages))}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 transition disabled:opacity-40 hover:bg-secondary cursor-pointer"
                >
                  Lanjut <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Reviews Section */}
      <StorefrontReviews slug={tenant.slug} />

      <div className="mx-auto mt-16 max-w-md px-6 text-center text-xs text-muted-foreground">
        powered by <span className="text-foreground">tokolink</span>
      </div>

      {/* Variant selection sheet */}
      <AnimatePresence>
        {selecting && <VariantSheet product={selecting} onClose={() => setSelecting(null)} />}
      </AnimatePresence>

      <FloatingCart storeName={tenant.name} phone={tenant.whatsapp} />
    </div>
  );
}
