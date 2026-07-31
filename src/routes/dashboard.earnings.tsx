// src/routes/dashboard.earnings.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { getMyEarnings } from "@/server/order.functions";
import { EarningsSummaryCard } from "@/components/dashboard/earnings-summary-card";
import { PayoutTable } from "@/components/dashboard/payout-table";

export const Route = createFileRoute("/dashboard/earnings")({
  loader: async () => {
    return getMyEarnings({});
  },
  head: () => ({
    meta: [{ title: "Pendapatan — Dashboard Tokolink" }],
  }),
  component: EarningsPage,
});

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "SCHEDULED", label: "Dijadwalkan" },
  { value: "PROCESSING", label: "Diproses" },
  { value: "PAID", label: "Dibayar" },
  { value: "FAILED", label: "Gagal" },
];

function EarningsPage() {
  const { payouts, summary } = Route.useLoaderData();

  // Filter panel state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_high" | "amount_low">("newest");

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "ALL") count++;
    if (sortBy !== "newest") count++;
    return count;
  }, [statusFilter, sortBy]);

  const filteredAndSortedPayouts = useMemo(() => {
    return (payouts as any[])
      .filter((p) => {
        if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchCode = p.order?.orderCode?.toLowerCase().includes(q);
          const matchBuyer = p.order?.buyerName?.toLowerCase().includes(q);
          if (!matchCode && !matchBuyer) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.scheduledAt || a.createdAt).getTime();
        const timeB = new Date(b.scheduledAt || b.createdAt).getTime();
        if (sortBy === "newest") return timeB - timeA;
        if (sortBy === "oldest") return timeA - timeB;
        if (sortBy === "amount_high") return b.amount - a.amount;
        if (sortBy === "amount_low") return a.amount - b.amount;
        return 0;
      });
  }, [payouts, search, statusFilter, sortBy]);

  function resetFilters() {
    setStatusFilter("ALL");
    setSortBy("newest");
    setSearch("");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-display font-semibold">Pendapatan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Dana kamu otomatis ditransfer setelah pesanan selesai.
        </p>
      </div>

      <EarningsSummaryCard
        pendingTotal={summary.pendingTotal}
        paidThisMonth={summary.paidThisMonth}
      />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-semibold text-base">Riwayat Payout ({filteredAndSortedPayouts.length})</h2>
        </div>

        {/* Search & Unified Filter Button Bar */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode order atau nama pembeli..."
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
                      <SlidersHorizontal className="h-4 w-4" /> Opsi Filter & Urutan Payout
                    </h4>
                    <button
                      onClick={() => setShowFilterPanel(false)}
                      className="p-1 text-muted-foreground hover:text-foreground transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                        Status Payout
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
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
                        <option value="newest">Tanggal Payout (Terbaru)</option>
                        <option value="oldest">Tanggal Payout (Terlama)</option>
                        <option value="amount_high">Nominal (Tertinggi)</option>
                        <option value="amount_low">Nominal (Terendah)</option>
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

        <PayoutTable payouts={filteredAndSortedPayouts} />
      </div>
    </motion.div>
  );
}
