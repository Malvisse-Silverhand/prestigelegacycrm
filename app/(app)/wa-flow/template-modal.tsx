"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, type WaTemplate } from "./types";
import { saveTemplate } from "./actions";

export function TemplateModal({
  open, template, onClose,
}: { open: boolean; template: WaTemplate | null; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveTemplate(formData);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-elevated">
        <div className="text-lg font-bold text-navy">{template ? "Edit Template" : "Add Template"}</div>
        <form action={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="id" value={template?.id ?? ""} />
          <label className="block">
            <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Title</span>
            <input
              name="title"
              required
              defaultValue={template?.title}
              className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Category</span>
              <select
                name="category"
                required
                defaultValue={template?.category ?? "greeting"}
                className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Language</span>
              <select
                name="language"
                defaultValue={template?.language ?? "BM"}
                className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
              >
                <option value="BM">BM</option>
                <option value="EN">EN</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">
              Message body
            </span>
            <textarea
              name="body"
              required
              rows={6}
              defaultValue={template?.body}
              placeholder="Use {{tokNama}}, {{tokAgent}}, {{tokProduk}}, {{tokCaruman}}, {{tokHad}}"
              className="mt-1.5 w-full resize-none rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 font-mono text-[12.5px] text-navy outline-none focus:border-gold"
            />
          </label>

          {error && (
            <div className="rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
              {error}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2.5">
            <button type="button" onClick={onClose} className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
              {pending ? "Saving…" : "Save template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
