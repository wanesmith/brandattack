// Load .env.local before any other import via the tsx --env-file flag:
//   npx tsx --env-file=.env.local scripts/backfill-facets.ts
import { backfillFacets } from "../src/lib/facets";
import { db } from "../src/db";

async function main() {
  const result = await backfillFacets();
  console.log(
    `Facets seeded: ${result.facetsInserted} new facet(s), ${result.valuesInserted} new value(s).`
  );
  const client = (db as unknown as { $client?: { end?: () => Promise<void> } }).$client;
  if (client?.end) await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
