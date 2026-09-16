// Every word the client portal shows, in both languages.
//
// The portal is read by people with no insurance vocabulary, often on a phone,
// often worried. So each illness carries a one-line tooltip in plain language:
// the list alone answers "is it on the list", the tooltip answers "is that
// what I have". The labels follow the categories Great Eastern Takaful sets
// out and the agency guide at takaful4us.com; the explanations are ours.
//
// No dates, no clock, no client data in this file: it is a dictionary, and the
// page resolves it against a certificate.

import type { WaitingPeriodKey } from "@/lib/waiting-periods";

export type PortalLang = "bm" | "en";

/** An illness as the client reads it: the operator's label, then ours. */
export type PortalCondition = {
  label: string;
  /** One sentence, no jargon, no promise of cover. */
  tip: string;
};

export const PORTAL_CONDITIONS: Record<PortalLang, Record<WaitingPeriodKey, PortalCondition[]>> = {
  bm: {
    immediate: [
      { label: "Kemalangan jalan raya", tip: "Kemalangan melibatkan kereta, motosikal, basikal atau semasa berjalan kaki." },
      { label: "Kecederaan di tempat kerja", tip: "Kecederaan yang berlaku semasa menjalankan tugas di tempat kerja." },
      { label: "Jatuh, terhantuk, terbakar", tip: "Termasuk jatuh tangga, tergelincir di bilik air, terkena air panas atau api." },
      { label: "Patah tulang akibat kemalangan", tip: "Tulang patah atau retak akibat hentaman atau jatuh, bukan akibat penyakit tulang." },
      { label: "Kemalangan sukan", tip: "Kecederaan semasa bersukan atau bersenam — seliuh, terkehel atau patah." },
      { label: "Kemalangan domestik", tip: "Kemalangan di rumah seperti terpotong, terjatuh atau terkena renjatan elektrik." },
    ],
    general: [
      { label: "Demam denggi", tip: "Demam akibat gigitan nyamuk Aedes, selalunya memerlukan pemantauan platelet di hospital." },
      { label: "Tibi (tuberkulosis)", tip: "Jangkitan bakteria pada paru-paru, dengan batuk berpanjangan melebihi tiga minggu." },
      { label: "Tifoid", tip: "Jangkitan usus akibat makanan atau air tercemar, dengan demam berterusan." },
      { label: "Malaria", tip: "Jangkitan parasit melalui gigitan nyamuk, dengan demam panas dan menggigil berulang." },
      { label: "Pneumonia", tip: "Radang paru-paru akibat jangkitan, menyebabkan sesak nafas dan demam." },
      { label: "Gastroenteritis akut", tip: "Cirit-birit dan muntah teruk sehingga memerlukan cecair melalui urat." },
      { label: "Asma akut", tip: "Serangan asma yang mendadak dan memerlukan rawatan segera." },
      { label: "Jangkitan saluran kencing (UTI)", tip: "Jangkitan pada pundi kencing atau buah pinggang — pedih atau kerap membuang air kecil." },
      { label: "Apendisitis", tip: "Radang usus buntu, biasanya memerlukan pembedahan segera." },
      { label: "Jangkitan virus atau bakteria", tip: "Jangkitan am seperti influenza, HFMD, chikungunya atau Zika." },
      { label: "Kecederaan ringan (bukan kemalangan)", tip: "Kecederaan kecil yang berlaku tanpa kemalangan, seperti otot terseliuh." },
      { label: "Komplikasi diabetes baharu", tip: "Masalah berkaitan kencing manis yang baru didiagnos selepas sijil bermula." },
    ],
    specified: [
      { label: "Hipertensi, kencing manis dan penyakit jantung", tip: "Darah tinggi, diabetes dan penyakit jantung yang baru didiagnos selepas sijil bermula." },
      { label: "Tumor, kanser, sista, polip dan ketulan", tip: "Sebarang ketumbuhan, sama ada barah atau bukan barah, di mana-mana bahagian badan." },
      { label: "Batu karang sistem kencing dan hempedu", tip: "Batu dalam buah pinggang, pundi kencing atau pundi hempedu." },
      { label: "Penyakit telinga, hidung dan tekak (ENT) termasuk sinusitis", tip: "Termasuk sinusitis kronik, masalah gegendang telinga dan pembedahan hidung." },
      { label: "Hernia, buasir dan fistula", tip: "Hernia (burut), buasir, dan saluran abnormal berhampiran dubur." },
      { label: "Hidrosil dan varikosil", tip: "Pengumpulan cecair atau urat bengkak di bahagian skrotum." },
      { label: "Endometriosis dan penyakit sistem reproduktif", tip: "Termasuk fibroid, sista ovari dan masalah rahim yang lain." },
      { label: "Penyakit tulang belakang", tip: "Termasuk slipped disc dan saraf tulang belakang yang terjepit." },
      { label: "Kondisi lutut dan internal derangement", tip: "Kerosakan pada ligamen, meniskus atau rawan di dalam sendi lutut." },
      { label: "Tonsilektomi dan adenoidektomi", tip: "Pembedahan membuang tonsil atau adenoid." },
      { label: "Pembedahan kondisi kongenital", tip: "Pembedahan untuk keadaan yang ada sejak lahir." },
      { label: "Katarak", tip: "Kanta mata menjadi keruh dan memerlukan pembedahan untuk memulihkan penglihatan." },
    ],
    pre_existing: [
      { label: "Diabetes sedia ada", tip: "Kencing manis yang sudah didiagnos sebelum sijil ini bermula." },
      { label: "Tekanan darah tinggi sedia ada", tip: "Darah tinggi yang sudah dikesan atau dirawat sebelum sijil bermula." },
      { label: "Penyakit jantung sedia ada", tip: "Masalah jantung yang sudah diketahui sebelum sijil bermula." },
      { label: "Asma kronik", tip: "Asma berpanjangan yang sudah dirawat sebelum sijil bermula." },
      { label: "Penyakit buah pinggang", tip: "Masalah buah pinggang yang sudah didiagnos sebelum sijil bermula." },
      { label: "Lain-lain kondisi yang sudah didiagnos", tip: "Apa-apa keadaan kesihatan yang sudah wujud dan diketahui sebelum sijil bermula." },
    ],
  },
  en: {
    immediate: [
      { label: "Road accidents", tip: "Accidents involving a car, motorcycle, bicycle, or as a pedestrian." },
      { label: "Workplace injuries", tip: "Injuries that happen while carrying out your work." },
      { label: "Falls, knocks and burns", tip: "Including falling down stairs, slipping in the bathroom, or scalds and burns." },
      { label: "Fractures from an accident", tip: "A broken or cracked bone caused by impact or a fall, not by bone disease." },
      { label: "Sports accidents", tip: "Injuries while playing sport or exercising — sprains, dislocations, fractures." },
      { label: "Accidents at home", tip: "Household accidents such as cuts, falls or electric shock." },
    ],
    general: [
      { label: "Dengue fever", tip: "Fever from an Aedes mosquito bite, often needing platelet monitoring in hospital." },
      { label: "Tuberculosis", tip: "A bacterial lung infection, with a cough lasting more than three weeks." },
      { label: "Typhoid", tip: "An intestinal infection from contaminated food or water, with persistent fever." },
      { label: "Malaria", tip: "A parasitic infection from a mosquito bite, with recurring fever and chills." },
      { label: "Pneumonia", tip: "Infection of the lungs causing breathlessness and fever." },
      { label: "Acute gastroenteritis", tip: "Severe vomiting and diarrhoea, bad enough to need fluids through a drip." },
      { label: "Acute asthma", tip: "A sudden asthma attack needing immediate treatment." },
      { label: "Urinary tract infection (UTI)", tip: "Infection of the bladder or kidneys — burning or frequent urination." },
      { label: "Appendicitis", tip: "Inflammation of the appendix, usually needing urgent surgery." },
      { label: "Viral or bacterial infections", tip: "General infections such as influenza, HFMD, chikungunya or Zika." },
      { label: "Minor injuries (not accidental)", tip: "Small injuries that happen without an accident, such as a strained muscle." },
      { label: "New diabetes complications", tip: "Diabetes-related problems first diagnosed after your cover started." },
    ],
    specified: [
      { label: "Hypertension, diabetes and heart disease", tip: "High blood pressure, diabetes and heart disease first diagnosed after cover started." },
      { label: "Tumours, cancer, cysts, polyps and lumps", tip: "Any growth, cancerous or not, anywhere in the body." },
      { label: "Kidney and gallbladder stones", tip: "Stones in the kidney, bladder or gallbladder." },
      { label: "Ear, nose and throat (ENT) conditions including sinusitis", tip: "Including chronic sinusitis, eardrum problems and nasal surgery." },
      { label: "Hernia, haemorrhoids and fistula", tip: "Hernia, piles, and abnormal passages near the anus." },
      { label: "Hydrocele and varicocele", tip: "Fluid build-up or swollen veins in the scrotum." },
      { label: "Endometriosis and reproductive conditions", tip: "Including fibroids, ovarian cysts and other conditions of the womb." },
      { label: "Spinal disease", tip: "Including slipped disc and pinched spinal nerves." },
      { label: "Knee conditions and internal derangement", tip: "Damage to the ligaments, meniscus or cartilage inside the knee joint." },
      { label: "Tonsillectomy and adenoidectomy", tip: "Surgery to remove the tonsils or adenoids." },
      { label: "Surgery for congenital conditions", tip: "Surgery for a condition present from birth." },
      { label: "Cataracts", tip: "Clouding of the lens of the eye, needing surgery to restore vision." },
    ],
    pre_existing: [
      { label: "Existing diabetes", tip: "Diabetes already diagnosed before this certificate started." },
      { label: "Existing high blood pressure", tip: "High blood pressure already found or treated before cover started." },
      { label: "Existing heart disease", tip: "A heart condition already known before cover started." },
      { label: "Chronic asthma", tip: "Long-standing asthma already treated before cover started." },
      { label: "Kidney disease", tip: "A kidney problem already diagnosed before cover started." },
      { label: "Other previously diagnosed conditions", tip: "Any health condition that already existed and was known before cover started." },
    ],
  },
};

