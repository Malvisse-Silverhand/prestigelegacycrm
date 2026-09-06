import * as Sentry from "@sentry/nextjs";

// Session Replay is dropped: replaysOnErrorSampleRate only works by having the
// replay integration continuously buffer DOM mutations for every visitor for
// the entire session (there's no way to start recording only after an error
// already happened), which is exactly the "always-on cost for an occasional
// benefit" this pass is trying to cut. It alone was the largest piece of the
// client bundle. Error capture itself is untouched -- stack traces,
// breadcrumbs (clicks, navigation, fetch/XHR, console) and tags all still
// come from Sentry's default integrations, with none of the always-on DOM
// recording.
//
// tracesSampleRate down from 1.0: full performance tracing instruments every
// fetch/XHR and page transition in the browser. 0.2 still gives a
// statistically solid picture of real-world performance without paying that
// cost on every single request.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  dataCollection: {
    // Control data collection of LLMs and tools.
    // genAI: { inputs: false, outputs: false },
  },
  enabled: process.env.NODE_ENV === "production",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
