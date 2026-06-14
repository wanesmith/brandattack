# Brandattack — demo site

Next.js 16 + Tailwind 4 storefront for selling branded closeout / market-seconds stock across Asia. This repo currently contains a **demo build** with 60 sample SKUs from the seed Adidas lot — no checkout, no DB, no admin yet. See [PLAN.md](./PLAN.md) for the full roadmap.

## What's in here

```
src/
  app/
    page.tsx              # landing
    shop/page.tsx         # catalogue with filters
    p/[slug]/page.tsx     # product detail (SSG'd per SKU)
    about/page.tsx
    shipping/page.tsx
    layout.tsx, globals.css
  components/
    ProductCard.tsx
    ProductGallery.tsx    # client — image switcher
    SizeSelector.tsx      # client — disabled Add to cart in demo
  lib/products.ts         # typed accessors over the JSON catalogue
  data/products.json      # 60 sampled SKUs (regen with scripts/sample_demo_products.py)
public/products/          # 153 WebP product photos (regen with scripts/process_images.mjs)
scripts/
  sample_demo_products.py # xlsx → products.json (Python + openpyxl)
  process_images.mjs      # extracted jpgs → 1200px WebP (Node + Sharp)
```

## Local development

```powershell
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (SSG's all product pages)
npm run lint
```

## Refreshing the demo catalogue

The 60 demo products are derived from `C:\Users\wane\Downloads\Adidas (21,082 Units)-VF - For Wane.xlsx`. To re-sample (different SKUs, different size, different markup):

```powershell
# 1. Edit SAMPLE_TARGET or DEFAULT_MARKUP_OVER_COST in scripts/sample_demo_products.py
py scripts/sample_demo_products.py

# 2. Extract just the images the new sample needs (uses scripts/_image_filelist.txt)
$list = "D:\jack\website\scripts\_image_filelist.txt"
$listFor7z = "D:\jack\website\scripts\_image_filelist_7z.txt"
(Get-Content $list) | ForEach-Object { "All Pics Combined\$_" } | Set-Content $listFor7z -Encoding ascii
$tmp = "C:\Users\wane\AppData\Local\Temp\brandattack_imgs"
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
& "C:\Program Files\7-Zip\7z.exe" x "C:\Users\wane\Downloads\All Pics Combined.7z" "-o$tmp" "@$listFor7z" -y

# 3. Optimise to WebP
node scripts/process_images.mjs
```

## Deploy to Vercel

The fastest path is via the Vercel dashboard:

1. **Push this folder to GitHub** (a private repo is fine):
   ```powershell
   cd D:\jack\website
   git add .
   git commit -m "Brandattack demo: 60 sample SKUs, browse + product pages"
   git branch -M main
   git remote add origin https://github.com/<your-user>/brandattack.git
   git push -u origin main
   ```

2. Go to <https://vercel.com/new>, log in, and **Import** the GitHub repo. Vercel auto-detects Next.js — no settings to change.

3. Click **Deploy**. First build takes ~2 minutes. You'll get a `*.vercel.app` URL.

4. (Optional) set this env var in Vercel project settings so OG/social meta uses the right base URL:
   ```
   NEXT_PUBLIC_SITE_URL = https://<your-deployment>.vercel.app
   ```

5. (Later) **Custom domain**: in Vercel → project → Settings → Domains, add `brandattack.com` (or whichever final domain), then point its DNS as Vercel instructs.

### Alternative: Vercel CLI

```powershell
npm i -g vercel
vercel login           # browser flow
vercel                 # follow prompts, accept defaults; first run links the project
vercel --prod          # deploy to production
```

## Notes / known shortcuts for the demo

- Catalogue is a static JSON file (`src/data/products.json`), not a database. Real DB comes when we wire Stripe Checkout (see PLAN.md §9 milestones).
- Size labels strip region prefixes because the source xlsx mixes conventions (US footwear, EU clothing in cm, alpha apparel). We'll normalise per-category at real import time.
- Prices are demo-computed (2× wholesale cost, capped at 70% of RRP). Real pricing strategy still to be confirmed.
- The Add-to-cart button is intentionally non-functional. Don't ship the demo to customers — it's for stakeholder click-through only.