export const PORTAL_STATUSES = ["inforce", "grace", "lapsed", "pending", "terminated"] as const;
export type PortalStatus = (typeof PORTAL_STATUSES)[number];

/**
 * What the client sees at the top of the page.
 *
 * A lapsed certificate still opens -- the client is the person who most needs
 * to know it lapsed -- it just says so. The agent can override the label from
 * the Servicing page, because a certificate can sit in a state the case record
 * has no word for (a grace period, a reinstatement in progress) and the person
 * servicing it knows which before the system does.
 */
export function statusFromCase(caseStatus: string): PortalStatus {
  if (caseStatus === "inforce") return "inforce";
  if (caseStatus === "submitted") return "pending";
  return "terminated";
}

export const PORTAL_STATUS_COPY: Record<PortalStatus, { bm: string; en: string; tone: "green" | "gold" | "red" | "grey" }> = {
  inforce: { bm: "AKTIF", en: "INFORCE", tone: "green" },
  grace: { bm: "TEMPOH TANGGUH", en: "GRACE PERIOD", tone: "gold" },
  lapsed: { bm: "LUPUT", en: "LAPSED", tone: "red" },
  pending: { bm: "BELUM AKTIF", en: "NOT YET INFORCE", tone: "gold" },
  terminated: { bm: "DITAMATKAN", en: "TERMINATED", tone: "grey" },
};

