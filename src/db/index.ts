import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy db client — initialised on first access so the build can collect
// page data without DATABASE_URL set. Module-level cache makes the client
// a per-process singleton; globalThis cache survives HMR in dev.

type Sql = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __pgClient?: Sql };

let _client: Sql | undefined;
let _db: Db | undefined;

function getClient(): Sql {
  if (_client) return _client;
  if (globalForDb.__pgClient) {
    _client = globalForDb.__pgClient;
    return _client;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (local dev) or to your hosting provider's environment variables (production)."
    );
  }
  _client = postgres(url, { max: 10, idle_timeout: 20, prepare: false });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__pgClient = _client;
  }
  return _client;
}

function getDb(): Db {
  if (_db) return _db;
  _db = drizzle(getClient(), { schema });
  return _db;
}

// Proxy so `import { db }` works everywhere without eager initialisation.
// First method access on db triggers connection setup; subsequent calls
// hit the module-level singleton.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    const v = Reflect.get(real as object, prop, receiver);
    return typeof v === "function" ? v.bind(real) : v;
  },
});

export { schema };
