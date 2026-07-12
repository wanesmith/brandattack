import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import StreamZip from "node-stream-zip";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { backfillFacets } from "./facets";

export type ImportOptions = {
  /** If true, overwrite stock from the spreadsheet for existing variants.
   *  Otherwise leave existing stock untouched (only set stock on new variants). */
  replaceStock: boolean;
  /** Markup multiplier applied to wholesale Price column to compute retail.
   *  Final price is capped at 0.7 × RRP. */
  markupOverCost: number;
};

export type ImportSummary = {
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  imagesAdded: number;
  imagesMissing: string[];
  skippedRows: { articleNo: string; reason: string }[];
  durationMs: number;
};

type RawProduct = {
  articleNo: string;
  description: string;
  season: string;
  division: "APPAREL" | "FOOTWEAR" | "HARDWARE";
  gender: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
  sportsCode: string;
  productGroup: string;
  productType: string;
  totalQuantity: number;
  wholesaleUsd: number;
  rrpUsd: number;
  /** From an optional "Status" column. null = column absent (leave active as-is on update). */
  active: boolean | null;
};

type RawVariant = { articleNo: string; size: string; qty: number };

const GENDER_MAP: Record<string, RawProduct["gender"]> = {
  FEMALE: "WOMEN",
  WOMEN: "WOMEN",
  MALE: "MEN",
  MEN: "MEN",
  UNISEX: "UNISEX",
  KIDS: "KIDS",
};

const DIVISION_MAP: Record<string, RawProduct["division"]> = {
  APPAREL: "APPAREL",
  FOOTWEAR: "FOOTWEAR",
  HARDWARE: "HARDWARE",
};

function normGender(s: unknown): RawProduct["gender"] {
  return GENDER_MAP[String(s ?? "").toUpperCase().trim()] ?? "UNISEX";
}

function normDivision(s: unknown): RawProduct["division"] | null {
  return DIVISION_MAP[String(s ?? "").toUpperCase().trim()] ?? null;
}

