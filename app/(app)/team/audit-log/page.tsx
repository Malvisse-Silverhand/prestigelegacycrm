import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { redirect } from "next/navigation";

type AuditRow = {
  id: string;
  action: string;
  created_at: string;
  actor: { full_name: string } | null;
  target: { full_name: string } | null;
};

export default async function AuditLogPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role === "agent") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select(
      "id, action, created_at, actor:profiles!audit_log_actor_id_fkey(full_name), target:profiles!audit_log_target_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<AuditRow[]>();

  const rows = data ?? [];

  return (
    <div>
      <div className="flex items-center gap-4 border-b border-sand bg-white px-5 lg:px-[30px] py-5">
        <div className="flex-1">
          <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy">Audit Log</div>
          <div className="mt-[3px] text-[13px] font-medium text-muted">
            Every monitor-mode dashboard view, most recent first
          </div>
        </div>
        <Link href="/team" className="rounded-[10px] border border-sand-2 bg-cream px-3.5 py-2.5 text-[12.5px] font-semibold text-navy">
          Back to My Team
        </Link>
      </div>

      <div className="px-5 lg:px-[30px] py-[22px]">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-sand bg-white p-8 text-center text-[13px] text-muted">
            No audit events yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-card">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 border-b border-sand-3 px-5 py-3.5 text-[13px] last:border-b-0">
                <span className="font-semibold text-navy">{row.actor?.full_name ?? "Unknown"}</span>
                <span className="text-muted">
                  {row.action === "view_dashboard" ? "viewed the dashboard of" : row.action}
                </span>
                <span className="font-semibold text-navy">{row.target?.full_name ?? "—"}</span>
                <span className="ml-auto text-[12px] font-medium text-taupe">
                  {new Date(row.created_at).toLocaleString("en-MY")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
