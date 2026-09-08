import { getCurrentProfile } from "@/lib/supabase/profile";
import { getLandingPages, getPageOwnerOptions } from "../data";
import { QuickQuoteView } from "./quickquote-view";

// The two calculators on their own, without a marketing page around them: a
// link an agent drops straight into a WhatsApp chat when the context is
// already there and all the prospect needs is their number.
//
// It is the same landing_pages row underneath (same ownership, capture,
// counters and RLS) with layout = "quickquote", so nothing here re-implements
// the funnel.
export default async function QuickQuotePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [pages, owners] = await Promise.all([getLandingPages(), getPageOwnerOptions(profile)]);

  return (
    <QuickQuoteView
      forms={pages.filter((p) => p.layout === "quickquote")}
      owners={owners}
      currentUserId={profile.id}
      canChooseOwner={profile.role !== "agent"}
    />
  );
}
