// src/components/dashboard/order-detail-drawer.tsx
import { Sheet } from "@/components/ui/sheet";
import { formatIDR } from "@/lib/utils";
import type { Order, OrderItem } from "@prisma/client";

type OrderWithItems = Order & { items: OrderItem[] };

interface OrderDetailDrawerProps {
  order: OrderWithItems | null;
  onClose: () => void;
}

export function OrderDetailDrawer({ order, onClose }: OrderDetailDrawerProps) {
  if (!order) return null;

  return (
    <Sheet open={!!order} onClose={onClose}>
      <div className="space-y-1 shrink-0">
        <p className="font-mono text-lg font-semibold">{order.orderCode}</p>
        <p className="text-sm text-muted-foreground">{order.buyerName} · {order.buyerPhone}</p>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto space-y-4 min-h-0">
        {/* Shipping info */}
        <div className="rounded-xl border border-border p-4 space-y-1 text-sm">
          <p className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">
            Alamat Pengiriman
          </p>
          <p>{order.shippingAddress}</p>
          <p className="text-muted-foreground">{order.shippingAreaLabel}</p>
          {order.courierCompany && (
            <p className="text-muted-foreground">
              Kurir: {order.courierCompany.toUpperCase()} ({order.courierType})
            </p>
          )}
          {order.trackingNumber && (
            <p className="font-medium">Resi: {order.trackingNumber}</p>
          )}
        </div>

        {/* Items */}
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{item.productName}</p>
                {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                <p className="text-xs text-muted-foreground">x{item.qty}</p>
              </div>
              <p className="font-medium">{formatIDR(item.priceSnapshot * item.qty)}</p>
            </div>
          ))}
        </div>

        {/* Financials */}
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal produk</span>
            <span>{formatIDR(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ongkos kirim</span>
            <span>{formatIDR(order.shippingCost)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Platform fee</span>
            <span>-{formatIDR(order.platformFee)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-border">
            <span>Kamu terima</span>
            <span>{formatIDR(order.sellerPayout)}</span>
          </div>
        </div>

        {order.note && (
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Catatan Pembeli</p>
            <p>{order.note}</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
