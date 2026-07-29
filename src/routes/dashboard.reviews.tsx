import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Star, MessageSquare, ShoppingBag } from "lucide-react";
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
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const reviews = data?.reviews ?? [];
  const filteredReviews = selectedRating
    ? reviews.filter((r: any) => r.rating === selectedRating)
    : reviews;

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

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          onClick={() => setSelectedRating(null)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition cursor-pointer ${
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
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition cursor-pointer ${
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

      {/* Reviews Table / List */}
      {filteredReviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/40">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Belum ada ulasan untuk filter ini</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {selectedRating ? `Tidak ada ulasan dengan bintang ${selectedRating}.` : "Ulasan pembeli akan tampil di sini setelah pesanan selesai."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((rev: any, idx: number) => (
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
                    <h4 className="text-sm font-medium text-foreground">{rev.order?.buyerName ?? "Pembeli Tokolink"}</h4>
                    <span className="text-xs text-muted-foreground">Kode Order: #{rev.order?.orderCode}</span>
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
