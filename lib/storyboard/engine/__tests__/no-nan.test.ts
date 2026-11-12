import { describe, expect, it } from "vitest";
import { computeModule } from "../index";
import { HIBAH_DEFAULT_INPUTS } from "../../defaults/hibah";
import { MEDICAL_DEFAULT_INPUTS } from "../../defaults/medical";
import { CI_DEFAULT_INPUTS } from "../../defaults/ci";
import { BUSINESS_DEFAULT_INPUTS } from "../../defaults/business";
import { MORTGAGE_DEFAULT_INPUTS } from "../../defaults/mortgage";
import type { StoryboardModule } from "../../types";

const DEFAULTS: Record<StoryboardModule, Record<string, unknown>> = {
  hibah: HIBAH_DEFAULT_INPUTS,
  medical: MEDICAL_DEFAULT_INPUTS,
  ci: CI_DEFAULT_INPUTS,
  business: BUSINESS_DEFAULT_INPUTS,
  mortgage: MORTGAGE_DEFAULT_INPUTS,
};

/** Recursively find any NaN / Infinity number or a "NaN" / "Infinity" inside a string. */
function bad(value: unknown, path = "$"): string[] {
  if (typeof value === "number") return Number.isFinite(value) ? [] : [path + "=" + value];
  if (typeof value === "string") return /NaN|Infinity|undefined/.test(value) ? [path + '="' + value + '"'] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => bad(v, path + "[" + i + "]"));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => bad(v, path + "." + k));
  }
  return [];
}

// Hostile values a UI could send.
const WEIRD: unknown[] = [0, -1, -1e9, 1e12, NaN, Infinity, "", "abc", null, undefined, "12", 0.5];

function mutate(base: Record<string, unknown>, value: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(base)) out[k] = typeof v === "number" ? value : v;
  return out;
}

describe("no NaN / Infinity anywhere in outputs", () => {
  for (const mod of Object.keys(DEFAULTS) as StoryboardModule[]) {
    it(mod + ": defaults", () => {
      expect(bad(computeModule(mod, DEFAULTS[mod] as never))).toEqual([]);
    });

    it(mod + ": empty inputs", () => {
      expect(bad(computeModule(mod, {} as never))).toEqual([]);
    });

    it(mod + ": every numeric/string field set to a hostile value", () => {
      for (const w of WEIRD) {
        const result = computeModule(mod, mutate(DEFAULTS[mod], w) as never);
        expect(bad(result), "mod " + mod + " with " + String(w)).toEqual([]);
      }
    });

    it(mod + ": property-style loop over generated inputs", () => {
      let seed = 12345;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
      for (let i = 0; i < 60; i++) {
        const inp: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(DEFAULTS[mod])) {
          inp[k] = typeof v === "number" ? Math.round(rnd() * (rnd() < 0.2 ? 0 : 1_000_000)) / (rnd() < 0.3 ? 100 : 1) : v;
        }
        expect(bad(computeModule(mod, inp as never))).toEqual([]);
      }
    });
  }
});
