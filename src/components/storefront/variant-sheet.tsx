import { useState } from "react";
import { useCart } from "@/lib/store";
import { formatIDR } from "@/lib/utils";
import type { Product, ProductVariantOption } from "@/lib/types";
import { FallbackImage } from "@/components/fallback-image";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface VariantSheetProps {
  product: Product;
  onClose: () => void;
}

export function VariantSheet({ product, onClose }: VariantSheetProps) {
  const add = useCart((s) => s.add);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, ProductVariantOption>>(
    () => {
      const initial: Record<string, ProductVariantOption> = {};
      product.variantGroups?.forEach((g) => {
        // Pick first available in-stock option if possible
        const inStock = g.options?.find((o) => o.stock === null || o.stock > 0);
        if (inStock) {
          initial[g.id] = inStock;
        } else if (g.options?.[0]) {
          initial[g.id] = g.options[0];
        }
      });
      return initial;
    }
  );

  const hasVariants = product.variantGroups && product.variantGroups.length > 0;

  // Determine current stock from selected options or product level
  const activeStock = product.trackStock
    ? hasVariants
      ? Object.values(selectedOptions).reduce<number | null>((min, opt) => {
          if (opt.stock === null) return min;
          return min === null ? opt.stock : Math.min(min, opt.stock);
        }, null)
      : product.stock
    : null;

  const isOutOfStock = product.trackStock && (
    hasVariants
      ? Object.values(selectedOptions).some((opt) => opt.stock !== null && opt.stock <= 0)
      : (product.stock ?? 0) <= 0
  );

  const price =
    product.basePrice +
    Object.values(selectedOptions).reduce((sum, opt) => sum + opt.priceDelta, 0);

  const allSelected =
    product.variantGroups?.every((g) => selectedOptions[g.id] !== undefined) ?? true;

  const handleAdd = () => {
    if (!allSelected || isOutOfStock) return;
    const selectedArray = Object.values(selectedOptions);
    const optionIds = selectedArray.map((o) => o.id).filter(Boolean).join(",");
    const optionNames = selectedArray.map((o) => o.name).join(", ");
    add({
      key: `${product.id}-${selectedArray.map((o) => o.id || o.name).join("-")}`,
      productId: product.id,
      productName: product.name,
      variantId: optionIds || undefined,
      variantName: optionNames || undefined,
      unitPrice: price,
      qty: 1,
      image: product.image,
      isDigital: product.isDigital,
      weightGrams: product.weightGrams,
    });
    toast.success(`"${product.name}${optionNames ? ` (${optionNames})` : ""}" ditambahkan ke keranjang`);
    onClose();
  };

  return (
    <Sheet open={true} onClose={onClose}>
      <div className="flex gap-4 shrink-0">
        <FallbackImage
          src={product.image}
          alt={product.name}
          fallbackText={product.name}
          className="h-20 w-20 rounded-xl object-cover"
        />
        <div className="flex-1">
          <div className="font-display text-lg font-medium">{product.name}</div>
          <div className="mt-1 text-sm text-muted-foreground">{formatIDR(price)}</div>

          {/* Stock Display for Buyer */}
          {product.trackStock && (
            <div className="mt-1 text-xs font-semibold">
              {isOutOfStock ? (
                <span className="text-red-500">Stok Varian Ini Habis</span>
              ) : activeStock === null ? (
                <span className="text-muted-foreground">Stok Tanpa Batas</span>
              ) : (
                <span
                  className={
                    activeStock <= 5
                      ? "text-amber-500"
                      : "text-emerald-600 dark:text-emerald-400"
                  }
                >
                  Sisa {activeStock} stok tersedia
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-y-auto pr-1 space-y-5 flex-1 min-h-0 hide-scrollbar">
        {product.variantGroups?.map((group) => (
          <div key={group.id} className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pilih {group.name}
            </div>
            <div className="flex flex-wrap gap-2">
              {group.options?.map((option) => {
                const isSelected = selectedOptions[group.id]?.id === option.id || selectedOptions[group.id]?.name === option.name;
                const variantOutOfStock = product.trackStock && option.stock !== null && option.stock <= 0;
                return (
                  <button
                    key={option.id || option.name}
                    onClick={() => !variantOutOfStock && setSelectedOptions((prev) => ({ ...prev, [group.id]: option }))}
                    disabled={variantOutOfStock}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.97] ${
                      variantOutOfStock
                        ? "border-border text-muted-foreground opacity-50 cursor-not-allowed line-through"
                        : isSelected
                        ? "border-foreground bg-foreground text-background cursor-pointer"
                        : "border-border hover:border-foreground cursor-pointer"
                    }`}
                  >
                    {option.name}
                    {option.priceDelta > 0 && (
                      <span className="ml-1 text-xs opacity-75">
                        +{formatIDR(option.priceDelta)}
                      </span>
                    )}
                    {product.trackStock && option.stock !== null && option.stock > 0 && option.stock <= 5 && (
                      <span className="ml-1 text-[10px] text-amber-500 font-normal">
                        ({option.stock} sisa)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={handleAdd}
        disabled={!allSelected || isOutOfStock}
        className="mt-6 w-full shrink-0 py-3.5"
      >
        {isOutOfStock
          ? "Stok Habis"
          : `Tambah ke keranjang`}
      </Button>
    </Sheet>
  );
}
