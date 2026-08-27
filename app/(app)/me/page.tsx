import { getCurrentProfile, ROLE_LABEL } from "@/lib/supabase/profile";
import { SignOutButton } from "./sign-out-button";

export default async function MePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-5 py-8 lg:hidden">
      <div className="flex items-center gap-3 rounded-2xl border border-sand bg-white p-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[13px] bg-navy text-sm font-bold text-gold">
          {profile.avatar_initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold text-navy">{profile.full_name}</div>
          <div className="truncate text-[12.5px] font-medium text-muted">
            {ROLE_LABEL[profile.role]}
            {profile.unit_name ? ` · ${profile.unit_name}` : ""}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-sand bg-white p-4 text-[13px] text-ink">
        {profile.email}
      </div>
      <SignOutButton />
    </div>
  );
}
