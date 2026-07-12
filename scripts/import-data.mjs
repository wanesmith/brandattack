// One-off: import the FULL Adidas lot (products + variants/stock) directly into
// the live DB, bypassing the Vercel 300s import timeout. Data only — no images.
// Mirrors src/lib/import-lot.ts transforms exactly so existing rows UPDATE
// (same slug/sku scheme) rather than duplicate.
//
//   node scripts/import-data.mjs "<path-to-xlsx>" [markup]
//
import fs from "node:fs";
import ExcelJS from "exceljs";
import postgres from "postgres";

const XLSX = process.argv[2];
const MARKUP = Number(process.argv[3] ?? 2) || 2;
const REPLACE_STOCK = false; // preserve on-hand for existing variants (import default)

if (!XLSX || !fs.existsSync(XLSX)) {
  console.error("Usage: node scripts/import-data.mjs <path-to-xlsx> [markup]");
  process.exit(1);
}

const DATABASE_URL = fs
  .readFileSync(".env.local", "utf8")
  .split(/\r?\n/)
  .find((l) => l.startsWith("DATABASE_URL="))
  .slice("DATABASE_URL=".length)
  .trim();

// ---- transforms (copied from import-lot.ts) --------------------------------
const GENDER_MAP = { FEMALE: "WOMEN", WOMEN: "WOMEN", MALE: "MEN", MEN: "MEN", UNISEX: "UNISEX", KIDS: "KIDS" };
const DIVISION_MAP = { APPAREL: "APPAREL", FOOTWEAR: "FOOTWEAR", HARDWARE: "HARDWARE" };
const normGender = (s) => GENDER_MAP[String(s ?? "").toUpperCase().trim()] ?? "UNISEX";
const normDivision = (s) => DIVISION_MAP[String(s ?? "").toUpperCase().trim()] ?? null;

const titleCase = (s) =>
  s.split(/\s+/).map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase())).join(" ");
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function sizeLabel(raw) {
  const m = raw.match(/^(\d+)(-)?(K)?$/);
  if (m) {
    const n = m[2] === "-" ? `${m[1]}.5` : m[1];
    return m[3] === "K" ? `${n} (kids)` : n;
  }
  return raw;
}
function computeRetailUsd(wholesale, rrp, markup) {
  if (!Number.isFinite(wholesale) || wholesale <= 0) return 0;
  const candidate = wholesale * markup;
  const cap = rrp > 0 ? rrp * 0.7 : Infinity;
  return Math.round(Math.min(candidate, cap) * 100) / 100;
}

// ---- parse -----------------------------------------------------------------
async function parseXlsx(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const assetSheet = wb.getWorksheet("Asset Report") ?? wb.worksheets[0];
  const verticalSheet =
    wb.getWorksheet("VerticaL Article Size Qty") ?? wb.getWorksheet("Vertical Article Size Qty") ?? null;
  if (!assetSheet) throw new Error("Asset Report sheet not found");
  if (!verticalSheet) throw new Error("Vertical size/qty sheet not found");

  const headerRow = assetSheet.getRow(2);
  const headerIndex = new Map();
  headerRow.eachCell((cell, col) => {
    const name = String(cell.value ?? "").trim();
    if (name) headerIndex.set(name, col);
  });
  const get = (row, col) => {
    const idx = headerIndex.get(col);
    if (!idx) return null;
    const v = row.getCell(idx).value;
    if (v && typeof v === "object" && "result" in v) return v.result;
    return v;
  };

  const products = [];
  for (let r = 3; r <= assetSheet.rowCount; r++) {
    const row = assetSheet.getRow(r);
    const articleNo = String(get(row, "ArticleNo") ?? "").trim();
    if (!articleNo) continue;
    const division = normDivision(get(row, "Division"));
    if (!division) continue;
    products.push({
      articleNo,
      description: String(get(row, "Item Description") ?? "").trim(),
      season: String(get(row, "Season") ?? "").trim(),
      division,
      gender: normGender(get(row, "Gender")),
      sportsCode: String(get(row, "Sports Code") ?? "").toUpperCase().trim(),
      productGroup: String(get(row, "Product Group") ?? "").toUpperCase().trim(),
      productType: String(get(row, "Product Type") ?? "").toUpperCase().trim(),
      wholesaleUsd: Number(get(row, "Price") ?? 0),
      rrpUsd: Number(get(row, "RRP Price (USD)") ?? 0),
    });
  }

  const variants = [];
  for (let r = 2; r <= verticalSheet.rowCount; r++) {
    const row = verticalSheet.getRow(r);
    const articleNo = String(row.getCell(1).value ?? "").trim();
    const size = String(row.getCell(2).value ?? "").trim();
    const qty = Number(row.getCell(3).value ?? 0);
    if (!articleNo || !size || !Number.isFinite(qty) || qty <= 0) continue;
    variants.push({ articleNo, size, qty: Math.floor(qty) });
  }
  return { products, variants };
}

