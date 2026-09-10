import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/lib/profile-types";

export type { Role, CurrentProfile } from "@/lib/profile-types";
export { ROLE_LABEL } from "@/lib/profile-types";

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

// auth.getUser() always revalidates against the Auth server -- unlike
// getSession(), it's a real network round trip every time, by design. A
// single request commonly calls getCurrentProfile() more than once (a
// Server Action, then the page it revalidates re-rendering in the same
// response), which without this would fire that same GET /auth/v1/user
// request back to back. React's cache() memoizes it per request instead.
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return getProfileById(user.id);
});

// `units` has two FK paths to/from `profiles` (profiles.unit_id -> units.id,
// and units.group_manager_id -> profiles.id), so the embed must name the
// constraint explicitly -- the bare `units(name)` shorthand is ambiguous.
const PROFILE_SELECT =
  "id, full_name, email, role, unit_id, avatar_initials, units!profiles_unit_id_fkey(name)";

// RLS-scoped: returns null both when the id doesn't exist and when the
// caller isn't allowed to see it -- callers can treat those the same way.
export async function getProfileById(id: string): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    unit_id: profile.unit_id,
    unit_name: (profile.units as unknown as { name: string } | null)?.name ?? null,
    avatar_initials: profile.avatar_initials || initialsFrom(profile.full_name),
  };
}
