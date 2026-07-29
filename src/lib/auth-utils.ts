// src/lib/auth-utils.ts — SERVER-ONLY (never import from client components)
import { timingSafeEqual } from "node:crypto";

/**
 * Validates the Authorization header against CRON_SECRET using a
 * constant-time comparison to prevent timing attacks.
 *
 * Why `node:crypto` import (not `require`): this codebase is ESM.
 * `require()` is a CommonJS global — it is NOT available in ESM modules
 * and would throw `ReferenceError: require is not defined` at runtime.
 *
 * Why length-check before timingSafeEqual:
 * `crypto.timingSafeEqual` throws a TypeError if buffers differ in length,
 * so we must check first. The length of a Bearer token is not secret info
 * (it's deterministic from the secret length), so short-circuiting here is safe.
 *
 * Fail-safe: returns false immediately if CRON_SECRET is not configured,
 * so an unconfigured environment never accidentally allows access.
 */
export function isValidCronSecret(authHeader: string): boolean {
  if (!process.env.CRON_SECRET) {
    console.error("[auth] CRON_SECRET is not set — rejecting all cron requests");
    return false; // fail closed: no secret configured = deny all
  }

  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const authBuf = Buffer.from(authHeader);
  const expBuf = Buffer.from(expected);

  // Length mismatch: can short-circuit safely (token length is not a secret)
  if (authBuf.length !== expBuf.length) return false;

  return timingSafeEqual(authBuf, expBuf);
}
