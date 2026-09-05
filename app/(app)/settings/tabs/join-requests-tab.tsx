"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InviteLinkRow, JoinRequestRow, UnitManagerOption } from "../types";
import {
  createInviteLink,
  setInviteLinkActive,
  deleteInviteLink,
  approveRegistration,
  denyRegistration,
} from "../actions";

// Outside the component on purpose: Date.now() during render is impure, and
// this only needs to be right at the moment the list is built.
function isExpired(iso: string | null) {
  return !!iso && new Date(iso).getTime() < Date.now();
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

// The link is what gets shared, so it has to be a real absolute URL. Built in
// the browser rather than on the server so it always matches the host the
// manager is actually looking at (localhost, a preview, or production).
function joinUrl(token: string) {
  if (typeof window === "undefined") return `/join/${token}`;
  return `${window.location.origin}/join/${token}`;
}

export function JoinRequestsTab({
  inviteLinks,
  joinRequests,
  supervisorOptions,
  currentUserId,
}: {
  inviteLinks: InviteLinkRow[];
  joinRequests: JoinRequestRow[];
  supervisorOptions: UnitManagerOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [assignedUnderId, setAssignedUnderId] = useState(
    supervisorOptions.some((o) => o.id === currentUserId) ? currentUserId : (supervisorOptions[0]?.id ?? ""),
  );
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [denying, setDenying] = useState<JoinRequestRow | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [approved, setApproved] = useState<{ name: string; emailSent: boolean } | null>(null);

  const pendingRequests = joinRequests.filter((r) => r.status === "pending");
  const reviewed = joinRequests.filter((r) => r.status !== "pending");

  function run(fn: () => Promise<{ error: string | null }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.error) {
          setError(result.error);
          return;
        }
        onDone?.();
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(joinUrl(token));
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 2000);
    } catch {
      setError("Couldn't copy — select the link and copy it manually.");
    }
  }

  return (
    <div className="flex max-w-[820px] flex-col gap-5">
      {error && (
        <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-alert-red">
          {error}
        </div>
      )}

      {/* ---------- Pending review ---------- */}
      <div className="rounded-[18px] border border-sand bg-white px-[22px] pb-[22px] pt-5">
        <div className="text-[15px] font-bold text-navy">
          Pending approval
          {pendingRequests.length > 0 && (
            <span className="ml-2 rounded-full bg-warn-gold-bg px-2 py-[2px] text-[10.5px] font-bold text-warn-gold-text">
              {pendingRequests.length}
            </span>
          )}
        </div>
        <div className="mt-[3px] text-[11.5px] font-medium text-taupe">
          Nobody gets an account until you approve them here.
        </div>

        {pendingRequests.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-taupe px-4 py-6 text-center text-[12.5px] font-medium text-taupe-2">
            No registrations waiting.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2.5">
            {pendingRequests.map((r) => (
              <div key={r.id} className="rounded-[12px] border border-sand-2 bg-cream px-3.5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-navy">{r.fullName}</div>
                    <div className="mt-0.5 text-[11.5px] font-medium text-muted">
                      {r.email} · {r.phone}
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-taupe">
                      Applied {shortDate(r.createdAt)} · joins under {r.assignedUnderName}
                      {r.linkLabel ? ` · via “${r.linkLabel}”` : ""}
                    </div>
                    {r.note && (
                      <div className="mt-2 rounded-[8px] border border-sand-2 bg-white px-2.5 py-2 text-[11.5px] leading-relaxed text-muted">
                        {r.note}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-none items-center gap-1.5">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          async () => {
                            const res = await approveRegistration(r.id);
                            if (!res.error) setApproved({ name: r.fullName, emailSent: res.emailSent });
                            return { error: res.error };
                          },
                        )
                      }
                      className="rounded-[9px] bg-gold px-3.5 py-2 text-[12px] font-bold text-navy disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setDenyReason("");
                        setDenying(r);
                      }}
                      className="rounded-[9px] border border-[#f6d5cf] bg-white px-3.5 py-2 text-[12px] font-semibold text-alert-red disabled:opacity-60"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Shareable links ---------- */}
      <div className="rounded-[18px] border border-sand bg-white px-[22px] pb-[22px] pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-bold text-navy">Recruitment links</div>
            <div className="mt-[3px] text-[11.5px] font-medium text-taupe">
              Share a link with anyone — no CRM access needed to fill it in.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setFreshToken(null);
              setCreating(true);
            }}
            className="flex flex-none items-center gap-1.5 rounded-[10px] bg-gold px-3.5 py-2.5 text-[12.5px] font-bold text-navy shadow-sm hover:brightness-95"
          >
            + New invite link
          </button>
        </div>

        {creating && (
          <div className="mt-4 rounded-[12px] border-2 border-navy bg-white px-3.5 py-3.5">
            <div className="text-[13px] font-bold text-navy">New recruitment link</div>
            <div className="mt-3 flex flex-col gap-3">
              <label className="block">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">
                  Label (optional)
                </span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Roadshow Shah Alam, Sept"
                  className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
                />
                <span className="mt-1 block text-[10.5px] font-medium text-taupe">
                  Only you see this — it keeps several links apart.
                </span>
              </label>
              <label className="block">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-taupe-2">
                  New agents report to
                </span>
                <select
                  value={assignedUnderId}
                  onChange={(e) => setAssignedUnderId(e.target.value)}
                  className="mt-1.5 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-semibold text-navy outline-none focus:border-gold"
                >
                  {supervisorOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.full_name}
                      {o.unitName ? ` — ${o.unitName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending || !assignedUnderId}
                  onClick={() =>
                    run(
                      async () => {
                        const res = await createInviteLink({ label, assignedUnderId });
                        if (!res.error && res.token) {
                          setFreshToken(res.token);
                          setLabel("");
                          setCreating(false);
                        }
                        return { error: res.error };
                      },
                    )
                  }
                  className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  {pending ? "Creating…" : "Create link"}
                </button>
              </div>
            </div>
          </div>
        )}

        {freshToken && (
          <div className="mt-4 rounded-[12px] border border-gold bg-warn-gold-bg px-3.5 py-3">
            <div className="text-[12.5px] font-bold text-navy">Link ready — share it now</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-[8px] bg-white px-2.5 py-2 font-mono text-[11.5px] text-navy">
                {joinUrl(freshToken)}
              </code>
              <button
                type="button"
                onClick={() => copy(freshToken)}
                className="flex-none rounded-[9px] bg-navy px-3 py-2 text-[11.5px] font-semibold text-white"
              >
                {copied === freshToken ? "Copied" : "Copy"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Salam! Daftar sebagai ejen Great Eastern Takaful di sini: ${joinUrl(freshToken)}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-none rounded-[9px] bg-[#25d366] px-3 py-2 text-[11.5px] font-semibold text-white"
              >
                WhatsApp
              </a>
            </div>
          </div>
        )}

        {inviteLinks.length === 0 && !creating ? (
          <div className="mt-4 rounded-xl border border-dashed border-taupe px-4 py-6 text-center text-[12.5px] font-medium text-taupe-2">
            No links yet. Create one and share it to start recruiting.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2.5">
            {inviteLinks.map((l) => {
              const expired = isExpired(l.expiresAt);
              return (
                <div key={l.id} className="rounded-[12px] border border-sand-2 bg-cream px-3.5 py-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-bold text-navy">{l.label ?? "Recruitment link"}</span>
                        {expired ? (
                          <span className="rounded-[6px] bg-sand-2 px-2 py-[2px] text-[9.5px] font-bold text-taupe-2">
                            EXPIRED
                          </span>
                        ) : !l.isActive ? (
                          <span className="rounded-[6px] bg-sand-2 px-2 py-[2px] text-[9.5px] font-bold text-taupe-2">
                            OFF
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-muted">{joinUrl(l.token)}</div>
                      <div className="mt-1 text-[10.5px] font-medium text-taupe">
                        Joins under {l.assignedUnderName}
                        {l.expiresAt ? ` · ${expired ? "expired" : "expires"} ${shortDate(l.expiresAt)}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => copy(l.token)}
                        className="rounded-[9px] border border-sand-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-navy"
                      >
                        {copied === l.token ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => setInviteLinkActive(l.id, !l.isActive))}
                        className="rounded-[9px] border border-sand-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-navy disabled:opacity-60"
                      >
                        {l.isActive ? "Turn off" : "Turn on"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => deleteInviteLink(l.id))}
                        className="rounded-[9px] border border-[#f6d5cf] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-alert-red disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- Already reviewed ---------- */}
      {reviewed.length > 0 && (
        <details className="rounded-[18px] border border-sand bg-white px-[22px] py-4">
          <summary className="cursor-pointer text-[13.5px] font-bold text-navy">
            Reviewed ({reviewed.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {reviewed.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 border-t border-sand pt-2 text-[12px]">
                <span className="font-semibold text-navy">{r.fullName}</span>
                <span className="text-muted">{r.email}</span>
                <span
                  className={`ml-auto rounded-[6px] px-2 py-[2px] text-[9.5px] font-bold ${
                    r.status === "approved"
                      ? "bg-success-bg text-green"
                      : "bg-alert-red-bg text-alert-red"
                  }`}
                >
                  {r.status === "approved" ? "APPROVED" : "DENIED"}
                </span>
                {r.reviewedAt && <span className="text-[10.5px] text-taupe">{shortDate(r.reviewedAt)}</span>}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ---------- Deny dialog ---------- */}
      {denying && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">Deny {denying.fullName}?</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              No account is created and no email is sent. The reason is kept for your records only.
            </p>
            <input
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Reason (optional)"
              className="mt-3 h-[42px] w-full rounded-[10px] border border-sand-2 bg-cream px-3.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
            />
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDenying(null)}
                className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => denyRegistration(denying.id, denyReason), () => setDenying(null))}
                className="rounded-[10px] bg-alert-red px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Denying…" : "Deny"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Approval confirmation ---------- */}
      {approved && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated">
            <div className="text-[15px] font-bold text-navy">{approved.name} is in</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {approved.emailSent
                ? "Their account is created and a set-your-password email is on its way."
                : "Their account is created, but the email couldn't be sent. Open Users & Hierarchy to resend access."}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setApproved(null)}
                className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
