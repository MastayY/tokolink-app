<div align="center">
  <img src="public/favicon.svg" alt="Tokolink Logo" width="120" height="120" />

  # Tokolink
  **Open Source Link-in-Bio & Micro-Catalogue Platform for Indonesian SMBs**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](package.json)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF4154?style=flat)](https://tanstack.com/start)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-ea4aaa?style=flat&logo=githubsponsors)](https://github.com/sponsors/MastayY)
[![Saweria](https://img.shields.io/badge/Saweria-Dukung%20di%20Saweria-FAAE2B?style=flat)](https://saweria.co/Saweria)

</div>

<br />

**Tokolink** is a modern, high-performance open-source multi-tenant SaaS platform for small-to-medium businesses (SMBs) and creator-merchants. It combines a digital link-in-bio card with a full-featured storefront, integrated payment gateway, automated digital product delivery, and real-time shipping verification all in one place.

---

## Table of Contents

- [Latest Major Update Notice (v2.0.0)](#-latest-major-update-notice-v200)
- [Key Features](#-key-features)
- [Architecture & Technology Stack](#-architecture--technology-stack)
- [System Requirements](#-system-requirements)
- [Local Installation & Setup](#-local-installation--setup)
- [Project Directory Structure](#-project-directory-structure)
- [Security Hardening](#-security-hardening)
- [Contributing](#-contributing)
- [Sponsor & Support](#-sponsor--support)
- [License](#-license)

---

> ## 📢 Latest Major Update Notice (v2.0.0)
> 
> Tokolink **v2.0.0** is a **major milestone release (Generation 2)** transforming Tokolink from a basic link-in-bio micro-catalogue into a complete automated online store platform:
> 
> - **Integrated Payment Gateway & Automated Payouts:** Integrated Midtrans Snap payment processing with automated seller disbursements via Iris Facilitator.
> - **Real-Time Logistics Courier Rates:** Server-authoritative Biteship API courier rate calculation and shipping validation with Redis caching.
> - **Automated Digital Product Delivery:** Instant text (`AUTO_TEXT`) and manual key delivery upon payment verification via WhatsApp & order lookup pages.
> - **Automated WhatsApp Notifications:** Fonnte API integration for instant order confirmation, courier tracking, and buyer/seller notifications.
> - **Independent Per-Variant Stock Tracking:** Full per-variant option stock management (`ProductVariantOption.stock`) with **Mutual Exclusive Stock UI** logic.
> - **Atomic Checkout Pre-Reservation & Race Condition Prevention:** Atomic database pre-reservation (`updateMany`) preventing oversell scenarios under high-concurrency checkouts.
> - **Tab-Switching State Persistence & Quiet Token Refresh:** Seamless tab switching (e.g. WhatsApp Web to Dashboard) without losing active form inputs or triggering full-page loading unmounts.
> - **Production Security Hardening:** Sliding-window rate limiting on `confirm-receipt` (5 req/min) and `reviews` (3 req/min), anti-IP-spoofing header resolution, and sanitized error messages to prevent internal UUID/database leakage.
> 
## Key Features

- **Instant Storefront & Onboarding:** Launch a full-featured, responsive merchant web app (`tokolink.app/store-slug`) in seconds via a streamlined onboarding flow.
- **Hybrid Mobile-First Layout:** A sleek continuous-scroll storefront matching link-in-bio social links with interactive product catalog grids, complete with fluid micro-animations.
- **Automated WhatsApp Order & Buyer Notifications:** Instant buyer & seller WhatsApp updates powered by Fonnte for payment confirmation, courier tracking numbers, order completion thank-you messages, and digital delivery.
- **Instant Digital Product Delivery:** Full support for digital products with automated Instant Text (`AUTO_TEXT`) delivery upon payment verification, manual key fulfillment, and direct delivery over WhatsApp and customer order pages.
- **Dynamic Category Management:** Flexible seller-managed category system supporting custom display order, inline renaming with automatic product association sync, and deletion safeguards.
- **Server-Authoritative Shipping Verification:** Real-time Biteship courier integration with server-side price validation and Upstash Redis caching to eliminate client-side shipping cost tampering.
- **Midtrans Payment Gateway & Automated Payouts:** Integrated payment processing with Midtrans Snap and automated seller payout scheduling via Iris Facilitator.
- **Cloudflare R2 Image Storage:** WebP-compressed product image uploads via Cloudflare R2, with unpredictable UUID-based object keys and zero egress fees.
- **Cloudflare Turnstile Bot Protection:** Invisible bot protection on auth and onboarding routes via Cloudflare Turnstile (replaces reCAPTCHA v3).
- **Destructive Action Safety:** Custom confirmation modal prompts across all dashboard destructive operations (deleting products, categories, links).

---

## Architecture & Technology Stack

Tokolink is built on top of the modern TypeScript web ecosystem:

- **Frontend:** React 19, TanStack Start (Vite + Vinxi compiler), Zustand (state management), Framer Motion (micro-animations), Tailwind CSS v4.
- **Routing & SSR:** TanStack Router (file-based type-safe routing) with Server-Side Rendering (SSR).
- **Backend Logic:** TanStack Start Server Functions (RPC endpoints) protected by Same-Origin CSRF middleware.
- **Database & ORM:** PostgreSQL with Prisma ORM for type-safe relational database management.
- **Third-Party Services & APIs:**
  - **Supabase Auth**: Secure authentication (Email OTP & Google OAuth).
  - **Midtrans & Iris**: Payment gateway & automated disbursement payouts.
  - **Biteship API**: Real-time Indonesian logistics courier rates & shipping booking.
  - **Fonnte API**: WhatsApp notification automation for buyers and sellers.
  - **Upstash Redis**: Serverless caching for shipping rate queries and rate limiting.
  - **Cloudflare R2**: S3-compatible cloud media storage with WebP compression via `sharp`.
  - **Cloudflare Turnstile**: Privacy-respecting invisible bot protection.
  - **Resend**: Transactional email service for authentication OTPs & order alerts.

---

## System Requirements

Before starting local development, ensure your environment has:

- [Bun Runtime](https://bun.sh/) v1.x (recommended) or Node.js v18+
- PostgreSQL database instance (or Supabase Postgres)
- API credentials for all required services (see `.env.example`)

---

## Local Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/MastayY/tokolink-app.git
cd tokolink-app
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in credentials for: PostgreSQL, Supabase, Midtrans, Fonnte, Biteship, Upstash, Cloudflare R2, Cloudflare Turnstile, and Resend.

### 4. Database Schema Synchronization

```bash
bun run db:generate
bun run db:push
```

### 5. Run Development Server

```bash
bun run dev
```

Open your browser at `http://localhost:3000`.

---

## Project Directory Structure

```text
tokolink/
├── .github/
│   ├── ISSUE_TEMPLATE/       # Bug report & feature request templates
│   └── pull_request_template.md
├── prisma/                   # Prisma schema & seed scripts
├── public/                   # Static assets (logos, favicons, OG images)
├── src/
│   ├── components/           # UI components (primitives, dashboard, storefront)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Client configs, Zod schemas, Zustand stores, utils
│   ├── routes/               # Page routes & API endpoints (TanStack Router)
│   ├── server/               # Server functions & middleware
│   ├── styles.css            # Global CSS entrypoint (Tailwind CSS v4)
│   └── start.ts              # TanStack Start middleware (CSRF & error handling)
├── .env.example              # Environment variables template
├── CODE_OF_CONDUCT.md        # Community standards
├── CONTRIBUTING.md           # Contributor guide
├── LICENSE                   # GNU Affero General Public License v3.0 (AGPL-3.0)
├── LICENSE-MIT-HISTORICAL.md # Pre-2026-07-30 historical MIT license
├── NOTICE.md                 # Relicensing history notice
├── SECURITY.md               # Vulnerability reporting policy
└── README.md
```

---

## Security Hardening

Tokolink incorporates production-grade security standards:

- **CSRF Protection:** Every server function call is automatically protected via TanStack Start Same-Origin CSRF validation.
- **Server-Authoritative Pricing & Shipping:** Order totals and shipping costs are independently calculated and verified server-side to prevent client-side manipulation.
- **HMAC Signature & Dual-Layer Webhook Verification:** Midtrans webhooks undergo HMAC-SHA512 signature validation and secondary status queries to Midtrans REST API.
- **SSRF Prevention:** OG image generation restricts image URL fetching to trusted domains only (`R2_PUBLIC_URL`, `api.dicebear.com`, `tokolink.app`).
- **Type & Input Sanitization:** All payload parameters are strictly validated using **Zod** before executing database queries.
- **Image Binary Magic Bytes Verification:** Upload handlers inspect binary header magic bytes (PNG, JPG, GIF, WEBP) to prevent malicious file uploads.
- **WebP Conversion & Unpredictable Storage Keys:** Images are compressed to WebP via `sharp` and stored with `crypto.randomUUID()` keys to prevent key enumeration.
- **Cloudflare Turnstile:** Invisible bot protection on all auth and onboarding form submissions.
- **Upstash Rate Limiting:** Redis-backed rate limiting on all public API routes.

---

## Contributing

Contributions are warmly welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

Key points:
- Open an Issue or Discussion before working on large changes
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
- Run `bun run build` to verify your changes before submitting
- Check [SECURITY.md](SECURITY.md) for responsible vulnerability disclosure

---

## Sponsor & Support

If you find **Tokolink** valuable or if it helps empower your business, please consider supporting the project!

Your support directly covers infrastructure maintenance, domain costs, API integrations, and ongoing open-source feature development for Indonesian SMBs and creator-merchants.

- 🪙 **Dukung via Saweria (Indonesia):** [saweria.co/Mastay](https://saweria.co/Mastay)
- 💖 **Sponsor via GitHub Sponsors (Global):** [github.com/sponsors/MastayY](https://github.com/sponsors/MastayY)

Every contribution, big or small, helps keep Tokolink independent, actively maintained, and free for everyone! 💖

---

## Acknowledgements & References

- Cloudflare R2 storage integration and Cloudflare Turnstile bot protection implementation referenced from [@salmanabdurrahman](https://github.com/salmanabdurrahman).

---

## License

Tokolink is licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)**.

**In plain English:**
-  **Free & Open Source:** You are free to use, modify, run, and distribute Tokolink.
-  **Network Copyleft:** If you modify Tokolink and run it as a network service/SaaS, you must make your modified source code available to your users under AGPL-3.0.
-  **Historical License:** Commits up to commit [`19820bb61f7207b76b65c8c84c3a52e9568b995e`](https://github.com/MastayY/tokolink-app/commit/19820bb61f7207b76b65c8c84c3a52e9568b995e) (June 13, 2026) remain permanently under the MIT License. All subsequent commits are licensed under AGPL-3.0. See [NOTICE.md](NOTICE.md) and [LICENSE-MIT-HISTORICAL.md](LICENSE-MIT-HISTORICAL.md) for details.

Copyright (c) 2026 [MastayY](https://github.com/MastayY)
