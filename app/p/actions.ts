"use server";

import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWebhook } from "@/lib/dispatch-webhook";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// Submitted by a visitor with no account and no session -- the slug in the URL
// is the only thing identifying which agent's funnel this is, so it is
// re-resolved here rather than trusted from the page that rendered the form,
// and the lead is assigned from the page's own agent_id, never from anything
// the browser sent.
export async function captureLandingLead(input: {
  slug: string;
  name: string;
  phone: string;
  email: string;
  product: string;
  dob?: string | null;
  gender?: string | null;
  smoker?: boolean | null;
  estimate?: number | null;
}) {
  // A real visitor converts once. This bounds what a script pointed at a
  // published page can do -- generous enough that a household sharing an IP
  // never hits it.
  const allowed = await checkRateLimit("landing-lead-ip", await clientIp(), 10, 60 * 60);
  if (!allowed) return { error: "Terlalu banyak percubaan. Cuba lagi sebentar nanti." };

  const name = input.name?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  if (name.length < 2) return { error: "Nama tidak lengkap." };
  if (phone.replace(/\D/g, "").length < 9) return { error: "Nombor telefon tidak sah." };

  const admin = createAdminClient();

  const { data: page } = await admin
    .from("landing_pages")
    .select("id, agent_id, is_published, profiles!landing_pages_agent_id_fkey(unit_id)")
    .eq("slug", input.slug)
    .maybeSingle();
  if (!page || !page.is_published) return { error: "Halaman ini tidak lagi menerima permohonan." };

  const owner = page.profiles as unknown as { unit_id: string | null } | null;
  const interest = input.product === "Hibah" ? "Hibah" : "Medical Card";

  // Same phone on the same page twice is the visitor re-submitting, not a new
  // person: update what we know rather than creating a duplicate the agent
  // then has to merge by hand.
  const digits = phone.replace(/\D/g, "");
  const { data: existing } = await admin
    .from("leads")
    .select("id")
    .eq("agent_id", page.agent_id)
    .eq("phone", phone)
    .maybeSingle();

  const row = {
    full_name: name,
    phone,
    email: email || null,
    date_of_birth: input.dob || null,
    gender: input.gender === "female" ? "female" : input.gender === "male" ? "male" : null,
    is_smoker: typeof input.smoker === "boolean" ? input.smoker : null,
    interest,
    lead_source: "Landing Page" as const,
    agent_id: page.agent_id,
    unit_id: owner?.unit_id ?? null,
    status: "warm" as const,
    pipeline_stage: "new" as const,
    budget_indicated: input.estimate != null ? String(Math.round(input.estimate)) : null,
  };

  const { data: lead, error } = existing
    ? await admin
        .from("leads")
        .update({ full_name: name, email: row.email, interest, budget_indicated: row.budget_indicated })
        .eq("id", existing.id)
        .select("id, full_name, phone, email, lead_source, interest, status, created_at")
        .maybeSingle()
    : await admin
        .from("leads")
        .insert(row)
        .select("id, full_name, phone, email, lead_source, interest, status, created_at")
        .maybeSingle();

  if (error || !lead) {
    Sentry.captureException(error ?? new Error("landing lead insert returned no row"), {
      tags: { action: "captureLandingLead" },
      extra: { slug: input.slug, digits: digits.length },
    });
    return { error: "Maaf, maklumat anda tidak dapat dihantar. Cuba sekali lagi." };
  }

  // Everything below is bookkeeping -- the visitor has already converted, so
  // none of it may fail their submission.
  if (!existing) {
    await admin.rpc("increment_landing_lead", { page_id: page.id });
    await admin.from("lead_activity").insert({
      lead_id: lead.id as string,
      actor_id: page.agent_id,
      activity_type: "created",
      content: `Lead masuk dari landing page /p/${input.slug}`,
    });
    await dispatchWebhook("lead_created", { ...lead, source: "landing_page", slug: input.slug });
  }

  return { error: null };
}
