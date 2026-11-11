import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

// The quotation tools under /tools are static pages in an iframe, so they
// can't read the signed-in profile the way a React component would. They ask
// here instead, to sign an exported PDF/JPEG and the calculator footer with
// the agent's name and MTA number. Uses the request's own session -- nothing
// is exposed that the caller isn't already signed in as.
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Separate and tolerant: the column only exists once the
  // 20261028090000 migration has run, and the name must still come back before then.
  let mtaNumber: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("mta_number").eq("id", profile.id).maybeSingle();
    if (!error) mtaNumber = (data?.mta_number as string | null) ?? null;
  } catch {
    // Column not there yet -- leave it off.
  }

  return NextResponse.json(
    { fullName: profile.full_name, mtaNumber },
    { headers: { "Cache-Control": "no-store" } },
  );
}
