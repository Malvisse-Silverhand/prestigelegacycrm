"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  loadSheet,
  startBatch,
  stageChunk,
  finishStaging,
  getStagedPage,
  saveAssignmentPlan,
  assignChunk,
  finalizeBatch,
  cancelBatch,
  type PlanRequest,
  type FinalizeResult,
} from "./actions";
import type { TeamMember, BatchSummary } from "./data";
import { csvToObjects } from "@/lib/csv-parse";
import {
  autoMap,
  buildImportRow,
  normalizeHeader,
  TARGET_FIELDS,
  TARGET_FIELD_LABELS,
  MAX_UPLOAD_ROWS,
  type TargetField,
  type ImportMapping,
  type RowDefaults,
} from "@/lib/lead-import";
import { planAssignments, type PlanMember } from "@/lib/lead-assignment-plan";
import { computeTargets, type RebalanceMode } from "@/lib/rebalance-targets";
import { INTEREST_OPTIONS } from "@/lib/product-interest";
import { LEAD_SOURCES } from "@/lib/lead-constants";

// Manual lead upload: Source -> Map columns -> Review (stages the file on the
// server) -> Assign (managers) -> Run (creates the leads in chunks) -> Done.
// Every server call is wrapped so a dropped connection shows a message and a
// Retry instead of a broken screen; all the chunked calls are safe to repeat.

const OFFLINE = "Couldn't connect. Check your internet connection and try again.";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const STAGE_CHUNK = 500;
const MAX_FIELD_PREVIEW = 200;

type Step = "source" | "map" | "review" | "assign" | "run" | "done";
type InvalidRow = { row: number; reason: string };
type Stats = { valid: number; duplicates: number; invalid: number };
type AssignMode = RebalanceMode | "self";

const BTN_PRIMARY =
  "press rounded-[10px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 dark:bg-gold dark:text-navy";
const BTN_SECONDARY =
  "press rounded-[10px] border border-sand-2 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-[#eef3f8]";
const CARD = "rounded-[14px] border border-sand bg-white p-4 dark:border-white/10 dark:bg-[#12283f]";
const INPUT =
  "w-full rounded-[10px] border border-sand-2 bg-white px-3 py-2 text-[13px] font-medium text-navy outline-none focus:border-gold dark:border-white/10 dark:bg-[#0b1a2b] dark:text-[#eef3f8]";
const LABEL = "text-[11px] font-bold uppercase tracking-[0.08em] text-taupe-2 dark:text-[#7f93aa]";
const MUTED = "text-[12px] font-medium text-muted dark:text-[#7f93aa]";
const ERROR_TEXT = "text-[12.5px] font-semibold text-alert-red";

const fmtN = (n: number) => n.toLocaleString("en-US");

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toUpperCase() || "?";
}

function csvCell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

