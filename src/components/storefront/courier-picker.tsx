// src/components/storefront/courier-picker.tsx
import { motion } from "framer-motion";
import { formatIDR } from "@/lib/utils";
import type { BiteshipCourierRate } from "@/lib/biteship";

interface CourierPickerProps {
  rates: BiteshipCourierRate[];
  selected: BiteshipCourierRate | null;
  onSelect: (rate: BiteshipCourierRate) => void;
}

export function CourierPicker({ rates, selected, onSelect }: CourierPickerProps) {
  if (rates.length === 0) return null;

  return (
    <div className="space-y-2">
      {rates.map((rate) => {
        const key = `${rate.courier_code}-${rate.courier_service_code}`;
        const isSelected =
          selected?.courier_code === rate.courier_code &&
          selected?.courier_service_code === rate.courier_service_code;

        return (
          <motion.button
            key={key}
            type="button"
            onClick={() => onSelect(rate)}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
              isSelected
                ? "border-foreground bg-foreground/5"
                : "border-border hover:border-foreground/50"
            }`}
          >
            <div>
              <div className="font-medium text-sm">
                {rate.courier_name} — {rate.courier_service_name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Estimasi {rate.duration}
              </div>
            </div>
            <div className="font-semibold text-sm">{formatIDR(rate.price)}</div>
          </motion.button>
        );
      })}
    </div>
  );
}
