import { motion } from "framer-motion";
import { useState } from "react";
import { useCart } from "@/lib/store";
import { formatIDR } from "@/lib/utils";
import { FallbackImage } from "@/components/fallback-image";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useNavigate, useParams } from "@tanstack/react-router";

interface FloatingCartProps {
  storeName: string;
  phone: string;
}

export function FloatingCart({ storeName }: FloatingCartProps) {
  const items = useCart((s) => s.items);
  const totalQty = useCart((s) => s.totalQty());
  const totalPrice = useCart((s) => s.totalPrice());
  const inc = useCart((s) => s.inc);
  const dec = useCart((s) => s.dec);
  const clear = useCart((s) => s.clear);
  const [open, setOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const slug = (params as any).slug ?? "";

  if (totalQty === 0) return null;

  const handleCheckout = async () => {
    setIsNavigating(true);
    try {
      await navigate({ to: "/$slug/checkout", params: { slug } });
    } finally {
      setIsNavigating(false);
      setOpen(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full bg-foreground p-2 pl-5 text-background shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] hover:scale-[1.01] transition duration-200 cursor-pointer"
      >
        <span className="text-sm">
          <span className="font-medium">{totalQty} item</span>
          <span className="mx-2 opacity-40">·</span>
          <span>{formatIDR(totalPrice)}</span>
        </span>
        <span className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-foreground">
          Lihat keranjang →
        </span>
      </motion.button>

      <Sheet open={open} onClose={() => !isNavigating && setOpen(false)}>
        <h3 className="font-display text-2xl font-medium shrink-0">Keranjang</h3>

        <ul className="mt-4 divide-y divide-border overflow-y-auto flex-1 pr-1 hide-scrollbar">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-3 py-3">
              <FallbackImage
                src={i.image}
                alt={i.productName}
                fallbackText={i.productName}
                className="h-14 w-14 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{i.productName}</div>
                {i.variantName && (
                  <div className="text-xs text-muted-foreground truncate">{i.variantName}</div>
                )}
                <div className="text-xs text-muted-foreground">{formatIDR(i.unitPrice)}</div>
              </div>
              <div className="flex items-center gap-2 text-sm shrink-0">
                <button
                  onClick={() => dec(i.key)}
                  className="h-7 w-7 rounded-full border border-border hover:bg-surface transition cursor-pointer flex items-center justify-center"
                >
                  −
                </button>
                <span className="w-4 text-center font-medium">{i.qty}</span>
                <button
                  onClick={() => inc(i.key)}
                  className="h-7 w-7 rounded-full border border-border hover:bg-surface transition cursor-pointer flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 shrink-0">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-display text-2xl font-medium">{formatIDR(totalPrice)}</span>
        </div>

        <Button onClick={handleCheckout} disabled={isNavigating} variant="accent" className="mt-4 w-full shrink-0 py-4">
          {isNavigating ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-4 w-4" />
              <span>Memuat checkout...</span>
            </span>
          ) : (
            `Checkout — ${formatIDR(totalPrice)} →`
          )}
        </Button>
        <button
          onClick={() => clear()}
          disabled={isNavigating}
          className="mt-3 w-full text-xs text-muted-foreground hover:text-destructive transition shrink-0 cursor-pointer disabled:opacity-50"
        >
          Kosongkan keranjang
        </button>
      </Sheet>
    </>
  );
}