export function UploadWizard({
  isManager,
  team,
  batches,
}: {
  isManager: boolean;
  team: TeamMember[];
  batches: BatchSummary[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("source");

  // Source
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [filename, setFilename] = useState("");
  const [source, setSource] = useState<"csv" | "sheet">("csv");
  const [foundRows, setFoundRows] = useState(0);

  // Mapping
  const [fieldCols, setFieldCols] = useState<Partial<Record<TargetField, string>>>({});
  const [noteCols, setNoteCols] = useState<string[]>([]);
  const [interest, setInterest] = useState("");
  const [leadSource, setLeadSource] = useState("");

  // Staging / review
  const [batchId, setBatchId] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const [stageDone, setStageDone] = useState(0);
  const [stageError, setStageError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([]);
  const stageRef = useRef<{ batchId: string | null; offset: number; invalid: InvalidRow[]; finished: boolean }>({
    batchId: null,
    offset: 0,
    invalid: [],
    finished: false,
  });
  const stagingLock = useRef(false);
  const [confirmDownload, setConfirmDownload] = useState(false);
  const [confirmStartOver, setConfirmStartOver] = useState(false);

  // Run / done
  const [running, setRunning] = useState(false);
  const [inserted, setInserted] = useState(0);
  const [fallbacks, setFallbacks] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);
  const [final, setFinal] = useState<FinalizeResult | null>(null);
  const runLock = useRef(false);

  // Shared
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validCount = stats?.valid ?? 0;

  const mapping: ImportMapping = useMemo(() => {
    const fields: ImportMapping["fields"] = {};
    for (const f of TARGET_FIELDS) {
      const col = fieldCols[f];
      if (col) fields[f] = col;
    }
    const mapped = new Set(Object.values(fields));
    return { fields, notes: noteCols.filter((c) => !mapped.has(c)) };
  }, [fieldCols, noteCols]);

  const defaults: RowDefaults = useMemo(
    () => ({ interest: interest || null, leadSource: leadSource || null }),
    [interest, leadSource],
  );

  function resetAll() {
    setStep("source");
    setHeaders([]);
    setRows([]);
    setFilename("");
    setFoundRows(0);
    setFieldCols({});
    setNoteCols([]);
    setInterest("");
    setLeadSource("");
    setBatchId(null);
    setStaging(false);
    setStageDone(0);
    setStageError(null);
    setStats(null);
    setInvalidRows([]);
    stageRef.current = { batchId: null, offset: 0, invalid: [], finished: false };
    setRunning(false);
    setInserted(0);
    setFallbacks(0);
    setRunError(null);
    setFinal(null);
    setError(null);
  }

  function ingest(h: string[], r: Record<string, string>[], name: string, src: "csv" | "sheet", found: number) {
    const cleanHeaders = h.filter((x) => x !== "");
    if (cleanHeaders.length === 0 || r.length === 0) {
      setError("That file has no lead rows. Check it has a header row and at least one lead.");
      return;
    }
    const capped = r.slice(0, MAX_UPLOAD_ROWS);
    const m = autoMap(cleanHeaders);
    setHeaders(cleanHeaders);
    setRows(capped);
    setFilename(name);
    setSource(src);
    setFoundRows(found);
    setFieldCols(m.fields);
    setNoteCols(m.notes);
    setError(null);
    setStep("map");
  }

  // -- Review: stage the file on the server, chunk by chunk -------------------

  async function runStaging() {
    if (stagingLock.current) return;
    stagingLock.current = true;
    setStaging(true);
    setStageError(null);
    const st = stageRef.current;
    try {
      if (!st.batchId) {
        const s = await startBatch({ source, filename, totalRows: rows.length });
        if (s.error || !s.batchId) {
          setStageError(s.error ?? "Couldn't start the upload. Please try again.");
          return;
        }
        st.batchId = s.batchId;
        setBatchId(s.batchId);
      }
      while (st.offset < rows.length) {
        const res = await stageChunk({
          batchId: st.batchId,
          offset: st.offset,
          rows: rows.slice(st.offset, st.offset + STAGE_CHUNK),
          mapping,
          defaults,
        });
        if (res.error) {
          setStageError(res.error);
          return;
        }
        st.invalid.push(...(res.invalid ?? []));
        st.offset += STAGE_CHUNK;
        setStageDone(Math.min(st.offset, rows.length));
      }
      if (!st.finished) {
        const fin = await finishStaging(st.batchId);
        if (fin.error) {
          setStageError(fin.error);
          return;
        }
        st.finished = true;
        setStats({ valid: fin.valid ?? 0, duplicates: fin.duplicates ?? 0, invalid: fin.invalid ?? 0 });
        setInvalidRows([...st.invalid]);
      }
    } catch {
      setStageError(OFFLINE);
    } finally {
      stagingLock.current = false;
      setStaging(false);
    }
  }

  function goReview() {
    stageRef.current = { batchId: null, offset: 0, invalid: [], finished: false };
    setBatchId(null);
    setStageDone(0);
    setStats(null);
    setInvalidRows([]);
    setStep("review");
    void runStaging();
  }

  async function startOver() {
    // An unfinished batch is cleaned up on the server; nothing was created yet.
    const id = stageRef.current.batchId;
    if (id) {
      try {
        await cancelBatch(id);
      } catch {
        /* abandoned batches are swept automatically */
      }
    }
    resetAll();
    router.refresh();
  }

  // A file uploaded just now can simply be re-chosen, so starting over is
  // immediate. An upload resumed from the list has no file in the browser (rows
  // is empty): discarding it removes the staged leads, so it asks first.
  function requestStartOver() {
    if (rows.length === 0 && stageRef.current.batchId) setConfirmStartOver(true);
    else void startOver();
  }

  function downloadSkipped() {
    const lines = ["Row,Reason", ...invalidRows.map((r) => `${r.row},${csvCell(r.reason)}`)];
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skipped-rows.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setConfirmDownload(false);
  }

  // -- Plan + run --------------------------------------------------------------

  async function startRun(id: string, total: number, from: number) {
    if (runLock.current) return;
    runLock.current = true;
    setRunning(true);
    setBatchId(id);
    setStats((s) => s ?? { valid: total, duplicates: 0, invalid: 0 });
    setInserted(from);
    setRunError(null);
    setStep("run");
    try {
      for (let i = 0; i < 200; i++) {
        const res = await assignChunk(id);
        if (res.error) {
          setRunError(res.error);
          return;
        }
        setInserted((n) => n + (res.inserted ?? 0));
        setFallbacks((n) => n + (res.fallbacks ?? 0));
        if ((res.remaining ?? 0) === 0) break;
      }
      const fin = await finalizeBatch(id);
      if (fin.error) {
        setRunError(fin.error);
        return;
      }
      setFinal(fin);
      setStep("done");
      router.refresh();
    } catch {
      setRunError(OFFLINE);
    } finally {
      runLock.current = false;
      setRunning(false);
    }
  }

  async function submitPlan(request: PlanRequest) {
    if (!batchId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await saveAssignmentPlan(batchId, request);
      if (res.error) {
        setError(res.error);
        return;
      }
      setBusy(false);
      await startRun(batchId, validCount, 0);
    } catch {
      setError(OFFLINE);
    } finally {
      setBusy(false);
    }
  }

  // -- Resume / cancel of earlier uploads ----------------------------------------

  function resume(b: BatchSummary) {
    if (busy || running || staging) return;
    resetAll();
    setBatchId(b.id);
    setFilename(b.filename ?? "");
    if (b.status === "assigning") {
      void startRun(b.id, b.validRows, b.insertedRows);
      return;
    }
    setStats({ valid: b.validRows, duplicates: b.duplicateRows, invalid: b.invalidRows });
    stageRef.current.batchId = b.id;
    stageRef.current.finished = true;
    setStep(isManager ? "assign" : "review");
  }

  const steps = isManager
    ? ["Source", "Map columns", "Review", "Assign", "Done"]
    : ["Source", "Map columns", "Review", "Done"];
  const stepIndex = (() => {
    const order: Step[] = isManager
      ? ["source", "map", "review", "assign", "done"]
      : ["source", "map", "review", "done"];
    const s: Step = step === "run" ? "done" : step;
    return order.indexOf(s);
  })();

  return (
    <div className="flex flex-col gap-4">
      <RecentUploads batches={batches} onResume={resume} disabled={busy || running || staging} />
      <StepIndicator steps={steps} current={stepIndex} />

      {step === "source" && (
        <SourceStep
          onLoaded={ingest}
          error={error}
          setError={setError}
        />
      )}

      {step === "map" && (
        <MapStep
          headers={headers}
          rows={rows}
          foundRows={foundRows}
          filename={filename}
          fieldCols={fieldCols}
          setFieldCols={setFieldCols}
          noteCols={noteCols}
          setNoteCols={setNoteCols}
          mapping={mapping}
          defaults={defaults}
          interest={interest}
          setInterest={setInterest}
          leadSource={leadSource}
          setLeadSource={setLeadSource}
          onBack={() => setStep("source")}
          onContinue={goReview}
        />
      )}

      {step === "review" && (
        <ReviewStep
          isManager={isManager}
          total={rows.length}
          staging={staging}
          stageDone={stageDone}
          stageError={stageError}
          stats={stats}
          invalidCount={invalidRows.length}
          busy={busy}
          error={error}
          onRetry={() => void runStaging()}
          onContinue={() => {
            if (isManager) setStep("assign");
            else void submitPlan({ mode: "self" });
          }}
          onDownload={() => setConfirmDownload(true)}
          onStartOver={requestStartOver}
          onBack={requestStartOver}
        />
      )}

      {step === "assign" && batchId && (
        <AssignStep
          team={team}
          valid={validCount}
          batchId={batchId}
          busy={busy}
          error={error}
          onSubmit={(req) => void submitPlan(req)}
        />
      )}

      {step === "run" && (
        <RunStep
          inserted={inserted}
          total={validCount}
          fallbacks={fallbacks}
          running={running}
          error={runError}
          onRetry={() => batchId && void startRun(batchId, validCount, inserted)}
        />
      )}

      {step === "done" && final && batchId && (
        <DoneStep isManager={isManager} batchId={batchId} result={final} fallbacks={fallbacks} onAgain={resetAll} />
      )}

      {confirmStartOver && (
        <Dialog title="Discard this upload?" onClose={() => setConfirmStartOver(false)}>
          <p className={MUTED}>
            The leads from this earlier upload haven&apos;t been assigned yet. Discarding removes them from the queue; you
            would need to upload the file again.
          </p>
          <DialogButtons
            onCancel={() => setConfirmStartOver(false)}
            onConfirm={() => {
              setConfirmStartOver(false);
              void startOver();
            }}
            cancelLabel="Keep it"
            confirmLabel="Discard upload"
            danger
          />
        </Dialog>
      )}

      {confirmDownload && (
        <Dialog title={`Download a list of ${fmtN(invalidRows.length)} skipped rows?`} onClose={() => setConfirmDownload(false)}>
          <p className={MUTED}>A CSV with the row number and the reason each row was skipped.</p>
          <DialogButtons
            onCancel={() => setConfirmDownload(false)}
            onConfirm={downloadSkipped}
            confirmLabel="Download"
          />
        </Dialog>
      )}
    </div>
  );
}

// -- Small shared pieces ------------------------------------------------------

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/55 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated dark:bg-[#12283f]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-[16px] font-bold text-navy dark:text-[#eef3f8]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="text-[12.5px] font-semibold text-muted dark:text-[#7f93aa]"
          >
            Close
          </button>
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

function DialogButtons({
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel = "Cancel",
  busy = false,
  danger = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2.5 border-t border-sand pt-4 dark:border-white/10">
      <button type="button" onClick={onCancel} disabled={busy} className={BTN_SECONDARY}>
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className={danger ? "press rounded-[10px] bg-alert-red px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50" : BTN_PRIMARY}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-[10px] bg-cream px-3 py-2 dark:bg-[#0b1a2b]">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-taupe-2 dark:text-[#7f93aa]">{label}</div>
      <div className="mt-0.5 text-[17px] font-extrabold text-navy dark:text-[#eef3f8]">{fmtN(value)}</div>
    </div>
  );
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">{label}</div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2.5 w-full overflow-hidden rounded-full bg-cream dark:bg-[#0b1a2b]"
      >
        <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-[11px] bg-cream p-1 dark:bg-[#0b1a2b]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-[8px] px-2 py-1.5 text-[12.5px] font-semibold transition-colors ${
            value === o.id
              ? "bg-white text-navy shadow-sm dark:bg-[#12283f] dark:text-[#eef3f8]"
              : "text-taupe hover:text-navy dark:text-[#7f93aa] dark:hover:text-[#eef3f8]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto" aria-label="Progress">
      {steps.map((s, i) => (
        <li
          key={s}
          aria-current={i === current ? "step" : undefined}
          className={`flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
            i === current
              ? "bg-brand text-white dark:bg-gold dark:text-navy"
              : i < current
                ? "text-green"
                : "text-taupe dark:text-[#7f93aa]"
          }`}
        >
          <span>{i < current ? "✓" : i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

// -- Recent uploads -----------------------------------------------------------

const STATUS_LABEL: Record<BatchSummary["status"], string> = {
  staged: "Not assigned",
  assigning: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

function RecentUploads({
  batches,
  onResume,
  disabled,
}: {
  batches: BatchSummary[];
  onResume: (b: BatchSummary) => void;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<BatchSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (batches.length === 0) return null;

  async function doCancel() {
    if (!target || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await cancelBatch(target.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      setTarget(null);
      router.refresh();
    } catch {
      setError(OFFLINE);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={CARD}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-[13.5px] font-bold text-navy dark:text-[#eef3f8]"
      >
        <span>Your recent uploads ({batches.length})</span>
        <span className="text-[12px] text-taupe dark:text-[#7f93aa]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul className="mt-3 flex flex-col divide-y divide-sand dark:divide-white/10">
          {batches.map((b) => {
            const unfinished = b.status === "staged" || b.status === "assigning";
            return (
              <li key={b.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-navy dark:text-[#eef3f8]">
                      {b.filename ?? "Untitled upload"}
                    </div>
                    <div className={MUTED}>{fmtDate(b.createdAt)}</div>
                  </div>
                  <span
                    className={`flex-none rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                      b.status === "done"
                        ? "bg-green/15 text-green"
                        : "bg-gold/20 text-navy dark:text-[#eef3f8]"
                    }`}
                  >
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
                <div className={MUTED}>
                  {fmtN(b.insertedRows)} added · {fmtN(b.duplicateRows)} duplicates · {fmtN(b.invalidRows)} invalid
                  {b.status === "done" && ` · ${fmtN(b.emailsSent)} emails sent · ${fmtN(b.emailsSkipped)} skipped`}
                </div>
                {unfinished && (
                  <div className="flex gap-2">
                    {(b.status === "assigning" || b.validRows > 0) && (
                      <button type="button" disabled={disabled} onClick={() => onResume(b)} className={BTN_PRIMARY}>
                        Resume
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setError(null);
                        setTarget(b);
                      }}
                      className={BTN_SECONDARY}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {target && (
        <Dialog title="Cancel this upload?" onClose={() => !pending && setTarget(null)}>
          <p className={MUTED}>Cancel this upload? Leads already created from it stay where they are.</p>
          {error && <p className={`mt-3 ${ERROR_TEXT}`}>{error}</p>}
          <DialogButtons
            onCancel={() => setTarget(null)}
            onConfirm={() => void doCancel()}
            cancelLabel="Keep it"
            confirmLabel={pending ? "Cancelling…" : "Cancel upload"}
            busy={pending}
            danger
          />
        </Dialog>
      )}
    </div>
  );
}

// -- 1 Source -----------------------------------------------------------------

function SourceStep({
  onLoaded,
  error,
  setError,
}: {
  onLoaded: (h: string[], r: Record<string, string>[], name: string, src: "csv" | "sheet", found: number) => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [tab, setTab] = useState<"csv" | "sheet">("csv");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file || loading) return;
    setError(null);
    if (file.size === 0) {
      setError("That file is empty.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is larger than 15 MB. Split it into smaller files.");
      return;
    }
    setLoading(true);
    try {
      const text = (await file.text()).replace(/^﻿/, "");
      const { headers, rows } = csvToObjects(text);
      if (headers.length === 0 || rows.length === 0) {
        setError("That file has no lead rows. Check it has a header row and at least one lead.");
        return;
      }
      onLoaded(headers, rows, file.name, "csv", rows.length);
    } catch {
      setError("Couldn't read that file. Make sure it is a CSV.");
    } finally {
      setLoading(false);
    }
  }

  async function onSheet() {
    if (!url.trim() || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await loadSheet(url.trim());
      if (!("headers" in res)) {
        setError(res.error);
        return;
      }
      onLoaded(res.headers, res.rows, "Google Sheet", "sheet", res.totalRows);
    } catch {
      setError(OFFLINE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${CARD} flex flex-col gap-4`}>
      <Segmented
        label="Where is your lead list?"
        value={tab}
        onChange={(t) => {
          setTab(t);
          setError(null);
        }}
        options={[
          { id: "csv", label: "CSV file" },
          { id: "sheet", label: "Google Sheet link" },
        ]}
      />

      {tab === "csv" ? (
        <label className="block">
          <span className={LABEL}>Choose a CSV file (up to 15 MB)</span>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={loading}
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="mt-1.5 block w-full text-[13px] text-navy file:mr-3 file:rounded-[10px] file:border-0 file:bg-brand file:px-4 file:py-2.5 file:text-[13px] file:font-semibold file:text-white dark:text-[#eef3f8] dark:file:bg-gold dark:file:text-navy"
          />
        </label>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="block">
            <span className={LABEL}>Google Sheet link</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className={`${INPUT} mt-1.5`}
            />
          </label>
          <p className={MUTED}>
            Share the sheet as &ldquo;Anyone with the link → Viewer&rdquo;, or use File → Share → Publish to web → CSV.
          </p>
          <div>
            <button type="button" disabled={loading || !url.trim()} onClick={() => void onSheet()} className={BTN_PRIMARY}>
              {loading ? "Loading…" : "Load"}
            </button>
          </div>
        </div>
      )}

      {loading && tab === "csv" && <p className={MUTED}>Reading file…</p>}
      {error && <p className={ERROR_TEXT}>{error}</p>}
    </div>
  );
}

// -- 2 Map columns --------------------------------------------------------------

const REQUIRED: TargetField[] = ["full_name", "phone"];
const PREVIEW_COLS = ["Name", "Phone", "DOB", "Gender", "Smoker", "Occupation", "Address", "Source", "Remark"];

function MapStep(props: {
  headers: string[];
  rows: Record<string, string>[];
  foundRows: number;
  filename: string;
  fieldCols: Partial<Record<TargetField, string>>;
  setFieldCols: (v: Partial<Record<TargetField, string>>) => void;
  noteCols: string[];
  setNoteCols: (v: string[]) => void;
  mapping: ImportMapping;
  defaults: RowDefaults;
  interest: string;
  setInterest: (v: string) => void;
  leadSource: string;
  setLeadSource: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { headers, rows, mapping, defaults } = props;

  const preview = useMemo(() => {
    const first = rows.slice(0, MAX_FIELD_PREVIEW).map((r) => buildImportRow(r, mapping, defaults));
    return {
      valid: first.filter((r) => r.row).length,
      checked: first.length,
      sample: first.slice(0, 5),
    };
  }, [rows, mapping, defaults]);

  const mappedCols = new Set(Object.values(props.fieldCols));
  const extraCols = headers.filter((h) => !mappedCols.has(h));
  const ready = Boolean(props.fieldCols.full_name && props.fieldCols.phone);

  function setField(f: TargetField, col: string) {
    const next = { ...props.fieldCols };
    if (col) next[f] = col;
    else delete next[f];
    props.setFieldCols(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={CARD}>
        <div className="text-[14px] font-bold text-navy dark:text-[#eef3f8]">Match your columns to CRM fields</div>
        <p className={`${MUTED} mt-0.5`}>
          {props.filename} · {fmtN(rows.length)} rows
        </p>
        {props.foundRows > rows.length && (
          <p
            role="status"
            className="mt-3 rounded-[10px] bg-warn-gold-bg px-3 py-2 text-[12.5px] font-semibold text-warn-gold-text"
          >
            Only the first {fmtN(MAX_UPLOAD_ROWS)} of {fmtN(props.foundRows)} rows will be uploaded.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          {TARGET_FIELDS.map((f) => (
            <label key={f} className="block">
              <span className="text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
                {TARGET_FIELD_LABELS[f]}
                {REQUIRED.includes(f) && <span className="text-alert-red"> *</span>}
              </span>
              <select
                value={props.fieldCols[f] ?? ""}
                onChange={(e) => setField(f, e.target.value)}
                className={`${INPUT} mt-1`}
              >
                <option value="">— don&apos;t import —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {extraCols.length > 0 && (
        <div className={CARD}>
          <div className="text-[14px] font-bold text-navy dark:text-[#eef3f8]">Extra columns to keep in the remark</div>
          <p className={`${MUTED} mt-0.5`}>Ticked columns are added to the lead&apos;s remark as &ldquo;Column: value&rdquo;.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {extraCols.map((h) => (
              <label key={h} className="flex items-center gap-2 text-[12.5px] font-medium text-navy dark:text-[#eef3f8]">
                <input
                  type="checkbox"
                  checked={props.noteCols.includes(h)}
                  onChange={(e) =>
                    props.setNoteCols(e.target.checked ? [...props.noteCols, h] : props.noteCols.filter((x) => x !== h))
                  }
                  className="h-4 w-4 flex-none accent-[#c9a24b]"
                />
                <span className="min-w-0 truncate" title={h}>
                  {normalizeHeader(h) || h}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className={CARD}>
        <div className="text-[14px] font-bold text-navy dark:text-[#eef3f8]">Defaults for every lead (optional)</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">Product interest</span>
            <select value={props.interest} onChange={(e) => props.setInterest(e.target.value)} className={`${INPUT} mt-1`}>
              <option value="">None</option>
              {INTEREST_OPTIONS.map((o) => (
                <option key={o.label} value={o.label}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">Lead source</span>
            <select value={props.leadSource} onChange={(e) => props.setLeadSource(e.target.value)} className={`${INPUT} mt-1`}>
              <option value="">None</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={CARD}>
        <div className="text-[14px] font-bold text-navy dark:text-[#eef3f8]">Preview</div>
        <p className={`mt-0.5 text-[12px] font-semibold ${ready && preview.valid < preview.checked ? "text-alert-red" : "text-green"}`}>
          {ready
            ? `${fmtN(preview.valid)} of the first ${fmtN(preview.checked)} rows look valid`
            : "Map Full Name and Phone Number to see a preview."}
        </p>
        {ready && (
          <div className="mt-3 overflow-x-auto rounded-[10px] border border-sand dark:border-white/10">
            <table className="w-full min-w-[720px] text-left text-[12px]">
              <thead>
                <tr className="bg-cream dark:bg-[#0b1a2b]">
                  {PREVIEW_COLS.map((c) => (
                    <th key={c} className="px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-taupe-2 dark:text-[#7f93aa]">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((r, i) =>
                  r.row ? (
                    <tr key={i} className="border-t border-sand text-navy dark:border-white/10 dark:text-[#eef3f8]">
                      <td className="px-2.5 py-2">{r.row.full_name}</td>
                      <td className="px-2.5 py-2">{r.row.phone}</td>
                      <td className="px-2.5 py-2">{r.row.date_of_birth ?? "—"}</td>
                      <td className="px-2.5 py-2">{r.row.gender ?? "—"}</td>
                      <td className="px-2.5 py-2">{r.row.is_smoker === null ? "—" : r.row.is_smoker ? "Yes" : "No"}</td>
                      <td className="px-2.5 py-2">{r.row.occupation ?? "—"}</td>
                      <td className="max-w-[160px] truncate px-2.5 py-2">{r.row.address ?? "—"}</td>
                      <td className="px-2.5 py-2">{r.row.lead_source ?? "—"}</td>
                      <td className="max-w-[200px] truncate px-2.5 py-2">{r.row.agent_remark ?? "—"}</td>
                    </tr>
                  ) : (
                    <tr key={i} className="border-t border-sand dark:border-white/10">
                      <td colSpan={PREVIEW_COLS.length} className="px-2.5 py-2 font-semibold text-alert-red">
                        Row {i + 2}: {r.reason ?? "invalid row"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-2.5">
        <button type="button" onClick={props.onBack} className={BTN_SECONDARY}>
          Back
        </button>
        <button type="button" disabled={!ready} onClick={props.onContinue} className={BTN_PRIMARY}>
          Continue
        </button>
      </div>
    </div>
  );
}

// -- 3 Review -----------------------------------------------------------------

function ReviewStep(props: {
  isManager: boolean;
  total: number;
  staging: boolean;
  stageDone: number;
  stageError: string | null;
  stats: Stats | null;
  invalidCount: number;
  busy: boolean;
  error: string | null;
  onRetry: () => void;
  onContinue: () => void;
  onDownload: () => void;
  onStartOver: () => void;
  onBack: () => void;
}) {
  const { stats } = props;
  return (
    <div className={`${CARD} flex flex-col gap-4`}>
      <div className="text-[14px] font-bold text-navy dark:text-[#eef3f8]">Review your file</div>

      {!stats && (props.staging || !props.stageError) && (
        <ProgressBar
          value={props.stageDone}
          max={props.total}
          label={
            props.stageDone >= props.total && props.total > 0
              ? "Checking for duplicates…"
              : `Reading rows… ${fmtN(props.stageDone)} / ${fmtN(props.total)}`
          }
        />
      )}

      {props.stageError && !props.staging && (
        <div className="flex flex-col gap-2">
          <p className={ERROR_TEXT}>{props.stageError}</p>
          <div>
            <button type="button" onClick={props.onRetry} className={BTN_PRIMARY}>
              Retry
            </button>
          </div>
        </div>
      )}

      {stats && (
        <>
          <div className="flex gap-2.5 border-y border-sand py-3 dark:border-white/10">
            <Figure label="Ready to import" value={stats.valid} />
            <Figure label="Already in CRM or repeated" value={stats.duplicates} />
            <Figure label="Couldn't read" value={stats.invalid} />
          </div>

          {props.invalidCount > 0 && (
            <div>
              <button type="button" onClick={props.onDownload} className={BTN_SECONDARY}>
                Download skipped rows (CSV)
              </button>
            </div>
          )}

          {props.error && <p className={ERROR_TEXT}>{props.error}</p>}

          {stats.valid === 0 ? (
            <div className="flex flex-col gap-3">
              <p className={ERROR_TEXT}>None of the rows can be imported. Check the column mapping or your file.</p>
              <div>
                <button type="button" onClick={props.onStartOver} className={BTN_PRIMARY}>
                  Start over
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-2.5 border-t border-sand pt-4 dark:border-white/10">
              <button type="button" disabled={props.busy} onClick={props.onBack} className={BTN_SECONDARY}>
                Start over
              </button>
              <button type="button" disabled={props.busy} onClick={props.onContinue} className={BTN_PRIMARY}>
                {props.isManager ? "Continue" : props.busy ? "Saving…" : "Import to my leads"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// -- 4 Assign (managers) ---------------------------------------------------------

const ASSIGN_MODES: { id: AssignMode; label: string }[] = [
  { id: "even", label: "Even" },
  { id: "percent", label: "By %" },
  { id: "count", label: "By number" },
  { id: "self", label: "Keep all for me" },
];

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super admin",
  group_manager: "Group manager",
  unit_manager: "Unit manager",
  aspirant_unit_manager: "Aspirant unit manager",
  agent: "Agent",
};

type StagedLead = { idx: number; name: string; phone: string };

function AssignStep({
  team,
  valid,
  batchId,
  busy,
  error,
  onSubmit,
}: {
  team: TeamMember[];
  valid: number;
  batchId: string;
  busy: boolean;
  error: string | null;
  onSubmit: (req: PlanRequest) => void;
}) {
  const [mode, setMode] = useState<AssignMode>("even");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [confirm, setConfirm] = useState(false);

  // Pinning
  const [pinOpen, setPinOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageRows, setPageRows] = useState<StagedLead[]>([]);
  const [pageTotal, setPageTotal] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const recipients = team.filter((m) => selected.has(m.id));
  const members: PlanMember[] = recipients.map((m) => ({ id: m.id, name: m.name, load: m.load }));
  const pinned = Object.entries(overrides);
  const pinnedCount = pinned.length;
  const rest = valid - pinnedCount;

  function seed(next: AssignMode, ids: string[], restCount: number): Record<string, string> {
    if (next === "even" || next === "self" || ids.length === 0) return {};
    const even = computeTargets(
      "even",
      ids.map((id) => ({ id, name: team.find((t) => t.id === id)?.name ?? id, current: -(team.find((t) => t.id === id)?.load ?? 0) })),
      undefined,
      restCount,
    );
    const out: Record<string, string> = {};
    for (const id of ids) {
      const t = even.targets?.get(id) ?? 0;
      out[id] =
        next === "count"
          ? String(t)
          : String(restCount > 0 ? Math.round((t / restCount) * 10000) / 100 : Math.round((100 / ids.length) * 100) / 100);
    }
    return out;
  }

  function pickMode(next: AssignMode) {
    if (next === mode) return;
    setMode(next);
    setValues(seed(next, [...selected], rest));
  }

  function applySelection(next: Set<string>) {
    setSelected(next);
    // Pins to someone no longer receiving leads are dropped.
    const kept: Record<number, string> = {};
    for (const [k, v] of Object.entries(overrides)) if (next.has(v)) kept[Number(k)] = v;
    setOverrides(kept);
    setValues(seed(mode, [...next], valid - Object.keys(kept).length));
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    applySelection(next);
  }

  const numeric = useMemo(() => {
    const out: Record<string, number> = {};
    for (const id of selected) {
      const raw = (values[id] ?? "").trim();
      if (raw !== "") out[id] = Number(raw);
    }
    return out;
  }, [selected, values]);

  const preview = useMemo<{ error: string | null; counts: Map<string, number> }>(() => {
    const counts = new Map<string, number>();
    if (mode === "self") return { error: null, counts };
    if (members.length === 0) return { error: "Tick at least one person to receive the leads.", counts };
    for (const id of Object.values(overrides)) counts.set(id, (counts.get(id) ?? 0) + 1);
    const remaining = valid - Object.keys(overrides).length;
    if (remaining > 0) {
      const r = planAssignments(remaining, members, { mode, values: mode === "even" ? undefined : numeric });
      if (r.error !== undefined) return { error: r.error, counts };
      for (const [id, c] of r.counts) counts.set(id, (counts.get(id) ?? 0) + c);
    }
    return { error: null, counts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected, numeric, overrides, valid, team]);

  const entered = recipients.reduce((s, m) => s + (Number(values[m.id]) || 0), 0);
  const problem = preview.error;
  const agentCount = [...preview.counts.entries()].filter(([id, c]) => c > 0 && id).length;

  async function loadPage(p: number) {
    setPageLoading(true);
    setPageError(null);
    try {
      const res = await getStagedPage(batchId, p);
      if (res.error) {
        setPageError(res.error);
        return;
      }
      setPageRows(res.rows ?? []);
      setPageTotal(res.total ?? 0);
      setPage(p);
    } catch {
      setPageError(OFFLINE);
    } finally {
      setPageLoading(false);
    }
  }

  function togglePins() {
    const next = !pinOpen;
    setPinOpen(next);
    if (next && pageRows.length === 0) void loadPage(0);
  }

  function submit() {
    if (mode === "self") {
      onSubmit({ mode: "self" });
      return;
    }
    const ov: Record<string, string> = {};
    for (const [k, v] of Object.entries(overrides)) ov[String(k)] = v;
    onSubmit({
      mode,
      recipients: [...selected],
      values: mode === "even" ? undefined : numeric,
      overrides: pinnedCount > 0 ? ov : undefined,
    });
  }

  const pages = Math.max(1, Math.ceil(pageTotal / 100));
  const confirmLabel = mode === "self" ? "Import to my leads" : `Assign ${fmtN(valid)} leads`;

  return (
    <div className="flex flex-col gap-4">
      <div className={`${CARD} flex flex-col gap-3`}>
        <div>
          <div className="text-[14px] font-bold text-navy dark:text-[#eef3f8]">Who gets these {fmtN(valid)} leads?</div>
          <p className={`${MUTED} mt-0.5`}>Tick the people who should receive leads, then choose how to split them.</p>
        </div>

        <Segmented label="How to split the leads" value={mode} onChange={pickMode} options={ASSIGN_MODES} />

        {mode === "self" ? (
          <p className={MUTED}>All {fmtN(valid)} leads will be added to your own list. Nobody is emailed.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 text-[11.5px] font-semibold">
              <span className="text-taupe dark:text-[#7f93aa]">{recipients.length} selected</span>
              <span className="flex gap-3">
                <button
                  type="button"
                  onClick={() => applySelection(new Set(team.map((t) => t.id)))}
                  className="text-info-blue-text hover:underline dark:text-[#8fb4dd]"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => applySelection(new Set())}
                  className="text-info-blue-text hover:underline dark:text-[#8fb4dd]"
                >
                  Clear
                </button>
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {team.map((m) => {
                const on = selected.has(m.id);
                const count = preview.counts.get(m.id);
                return (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(m.id)}
                      aria-label={`Include ${m.name}`}
                      className="h-4 w-4 flex-none accent-[#c9a24b]"
                    />
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[9px] bg-brand text-[10px] font-bold text-gold dark:bg-[#0b1a2b]">
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
                        {m.isSelf ? `${m.name} (You)` : m.name}
                        <span className="ml-1.5 text-[10.5px] font-medium text-taupe dark:text-[#7f93aa]">
                          {ROLE_LABEL[m.role] ?? m.role}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-taupe dark:text-[#7f93aa]">
                        {fmtN(m.load)} open leads now
                        {on && !problem && count !== undefined && (
                          <>
                            {" → "}
                            <span className="font-bold text-navy dark:text-[#eef3f8]">+{fmtN(count)}</span>
                            <span className="ml-1.5 text-[10.5px] font-semibold">
                              · {valid > 0 ? Math.round((count / valid) * 100) : 0}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {on && mode !== "even" && (
                      <label className="flex flex-none items-center gap-1">
                        <input
                          type="number"
                          inputMode={mode === "count" ? "numeric" : "decimal"}
                          min={0}
                          max={mode === "percent" ? 100 : undefined}
                          step={mode === "count" ? 1 : "any"}
                          value={values[m.id] ?? ""}
                          onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
                          aria-label={`${m.name} ${mode === "count" ? "number of leads" : "percent share"}`}
                          className="w-[64px] rounded-[9px] border border-sand-2 bg-white px-2 py-1.5 text-right text-[13px] font-semibold text-navy outline-none focus:border-gold dark:border-white/10 dark:bg-[#0b1a2b] dark:text-[#eef3f8]"
                        />
                        <span className="w-3 text-[11px] font-semibold text-taupe dark:text-[#7f93aa]">
                          {mode === "percent" ? "%" : ""}
                        </span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {mode !== "even" && recipients.length > 0 && (
              <div className="flex items-center justify-between gap-3 text-[11.5px] font-semibold">
                <span className={problem ? "text-alert-red" : "text-green"}>
                  {mode === "percent" ? `Total ${Math.round(entered * 10) / 10}%` : `Placed ${fmtN(entered)} of ${fmtN(rest)}`}
                  {problem ? "" : " ✓"}
                </span>
                <button
                  type="button"
                  onClick={() => setValues(seed(mode, [...selected], rest))}
                  className="text-info-blue-text hover:underline dark:text-[#8fb4dd]"
                >
                  Reset to even
                </button>
              </div>
            )}

            {problem && <p className={ERROR_TEXT}>{problem}</p>}

            {!problem && recipients.length > 0 && (
              <div className="border-t border-sand pt-3 text-[12px] font-semibold text-navy dark:border-white/10 dark:text-[#eef3f8]">
                Total {fmtN([...preview.counts.values()].reduce((a, b) => a + b, 0))} leads to {agentCount} {agentCount === 1 ? "person" : "people"}
                {pinnedCount > 0 && (
                  <span className="block font-medium text-taupe dark:text-[#7f93aa]">
                    {fmtN(pinnedCount)} lead{pinnedCount === 1 ? "" : "s"} pinned — the rest are split as above.
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {mode !== "self" && recipients.length > 0 && (
        <div className={CARD}>
          <button
            type="button"
            onClick={togglePins}
            aria-expanded={pinOpen}
            className="flex w-full items-center justify-between text-left text-[13.5px] font-bold text-navy dark:text-[#eef3f8]"
          >
            <span>Assign specific leads (optional){pinnedCount > 0 ? ` · ${fmtN(pinnedCount)} pinned` : ""}</span>
            <span className="text-[12px] text-taupe dark:text-[#7f93aa]">{pinOpen ? "Hide" : "Show"}</span>
          </button>
          {pinOpen && (
            <div className="mt-3 flex flex-col gap-3">
              {pinnedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOverrides({});
                    setValues(seed(mode, [...selected], valid));
                  }}
                  className="self-start text-[11.5px] font-semibold text-info-blue-text hover:underline dark:text-[#8fb4dd]"
                >
                  Clear pins
                </button>
              )}
              {pageError && <p className={ERROR_TEXT}>{pageError}</p>}
              <div className="overflow-x-auto rounded-[10px] border border-sand dark:border-white/10">
                <table className="w-full min-w-[420px] text-left text-[12px]">
                  <thead>
                    <tr className="bg-cream dark:bg-[#0b1a2b]">
                      {["#", "Name", "Phone", "Assign to"].map((c) => (
                        <th key={c} className="px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-taupe-2 dark:text-[#7f93aa]">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.idx} className="border-t border-sand text-navy dark:border-white/10 dark:text-[#eef3f8]">
                        <td className="px-2.5 py-1.5">{r.idx + 1}</td>
                        <td className="px-2.5 py-1.5">{r.name}</td>
                        <td className="px-2.5 py-1.5">{r.phone}</td>
                        <td className="px-2.5 py-1.5">
                          <select
                            aria-label={`Assign ${r.name}`}
                            value={overrides[r.idx] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              const next = { ...overrides };
                              if (v) next[r.idx] = v;
                              else delete next[r.idx];
                              setOverrides(next);
                              setValues(seed(mode, [...selected], valid - Object.keys(next).length));
                            }}
                            className="w-full rounded-[8px] border border-sand-2 bg-white px-2 py-1 text-[12px] text-navy dark:border-white/10 dark:bg-[#0b1a2b] dark:text-[#eef3f8]"
                          >
                            <option value="">Auto</option>
                            {recipients.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-navy dark:text-[#eef3f8]">
                <button type="button" disabled={pageLoading || page === 0} onClick={() => void loadPage(page - 1)} className={BTN_SECONDARY}>
                  Previous
                </button>
                <span>
                  {pageLoading ? "Loading…" : `Page ${page + 1} of ${pages}`}
                </span>
                <button type="button" disabled={pageLoading || page + 1 >= pages} onClick={() => void loadPage(page + 1)} className={BTN_SECONDARY}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className={ERROR_TEXT}>{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy || Boolean(problem)}
          onClick={() => (mode === "self" ? submit() : setConfirm(true))}
          className={BTN_PRIMARY}
        >
          {busy ? "Saving…" : confirmLabel}
        </button>
      </div>

      {confirm && (
        <Dialog title={`Assign ${fmtN(valid)} leads to ${agentCount} ${agentCount === 1 ? "agent" : "agents"}?`} onClose={() => setConfirm(false)}>
          <p className={MUTED}>Each agent will get a notification and one email.</p>
          <DialogButtons
            onCancel={() => setConfirm(false)}
            onConfirm={() => {
              setConfirm(false);
              submit();
            }}
            confirmLabel="Assign"
          />
        </Dialog>
      )}
    </div>
  );
}

// -- Run + Done -------------------------------------------------------------------

function RunStep({
  inserted,
  total,
  fallbacks,
  running,
  error,
  onRetry,
}: {
  inserted: number;
  total: number;
  fallbacks: number;
  running: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className={`${CARD} flex flex-col gap-4`}>
      <div className="text-[14px] font-bold text-navy dark:text-[#eef3f8]">Adding your leads</div>
      <ProgressBar
        value={inserted}
        max={total}
        label={running ? `Adding leads… ${fmtN(inserted)} / ${fmtN(total)}` : `${fmtN(inserted)} / ${fmtN(total)} added`}
      />
      <p className={MUTED}>Keep this page open until it finishes.</p>
      {fallbacks > 0 && (
        <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-200">
          {fmtN(fallbacks)} lead{fallbacks === 1 ? " was" : "s were"} kept by you because an agent was no longer available.
        </p>
      )}
      {error && !running && (
        <div className="flex flex-col gap-2">
          <p className={ERROR_TEXT}>{error}</p>
          <div>
            <button type="button" onClick={onRetry} className={BTN_PRIMARY}>
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DoneStep({
  isManager,
  batchId,
  result,
  fallbacks,
  onAgain,
}: {
  isManager: boolean;
  batchId: string;
  result: FinalizeResult;
  fallbacks: number;
  onAgain: () => void;
}) {
  const n = result.inserted ?? 0;
  const notified = result.notified ?? 0;
  return (
    <div className={`${CARD} flex flex-col items-center gap-3 text-center`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-[22px] font-bold text-navy">✓</div>
      <div className="text-[16px] font-bold text-navy dark:text-[#eef3f8]">
        {fmtN(n)} lead{n === 1 ? "" : "s"} uploaded
      </div>

      {isManager && (result.perAgent?.length ?? 0) > 0 && (
        <ul className="w-full max-w-sm divide-y divide-sand rounded-[10px] border border-sand text-left dark:divide-white/10 dark:border-white/10">
          {result.perAgent?.map((a) => (
            <li key={a.agentId} className="flex justify-between gap-3 px-3 py-2 text-[12.5px] font-semibold text-navy dark:text-[#eef3f8]">
              <span className="min-w-0 truncate">{a.name}</span>
              <span>{fmtN(a.count)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className={MUTED}>
        {fmtN(result.duplicates ?? 0)} duplicate{(result.duplicates ?? 0) === 1 ? "" : "s"} skipped ·{" "}
        {fmtN(result.invalid ?? 0)} couldn&apos;t be read
      </p>
      {isManager && notified > 0 && (
        <p className={MUTED}>
          {fmtN(notified)} agent{notified === 1 ? "" : "s"} notified (bell + email)
        </p>
      )}
      {fallbacks > 0 && (
        <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-200">
          {fmtN(fallbacks)} lead{fallbacks === 1 ? " was" : "s were"} kept by you because an agent was no longer available.
        </p>
      )}

      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <Link href={isManager ? `/leads?batch=${batchId}` : "/leads"} className={BTN_PRIMARY}>
          View leads
        </Link>
        <button type="button" onClick={onAgain} className={BTN_SECONDARY}>
          Upload another
        </button>
      </div>
    </div>
  );
}
