"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CampaignRow } from "../types";
import { saveCampaign, clearCampaign } from "../actions";
import { malaysiaToday } from "@/lib/malaysia-date";

// The goal behind the dashboard's headline card -- "Road to RM130K by 31 Oct".
// Always the signed-in person's own: a manager sets other people's monthly
// numbers, but a campaign is a personal commitment, so there is no member
// picker here.
export function CampaignGoalCard({ campaign }: { campaign: CampaignRow | null }) {
  const router = useRouter();
  const today = malaysiaToday();
  const [name, setName] = useState(campaign?.name ?? "");
  const [targetAnc, setTargetAnc] = useState(campaign ? String(campaign.targetAnc) : "");
  const [startDate, setStartDate] = useState(campaign?.startDate ?? today);
  const [deadline, setDeadline] = useState(campaign?.deadline ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await saveCampaign({
          name,
          targetAnc: Number(targetAnc),
          startDate,
          deadline,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function handleClear() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await clearCampaign();
        if (result.error) {
          setError(result.error);
          return;
        }
        setConfirmClear(false);
        setName("");
        setTargetAnc("");
        setDeadline("");
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  return (
    <div className="rounded-[18px] border border-sand bg-white px-[22px] pb-[22px] pt-5">
      <div className="flex items-center gap-2.5">
        <div className="flex-1 text-[15px] font-bold text-navy">My Yearly Target</div>
        {campaign && (
          <span className="rounded-[6px] bg-success-bg px-2 py-1 text-[9.5px] font-bold tracking-[0.06em] text-green">
            RUNNING
          </span>
        )}
      </div>
      <div className="mt-[3px] text-[11.5px] font-medium text-taupe">
        The Yearly Target card on your dashboard. Spans months and runs to a deadline —
        separate from the monthly targets set below.
      </div>

      <label className="mt-4 block">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe">Goal name</span>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
          placeholder="SCHA"
          className="mt-[5px] h-[36px] w-full rounded-[9px] border border-sand-2 bg-cream px-3 text-[12.5px] font-semibold text-navy outline-none placeholder:font-medium placeholder:text-taupe focus:border-gold"
        />
      </label>

      <div className="mt-3 grid grid-cols-[1fr_1fr_1fr] gap-2.5">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe">Target (RM)</span>
          <input
            type="number"
            value={targetAnc}
            onChange={(e) => { setTargetAnc(e.target.value); setSaved(false); }}
            placeholder="130000"
            className="mt-[5px] h-[36px] w-full rounded-[9px] border border-sand-2 bg-cream px-2.5 text-right text-[12.5px] font-bold text-navy outline-none focus:border-gold"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe">Starts</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setSaved(false); }}
            className="mt-[5px] h-[36px] w-full rounded-[9px] border border-sand-2 bg-cream px-2.5 text-[12px] font-semibold text-navy outline-none focus:border-gold"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe">Deadline</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => { setDeadline(e.target.value); setSaved(false); }}
            className="mt-[5px] h-[36px] w-full rounded-[9px] border border-sand-2 bg-cream px-2.5 text-[12px] font-semibold text-navy outline-none focus:border-gold"
          />
        </label>
      </div>

      <p className="mt-2 text-[11px] font-medium text-taupe">
        Only cases closed between those two dates count toward it.
      </p>

      {error && <div className="mt-3 text-[12px] font-medium text-alert-red">{error}</div>}
      {saved && !error && <div className="mt-3 text-[12px] font-medium text-green">Goal saved.</div>}

      {confirmClear ? (
        <div className="mt-4 rounded-[11px] border border-sand-2 bg-cream p-3">
          <div className="text-[12.5px] font-semibold text-navy">Stop tracking this goal?</div>
          <div className="mt-0.5 text-[11.5px] font-medium text-muted">
            It comes off your dashboard. The record stays, so you can look back at it.
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="rounded-[9px] border border-sand-2 bg-white px-3 py-2 text-[12px] font-semibold text-navy"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={pending}
              className="rounded-[9px] bg-alert-red px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Stopping…" : "Yes, stop it"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="flex h-10 flex-1 items-center justify-center rounded-[11px] bg-navy text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : campaign ? "Update goal" : "Set goal"}
          </button>
          {campaign && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="flex h-10 items-center justify-center rounded-[11px] border border-sand-2 px-4 text-[13px] font-semibold text-navy"
            >
              Stop
            </button>
          )}
        </div>
      )}
    </div>
  );
}
