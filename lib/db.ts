import postgres from "postgres";

// One shared connection pool for the whole app. Server-only: never import this
// from a "use client" file.
//
// `prepare: false` keeps it compatible with Supabase's transaction pooler
// (port 6543), which is the one to use once this runs on Vercel.

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

// In dev, hot reload re-runs this file on every save. Keeping the client on
// globalThis stops that from opening a new pool each time.
export const sql =
  globalForDb.sql ?? postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
