import { t } from "@/lib/storyboard/i18n";

type Props = {
  /** ISO timestamp from the database. Never pass the client clock. */
  savedAt?: string | null;
  pending?: boolean;
  onSave: () => void;
  error?: string | null;
  disabled?: boolean;
};

/** HH:MM in Asia/Kuala_Lumpur, or null when the timestamp is invalid. */
export function formatSavedTime(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function SaveButton({ savedAt, pending = false, onSave, error, disabled }: Props) {
  const time = savedAt ? formatSavedTime(savedAt) : null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onSave}
        disabled={pending || disabled}
        aria-busy={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-[12px] bg-brand px-6 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t("common.saving") : t("common.save")}
      </button>
      <span role="status" aria-live="polite" className="text-xs">
        {error ? (
          <span className="font-semibold text-alert-red">{error}</span>
        ) : time ? (
          <span className="sb-pop inline-block font-semibold text-green">
            {t("common.savedAt", "en", { time })}
          </span>
        ) : null}
      </span>
    </div>
  );
}
