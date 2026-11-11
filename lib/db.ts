import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// The driver's defaults: each query returns an array of plain row objects.
type Sql = NeonQueryFunction<false, false>;

let client: Sql | undefined;

// The database client, created on the first request that needs it: never at
// import or build time, so `npm run build` works without a database.
//
// DATABASE_URL is a server-only secret. It has no NEXT_PUBLIC_ prefix, so
// Next.js never sends it to the browser, and it is never put in an error
// message. neon() itself does not check the value, so it is checked here.
export function getSql(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Add your Neon connection string to .env.local (local development) or to the project's environment variables (Vercel).",
      );
    }
    client = neon(url);
  }
  return client;
}

// One column list shared by every query, so every Application has the same
// JSON shape. to_char() returns the date as the plain "YYYY-MM-DD" string
// instead of a JavaScript Date (which would risk time-zone off-by-one errors).
export const APPLICATION_COLUMNS = `id, company, role, stage, to_char(applied_date, 'YYYY-MM-DD') AS "appliedDate"`;
