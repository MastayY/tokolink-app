// src/lib/ratelimit.ts
// Shared Redis client, rate-limiter instances, and helpers.
// SERVER-ONLY — never import from client components.
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Universal Redis Client:
// Otomatis memilih REDIS_URL (Self-Hosted Redis / REST Proxy) atau UPSTASH_REDIS_REST_URL (Upstash Cloud)
export const redis = process.env.REDIS_URL
  ? new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN ?? "",
    })
  : new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    });

// ── Rate-limiter instances (sliding window) ───────────────────────────────────
// Each uses a distinct prefix so keys don't collide across limiters.

export const checkoutLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: false,
  prefix: "rl:checkout",
});

export const shippingRatesLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  analytics: false,
  prefix: "rl:shipping-rates",
});

// Webhook: relaxed limit — Midtrans bursts retries on slow acks
export const webhookLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  analytics: false,
  prefix: "rl:webhook",
});

export const orderLookupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  analytics: false,
  prefix: "rl:order-lookup",
});

export const confirmReceiptLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: false,
  prefix: "rl:confirm-receipt",
});

export const reviewLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"),
  analytics: false,
  prefix: "rl:reviews",
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract client IP safely from Cloudflare/Vercel trusted headers. */
export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    const lastTrusted = parts[parts.length - 1].trim();
    if (lastTrusted) return lastTrusted;
  }

  return "unknown";
}

/**
 * Check a limiter and return a 429 Response if the limit is exceeded.
 * Returns null if the request is allowed.
 *
 * Usage:
 *   const limited = await checkRateLimit(checkoutLimiter, request);
 *   if (limited) return limited;
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  request: Request,
): Promise<Response | null> {
  const ip = getClientIp(request);
  const { success, reset } = await limiter.limit(ip);
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return new Response(
      JSON.stringify({ error: "Terlalu banyak permintaan. Coba lagi nanti." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }
  return null;
}
