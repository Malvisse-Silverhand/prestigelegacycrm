import type { FlowSlide } from "../types";
import { translator, type Lang } from "../i18n";
import type { EngineResult, LegendItem } from "./types";
import { fromSen, num, rmWhole, toSen } from "./money";
import { buildFlowSlides } from "./scenario-flow";

export type BusinessEntity = "sdn" | "plt" | "partner" | "sole";
export type KeymanMethod = "profit" | "salary" | "replace";
export type Succession = "none" | "second" | "ready";
export type BuySellStructure = "cross" | "entity" | "own";

export type KeyPerson = {
  name: string;
  role: string;
  salary: number;
  /** Share of profit this person drives, percent. */
  impact: number;
  /** Months the business is unstable without them (death / TPD). */
  stable: number | string;
  /** Months of lost profit for a critical illness. */
  ci: number | string;
  /** Cost to recruit and train a replacement. */
  cost: number;
  succ: Succession;
  exD: number;
  exC: number;
};

export type Partner = { name: string; pct: number; age: number; ex: number };

export type BusinessInputs = {
  company: string;
  entity: BusinessEntity;
  revenue: number;
  profit: number;
  /** Monthly fixed costs. */
  fixed: number;
  reserve: number;
  kMethod: KeymanMethod;
  kMult: number;
  kCount: number;
  kps: KeyPerson[];
  valMethod: "multiple" | "manual";
  valMult: number;
  valManual: number;
  pCount: number;
  partners: Partner[];
  structure: BuySellStructure;
  agreement: "none" | "draft" | "written";
  lTerm: number;
  lOd: number;
  lHp: number;
  lTrade: number;
  lOther: number;
  lInst: number;
  guarantor: string;
  guarPct: number;
  lCover: number;
  eBank: number;
  eStock: number;
  eDebt: number;
  eInst: number;
  ePlan: "continue" | "sell" | "close";
  eMonths: number | string;
  eOpex: number;
  eWages: number;
  eFamily: number;
  eHibah: number;
  eWill: string;
};

export type KeymanRow = {
  name: string;
  profit: number;
  salary: number;
  replace: number;
  death: number;
  ci: number;
};

export type PartnerRow = {
  name: string;
  pct: number;
  share: number;
  need: number;
};

export type MatrixRow = { owner: string; life: string; amount: number };

export type BusinessOut = {
  isCompany: boolean;
  keymen: KeymanRow[];
  kmDeath: number;
  kmCI: number;
  kmTotal: number;
  kmCITotal: number;
  businessValue: number;
  partners: PartnerRow[];
  pctTotal: number;
  bsTotal: number;
  matrix: MatrixRow[];
  debt: number;
  guarPct: number;
  guar: number;
  loanGap: number;
  reserveMonths: number;
  eNeed: number;
  eGap: number;
  frozen: number;
  /** Per-slide totals. Enterprise is 0 for company entities. */
  rows: { key: "keyman" | "buysell" | "loan" | "enterprise"; label: string; amount: number }[];
  total: number;
  /** Estate slide shown only for non-company entities. */
  showEstate: boolean;
  text: {
    kmTotal: string;
    kmCITotal: string;
    businessValue: string;
    bsTotal: string;
    debt: string;
    guar: string;
    loanGap: string;
    eNeed: string;
    eGap: string;
    frozen: string;
    total: string;
  };
};

export type BusinessScene = {
  columns: { label: string; amount: number; text: string }[];
  label: string;
};

export type BusinessResult = EngineResult<BusinessOut, BusinessScene>;

const successionFactor = (x: Succession | string) => (x === "ready" ? 0.5 : x === "second" ? 0.75 : 1);