// ---- run -------------------------------------------------------------------
const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

try {
  console.log("Parsing", XLSX, "…");
  const { products, variants } = await parseXlsx(XLSX);

  const variantsByArticle = new Map();
  for (const v of variants) {
    const arr = variantsByArticle.get(v.articleNo) ?? [];
    arr.push(v);
    variantsByArticle.set(v.articleNo, arr);
  }
  console.log(`Parsed ${products.length} products, ${variants.length} variant rows.`);

  // Build product + variant insert rows (skip products with no variants).
  const productRows = [];
  const variantRows = [];
  let skipped = 0;
  for (const p of products) {
    const vs = variantsByArticle.get(p.articleNo);
    if (!vs || vs.length === 0) {
      skipped++;
      continue;
    }
    const title = titleCase(p.description) || p.articleNo;
    const slug = `${p.articleNo.toLowerCase()}-${slugify(title)}`;
    const priceUsd = computeRetailUsd(p.wholesaleUsd, p.rrpUsd, MARKUP);
    productRows.push({
      id: slug,
      article_no: p.articleNo,
      title,
      description: p.description,
      brand: "Adidas",
      division: p.division,
      gender: p.gender,
      sports_code: p.sportsCode,
      product_group: p.productGroup,
      product_type: p.productType,
      season: p.season,
      rrp_usd: p.rrpUsd.toFixed(2),
      price_usd: priceUsd.toFixed(2),
      active: true,
      updated_at: new Date(),
    });
    for (const v of vs) {
      variantRows.push({
        sku: `${p.articleNo}-${v.size.replace(/\//g, "_")}`,
        product_id: slug,
        size: v.size,
        size_label: sizeLabel(v.size),
        stock: v.qty,
        reserved: 0,
      });
    }
  }
  // De-dup by primary key (last write wins) to keep ON CONFLICT batches clean.
  const dedup = (rows, key) => {
    const m = new Map();
    for (const r of rows) m.set(r[key], r);
    return [...m.values()];
  };
  const pRows = dedup(productRows, "id");
  const vRows = dedup(variantRows, "sku");
  console.log(`Upserting ${pRows.length} products (${skipped} skipped, no variants), ${vRows.length} variants…`);

  let pDone = 0;
  for (const c of chunk(pRows, 500)) {
    await sql`
      INSERT INTO products ${sql(c, "id", "article_no", "title", "description", "brand", "division", "gender", "sports_code", "product_group", "product_type", "season", "rrp_usd", "price_usd", "active", "updated_at")}
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description,
        division = EXCLUDED.division, gender = EXCLUDED.gender,
        sports_code = EXCLUDED.sports_code, product_group = EXCLUDED.product_group,
        product_type = EXCLUDED.product_type, season = EXCLUDED.season,
        rrp_usd = EXCLUDED.rrp_usd, price_usd = EXCLUDED.price_usd,
        updated_at = EXCLUDED.updated_at
    `;
    pDone += c.length;
    process.stdout.write(`  products ${pDone}/${pRows.length}\r`);
  }
  console.log("");

  const stockSet = REPLACE_STOCK ? sql`, stock = EXCLUDED.stock` : sql``;
  let vDone = 0;
  for (const c of chunk(vRows, 1000)) {
    await sql`
      INSERT INTO variants ${sql(c, "sku", "product_id", "size", "size_label", "stock", "reserved")}
      ON CONFLICT (sku) DO UPDATE SET
        size = EXCLUDED.size, size_label = EXCLUDED.size_label${stockSet}
    `;
    vDone += c.length;
    process.stdout.write(`  variants ${vDone}/${vRows.length}\r`);
  }
  console.log("");

  const tot = await sql`SELECT COUNT(DISTINCT p.id)::int products, COUNT(v.sku)::int variants, COALESCE(SUM(v.stock),0)::int stock FROM products p LEFT JOIN variants v ON v.product_id = p.id`;
  console.log("DONE. DB now has:", tot[0]);
} finally {
  await sql.end();
}
