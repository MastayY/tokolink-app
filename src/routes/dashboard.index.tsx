import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTenant } from "@/lib/store";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { formatIDR, getAppUrl, getAppHost } from "@/lib/utils";
import { getOverviewData } from "@/server/order.functions";
import {
  Wallet,
  ShoppingBag,
  PackageCheck,
  Star,
  ArrowUpRight,
  Plus,
  Settings,
  Link2,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  loader: async () => {
    try {
      const overview = await getOverviewData({});
      return { overview };
    } catch {
      return { overview: null };
    }
  },
  component: Overview,
});

function Overview() {
  const { overview } = Route.useLoaderData();
  const tenant = useTenant((s) => s.tenant);

  if (!tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  const stats = overview?.stats ?? {
    totalEarnings: 0,
    totalOrders: 0,
    activeProducts: tenant.products.length,
    activeLinks: tenant.links.length,
    avgRating: 0,
    totalReviews: 0,
  };

  const chartData = overview?.chartData ?? [];
  const recentOrders = overview?.recentOrders ?? [];
  const recentReviews = overview?.recentReviews ?? [];

  const maxChartAmount = Math.max(...chartData.map((d) => d.amount), 1);

  return (
    <div className="space-y-10 text-foreground animate-fade-in pb-12">
      {/* Header & Store URL */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <PageHeader label="Overview Toko" title={`Halo, ${tenant.name}.`} />
          <p className="mt-1 text-sm text-muted-foreground">
            URL Toko:{" "}
            <a
              href={`${getAppUrl()}/${tenant.slug}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
            >
              {getAppHost()}/{tenant.slug} <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard/products"
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background transition hover:bg-foreground/90 shadow-xs"
          >
            <Plus className="h-4 w-4" /> Tambah Produk
          </Link>
          <Link
            to="/dashboard/settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
          >
            <Settings className="h-4 w-4 text-muted-foreground" /> Pengaturan Toko
          </Link>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-widest font-medium">Pendapatan</span>
          </div>
          <div className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
            {formatIDR(stats.totalEarnings)}
          </div>
          <span className="mt-1 text-[10px] text-muted-foreground">Total dari pesanan dibayar</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-widest font-medium">Total Pesanan</span>
          </div>
          <div className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
            {stats.totalOrders} <span className="text-xs font-normal text-muted-foreground">pesanan</span>
          </div>
          <span className="mt-1 text-[10px] text-muted-foreground">Termasuk pesanan diproses & selesai</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-widest font-medium">Produk Aktif</span>
          </div>
          <div className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
            {stats.activeProducts} <span className="text-xs font-normal text-muted-foreground">produk</span>
          </div>
          <span className="mt-1 text-[10px] text-muted-foreground">{stats.activeLinks} tautan aktif di halaman</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-widest font-medium">Rating Toko</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {stats.avgRating > 0 ? stats.avgRating : "0.0"}
            </span>
            <span className="text-xs text-muted-foreground">/ 5.0</span>
          </div>
          <span className="mt-1 text-[10px] text-muted-foreground">{stats.totalReviews} ulasan diterima</span>
        </div>
      </div>

      {/* Revenue Trend Chart Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-medium">Tren Pendapatan 6 Bulan Terakhir</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Ringkasan total pendapatan bulanan toko</p>
          </div>
          <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            Toko Aktif
          </span>
        </div>

        {/* Minimalist Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="grid grid-cols-6 gap-3 sm:gap-6 items-end h-44 border-b border-border pb-2">
            {chartData.map((d, idx) => {
              const heightPct = maxChartAmount > 0 ? Math.max((d.amount / maxChartAmount) * 100, 8) : 8;
              return (
                <div key={idx} className="group relative flex flex-col items-center h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] font-mono py-1 px-2 rounded-md whitespace-nowrap z-10 pointer-events-none shadow-md">
                    {formatIDR(d.amount)} ({d.ordersCount} order)
                  </div>

                  {/* Bar */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.08 }}
                    className={`w-full max-w-[48px] rounded-t-lg transition-colors ${
                      d.amount > 0 ? "bg-primary/90 group-hover:bg-primary" : "bg-muted/60"
                    }`}
                  />
                  <span className="mt-2 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                    {d.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Orders & Recent Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <h3 className="font-display text-sm font-medium flex items-center gap-2">
              Pesanan Terbaru
            </h3>
            <Link to="/dashboard/orders" className="text-xs text-muted-foreground hover:text-foreground font-medium">
              Lihat Semua →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Belum ada pesanan yang masuk.</p>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((ord: any) => (
                <div
                  key={ord.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/40 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono font-medium text-foreground">#{ord.orderCode}</span>
                    <p className="text-muted-foreground">{ord.buyerName}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="font-mono font-medium text-foreground">{formatIDR(ord.subtotal + ord.shippingCost)}</span>
                    <div>
                      <Badge status={ord.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reviews Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <h3 className="font-display text-sm font-medium flex items-center gap-2">
              Ulasan Terbaru
            </h3>
            <Link to="/dashboard/reviews" className="text-xs text-muted-foreground hover:text-foreground font-medium">
              Lihat Semua →
            </Link>
          </div>

          {recentReviews.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Belum ada ulasan dari pembeli.</p>
          ) : (
            <div className="space-y-2.5">
              {recentReviews.map((rev: any) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-xl bg-secondary/50 border border-border/40 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{rev.order?.buyerName ?? "Pembeli"}</span>
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
                  {rev.comment && <p className="text-muted-foreground line-clamp-2 text-[11px]">{rev.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/dashboard/products"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:border-foreground/30 shadow-xs"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <ShoppingBag className="h-5 w-5 text-foreground" />
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
          <h4 className="font-display mt-6 text-base font-medium">Kelola Produk</h4>
          <p className="mt-1 text-xs text-muted-foreground">Tambah, edit, dan atur varian katalog produk toko Anda.</p>
        </Link>

        <Link
          to="/dashboard/links"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:border-foreground/30 shadow-xs"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <Link2 className="h-5 w-5 text-foreground" />
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
          <h4 className="font-display mt-6 text-base font-medium">Kelola Tautan</h4>
          <p className="mt-1 text-xs text-muted-foreground">Atur tautan medsos dan bio link di halaman toko Anda.</p>
        </Link>

        <Link
          to="/dashboard/reviews"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:border-foreground/30 shadow-xs"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
          <h4 className="font-display mt-6 text-base font-medium">Ulasan Pembeli</h4>
          <p className="mt-1 text-xs text-muted-foreground">Lihat dan analisis masukan kepuasan pelanggan toko.</p>
        </Link>
      </div>
    </div>
  );
}
