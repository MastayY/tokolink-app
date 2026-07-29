// src/lib/mask.ts
// PII masking for shipping labels — mirrors Biteship's own label convention.

/**
 * Masks all but the first character of a name.
 * "Budi Santoso" → "B***"
 */
export function maskName(name: string): string {
  if (name.length <= 1) return name;
  return name[0] + "*".repeat(Math.max(name.length - 1, 3));
}

/**
 * Masks the middle digits of a phone number.
 * "6281234567890" → "0812******90"
 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  const withLeadingZero = phone.startsWith("62") ? "0" + phone.slice(2) : phone;
  const start = withLeadingZero.slice(0, 4);
  const end = withLeadingZero.slice(-2);
  const stars = "*".repeat(Math.max(withLeadingZero.length - 6, 4));
  return `${start}${stars}${end}`;
}
