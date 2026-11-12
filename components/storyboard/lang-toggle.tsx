"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStoryboardLang } from "@/lib/storyboard/i18n/actions";
import { t, type Lang } from "@/lib/storyboard/i18n";

const OPTIONS: { lang: Lang; short: string; name: "lang.optionEn" | "lang.optionBm" }[] = [
  { lang: "en", short: "EN", name: "lang.optionEn" },
  { lang: "bm", short: "BM", name: "lang.optionBm" },
];

/**
 * 'EN | BM' segmented control. Each segment is a toggle button (aria-pressed)
 * with a 44px target. Choosing one sets the sb_lang cookie on the server and
 * refreshes the page; a polite live region announces the new language.
 */
export function LangToggle({ lang, className = "" }: { lang: Lang; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [announce, setAnnounce] = useState("");

  function choose(next: Lang) {
    if (next === lang || pending) return;
    startTransition(async () => {
      try {
        const res = await setStoryboardLang(next);
        if (res.error) {
          setAnnounce(t("lang.failed", lang));
          return;
        }
        const name = t(next === "bm" ? "lang.optionBm" : "lang.optionEn", next);
        setAnnounce(t("lang.announce", next, { name }));
        router.refresh();
      } catch {
        setAnnounce(t("lang.failed", lang));
      }
    });
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div
        role="group"
        aria-label={t("lang.group", lang)}
        className="inline-flex overflow-hidden rounded-[12px] border border-sand-2 bg-white"
      >
        {OPTIONS.map((o) => {
          const on = o.lang === lang;
          return (
            <button
              key={o.lang}
              type="button"
              aria-pressed={on}
              lang={o.lang === "bm" ? "ms" : "en"}
              disabled={pending}
              onClick={() => choose(o.lang)}
              className={`min-h-11 min-w-11 px-3.5 text-[13px] font-bold tracking-wide focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand disabled:cursor-wait ${
                on ? "bg-navy text-cream" : "bg-white text-navy hover:bg-sand-3"
              }`}
            >
              {o.short}
              <span className="sr-only"> {t(o.name, lang)}</span>
            </button>
          );
        })}
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
    </div>
  );
}
