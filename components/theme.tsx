"use client";

import { useSyncExternalStore } from "react";

export const THEME_KEY = "pl-theme";
const THEME_EVENT = "pl-theme-change";

// Runs before paint, inlined in <head>, so a dark-mode reload never flashes
// the light theme first. Kept as a string because it has to execute before
// React hydrates.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Private mode / storage disabled -- the class still applies for this page.
  }
  // Same-tab listeners (the `storage` event only fires in *other* tabs), so
  // every toggle instance on the page stays in sync with the html class.
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: dark }));
}

// The <html> class set by THEME_SCRIPT is the single source of truth, so this
// subscribes to it rather than keeping a second copy in React state. That also
// avoids the setState-in-effect flash: the server snapshot is light, and the
// client reads the real class on the first commit.
function subscribe(onChange: () => void) {
  function onStorage(e: StorageEvent) {
    if (e.key !== THEME_KEY) return;
    // Another tab switched: mirror it here before notifying subscribers.
    document.documentElement.classList.toggle("dark", e.newValue === "dark");
    onChange();
  }
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { dark, setDark: applyTheme };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { dark, setDark } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={`flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/15 text-white/70 hover:text-white ${className}`}
    >
      {dark ? (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
