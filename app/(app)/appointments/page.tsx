import { getCurrentProfile } from "@/lib/supabase/profile";
import { getAppointments, getLeadOptions, getLeadBaseCount, getBirthdayPeople } from "./data";
import { malaysiaToday } from "@/lib/birthdays";
import { AppointmentView } from "./appointment-view";

export default async function AppointmentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [appointments, leads, leadBase, birthdayPeople] = await Promise.all([
    getAppointments(),
    getLeadOptions(),
    getLeadBaseCount(),
    getBirthdayPeople(),
  ]);

  return (
    <AppointmentView
      appointments={appointments}
      leads={leads}
      leadBase={leadBase}
      birthdayPeople={birthdayPeople}
      // Read on the server so every date on the page agrees, and so the
      // client component stays free of clock reads during render.
      todayKey={malaysiaToday()}
    />
  );
}
