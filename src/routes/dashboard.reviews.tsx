import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageSquare, ShoppingBag, Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { getMyReviews } from "@/server/review.functions";
import { PageHeader } from "@/components/layout/page-header";
import { ReviewSummaryCard } from "@/components/dashboard/review-summary-card";

export const Route = createFileRoute("/dashboard/reviews")({
  loader: async () => {
    try {
      const data = await getMyReviews({});
      return { data };
    } catch {
      return {
        data: {
          reviews: [],
          avgRating: 0,
          totalCount: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      };
    }
  },
  component: DashboardReviews,
});

function DashboardReviews() {
  const { data } = Route.useLoaderData();

  // Filter panel state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "rating_high" | "rating_low">("newest");

  const reviews = data?.reviews ?? [];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedRating !== null) count++;
    if (sortBy !== "newest") count++;
    return count;
  }, [selectedRating, sortBy]);

  const filteredAndSortedReviews = useMemo(() => {
    return reviews
      .filter((r: any) => {
        // Rating filter
        if (selectedRating !== null && r.rating !== selectedRating) return false;

        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchComment = r.comment?.toLowerCase().includes(q);
          const matchBuyer = r.order?.buyerName?.toLowerCase().includes(q);
          const matchCode = r.order?.orderCode?.toLowerCase().includes(q);
          const matchProduct = r.order?.items?.some((i: any) =>
            i.productName?.toLowerCase().includes(q)
          );
          if (!matchComment && !matchBuyer && !matchCode && !matchProduct) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (sortBy === "newest") return timeB - timeA;
        if (sortBy === "oldest") return timeA - timeB;
        if (sortBy === "rating_high") return b.rating - a.rating;
        if (sortBy === "rating_low") return a.rating - b.rating;
        return 0;
      });
  }, [reviews, selectedRating, search, sortBy]);

  function resetFilters() {
    setSelectedRating(null);
    setSortBy("newest");
    setSearch("");
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        label="Ulasan Pembeli"
        title="Ulasan & Penilaian Toko"
        description="Pantau tanggapan dan masukan langsung dari pembeli."
      />

      {/* Summary Card */}
      <ReviewSummaryCard
        avgRating={data.avgRating}
        totalCount={data.totalCount}
        distribution={data.distribution}
        selectedRating={selectedRating}
        onSelectRating={setSelectedRating}
      />

      {/* Search & Unified Filter Button Bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari komentar, nama pembeli, kode order, produk..."
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

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
                    <SlidersHorizontal className="h-4 w-4" /> Opsi Filter & Urutan Ulasan
                  </h4>
                  <button
                    onClick={() => setShowFilterPanel(false)}
                    className="p-1 text-muted-foreground hover:text-foreground transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Rating Filter Pills */}
                  <div className="space-y-2">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                      Filter Rating Bintang
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedRating(null)}
                        className={`rounded-full px-3.5 py-1.5 font-medium transition cursor-pointer ${
                          selectedRating === null
                            ? "bg-foreground text-background"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        Semua ({data.totalCount})
                      </button>
                      {[5, 4, 3, 2, 1].map((star) => (
                        <button
                          key={star}
                          onClick={() => setSelectedRating(selectedRating === star ? null : star)}
                          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition cursor-pointer ${
                            selectedRating === star
                              ? "bg-foreground text-background"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <span>{star}</span>
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="opacity-75">({data.distribution[star] ?? 0})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sorting */}
                  <div className="space-y-2 max-w-xs">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                      Urutkan Berdasarkan
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    >
                      <option value="newest">Tanggal Ulasan (Terbaru)</option>
                      <option value="oldest">Tanggal Ulasan (Terlama)</option>
                      <option value="rating_high">Rating (Highest)</option>
                      <option value="rating_low">Rating (Lowest)</option>
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

      {/* Reviews Table / List */}
      {filteredAndSortedReviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/40">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Belum ada ulasan untuk filter ini</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {selectedRating
              ? `Tidak ada ulasan dengan bintang ${selectedRating}.`
              : "Ulasan pembeli akan tampil di sini setelah pesanan selesai."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedReviews.map((rev: any, idx: number) => (
            <motion.div
              key={rev.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-display text-sm font-medium text-foreground">
                    {rev.order?.buyerName?.charAt(0)?.toUpperCase() ?? "P"}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      {rev.order?.buyerName ?? "Pembeli Tokolink"}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      Kode Order: #{rev.order?.orderCode}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
                    <span>{rev.rating}.0</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(rev.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Review Comment */}
              {rev.comment ? (
                <p className="text-sm text-foreground/90 leading-relaxed font-normal">{rev.comment}</p>
              ) : (
                <p className="text-xs italic text-muted-foreground">Pembeli tidak memberikan catatan tertulis.</p>
              )}

              {/* Purchased Products */}
              {rev.order?.items && rev.order.items.length > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground/70" /> Produk dibeli:
                  </span>
                  {rev.order.items.map((item: any, i: number) => (
                    <span
                      key={i}
                      className="rounded-lg bg-secondary px-2.5 py-1 font-medium text-secondary-foreground"
                    >
                      {item.productName} {item.variantName ? `(${item.variantName})` : ""} × {item.qty}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
