// src/components/dashboard/order-table.tsx
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";
import { PrintLabelDropdown } from "@/components/dashboard/print-label-dropdown";
import type { Order, OrderItem } from "@prisma/client";

type OrderWithItems = Order & { items: OrderItem[]; review: { id: string } | null };

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Bayar",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  DELIVERED: "Terkirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PENDING_PAYMENT: "secondary",
  PAID: "default",
  PROCESSING: "default",
  SHIPPED: "default",
  DELIVERED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
};

interface OrderTableProps {
  orders: OrderWithItems[];
  onViewOrder: (order: OrderWithItems) => void;
  onShipOrder: (orderId: string) => void;
  shippingOrders: Set<string>;
}

export function OrderTable({ orders, onViewOrder, onShipOrder, shippingOrders }: OrderTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Belum ada pesanan masuk.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border border border-border rounded-xl">
      {orders.map((order, idx) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03, duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="flex items-center justify-between px-4 py-4 bg-card hover:bg-muted/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">{order.orderCode}</span>
              <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                {STATUS_LABELS[order.status] ?? order.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {order.buyerName} · {order.items.length} produk
            </p>
            <p className="text-xs text-muted-foreground">
              {formatIDR(order.subtotal + order.shippingCost)}
              {" · "}
              {new Date(order.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex gap-2 shrink-0 ml-4">
            <Button variant="outline" size="sm" onClick={() => onViewOrder(order)}>
              Detail
            </Button>
            {(order.status === "PAID" || order.status === "PROCESSING") && (
              <Button
                size="sm"
                onClick={() => onShipOrder(order.id)}
                disabled={shippingOrders.has(order.id)}
              >
                {shippingOrders.has(order.id) ? "Memproses..." : "Buat Resi"}
              </Button>
            )}
            {order.trackingNumber && (
              <PrintLabelDropdown orderId={order.id} />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
