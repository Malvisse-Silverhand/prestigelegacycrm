// True when a Supabase error means "this migration hasn't been run yet", so
// callers can show the setup message instead of reporting it as a bug.
//
//   42P01    Postgres: relation (table) does not exist
//   42703    Postgres: column does not exist
//   PGRST205 PostgREST: table not found in the schema cache. This is what the
//            API actually returns for a missing table -- it never reaches
//            Postgres, so 42P01 alone misses it.
//   PGRST204 PostgREST: column not found in the schema cache
export function isMissingSchema(error: { code?: string } | null | undefined): boolean {
  const code = error?.code;
  return code === "42P01" || code === "42703" || code === "PGRST205" || code === "PGRST204";
}
