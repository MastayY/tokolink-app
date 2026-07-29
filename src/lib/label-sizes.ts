// src/lib/label-sizes.ts
// Browser-safe — tidak ada Node.js imports.
// Konstanta ini dibagi antara server (shipping-label.tsx) dan client (print-label-dropdown.tsx).

export const LABEL_SIZES = {
  a4:            { key: "a4",            label: "Default (A4)",           widthPt: 595, heightPt: 842 },
  thermal_8x10:  { key: "thermal_8x10",  label: "Thermal 1 (8 × 10 cm)", widthPt: 227, heightPt: 283 },
  thermal_10x15: { key: "thermal_10x15", label: "Thermal 2 (10 × 15 cm)", widthPt: 283, heightPt: 425 },
} as const;

export type LabelSizeKey = keyof typeof LABEL_SIZES;

export function isValidLabelSize(value: string): value is LabelSizeKey {
  return value in LABEL_SIZES;
}
