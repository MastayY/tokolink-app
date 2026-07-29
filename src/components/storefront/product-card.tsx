import { motion } from "framer-motion";
import { FallbackImage } from "@/components/fallback-image";
import { formatIDR } from "@/lib/utils";
import { useCart } from "@/lib/store";
import type { Product } from "@/lib/types";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  delay?: number;
  onSelect: () => void;
}

export function ProductCard({ product, delay = 0, onSelect }: ProductCardProps) {
  const add = useCart((s) => s.add);
  const hasVariants = product.variantGroups && product.variantGroups.length > 0;
  const isOutOfStock = product.trackStock && (product.stock ?? Infinity) <= 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    if (hasVariants) {
      onSelect();
    } else {
      add({
        key: product.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.basePrice,
        qty: 1,
        image: product.image,
        isDigital: product.isDigital,
        weightGrams: product.weightGrams,
      });
      toast.success(`"${product.name}" ditambahkan ke keranjang`);
    }
  };

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
      className="overflow-hidden rounded-2xl border border-border bg-card flex flex-col justify-between"
    >
      <div className="aspect-square overflow-hidden bg-secondary relative">
        <FallbackImage
          src={product.image}
          alt={product.name}
          fallbackText={product.name}
          className="h-full w-full object-cover"
        />

        {/* Out-of-stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-background border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              Stok Habis
            </span>
          </div>
        )}

        {/* Digital badge */}
        {product.isDigital && !isOutOfStock && (
          <div className="absolute top-2 right-2 rounded-full bg-background/90 border border-border px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm">
            Digital
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <div className="font-display text-sm font-medium leading-snug">{product.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatIDR(product.basePrice)}</div>
        </div>
        <button
          onClick={isOutOfStock ? undefined : handleAdd}
          disabled={isOutOfStock}
          className={`mt-3 w-full rounded-full py-2 text-xs font-medium transition ${
            isOutOfStock
              ? "bg-border text-muted-foreground cursor-not-allowed"
              : "bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] cursor-pointer"
          }`}
        >
          {isOutOfStock ? "Stok Habis" : "+ Keranjang"}
        </button>
      </div>
    </motion.div>
  );
}
