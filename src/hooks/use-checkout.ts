// Handles full checkout submission + Snap.js payment invocation
import { useState, useCallback } from "react";
import type { CartItem } from "@/lib/types";

export interface CheckoutPayload {
  tenantId: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingAreaId: string;
  shippingAreaLabel: string;
  shippingCost: number;
  courierCompany: string;
  courierType: string;
  note?: string;
  cartItems: Array<CartItem & { weightGrams: number }>;
}

export type CheckoutStep = "idle" | "submitting" | "payment" | "done" | "error";

export function useCheckout() {
  const [step, setStep] = useState<CheckoutStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: CheckoutPayload, storeSlug: string) => {
      setStep("submitting");
      setError(null);
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            cartItems: payload.cartItems.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              name: i.productName,
              variantName: i.variantName,
              price: i.unitPrice,
              qty: i.qty,
              weightGrams: i.weightGrams,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal membuat pesanan");

        const { snapToken, orderCode: code } = data;
        setOrderCode(code);
        setStep("payment");

        // Invoke Midtrans Snap.js (loaded via script tag in checkout route head)
        (window as any).snap.pay(snapToken, {
          onSuccess: () => {
            setStep("done");
            window.location.href = `/${storeSlug}/order/${code}`;
          },
          onPending: () => {
            setStep("done");
            window.location.href = `/${storeSlug}/order/${code}`;
          },
          onError: () => {
            // Payment failed — cancel the order row immediately so it doesn't linger
            fetch("/api/checkout/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderCode: code }),
            }).catch(() => {}); // fire-and-forget; best effort
            setStep("error");
            setError("Pembayaran gagal. Silakan coba lagi.");
          },
          onClose: () => {
            // User closed Snap popup without completing payment.
            // Immediately cancel the order so it doesn't pollute the seller's dashboard
            // as a zombie PENDING_PAYMENT that would only expire after ~24 hours via webhook.
            fetch("/api/checkout/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderCode: code }),
            }).catch(() => {}); // fire-and-forget; best effort
            setStep("idle");
          },
        });
      } catch (e: any) {
        setStep("error");
        setError(e.message ?? "Terjadi kesalahan");
      }
    },
    []
  );

  return { step, error, orderCode, submit };
}
