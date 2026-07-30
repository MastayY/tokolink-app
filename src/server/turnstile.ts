// src/server/turnstile.ts
// SERVER-ONLY. Verify Cloudflare Turnstile token via canonical siteverify.
// Secret is read from process.env.TURNSTILE_SECRET — never hardcoded.

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string,
  clientIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET; // referenced as TURNSTILE_SECRET per project setup

  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET missing — bypassing in development");
    return true;
  }

  // Dev bypass tokens — kept for smooth migration from reCAPTCHA
  if (!token || token === "disabled" || token === "not-loaded" || token === "failed") {
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] Empty/bypass token rejected in production");
      return false;
    }
    console.warn(`[turnstile] Bypassed in development, token: "${token}"`);
    return true;
  }

  let result: { success: boolean; "error-codes"?: string[] };
  try {
    // Canonical siteverify call: x-www-form-urlencoded + remoteip
    const params = new URLSearchParams({
      secret,          // process.env.TURNSTILE_SECRET — never a literal value
      response: token, // cf-turnstile-response from the client
    });
    if (clientIp) params.set("remoteip", clientIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!res.ok) throw new Error(`siteverify HTTP ${res.status}`);
    result = await res.json();
  } catch (err) {
    // Fail closed on network error or non-2xx
    console.error("[turnstile] Server verification request failed:", err);
    return false;
  }

  if (!result.success) {
    console.warn("[turnstile] Token validation failed:", result["error-codes"]);
  }
  return result.success === true;
}
