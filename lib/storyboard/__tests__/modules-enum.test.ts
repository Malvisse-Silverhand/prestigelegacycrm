import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STORYBOARD_MODULES } from "../types";

describe("STORYBOARD_MODULES", () => {
  it("matches the storyboard_module enum in the migration", () => {
    const file = path.resolve(__dirname, "../../../supabase/migrations/20261105090000_storyboard_module_enum.sql");
    const sql = readFileSync(file, "utf8");
    const m = sql.match(/create\s+type\s+public\.storyboard_module\s+as\s+enum\s*\(([^)]*)\)/i);
    expect(m, "enum definition found in migration").not.toBeNull();
    const values = [...(m as RegExpMatchArray)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    expect([...STORYBOARD_MODULES]).toEqual(values);
  });
});
