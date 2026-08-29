import Link from "next/link";
import { getQuotations, primaryContribution } from "./data";
import { EmptyState } from "@/components/empty-state";
import { QuotationIcon } from "@/components/icons";

const PRODUCT_LABEL: Record<string, string> = {
  imedi_evolusi: "i-Medi Evolusi",
  hibah_nova: "Hibah i-Great Nova",
  hibah_chinta: "Hibah i-Great Chinta",
  hibah_mixed: "Hibah (mixed)",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-sand-3 text-taupe-2",
  sent: "bg-info-blue-bg text-info-blue-text",
  accepted: "bg-success-bg text-green",
};

function fmtRM(n: number | null) {
  if (n === null) return "—";
  return `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function QuotationsPage() {
  const quotations = await getQuotations();

  return (
    <div>
      <div className="border-b border-sand bg-white px-5 lg:px-[30px] py-5">
        <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy">Quotation</div>
        <div className="mt-[3px] text-[13px] font-medium text-muted">
          {quotations.length} quotation{quotations.length === 1 ? "" : "s"} · generated from a lead's own
          quotation launcher — there's no standalone builder here
        </div>
      </div>

      <div className="px-5 lg:px-[30px] py-[22px]">
        {quotations.length === 0 ? (
          <EmptyState
            icon={<QuotationIcon width={28} height={28} className="text-green" />}
            title="No quotations yet"
            description={'Open a lead and use "Buat Quotation Medical Card" or "Buat Quotation Hibah" to generate the first one.'}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-card">
           <div className="overflow-x-auto">
            <div className="min-w-[640px]">
            <div className="grid grid-cols-[1.6fr_1.4fr_1fr_.9fr_1.2fr] bg-navy px-5 py-[13px] text-[10.5px] font-bold tracking-[0.07em] text-white/72 uppercase">
              <div>Client</div>
              <div>Product</div>
              <div>Contribution</div>
              <div>Status</div>
              <div>Agent</div>
            </div>
            {quotations.map((q) => (
              <Link
                key={q.id}
                href={`/leads/${q.lead_id}`}
                className="grid grid-cols-[1.6fr_1.4fr_1fr_.9fr_1.2fr] items-center border-b border-sand-3 px-5 py-3.5 text-[12.5px] text-ink last:border-b-0 hover:bg-cream"
              >
                <div className="truncate font-bold text-navy">{q.leads?.full_name ?? "—"}</div>
                <div className="font-medium">{PRODUCT_LABEL[q.product] ?? q.product}</div>
                <div className="font-semibold text-navy">
                  {fmtRM(primaryContribution(q))}
                  {primaryContribution(q) !== null && <span className="text-taupe">/mo</span>}
                </div>
                <div>
                  <span className={`inline-block rounded-[7px] px-[9px] py-1 text-[10.5px] font-bold capitalize ${STATUS_STYLE[q.status] ?? "bg-sand-3 text-taupe-2"}`}>
                    {q.status}
                  </span>
                </div>
                <div className="truncate font-semibold text-green">{q.profiles?.full_name ?? "—"}</div>
              </Link>
            ))}
            </div>
           </div>
          </div>
        )}
      </div>
    </div>
  );
}
