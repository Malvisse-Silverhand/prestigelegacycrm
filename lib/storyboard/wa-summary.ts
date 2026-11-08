// Client-safe plain-text summary for "Copy to WhatsApp".
//
// Only computed, client-visible figures go in. No operator names, no
// guarantees, no agency figures, no IC numbers. The wording says "could" and
// points to the PDS and certificate terms.

import type { HibahOut } from "./engine/hibah";
import type { MedicalOut } from "./engine/medical";
import type { CiOut } from "./engine/ci";
import type { BusinessOut } from "./engine/business";
import { mentionsOtherOperator } from "./client-summary";

const DISCLAIMER =
  "These are estimates for discussion, not a quotation. Benefits and contributions are subject to the product disclosure sheet, the official illustration and the certificate terms.";

/** A figure's source for the client text: the agent's own words, or a clear "to be confirmed". */
function sourceText(source: string): string {
  const s = source.trim();
  if (s === "" || /^\[.*\]$/.test(s) || mentionsOtherOperator(s)) return "source to be confirmed";
  return "source: " + s;
}

function greeting(name: string): string {
  return `Salam ${name.trim() || "there"}, here is a short summary of what we looked at together.`;
}

function withAgent(lines: string[], agentFirstName?: string): string {
  if (agentFirstName) lines.push("", `- ${agentFirstName}`);
  return lines.join("\n");
}

export function buildHibahWaSummary(input: {
  nick: string;
  out: Pick<HibahOut, "text" | "gap" | "years" | "pct">;
  planName: string;
  agentFirstName?: string;
}): string {
  const { nick, out } = input;
  const name = nick.trim() || "there";
  const lines: string[] = [
    `Salam ${name}, here is a short summary of what we looked at together.`,
    "",
    `Estimated family need: ${out.text.need}`,
    `  - Family support (${out.years} years): ${out.text.support}`,
    `  - Debts not yet covered: ${out.text.debts}`,
    `  - One-off costs: ${out.text.oneoff}`,
    `Already in place: ${out.text.have}`,
    out.gap > 0 ? `Estimated gap: ${out.text.gap}` : "On these figures, what is in place meets the estimated need.",
  ];
  if (out.gap > 0) {
    lines.push(
      "",
      `A hibah of around ${out.text.gap} could fill the gap, subject to the PDS & certificate terms.`,
    );
  }
  lines.push(
    "",
    "These are estimates for discussion, not a quotation. Benefits and contributions are subject to the product disclosure sheet, the official illustration and the certificate terms.",
  );
  if (input.agentFirstName) lines.push("", `- ${input.agentFirstName}`);
  return lines.join("\n");
}

export function buildMedicalWaSummary(input: {
  nick: string;
  out: Pick<MedicalOut, "text" | "gap" | "bill" | "billLabel" | "billSource" | "level" | "inflation" | "inflationSource">;
  agentFirstName?: string;
}): string {
  const { out } = input;
  const lines: string[] = [
    greeting(input.nick),
    "",
    `Hospital bill scenario: ${out.billLabel}`,
    `Estimated bill: ${out.text.bill} (an estimate for discussion; ${sourceText(out.billSource)})`,
    `  - Company cover used: ${out.text.company}`,
    `  - Own savings used: ${out.text.savings}`,
    out.gap > 0 ? `Estimated out of pocket: ${out.text.gap}` : "On these figures, company cover and savings meet the estimated bill.",
    `The same bill in 5 years, at ${out.inflation}% a year (${sourceText(out.inflationSource)}): ${out.text.future}`,
    `Daily risk level from our checklist: ${out.level}`,
  ];
  if (out.gap > 0) {
    lines.push("", "An own medical card could help keep your savings intact, subject to the plan limits, deductibles, waiting periods and exclusions.");
  }
  lines.push("", DISCLAIMER);
  return withAgent(lines, input.agentFirstName);
}

/** The CI story is agent-only and is deliberately not an input here. */
export function buildCiWaSummary(input: {
  nick: string;
  out: Pick<CiOut, "text" | "gapEarly" | "months">;
  agentFirstName?: string;
}): string {
  const { out } = input;
  const lines: string[] = [
    greeting(input.nick),
    "",
    `Estimated cash needed over a ${out.months}-month recovery: ${out.text.total}`,
    `  - Monthly commitments to cover: ${out.text.monthly}`,
    `Available if diagnosed at an early stage: ${out.text.srcEarly}`,
    `Available if diagnosed at a late stage: ${out.text.srcLate}`,
    out.gapEarly > 0 ? `Estimated gap at an early stage: ${out.text.gapEarly}` : "On these figures, what is available meets the estimated need at an early stage.",
    `Estimated gap at a late stage: ${out.text.gapLate}`,
    `Cash would last about ${out.text.runEarly} to ${out.text.runLate} months of commitments.`,
  ];
  if (out.gapEarly > 0) {
    lines.push(
      "",
      `Critical illness cover of around ${out.text.suggest} could help with the early-stage gap, subject to the PDS and the certificate's definitions.`,
    );
  }
  lines.push("", DISCLAIMER);
  return withAgent(lines, input.agentFirstName);
}

export function buildBusinessWaSummary(input: {
  company: string;
  out: Pick<BusinessOut, "text" | "showEstate">;
  agentFirstName?: string;
}): string {
  const { out } = input;
  const company = input.company.trim() && !mentionsOtherOperator(input.company) ? input.company.trim() : "your business";
  const lines: string[] = [
    `Salam, here is a short summary for ${company} of what we looked at together.`,
    "",
    "Estimated amounts that could fall due if a key owner were gone:",
    `  - Keyman (lost profit and replacing a key person): ${out.text.kmTotal}`,
    `  - Buy-sell (cash for a partner's shares), based on the holdings entered: ${out.text.bsTotal}`,
    `  - Business debt not yet protected: ${out.text.loanGap}`,
  ];
  if (out.showEstate) lines.push(`  - Cash for the transition while accounts may be frozen: ${out.text.eGap}`);
  lines.push(
    `Total: ${out.text.total}`,
    "",
    "Each need could have its own funding, subject to the PDS and certificate terms. Tax and legal points should be confirmed with your accountant and lawyer.",
    "",
    DISCLAIMER,
  );
  return withAgent(lines, input.agentFirstName);
}
