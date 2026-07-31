import { useState } from "react";
import { motion } from "framer-motion";
import type { Product, ProductVariantGroup } from "@/lib/types";
import { useTenant } from "@/lib/store";
import { ImageUpload } from "@/components/ui/image-upload";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ProductFormProps {
  initial: Product | null;
  onClose: () => void;
  onSubmit: (data: Omit<Product, "id">) => Promise<void> | void;
  loading?: boolean;
}

export function ProductForm({ initial, onClose, onSubmit, loading: externalLoading = false }: ProductFormProps) {
  const categories = useTenant((s) => s.tenant?.categories ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? 0);
  const [weightGrams, setWeightGrams] = useState(initial?.weightGrams ?? 500);
  const [image, setImage] = useState(initial?.image ?? "");
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>(
    initial?.variantGroups ?? [],
  );
  const [isDigital, setIsDigital] = useState(initial?.isDigital ?? false);
  const [trackStock, setTrackStock] = useState(initial?.trackStock ?? false);
  const [stock, setStock] = useState<number | null>(initial?.stock ?? null);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [digitalDeliveryType, setDigitalDeliveryType] = useState<"AUTO_TEXT" | "MANUAL" | null>(
    initial?.digitalDeliveryType ?? null,
  );
  const [digitalDeliveryText, setDigitalDeliveryText] = useState(initial?.digitalDeliveryText ?? "");

  const isFormLoading = submitting || externalLoading;
  const hasVariants = variantGroups.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center p-4"
      onClick={isFormLoading ? undefined : onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-xl flex flex-col rounded-2xl bg-background overflow-hidden shadow-2xl"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h2 className="font-display text-2xl font-medium text-foreground">
            {initial ? "Edit produk" : "Produk baru"}
          </h2>
          <button
            onClick={onClose}
            disabled={isFormLoading}
            className="text-2xl text-muted-foreground hover:text-foreground transition cursor-pointer disabled:opacity-40"
          >
            ×
          </button>
        </div>

        {/* Scrollable Form Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0 hide-scrollbar">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              try {
                await onSubmit({
                  name,
                  description,
                  basePrice: Number(basePrice),
                  weightGrams: isDigital ? 0 : (Number(weightGrams) || 500),
                  image:
                    image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
                  isDigital,
                  trackStock,
                  stock: trackStock && !hasVariants ? (stock ?? null) : null,
                  category: category.trim() || null,
                  digitalDeliveryType: isDigital ? digitalDeliveryType : null,
                  digitalDeliveryText:
                    isDigital && digitalDeliveryType === "AUTO_TEXT" ? digitalDeliveryText : null,
                  variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
                });
              } finally {
                setSubmitting(false);
              }
            }}
            className="space-y-5"
          >
            <Field label="Nama">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Deskripsi">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </Field>
            <Field label="Harga dasar (Rp)">
              <Input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(+e.target.value)}
                required
              />
            </Field>

            {/* Category */}
            <Field label="Kategori (opsional)">
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Belum ada kategori. Tambahkan di bagian{" "}
                  <span className="font-medium text-foreground">Kategori Produk</span>{" "}
                  di atas.
                </p>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                >
                  <option value="">— Tidak ada kategori —</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {/* Digital product toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Produk Digital</p>
                <p className="text-xs text-muted-foreground">Tidak perlu pengiriman fisik</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsDigital((v) => !v); if (isDigital) setDigitalDeliveryType(null); }}
                className={`relative h-6 w-11 rounded-full transition-colors ${isDigital ? "bg-foreground" : "bg-border"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${isDigital ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {isDigital && (
              <div className="rounded-xl border border-border p-4 space-y-4">
                <p className="text-sm font-medium">Cara pengiriman digital</p>
                <div className="space-y-2">
                  {[
                    { value: "AUTO_TEXT" as const, label: "Otomatis (teks / link)", desc: "Pembeli langsung menerima teks setelah bayar" },
                    { value: "MANUAL" as const, label: "Manual (jasa / custom)", desc: "Kamu tandai selesai dari dashboard" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${digitalDeliveryType === opt.value ? "border-foreground bg-secondary" : "border-border"}`}
                    >
                      <input
                        type="radio"
                        name="deliveryType"
                        value={opt.value}
                        checked={digitalDeliveryType === opt.value}
                        onChange={() => setDigitalDeliveryType(opt.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {digitalDeliveryType === "AUTO_TEXT" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pesan / link yang dikirim ke pembeli</p>
                    <Textarea
                      value={digitalDeliveryText}
                      onChange={(e) => setDigitalDeliveryText(e.target.value)}
                      rows={4}
                      placeholder={"Halo {{buyerName}}, terima kasih sudah membeli!\nDownload di sini: https://drive.google.com/... (Pesanan: {{orderCode}})"}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Gunakan {"{{buyerName}}"} dan {"{{orderCode}}"} sebagai placeholder otomatis.
                    </p>
                  </div>
                )}
                {digitalDeliveryType === "MANUAL" && (
                  <p className="text-xs text-muted-foreground">
                    Kamu perlu klik "Tandai Terkirim" di dashboard setelah melayani pembeli.
                  </p>
                )}
              </div>
            )}

            {!isDigital && (
              <Field label="Berat Produk (gram)">
                <Input
                  type="number"
                  min={1}
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(+e.target.value || 500)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digunakan untuk kalkulasi ongkos kirim. Default: 500g.
                  {weightGrams === 500 && (
                    <span className="text-amber-500 font-medium ml-1">⚠ Masih default — ubah jika perlu</span>
                  )}
                </p>
              </Field>
            )}

            {/* Stock tracking — physical products and MANUAL digital */}
            {(!isDigital || digitalDeliveryType === "MANUAL") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Lacak Stok</p>
                    <p className="text-xs text-muted-foreground">Checkout diblokir saat stok habis</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTrackStock((v) => !v)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${trackStock ? "bg-foreground" : "bg-border"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${trackStock ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                {trackStock && !hasVariants && (
                  <Field label="Jumlah stok">
                    <Input
                      type="number"
                      min={0}
                      value={stock ?? ""}
                      onChange={(e) => setStock(e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="0"
                    />
                  </Field>
                )}
                {trackStock && hasVariants && (
                  <p className="text-xs text-muted-foreground px-1">
                    Stok diatur per varian di bagian "Tipe Varian Produk" di bawah.
                  </p>
                )}
              </div>
            )}

            <Field label="Gambar Produk">
              <ImageUpload value={image} onChange={(url) => setImage(url)} />
            </Field>

            {/* Variant groups builder section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Tipe Varian Produk
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newGroups = [
                      ...variantGroups,
                      { id: crypto.randomUUID(), name: "", options: [] },
                    ];
                    setVariantGroups(newGroups);
                    if (variantGroups.length === 0) {
                      setStock(null);
                    }
                  }}
                  className="text-xs hover:opacity-90 bg-foreground text-background px-3 py-1.5 rounded-full font-medium transition cursor-pointer"
                >
                  + Tipe Varian
                </button>
              </div>

              {variantGroups.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
                  Belum ada tipe varian. Tambahkan varian jika produk memiliki pilihan seperti
                  Ukuran, Warna, dll.
                </div>
              )}

              <div className="space-y-4">
                {variantGroups.map((group, groupIdx) => (
                  <div
                    key={group.id}
                    className="rounded-xl border border-border p-4 bg-muted/20 space-y-4 relative"
                  >
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <Field label={`Nama Tipe Varian #${groupIdx + 1}`}>
                          <Input
                            value={group.name}
                            onChange={(e) => {
                              const copy = [...variantGroups];
                              copy[groupIdx] = { ...group, name: e.target.value };
                              setVariantGroups(copy);
                            }}
                            placeholder="Contoh: Ukuran, Warna, Gilingan"
                            required
                          />
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newGroups = variantGroups.filter((_, idx) => idx !== groupIdx);
                          setVariantGroups(newGroups);
                          if (newGroups.length === 0) {
                            setStock(null);
                          }
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive border border-border bg-background hover:bg-destructive/10 px-3 py-2.5 rounded-xl transition cursor-pointer"
                      >
                        Hapus Grup
                      </button>
                    </div>

                    {/* Options inside this group */}
                    <div className="pl-4 border-l-2 border-border space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-2">
                        Pilihan, Harga Ekstra & Berat Override
                      </span>

                      {group.options?.map((option, optionIdx) => (
                        <div key={option.id} className="flex gap-2 items-center">
                          <Input
                            value={option.name}
                            onChange={(e) => {
                              const copy = [...variantGroups];
                              const opts = [...group.options];
                              opts[optionIdx] = { ...option, name: e.target.value };
                              copy[groupIdx] = { ...group, options: opts };
                              setVariantGroups(copy);
                            }}
                            placeholder="Pilihan (mis. M, Merah, Biji)"
                            required
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={option.priceDelta || ""}
                            onChange={(e) => {
                              const copy = [...variantGroups];
                              const opts = [...group.options];
                              opts[optionIdx] = { ...option, priceDelta: Number(e.target.value) };
                              copy[groupIdx] = { ...group, options: opts };
                              setVariantGroups(copy);
                            }}
                            placeholder="+Harga (Rp)"
                            className="w-28 shrink-0"
                          />
                          <Input
                            type="number"
                            value={option.weightGrams ?? ""}
                            onChange={(e) => {
                              const copy = [...variantGroups];
                              const opts = [...group.options];
                              opts[optionIdx] = {
                                ...option,
                                weightGrams: e.target.value ? Number(e.target.value) : undefined,
                              };
                              copy[groupIdx] = { ...group, options: opts };
                              setVariantGroups(copy);
                            }}
                            placeholder="Berat (g)"
                            className="w-24 shrink-0"
                          />
                          {trackStock && (
                            <Input
                              type="number"
                              min={0}
                              value={option.stock ?? ""}
                              onChange={(e) => {
                                const copy = [...variantGroups];
                                const opts = [...group.options];
                                const val = e.target.value === "" ? null : Number(e.target.value);
                                opts[optionIdx] = { ...option, stock: val };
                                copy[groupIdx] = { ...group, options: opts };
                                setVariantGroups(copy);
                              }}
                              placeholder="Stok"
                              className="w-20 shrink-0"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...variantGroups];
                              copy[groupIdx] = {
                                ...group,
                                options: group.options.filter((_, idx) => idx !== optionIdx),
                              };
                              setVariantGroups(copy);
                            }}
                            className="text-muted-foreground hover:text-foreground font-semibold px-1.5 py-1 text-base transition cursor-pointer shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...variantGroups];
                          const opts = [...(group.options || [])];
                          opts.push({ id: crypto.randomUUID(), name: "", priceDelta: 0, stock: null });
                          copy[groupIdx] = { ...group, options: opts };
                          setVariantGroups(copy);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium transition cursor-pointer"
                      >
                        + Tambah Pilihan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" loading={isFormLoading} className="w-full shrink-0 py-3.5">
              {isFormLoading ? "Memproses..." : initial ? "Simpan perubahan" : "Tambah produk"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