export function computeBusiness(raw: Partial<BusinessInputs>, lang: Lang = "en"): BusinessResult {
  const tr = translator(lang);
  const n = (v: unknown) => num(v);
  const company = String(raw.company ?? "") || tr("business.the.business");
  const entity = raw.entity ?? "sdn";
  const isCompany = entity === "sdn" || entity === "plt";
  const reserve = n(raw.reserve);

  // Keyman
  const base = n(raw.profit) + n(raw.fixed) * 12;
  const kMethod = raw.kMethod ?? "profit";
  let kmDeath = 0;
  let kmCI = 0;
  const keymen: KeymanRow[] = (raw.kps ?? []).slice(0, Math.max(0, Math.floor(n(raw.kCount)))).map((k) => {
    const f = successionFactor(k.succ);
    const imp = (base * n(k.impact)) / 100;
    const replace = n(k.cost) + (n(k.salary) * n(k.stable)) / 12;
    const profitM = ((imp * n(k.stable)) / 12) * f + n(k.cost);
    const salaryM = n(k.salary) * n(raw.kMult);
    const chosen = kMethod === "salary" ? salaryM : kMethod === "replace" ? replace : profitM;
    const death = Math.max(0, chosen - n(k.exD));
    // CI uses 0.5 x cost, not the full recruitment cost.
    const ci = Math.max(0, ((imp * n(k.ci)) / 12) * f + 0.5 * n(k.cost) - n(k.exC));
    kmDeath += death;
    kmCI += ci;
    return { name: String(k.name ?? ""), profit: profitM, salary: salaryM, replace, death, ci };
  });
  const kmTotal = Math.max(0, kmDeath - reserve);
  const kmCITotal = Math.max(0, kmCI - reserve);

  // Buy-sell
  const businessValue = raw.valMethod === "manual" ? n(raw.valManual) : n(raw.profit) * n(raw.valMult);
  const ps = (raw.partners ?? []).slice(0, Math.max(0, Math.floor(n(raw.pCount))));
  const pctTotal = ps.reduce((a, p) => a + n(p.pct), 0);
  let bsTotalSen = 0;
  const partners: PartnerRow[] = ps.map((p) => {
    const share = (businessValue * n(p.pct)) / 100;
    const need = Math.max(0, share - n(p.ex));
    bsTotalSen += toSen(need);
    return { name: String(p.name ?? ""), pct: n(p.pct), share, need };
  });
  const bsTotal = fromSen(bsTotalSen);
  const structure = raw.structure ?? "cross";
  const matrix: MatrixRow[] = [];
  if (structure === "cross") {
    ps.forEach((life, i) => {
      const val = Math.max(0, (businessValue * n(life.pct)) / 100 - n(life.ex));
      const rest = 100 - n(life.pct);
      ps.forEach((own, j) => {
        if (i !== j && rest > 0) matrix.push({ owner: String(own.name ?? ""), life: String(life.name ?? ""), amount: (val * n(own.pct)) / rest });
      });
    });
  } else {
    ps.forEach((life) =>
      matrix.push({
        owner: structure === "entity" ? company : tr("business.matrix.ownLife", { name: String(life.name ?? "") }),
        life: String(life.name ?? ""),
        amount: Math.max(0, (businessValue * n(life.pct)) / 100 - n(life.ex)),
      }),
    );
  }

  const warnings: string[] = [];
  if (ps.length > 0 && Math.abs(pctTotal - 100) > 1e-9) {
    warnings.push(tr("business.warn.pct", { pct: pctTotal }));
  }

  // Loan
  const debt = fromSen(
    toSen(n(raw.lTerm)) + toSen(n(raw.lOd)) + toSen(n(raw.lHp)) + toSen(n(raw.lTrade)) + toSen(n(raw.lOther)),
  );
  const guarPct = isCompany ? n(raw.guarPct) : 100;
  const guar = (debt * guarPct) / 100;
  const loanGap = Math.max(0, guar - n(raw.lCover));
  const reserveMonths = n(raw.lInst) > 0 ? reserve / n(raw.lInst) : 0;

  // Enterprise
  const em = n(raw.eMonths);
  const eNeed = (n(raw.eInst) + n(raw.eOpex) + n(raw.eWages) + n(raw.eFamily)) * em;
  const eGap = Math.max(0, eNeed - n(raw.eHibah));
  const frozen = n(raw.eBank) + n(raw.eStock);

  const rows: BusinessOut["rows"] = [
    { key: "keyman", label: tr("business.row.keyman"), amount: kmTotal },
    { key: "buysell", label: tr("business.row.buysell"), amount: bsTotal },
    { key: "loan", label: tr("business.row.loan"), amount: loanGap },
  ];
  if (!isCompany) rows.push({ key: "enterprise", label: tr("business.row.enterprise"), amount: eGap });
  const total = fromSen(rows.reduce((a, r) => a + toSen(r.amount), 0));

  const columns = [
    { label: tr("business.col.keyman"), amount: kmTotal },
    { label: tr("business.col.buysell"), amount: bsTotal },
    { label: tr("business.col.loan"), amount: loanGap },
    { label: tr("business.col.enterprise"), amount: isCompany ? 0 : eGap },
  ].map((c) => ({ ...c, text: c.amount > 0 ? rmWhole(c.amount) : "—" }));

  const resLeft = Math.max(0, reserve - kmDeath);
  const resPct = reserve > 0 ? (resLeft / reserve) * 100 : 0;
  const guarantor = String(raw.guarantor ?? "") || tr("business.the.guarantor");
  const meterLabel = tr("business.flow.meterLabel");
  const slides: Parameters<typeof buildFlowSlides>[0] = [
    { tag: tr("business.flow.d1.tag"), title: tr("business.flow.d1.title"), value: rmWhole(total), desc: tr("business.flow.d1.desc", { company }), meterLabel, meterText: rmWhole(reserve), meter: 100, tone: "neutral" },
    { tag: tr("business.flow.keyman.tag"), title: tr("business.flow.keyman.title"), value: "− " + rmWhole(kmDeath), desc: tr("business.flow.keyman.desc", { amount: rmWhole(Math.min(reserve, kmDeath)) }), meterLabel, meterText: rmWhole(resLeft), meter: resPct, tone: "warn" },
    { tag: tr("business.flow.bank.tag"), title: tr("business.flow.bank.title"), value: rmWhole(loanGap), desc: tr("business.flow.bank.desc", { guarantor }), meterLabel, meterText: rmWhole(resLeft), meter: resPct, tone: "bad" },
    { tag: tr("business.flow.partners.tag"), title: tr("business.flow.partners.title"), value: rmWhole(bsTotal), desc: tr("business.flow.partners.desc"), meterLabel, meterText: rmWhole(resLeft), meter: resPct, tone: "bad" },
  ];
  if (!isCompany) {
    slides.push({ tag: tr("business.flow.estate.tag"), title: tr("business.flow.estate.title"), value: rmWhole(eGap), desc: tr("business.flow.estate.desc"), meterLabel, meterText: rmWhole(resLeft), meter: resPct, tone: "bad" });
  }
  slides.push({ tag: tr("business.flow.with.tag"), title: tr("business.flow.with.title"), value: rmWhole(total), desc: tr("business.flow.with.desc"), meterLabel, meterText: rmWhole(reserve), meter: 100, tone: "good" });
  const flow: FlowSlide[] = buildFlowSlides(slides);

  const legendLabels = [
    tr("business.legend.keyman"),
    tr("business.legend.buysell"),
    tr("business.legend.loan"),
    tr("business.legend.enterprise"),
  ];
  const legend: LegendItem[] = columns
    .map((c, i) => ({ ...c, legendLabel: legendLabels[i] }))
    .filter((c) => c.amount > 0)
    .map((c) => ({
      label: c.legendLabel,
      value: rmWhole(c.amount),
      tone: "neutral",
    }));

  return {
    out: {
      isCompany, keymen, kmDeath, kmCI, kmTotal, kmCITotal, businessValue, partners, pctTotal, bsTotal, matrix,
      debt, guarPct, guar, loanGap, reserveMonths, eNeed, eGap, frozen, rows, total, showEstate: !isCompany,
      text: {
        kmTotal: rmWhole(kmTotal), kmCITotal: rmWhole(kmCITotal), businessValue: rmWhole(businessValue),
        bsTotal: rmWhole(bsTotal), debt: rmWhole(debt), guar: rmWhole(guar), loanGap: rmWhole(loanGap),
        eNeed: rmWhole(eNeed), eGap: rmWhole(eGap), frozen: rmWhole(frozen), total: rmWhole(total),
      },
    },
    scene: {
      columns,
      label: isCompany
        ? tr("business.scene.label", { km: rmWhole(kmTotal), bs: rmWhole(bsTotal), loan: rmWhole(loanGap), total: rmWhole(total) })
        : tr("business.scene.labelEnt", { km: rmWhole(kmTotal), bs: rmWhole(bsTotal), loan: rmWhole(loanGap), ent: rmWhole(eGap), total: rmWhole(total) }),
    },
    legend,
    caption: tr("business.caption", { total: rmWhole(total) }),
    flow,
    warnings,
  };
}
