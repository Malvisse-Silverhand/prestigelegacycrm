type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
};

export function ShareSwitch({ checked, onChange, label, hint, disabled = false, id = "sb-share-switch" }: Props) {
  const hintId = `${id}-hint`;
  const labelId = `${id}-label`;
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 inline-flex h-11 w-14 flex-none items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className={`sb-reduce-transition absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 rounded-full transition-colors ${checked ? "bg-green" : "bg-taupe-2"}`}
        />
        <span
          aria-hidden="true"
          className={`sb-reduce-transition absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[26px]" : "translate-x-[2px]"}`}
        />
      </button>
      <div className="min-w-0 pt-1.5">
        <span id={labelId} className="block text-sm font-semibold text-navy">
          {label}
        </span>
        {hint ? (
          <span id={hintId} className="block text-xs leading-relaxed text-muted-2">
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
