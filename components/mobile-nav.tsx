"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MOBILE_NAV_LEFT, MOBILE_NAV_RIGHT, visibleNav } from "@/lib/nav";
import { SignOutIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme";
import { useSignOut } from "@/lib/use-sign-out";
import { ROLE_LABEL, type CurrentProfile } from "@/lib/profile-types";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileNav({ profile }: { profile: CurrentProfile }) {
  const pathname = usePathname();
  // The route the drawer was opened on is stored with it, so any navigation
  // (including the hardware back button) closes it by derivation -- no effect
  // syncing state back to a prop.
  const [menu, setMenu] = useState({ open: false, at: pathname });
  const menuOpen = menu.open && menu.at === pathname;
  const openMenu = () => setMenu({ open: true, at: pathname });
  const closeMenu = () => setMenu((m) => ({ ...m, open: false }));

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    window.addEventListener("keydown", onKey);
    // Stop the page behind the drawer scrolling under the finger.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <>
      {menuOpen && <MenuDrawer profile={profile} onClose={closeMenu} />}

      <div className="grid grid-cols-5 items-end gap-0.5 border-t border-sand bg-white px-3.5 pt-[9px] pb-[env(safe-area-inset-bottom,9px)] lg:hidden dark:border-white/10 dark:bg-[#12283f]">
        {MOBILE_NAV_LEFT.map((item) => (
          <NavTab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}

        {/* Middle slot: opens the full nav rather than going anywhere itself. */}
        <button
          type="button"
          onClick={openMenu}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="flex flex-col items-center gap-1 py-[7px] text-[9.5px] font-bold text-navy dark:text-[#eef3f8]"
        >
          <span className="flex h-[38px] w-[38px] -translate-y-1.5 items-center justify-center rounded-full bg-gold shadow-[0_4px_12px_rgba(250,199,72,.5)]">
            <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="#0f2540" strokeWidth={2.4} strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </span>
          <span className="-mt-1.5">Menu</span>
        </button>

        {MOBILE_NAV_RIGHT.map((item) => (
          <NavTab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </div>
    </>
  );
}

function NavTab({
  item,
  active,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ width?: number; height?: number }> };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={
        active
          ? "flex flex-col items-center gap-1 py-[7px] text-[9.5px] font-bold text-navy dark:text-[#eef3f8]"
          : "flex flex-col items-center gap-1 py-[7px] text-[9.5px] font-medium text-taupe dark:text-[#7f93aa]"
      }
    >
      <Icon width={19} height={19} />
      {item.label}
      {active && <span className="h-[3px] w-4 rounded-[3px] bg-gold" />}
    </Link>
  );
}

// The same nav the desktop sidebar shows (role-filtered identically), plus the
// profile footer that used to be the only reason to visit /me.
function MenuDrawer({ profile, onClose }: { profile: CurrentProfile; onClose: () => void }) {
  const pathname = usePathname();
  const items = visibleNav(profile.role);
  const { signOut, pending, error } = useSignOut();

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-navy/55"
      />
      <div className="absolute inset-y-0 left-0 flex w-[82vw] max-w-[300px] flex-col bg-navy py-5 shadow-elevated">
        <div className="flex items-center gap-[10px] px-[18px] pb-4">
          <Image
            src="/logo.jpeg"
            alt="Prestige Legacy"
            width={32}
            height={32}
            className="h-8 w-8 flex-none rounded-[10px] object-cover"
          />
          <div className="flex-1 text-[14px] font-bold text-white">Prestige Legacy</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-[9px] text-white/60 hover:bg-white/10 hover:text-white"
          >
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 text-[13.5px]">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={
                  active
                    ? "flex items-center gap-[11px] rounded-[10px] bg-gold/[.14] px-[13px] py-[11px] font-semibold text-gold"
                    : "flex items-center gap-[11px] rounded-[10px] px-[13px] py-[11px] font-medium text-white/65"
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
            <div className="truncate text-[12.5px] font-semibold text-white">{profile.full_name}</div>
            <div className="truncate text-[10.5px] text-white/42">
              {ROLE_LABEL[profile.role]}
              {profile.unit_name ? ` · ${profile.unit_name}` : ""}
            </div>
          </div>
          <ThemeToggle className="flex-none" />
        </div>
        <div className="px-3">
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            className="mt-2 flex w-full items-center gap-2 rounded-[10px] px-[13px] py-[10px] text-[12.5px] font-medium text-white/50 disabled:opacity-60"
          >
            <SignOutIcon width={15} height={15} />
            {pending ? "Signing out…" : "Sign Out"}
          </button>
          {error && <div className="px-[13px] pt-1 text-[11px] font-medium text-alert-red">{error}</div>}
        </div>
      </div>
    </div>
  );
}
