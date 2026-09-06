import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Baseline security headers with zero functional cost -- none of these touch
// script/style/image loading, so nothing that already works can break.
//
// The CRM app itself is never legitimately embedded by anyone (including
// itself), so it gets a hard "don't frame me" -- clickjacking on a page full
// of delete/reassign/approve buttons is a real risk, not a theoretical one.
// /tools/* is the one exception: QuotationModal iframes the calculators
// same-origin (components/quotation-modal.tsx), so those pages allow
// same-origin framing only, which still blocks a third-party site from
// iframing them while leaving that feature working.
const FRAME_HEADERS_DEFAULT = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];
const FRAME_HEADERS_TOOLS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];
const SHARED_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The calculator tools carry a lead's name/phone/email/DOB in their own
  // query string (quoteLauncherUrl) -- a lax referrer policy would leak that
  // in the Referer header to any third-party resource those pages load.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing in this app uses the camera, microphone, geolocation or the
  // Payment Request API -- deny them so an embedded/compromised third-party
  // script could never prompt for them either.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: [...FRAME_HEADERS_DEFAULT, ...SHARED_HEADERS] },
      // Listed after the catch-all so it wins for this narrower path -- Next
      // merges matching entries in array order, last write wins per key.
      { source: "/tools/:path*", headers: FRAME_HEADERS_TOOLS },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "malvisse",
  project: "prestigelegacycrm",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});
