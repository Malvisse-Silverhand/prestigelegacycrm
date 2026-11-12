import Link from "next/link";
import { t, type Lang, type TKey } from "@/lib/storyboard/i18n";

export type StepKey = "fill" | "explain" | "risk" | "objection";

const ORDER: StepKey[] = ["fill", "explain", "risk", "objection"];
const LABEL: Record<StepKey, TKey> = {
  fill: "step.fill",
  explain: "step.explain",
  risk: "step.risk",
  objection: "step.objection",
};

type Props = {
  current: StepKey;
  /** Steps already completed. */
  done?: StepKey[];
  /** href for each step. A missing href renders a non-link. */
  hrefs: Partial<Record<StepKey, string>>;
  lang: Lang;
};

/** Server component: takes `lang` as a prop (hooks and context are for client components). */
export function StepTabs({ current, done = [], hrefs, lang }: Props) {
  return (
    <nav aria-label={t("step.nav", lang)}>
      <ol className="m-0 flex list-none gap-2 overflow-x-auto p-0">
        {ORDER.map((key, i) => {
          const isCurrent = key === current;
          const isDone = done.includes(key) && !isCurrent;
          const href = hrefs[key];
          const cls = `flex min-h-11 items-center gap-2 whitespace-nowrap rounded-[12px] border px-4 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
            isCurrent
              ? "border-brand bg-brand text-white"
              : isDone
                ? "border-sand bg-success-bg text-green"
                : "border-sand bg-white text-ink"
          }`;
          const inner = (
            <>
              <span aria-hidden="true">{isDone ? "✓" : i + 1}</span>
              <span>{t(LABEL[key], lang)}</span>
              {isDone ? <span className="sr-only">({t("step.done", lang)})</span> : null}
            </>
          );
          return (
            <li key={key} className="flex-none">
              {href ? (
                <Link href={href} className={cls} aria-current={isCurrent ? "step" : undefined}>
                  {inner}
                </Link>
              ) : (
                <span className={cls} aria-current={isCurrent ? "step" : undefined}>
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
