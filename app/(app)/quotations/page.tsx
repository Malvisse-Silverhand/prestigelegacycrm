import { getQuotations, primaryContribution } from "./data";
import { createClient } from "@/lib/supabase/server";
import { QuotationLauncher, type LauncherLead } from "./quotation-launcher";
import { QuotationTable, type QuotationRowView } from "./quotation-table";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { EmptyState } from "@/components/empty-state";
import { QuotationIcon } from "@/components/icons";

export default async function QuotationsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const [quotations, { data: leads }] = await Promise.all([
    getQuotations(),
    // RLS already scopes this to the leads the viewer can work.
    supabase
      .from("leads")
      .select("id, full_name, phone, email, date_of_birth, gender, is_smoker")
      .order("full_name")
      .returns<LauncherLead[]>(),
  ]);

  return (
    <div>
      <div className="border-b border-sand bg-white px-5 lg:px-[30px] py-5">
        <div className="text-2xl font-extrabold tracking-[-0.025em] text-navy">Quotation</div>
        <div className="mt-[3px] text-[13px] font-medium text-muted">
          {quotations.length} quotation{quotations.length === 1 ? "" : "s"} · every quotation is saved against
          the lead it was built for
        </div>
        <div className="mt-3.5">
          <QuotationLauncher leads={leads ?? []} />
        </div>
      </div>

      <div className="px-5 lg:px-[30px] py-[22px]">
        {quotations.length === 0 ? (
          <EmptyState
            icon={<QuotationIcon width={28} height={28} className="text-green" />}
            title="No quotations yet"
            description="Use one of the buttons above to build an estimate or a customised quotation for a lead."
          />
        ) : (
          <QuotationTable
            canDelete={profile?.role !== "agent"}
            quotations={quotations.map((q): QuotationRowView => ({
              id: q.id,
              lead_id: q.lead_id,
              product: q.product,
              status: q.status,
              clientName: q.leads?.full_name ?? "—",
              agentName: q.profiles?.full_name ?? "—",
              contribution: primaryContribution(q),
            }))}
          />
        )}
      </div>
    </div>
  );
}
