# Security Policy

## Supported Versions

Only the latest version of Tokolink on the `main` branch receives security updates.

| Version | Supported |
|---|---|
| `main` (latest) | ✅ |
| older commits | ❌ |

---

## Reporting a Vulnerability

**Please do NOT open a public GitHub Issue for security vulnerabilities.** Disclosing a vulnerability publicly before it is patched can put active deployments at risk.

### How to Report

1. **GitHub Private Vulnerability Reporting (preferred):**
   Go to [Security → Report a vulnerability](https://github.com/MastayY/tokolink-app/security/advisories/new) and use GitHub's private advisory system.

2. **Alternatively**, open a GitHub Discussion marked as **Private** (if available) and select the `security` category.

### What to Include

Please provide as much of the following as possible:

- **Type of vulnerability** (e.g. XSS, SSRF, auth bypass, SQL injection, RCE, IDOR)
- **Affected component** — file path, route, or feature
- **Steps to reproduce** — detailed and reproducible
- **Proof of concept** — code snippet, curl command, or screenshot
- **Potential impact** — what an attacker could achieve
- **Suggested fix** (optional but appreciated)

### What to Expect

| Timeframe | Action |
|---|---|
| Within **48 hours** | Acknowledgement of report |
| Within **7 days** | Initial assessment and severity classification |
| Within **30 days** | Fix developed and tested (critical issues fast-tracked) |
| After fix is deployed | Public advisory published (with credit to reporter if desired) |

---

## Scope

The following are **in scope** for security reports:

- Authentication and session management bypass
- Authorization flaws (IDOR, privilege escalation)
- Server-Side Request Forgery (SSRF) in OG image generation or webhooks
- SQL injection via Prisma or raw queries
- Cross-Site Scripting (XSS) in storefront or dashboard
- Webhook signature verification bypass (Midtrans)
- Sensitive data exposure (API keys, PII in logs/responses)
- Rate limiting bypass on auth or checkout routes
- Payment/order amount tampering via client-side manipulation

The following are **out of scope**:

- Vulnerabilities in third-party services (Supabase, Midtrans, Biteship, Fonnte)
- Social engineering attacks
- Issues only reproducible in misconfigured deployments (missing env vars, wrong DB permissions)
- Self-XSS or issues requiring physical access to a logged-in session
- Denial of service via legitimate high traffic

---

## Hall of Fame

Responsible disclosures that lead to a fix will be credited here (with reporter's permission).

*No reports yet — be the first!*

---

Thank you for helping keep Tokolink and its merchant community safe. 🔐
