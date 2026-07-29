<div align="center">
  <img src="public/favicon.svg" alt="Tokolink OSS Logo" width="120" height="120" />
  
  # Tokolink
  **The Open Source All-in-One Link-in-Bio & E-Commerce Platform for SMBs**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF4154?style=flat)](https://tanstack.com/start)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)

</div>

<br />

**Tokolink** is a modern, high-performance open-source multi-tenant Software-as-a-Service (SaaS) platform designed to empower small-to-medium businesses (SMBs) and creator-merchants. It seamlessly combines the simplicity of a digital link-in-bio card with a full-featured storefront catalog, instant WhatsApp order notifications, automated digital product delivery, and real-time shipping rate verification.

---

## Table of Contents

- [Key Features](#-key-features)
- [Architecture & Technology Stack](#-architecture--technology-stack)
- [System Requirements](#-system-requirements)
- [Local Installation & Setup](#-local-installation--setup)
- [Project Directory Structure](#-project-directory-structure)
- [Production Deployment](#-production-deployment)
- [Security Hardening](#-security-hardening)
- [Contributing](#-contributing)
- [License](#-license)

---

## Key Features

- **Instant Storefront & Onboarding:** Launch a full-featured, responsive merchant web app (`tokolink.app/store-slug`) in seconds via a streamlined onboarding flow.
- **Hybrid Mobile-First Layout:** A sleek continuous-scroll storefront matching link-in-bio social links with interactive product catalog grids, complete with fluid micro-animations.
- **Automated WhatsApp Order & Buyer Notifications:** Instant buyer & seller WhatsApp updates powered by Fonnte for payment confirmation, courier tracking numbers, order completion thank-you messages, and digital delivery.
- **Instant Digital Product Delivery:** Full support for digital products with automated Instant Text (`AUTO_TEXT`) delivery upon payment verification, manual key fulfillment, and direct delivery over WhatsApp and customer order pages.
- **Dynamic Category Management:** Flexible seller-managed category system supporting custom display order, inline renaming with automatic product association sync, and deletion safeguards.
- **Server-Authoritative Shipping Verification:** Real-time Biteship courier integration with server-side price validation and Upstash Redis caching to eliminate client-side shipping cost tampering.
- **Midtrans Payment Gateway & Automated Payouts:** Integrated payment processing with Midtrans Snap and automated seller payout scheduling via Iris Facilitator.
- **Destructive Action Safety:** Custom confirmation modal prompts (`ConfirmModal`) across all dashboard destructive operations (deleting products, categories, links).

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
  - **Upstash Redis**: Serverless caching for shipping rate queries.
  - **Vercel Blob**: Cloud media storage for product assets and merchant brand logos.
  - **Resend**: Transactional email service for authentication OTPs & order alerts.
  - **Google reCAPTCHA v3**: Bot protection for auth and onboarding routes.

---

## System Requirements

Before starting local development, ensure your environment has:

- [Bun Runtime](https://bun.sh/) (Recommended for ultra-fast builds) or Node.js v18+
- PostgreSQL database instance (or Supabase Postgres)
- API credentials for Supabase, Midtrans, Fonnte, Biteship, Upstash Redis, Resend, Vercel Blob, and reCAPTCHA.

---

## Local Installation & Setup

Follow these steps to set up and run Tokolink on your local environment:

### 1. Clone Repository

```bash
git clone https://github.com/MastayY/tokolink-app.git
cd tokolink
```

### 2. Install Dependencies

```bash
bun install
# or
npm install
```

### 3. Configure Environment Variables

Copy the environment template and fill in your service credentials:

```bash
cp .env.example .env
```

Ensure `.env` contains valid credentials for PostgreSQL (`DATABASE_URL`, `DIRECT_URL`), Supabase, Midtrans, Fonnte, Biteship, Upstash, and Resend.

### 4. Database Schema Synchronization

Generate the Prisma Client and push the schema to PostgreSQL:

```bash
bun run db:generate
bun run db:push
```

### 5. Run Development Server

```bash
bun run dev
# or
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## Project Directory Structure

```text
tokolink/
├── prisma/               # Prisma database schema & seeding scripts
├── public/               # Static assets (logos, favicons, local fonts, OG media)
├── src/
│   ├── components/       # Presentational UI components (UI primitives, dashboard, storefront)
│   ├── hooks/            # Custom React hooks (checkout, shipping rates, session sync)
│   ├── lib/              # Client configs, Zustand stores, Zod schemas, utilities & notifications
│   ├── routes/           # Page routes & API endpoints (TanStack Router)
│   ├── server/           # TanStack Start Server Functions & middleware
│   ├── styles.css        # Global CSS entrypoint (Tailwind CSS)
│   └── start.ts          # TanStack Start middleware setup (CSRF & Error Handling)
├── .env.example          # Environment variables template
└── README.md             # Project documentation
```

---

## Security Hardening

Tokolink incorporates production-grade security standards to protect merchant data and server integrity:

- **CSRF Protection:** Every server function call is automatically protected via TanStack Start Same-Origin CSRF validation.
- **Server-Authoritative Pricing & Shipping:** Order totals and shipping costs are independently calculated and verified server-side against database records and cached Biteship rate data to prevent client-side manipulation.
- **HMAC Signature & Dual-Layer Webhook Verification:** Midtrans webhooks undergo HMAC-SHA512 signature validation and secondary status queries to Midtrans REST API.
- **SSRF Prevention:** Dynamic OG Image generation restricts image URL fetching strictly to trusted CDNs (`*.vercel-storage.com`, `api.dicebear.com`, `tokolink.app`). Local/loopback IP requests are blocked in production.
- **Type & Input Sanitization:** All payload parameters are strictly validated using **Zod** before executing database queries.
- **Image Binary Magic Bytes Verification:** Image upload handlers inspect binary header magic bytes (PNG, JPG, GIF, WEBP) to prevent malicious executable uploads.

---

## Contributing

Contributions from the developer community are warmly welcome!

1. Fork this repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request (PR).

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.
