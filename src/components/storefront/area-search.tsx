// src/components/storefront/area-search.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { AreaOption } from "@/hooks/use-area-search";

interface AreaSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  results: AreaOption[];
  isLoading: boolean;
  selected: AreaOption | null;
  onSelect: (area: AreaOption | null) => void;
  placeholder?: string;
}

export function AreaSearch({
  query,
  onQueryChange,
  results,
  isLoading,
  selected,
  onSelect,
  placeholder = "Cari kecamatan/kota...",
}: AreaSearchProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={selected ? selected.label : query}
          onChange={(e) => {
            const val = e.target.value;
            if (selected) {
              onSelect(null);
            }
            onQueryChange(val);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          className="pr-8"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden max-h-60 overflow-y-auto"
          >
            {results.map((area) => (
              <li key={area.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(area);
                    onQueryChange(area.label);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="font-medium">{area.name}</span>
                  <span className="ml-1 text-muted-foreground text-xs">
                    {area.label.split(", ").slice(1).join(", ")}
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