// Optional "Status" column: anything but a hidden/inactive marker means active.
// Empty defaults to active.
function normActive(s: unknown): boolean {
  const v = String(s ?? "").trim().toLowerCase();
  if (!v) return true;
  return !["hidden", "inactive", "no", "false", "0", "off", "disabled"].includes(v);
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
    .join(" ");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sizeLabel(raw: string): string {
  const m = raw.match(/^(\d+)(-)?(K)?$/);
  if (m) {
    const num = m[1];
    const half = m[2] === "-";
    const kids = m[3] === "K";
    const n = half ? `${num}.5` : num;
    return kids ? `${n} (kids)` : n;
  }
  return raw;
}

/**
 * Parse the uploaded xlsx into product + variant + image-map structures.
 * Tolerates the three-sheet layout used by the Adidas lot:
 *   - "Asset Report"           — header on row 2; one row per ArticleNo
 *   - "VerticaL Article Size Qty" — normalised variants
 *   - "Pictures List"           — (filename, ArticleNo) rows
 */
async function parseXlsx(filePath: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const assetSheet = wb.getWorksheet("Asset Report") ?? wb.worksheets[0];
  const verticalSheet =
    wb.getWorksheet("VerticaL Article Size Qty") ??
    wb.getWorksheet("Vertical Article Size Qty") ??
    null;
  const picsSheet = wb.getWorksheet("Pictures List") ?? null;

  if (!assetSheet) throw new Error("Asset Report sheet not found");
  if (!verticalSheet) throw new Error("Vertical size/qty sheet not found");

  // Asset Report: header on row 2
  const headerRow = assetSheet.getRow(2);
  const headerIndex = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    const name = String(cell.value ?? "").trim();
    if (name) headerIndex.set(name, col);
  });

  const REQUIRED = [
    "ArticleNo",
    "Item Description",
    "Season",
    "Division",
    "Gender",
    "Sports Code",
    "Product Group",
    "Product Type",
    "Total Quantity",
    "Price",
    "RRP Price (USD)",
  ];
  for (const col of REQUIRED) {
    if (!headerIndex.has(col)) {
      throw new Error(`Required column missing from Asset Report: "${col}"`);
    }
  }

  const get = (row: ExcelJS.Row, col: string) => {
    const idx = headerIndex.get(col);
    if (!idx) return null;
    const v = row.getCell(idx).value;
    if (v && typeof v === "object" && "result" in v) return (v as { result: unknown }).result;
    return v;
  };

  const hasStatusColumn = headerIndex.has("Status");
  const products: RawProduct[] = [];
  for (let r = 3; r <= assetSheet.rowCount; r++) {
    const row = assetSheet.getRow(r);
    const articleNo = String(get(row, "ArticleNo") ?? "").trim();
    if (!articleNo) continue;
    const division = normDivision(get(row, "Division"));
    if (!division) continue;
    products.push({
      active: hasStatusColumn ? normActive(get(row, "Status")) : null,
      articleNo,
      description: String(get(row, "Item Description") ?? "").trim(),
      season: String(get(row, "Season") ?? "").trim(),
      division,
      gender: normGender(get(row, "Gender")),
      sportsCode: String(get(row, "Sports Code") ?? "")
        .toUpperCase()
        .trim(),
      productGroup: String(get(row, "Product Group") ?? "")
        .toUpperCase()
        .trim(),
      productType: String(get(row, "Product Type") ?? "")
        .toUpperCase()
        .trim(),
      totalQuantity: Number(get(row, "Total Quantity") ?? 0),
      wholesaleUsd: Number(get(row, "Price") ?? 0),
      rrpUsd: Number(get(row, "RRP Price (USD)") ?? 0),
    });
  }

  // Vertical sheet: header on row 1: ArticleNo, Attribute, Qty
  const variants: RawVariant[] = [];
  for (let r = 2; r <= verticalSheet.rowCount; r++) {
    const row = verticalSheet.getRow(r);
    const articleNo = String(row.getCell(1).value ?? "").trim();
    const size = String(row.getCell(2).value ?? "").trim();
    const qtyVal = row.getCell(3).value;
    const qty = Number(qtyVal ?? 0);
    if (!articleNo || !size || !Number.isFinite(qty) || qty <= 0) continue;
    variants.push({ articleNo, size, qty: Math.floor(qty) });
  }

  // Pictures List (optional): (filename, ArticleNo)
  const picturesByArticle = new Map<string, string[]>();
  if (picsSheet) {
    for (let r = 1; r <= picsSheet.rowCount; r++) {
      const row = picsSheet.getRow(r);
      const fn = String(row.getCell(1).value ?? "").trim();
      const art = String(row.getCell(2).value ?? "").trim();
      if (!fn || !art) continue;
      const arr = picturesByArticle.get(art) ?? [];
      arr.push(fn);
      picturesByArticle.set(art, arr);
    }
    for (const v of picturesByArticle.values()) v.sort();
  }

  return { products, variants, picturesByArticle };
}

/**
 * Extract all entries from the uploaded zip into a temp dir.
 * Returns a map of basename (lowercased) → on-disk path.
 */
async function extractZip(zipPath: string, destDir: string): Promise<Map<string, string>> {
  await mkdir(destDir, { recursive: true });
  const zip = new StreamZip.async({ file: zipPath });
  try {
    const entries = await zip.entries();
    const out = new Map<string, string>();
    for (const entry of Object.values(entries)) {
      if (entry.isDirectory) continue;
      const basename = path.basename(entry.name);
      if (!/\.(jpe?g|png|webp)$/i.test(basename)) continue;
      const outPath = path.join(destDir, basename);
      // entry.name can be nested; we flatten to basename.
      await zip.extract(entry.name, outPath);
      out.set(basename.toLowerCase(), outPath);
    }
    return out;
  } finally {
    await zip.close();
  }
}

