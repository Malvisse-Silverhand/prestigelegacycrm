import Link from "next/link";
import { t, type TKey } from "@/lib/storyboard/i18n";

export type ModuleKey = "hibah" | "medical" | "ci" | "business" | "mortgage";

const ORDER: ModuleKey[] = ["hibah", "medical", "ci", "business", "mortgage"];
const LABEL: Record<ModuleKey, TKey> = {
  hibah: "module.hibah",
  medical: "module.medical",
  ci: "module.ci",
  business: "module.business",
  mortgage: "module.mortgage",
};

type Props = {
  current: ModuleKey;
  /** Modules that have a saved storyboard (shows a dot). */
  saved?: ModuleKey[];
  hrefs: Record<ModuleKey, string>;
};

export function ModuleTabs({ current, saved = [], hrefs }: Props) {
  return (
    <nav aria-label={t("module.nav")}>
      <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0">
        {ORDER.map((key) => {
          const isCurrent = key === current;
          const isSaved = saved.includes(key);
          return (
            <li key={key} className="flex-none">
              <Link
                href={hrefs[key]}
                aria-current={isCurrent ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-[12px] border px-4 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  isCurrent ? "border-brand bg-brand text-white" : "border-sand bg-white text-ink"
                }`}
              >
                {t(LABEL[key])}
                {isSaved ? (
                  <>
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold" />
                    <span className="sr-only">({t("module.saved")})</span>
                  </>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
