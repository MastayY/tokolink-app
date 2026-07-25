import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export function getErrorMessage(err: any): string {
  if (!err) return "";
  const msg = err.message || String(err);
  try {
    if (typeof msg === "string" && msg.trim().startsWith("[")) {
      const parsed = JSON.parse(msg);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
        const first = parsed[0];
        const pathStr = first.path && first.path.length > 0 ? `${first.path.join(".")} - ` : "";
        return `${pathStr}${first.message}`;
      }
    }
  } catch (e) {
    // Fail-safe to return original message
  }
  return msg;
}

/**
 * Normalizes an Indonesian phone number to the 62xxx format required by the API.
 * Accepts: 08xxx, +62xxx, 62xxx, 8xxx
 * Returns: 62xxx (E.164-style without +)
 * Returns the original string unchanged if it doesn't look like an Indonesian number.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, ""); // strip all non-digits
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits; // unrecognized — return as-is and let Zod validation surface the error
}