const PUBLIC_PRODUCTS_DIR = path.join(process.cwd(), "public", "products");
const MAX_EDGE = 1200;
const WEBP_QUALITY = 82;

async function processImage(srcPath: string, articleNo: string, n: number): Promise<string> {
  await mkdir(PUBLIC_PRODUCTS_DIR, { recursive: true });
  const outBasename = `${articleNo}-${n}.webp`;
  const outPath = path.join(PUBLIC_PRODUCTS_DIR, outBasename);
  await sharp(srcPath)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outPath);
  return `/products/${outBasename}`;
}

function imageFilenameCandidates(
  articleNo: string,
  pictureSheetForArticle: string[] | undefined
): string[] {
  // Prefer the Pictures List rows if present (authoritative ordering).
  if (pictureSheetForArticle && pictureSheetForArticle.length > 0) {
    return pictureSheetForArticle;
  }
  // Fall back to filename convention: <ArticleNo>-N.<ext>, N = 1..6
  const out: string[] = [];
  for (let n = 1; n <= 6; n++) {
    for (const ext of ["jpg", "jpeg", "png", "webp"]) {
      out.push(`${articleNo}-${n}.${ext}`);
    }
  }
  return out;
}

function computeRetailUsd(wholesale: number, rrp: number, markup: number): number {
  if (!Number.isFinite(wholesale) || wholesale <= 0) return 0;
  const candidate = wholesale * markup;
  const cap = rrp > 0 ? rrp * 0.7 : Infinity;
  return Math.round(Math.min(candidate, cap) * 100) / 100;
}

/**
 * Process an uploaded lot: parse xlsx, extract zip, write images, upsert DB.
 *
 * Both file params are paths on the server's filesystem; the caller is
 * responsible for writing the uploaded bytes there and cleaning up after.
 */
