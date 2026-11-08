// Medical module strings (English). Keys are prefixed 'medical.'.
// Scaffold: add keys here, then add the same keys to medical.bm.ts (the BM
// type is derived from this object, so a missing key fails to compile).
// See lib/storyboard/i18n/dict/hibah.en.ts for the reference layout.

export const medicalEn = {} as const;

export type MedicalKey = keyof typeof medicalEn;
