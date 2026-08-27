"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMemberActive } from "./actions";

export function ActiveToggle({ memberId, initialActive }: { memberId: string; initialActive: boolean }) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const next = !active;
    setError(false);
    startTransition(async () => {
      const result = await setMemberActive(memberId, next);
      if (result.error) {
        setError(true);
        return;
      }
      setActive(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={active}
        aria-label={active ? "Set inactive" : "Set active"}
        className={`flex h-[21px] w-[38px] items-center rounded-full px-[3px] transition-colors disabled:opacity-60 ${active ? "justify-end bg-green" : "justify-start bg-sand-2"}`}
      >
        <span className="h-[15px] w-[15px] rounded-full bg-white" />
      </button>
      <span className={`text-[12.5px] font-bold ${active ? "text-green" : "text-taupe-2"}`}>
        {pending ? "Saving…" : active ? "Active" : "Inactive"}
      </span>
      {error && <span className="text-[11px] font-medium text-alert-red">Couldn&apos;t save</span>}
    </div>
  );
}
