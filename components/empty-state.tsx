import type { ReactNode } from "react";
import Link from "next/link";

type Action = { label: string; href: string; variant?: "solid" | "outline" };

export function EmptyState({
  icon,
  title,
  description,
  actions,
  compact,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: Action[];
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-[20px] border border-sand bg-white px-9 py-8 text-center"
          : "rounded-[20px] border border-sand bg-white px-9 py-10 text-center shadow-card"
      }
    >
      <div
        className={
          compact
            ? "mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] border border-sand bg-cream"
            : "mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-[26px] border border-sand bg-cream"
        }
      >
        {icon}
      </div>
      <div className={compact ? "mt-4 text-base font-bold text-navy" : "mt-5 text-lg font-bold text-navy"}>
        {title}
      </div>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted-2">
        {description}
      </p>
      {actions && actions.length > 0 && (
        <div className="mt-[22px] flex justify-center gap-2.5">
          {actions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={
                a.variant === "outline"
                  ? "rounded-[11px] border border-sand-2 bg-white px-5 py-3 text-[13px] font-semibold text-navy"
                  : "rounded-[11px] bg-navy px-5 py-3 text-[13px] font-semibold text-white"
              }
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
