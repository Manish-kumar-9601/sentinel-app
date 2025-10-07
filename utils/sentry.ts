import * as Sentry from '@sentry/react-native';

export function initSentry() {
    if (process.env.NODE_ENV === 'production') {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV,
            tracesSampleRate: 1.0,
        });
    }
}

export function captureError(error: Error, context?: Record<string, any>) {
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, { extra: context });
    } else {
        console.error('Error:', error, context);
    }
}