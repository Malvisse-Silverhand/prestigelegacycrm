import { createClient } from "@/lib/supabase/server";
import { WON_STAGES } from "@/lib/pipeline-stages";
import type { BirthdayRow } from "@/lib/birthdays";

// Birthdays for the Servicing calendar: clients whose case has actually
// closed, not every lead in the pipeline. Copied from getBirthdayPeople
// (app/(app)/appointments/data.ts) but scoped to WON_STAGES, and with an
// explicit deleted_at filter -- a superadmin can otherwise see soft-deleted
// leads, and a former client's birthday has no place on this calendar.
export async function getWonClientBirthdays(): Promise<BirthdayRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, full_name, phone, date_of_birth, pipeline_stage")
    .in("pipeline_stage", WON_STAGES)
    .not("date_of_birth", "is", null)
    .is("deleted_at", null)
    .order("full_name")
    .limit(2000);

  return (data ?? []).map((l) => ({
    id: l.id as string,
    full_name: l.full_name as string,
    phone: (l.phone as string | null) ?? "",
    date_of_birth: (l.date_of_birth as string | null) ?? null,
    pipeline_stage: (l.pipeline_stage as string) ?? "",
  }));
}
