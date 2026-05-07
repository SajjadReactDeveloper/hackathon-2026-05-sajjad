import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: 1.0,
    beforeSend(event) {
      // Strip sensitive fields before sending to Sentry
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['x-hub-signature-256'];
      }
      return event;
    },
  });
}