export async function importLot(
  xlsxPath: string,
  zipPath: string | null,
  opts: ImportOptions
): Promise<ImportSummary> {
  const start = Date.now();
  const summary: ImportSummary = {
    productsCreated: 0,
    productsUpdated: 0,
    variantsCreated: 0,
    variantsUpdated: 0,
    imagesAdded: 0,
    imagesMissing: [],
    skippedRows: [],
    durationMs: 0,
  };

  const { products, variants, picturesByArticle } = await parseXlsx(xlsxPath);

  // Index variants by article
  const variantsByArticle = new Map<string, RawVariant[]>();
  for (const v of variants) {
    const arr = variantsByArticle.get(v.articleNo) ?? [];
    arr.push(v);
    variantsByArticle.set(v.articleNo, arr);
  }

  // Extract zip (if provided)
  let extractedImages = new Map<string, string>();
  let tempZipDir: string | null = null;
  if (zipPath) {
    tempZipDir = path.join(tmpdir(), `brandattack-import-${randomBytes(6).toString("hex")}`);
    extractedImages = await extractZip(zipPath, tempZipDir);
  }

  // Existing products in DB (for created vs updated counting)
  const articleNos = products.map((p) => p.articleNo);
  const existingProductRows =
    articleNos.length > 0
      ? await db
          .select({ id: schema.products.id, articleNo: schema.products.articleNo })
          .from(schema.products)
          .where(inArray(schema.products.articleNo, articleNos))
      : [];
  const existingProductIds = new Set(existingProductRows.map((r) => r.id));

  try {
    for (const p of products) {
      if (!variantsByArticle.has(p.articleNo)) {
        summary.skippedRows.push({
          articleNo: p.articleNo,
          reason: "No variant rows found in Vertical Article Size Qty sheet",
        });
        continue;
      }

      const slug = `${p.articleNo.toLowerCase()}-${slugify(titleCase(p.description) || p.articleNo)}`;
      const title = titleCase(p.description) || p.articleNo;
      const priceUsd = computeRetailUsd(p.wholesaleUsd, p.rrpUsd, opts.markupOverCost);
      const isNew = !existingProductIds.has(slug);

      await db.transaction(async (tx) => {
        // Upsert product
        await tx
          .insert(schema.products)
          .values({
            id: slug,
            articleNo: p.articleNo,
            title,
            description: p.description,
            brand: "Adidas", // TODO: derive from spreadsheet when other brands arrive
            division: p.division,
            gender: p.gender,
            sportsCode: p.sportsCode,
            productGroup: p.productGroup,
            productType: p.productType,
            season: p.season,
            rrpUsd: p.rrpUsd.toFixed(2),
            priceUsd: priceUsd.toFixed(2),
            active: p.active ?? true,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: schema.products.id,
            set: {
              title,
              description: p.description,
              division: p.division,
              gender: p.gender,
              sportsCode: p.sportsCode,
              productType: p.productType,
              productGroup: p.productGroup,
              season: p.season,
              rrpUsd: p.rrpUsd.toFixed(2),
              priceUsd: priceUsd.toFixed(2),
              // Only overwrite status when the sheet actually has a Status column,
              // so re-imports don't silently un-hide manually hidden products.
              ...(p.active !== null ? { active: p.active } : {}),
              updatedAt: new Date(),
            },
          });

        if (isNew) summary.productsCreated++;
        else summary.productsUpdated++;

        // Process images
        if (zipPath) {
          const candidates = imageFilenameCandidates(
            p.articleNo,
            picturesByArticle.get(p.articleNo)
          );
          const seen = new Set<string>();
          const imageUrls: string[] = [];
          for (const fn of candidates) {
            const srcPath = extractedImages.get(fn.toLowerCase());
            if (!srcPath) continue;
            if (seen.has(srcPath)) continue;
            seen.add(srcPath);
            if (imageUrls.length >= 6) break;
            const url = await processImage(srcPath, p.articleNo, imageUrls.length + 1);
            imageUrls.push(url);
            summary.imagesAdded++;
          }
          if (imageUrls.length === 0) {
            summary.imagesMissing.push(p.articleNo);
          } else {
            await tx
              .delete(schema.productImages)
              .where(eq(schema.productImages.productId, slug));
            await tx.insert(schema.productImages).values(
              imageUrls.map((url, i) => ({
                productId: slug,
                position: i + 1,
                url,
              }))
            );
          }
        }

        // Upsert variants
        for (const v of variantsByArticle.get(p.articleNo) ?? []) {
          const sku = `${p.articleNo}-${v.size.replace(/\//g, "_")}`;
          const existing = await tx
            .select({ sku: schema.variants.sku })
            .from(schema.variants)
            .where(eq(schema.variants.sku, sku))
            .limit(1);
          const variantExists = existing.length > 0;

          await tx
            .insert(schema.variants)
            .values({
              sku,
              productId: slug,
              size: v.size,
              sizeLabel: sizeLabel(v.size),
              stock: v.qty,
              reserved: 0,
            })
            .onConflictDoUpdate({
              target: schema.variants.sku,
              set: {
                size: v.size,
                sizeLabel: sizeLabel(v.size),
                ...(opts.replaceStock ? { stock: v.qty } : {}),
              },
            });
          if (variantExists) summary.variantsUpdated++;
          else summary.variantsCreated++;
        }
      });
    }
  } finally {
    if (tempZipDir) {
      await rm(tempZipDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  // Register any new facet values from this lot. Doesn't touch admin overrides.
  try {
    await backfillFacets();
  } catch (e) {
    console.warn("[import] facet backfill failed (non-fatal):", e);
  }

  summary.durationMs = Date.now() - start;
  return summary;
}

/**
 * Write a File (from request.formData()) to a temp path on disk.
 * Returns the on-disk path; caller cleans up.
 */
export async function saveUploadedFile(file: File, suffix: string): Promise<string> {
  const tmp = path.join(
    tmpdir(),
    `brandattack-upload-${randomBytes(6).toString("hex")}-${suffix}`
  );
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(tmp, buf);
  return tmp;
}

// imports referenced below intentionally exported for tests / direct calls
export { parseXlsx, computeRetailUsd, sizeLabel };
