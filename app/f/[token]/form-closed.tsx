import { CHECK_ICON, FormCardPage, FormIcon, LOCK_ICON } from "./form-header";

// The dead end for a link that is revoked, expired or was never real. One
// screen for all three on purpose: telling them apart would let a stranger
// probe which tokens once existed.
export function FormClosed() {
  return (
    <FormCardPage footnote="Prestige Legacy agency form.">
      <FormIcon tone="muted">{LOCK_ICON}</FormIcon>
      <h1 className="mt-4 text-[18px] font-bold leading-tight tracking-[-0.02em] text-navy">This link is no longer active</h1>
      <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-ink">
        This form link has expired or is no longer valid. Please contact your agent and ask them to send you a new link.
      </p>
    </FormCardPage>
  );
}

/** The link was already submitted. Reveals nothing about the lead. */
export function FormAlreadyDone({ agentName }: { agentName: string | null }) {
  return (
    <FormCardPage footnote="Prestige Legacy agency form.">
      <FormIcon tone="ok">{CHECK_ICON}</FormIcon>
      <h1 className="mt-4 text-[18px] font-bold leading-tight tracking-[-0.02em] text-navy">Already submitted</h1>
      <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-ink">
        This form has already been completed, so there is nothing more to do here.
        {agentName ? ` If you need to change anything, please contact your agent, ${agentName}.` : " If you need to change anything, please contact your agent."}
      </p>
    </FormCardPage>
  );
}
