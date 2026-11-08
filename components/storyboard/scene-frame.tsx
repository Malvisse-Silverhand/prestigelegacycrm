import type { ReactNode } from "react";
import { t } from "@/lib/storyboard/i18n";

type Props = {
  /** The 2D scene (svg / illustration). */
  children: ReactNode;
  caption?: ReactNode;
  legend?: ReactNode;
  /** Shows the "From official illustration" badge. */
  official?: boolean;
  className?: string;
};

export function SceneFrame({ children, caption, legend, official, className = "" }: Props) {
  return (
    <figure
      className={`m-0 overflow-hidden rounded-[20px] border border-sand bg-white shadow-card ${className}`}
    >
      <div className="relative aspect-[4/3] w-full bg-cream sm:aspect-[16/9]">
        <div className="absolute inset-0 flex items-center justify-center [&>svg]:h-full [&>svg]:w-full">
          {children}
        </div>
        {official ? (
          <span className="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white">
            {t("scene.official")}
          </span>
        ) : null}
      </div>
      {caption || legend ? (
        <div className="flex flex-col gap-3 border-t border-sand px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          {caption ? (
            <figcaption className="text-[13px] leading-relaxed text-ink">{caption}</figcaption>
          ) : null}
          {legend ? (
            <div
              role="group"
              aria-label={t("scene.legend")}
              className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-2"
            >
              {legend}
            </div>
          ) : null}
        </div>
      ) : null}
    </figure>
  );
}
