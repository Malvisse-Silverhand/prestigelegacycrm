import type { Metadata, Viewport } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { connection } from "next/server";
import { THEME_SCRIPT } from "@/components/theme";
import { getBrandPrimary } from "@/lib/site-settings";
import { DEFAULT_BRAND } from "@/lib/brand-theme";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prestige Legacy CRM",
  description: "Agent portal for Prestige Legacy leads, quotations, and pipeline.",
};

// viewportFit: "cover" is what actually turns on env(safe-area-inset-*) --
// without it every safe-area padding in the app (the mobile bottom nav, the
// bottom sheets, the drawer) silently resolves to 0 on a notched iPhone. The
// theme colours tint the status bar / home-indicator area itself, so it
// reads as part of the app rather than a strip of browser chrome above it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf9f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1a2b" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The brand colour is a per-request setting a SuperAdmin can change at any
  // time, so this layout has to render per request. Without this, Next would
  // prerender the static pages (login, home, forgot-password...) once at build
  // time and bake whatever colour was set then into them for good.
  await connection();
  const brand = await getBrandPrimary();

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before first paint, so a dark-mode reload
            never flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Only emitted for a colour that differs from the built-in default,
            and getBrandPrimary has already checked it is a plain #rrggbb --
            nothing else can reach this string. globals.css declares the
            default, so an unset colour costs no extra bytes at all. */}
        {brand && brand !== DEFAULT_BRAND && (
          <style id="brand-theme" dangerouslySetInnerHTML={{ __html: `:root{--brand-primary:${brand}}` }} />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
