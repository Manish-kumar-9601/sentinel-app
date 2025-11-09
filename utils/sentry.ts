/**
 * Sentry Error Tracking Integration
 * 
 * Sentry helps you monitor and fix crashes in real-time.
 * 
 * WHAT IS SENTRY?
 * - Error tracking platform that catches and reports app crashes
 * - Shows you stack traces, device info, and user actions before crash
 * - Helps debug production issues that you can't reproduce locally
 * - FREE tier: 5,000 errors/month
 * 
 * BENEFITS:
 * ✅ Know when your app crashes for users
 * ✅ See exactly what caused the error
 * ✅ Track error frequency and affected users
 * ✅ Get notified via email/Slack when errors occur
 * ✅ See performance bottlenecks
 * 
 * SETUP REQUIRED:
 * 1. Sign up at https://sentry.io (free)
 * 2. Create a new React Native project
 * 3. Copy your DSN (Data Source Name)
 * 4. Add to .env file: SENTRY_DSN=your_dsn_here
 * 5. Call initSentry() in your app entry point
 * 
 * USAGE EXAMPLE:
 * ```typescript
 * // In app/_layout.tsx or app/index.tsx
 * import { initSentry } from '@/utils/sentry';
 * 
 * initSentry(); // Initialize once at app start
 * 
 * // Anywhere in your app
 * import { captureError, captureMessage, setUserContext } from '@/utils/sentry';
 * 
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureError(error, { 
 *     context: 'SOS Alert',
 *     userId: user.id 
 *   });
 * }
 * ```
 */

import * as Sentry from '@sentry/react-native';

/**
 * Initialize Sentry error tracking
 * Call this once at app startup (in app/_layout.tsx or app/index.tsx)
 * 
 * Only runs in production to avoid noise during development
 */
export function initSentry() {
    // Only enable in production
    if (process.env.NODE_ENV !== 'production') {
        console.log('🔧 Sentry: Disabled in development mode');
        return;
    }

    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
        console.warn('⚠️ Sentry: DSN not configured. Add SENTRY_DSN to your .env file');
        return;
    }

    try {
        Sentry.init({
            dsn,

            // Environment (production, staging, development)
            environment: process.env.NODE_ENV || 'production',

            // Enable automatic session tracking
            enableAutoSessionTracking: true,

            // Session timeout (30 minutes)
            sessionTrackingIntervalMillis: 30000,

            // Sample rate for error tracking (1.0 = 100% of errors)
            tracesSampleRate: 1.0,

            // Sample rate for performance monitoring (0.1 = 10% of transactions)
            // Lower this to reduce data usage
            profilesSampleRate: 0.1,

            // Enable native crash reporting
            enableNative: true,

            // Enable JavaScript error tracking
            enableNativeCrashHandling: true,

            // Attach stack trace to messages
            attachStacktrace: true,

            // Enable automatic breadcrumbs (tracks user actions)
            integrations: [
                // Note: If you get errors, your Sentry version may not support these
                // You can remove this integrations array - error tracking still works
            ],

            // Filter out sensitive data
            beforeSend(event, hint) {
                // Remove sensitive data from events
                if (event.request) {
                    delete event.request.cookies;

                    // Remove auth headers
                    if (event.request.headers) {
                        delete event.request.headers['Authorization'];
                        delete event.request.headers['Cookie'];
                    }
                }

                // Remove passwords from breadcrumbs
                if (event.breadcrumbs) {
                    event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
                        if (breadcrumb.data) {
                            const data = { ...breadcrumb.data };
                            delete data.password;
                            delete data.token;
                            return { ...breadcrumb, data };
                        }
                        return breadcrumb;
                    });
                }

                return event;
            },
        });

        console.log('✅ Sentry: Initialized successfully');
    } catch (error) {
        console.error('❌ Sentry: Initialization failed', error);
    }
}

/**
 * Capture an error/exception with optional context
 * 
 * @param error - The error object to capture
 * @param context - Additional context data (user info, action, etc.)
 * 
 * @example
 * try {
 *   await fetchUserData();
 * } catch (error) {
 *   captureError(error, {
 *     action: 'fetchUserData',
 *     userId: user.id,
 *     timestamp: Date.now()
 *   });
 * }
 */
