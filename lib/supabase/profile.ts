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

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // `units` has two FK paths to/from `profiles` (profiles.unit_id -> units.id,
  // and units.group_manager_id -> profiles.id), so the embed must name the
  // constraint explicitly — the bare `units(name)` shorthand is ambiguous.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, unit_id, avatar_initials, units!profiles_unit_id_fkey(name)",
    )
    .eq("id", user.id)
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
