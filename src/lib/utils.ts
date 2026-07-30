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

export function getErrorMessage(err: any, fallback: string = "Terjadi kesalahan. Silakan coba lagi."): string {
  if (!err) return fallback;

  let msg = typeof err === "string" ? err : err?.message || err?.error || String(err);
  if (!msg || typeof msg !== "string") return fallback;

  // 1. Strip technical prefixes like "Error: ", "Uncaught (in promise) Error: "
  msg = msg.replace(/^(Uncaught\s+)?(in\s+promise\s+)?Error:\s*/i, "").trim();

  // 2. Handle Zod JSON validation error strings
  if (msg.startsWith("[") && msg.endsWith("]")) {
    try {
      const parsed = JSON.parse(msg);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.message) {
        const msgs = parsed.map((item: any) => {
          let field = item.path && item.path.length > 0 ? item.path[item.path.length - 1] : "";
          let itemMsg = item.message || "";
          if (itemMsg === "Required") itemMsg = "Wajib diisi";
          if (itemMsg === "Invalid email") itemMsg = "Format email tidak valid";
          return field ? `${field}: ${itemMsg}` : itemMsg;
        });
        return msgs.join(", ");
      }
    } catch {
      // ignore parse failure
    }
  }

  // 3. Handle Network & Fetch failures
  if (
    /failed to fetch|networkerror|fetch failed|econnrefused|etimedout|network request failed/i.test(
      msg,
    )
  ) {
    return "Gagal terhubung ke server. Periksa koneksi internet Anda.";
  }

  // 4. Handle HTTP 500 / 502 / 503 / 504 / Internal Server Errors
  if (/500|502|503|504|internal server error|bad gateway|service unavailable/i.test(msg)) {
    return "Terjadi kesalahan pada server. Silakan coba lagi nanti.";
  }

  // 5. Handle Payment Gateway / Midtrans / Iris / Biteship / API response errors
  if (/midtrans|iris|biteship|access denied|http basic|http status code|api response/i.test(msg)) {
    if (/401|access denied|unauthorized/i.test(msg)) {
      return "Gagal memproses transfer (Kredensi payment gateway tidak valid).";
    }
    return "Gagal memproses transaksi dengan layanan pembayaran. Silakan coba beberapa saat lagi.";
  }

  // 6. Handle Prisma / Database technical errors
  if (/prisma|p2002|p2025|p2003|unique constraint|foreign key|syntax error/i.test(msg)) {
    if (/p2002|unique constraint/i.test(msg)) {
      return "Data yang Anda masukkan sudah digunakan. Harap gunakan data lain.";
    }
    if (/p2025|record to update not found|record to delete not found/i.test(msg)) {
      return "Data tidak ditemukan atau sudah dihapus.";
    }
    return "Terjadi kesalahan saat memproses data. Silakan coba lagi.";
  }

  // 6. Handle internal debug text or stack traces
  if (/context\.tenant|authMiddleware|stack trace|at Object\.|at async/i.test(msg)) {
    return "Sesi Anda telah berakhir atau terjadi kesalahan server. Harap muat ulang halaman.";
  }

  // 7. If the message is concise and clean (no raw code / JSON artifacts), return as-is
  if (msg.length < 200 && !/[{}[\]\\]/.test(msg)) {
    return msg;
  }

  return fallback;
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

/**
 * Returns the base URL of the platform.
 * Reads VITE_APP_URL or APP_URL from env, defaulting to "https://tokolink.app".
 * Trailing slashes are stripped.
 */
export function getAppUrl(): string {
  let url = "";
  if (typeof process !== "undefined" && (process.env.VITE_APP_URL || process.env.APP_URL)) {
    url = process.env.VITE_APP_URL || process.env.APP_URL || "";
  } else if (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env as any).VITE_APP_URL) {
    url = (import.meta.env as any).VITE_APP_URL;
  }
  if (!url && typeof window !== "undefined") {
    url = window.location.origin;
  }
  if (!url) {
    url = "https://tokolink.app";
  }
  return url.replace(/\/+$/, "");
}

/**
 * Returns the domain/host of the platform (e.g. "tokolink.app" or "localhost:3000").
 */
export function getAppHost(): string {
  try {
    return new URL(getAppUrl()).host;
  } catch {
    return "tokolink.app";
  }
}

