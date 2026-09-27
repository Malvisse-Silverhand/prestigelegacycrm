import { getCurrentProfile } from "@/lib/supabase/profile";
import { malaysiaToday } from "@/lib/malaysia-date";
import { getServicingCases } from "../data";
import { getWonClientBirthdays } from "./birthday-data";
import { ServicingView } from "./servicing-view";

export default async function ServicingPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [cases, birthdays] = await Promise.all([getServicingCases(), getWonClientBirthdays()]);

  // Settled here, not in the browser: every waiting-period date and every
  // row status depends on what day it is, and the people using this are in
  // UTC+8, not the server's UTC.
  return <ServicingView cases={cases} birthdays={birthdays} today={malaysiaToday()} />;
}
