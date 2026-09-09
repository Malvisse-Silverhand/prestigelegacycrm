"use client";

import { useState } from "react";

// The placeholders a template body can carry, and what each one fills with.
// Kept in step with fillValuesFor() in lib/wa-template-fill -- a chip that
// inserted something nothing fills would be worse than no chip at all.
export const PLACEHOLDERS = [
  { token: "{{Name}}", label: "Name", hint: "The lead's full name" },
  { token: "{{Agent}}", label: "Agent", hint: "The agent sending it" },
  { token: "{{Product}}", label: "Product", hint: "Their quoted product" },
  { token: "{{Contribution}}", label: "Contribution", hint: "Monthly contribution, in RM" },
  { token: "{{Limit}}", label: "Limit", hint: "Annual limit or sum covered" },
] as const;

/**
 * Sits in the empty space beside a template editor's buttons: one small
 * toggle, and the chips only when asked for.
 *
 * `onInsert` receives the token. The caller is responsible for putting it at
 * the cursor rather than at the end -- inserting in the wrong place is the
 * thing that makes a picker like this annoying enough to stop using.
 */
export function PlaceholderPicker({
  onInsert,
  className = "",
}: {
  onInsert: (token: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="press rounded-[9px] border border-sand-2 bg-cream px-2.5 py-1.5 text-[11.5px] font-semibold text-navy"
      >
        {open ? "Hide placeholders" : "Use placeholder"}
      </button>

      {open && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.token}
                type="button"
                onClick={() => onInsert(p.token)}
                title={p.hint}
                className="press rounded-[7px] border border-sand-2 bg-white px-2 py-1 font-mono text-[10.5px] font-bold text-navy hover:border-navy"
              >
                {p.token}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed font-medium text-taupe">
            Inserted where the cursor is. Each one is replaced with the lead&apos;s own details when the message is
            sent; anything we can&apos;t fill is left visible rather than blanked.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Inserts `token` at the caret of a textarea, replacing any selection, and
 * leaves the caret after it so typing continues naturally. Returns the new
 * value for the caller to put into state.
 */
export function insertAtCursor(el: HTMLTextAreaElement | null, value: string, token: string): string {
  if (!el) return value + token;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? start;
  const next = value.slice(0, start) + token + value.slice(end);
  // The caret has to be restored after React re-renders with the new value.
  requestAnimationFrame(() => {
    el.focus();
    const caret = start + token.length;
    el.setSelectionRange(caret, caret);
  });
  return next;
}
