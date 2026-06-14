// Convert the extracted demo jpgs into 1200px WebP files under public/products/.
// Run from project root: node scripts/process_images.mjs
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = String.raw`C:\Users\wane\AppData\Local\Temp\brandattack_imgs\All Pics Combined`;
const OUT = path.resolve("public/products");
const MAX_EDGE = 1200;
const QUALITY = 82;

async function main() {
  await mkdir(OUT, { recursive: true });
  const files = (await readdir(SRC)).filter((f) => f.toLowerCase().endsWith(".jpg"));
  console.log(`Processing ${files.length} images → ${OUT}`);

  let done = 0;
  let totalIn = 0;
  let totalOut = 0;

  await Promise.all(
    files.map(async (f) => {
      const inPath = path.join(SRC, f);
      const outPath = path.join(OUT, f.replace(/\.jpg$/i, ".webp"));
      const inStat = await stat(inPath);
      totalIn += inStat.size;
      const buf = await sharp(inPath)
        .rotate() // honour EXIF orientation before stripping
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
      await writeFile(outPath, buf);
      totalOut += buf.length;
      done++;
      if (done % 25 === 0) console.log(`  ${done}/${files.length}`);
    })
  );

  console.log(`Done. ${(totalIn / 1024 / 1024).toFixed(1)} MB in → ${(totalOut / 1024 / 1024).toFixed(1)} MB out`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
