import * as Sentry from "@sentry/nextjs";

// See sentry.server.config.ts for why this is 0.2 rather than 1.0.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  dataCollection: {
    // Control data collection of LLMs and tools.
    // genAI: { inputs: false, outputs: false },
  },
  enabled: process.env.NODE_ENV === "production",
});
