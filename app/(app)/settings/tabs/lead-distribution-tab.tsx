"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DistributionSettings } from "../types";
import { saveDistributionSettings } from "../actions";

export function LeadDistributionTab({ initial }: { initial: DistributionSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle(field: "roundRobinEnabled" | "reassignRequiresApproval") {
    save({ ...settings, [field]: !settings[field] });
  }

  function save(next: DistributionSettings) {
    setSaved(false);
    setError(null);
    setSettings(next);
    startTransition(async () => {
      const result = await saveDistributionSettings(next);
      if (result.error) {
        setError(result.error);
        setSettings(settings);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="max-w-[520px] rounded-[18px] border border-sand bg-white px-[22px] pb-[22px] pt-5">
      <div className="text-[15px] font-bold text-navy">Automatic lead distribution</div>
      <div className="mt-4 flex flex-col gap-3">
        <ToggleRow
          label="Round-robin within unit"
          description="Split evenly among active agents"
          checked={settings.roundRobinEnabled}
          disabled={pending}
          onChange={() => toggle("roundRobinEnabled")}
        />
        <div className="flex items-center gap-[11px]">
          <span className="flex h-[21px] w-[38px] flex-none items-center justify-end rounded-full bg-green px-[3px]">
            <span className="h-[15px] w-[15px] rounded-full bg-white" />
          </span>
          <div className="flex-1">
            <div className="text-[12.5px] font-semibold text-navy">Auto-flag lead stale</div>
            <div className="flex items-center gap-1.5 text-[11px] text-taupe">
              No activity for over
              <input
                type="number"
                min={1}
                value={settings.staleAfterDays}
                disabled={pending}
                onChange={(e) => setSettings({ ...settings, staleAfterDays: Number(e.target.value) || 1 })}
                onBlur={() => save(settings)}
                className="h-6 w-12 rounded-md border border-sand-2 bg-cream px-1.5 text-center text-[11px] font-bold text-navy outline-none focus:border-gold"
              />
              days
            </div>
          </div>
        </div>
        <ToggleRow
          label="Reassign stale leads"
          description="Requires Unit Manager approval"
          checked={settings.reassignRequiresApproval}
          disabled={pending}
          onChange={() => toggle("reassignRequiresApproval")}
        />
      </div>
      {error && <div className="mt-3 text-[12px] font-medium text-alert-red">{error}</div>}
      {saved && !error && <div className="mt-3 text-[12px] font-medium text-green">Saved.</div>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
  readOnlyNote,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
  readOnlyNote?: string;
}) {
  return (
    <div className="flex items-center gap-[11px]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={disabled || !onChange}
        className={`flex h-[21px] w-[38px] flex-none items-center rounded-full px-[3px] transition-colors disabled:opacity-70 ${
          checked ? "justify-end bg-green" : "justify-start bg-sand-2"
        }`}
      >
        <span className="h-[15px] w-[15px] rounded-full bg-white" />
      </button>
      <div>
        <div className="text-[12.5px] font-semibold text-navy">{label}</div>
        <div className="text-[11px] text-taupe">
          {description}
          {readOnlyNote ? ` · ${readOnlyNote}` : ""}
        </div>
      </div>
    </div>
  );
}
