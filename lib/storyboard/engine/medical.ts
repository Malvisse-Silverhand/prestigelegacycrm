import type { FlowSlide } from "../types";
import type { EngineResult, LegendItem } from "./types";
import { fromSen, num, rmWhole, safeDiv, toSen } from "./money";
import { buildFlowSlides } from "./scenario-flow";

/** A hospital bill scenario. Amount and source are agent-editable placeholders. */
export type MedicalBill = { label: string; amount: number; source: string };

export type MedicalRiskItem = { label: string; hint: string; weight: number };
export type MedicalRiskGroup = { key: string; title: string; items: MedicalRiskItem[] };

export type MedicalInputs = {
  nick: string;
  work: "employed" | "self" | "none";
  company: number;
  savings: number;
  scenario: number; // index into bills
  monthlySave: number;
  cardCost: number;
  /** Medical inflation, percent a year. Placeholder, see inflationSource. */
  inflation: number;
  inflationSource: string;
  bills: MedicalBill[];
  /** Ticked checklist items, keyed "w0", "l2", ... */
  checked: Record<string, boolean>;
};

export type MedicalRiskLevel = "LOW" | "MODERATE" | "HIGH";

/** Weighted four-group checklist, weights from the design. */
export const MEDICAL_RISK_GROUPS: MedicalRiskGroup[] = [
  {
    key: "w",
    title: "1. Type of work",
    items: [
      { label: "Field work / sales / delivery", hint: "Always on the road meeting customers", weight: 3 },
      { label: "Factory, construction, machinery", hint: "Heavy lifting, heights, power tools", weight: 3 },
      { label: "Self-employed, gig, freelance", hint: "E-hailing, rider, contract, no company panel", weight: 3 },
      { label: "Office, long hours at a screen", hint: "Little movement, target pressure", weight: 1 },
      { label: "Shift / night work", hint: "Often short of sleep", weight: 2 },
    ],
  },
  {
    key: "l",
    title: "2. Lifestyle",
    items: [
      { label: "Ride a motorcycle every day", hint: "Commute or work", weight: 4 },
      { label: "Smoke or vape", hint: "Including occasional", weight: 3 },
      { label: "Rarely exercise", hint: "Less than once a week", weight: 2 },
      { label: "Often eat out / fast food", hint: "Most meals outside", weight: 1 },
      { label: "Sleep less than 6 hours", hint: "Most nights", weight: 1 },
    ],
  },
  {
    key: "t",
    title: "3. Travel",
    items: [
      { label: "Long-distance / highway driving almost daily", hint: "", weight: 2 },
      { label: "Frequent outstation or overseas trips", hint: "", weight: 2 },
      { label: "Often travel far with children / family", hint: "", weight: 1 },
    ],
  },
  {
    key: "h",
    title: "4. Health & dependants",
    items: [
      { label: "Aged 40 and above", hint: "", weight: 2 },
      { label: "Family history of heart disease, cancer, stroke, diabetes", hint: "", weight: 2 },
      { label: "Children / parents depend on me", hint: "", weight: 1 },
      { label: "No own medical card (company panel only, or none)", hint: "", weight: 1 },
      { label: "Emergency savings under 6 months", hint: "", weight: 1 },
    ],
  },
];

/** Highest possible score, used for the risk bar (35 in the design). */
export const MEDICAL_RISK_MAX = MEDICAL_RISK_GROUPS.reduce(
  (a, g) => a + g.items.reduce((b, i) => b + i.weight, 0),
  0,
);

export type MedicalOut = {
  score: number;
  level: MedicalRiskLevel;
  riskPct: number;
  topFactors: string[];
  billLabel: string;
  bill: number;
  companyUsed: number;
  savingsUsed: number;
  gap: number;
  futureBill: number;
  yearsToSave: number | null;
  cardYear: number;
  inflation: number;
  inflationSource: string;
  billSource: string;
  text: {
    bill: string;
    gap: string;
    company: string;
    savings: string;
    future: string;
    monthlySave: string;
    years: string;
    card: string;
    cardYear: string;
    explain: string;
  };
};

export type MedicalScene = {
  cH: number;
  sH: number;
  gH: number;
  cY: number;
  sY: number;
  gY: number;
  label: string;
};

export type MedicalResult = EngineResult<MedicalOut, MedicalScene>;

