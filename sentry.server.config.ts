import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  dataCollection: {
    // Control data collection of LLMs and tools.
    // genAI: { inputs: false, outputs: false },
  },
  enabled: process.env.NODE_ENV === "production",
});
