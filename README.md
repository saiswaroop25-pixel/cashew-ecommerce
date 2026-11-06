# Cashew E-commerce

Premium cashew store: B2C shop, B2B bulk enquiries, Razorpay payments (INR), customer accounts, admin dashboard.
Next.js 16 (App Router, `cacheComponents`), React 19, TypeScript, Tailwind 4, Supabase (Auth, Postgres, Storage), Prisma 7.
There is no chatbot or conversational AI anywhere in this project.

## Setup

```bash
npm install                 # also runs prisma generate
cp .env.example .env.local  # fill in values (see below)
npx prisma migrate deploy   # apply migrations
npm run db:seed             # optional demo products (clearly labelled demo data)
npm run dev
```

After any change to `prisma/schema.prisma` run `npx prisma generate` and restart the dev server.

## Environment variables

See `.env.example`. Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`, DB URLs) are server-only and must never be prefixed `NEXT_PUBLIC_`.
Use Razorpay **test** keys until go-live. `NEXT_PUBLIC_SITE_URL` must be the real domain in production (used by sitemap, canonical URLs, Open Graph).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop / build / serve |
| `npm run lint`, `npm run typecheck` | Static checks |
| `npm test` | Vitest unit + integration tests (integration tests use the real dev database and storage with unique prefixes and clean up after themselves) |
| `npm run db:deploy` | Apply migrations (production) |

## Becoming an admin

Register normally, then in the Supabase SQL editor:

```sql
update "Profile" set role = 'ADMIN' where email = 'you@example.com';
```

## Architecture notes

- `app/` routes and server actions; `services/` data and business logic; `lib/` pure helpers and validators.
- Auth: Supabase SSR; `proxy.ts` refreshes sessions and guards `/admin`, `/account`; every admin action calls `requireAdmin()` first (covered by tests).
- Payments: server creates the Razorpay order; checkout signature is verified and the payment re-fetched; the webhook (raw body, HMAC, event-id dedupe) and checkout finalise through one idempotent, row-locked function. Unpaid orders expire and release stock.
- Security: CSP and security headers in `lib/security/headers.ts`; DB-backed rate limiting on login, signup, reset, checkout, payment, coupons, enquiries, newsletter; RLS enabled on all tables; uploads are signed-URL, images only, verified by magic bytes.
- SEO: sitemap, robots, Open Graph image, JSON-LD (Organization, WebSite, Product, Breadcrumb; no invented ratings). Unknown URLs get `noindex` (and a true 404 for crawlers).
- Site content (banners, company details, process-flow pictures) is editable in `/admin`.

## Deployment (Vercel)

1. Create the Vercel project, add all env vars from `.env.example` (production values).
2. Run `npx prisma migrate deploy` against the production database.
3. `vercel.json` schedules `/api/cron/maintenance` daily (Vercel Hobby limit). Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
4. For 15-minute order expiry, `.github/workflows/cron.yml` calls `/api/cron/expire-orders`; add repo secrets `APP_URL` and `CRON_SECRET`.
5. In the Razorpay dashboard add the webhook `https://<your-domain>/api/webhooks/razorpay` using the same secret as `RAZORPAY_WEBHOOK_SECRET`.
6. Replace the template policy text under `/legal/*` (reviewed by a lawyer), set real contact details in `/admin/settings`, and set a verified `EMAIL_FROM` domain in Resend.

## Images

- Hero: `public/media/hero/basket.webp` (supplied by the business). Replace the file to change it.
- Product, process-step and banner pictures are managed in `/admin` (uploaded to Supabase Storage). The demo pictures are illustrative Wikimedia Commons photos, credited on `/legal/photo-credits`. Replace them with your own photos and update or remove that page.

## Not yet done

- Shipping provider integration (Shiprocket/Delhivery): shipping is currently a demo rule (free above a threshold, otherwise flat). Real rates are needed from the business.
- Browser end-to-end tests (Playwright) and an automated accessibility scan.
