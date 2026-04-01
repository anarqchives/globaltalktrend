/**
 * Centralized error reporter.
 * In production: sends to Sentry if DSN configured, otherwise logs to console.
 * Prevents silent error swallowing across the app.
 */

type ErrorContext = Record<string, string | number | boolean | null | undefined>;

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const IS_PROD = import.meta.env.PROD;

// Lightweight Sentry-compatible error capture without the full SDK
async function sendToSentry(error: Error, context?: ErrorContext) {
  if (!DSN || !IS_PROD) return;
  try {
    // Extract project info from DSN
    const url = new URL(DSN);
    const [key] = url.username ? [url.username] : [""];
    const projectId = url.pathname.replace("/", "");
    const sentryUrl = `${url.protocol}//${url.host}/api/${projectId}/store/`;

    await fetch(sentryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}`,
      },
      body: JSON.stringify({
        platform: "javascript",
        level: "error",
        exception: {
          values: [{
            type: error.name,
            value: error.message,
            stacktrace: { frames: [] },
          }],
        },
        extra: context,
        tags: { app: "gtt-monitor" },
      }),
    }).catch(() => {}); // Sentry itself must never throw
  } catch { /* ignore */ }
}

export function reportError(
  error: unknown,
  context?: ErrorContext,
  silent = false
): void {
  const err = error instanceof Error ? error : new Error(String(error));

  if (!silent) {
    console.error("[GTT Error]", err.message, context ?? "");
  }

  sendToSentry(err, context);
}

export function reportSourceFailure(sourceName: string, error: unknown): void {
  reportError(error, { source: sourceName, type: "source_failure" }, true);
  // Log in dev so we know what's failing
  if (import.meta.env.DEV) {
    console.warn(`[GTT] Source failed: ${sourceName}`, error);
  }
}
