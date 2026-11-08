// Malaysian phone numbers to E.164 (+60...).
//
// Accepts 012-345 6789, 0123456789, 12-345 6789, +6012..., 6012..., 0060 12...
// and strips spaces, dashes, dots and brackets. Returns null for anything that
// is not a plausible Malaysian number, so the portal gate can compare like with
// like and never matches on garbage.

export function normalisePhoneE164(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;
  // Only digits plus separators are allowed, and a single leading +.
  if (!/^\+?[\d\s\-().]+$/.test(trimmed)) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (!trimmed.startsWith("+") && digits.startsWith("0060")) {
    digits = digits.slice(2);
  }

  let national: string;
  if (digits.startsWith("60")) {
    national = digits.slice(2);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1);
  } else {
    national = digits;
  }

  if (trimmed.startsWith("+") && !digits.startsWith("60")) return null;

  // Mobile: 1x then 8 or 9 digits. Landline: 3-9 then 7 or 8 digits.
  if (!/^1\d{8,9}$/.test(national) && !/^[3-9]\d{7,8}$/.test(national)) return null;
  return "+60" + national;
}
