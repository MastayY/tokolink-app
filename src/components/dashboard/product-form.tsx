import { useState } from "react";
import { motion } from "framer-motion";
import type { Product, ProductVariantGroup } from "@/lib/types";
import { ImageUpload } from "@/components/ui/image-upload";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ProductFormProps {
  initial: Product | null;
  onClose: () => void;
  onSubmit: (data: Omit<Product, "id">) => void;
}

export function ProductForm({ initial, onClose, onSubmit }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? 0);
  const [weightGrams, setWeightGrams] = useState(initial?.weightGrams ?? 500);
  const [image, setImage] = useState(initial?.image ?? "");
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>(
    initial?.variantGroups ?? [],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center p-4"
      onClick={onClose}
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
            className="text-2xl text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Scrollable Form Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0 hide-scrollbar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit({
                name,
                description,
                basePrice: Number(basePrice),
                weightGrams: Number(weightGrams) || 500,
                image:
                  image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
                variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
              });
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
                  onClick={() =>
                    setVariantGroups([
                      ...variantGroups,
                      { id: crypto.randomUUID(), name: "", options: [] },
                    ])
                  }
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
                        onClick={() =>
                          setVariantGroups(variantGroups.filter((_, idx) => idx !== groupIdx))
                        }
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
                          opts.push({ id: crypto.randomUUID(), name: "", priceDelta: 0 });
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

            <Button type="submit" className="w-full shrink-0 py-3.5">
              {initial ? "Simpan perubahan" : "Tambah produk"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
