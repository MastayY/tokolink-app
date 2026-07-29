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
        if (g.options?.[0]) initial[g.id] = g.options[0];
      });
      return initial;
    },
  );

  const price =
    product.basePrice +
    Object.values(selectedOptions).reduce((sum, opt) => sum + opt.priceDelta, 0);

  const allSelected =
    product.variantGroups?.every((g) => selectedOptions[g.id] !== undefined) ?? true;

  const handleAdd = () => {
    if (!allSelected) return;
    const selectedArray = Object.values(selectedOptions);
    const optionIds = selectedArray.map((o) => o.id).join(",");
    const optionNames = selectedArray.map((o) => o.name).join(", ");
    add({
      key: `${product.id}-${selectedArray.map((o) => o.id).join("-")}`,
      productId: product.id,
      productName: product.name,
      variantId: optionIds,
      variantName: optionNames,
      unitPrice: price,
      qty: 1,
      image: product.image,
      isDigital: product.isDigital,
      weightGrams: product.weightGrams,
    });
    toast.success(`"${product.name} (${optionNames})" ditambahkan ke keranjang`);
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
                const isSelected = selectedOptions[group.id]?.id === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOptions((prev) => ({ ...prev, [group.id]: option }))}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.97] cursor-pointer ${
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    {option.name}
                    {option.priceDelta > 0 && (
                      <span className="ml-1 text-xs opacity-75">
                        +{formatIDR(option.priceDelta)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Button onClick={handleAdd} disabled={!allSelected} className="mt-6 w-full shrink-0 py-3.5">
        Tambah ke keranjang — {formatIDR(price)}
      </Button>
    </Sheet>
  );
}
