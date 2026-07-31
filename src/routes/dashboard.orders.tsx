import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { getMyOrders, markDigitalItemDelivered } from "@/server/order.functions";
import { OrderTable } from "@/components/dashboard/order-table";
import { OrderDetailDrawer } from "@/components/dashboard/order-detail-drawer";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import type { Order, OrderItem, Product } from "@prisma/client";

type OrderItemWithProduct = OrderItem & {
  product: Pick<Product, "isDigital" | "digitalDeliveryType"> | null;
};

type OrderWithItems = Order & {
  items: OrderItemWithProduct[];
  review: { id: string } | null;
};

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "PAID", label: "Baru (Dibayar)" },
  { value: "PROCESSING", label: "Diproses" },
  { value: "SHIPPED", label: "Dikirim" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
] as const;

export const Route = createFileRoute("/dashboard/orders")({
  loader: async () => {
    const result = await getMyOrders({ data: { page: 1 } });
    return result;
  },
  head: () => ({
    meta: [{ title: "Pesanan — Dashboard Tokolink" }],
  }),
  component: OrdersDashboardPage,
});

function OrdersDashboardPage() {
  const loaderData = Route.useLoaderData();
  const [orders, setOrders] = useState<OrderWithItems[]>(loaderData.orders as OrderWithItems[]);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [shippingOrders, setShippingOrders] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter panel state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [courierFilter, setCourierFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "total_high" | "total_low">("newest");

  // Unique couriers list
  const availableCouriers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.courierCompany) set.add(o.courierCompany.toUpperCase());
    });
    return Array.from(set);
  }, [orders]);

  // Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "ALL") count++;
    if (courierFilter !== "ALL") count++;
    if (sortBy !== "newest") count++;
    return count;
  }, [statusFilter, courierFilter, sortBy]);

  const filteredAndSorted = useMemo(() => {
    return orders
      .filter((o) => {
        // Status filter
        if (statusFilter !== "ALL" && o.status !== statusFilter) return false;

        // Courier filter
        if (courierFilter !== "ALL") {
          const company = (o.courierCompany || "").toUpperCase();
          if (company !== courierFilter) return false;
        }

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchCode = o.orderCode.toLowerCase().includes(q);
          const matchBuyer = o.buyerName.toLowerCase().includes(q);
          const matchPhone = o.buyerPhone.includes(q);
          const matchItem = o.items.some((i) => i.productName.toLowerCase().includes(q));
          if (!matchCode && !matchBuyer && !matchPhone && !matchItem) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const totalA = a.subtotal + a.shippingCost;
        const totalB = b.subtotal + b.shippingCost;
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();

        if (sortBy === "newest") return timeB - timeA;
        if (sortBy === "oldest") return timeA - timeB;
        if (sortBy === "total_high") return totalB - totalA;
        if (sortBy === "total_low") return totalA - totalB;
        return 0;
      });
  }, [orders, statusFilter, courierFilter, search, sortBy]);

  function resetFilters() {
    setStatusFilter("ALL");
    setCourierFilter("ALL");
    setSortBy("newest");
    setSearch("");
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const refreshed = await getMyOrders({ data: { page: 1 } });
      setOrders(refreshed.orders as OrderWithItems[]);
      toast.success("Daftar pesanan diperbarui");
    } catch (e: any) {
      toast.error(getErrorMessage(e, "Gagal memuat pesanan"));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleShipOrder(orderId: string) {
    setShippingOrders((prev) => new Set([...prev, orderId]));
    try {
      const res = await fetch(`/api/dashboard/orders/${orderId}/ship`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Resi berhasil dibuat: ${data.trackingNumber}`);
      const refreshed = await getMyOrders({ data: { page: 1 } });
      setOrders(refreshed.orders as OrderWithItems[]);
    } catch (e: any) {
      toast.error(getErrorMessage(e, "Gagal membuat resi"));
    } finally {
      setShippingOrders((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  async function handleMarkDelivered(orderItemId: string) {
    try {
      await markDigitalItemDelivered({ data: { orderItemId } });
      toast.success("Item berhasil ditandai terkirim");
      const refreshed = await getMyOrders({ data: { page: 1 } });
      setOrders(refreshed.orders as OrderWithItems[]);
      if (selectedOrder) {
        const updated = (refreshed.orders as OrderWithItems[]).find((o) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (e: any) {
      toast.error(getErrorMessage(e, "Gagal menandai item"));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold">Pesanan Masuk</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filteredAndSorted.length} dari {loaderData.total} pesanan ditampilkan
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition disabled:opacity-50 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Unified Filter Button Bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode pesanan, nama pembeli, no. WA, produk..."
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Unified Filter Button */}
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
                    <SlidersHorizontal className="h-4 w-4" /> Opsi Filter & Urutan
                  </h4>
                  <button
                    onClick={() => setShowFilterPanel(false)}
                    className="p-1 text-muted-foreground hover:text-foreground transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                      Status Pesanan
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    >
                      {STATUS_FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Courier Filter */}
                  {availableCouriers.length > 0 && (
                    <div className="space-y-2">
                      <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                        Ekspedisi / Kurir
                      </label>
                      <select
                        value={courierFilter}
                        onChange={(e) => setCourierFilter(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                      >
                        <option value="ALL">Semua Kurir</option>
                        {availableCouriers.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                      <option value="newest">Tanggal Pesanan (Terbaru)</option>
                      <option value="oldest">Tanggal Pesanan (Terlama)</option>
                      <option value="total_high">Total Harga (Tertinggi)</option>
                      <option value="total_low">Total Harga (Terendah)</option>
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

      <OrderTable
        orders={filteredAndSorted}
        onViewOrder={setSelectedOrder}
        onShipOrder={handleShipOrder}
        shippingOrders={shippingOrders}
      />

      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onMarkDelivered={handleMarkDelivered}
      />
    </motion.div>
  );
}
