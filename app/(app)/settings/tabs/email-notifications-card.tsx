"use client";

import { useState, useTransition } from "react";
import { setLeadFormEmail, type NotificationPrefs } from "../notification-actions";

/**
 * Own-profile email switches, under My Profile. Saves on toggle -- there is
 * nothing else on the card to batch it with.
 */
export function EmailNotificationsCard({ prefs }: { prefs: NotificationPrefs }) {
  const [on, setOn] = useState(prefs.leadFormEmail);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !on;
    setError(null);
    start(async () => {
      try {
        const result = await setLeadFormEmail(next);
        if (result.error) setError(result.error);
        else setOn(next);
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="mt-5 rounded-[14px] border border-sand bg-white p-4">
      <h3 className="text-[13px] font-bold text-navy">Email notifications</h3>
      <p className="mt-1 text-[10.5px] font-medium text-taupe">Sent to the email address on your profile.</p>

      <div className="mt-3.5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[12.5px] font-bold text-navy">Lead submitted a form</div>
          <div className="mt-0.5 text-[11px] font-medium text-taupe-2">
            When a lead completes a Stage 1 or Stage 2 link you sent with &ldquo;Collect details&rdquo;.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Email me when a lead submits a form"
          onClick={toggle}
          disabled={pending || !prefs.available}
          className={`flex h-[21px] w-[38px] shrink-0 items-center rounded-full px-[3px] transition-colors disabled:opacity-60 ${on ? "justify-end bg-green" : "justify-start bg-sand-2"}`}
        >
          <span className="h-[15px] w-[15px] rounded-full bg-white" />
        </button>
      </div>

      {!prefs.available && (
        <p className="mt-2.5 text-[11px] font-medium text-taupe">This setting needs the latest database update first.</p>
      )}
      {error && (
        <div className="mt-2.5 rounded-[9px] bg-alert-red-bg px-3 py-2 text-[11.5px] font-medium text-alert-red">{error}</div>
      )}
    </div>
  );
}
