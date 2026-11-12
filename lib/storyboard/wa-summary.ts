// Client-safe plain-text summary for "Copy to WhatsApp".
//
// Only computed, client-visible figures go in. No operator names, no
// guarantees, no agency figures, no IC numbers. The wording says "could" and
// points to the PDS and certificate terms. Every builder takes an optional
// `lang` ('en' | 'bm') and writes the whole message in that language.
//
// One builder per module, each in its own file so parallel module work does
// not collide: wa/hibah.ts, wa/medical.ts, wa/ci.ts, wa/business.ts.

export { buildHibahWaSummary } from "./wa/hibah";
export { buildMedicalWaSummary } from "./wa/medical";
export { buildCiWaSummary } from "./wa/ci";
export { buildBusinessWaSummary } from "./wa/business";
