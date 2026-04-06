/**
 * Sentry error tracking configuration.
 *
 * Initializes the Sentry SDK for the backend API.
 * Reads the DSN from the SENTRY_DSN environment variable.
 * If no DSN is configured, Sentry is not initialized (safe for local development).
 */

import * as Sentry from '@sentry/node';
import { env } from './env';

const SENTRY_DSN = process.env.SENTRY_DSN || '';

export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.log('[Sentry] No SENTRY_DSN configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    // Only send errors in production by default; capture all in dev for debugging
    beforeSend(event) {
      // Strip sensitive data from request bodies
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>;
        if (data.password) data.password = '[REDACTED]';
        if (data.pinHash) data.pinHash = '[REDACTED]';
        if (data.token) data.token = '[REDACTED]';
      }
      return event;
    },
  });

  console.log('[Sentry] Initialized for environment:', env.NODE_ENV);
}

export { Sentry };
