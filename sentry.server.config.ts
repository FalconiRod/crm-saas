import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    debug: process.env.NODE_ENV === "development",
    // server-side: auto-instrumented by @sentry/nextjs
  });
}