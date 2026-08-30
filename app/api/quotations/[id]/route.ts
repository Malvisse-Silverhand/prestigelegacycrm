import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Read a saved quotation so the customizer (a static tool under /tools, same
// origin) can reopen it for preview/edit. Uses the request's own session, so
// the `quotations select` RLS policy -- which scopes via the parent lead --
// decides what is readable; there is no service-role key anywhere near this.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await supabase
    .from("quotations")
    .select("id, lead_id, product, language, status, raw_payload, created_at")
    .eq("id", id)
    .maybeSingle();

  // RLS filtering a row out is indistinguishable from it not existing, which
  // is what we want to expose either way.
  if (error || !data) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
