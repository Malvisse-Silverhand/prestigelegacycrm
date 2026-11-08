// Client-safe plain-text summary for "Copy to WhatsApp".
//
// Only computed, client-visible figures go in. No operator names, no
// guarantees, no agency figures, no IC numbers. The wording says "could" and
// points to the PDS and certificate terms.

import type { HibahOut } from "./engine/hibah";

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
