import * as Sentry from "@sentry/nextjs";

// 0.2 rather than 1.0: full tracing wraps every server action and API route
// in a span on every single request. 20% still gives a solid picture of real
// server-side performance without paying that overhead on every call.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  dataCollection: {
    // Control data collection of LLMs and tools.
    // genAI: { inputs: false, outputs: false },
  },
  enabled: process.env.NODE_ENV === "production",
});
