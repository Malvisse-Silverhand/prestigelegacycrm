// capture-quotation
//
// Fan-out target for the two standalone calculator files in public/tools/
// (imedi-evolusi-quote.html, quickquote-hibah-life-takaful.html) and for the
// quotation customizer's own save button, per CRM_MASTER_BUILD_PROMPT.md
// Section 6a. Those tools remain the single source of truth for rate tables
// and plan math -- this function only ever writes a `quotations` row + N
// `quotation_plans` rows for a `lead_id` it's given, using the service role
// key (bypasses RLS safely: the only operation exposed is "write a quotation
// scoped to this lead").
//
// One live document per (lead, product, tool): a lead reopening the same
// calculator/customizer and saving again overwrites its own previous save
// instead of piling up near-duplicate rows -- each tool has no durable id of
// its own across a fresh page load (a calculator's capturedQuotationId is an
// in-memory JS var, reset every reopen; the customizer does carry a
// quotation_id when reopened via "Preview/Edit", but that's not required
// here since the lookup below finds the same row either way). An estimate
// (plain calculator) and a customized quotation for the same product are
// still kept apart, since __customizer marks which tool a save came from.
//
// Deployed with --no-verify-jwt: the calculators are bare static pages with
// no Supabase auth session to attach (they're opened in a new tab, no CRM
// JS runs there), so there's no JWT to verify in the first place. This
// matches the existing Pabbly/social webhook calls in both files, which are
// also unauthenticated -- not a new exposure relative to what's already
// there. The only thing this endpoint can do is write rows tied to a
// lead_id the caller supplies; there's no read path and no way to touch
// any other lead's data.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PlanInput = {
  sort_order?: number;
  plan_label?: string;
  monthly_contribution?: number | null;
  annual_contribution?: number | null;
  coverage_detail?: Record<string, unknown>;
};

type CaptureBody = {
  lead_id?: string;
  product?: string;
  language?: string;
  raw_payload?: Record<string, unknown>;
  plans?: PlanInput[];
};

const VALID_PRODUCTS = ["imedi_evolusi", "hibah_nova", "hibah_chinta", "hibah_mixed"];

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: CaptureBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { lead_id, product, language, raw_payload, plans } = body;

  if (!lead_id || typeof lead_id !== "string") {
    return jsonResponse({ error: "lead_id is required" }, 400);
  }
  if (!product || !VALID_PRODUCTS.includes(product)) {
    return jsonResponse({ error: "product must be one of " + VALID_PRODUCTS.join(", ") }, 400);
  }
  if (!Array.isArray(plans) || plans.length === 0) {
    return jsonResponse({ error: "plans must be a non-empty array" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, agent_id")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return jsonResponse({ error: "Unknown lead_id" }, 404);
  }

  // Same tool, same product, same lead -> the one live document for that
  // combination, found by content rather than an id the caller might not
  // have. raw_payload.__customizer is only ever set by the customizer, so it
  // doubles as which tool a row came from.
  const isCustomizer = raw_payload?.__customizer === true;
  const { data: candidates } = await supabase
    .from("quotations")
    .select("id, raw_payload")
    .eq("lead_id", lead_id)
    .eq("product", product)
    .order("created_at", { ascending: false })
    .limit(20);
  const existing = (candidates ?? []).find((c) => {
    const candidateIsCustomizer = (c.raw_payload as Record<string, unknown> | null)?.__customizer === true;
    return candidateIsCustomizer === isCustomizer;
  });

  const nowIso = new Date().toISOString();
  const planRows = (quotationId: string) =>
    plans.map((p, i) => ({
      quotation_id: quotationId,
      sort_order: p.sort_order ?? i,
      plan_label: p.plan_label ?? `Option ${i + 1}`,
      monthly_contribution: p.monthly_contribution ?? null,
      annual_contribution: p.annual_contribution ?? null,
      coverage_detail: p.coverage_detail ?? {},
    }));

  let quotationRowId: string;
  let isUpdate: boolean;

  if (existing) {
    const { error: updateError } = await supabase
      .from("quotations")
      .update({
        language: language === "EN" ? "EN" : "BM",
        raw_payload: raw_payload ?? {},
        updated_at: nowIso,
      })
      .eq("id", existing.id);
    if (updateError) {
      console.error("capture-quotation: quotation update failed", updateError);
      return jsonResponse({ error: "Could not update quotation" }, 500);
    }
    quotationRowId = existing.id;
    isUpdate = true;
  } else {
    const { data: quotation, error: quotationError } = await supabase
      .from("quotations")
      .insert({
        lead_id,
        agent_id: lead.agent_id,
        product,
        language: language === "EN" ? "EN" : "BM",
        raw_payload: raw_payload ?? {},
        updated_at: nowIso,
      })
      .select("id")
      .single();
    if (quotationError || !quotation) {
      console.error("capture-quotation: quotation insert failed", quotationError);
      return jsonResponse({ error: "Could not create quotation" }, 500);
    }
    quotationRowId = quotation.id;
    isUpdate = false;
  }

  // Plan options have no stable id across saves (columns get added/removed/
  // reordered), so the simplest correct replace is insert-then-delete: the
  // new rows land first, and only once that succeeds are the old ones (kept
  // apart by id, since both sets now share quotation_id) removed. If the
  // insert fails, the previous plans are left intact rather than the
  // quotation ending up with none.
  const rows = planRows(quotationRowId);
  const { data: insertedPlans, error: plansError } = await supabase.from("quotation_plans").insert(rows).select("id");

  if (plansError) {
    console.error("capture-quotation: quotation_plans insert failed", plansError);
    return jsonResponse({ error: "Could not create quotation plans" }, 500);
  }

  if (isUpdate) {
    const newIds = (insertedPlans ?? []).map((p) => p.id);
    const { error: deleteError } = await supabase
      .from("quotation_plans")
      .delete()
      .eq("quotation_id", quotationRowId)
      .not("id", "in", `(${newIds.join(",")})`);
    if (deleteError) {
      // The new plans are already in and correct; a leftover stale row just
      // means a follow-up save cleans it up too. Not worth failing the
      // request the agent is looking at right now over.
      console.error("capture-quotation: stale quotation_plans cleanup failed", deleteError);
    }
  }

  // Best-effort activity log entry so Lead Detail's timeline picks this up
  // without a manual save step. Not fatal if it fails -- the quotation
  // itself is already committed. lead_activity has no quotation_id column;
  // Lead Detail matches a timeline row back to its quotation by nearest
  // timestamp against quotations.updated_at, which this write also just set.
  await supabase.from("lead_activity").insert({
    lead_id,
    actor_id: lead.agent_id,
    activity_type: "quotation_created",
    content: `${product} quotation ${isUpdate ? "updated" : "created"} (${rows.length} plan${rows.length === 1 ? "" : "s"})`,
  });

  return jsonResponse({ ok: true, quotation_id: quotationRowId }, 200);
});