/** Waiting-period headings, in the client's language rather than the agent's. */
export const PORTAL_PERIODS: Record<PortalLang, Record<WaitingPeriodKey, { label: string; summary: string }>> = {
  bm: {
    immediate: { label: "Serta-merta", summary: "Kemalangan dilindungi sebaik sahaja sijil anda aktif." },
    general: { label: "30 Hari", summary: "Penyakit am, selepas 30 hari dari tarikh mula perlindungan." },
    specified: { label: "120 Hari", summary: "Dua belas kategori penyakit tertentu." },
    pre_existing: { label: "2 Tahun", summary: "Penyakit sedia ada, dan hanya jika diisytiharkan semasa permohonan." },
  },
  en: {
    immediate: { label: "Immediate", summary: "Accidents are covered the moment your certificate is inforce." },
    general: { label: "30 Days", summary: "General illness, once 30 days have passed since your cover started." },
    specified: { label: "120 Days", summary: "The twelve specified illness categories." },
    pre_existing: { label: "2 Years", summary: "Pre-existing conditions, and only where they were declared at application." },
  },
};

export const PORTAL_COVER_NOTES: Record<PortalLang, string[]> = {
  bm: [
    "Bayaran bersama pesakit luar 5% di klinik panel Great Clinic, had maksimum RM500 setahun.",
    "Co-takaful 20% dikenakan di hospital bukan panel.",
    "Deductible dan co-takaful dikecualikan untuk kecemasan yang disahkan.",
    "Deductible dikecualikan di hospital kerajaan.",
    "Tuntutan mesti dihantar dalam tempoh 180 hari dari tarikh discaj.",
  ],
  en: [
    "Outpatient co-payment of 5% at Great Clinic panel locations, capped at RM500 a year.",
    "20% co-takaful applies at non-panel hospitals.",
    "Deductible and co-takaful are both waived for confirmed emergencies.",
    "Deductible is waived at government hospitals.",
    "Claims must be submitted within 180 days of the discharge date.",
  ],
};

