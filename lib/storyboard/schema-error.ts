// The storyboard tables ship in migrations that may not be applied to a given
// database yet. Every data function treats "the table is not there" as a
// friendly state, never a crash.

export const STORYBOARD_MISSING_MESSAGE = "Storyboard database update has not been applied yet.";

// Postgres / PostgREST codes for "that table or column isn't there yet".
const MISSING_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

export function isMissingSchemaError(error: { code?: string } | null | undefined): boolean {
  return Boolean(error?.code && MISSING_CODES.has(error.code));
}
