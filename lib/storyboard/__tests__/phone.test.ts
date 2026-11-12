import { describe, expect, it } from "vitest";
import { normalisePhoneE164 } from "../phone";

describe("normalisePhoneE164", () => {
  it.each([
    ["0123456789", "+60123456789"],
    ["012-345 6789", "+60123456789"],
    ["012 345 6789", "+60123456789"],
    ["123456789", "+60123456789"],
    ["12-345 6789", "+60123456789"],
    ["+60123456789", "+60123456789"],
    ["+60 12-345 6789", "+60123456789"],
    ["60123456789", "+60123456789"],
    ["6012-3456789", "+60123456789"],
    ["0060123456789", "+60123456789"],
    ["011-2345 6789", "+601123456789"],
    ["(012) 345-6789", "+60123456789"],
    ["  0123456789  ", "+60123456789"],
    ["03-2345 6789", "+60323456789"],
  ])("%s => %s", (input, expected) => {
    expect(normalisePhoneE164(input)).toBe(expected);
  });

  it.each([
    [""],
    ["   "],
    ["abc"],
    ["012-abc"],
    ["12345"],
    ["+65 9123 4567"], // Singapore
    ["+44 7911 123456"],
    ["0000000000"],
    ["01234567890123"],
  ])("rejects %s", (input) => {
    expect(normalisePhoneE164(input)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(normalisePhoneE164(null)).toBeNull();
    expect(normalisePhoneE164(undefined)).toBeNull();
    expect(normalisePhoneE164(123456789)).toBeNull();
  });

  it("two spellings of the same number compare equal", () => {
    expect(normalisePhoneE164("012-3456789")).toBe(normalisePhoneE164("+6012 3456 789"));
  });
});
