import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useTenant } from "@/lib/store";
import type { Product } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage, formatIDR } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/dashboard/product-form";
import { ProductCard } from "@/components/dashboard/product-card";
import { DeleteConfirmModal } from "@/components/dashboard/delete-confirm-modal";
import { CategoryManager } from "@/components/dashboard/category-manager";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FallbackImage } from "@/components/fallback-image";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, List, Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/dashboard/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const tenant = useTenant((s) => s.tenant);
  const add = useTenant((s) => s.addProduct);
  const remove = useTenant((s) => s.removeProduct);

  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search, Filter, Sort, and View Mode state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [stockFilter, setStockFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<
    "default" | "name_asc" | "name_desc" | "price_low" | "price_high" | "stock_high" | "stock_low"
  >("default");

  if (!tenant) {
    return (
      <div className="space-y-8 bg-background text-foreground animate-fade-in">
        <PageHeader label="Manajemen" title="Produk" />
        <div className="flex items-center justify-center py-20">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  const products = tenant.products;
  const categoryNames = tenant.categories.map((c) => c.name);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== "ALL") count++;
    if (typeFilter !== "ALL") count++;
    if (stockFilter !== "ALL") count++;
    if (sortBy !== "default") count++;
    return count;
  }, [categoryFilter, typeFilter, stockFilter, sortBy]);

  // Filtered and Sorted products
  const filteredAndSortedProducts = useMemo(() => {
    return (products as Product[])
      .filter((p) => {
        // Category filter
        if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;

        // Type filter (Physical vs Digital)
        if (typeFilter === "DIGITAL" && !p.isDigital) return false;
        if (typeFilter === "PHYSICAL" && p.isDigital) return false;

        // Stock filter
        if (stockFilter === "IN_STOCK") {
          if (p.trackStock && (p.stock ?? 0) <= 0) return false;
        }
        if (stockFilter === "OUT_OF_STOCK") {
          if (!p.trackStock || (p.stock ?? 0) > 0) return false;
        }

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchCat = (p.category || "").toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") return a.name.localeCompare(b.name);
        if (sortBy === "name_desc") return b.name.localeCompare(a.name);
        if (sortBy === "price_low") return a.basePrice - b.basePrice;
        if (sortBy === "price_high") return b.basePrice - a.basePrice;
        if (sortBy === "stock_high") return (b.stock ?? 0) - (a.stock ?? 0);
        if (sortBy === "stock_low") return (a.stock ?? 0) - (b.stock ?? 0);
        return 0;
      });
  }, [products, categoryFilter, typeFilter, stockFilter, search, sortBy]);

  function resetFilters() {
    setCategoryFilter("ALL");
    setTypeFilter("ALL");
    setStockFilter("ALL");
    setSortBy("default");
    setSearch("");
  }

  const headerAction = (
    <Button
      onClick={() => {
        setEditing(null);
        setShowForm(true);
      }}
    >
      + Produk baru
    </Button>
  );

  return (
    <div className="space-y-8 bg-background text-foreground animate-fade-in">
      <PageHeader label="Manajemen" title="Produk" action={headerAction} />

      {/* ── Category Manager ─────────────────────────────────── */}
      <CategoryManager />

      {/* ── Product List Section ─────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Daftar Produk ({filteredAndSortedProducts.length})
          </h3>
        </div>

        {/* Search & Filter Button Bar */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama produk, deskripsi, kategori..."
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition cursor-pointer shrink-0 ${
                showFilterPanel || activeFilterCount > 0
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filter & Urutkan</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime text-background text-[11px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle (Grid vs List) */}
            <div className="flex border border-border rounded-xl bg-card p-0.5 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                title="Tampilan Grid"
                className={`p-2 rounded-lg transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Tampilan List / Tabel"
                className={`p-2 rounded-lg transition cursor-pointer ${
                  viewMode === "list"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Expandable Custom Filter & Sort Section */}
          <AnimatePresence>
            {showFilterPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" /> Opsi Filter & Urutan Produk
                    </h4>
                    <button
                      onClick={() => setShowFilterPanel(false)}
                      className="p-1 text-muted-foreground hover:text-foreground transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    {/* Category Filter */}
                    <div className="space-y-2">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                        Kategori
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                      >
                        <option value="ALL">Semua Kategori</option>
                        {categoryNames.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div className="space-y-2">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                        Tipe Produk
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                      >
                        <option value="ALL">Semua Tipe</option>
                        <option value="PHYSICAL">Produk Fisik</option>
                        <option value="DIGITAL">Produk Digital</option>
                      </select>
                    </div>

                    {/* Stock Filter */}
                    <div className="space-y-2">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                        Status Stok
                      </label>
                      <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                      >
                        <option value="ALL">Semua Stok</option>
                        <option value="IN_STOCK">Stok Tersedia</option>
                        <option value="OUT_OF_STOCK">Stok Habis</option>
                      </select>
                    </div>

                    {/* Sorting */}
                    <div className="space-y-2">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                        Urutkan Berdasarkan
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                      >
                        <option value="default">Urutan Bawaan</option>
                        <option value="name_asc">Nama (A - Z)</option>
                        <option value="name_desc">Nama (Z - A)</option>
                        <option value="price_low">Harga Terendah</option>
                        <option value="price_high">Harga Tertinggi</option>
                        <option value="stock_high">Stok Terbanyak</option>
                        <option value="stock_low">Stok Terendah</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset Filter</span>
                    </button>
                    <button
                      onClick={() => setShowFilterPanel(false)}
                      className="rounded-xl bg-foreground text-background px-4 py-1.5 text-xs font-medium hover:bg-foreground/90 transition cursor-pointer"
                    >
                      Terapkan & Tutup
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {filteredAndSortedProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center bg-card/40">
            <p className="text-sm text-muted-foreground">
              {products.length === 0
                ? "Belum ada produk. Klik + Produk baru untuk menambahkan."
                : "Tidak ada produk yang sesuai dengan filter atau kata kunci."}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={() => {
                  setEditing(p);
                  setShowForm(true);
                }}
                onDelete={() => setDeletingProduct(p)}
              />
            ))}
          </ul>
        ) : (
          /* List / Table View */
          <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden shadow-xs">
            {filteredAndSortedProducts.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02, duration: 0.2 }}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-12 w-12 rounded-xl bg-secondary overflow-hidden shrink-0">
                    <FallbackImage
                      src={p.image}
                      alt={p.name}
                      fallbackText={p.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">{p.name}</span>
                      {p.isDigital && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                          Digital
                        </Badge>
                      )}
                      {p.category && (
                        <span className="text-[10px] rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                          {p.category}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>{formatIDR(p.basePrice)}</span>
                      <span>·</span>
                      {p.trackStock ? (
                        (p.stock ?? 0) <= 0 ? (
                          <span className="text-red-500 font-semibold">Stok: Habis (0)</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Stok: {p.stock}</span>
                        )
                      ) : (
                        <span>Stok: Tanpa Batas</span>
                      )}
                      {p.variantGroups && p.variantGroups.length > 0 && (
                        <>
                          <span>·</span>
                          <span>{p.variantGroups.length} varian</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(p);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingProduct(p)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Hapus
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <ProductForm
            initial={editing}
            onClose={() => setShowForm(false)}
            onSubmit={async (data) => {
              try {
                if (editing) {
                  await useTenant.getState().updateProduct(editing.id, data);
                  toast.success(`Produk "${data.name}" berhasil diperbarui`);
                } else {
                  await add(data);
                  toast.success(`Produk "${data.name}" berhasil ditambahkan`);
                }
                setShowForm(false);
              } catch (e: any) {
                toast.error(getErrorMessage(e, "Gagal menyimpan produk"));
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingProduct && (
          <DeleteConfirmModal
            product={deletingProduct}
            loading={isDeleting}
            onClose={() => setDeletingProduct(null)}
            onConfirm={async () => {
              setIsDeleting(true);
              try {
                await remove(deletingProduct.id);
                toast.success(`Produk "${deletingProduct.name}" berhasil dihapus`);
                setDeletingProduct(null);
              } catch (e: any) {
                toast.error(getErrorMessage(e, "Gagal menghapus produk"));
              } finally {
                setIsDeleting(false);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
