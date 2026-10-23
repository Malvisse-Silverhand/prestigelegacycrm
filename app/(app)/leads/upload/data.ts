import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReassignableUsers } from "@/app/(app)/leads/[id]/data";
import type { CurrentProfile } from "@/lib/profile-types";

// Leads still in play -- the same stages the Rebalance counts as "open", so
// "current load" here means what it means there.
const OPEN_STAGES = ["new", "contacted", "follow_up", "quoted", "appointment"];

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  // Open leads they hold today -- shown so a manager can see who is stretched.
  load: number;
  isSelf: boolean;
};

// Who this person may hand an uploaded list to: exactly the people the Lead
// Detail reassign picker offers (scoped by role, active only), plus -- for a
// Group Manager -- their direct-report agents, who sit under them with no unit
// and so are missed by that picker. Always includes the uploader themself
// ("keep some for me"). An agent gets only themself.
export async function getAssignableTeam(
  profile: CurrentProfile,
  opts: { withLoad?: boolean } = {},
): Promise<TeamMember[]> {
  const people = new Map<string, { id: string; name: string; role: string }>();
  people.set(profile.id, { id: profile.id, name: profile.full_name, role: profile.role });

  if (profile.role !== "agent") {
    for (const u of await getReassignableUsers(profile)) {
      people.set(u.id, { id: u.id, name: u.full_name, role: u.role });
    }

    if (profile.role === "group_manager") {
      const supabase = await createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("parent_id", profile.id)
        .eq("is_active", true)
        .in("role", ["unit_manager", "aspirant_unit_manager", "agent"]);
      for (const u of data ?? []) {
        people.set(u.id as string, { id: u.id as string, name: u.full_name as string, role: u.role as string });
      }
    }
  }

  const list = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));

  const loads = new Map<string, number>();
  if (opts.withLoad && list.length > 0 && list.length <= 120) {
    const admin = createAdminClient();
    // One cheap head-count per person, ten at a time.
    for (let i = 0; i < list.length; i += 10) {
      await Promise.all(
        list.slice(i, i + 10).map(async (m) => {
          const { count } = await admin
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("agent_id", m.id)
            .is("deleted_at", null)
            .in("pipeline_stage", OPEN_STAGES);
          loads.set(m.id, count ?? 0);
        }),
      );
    }
  }

  return list.map((m) => ({ ...m, load: loads.get(m.id) ?? 0, isSelf: m.id === profile.id }));
}

export type BatchSummary = {
  id: string;
  status: "staged" | "assigning" | "done" | "cancelled";
  filename: string | null;
  mode: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  insertedRows: number;
  emailsSent: number;
  emailsSkipped: number;
  createdAt: string;
};

// The signed-in person's recent uploads: anything unfinished (so it can be
// resumed or cancelled) and the last few completed ones.
export async function getMyBatches(profile: CurrentProfile): Promise<BatchSummary[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lead_import_batches")
    .select(
      "id, status, filename, mode, total_rows, valid_rows, duplicate_rows, invalid_rows, inserted_rows, emails_sent, emails_skipped, created_at",
    )
    .eq("created_by", profile.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(8);
  // Tables missing until the migration has run -- the page still works.
  if (error) return [];
  return (data ?? []).map((b) => ({
    id: b.id as string,
    status: b.status as BatchSummary["status"],
    filename: (b.filename as string | null) ?? null,
    mode: b.mode as string,
    totalRows: b.total_rows as number,
    validRows: b.valid_rows as number,
    duplicateRows: b.duplicate_rows as number,
    invalidRows: b.invalid_rows as number,
    insertedRows: b.inserted_rows as number,
    emailsSent: b.emails_sent as number,
    emailsSkipped: b.emails_skipped as number,
    createdAt: b.created_at as string,
  }));
}
