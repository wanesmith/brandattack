# Brandattack

Next.js 16 storefront for selling branded closeout / market-seconds stock across Asia. Currently includes catalogue, cart, and Stripe Checkout against a real Postgres backend. See [PLAN.md](./PLAN.md) for the full roadmap and where this sits in the milestones.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Postgres + Drizzle ORM |
| State | Zustand (cart, persisted to localStorage) |
| Payments | Stripe Checkout (hosted) |
| Hosting | Vercel (target) |

## Project layout

```
src/
  app/
    page.tsx              # landing
    shop/page.tsx         # catalogue + filters (server-rendered)
    p/[slug]/page.tsx     # product detail (SSG'd per SKU)
    cart/page.tsx         # cart page (client)
    checkout/success/     # post-Stripe redirect
    api/
      checkout/route.ts   # POST → creates Stripe session, reserves stock
      webhooks/stripe/    # Stripe → order persistence + stock decrement
    about/, shipping/
  components/
    ProductCard.tsx, ProductGallery.tsx, SizeSelector.tsx
    CartButton.tsx, CartDrawer.tsx
  db/
    schema.ts             # Drizzle schema
    index.ts              # DB client (server-only)
  lib/
    products.ts           # DB-backed product queries (server-only)
    cart-store.ts         # Zustand cart store
    format.ts             # pure formatters (safe for client)
    stripe.ts             # Stripe client
  data/products.json      # source data (used by seed script)
public/products/          # WebP product photos
scripts/
  sample_demo_products.py # xlsx → products.json (Python + openpyxl)
  process_images.mjs      # extracted jpgs → 1200px WebP (Node + Sharp)
  seed.ts                 # products.json → DB
  migrate.ts              # apply ./drizzle migrations
drizzle/                  # generated SQL migrations (commit these)
```

## First-time setup

### 1. Install Node deps

```powershell
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL=postgres://postgres:<password>@localhost:5432/brandattack
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=          # populated later, see "Webhooks" below
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Stripe test keys: <https://dashboard.stripe.com/test/apikeys>

### 3. Set up the database

For a fresh local Postgres install (Postgres 18 on Windows), create the database:
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE brandattack;"
```

Apply migrations and seed:
```powershell
npm run db:migrate
npm run db:seed
```

### 4. Run the dev server

```powershell
npm run dev   # http://localhost:3000
```

## Database workflow

| Command | What it does |
|---|---|
| `npm run db:generate` | Compares schema.ts to last snapshot; emits a new SQL migration in `./drizzle/`. Run after schema edits. |
| `npm run db:migrate` | Applies pending migrations to the DB pointed at by `DATABASE_URL`. |
| `npm run db:seed` | Imports `src/data/products.json` into the DB (upsert by ArticleNo). Re-runnable; preserves on-hand stock. |
| `npm run db:studio` | Opens Drizzle Studio — a browser GUI for the DB. |

The migration files live in `./drizzle/` and are committed to git — that's the source of truth for the production schema. Never edit applied migrations; create a new one with `db:generate` instead.

## Stripe webhook (local testing)

Stripe needs to reach `/api/webhooks/stripe` to confirm orders. For local dev, use the Stripe CLI:

```powershell
# 1. Install
scoop install stripe   # or download from https://github.com/stripe/stripe-cli/releases

# 2. Authenticate
stripe login

# 3. Forward webhooks to your dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a `whsec_...` secret on startup. Copy it into `.env.local` as `STRIPE_WEBHOOK_SECRET`, then restart `npm run dev`.

Now when you complete a test checkout (use card `4242 4242 4242 4242` with any future expiry / any CVC), the webhook fires and the order gets written to the `orders` table, stock decrements, and the success page renders order details.

## Re-importing a new stock lot

When Jack acquires a new lot:

```powershell
# 1. Drop the new xlsx + 7z into the locations referenced by the scripts (or edit paths)
# 2. Sample products
py scripts/sample_demo_products.py

# 3. Extract images (see comment block in script for the PS pipeline)
node scripts/process_images.mjs

# 4. Seed the DB
npm run db:seed
```

For ongoing operation we'll build an `/admin/import` route that does this through the UI — see PLAN.md §5.

## Deploy to Vercel

1. Push to GitHub (the repo already points to <https://github.com/wanesmith/brandattack>):
   ```powershell
   git push
   ```

2. Open <https://vercel.com/new>, import the repo. Vercel auto-detects Next.js.

3. In **Settings → Environment Variables**, paste:
   - `DATABASE_URL` — point at a hosted Postgres (Neon recommended, also free for the first 0.5 GB)
   - `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET` — generate by creating a webhook endpoint at <https://dashboard.stripe.com/test/webhooks> pointing to `https://<your-deployment>.vercel.app/api/webhooks/stripe`
   - `NEXT_PUBLIC_SITE_URL=https://<your-deployment>.vercel.app`

4. Deploy. First build takes ~2 minutes.

5. Run migrations against the hosted DB (one-time):
   ```powershell
   $env:DATABASE_URL = "<hosted url>"
   npm run db:migrate
   npm run db:seed
   ```

## Notes

- All prices are USD. Currency switching / multi-region is post-launch.
- Stock reservations live in the `reservations` table; they're held for 15 min while the Stripe Checkout session is open. Webhook clears them on completion / expiry.
- The Add-to-cart flow validates stock server-side at checkout creation, so two simultaneous shoppers can't oversell the last item.
- Customer accounts aren't built yet — guest checkout only. Order lookup by email magic link is planned (PLAN.md §4).
