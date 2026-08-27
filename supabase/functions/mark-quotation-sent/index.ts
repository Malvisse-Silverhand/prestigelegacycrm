// mark-quotation-sent
//
// Fan-out target fired when an agent clicks the WhatsApp deep-link button in
// either calculator (public/tools/), alongside -- not instead of -- that
// link's normal wa.me navigation. Matches Section 6, Screen Inventory row
// #11: "CRM only needs to mark quotations.status = 'sent' when the agent
// clicks that link."
//
// Same unauthenticated posture as capture-quotation: no Supabase session
// exists in the calculator tab to attach a JWT from, and the existing Pabbly/
// social webhook calls in both files are equally unauthenticated. The only
// thing this endpoint can do is flip one quotation from 'draft' to 'sent' --
// never 'accepted' back down to 'sent', and never anything on any row it
// isn't given the id for.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  let body: { quotation_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { quotation_id } = body;
  if (!quotation_id || typeof quotation_id !== "string") {
    return jsonResponse({ error: "quotation_id is required" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Only a draft can become sent -- an already-accepted quotation must never
  // be regressed by a stray re-click of the WA button.
  const { data, error } = await supabase
    .from("quotations")
    .update({ status: "sent" })
    .eq("id", quotation_id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("mark-quotation-sent: update failed", error);
    return jsonResponse({ error: "Could not update quotation" }, 500);
  }

  // No row matched: either the id doesn't exist, or it wasn't in 'draft'
  // (already sent/accepted). Either way, not a failure worth alarming the
  // caller over -- report what happened, still 200.
  return jsonResponse({ ok: true, updated: Boolean(data) }, 200);
});
