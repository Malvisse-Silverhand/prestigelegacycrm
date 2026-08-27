import type { AuditEntry } from "../types";
import { EmptyState } from "@/components/empty-state";
import { SettingsIcon } from "@/components/icons";

const ACTION_LABEL: Record<string, string> = {
  view_dashboard: "opened a monitor-mode dashboard for",
  reassign_lead: "reassigned a lead belonging to",
  user_invited: "created an account for",
};

function describe(entry: AuditEntry) {
  const verb = ACTION_LABEL[entry.action] ?? entry.action.replace(/_/g, " ");
  const actor = entry.actorName ?? "Someone";
  const target = entry.targetName;
  return target ? `${actor} ${verb} ${target}` : `${actor} — ${verb}`;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = diffMs / 3600000;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AuditLogTab({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<SettingsIcon width={28} height={28} className="text-green" />}
        title="No audit activity yet"
        description="Account creation, monitor-mode dashboard views, and lead reassignments will show up here as they happen."
      />
    );
  }

  return (
    <div className="max-w-[720px] rounded-[18px] border border-sand bg-white px-[22px] pb-[22px] pt-5">
      <div className="text-[15px] font-bold text-navy">Audit log</div>
      <div className="mt-0.5 text-[11.5px] font-medium text-taupe">Most recent 50 actions in scope.</div>

      <div className="mt-4 flex flex-col">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-4 border-t border-sand-3 py-3 first:border-t-0">
            <div className="text-[12.5px] font-medium text-navy">{describe(entry)}</div>
            <div className="flex-none text-[11px] text-taupe">{timeAgo(entry.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
