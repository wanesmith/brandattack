// Process the extracted lot images → resized webp → upload to Vercel Blob,
// then upsert product_images. Idempotent: deterministic blob paths + overwrite.
//
//   node scripts/import-images-blob.mjs <extracted-image-dir> [concurrency]
//
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import postgres from "postgres";
import { put } from "@vercel/blob";

const IMG_DIR = process.argv[2];
const CONCURRENCY = Number(process.argv[3] ?? 8) || 8;
if (!IMG_DIR || !fs.existsSync(IMG_DIR)) {
  console.error("Usage: node scripts/import-images-blob.mjs <extracted-image-dir> [concurrency]");
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
const DATABASE_URL = env.DATABASE_URL;
const TOKEN = env.BLOB_READ_WRITE_TOKEN;
if (!DATABASE_URL) throw new Error("DATABASE_URL missing from .env.local");
if (!TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN missing from .env.local");

// Index available files by lowercase basename.
const fileIndex = new Map();
for (const name of fs.readdirSync(IMG_DIR)) {
  if (/\.(jpe?g|png|webp)$/i.test(name)) fileIndex.set(name.toLowerCase(), path.join(IMG_DIR, name));
}
console.log(`Indexed ${fileIndex.size} image files.`);

const MAX_EDGE = 1200;
const sql = postgres(DATABASE_URL, { max: 4, prepare: false });

function candidates(articleNo) {
  const out = [];
  for (let n = 1; n <= 6; n++) {
    for (const ext of ["jpg", "jpeg", "png", "webp"]) {
      const hit = fileIndex.get(`${articleNo}-${n}.${ext}`.toLowerCase());
      if (hit) {
        out.push(hit);
        break; // one file per index n
      }
    }
  }
  return out;
}

let processed = 0, withImages = 0, uploaded = 0, missing = 0;
const missingArticles = [];

async function handle(product) {
  const files = candidates(product.article_no);
  if (files.length === 0) {
    missing++;
    if (missingArticles.length < 200) missingArticles.push(product.article_no);
    return;
  }
  const rows = [];
  for (let i = 0; i < files.length; i++) {
    const buf = await sharp(files[i])
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const { url } = await put(`products/${product.article_no}-${i + 1}.webp`, buf, {
      access: "public",
      token: TOKEN,
      contentType: "image/webp",
      allowOverwrite: true,
    });
    rows.push({ product_id: product.id, position: i + 1, url });
    uploaded++;
  }
  await sql.begin(async (tx) => {
    await tx`DELETE FROM product_images WHERE product_id = ${product.id}`;
    await tx`INSERT INTO product_images ${tx(rows, "product_id", "position", "url")}`;
  });
  withImages++;
}

try {
  const products = await sql`SELECT id, article_no FROM products ORDER BY article_no`;
  console.log(`Processing images for ${products.length} products (concurrency ${CONCURRENCY})…`);

  let idx = 0;
  async function worker() {
    while (idx < products.length) {
      const p = products[idx++];
      try {
        await handle(p);
      } catch (e) {
        console.error(`  ! ${p.article_no}: ${e.message}`);
      }
      if (++processed % 100 === 0) {
        process.stdout.write(`  ${processed}/${products.length} products · ${withImages} w/ images · ${uploaded} uploaded\r`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("");
  console.log(`DONE. products=${processed} withImages=${withImages} uploaded=${uploaded} missing=${missing}`);
  if (missingArticles.length) console.log(`No image for (first ${missingArticles.length}):`, missingArticles.slice(0, 40).join(", "));
} finally {
  await sql.end();
}
