import type { Metadata } from "next";
import { loadPublicFormState } from "@/lib/lead-forms";
import { malaysiaToday } from "@/lib/malaysia-date";
import { FormAlreadyDone, FormClosed } from "./form-closed";
import { FormGate } from "./form-gate";
import { FormView } from "./form-view";

// A forwarded link should never render a preview card naming the lead, and
// none of this belongs in a search index.
export const metadata: Metadata = {
  title: "Secure Form — Prestige Legacy",
  robots: { index: false, follow: false },
};

// The token is a live credential and the Stage 2 cookie is checked fresh on
// every visit, so nothing here may be cached or statically rendered.
export const dynamic = "force-dynamic";

export default async function LeadFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = await loadPublicFormState(token);

  switch (state.state) {
    case "not_found":
    case "revoked":
    case "expired":
      return <FormClosed />;
    case "completed":
      return <FormAlreadyDone agentName={state.agentName} />;
    case "needs_verification":
      return <FormGate token={token} stage={state.stage} agentName={state.agentName} />;
    case "ready": {
      // Dates are settled on the server, where the timezone is known: the
      // server runs UTC and the people filling this in are in UTC+8.
      const expiresLabel = new Date(state.form.expiresAt).toLocaleDateString("en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return <FormView token={token} form={state.form} today={malaysiaToday()} expiresLabel={expiresLabel} />;
    }
  }
}
