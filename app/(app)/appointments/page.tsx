import { getCurrentProfile } from "@/lib/supabase/profile";
import { getAppointments, getLeadOptions, getLeadBaseCount } from "./data";
import { AppointmentView } from "./appointment-view";

export default async function AppointmentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [appointments, leads, leadBase] = await Promise.all([
    getAppointments(),
    getLeadOptions(),
    getLeadBaseCount(),
  ]);

  return <AppointmentView appointments={appointments} leads={leads} leadBase={leadBase} />;
}