export function captureError(error: Error, context?: Record<string, any>) {
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, {
            extra: context,
            level: 'error',
        });
    } else {
        // In development, log to console
        console.error('❌ Error:', error);
        if (context) {
            console.error('📋 Context:', context);
        }
    }
}

/**
 * Capture a custom message (not an error, but important info)
 * 
 * @param message - The message to log
 * @param level - Severity level
 * @param context - Additional context
 * 
 * @example
 * captureMessage('User completed onboarding', 'info', {
 *   userId: user.id,
 *   duration: 300
 * });
 */
export function captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
    context?: Record<string, any>
) {
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureMessage(message, {
            level,
            extra: context,
        });
    } else {
        const emoji = {
            fatal: '💀',
            error: '❌',
            warning: '⚠️',
            log: '📝',
            info: 'ℹ️',
            debug: '🔍',
        }[level];

        console.log(`${emoji} ${message}`);
        if (context) {
            console.log('📋 Context:', context);
        }
    }
}

/**
 * Set user context for error tracking
 * This helps identify which user experienced the error
 * 
 * @example
 * setUserContext({
 *   id: user.id,
 *   email: user.email,
 *   name: user.name,
 * });
 */
export function setUserContext(user: {
    id?: string;
    email?: string;
    username?: string;
    name?: string;
    [key: string]: any;
}) {
    if (process.env.NODE_ENV === 'production') {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.username || user.name,
            ...user,
        });
    } else {
        console.log('👤 User context set:', user);
    }
}

/**
 * Clear user context (on logout)
 * 
 * @example
 * clearUserContext();
 */
export function clearUserContext() {
    if (process.env.NODE_ENV === 'production') {
        Sentry.setUser(null);
    } else {
        console.log('👤 User context cleared');
    }
}

/**
 * Add breadcrumb (tracks user actions leading up to error)
 * 
 * @example
 * addBreadcrumb({
 *   message: 'User clicked SOS button',
 *   category: 'user-action',
 *   level: 'info',
 *   data: { buttonId: 'sos-main' }
 * });
 */
export function addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
    data?: Record<string, any>;
}) {
    if (process.env.NODE_ENV === 'production') {
        Sentry.addBreadcrumb(breadcrumb);
    } else {
        console.log('🍞 Breadcrumb:', breadcrumb);
    }
}

/**
 * Set custom tags for filtering errors in Sentry dashboard
 * 
 * @example
 * setTag('feature', 'sos-alert');
 * setTag('screen', 'home');
 */
export function setTag(key: string, value: string) {
    if (process.env.NODE_ENV === 'production') {
        Sentry.setTag(key, value);
    }
}

/**
 * Set custom context for additional debugging info
 * 
 * @example
 * setContext('device', {
 *   batteryLevel: 0.85,
 *   isCharging: true,
 *   networkType: '4g',
 * });
 */
export function setContext(key: string, context: Record<string, any>) {
    if (process.env.NODE_ENV === 'production') {
        Sentry.setContext(key, context);
    }
}

/**
 * Wrap a component with Sentry error boundary
 * Catches React component errors
 * 
 * @example
 * import { ErrorBoundary } from '@/utils/sentry';
 * 
 * export default function App() {
 *   return (
 *     <ErrorBoundary fallback={<ErrorScreen />}>
 *       <YourApp />
 *     </ErrorBoundary>
 *   );
 * }
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Manually flush events to Sentry (useful before app closes)
 * 
 * @example
 * await flushEvents();
 */
export async function flushEvents(): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
        try {
            await Sentry.flush();
            return true;
        } catch {
            return false;
        }
    }
    return true;
}

/**
 * Track a custom event or metric
 * Useful for tracking feature usage
 * 
 * @example
 * trackEvent('sos_triggered', {
 *   category: 'medical',
 *   contactCount: 3
 * });
 */
export function trackEvent(eventName: string, data?: Record<string, any>) {
    if (process.env.NODE_ENV === 'production') {
        captureMessage(eventName, 'info', data);
    } else {
        console.log(`📊 Event: ${eventName}`, data);
    }
}