// The product mapping in the portal. Matched on the Settings > Benefits name,
// lowercased, so adding a product to either list is one line here and nothing
// else. Medical decides the Waiting tab and the medical guides; the category
// decides the badge shown on a certificate's card when a client has more than
// one -- both are read off the SAME base benefit, so they can never disagree
// about what a certificate is.
export const MEDICAL_BENEFITS = ["i-medi evolusi", "i-medi signature"];
export const HIBAH_BENEFITS = ["i-great nova", "i-great chinta", "i-great mega plus"];

export function hasMedicalBenefit(benefitNames: string[]): boolean {
  return benefitNames.some((name) => MEDICAL_BENEFITS.includes(name.trim().toLowerCase()));
}

export type PlanCategory = "medical" | "hibah" | "other";

/** The category card badge follows the BASE benefit -- the one that names the
 *  plan -- not any rider that happens to be attached alongside it. */
export function planCategoryFor(baseBenefitName: string | null): PlanCategory {
  const name = (baseBenefitName ?? "").trim().toLowerCase();
  if (MEDICAL_BENEFITS.includes(name)) return "medical";
  if (HIBAH_BENEFITS.includes(name)) return "hibah";
  return "other";
}

export const PLAN_CATEGORY_LABEL: Record<PlanCategory, { bm: string; en: string }> = {
  medical: { bm: "Kad Perubatan", en: "Medical Card" },
  hibah: { bm: "Hibah & Life Takaful", en: "Hibah & Life Takaful" },
  other: { bm: "Pelan Takaful", en: "Takaful Plan" },
};

export const PORTAL_GUIDES = {
  journey: {
    url: "https://takaful4us.com/panduan-the-great-journey-medical-card-great-eastern/",
    bm: { title: "Panduan The Great Journey", note: "Cara guna kad perubatan anda dari A ke Z." },
    en: { title: "The Great Journey Guide", note: "How to use your medical card, start to finish." },
  },
  panel: {
    url: "https://takaful4us.com/getb-panel-locator/",
    bm: { title: "Cari Klinik & Hospital Panel", note: "Senarai panel Great Eastern berhampiran anda." },
    en: { title: "Find a Panel Clinic or Hospital", note: "Great Eastern panel locations near you." },
  },
  portal: {
    url: "https://takaful4us.com/medical-card-client-portal/",
    bm: { title: "Portal Klien Kad Perubatan", note: "Semak kad dan maklumat rasmi anda." },
    en: { title: "Medical Card Client Portal", note: "Check your card and official details." },
  },
  hibah: {
    url: "https://takaful4us.com/panduan-pelantikan-penama-wasi-hibah/",
    bm: { title: "Panduan Pelantikan Penama, Wasi & Hibah", note: "Perbezaan penama, wasi dan hibah serta cara melantik." },
    en: { title: "Nominee, Executor & Hibah Guide", note: "What each role means, and how to appoint them." },
  },
} as const;

export type PortalGuideKey = keyof typeof PORTAL_GUIDES;

/**
 * The official insurer portal. Highlighted wherever it appears, because it is
 * the one link on the page that leaves the agency's system. The name is the
 * product's own -- "iGetInTouch Client Portal" -- and stays the same in both
 * languages, the way a product name does; only the eyebrow and note around it
 * are translated. The link opens straight on their login screen.
 */
export const OFFICIAL_PORTAL_URL = "https://igetintouch.greateasterntakaful.com/econnect-new/#/login";

/**
 * Great Eastern Takaful's own careline. On the portal beside the agent, not
 * instead of them: out of hours, or when the agent is unreachable, a client
 * holding a certificate needs a number that always answers.
 */
export const CARELINE_NUMBER = "1300-13-8338";
export const CARELINE_TEL = "tel:1300138338";
export const CARELINE_HOURS = { bm: "Isnin–Jumaat, 8:30 pagi–5:15 petang", en: "Mon–Fri, 8:30am–5:15pm" };
export const OFFICIAL_PORTAL_NAME = "iGetInTouch Client Portal";

/**
 * Which guides a client sees follows the benefits on their certificate.
 * `isMedical` is passed in rather than re-derived, so the guide list can never
 * disagree with the Waiting tab about whether this is a medical certificate.
 */
export function guideKeysFor(benefitNames: string[], isMedical = hasMedicalBenefit(benefitNames)): PortalGuideKey[] {
  const keys: PortalGuideKey[] = [];
  if (isMedical) keys.push("journey", "panel", "portal");
  // Every certificate has nominees, so the nominee guide goes to everyone.
  keys.push("hibah");
  return keys;
}
