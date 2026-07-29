// Fetches Biteship courier rates for the current cart
import { useState, useCallback } from "react";
import type { BiteshipCourierRate } from "@/lib/biteship";
import type { CartItem } from "@/lib/types";

export function useShippingRates() {
  const [rates, setRates] = useState<BiteshipCourierRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(
    async (params: {
      tenantId: string;
      destinationAreaId: string;
      cartItems: CartItem[];
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/shipping/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: params.tenantId,
            destinationAreaId: params.destinationAreaId,
            cartItems: params.cartItems.map((i) => ({
              name: i.productName,
              price: i.unitPrice,
              weightGrams: (i as any).weightGrams ?? 500,
              qty: i.qty,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal mengambil tarif");
        setRates(data.rates ?? []);
      } catch (e: any) {
        setError(e.message ?? "Gagal mengambil tarif pengiriman");
        setRates([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { rates, isLoading, error, fetchRates };
}
