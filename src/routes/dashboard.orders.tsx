import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCw } from "lucide-react";
import { getMyOrders, markDigitalItemDelivered } from "@/server/order.functions";
import { OrderTable } from "@/components/dashboard/order-table";
import { OrderDetailDrawer } from "@/components/dashboard/order-detail-drawer";
import { toast } from "sonner";
import type { Order, OrderItem, Product } from "@prisma/client";

type OrderItemWithProduct = OrderItem & {
  product: Pick<Product, "isDigital" | "digitalDeliveryType"> | null;
};

type OrderWithItems = Order & {
  items: OrderItemWithProduct[];
  review: { id: string } | null;
};

const STATUS_FILTER_OPTIONS = [
  { value: undefined, label: "Semua" },
  { value: "PAID", label: "Baru" },
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
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filtered = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const refreshed = await getMyOrders({ data: { page: 1 } });
      setOrders(refreshed.orders as OrderWithItems[]);
      toast.success("Daftar pesanan diperbarui");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memuat pesanan");
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
      // Refresh orders
      const refreshed = await getMyOrders({ data: { page: 1 } });
      setOrders(refreshed.orders as OrderWithItems[]);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal membuat resi");
    } finally {
      setShippingOrders((prev) => { const next = new Set(prev); next.delete(orderId); return next; });
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
      toast.error(e.message ?? "Gagal menandai item");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold">Pesanan Masuk</h1>
          <p className="text-muted-foreground text-sm mt-1">{loaderData.total} pesanan total</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:border-foreground/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <OrderTable
        orders={filtered}
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
