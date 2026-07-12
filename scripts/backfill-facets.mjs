// Backfill facet_values from the products table (mirrors backfillFacets() in
// src/lib/facets.ts). Needed after the raw data import, which didn't run it.
import fs from "node:fs";
import postgres from "postgres";

const DATABASE_URL = fs
  .readFileSync(".env.local", "utf8")
  .split(/\r?\n/)
  .find((l) => l.startsWith("DATABASE_URL="))
  .slice("DATABASE_URL=".length)
  .trim();

const FACETS = [
  { id: "division", col: "division" },
  { id: "gender", col: "gender" },
  { id: "sportsCode", col: "sports_code" },
  { id: "productGroup", col: "product_group" },
  { id: "season", col: "season" },
  { id: "brand", col: "brand" },
];

const label = (raw) =>
  raw
    .toLowerCase()
    .split(/\s+|_/)
    .filter(Boolean)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ");

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
try {
  let inserted = 0;
  for (const f of FACETS) {
    const rows = await sql`SELECT DISTINCT ${sql(f.col)} AS v FROM products WHERE ${sql(f.col)} IS NOT NULL`;
    const values = rows.map((r) => String(r.v ?? "").trim()).filter((v) => v.length > 0);
    const existing = await sql`SELECT value FROM facet_values WHERE facet = ${f.id}`;
    const have = new Set(existing.map((r) => r.value));
    const toInsert = values.filter((v) => !have.has(v)).sort();
    if (toInsert.length === 0) {
      console.log(`${f.id}: up to date (${values.length} values)`);
      continue;
    }
    const maxPos = await sql`SELECT COALESCE(MAX(position), 0)::int AS m FROM facet_values WHERE facet = ${f.id}`;
    let pos = maxPos[0].m;
    const newRows = toInsert.map((v) => ({
      facet: f.id,
      value: v,
      label: label(v),
      position: (pos += 10),
      visible: true,
    }));
    await sql`INSERT INTO facet_values ${sql(newRows, "facet", "value", "label", "position", "visible")}`;
    inserted += newRows.length;
    console.log(`${f.id}: +${newRows.length} new values`);
  }
  console.log(`Done. Inserted ${inserted} facet values.`);
} finally {
  await sql.end();
}
