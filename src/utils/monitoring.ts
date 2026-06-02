/**
 * Lightweight error monitoring shim.
 *
 * Sends caught errors to an external monitoring endpoint (Sentry / Glitchtip /
 * self-hosted) when VITE_SENTRY_DSN is configured. Fails silently when not —
 * production builds without monitoring still work, they just don't report.
 *
 * Why we don't bundle the official @sentry/react SDK directly:
 *   - It adds ~100kb to the bundle, which hurts mobile TTI.
 *   - We only need minimal capture (error event with stack + context) — no
 *     replay, no performance tracing, no profiling — those can be added later
 *     by upgrading to @sentry/browser when the user base justifies it.
 *
 * Drop-in upgrade path: replace this file's `capture()` body with
 *   import * as Sentry from '@sentry/browser';
 *   Sentry.init({ dsn: ENV.VITE_SENTRY_DSN, ... });
 * — the existing call sites won't change.
 */

const DSN = (import.meta as { env?: { VITE_SENTRY_DSN?: string } }).env?.VITE_SENTRY_DSN || '';

type Severity = 'error' | 'warning' | 'info';

interface CaptureContext {
  severity?: Severity;
  user?: { id?: number; username?: string };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

const parseDsn = (dsn: string) => {
  // Sentry DSN format: https://<key>@<host>/<project_id>
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, '');
    return {
      host: u.host,
      projectId,
      publicKey: u.username,
      endpoint: `${u.protocol}//${u.host}/api/${projectId}/store/`,
    };
  } catch {
    return null;
  }
};

const dsn = parseDsn(DSN);

const send = async (event: Record<string, unknown>): Promise<void> => {
  if (!dsn) return;
  try {
    await fetch(dsn.endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=focus-mini/1.0`,
      },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Monitoring must never throw — swallow.
  }
};

/**
 * Capture an error (or any payload) for later inspection.
 * Safe to call from anywhere, including during error boundaries.
 */
export const captureError = (err: unknown, ctx: CaptureContext = {}): void => {
  if (!dsn) {
    if (import.meta.env.DEV) console.warn('[monitoring]', err, ctx);
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  void send({
    platform: 'javascript',
    level: ctx.severity || 'error',
    timestamp: Math.floor(Date.now() / 1000),
    message,
    exception: stack
      ? {
          values: [{
            type: err instanceof Error ? err.name : 'Error',
            value: message,
            stacktrace: { frames: parseStack(stack) },
          }],
        }
      : undefined,
    user: ctx.user,
    tags: ctx.tags,
    extra: ctx.extra,
    release: 'focus-mini@latest',
    environment: import.meta.env.DEV ? 'development' : 'production',
    sdk: { name: 'focus-mini-monitoring', version: '1.0.0' },
  });
};

/**
 * Capture a non-error message (info/warning level).
 */
export const captureMessage = (msg: string, ctx: CaptureContext = {}): void => {
  captureError(new Error(msg), { ...ctx, severity: ctx.severity || 'info' });
};

const parseStack = (stack: string) => {
  // Crude best-effort frame extractor. Modern browsers print frames as
  // "at func (file:line:col)" or "func@file:line:col". The Sentry server
  // accepts any shape — these become rough but useful traces.
  return stack.split('\n').slice(1).reverse().map((line) => {
    const m = /(?:at\s+)?(.+?)\s*[\(@](.+?):(\d+):(\d+)/.exec(line.trim());
    return m
      ? { function: m[1] || '?', filename: m[2], lineno: Number(m[3]), colno: Number(m[4]) }
      : { function: line.trim() || '?' };
  });
};

/**
 * Wire up global error + unhandledrejection listeners. Call once at boot.
 */
export const initMonitoring = (): void => {
  if (typeof window === 'undefined') return;
  if (!dsn) return; // No-op when DSN absent — keeps prod free of failed POSTs.

  window.addEventListener('error', (e) => {
    captureError(e.error || e.message, { tags: { source: 'window.error' } });
  });
  window.addEventListener('unhandledrejection', (e) => {
    captureError(e.reason, { tags: { source: 'unhandledrejection' } });
  });
};
