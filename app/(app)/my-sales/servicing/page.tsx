import { getCurrentProfile } from "@/lib/supabase/profile";
import { malaysiaToday } from "@/lib/malaysia-date";
import { getServicingCases } from "../data";
import { ServicingView } from "./servicing-view";

export default async function ServicingPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const cases = await getServicingCases();

  // Settled here, not in the browser: every waiting-period date and every
  // row status depends on what day it is, and the server runs in UTC while
  // the people using this are in UTC+8.
  return <ServicingView cases={cases} today={malaysiaToday()} />;
}
