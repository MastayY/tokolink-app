// src/routes/$slug_.order.$orderCode.tsx
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { OrderStatusTimeline } from "@/components/storefront/order-status-timeline";
import { ReviewForm } from "@/components/storefront/review-form";
import { Button } from "@/components/ui/button";
import { formatIDR, normalizePhone } from "@/lib/utils";
import { toast } from "sonner";
import type { Order, OrderItem } from "@prisma/client";

type DigitalDeliveryType = "AUTO_TEXT" | "MANUAL";

type OrderItemWithDigital = OrderItem & {
  product?: {
    isDigital: boolean;
    digitalDeliveryType: DigitalDeliveryType | null;
  };
};

type OrderWithDigitalItems = Omit<Order, "items"> & {
  items: OrderItemWithDigital[];
  tenant?: { name: string; slug: string };
  review?: { id: string } | null;
};

export const Route = createFileRoute("/$slug_/order/$orderCode")({
  head: () => ({
    meta: [
      { title: "Status Pesanan — Tokolink" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderStatusPage,
});

function OrderStatusPage() {
  const { orderCode } = useParams({ from: "/$slug_/order/$orderCode" });

  // Buyer identifies via phone stored in sessionStorage (set after checkout)
  const [phone, setPhone] = useState(() =>
    sessionStorage.getItem(`order-phone-${orderCode}`) ?? ""
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [order, setOrder] = useState<OrderWithDigitalItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);

  async function fetchOrder(p: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/lookup?orderCode=${orderCode}&phone=${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder(data.order);
    } catch (e: any) {
      toast.error(e.message ?? "Pesanan tidak ditemukan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (phone) fetchOrder(phone);
  }, [phone]);

  async function handleConfirmReceipt() {
    if (!order) return;
    setConfirmingReceipt(true);
    try {
      const res = await fetch("/api/orders/confirm-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCode, phone }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Terima kasih! Pesanan selesai.");
      await fetchOrder(phone);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirmingReceipt(false);
    }
  }

  // Phone entry gate
  if (!phone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-xl font-display font-semibold">Cek Status Pesanan</h1>
          <p className="text-sm text-muted-foreground">
            Masukkan nomor WhatsApp yang digunakan saat checkout.
          </p>
          <input
            className="w-full border rounded-xl px-4 py-3 text-sm bg-background border-border focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="628xxxxxxxxxx"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={() => {
              const normalized = normalizePhone(phoneInput);
              sessionStorage.setItem(`order-phone-${orderCode}`, normalized);
              setPhone(normalized);
            }}
            disabled={phoneInput.length < 10}
          >
            Cek Pesanan
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Memuat pesanan...</p>
      </div>
    );
  }

  if (!order) return null;

  const hasPhysicalItem = order.items.some((i) => !i.product?.isDigital);
  const hasDigitalItem = order.items.some((i) => i.product?.isDigital);

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            {order.tenant?.name}
          </p>
          <h1 className="text-xl font-display font-semibold mt-1">
            Pesanan {order.orderCode}
          </h1>
        </div>

        {/* Physical Shipping Timeline */}
        {hasPhysicalItem && (
          <OrderStatusTimeline
            status={order.status}
            trackingNumber={order.trackingNumber}
            courierCompany={order.courierCompany}
          />
        )}

        {/* Digital delivery section */}
        {hasDigitalItem && (
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Produk Digital
              </p>
            </div>
            {order.items
              .filter((i) => i.product?.isDigital)
              .map((item) => (
                <div key={item.id} className="px-4 py-3 border-b border-border last:border-0 space-y-2">
                  <p className="text-sm font-medium">{item.productName}</p>
                  {item.deliveredAt ? (
                    <div className="rounded-xl bg-secondary/50 border border-border p-3">
                      <p className="text-xs font-medium text-foreground mb-2">✓ Produk digital sudah dikirim</p>
                      <p className="text-sm whitespace-pre-wrap text-foreground">
                        {item.digitalDeliverySnapshot}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        {item.product?.digitalDeliveryType === "MANUAL"
                          ? "Penjual sedang memproses pesanan digital ini."
                          : "Menunggu pengiriman otomatis..."}
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Items list & Financial summary */}
        <div className="rounded-xl border border-border divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{item.productName}</p>
                {item.variantName && (
                  <p className="text-xs text-muted-foreground">{item.variantName}</p>
                )}
                <p className="text-xs text-muted-foreground">x{item.qty}</p>
              </div>
              <p className="font-medium">{formatIDR(item.priceSnapshot * item.qty)}</p>
            </div>
          ))}

          {hasPhysicalItem && order.courierCompany && (
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-muted-foreground">Ongkos Kirim ({order.courierCompany.toUpperCase()})</span>
              <span>{formatIDR(order.shippingCost)}</span>
            </div>
          )}

          <div className="flex justify-between items-center px-4 py-3 font-semibold">
            <span>Total</span>
            <span>{formatIDR(order.subtotal + order.shippingCost)}</span>
          </div>
        </div>

        {/* Confirm receipt button for physical items */}
        {hasPhysicalItem && ["SHIPPED", "DELIVERED"].includes(order.status) && (
          <Button
            onClick={handleConfirmReceipt}
            disabled={confirmingReceipt}
            className="w-full"
          >
            {confirmingReceipt ? "Memproses..." : "Pesanan Sudah Diterima ✓"}
          </Button>
        )}

        {/* Review form */}
        {order.status === "COMPLETED" && !order.review && !reviewSubmitted && (
          <ReviewForm
            orderId={order.id}
            orderCode={order.orderCode}
            buyerPhone={phone}
            onSubmitted={() => setReviewSubmitted(true)}
          />
        )}

        {(order.status === "COMPLETED" && (order.review || reviewSubmitted)) && (
          <p className="text-sm text-center text-muted-foreground">
            ✓ Ulasan sudah diberikan. Terima kasih!
          </p>
        )}
      </div>
    </motion.main>
  );
}
