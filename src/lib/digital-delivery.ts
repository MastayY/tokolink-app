// src/lib/digital-delivery.ts
// SERVER-ONLY. Renders seller delivery template for a specific buyer.

/** Supported placeholder tokens in seller delivery text. */
export const DELIVERY_PLACEHOLDERS = ["{{buyerName}}", "{{orderCode}}"] as const;

/**
 * Replaces {{buyerName}} and {{orderCode}} in a seller-authored template.
 * Returns empty string if template is falsy. Never throws.
 */
export function renderDeliveryText(
  template: string | null | undefined,
  vars: { buyerName: string; orderCode: string },
): string {
  if (!template) return "";
  return template
    .replaceAll("{{buyerName}}", vars.buyerName)
    .replaceAll("{{orderCode}}", vars.orderCode);
}
