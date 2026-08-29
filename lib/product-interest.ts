export const INTEREST_OPTIONS = [
  { label: "Medical Card", tool: "imedi-evolusi-quote.html" },
  { label: "Hibah", tool: "quickquote-hibah-life-takaful.html" },
  { label: "Investment-Linked Takaful", tool: null },
  { label: "Critical Illness", tool: null },
] as const;

const PRODUCT_TAG: Record<string, { label: string; cls: string }> = {
  "Medical Card": { label: "MEDICAL", cls: "bg-success-bg text-green" },
  Hibah: { label: "HIBAH", cls: "bg-info-blue-bg text-info-blue-text" },
  "Investment-Linked Takaful": { label: "INVESTMENT-LINKED", cls: "bg-warn-gold-bg text-warn-gold-text" },
  "Critical Illness": { label: "CRITICAL ILLNESS", cls: "bg-alert-red-bg text-alert-red" },
};

export function productTag(interest: string | null) {
  if (!interest) return null;
  return PRODUCT_TAG[interest] ?? null;
}
