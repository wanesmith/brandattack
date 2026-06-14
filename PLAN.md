# Brandattack — planning doc

> Working title. Domain "brandattack" is provisional; see [Open questions](#open-questions).

Greenfield Next.js retail storefront for Jack to sell branded liquidation stock direct to consumers, starting with an Adidas closeout lot of 21,082 units across 2,290 SKUs.

---

## 1. Decisions so far

| Area | Decision | Why |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | Server components → SEO-ready product pages, route-level caching, image optimization. |
| Commerce backend | **Custom** (Stripe Checkout + Postgres) — *not* Shopify | Jack is technical and can run a Next.js admin; Shopify's monthly + per-transaction fees don't earn their keep when we're building the storefront UI from scratch anyway. |
| Payments | Stripe Checkout (hosted) | Keeps PCI scope minimal; supports Apple Pay / Google Pay / Link out of the box; AUD-native; tax via Stripe Tax if we want it. |
| Database | Postgres (Neon or Supabase) | Variant inventory + orders need ACID. Neon's serverless model fits Vercel. |
| Hosting | Vercel | Native Next.js; free tier covers MVP; image optimization built in. |
| Image storage | Cloudflare R2 (or Vercel Blob) | Zero egress fees on R2; 4 GB of source images, served via Next/Image. |
| Styling | Tailwind CSS + shadcn/ui | Standard, fast, easy for Jack to tweak. |
| Auth (customers) | Email + magic link (Auth.js or Lucia) | No passwords to manage; guest checkout supported. |
| Auth (admin) | Basic-auth or single-user Auth.js, Jack only | One admin user — don't over-engineer. |

---

## 2. The inventory we're starting with

Source: `C:\Users\wane\Downloads\Adidas (21,082 Units)-VF - For Wane.xlsx`
Images: `C:\Users\wane\Downloads\All Pics Combined.7z` (4,828 jpgs, ~4 GB uncompressed)

- **2,290 SKUs / 21,082 units / ~$2.1 M USD RRP** at ~22 % of RRP wholesale cost.
- Divisions: APPAREL 1,275 · FOOTWEAR 978 · HARDWARE 37.
- Genders in the data are inconsistent (`FEMALE`/`WOMEN`, `MALE`/`MEN`) — normalise on import.
- Seasons span F17–S27, with the bulk being F23–S25 (current/recent stock).
- Variant data is cleanly normalised in sheet 2 (`VerticaL Article Size Qty`): 6,250 `(ArticleNo, Size, Qty)` rows.
- Images are named `<ArticleNo>-<N>.jpg` (N = 1..6) — direct filename match, no XML drawing extraction needed.

### Filterable attributes for the storefront
Division · Gender (normalised) · Sports Code (Originals, Running, Football, etc.) · Product Group (Shoes, T-Shirts, Pants...) · Product Type · Season · Size · Price range.

---

## 3. Data model (initial sketch)

```
Product
  id (slug, e.g. "jp9933-japan-h-w")
  articleNo            "JP9933"     -- canonical Adidas article #
  title                "Adidas Japan H W"
  description          long text
  brand                "Adidas"     -- forward-compat: future lots from other brands
  division             enum: APPAREL | FOOTWEAR | HARDWARE
  gender               enum: MEN | WOMEN | UNISEX | KIDS
  sportsCode           string
  productGroup         string
  productType          string
  season               string       "F24"
  rrpUsd               numeric      137.95
  rrpAud               numeric      (computed at import or live FX)
  priceAud             numeric      our retail price
  active               bool
  images               Image[]      (ordered)
  variants             Variant[]

Variant
  id
  productId
  size                 string       "5-" | "10K" | "M" | "XL"
  sizeLabel            string       "US 5.5" — friendlier display
  stock                int          on-hand
  reserved             int          allocated to in-flight checkouts
  sku                  string       "JP9933-5H"   -- for warehouse picking
  weightGrams          int          (optional, drives shipping)

Image
  id
  productId
  url                  string       R2/Blob URL
  width, height        int
  position             int          1..6

Order
  id
  email
  stripeSessionId
  status               enum: pending | paid | shipped | refunded | cancelled
  shippingAddress      JSON
  totalAud             numeric
  shippingAud          numeric
  taxAud               numeric
  createdAt
  items                OrderItem[]
  shipping             ShippingLabel?

OrderItem
  orderId
  variantId
  qty
  unitPriceAud         (snapshot at order time)
  titleSnapshot        string
```

Stock decrement on `checkout.session.completed` webhook. Hold a reservation while the Stripe session is open (15-min TTL) to avoid overselling during the checkout flow.

---

## 4. Pages

### Public
- `/` — landing. Hero, featured categories, "what is a market second" explainer, trust signals.
- `/shop` — full catalogue with filters (left rail or top bar) + sort. Server-rendered, paginated.
- `/shop/[productGroup]` — landing per top-level group (e.g. `/shop/shoes`).
- `/p/[slug]` — product detail. Image gallery, size selector, stock-aware add-to-cart, related products.
- `/cart` — cart drawer or page.
- `/checkout` — redirect to Stripe Checkout session.
- `/checkout/success?session_id=...` — order confirmation, polls webhook.
- `/orders/[id]` — order lookup by email magic link.
- `/about`, `/shipping`, `/returns`, `/contact`, `/terms`, `/privacy` — required content.

### Admin (`/admin/*`, password-gated)
- `/admin` — dashboard: today's orders, revenue, low-stock alerts.
- `/admin/products` — list, search, toggle active, edit price/description.
- `/admin/orders` — list, mark shipped, refund, view picking slip.
- `/admin/import` — re-run import from a fresh xlsx (in case more lots arrive).
- `/admin/inventory` — manual stock adjustments (returns, damages, recounts).

---

## 5. Import pipeline (one-off but reusable)

This is the biggest single piece of upfront work. It must be **rerunnable** so Jack can drop a new xlsx + 7z and have the catalogue update.

1. **Extract 7z** → temp directory of `<ArticleNo>-<N>.jpg`.
2. **Image processing** (Sharp): resize to 2000 px max edge, generate WebP at 1200/800/400 px, strip EXIF, upload to R2 with content-addressed names. Track `width`/`height` to avoid CLS.
3. **Read xlsx**: use sheet 1 for product metadata, sheet 2 for variant stock, sheet 3 (`Pictures List`) for image-to-article mapping. Upsert by `articleNo`.
4. **Normalisation**:
   - Gender → `MEN | WOMEN | UNISEX | KIDS`.
   - Size strings → keep raw + friendly label (`"5-"` → `"US 5.5"`, `"10K"` → `"Kids US 10"`).
   - Title-case `Item Description`.
   - Slug = `articleNo` + slugified description.
5. **Pricing**: compute `priceAud` from RRP via a configurable rule (e.g. `rrpUsd * fxUsdAud * 0.4`); store the rule in `import_config` so Jack can rerun if margin policy changes.
6. **Idempotent**: re-running with the same xlsx should be a no-op; running with a new one should diff-update only changed rows and leave order history alone.

Build this as a CLI script (`pnpm import ./adidas.xlsx ./pics.7z`) before any admin UI for it.

---

## 6. Shipping

Depends on geography — see [Open questions](#open-questions). Probable starting setup:
- AU only at launch.
- Flat-rate brackets by cart subtotal *or* by total weight (we have weights in the data for footwear). Free shipping over a threshold (e.g. AUD $150).
- Manual label printing from AusPost MyPost Business in v1; integrate AusPost API or Sendle in v2.

If we open to NZ / global later: Shopify Markets-equivalent is significant work; would suggest Easyship or Shippo as a third-party rate engine then.

---

## 7. Tax

- AU domestic: 10 % GST inclusive in displayed prices (AU convention). Stripe Tax can do this automatically; otherwise we compute and break out on the receipt.
- Export (if enabled): GST-free, customer responsible for import duties — disclose at checkout.

---

## 8. SEO + performance

- Product pages SSR'd with full schema.org `Product` + `Offer` + `AggregateRating` (when reviews exist) JSON-LD.
- Sitemap.xml generated at build (2,290 product pages, plus categories).
- `/robots.txt` with sitemap reference.
- OG images per product (Next.js OG image route).
- Open Graph / Twitter card meta on every page.
- Core Web Vitals budget: LCP < 2.0 s on 4G, CLS = 0, INP < 200 ms.

---

## 9. Milestones

| Milestone | Scope | Estimate |
|---|---|---:|
| **M0 — Repo + skeleton** | Next.js scaffold, Tailwind, shadcn, Postgres connection, R2 setup, Stripe test keys, Vercel deploy of an empty homepage. | 1–2 days |
| **M1 — Import pipeline** | Read xlsx, extract 7z, process images, populate DB. End state: products and variants in DB, images on R2, debug page lists them. | 4–6 days |
| **M2 — Catalogue browse** | `/shop` with filters + sort + pagination, `/p/[slug]` product page with gallery + size selector + (non-functional) add-to-cart. | 4–5 days |
| **M3 — Cart + Stripe Checkout** | Server cart in DB or signed cookie, Stripe Checkout session, webhook → order create + stock decrement, success page. | 3–4 days |
| **M4 — Admin v1** | Auth-gated `/admin`. Orders list, mark shipped (manual tracking number), product edit, manual stock adjust. | 3–4 days |
| **M5 — Content + polish** | Landing page copy, About/Shipping/Returns/Terms, OG images, sitemap, schema.org, Plausible/Posthog analytics. | 2–3 days |
| **M6 — Launch prep** | Production Stripe, domain, transactional email (Resend), abandoned-cart email job, error monitoring (Sentry), pre-launch QA. | 2–3 days |

Total: **~4–5 calendar weeks of focused work** for an MVP that takes real orders.

---

## 10. Risks

- **Trademark exposure.** Selling genuine Adidas product is fine (first-sale doctrine). A domain or brand that *attacks* brand names invites a cease-and-desist regardless of legal merit. Worth a quick call with Jack on the domain before printing anything.
- **Image weight.** 4 GB of source images. If we don't resize on import we'll bleed bandwidth and Core Web Vitals.
- **Overselling.** Without variant-level stock reservation during checkout, two customers can buy the last pair of size-7 trainers. The 15-min reservation pattern is mandatory.
- **One-off lot risk.** If this is genuinely a single blowout, building admin tooling we'll only use for a few months is overhead. If more lots are likely, we want the import pipeline to be solid.
- **FX drift.** RRPs in the file are USD; AUD prices computed at import will drift. Decide if Jack wants periodic re-pricing or set-and-forget.

---

## 11. Answered & still-open

**Decided 2026-06-14:**
- **Geography:** mostly Asia — **not Australia**. USD as the default display currency. No GST/AusPost in scope.
- **Fulfillment:** Jack ships himself. Manual label printing v1; no 3PL integration.
- **Ongoing:** new lots will keep arriving; xlsx upload becomes a real admin feature, not a one-off CLI.
- **Domain:** sticking with `brandattack` (provisionally).
- **Immediate ask:** demo site on Vercel ASAP — sample catalogue + branding, no real checkout yet.

**Still open:**
- Pricing policy (flat % off RRP vs. per-category markup). Defaulting demo to "RRP shown + ~60% off display" = 0.4 × RRP, easy to retune.
- Launch deadline for the real shop (taking orders).
- Wane's role going forward (end-to-end build then handoff, or ongoing dev).

---

## 12. Demo (M0) scope — what's getting deployed first

Goal: something Jack/stakeholders can click through on a `*.vercel.app` URL within a session.

- Next.js 15 + TS + Tailwind + shadcn/ui scaffold.
- ~50 sample SKUs (mix of footwear/apparel, men/women/kids) sampled from the Adidas xlsx, with their real images extracted from the 7z, resized to WebP, and committed under `public/products/`.
- Catalogue lives in a JSON file under `src/data/products.json` — no DB for the demo. Postgres comes in M3 when we wire Stripe.
- Pages: `/` (landing), `/shop` (grid + basic filters: Division / Gender / Sports), `/p/[slug]` (gallery + size selector + non-functional CTA), `/about`, `/shipping`.
- Brand: dark, "attack" aesthetic — black background, bright accent, big type. Easy to retune once Jack has thoughts.
- Deploy: push to GitHub → Vercel imports → live.

What's deliberately *not* in the demo:
- Real cart, checkout, payments, accounts, orders, admin, importer, DB. All come post-demo.
