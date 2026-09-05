import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteCheck =
  | { ok: true; inviteId: string; label: string | null; recruiterName: string }
  | { ok: false; reason: "not_found" | "disabled" | "expired" };

// Resolves a shared /join link. Runs through the service role deliberately:
// the caller has no session and no account, and an anon-readable policy on
// agent_invite_links would let anyone list every token, which is the one
// secret this whole flow rests on.
export async function checkInviteToken(token: string): Promise<InviteCheck> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("agent_invite_links")
    .select("id, label, is_active, expires_at, profiles!agent_invite_links_assigned_under_id_fkey(full_name)")
    .eq("token", token)
    .maybeSingle();

  if (!data) return { ok: false, reason: "not_found" };
  if (!data.is_active) return { ok: false, reason: "disabled" };
  if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const recruiter = data.profiles as unknown as { full_name: string } | null;
  return {
    ok: true,
    inviteId: data.id as string,
    label: (data.label as string | null) ?? null,
    recruiterName: recruiter?.full_name ?? "your recruiter",
  };
}
