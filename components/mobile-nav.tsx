"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV } from "@/lib/nav";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-5 gap-0.5 border-t border-sand bg-white px-3.5 pt-[9px] pb-[env(safe-area-inset-bottom,9px)] lg:hidden">
      {MOBILE_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "flex flex-col items-center gap-1 py-[7px] text-[9.5px] font-bold text-navy"
                : "flex flex-col items-center gap-1 py-[7px] text-[9.5px] font-medium text-taupe"
            }
          >
            <Icon width={19} height={19} />
            {item.label}
            {active && <span className="h-[3px] w-4 rounded-[3px] bg-gold" />}
          </Link>
        );
      })}
    </div>
  );
}
