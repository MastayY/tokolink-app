import { Button } from "@/components/ui/button";
import { FallbackImage } from "@/components/fallback-image";
import { formatIDR } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const isOutOfStock = product.trackStock && (product.stock ?? 0) <= 0;

  return (
    <li className="group overflow-hidden rounded-2xl border border-border bg-card flex flex-col justify-between">
      <div>
        <div className="aspect-square overflow-hidden bg-secondary relative">
          <FallbackImage
            src={product.image}
            alt={product.name}
            fallbackText={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />

          {/* Stock & Digital Badge Overlay */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {product.isDigital && (
              <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium backdrop-blur-md bg-background/80">
                Digital
              </Badge>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="font-display text-base font-medium text-foreground">{product.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatIDR(product.basePrice)}</div>

          {/* Stock Info Badge */}
          <div className="mt-2.5 flex items-center gap-2">
            {product.trackStock ? (
              isOutOfStock ? (
                <span className="rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2.5 py-0.5 text-[10px] font-semibold">
                  Stok Habis (0)
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold">
                  Sisa Stok: {product.stock}
                </span>
              )
            ) : (
              <span className="rounded-full bg-secondary text-muted-foreground border border-border px-2.5 py-0.5 text-[10px]">
                Stok Tanpa Batas
              </span>
            )}
          </div>

          {/* Variant groups display */}
          {product.variantGroups && product.variantGroups.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-border pt-3">
              {product.variantGroups.map((g) => (
                <div key={g.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">{g.name}</span>:{" "}
                  {g.options.map((o) => o.name).join(", ")}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="flex gap-2 text-xs">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            Hapus
          </Button>
        </div>
      </div>
    </li>
  );
}
