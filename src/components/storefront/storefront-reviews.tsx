import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { getStorefrontReviews } from "@/server/review.functions";

interface StorefrontReviewsProps {
  slug: string;
}

export function StorefrontReviews({ slug }: StorefrontReviewsProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    reviews: any[];
    avgRating: number;
    totalCount: number;
    distribution: Record<number, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  const PAGE_SIZE = 5;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getStorefrontReviews({
      data: {
        slug,
        rating: selectedRating ?? undefined,
      },
    })
      .then((res) => {
        if (isMounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load storefront reviews:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug, selectedRating]);

  if (!isLoading && (!data || data.totalCount === 0)) {
    return (
      <section className="mx-auto mt-16 max-w-2xl px-4">
        <div className="mb-6 flex items-baseline justify-between px-2">
          <h2 className="font-display text-lg font-medium tracking-tight">Ulasan Pembeli</h2>
          <span className="text-xs text-muted-foreground">0 ulasan</span>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Belum ada ulasan untuk toko ini</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Ulasan dari pembeli akan muncul di sini.</p>
        </div>
      </section>
    );
  }

  const reviewsList = data?.reviews ?? [];
  const totalPages = Math.ceil(reviewsList.length / PAGE_SIZE) || 1;
  const paginatedReviews = reviewsList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="mx-auto mt-16 max-w-2xl px-4">
      {/* Header */}
      <div className="mb-6 flex items-baseline justify-between px-2">
        <h2 className="font-display text-lg font-medium tracking-tight">Ulasan Pembeli</h2>
        <span className="text-xs text-muted-foreground">{data?.totalCount ?? 0} ulasan total</span>
      </div>

      {/* Summary Rating Card */}
      {data && data.totalCount > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-3 sm:items-center">
          {/* Average Rating Big */}
          <div className="flex flex-col items-center justify-center text-center sm:border-r sm:border-border sm:pr-4">
            <span className="font-display text-4xl font-light tracking-tight">{data.avgRating}</span>
            <div className="mt-1 flex items-center space-x-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(data.avgRating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>
            <span className="mt-1 text-xs text-muted-foreground">Berdasarkan {data.totalCount} ulasan</span>
          </div>

          {/* Rating Progress Bars */}
          <div className="col-span-2 space-y-1.5 px-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = data.distribution[star] ?? 0;
              const pct = data.totalCount > 0 ? (count / data.totalCount) * 100 : 0;
              return (
                <button
                  key={star}
                  onClick={() => {
                    startTransition(() => {
                      setSelectedRating(selectedRating === star ? null : star);
                      setPage(1);
                    });
                  }}
                  className={`group flex w-full items-center text-xs transition ${
                    selectedRating === star ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="w-6 text-left flex items-center gap-0.5">
                    {star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="mx-3 flex-1 overflow-hidden rounded-full bg-secondary h-2">
                    <div
                      className={`h-full transition-all duration-300 ${
                        selectedRating === star ? "bg-amber-400" : "bg-primary/80 group-hover:bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[10px] text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Star Pills */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => {
            setSelectedRating(null);
            setPage(1);
          }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
            selectedRating === null
              ? "bg-foreground text-background"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          Semua ({data?.totalCount ?? 0})
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            onClick={() => {
              setSelectedRating(selectedRating === star ? null : star);
              setPage(1);
            }}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
              selectedRating === star
                ? "bg-foreground text-background"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <span>{star}</span>
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="opacity-70">({data?.distribution[star] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card/60" />
          ))}
        </div>
      ) : paginatedReviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Tidak ada ulasan untuk filter {selectedRating} Bintang.
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedReviews.map((rev, idx) => (
            <motion.div
              key={rev.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-xl border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-display text-xs font-medium text-foreground">
                    {rev.order?.buyerName?.charAt(0)?.toUpperCase() ?? "P"}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-foreground">{rev.order?.buyerName ?? "Pembeli Tokolink"}</span>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= rev.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(rev.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              {rev.comment && <p className="text-xs text-foreground/90 leading-relaxed pl-9">{rev.comment}</p>}

              {/* Items Purchased Badges */}
              {rev.order?.items && rev.order.items.length > 0 && (
                <div className="pl-9 flex flex-wrap gap-1 pt-1">
                  {rev.order.items.map((item: any, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {item.productName} {item.variantName ? `(${item.variantName})` : ""}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between px-2 text-xs">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 transition disabled:opacity-40 hover:bg-secondary cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" /> Sebelum
          </button>
          <span className="text-muted-foreground">
            Halaman <strong className="text-foreground">{page}</strong> dari {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 transition disabled:opacity-40 hover:bg-secondary cursor-pointer"
          >
            Lanjut <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
