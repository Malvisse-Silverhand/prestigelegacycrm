"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMemberActive } from "./actions";

// `compact` is for the league view, where the toggle sits inside a dense
// row/card rather than on its own line.
export function ActiveToggle({
  memberId,
  initialActive,
  compact,
}: {
  memberId: string;
  initialActive: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // The league view renders this inside a <summary>, where a bare click
    // would also open/close the parent <details>. Handled here rather than in
    // a wrapper because team-league.tsx is a Server Component and can't carry
    // an event handler of its own (same reason StopPropagationLink exists).
    e.preventDefault();
    e.stopPropagation();
    const next = !active;
    setError(false);
    startTransition(async () => {
      try {
        const result = await setMemberActive(memberId, next);
        if (result.error) {
          setError(true);
          return;
        }
        setActive(next);
        router.refresh();
      } catch {
        setError(true);
      }
    });
  }

  const track = compact
    ? `flex h-[16px] w-[29px] items-center rounded-full px-[2px] transition-colors disabled:opacity-60 ${active ? "justify-end bg-green" : "justify-start bg-sand-2"}`
    : `flex h-[21px] w-[38px] items-center rounded-full px-[3px] transition-colors disabled:opacity-60 ${active ? "justify-end bg-green" : "justify-start bg-sand-2"}`;

  return (
    <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2.5"}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={active}
        aria-label={active ? "Set inactive" : "Set active"}
        className={track}
      >
        <span className={compact ? "h-[12px] w-[12px] rounded-full bg-white" : "h-[15px] w-[15px] rounded-full bg-white"} />
      </button>
      <span
        className={`${compact ? "text-[10.5px]" : "text-[12.5px]"} font-bold ${active ? "text-green" : "text-taupe-2"}`}
      >
        {pending ? "Saving…" : active ? "Active" : "Inactive"}
      </span>
      {error && <span className="text-[11px] font-medium text-alert-red">Couldn&apos;t save</span>}
    </div>
  );
}