export function computeMedical(raw: Partial<MedicalInputs>): MedicalResult {
  const nick = String(raw.nick ?? "") || "the prospect";
  const checked = raw.checked ?? {};
  let score = 0;
  const ticked: { label: string; w: number }[] = [];
  for (const g of MEDICAL_RISK_GROUPS) {
    g.items.forEach((it, i) => {
      if (checked[g.key + i]) {
        score += it.weight;
        ticked.push({ label: it.label, w: it.weight });
      }
    });
  }
  const level: MedicalRiskLevel = score <= 7 ? "LOW" : score <= 15 ? "MODERATE" : "HIGH";
  const topFactors = [...ticked]
    .sort((a, b) => b.w - a.w)
    .slice(0, 3)
    .map((t) => t.label);

  const noCompany = raw.work !== undefined && raw.work !== "employed";
  const company = noCompany ? 0 : Math.max(0, num(raw.company));
  const savings = Math.max(0, num(raw.savings));
  const bills = raw.bills ?? [];
  const cur: MedicalBill = bills[Math.max(0, Math.floor(num(raw.scenario)))] ??
    bills[0] ?? { label: "No scenario selected", amount: 0, source: "" };
  const bill = Math.max(0, num(cur.amount));
  const cUsed = Math.min(company, bill);
  const sUsed = Math.min(savings, Math.max(0, bill - cUsed));
  const gap = fromSen(Math.max(0, toSen(bill) - toSen(cUsed) - toSen(sUsed)));
  const pc = (x: number) => (bill > 0 ? (x / bill) * 100 : 0);
  const inflation = num(raw.inflation);
  const future = bill * Math.pow(1 + inflation / 100, 5);
  const ms = Math.max(0, num(raw.monthlySave));
  const yearsToSave = ms > 0 ? Math.ceil(gap / (ms * 12)) : null;
  const cardCost = Math.max(0, num(raw.cardCost));
  const H = 170;
  const cH = Math.round((H * pc(cUsed)) / 100);
  const sH = Math.round((H * pc(sUsed)) / 100);
  const gH = Math.max(0, H - cH - sH);
  const base = 204;

  const caption = cur.label + " · " + rmWhole(gap) + " out of pocket";
  const flow: FlowSlide[] = buildFlowSlides([
    { tag: "ADMISSION", title: cur.label, value: rmWhole(bill), desc: "Private hospital estimate. Without an own card, a deposit is usually needed at the admission counter.", meterLabel: "Hospital savings left", meterText: rmWhole(savings), meter: 100, tone: "neutral" },
    { tag: "COMPANY PANEL", title: noCompany ? "No company panel to fall back on" : "Company cover pays first", value: "− " + rmWhole(cUsed), desc: noCompany ? "Self-employed or not working: nothing comes from an employer." : "Up to the remaining annual limit, and only while " + nick + " stays in this job.", meterLabel: "Hospital savings left", meterText: rmWhole(savings), meter: 100, tone: "neutral" },
    { tag: "SAVINGS", title: "Savings disrupted by " + rmWhole(sUsed), value: (savings > 0 ? Math.round((sUsed / savings) * 100) : 0) + "% gone", desc: rmWhole(sUsed) + " of " + rmWhole(savings) + " set aside for hospital is used up on this one stay.", meterLabel: "Hospital savings left", meterText: rmWhole(Math.max(0, savings - sUsed)), meter: savings > 0 ? ((savings - sUsed) / savings) * 100 : 0, tone: "warn" },
    { tag: "OUT OF POCKET", title: "Still unpaid after cover and savings", value: rmWhole(gap), desc: "Paid through EPF, selling assets, loans or family. The same bill in 5 years could be " + rmWhole(future) + " at the placeholder inflation rate.", meterLabel: "Bill covered", meterText: (bill > 0 ? Math.round(((bill - gap) / bill) * 100) : 100) + "%", meter: bill > 0 ? ((bill - gap) / bill) * 100 : 100, tone: "bad" },
    { tag: "WITH OWN CARD", title: "Own medical card, about " + rmWhole(cardCost) + " a month", value: rmWhole(cardCost * 12) + "/yr", desc: "Panel bills paid via GL up to plan limits, so savings stay intact. Subject to deductibles, limits and exclusions.", meterLabel: "Hospital savings left", meterText: rmWhole(savings), meter: 100, tone: "good" },
  ]);

  const legend: LegendItem[] = [
    { label: "Company cover", value: rmWhole(cUsed), tone: "neutral" },
    { label: "Own savings", value: rmWhole(sUsed), tone: "good" },
    { label: "Out of pocket", value: rmWhole(gap), tone: "bad" },
  ];

  return {
    out: {
      score,
      level,
      riskPct: Math.round(safeDiv(score, MEDICAL_RISK_MAX) * 100),
      topFactors,
      billLabel: cur.label,
      bill,
      companyUsed: cUsed,
      savingsUsed: sUsed,
      gap,
      futureBill: future,
      yearsToSave,
      cardYear: cardCost * 12,
      inflation,
      inflationSource: String(raw.inflationSource ?? ""),
      billSource: cur.source,
      text: {
        bill: rmWhole(bill),
        gap: rmWhole(gap),
        company: rmWhole(cUsed),
        savings: rmWhole(sUsed),
        future: rmWhole(future),
        monthlySave: rmWhole(ms),
        years: yearsToSave === null ? "—" : yearsToSave + " years",
        card: rmWhole(cardCost),
        cardYear: rmWhole(cardCost * 12),
        explain: cur.label + ": " + rmWhole(bill) + " − company cover " + rmWhole(cUsed) + " − savings " + rmWhole(sUsed) + ". Covered through EPF, selling assets, loans or family.",
      },
    },
    scene: {
      cH,
      sH,
      gH,
      cY: base - cH,
      sY: base - cH - sH,
      gY: base - cH - sH - gH,
      label: "Animated hospital bed with a bill of " + rmWhole(bill) + ", with a bar showing company cover, savings and a gap of " + rmWhole(gap),
    },
    legend,
    caption,
    flow,
    warnings: [],
  };
}
