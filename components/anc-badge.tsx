import type { LeadAnc } from "@/lib/lead-anc";
import { fmtAnc } from "@/lib/lead-anc";

// The potential annual contribution for one lead, as it appears on a card.
//
// Shared by Leads Manager and the Sales Pipeline so the two cannot drift: the
// same lead should not read RM 1,656 on one screen and something else on the
// other.
//
// A customizer quotation and a calculator estimate are not equally firm, so
// the badge always says which one the figure came from rather than presenting
// both as the same promise.
export function AncBadge({ potential, className = "" }: { potential: LeadAnc | null; className?: string }) {
  if (!potential) return null;

  const quoted = potential.source === "quotation";
  return (
    <span
      className={`flex items-center gap-1 rounded-[6px] px-[7px] py-[2px] text-[10.5px] font-bold ${
        quoted ? "bg-warn-gold-bg text-warn-gold-text" : "bg-info-blue-bg text-info-blue-text"
      } ${className}`}
      title={quoted ? "From a saved quotation" : "From a calculator estimate"}
    >
      {fmtAnc(potential.anc)}
      <span className="text-[8.5px] font-semibold opacity-75">ANC · {quoted ? "QUOTED" : "EST"}</span>
    </span>
  );
}
