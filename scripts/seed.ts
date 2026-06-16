import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

type ProductJson = {
  id: string;
  articleNo: string;
  title: string;
  description: string;
  brand: string;
  division: "APPAREL" | "FOOTWEAR" | "HARDWARE";
  gender: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
  sportsCode: string;
  productGroup: string;
  productType: string;
  season: string;
  rrpUsd: number;
  priceUsd: number;
  totalStock: number;
  images: string[];
  variants: { size: string; sizeLabel: string; stock: number; sku: string }[];
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  const jsonPath = resolve(process.cwd(), "src/data/products.json");
  const raw = await readFile(jsonPath, "utf-8");
  const items: ProductJson[] = JSON.parse(raw);

  console.log(`Seeding ${items.length} products from ${jsonPath} ...`);

  let productCount = 0;
  let variantCount = 0;
  let imageCount = 0;

  await db.transaction(async (tx) => {
    for (const p of items) {
      await tx
        .insert(schema.products)
        .values({
          id: p.id,
          articleNo: p.articleNo,
          title: p.title,
          description: p.description,
          brand: p.brand,
          division: p.division,
          gender: p.gender,
          sportsCode: p.sportsCode,
          productGroup: p.productGroup,
          productType: p.productType,
          season: p.season,
          rrpUsd: p.rrpUsd.toFixed(2),
          priceUsd: p.priceUsd.toFixed(2),
          active: true,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.products.id,
          set: {
            title: p.title,
            description: p.description,
            priceUsd: p.priceUsd.toFixed(2),
            rrpUsd: p.rrpUsd.toFixed(2),
            updatedAt: new Date(),
          },
        });
      productCount++;

      // Replace images (delete then insert) — simpler than diffing.
      await tx
        .delete(schema.productImages)
        .where(eq(schema.productImages.productId, p.id));
      if (p.images.length) {
        await tx.insert(schema.productImages).values(
          p.images.map((url, i) => ({
            productId: p.id,
            position: i + 1,
            url,
          }))
        );
        imageCount += p.images.length;
      }

      // Upsert variants. Don't touch `reserved`; trust DB on stock if it already has it
      // (so re-running the seed doesn't accidentally restore sold-out inventory).
      for (const v of p.variants) {
        await tx
          .insert(schema.variants)
          .values({
            sku: v.sku,
            productId: p.id,
            size: v.size,
            sizeLabel: v.sizeLabel,
            stock: v.stock,
            reserved: 0,
          })
          .onConflictDoUpdate({
            target: schema.variants.sku,
            set: {
              size: v.size,
              sizeLabel: v.sizeLabel,
              // NOTE: leave `stock` alone on re-seed. Use a separate
              //   admin tool to reset stock from a fresh lot.
            },
          });
        variantCount++;
      }
    }
  });

  console.log(
    `Seeded: ${productCount} products, ${variantCount} variants, ${imageCount} images`
  );
  await client.end();
}

import { eq } from "drizzle-orm";

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
