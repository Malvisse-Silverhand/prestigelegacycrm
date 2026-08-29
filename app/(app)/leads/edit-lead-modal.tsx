"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLead, deleteLead } from "./actions";
import { LeadFormFields } from "./lead-form-fields";

// Structural type (not imported from a specific screen's data.ts) so this
// modal can be reused from both the Leads Manager row list (LeadRow) and
// Lead Detail's "Edit" link (LeadDetail) without those two screens' types
// needing to match exactly.
type EditableLead = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  state: string | null;
  occupation: string | null;
  lead_source: string | null;
  interest: string | null;
  address: string | null;
  postcode: string | null;
  agent_remark: string | null;
  status: string;
  gender: "male" | "female" | null;
  is_smoker: boolean | null;
  budget_indicated: string | null;
  best_time_to_reach: string | null;
  created_at: string;
};

export function EditLeadModal({ lead, canDelete, onClose }: { lead: EditableLead; canDelete: boolean; onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDeleteTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateLead(lead.id, formData);
        if (result.error) {
          setError(result.error);
        } else {
          router.refresh();
          onClose();
        }
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startDeleteTransition(async () => {
      try {
        const result = await deleteLead(lead.id);
        if (result.error) {
          setError(result.error);
          setConfirmingDelete(false);
        } else {
          // Not just router.refresh() -- this modal is also reachable from
          // Lead Detail (a page for this exact lead), which would otherwise
          // be left rendering a now-deleted record. /leads is always a safe
          // landing spot either way.
          onClose();
          router.push("/leads");
        }
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
        setConfirmingDelete(false);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated">
        <div className="text-lg font-bold text-navy">Edit Lead</div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] font-medium text-taupe">
          <span>Lead ID: {lead.id}</span>
          <span>
            Date Created: {new Date(lead.created_at).toLocaleString("en-MY", {
              day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
            })}
          </span>
        </div>
        <form action={handleSubmit} className="mt-4 flex flex-col gap-3">
          <LeadFormFields
            defaults={{
              full_name: lead.full_name,
              phone: lead.phone,
              email: lead.email,
              date_of_birth: lead.date_of_birth,
              gender: lead.gender,
              is_smoker: lead.is_smoker,
              occupation: lead.occupation,
              interest: lead.interest,
              address: lead.address,
              postcode: lead.postcode,
              state: lead.state,
              lead_source: lead.lead_source,
              status: lead.status,
              agent_remark: lead.agent_remark,
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Monthly budget (RM)</span>
              <input
                name="budget_indicated"
                type="number"
                defaultValue={lead.budget_indicated ?? ""}
                className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Best time to reach</span>
              <input
                name="best_time_to_reach"
                type="text"
                defaultValue={lead.best_time_to_reach ?? ""}
                className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
              {error}
            </div>
          )}

          {confirmingDelete && (
            <div className="rounded-[10px] border border-[#f6d5cf] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
              Delete this lead permanently? This also removes its activity history and any quotations
              linked to it. This can&apos;t be undone.
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2.5">
            {canDelete ? (
              confirmingDelete ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-[10px] border border-sand-2 px-3.5 py-2.5 text-[13px] font-semibold text-navy"
                  >
                    Keep lead
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-[10px] bg-alert-red px-3.5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Yes, delete lead"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-[10px] border border-[#f6d5cf] px-3.5 py-2.5 text-[13px] font-semibold text-alert-red"
                >
                  Delete lead
                </button>
              )
            ) : (
              <span />
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
