/**
 * Copy the remote (Neon) database into a local Postgres instance.
 *
 * Why: Neon egress is metered and the production DB is the live shop. A local
 * copy gives you a throwaway target for testing destructive paths — the admin
 * lot import, migrations, stock overwrites — without touching real orders or
 * burning transfer quota.
 *
 *   npm run db:copy
 *
 * Reads:
 *   DATABASE_URL        source, the Neon connection string (from .env.local)
 *   LOCAL_DATABASE_URL  target, e.g. postgres://postgres:pw@localhost:5432/brandattack
 *
 * The target database is created if missing and otherwise fully replaced
 * (pg_dump --clean --if-exists). The source is only ever read.
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SOURCE = process.env.DATABASE_URL;
const TARGET =
  process.env.LOCAL_DATABASE_URL ?? "postgres://postgres@localhost:5432/brandattack";

if (!SOURCE) {
  console.error("DATABASE_URL is not set (expected in .env.local).");
  process.exit(1);
}

/** Locate a Postgres client binary: PATH first, then standard Windows installs. */
function findBin(name) {
  const probe = spawnSync(name, ["--version"], { encoding: "utf8" });
  if (!probe.error) return name;
  for (const v of [18, 17, 16, 15]) {
    const p = `C:/Program Files/PostgreSQL/${v}/bin/${name}.exe`;
    if (existsSync(p)) return p;
  }
  console.error(
    `Could not find ${name}. Install the Postgres client tools or add them to PATH.`
  );
  process.exit(1);
}

const pgDump = findBin("pg_dump");
const psql = findBin("psql");

/** Run a command, inheriting stdio. Exits the process on failure. */
function run(bin, args, label, opts = {}) {
  const r = spawnSync(bin, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) {
    console.error(`\n${label} failed (exit ${r.status}).`);
    process.exit(r.status ?? 1);
  }
}

/** Capture stdout of a psql query against `url`. */
function query(url, sqlText) {
  const r = spawnSync(psql, [url, "-tAc", sqlText], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr?.trim() || `psql exited ${r.status}`);
    process.exit(r.status ?? 1);
  }
  return r.stdout.trim();
}

// Neon serves a PgBouncer "-pooler" endpoint and a direct one. Transaction
// pooling can't hold the consistent snapshot pg_dump needs, so dump from the
// direct endpoint (same host minus "-pooler").
const dumpSource = SOURCE.replace(/-pooler\./, ".");

// Split the target into "server" + database name so we can CREATE DATABASE.
const targetUrl = new URL(TARGET);
const dbName = targetUrl.pathname.replace(/^\//, "");
if (!dbName) {
  console.error("LOCAL_DATABASE_URL must include a database name, e.g. .../brandattack");
  process.exit(1);
}
const adminUrl = new URL(TARGET);
adminUrl.pathname = "/postgres";

// Never print credentials — show host/db only.
console.log(`Source : ${new URL(SOURCE).host}`);
console.log(`Target : ${targetUrl.host}/${dbName}\n`);

const exists = query(adminUrl.toString(), `select 1 from pg_database where datname = '${dbName}'`);
if (exists !== "1") {
  console.log(`Creating database ${dbName}…`);
  run(psql, [adminUrl.toString(), "-qc", `CREATE DATABASE "${dbName}"`], "CREATE DATABASE");
} else {
  console.log(`Database ${dbName} already exists — its contents will be replaced.`);
}

// Dump to a file rather than piping: avoids shell-pipe quoting differences
// between PowerShell and sh, and lets pg_dump fail loudly before we touch the target.
const workDir = mkdtempSync(path.join(tmpdir(), "brandattack-dbcopy-"));
const dumpFile = path.join(workDir, "dump.sql");

try {
  console.log("\nDumping remote database…");
  run(
    pgDump,
    [
      dumpSource,
      "--no-owner",
      "--no-acl",
      "--clean",
      "--if-exists",
      "--quote-all-identifiers",
      "-f",
      dumpFile,
    ],
    "pg_dump"
  );

  console.log("Restoring into local database…");
  run(
    psql,
    [TARGET, "-q", "-v", "ON_ERROR_STOP=1", "-f", dumpFile],
    "psql restore"
  );

  // Verify: compare per-table row counts on both sides.
  console.log("\nVerifying row counts…");
  const listSql =
    "select table_name from information_schema.tables where table_schema='public' order by 1";
  // psql emits CRLF on Windows — trim each name or the \r lands inside the
  // quoted identifier below.
  const tables = query(SOURCE, listSql)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  let mismatched = 0;
  for (const t of tables) {
    const countSql = `select count(*) from "${t}"`;
    const src = query(SOURCE, countSql);
    const dst = query(TARGET, countSql);
    const ok = src === dst;
    if (!ok) mismatched++;
    console.log(`  ${ok ? "ok  " : "DIFF"} ${t.padEnd(16)} remote=${src} local=${dst}`);
  }

  if (mismatched > 0) {
    console.error(`\n${mismatched} table(s) differ — copy is not faithful.`);
    process.exit(1);
  }
  console.log(`\nDone. ${tables.length} tables copied and verified.`);
  console.log(
    "\nTo point the app at the copy, set DATABASE_URL to your LOCAL_DATABASE_URL value in .env.local."
  );
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
