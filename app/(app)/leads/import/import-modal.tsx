"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewSheet, confirmImport, type ImportSummary } from "./actions";
import { TARGET_FIELDS, TARGET_FIELD_LABELS, type ColumnMapping } from "./constants";

type Step = "url" | "mapping" | "summary";

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("url");
  const [showGuide, setShowGuide] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function reset() {
    setStep("url");
    setUrl("");
    setError(null);
    setHeaders([]);
    setSampleRows([]);
    setMapping({});
    setSummary(null);
    setShowGuide(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFetchPreview() {
    if (!url.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await previewSheet(url.trim());
        if (result.error || !result.headers) {
          setError(result.error ?? "Couldn't read that sheet.");
          return;
        }
        setHeaders(result.headers);
        setSampleRows(result.sampleRows ?? []);
        setTotalRows(result.totalRows ?? 0);
        setMapping(result.autoMapping ?? {});
        setStep("mapping");
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await confirmImport(url.trim(), mapping);
        if (result.error) {
          setError(result.error);
          return;
        }
        setSummary(result.summary ?? null);
        setStep("summary");
        router.refresh();
      } catch {
        setError("Couldn't connect. Check your internet connection and try again.");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy/55 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-elevated">
        <div className="flex items-center justify-between border-b border-sand px-6 py-4">
          <div className="text-lg font-bold text-navy">Import from Google Sheets</div>
          <button type="button" onClick={handleClose} aria-label="Close" className="text-taupe hover:text-navy">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {step === "url" && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                className="flex items-center gap-1.5 text-left text-[12.5px] font-semibold text-navy underline"
              >
                {showGuide ? "Hide" : "How do I get a CSV link from Google Sheets?"}
              </button>
              {showGuide && (
                <ol className="flex list-decimal flex-col gap-1.5 rounded-[10px] bg-cream px-5 py-3.5 pl-9 text-[12.5px] text-ink">
                  <li>Open your Google Sheet.</li>
                  <li>Click <b>File → Share → Publish to web</b>.</li>
                  <li>In the first dropdown, pick the specific sheet/tab with your leads (not &ldquo;Entire document&rdquo;).</li>
                  <li>In the second dropdown, change &ldquo;Web page&rdquo; to <b>Comma-separated values (.csv)</b>.</li>
                  <li>Click <b>Publish</b>, then confirm.</li>
                  <li>Copy the link it gives you.</li>
                  <li>Paste that link below and click &ldquo;Fetch preview&rdquo;.</li>
                </ol>
              )}

              <label className="block">
                <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Published CSV link</span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                  className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy outline-none focus:border-gold"
                />
              </label>
            </div>
          )}

          {step === "mapping" && (
            <div className="flex flex-col gap-4">
              <p className="text-[12.5px] text-muted">
                {totalRows} row{totalRows === 1 ? "" : "s"} found. Match each CRM field to a column from your sheet, or leave it as
                &ldquo;Don&apos;t import&rdquo; to skip it. Full Name and Phone Number are required.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {TARGET_FIELDS.map((field) => (
                  <label key={field} className="block">
                    <span className="text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">{TARGET_FIELD_LABELS[field]}</span>
                    <select
                      value={mapping[field] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))}
                      className="mt-1.5 w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2.5 text-[13px] font-medium text-navy"
                    >
                      <option value="">Don&apos;t import</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              {sampleRows.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Preview (first {sampleRows.length} rows, mapped)</div>
                  <div className="overflow-x-auto rounded-[10px] border border-sand-2">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-cream text-left">
                          <th className="px-2.5 py-2 font-bold text-taupe-2">Full Name</th>
                          <th className="px-2.5 py-2 font-bold text-taupe-2">Phone</th>
                          <th className="px-2.5 py-2 font-bold text-taupe-2">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleRows.map((r, i) => (
                          <tr key={i} className="border-t border-sand-3">
                            <td className="px-2.5 py-1.5 text-navy">
                              {[mapping.full_name ? r[mapping.full_name] : "", mapping.full_name_suffix ? r[mapping.full_name_suffix] : ""].filter(Boolean).join(" ") || "—"}
                            </td>
                            <td className="px-2.5 py-1.5 text-navy">{mapping.phone ? r[mapping.phone] || "—" : "—"}</td>
                            <td className="px-2.5 py-1.5 text-navy">{mapping.email ? r[mapping.email] || "—" : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "summary" && summary && (
            <div className="flex flex-col gap-3">
              <div className="rounded-[12px] border border-sand-2 bg-cream px-5 py-4">
                <div className="text-[15px] font-bold text-navy">Import complete</div>
                <div className="mt-2 flex flex-col gap-1.5 text-[13px] text-ink">
                  <div><span className="font-bold text-green">{summary.imported}</span> lead{summary.imported === 1 ? "" : "s"} imported</div>
                  <div><span className="font-bold text-warn-gold-text">{summary.skippedDuplicates}</span> skipped as duplicate{summary.skippedDuplicates === 1 ? "" : "s"} (matched by phone number)</div>
                  <div><span className="font-bold text-alert-red">{summary.failed.length}</span> failed</div>
                </div>
              </div>
              {summary.failed.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-bold tracking-[0.08em] text-taupe-2 uppercase">Failed rows</div>
                  <div className="max-h-[160px] overflow-y-auto rounded-[10px] border border-sand-2">
                    {summary.failed.map((f, i) => (
                      <div key={i} className="border-t border-sand-3 px-3 py-2 text-[12px] text-ink first:border-t-0">
                        Row {f.row}: {f.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-[10px] bg-alert-red-bg px-3.5 py-2.5 text-[12.5px] font-medium text-alert-red">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-sand px-6 py-4">
          {step === "url" && (
            <>
              <button type="button" onClick={handleClose} className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={pending || !url.trim()}
                className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Fetching…" : "Fetch preview"}
              </button>
            </>
          )}
          {step === "mapping" && (
            <>
              <button type="button" onClick={() => setStep("url")} className="rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy">
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending || !mapping.full_name || !mapping.phone}
                className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Importing…" : "Import leads"}
              </button>
            </>
          )}
          {step === "summary" && (
            <button type="button" onClick={handleClose} className="rounded-[10px] bg-navy px-4 py-2.5 text-[13px] font-semibold text-white">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
