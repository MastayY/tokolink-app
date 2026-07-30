// src/components/storefront/checkout-form.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { useCart } from "@/lib/store";
import { useAreaSearch } from "@/hooks/use-area-search";
import { useShippingRates } from "@/hooks/use-shipping-rates";
import { useCheckout } from "@/hooks/use-checkout";
import { AreaSearch } from "@/components/storefront/area-search";
import { CourierPicker } from "@/components/storefront/courier-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatIDR, normalizePhone, getErrorMessage } from "@/lib/utils";
import type { BiteshipCourierRate } from "@/lib/biteship";

interface CheckoutFormProps {
  tenantId: string;
  storeSlug: string;
}

export function CheckoutForm({ tenantId, storeSlug }: CheckoutFormProps) {
  const items = useCart((s) => s.items);

  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");

  const isDigitalOnlyCart = items.length > 0 && items.every((i) => i.isDigital === true);

  const areaSearch = useAreaSearch();
  const [selectedArea, setSelectedArea] = useState<{ id: string; label: string } | null>(null);
  const shippingRates = useShippingRates();
  const [selectedRate, setSelectedRate] = useState<BiteshipCourierRate | null>(null);

  const checkout = useCheckout();

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const shippingCost = isDigitalOnlyCart ? 0 : (selectedRate?.price ?? 0);
  const total = subtotal + shippingCost;

  async function handleAreaSelect(area: { id: string; label: string } | null) {
    setSelectedArea(area);
    setSelectedRate(null);
    if (!area) return;
    await shippingRates.fetchRates({ tenantId, destinationAreaId: area.id, cartItems: items });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDigitalOnlyCart && (!selectedArea || !selectedRate)) return;

    const normalizedPhone = normalizePhone(buyerPhone);

    await checkout.submit(
      {
        tenantId,
        buyerName,
        buyerPhone: normalizedPhone,
        ...(isDigitalOnlyCart
          ? {}
          : {
              shippingAddress,
              shippingAreaId: selectedArea!.id,
              shippingAreaLabel: selectedArea!.label,
              courierCompany: selectedRate!.courier_code,
              courierType: selectedRate!.courier_service_code,
            }),
        shippingCost,
        note: note || undefined,
        cartItems: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          name: i.productName,
          variantName: i.variantName,
          price: i.unitPrice,
          qty: i.qty,
          weightGrams: i.weightGrams ?? 0,
        })),
      },
      storeSlug
    );
  }

  const isSubmitting = checkout.step === "submitting" || checkout.step === "payment";
  const isShippingValid = isDigitalOnlyCart || (selectedArea && selectedRate && shippingAddress.trim().length >= 10);
  const canSubmit = buyerName.trim().length >= 2 && buyerPhone.trim().length >= 10 && isShippingValid && !isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Form Fields */}
      <div className="lg:col-span-7 space-y-6">
        <section className="space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground">
            Data Pembeli
          </h2>

          <Field>
            <Label htmlFor="buyerName">Nama Lengkap</Label>
            <Input
              id="buyerName"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Nama pembeli"
              required
            />
          </Field>

          <Field>
            <Label htmlFor="buyerPhone">Nomor WhatsApp</Label>
            <Input
              id="buyerPhone"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="628xxxxxxxxxx"
              required
              pattern="^62\d{9,15}$"
              title="Awali dengan 62, tanpa + atau tanda hubung"
            />
          </Field>
        </section>

        {!isDigitalOnlyCart ? (
          <>
            <section className="space-y-4">
              <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground">
                Alamat Pengiriman
              </h2>

              <Field>
                <Label>Kecamatan / Kota</Label>
                <AreaSearch
                  query={areaSearch.query}
                  onQueryChange={areaSearch.setQuery}
                  results={areaSearch.results}
                  isLoading={areaSearch.isLoading}
                  selected={selectedArea ? { id: selectedArea.id, name: "", label: selectedArea.label } : null}
                  onSelect={(a) => handleAreaSelect(a ? { id: a.id, label: a.label } : null)}
                />
              </Field>

              <Field>
                <Label htmlFor="shippingAddress">Alamat Lengkap</Label>
                <Textarea
                  id="shippingAddress"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Jl. Contoh No. 1, RT/RW, Kelurahan, Kecamatan, Kota"
                  rows={3}
                  minLength={10}
                  required
                />
                {shippingAddress.length > 0 && shippingAddress.length < 10 ? (
                  <p className="text-xs text-destructive mt-1 font-medium">
                    Alamat terlalu pendek ({shippingAddress.length}/10 karakter minimal)
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimal 10 karakter (masukkan nama jalan, nomor, RT/RW, dan kelurahan)
                  </p>
                )}
              </Field>
            </section>

            {selectedArea && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                className="space-y-4"
              >
                <h2 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground">
                  Pilih Kurir
                </h2>
                {shippingRates.isLoading ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Mengambil tarif pengiriman...</p>
                ) : shippingRates.error ? (
                  <p className="text-sm text-destructive">{shippingRates.error}</p>
                ) : (
                  <CourierPicker
                    rates={shippingRates.rates}
                    selected={selectedRate}
                    onSelect={setSelectedRate}
                  />
                )}
              </motion.section>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
            Semua produk ini adalah produk digital, tidak ada pengiriman fisik yang diperlukan.
          </div>
        )}

        <Field>
          <Label htmlFor="note">Catatan (opsional)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan untuk penjual"
            rows={2}
          />
        </Field>
      </div>

      {/* Right Column: Order Summary & Checkout Action (Sticky on Desktop) */}
      <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-base border-b border-border pb-3">Ringkasan Pesanan</h3>

          {/* Cart items preview */}
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1 hide-scrollbar">
            {items.map((i) => (
              <div key={i.key} className="flex justify-between items-center text-sm gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{i.productName}</p>
                  {i.variantName && <p className="text-xs text-muted-foreground truncate">{i.variantName}</p>}
                  <p className="text-xs text-muted-foreground">{i.qty} x {formatIDR(i.unitPrice)}</p>
                </div>
                <span className="font-medium shrink-0 text-foreground">{formatIDR(i.unitPrice * i.qty)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} item)</span>
              <span className="text-foreground font-medium">{formatIDR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Ongkos Kirim</span>
              <span className="text-foreground font-medium">
                {isDigitalOnlyCart ? "Rp0 (Digital)" : selectedRate ? formatIDR(selectedRate.price) : "-"}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-base text-foreground pt-3 border-t border-border">
              <span>Total Bayar</span>
              <span className="font-display text-xl">{formatIDR(total)}</span>
            </div>
          </div>

          {checkout.error && (
            <p className="text-sm text-destructive">{getErrorMessage(checkout.error)}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full py-4 text-base font-medium shadow-sm cursor-pointer"
            loading={isSubmitting}
            disabled={!canSubmit}
          >
            {isSubmitting ? "Memproses..." : `Bayar Sekarang`}
          </Button>
        </div>
      </div>
    </form>
  );
}
