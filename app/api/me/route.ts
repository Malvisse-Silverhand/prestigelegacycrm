import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

// The quotation tools under /tools are static pages in an iframe, so they
// can't read the signed-in profile the way a React component would. They ask
// here instead, to sign an exported PDF/JPEG with the agent's name. Uses the
// request's own session -- nothing is exposed that the caller isn't already
// signed in as.
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  return NextResponse.json(
    { fullName: profile.full_name },
    { headers: { "Cache-Control": "no-store" } },
  );
}
