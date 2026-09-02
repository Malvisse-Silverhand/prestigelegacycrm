"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

const STATUSES = ["draft", "sent", "accepted"] as const;
export type QuotationStatus = (typeof STATUSES)[number];

// Both actions take an array so the single-row buttons and the bulk bar run
// through exactly one code path -- no chance of the two drifting apart.

export async function updateQuotationStatus(ids: string[], status: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", updated: 0 };
  if (ids.length === 0) return { error: "Nothing selected.", updated: 0 };
  if (!(STATUSES as readonly string[]).includes(status)) {
    return { error: "Not a valid quotation status.", updated: 0 };
  }

  const supabase = await createClient();
  // RLS decides which of these ids are actually reachable; rows that aren't
  // simply don't come back, so `updated` is the honest count.
  const { data, error } = await supabase
    .from("quotations")
    .update({ status })
    .in("id", ids)
    .select("id");

  if (error) return { error: "Couldn't update those quotations. Please try again.", updated: 0 };

  revalidatePath("/quotations");
  revalidatePath("/pipeline");
  return { error: null, updated: data?.length ?? 0 };
}

export async function deleteQuotations(ids: string[]) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Not signed in.", deleted: 0 };
  if (profile.role === "agent") {
    return { error: "You don't have permission to delete quotations.", deleted: 0 };
  }
  if (ids.length === 0) return { error: "Nothing selected.", deleted: 0 };

  const supabase = await createClient();
  // quotation_plans has ON DELETE CASCADE against quotations, so the plan rows
  // go with it; nothing else references a quotation.
  const { data, error } = await supabase.from("quotations").delete().in("id", ids).select("id");

  if (error) return { error: "Couldn't delete those quotations. Please try again.", deleted: 0 };

  revalidatePath("/quotations");
  revalidatePath("/pipeline");
  return { error: null, deleted: data?.length ?? 0 };
}
