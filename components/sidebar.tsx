"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSignOut } from "@/lib/use-sign-out";
import { visibleNav } from "@/lib/nav";
import { SignOutIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme";
import { ROLE_LABEL, type CurrentProfile } from "@/lib/profile-types";

export function Sidebar({ profile }: { profile: CurrentProfile }) {
  const pathname = usePathname();
  const items = visibleNav(profile.role);
  const { signOut, pending, error } = useSignOut();

  return (
    <div className="hidden w-[226px] flex-none flex-col bg-navy py-[22px] lg:flex">
      <div className="flex items-center gap-[10px] px-[18px] pb-5">
        <Image
          src="/logo.jpeg"
          alt="Prestige Legacy"
          width={32}
          height={32}
          className="h-8 w-8 flex-none rounded-[10px] object-cover"
        />
        <div className="text-[14px] font-bold text-white">Prestige Legacy</div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 text-[13px]">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-[11px] rounded-[10px] bg-gold/[.14] px-[13px] py-[10px] font-semibold text-gold"
                  : "flex items-center gap-[11px] rounded-[10px] px-[13px] py-[10px] font-medium text-white/65 hover:bg-white/5 hover:text-white/90"
              }
            >
              <Icon width={17} height={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-[10px] border-t border-white/10 px-[18px] pt-[18px]">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-green text-[11.5px] font-bold text-white">
          {profile.avatar_initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold text-white">
            {profile.full_name}
          </div>
          <div className="truncate text-[10.5px] text-white/42">
            {ROLE_LABEL[profile.role]}
            {profile.unit_name ? ` · ${profile.unit_name}` : ""}
          </div>
        </div>
        {/* Lives in the shell, so the theme can be switched from any screen
            and applies to the whole system, not just the Dashboard. */}
        <ThemeToggle className="flex-none" />
      </div>
      <div className="px-3">
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          className="mt-2 flex w-full items-center gap-2 rounded-[10px] px-[13px] py-[9px] text-[12px] font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white/85 disabled:opacity-60"
        >
          <SignOutIcon width={15} height={15} />
          {pending ? "Signing out…" : "Sign Out"}
        </button>
        {error && <div className="px-[13px] pt-1 text-[11px] font-medium text-alert-red">{error}</div>}
      </div>
    </div>
  );
}
