/**
 * Safe JSON Utility
 * 
 * Provides error-safe JSON parsing and stringification with fallback values
 * and optional logging to prevent app crashes from corrupted data.
 * 
 * @module utils/safeJSON
 */

// Declare Sentry as optional global
declare const Sentry: any;

/**
 * Safely parse JSON with fallback value and error handling
 * 
 * @template T - The expected type of the parsed data
 * @param {string} data - The JSON string to parse
 * @param {T} fallback - Fallback value if parsing fails
 * @param {string} [context] - Optional context for error logging
 * @returns {T} Parsed data or fallback value
 * 
 * @example
 * const contacts = safeJSONParse(storageData, [], 'emergency_contacts');
 */
export function safeJSONParse<T>(data: string | null | undefined, fallback: T, context?: string): T {
    // Handle null/undefined input
    if (data == null || data === '') {
        if (context) {
            console.log(`[safeJSON] Empty data for context: ${context}`);
        }
        return fallback;
    }

    try {
        const parsed = JSON.parse(data);
        return parsed as T;
    } catch (error) {
        console.error(`[safeJSON] Parse failed${context ? ` for ${context}` : ''}:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            dataPreview: data.substring(0, 100) + (data.length > 100 ? '...' : ''),
            dataLength: data.length
        });

        // Log to error tracking service if available
        if (typeof Sentry !== 'undefined') {
            try {
                Sentry.captureException(error, {
                    tags: { type: 'json_parse_error' },
                    contexts: {
                        json: {
                            context: context || 'unknown',
                            dataLength: data.length,
                            dataPreview: data.substring(0, 100)
                        }
                    }
                });
            } catch (sentryError) {
                // Fail silently if Sentry isn't available
            }
        }

        return fallback;
    }
}

/**
 * Safely stringify data with error handling
 * 
 * @param {any} data - The data to stringify
 * @param {string} [context] - Optional context for error logging
 * @param {string} [fallback] - Fallback string if stringify fails (default: '{}')
 * @returns {string} JSON string or fallback
 * 
 * @example
 * const jsonString = safeJSONStringify(contacts, 'emergency_contacts');
 */
export function safeJSONStringify(
    data: any,
    context?: string,
    fallback: string = '{}'
): string {
    try {
        return JSON.stringify(data);
    } catch (error) {
        console.error(`[safeJSON] Stringify failed${context ? ` for ${context}` : ''}:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            dataType: typeof data,
            dataConstructor: data?.constructor?.name
        });

        // Log to error tracking service if available
        if (typeof Sentry !== 'undefined') {
            try {
                Sentry.captureException(error, {
                    tags: { type: 'json_stringify_error' },
                    contexts: {
                        json: {
                            context: context || 'unknown',
                            dataType: typeof data
                        }
                    }
                });
            } catch (sentryError) {
                // Fail silently if Sentry isn't available
            }
        }

        return fallback;
    }
}

/**
 * Safely parse JSON with validation function
 * 
 * @template T - The expected type of the parsed data
 * @param {string} data - The JSON string to parse
 * @param {T} fallback - Fallback value if parsing fails
 * @param {(value: any) => value is T} validator - Type guard function
 * @param {string} [context] - Optional context for error logging
 * @returns {T} Validated parsed data or fallback value
 * 
 * @example
 * const contacts = safeJSONParseWithValidation(
 *   data,
 *   [],
 *   (val): val is Contact[] => Array.isArray(val),
 *   'contacts'
 * );
 */
export function safeJSONParseWithValidation<T>(
    data: string | null | undefined,
    fallback: T,
    validator: (value: any) => value is T,
    context?: string
): T {
    const parsed = safeJSONParse<any>(data, fallback, context);

    if (!validator(parsed)) {
        console.warn(
            `[safeJSON] Validation failed${context ? ` for ${context}` : ''}`,
            'Using fallback value'
        );
        return fallback;
    }

    return parsed;
}

/**
 * Type guard for emergency contact
 */
export function isEmergencyContact(value: any): value is { id: string; name: string; phone: string } {
    return (
        value != null &&
        typeof value === 'object' &&
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.phone === 'string'
    );
}

/**
 * Type guard for array of emergency contacts
 */
export function isEmergencyContactArray(value: any): value is Array<{ id: string; name: string; phone: string }> {
    return Array.isArray(value) && value.every(isEmergencyContact);
}

/**
 * Type guard for user object
 */
export function isUser(value: any): value is { id: string; name: string; email: string } {
    return (
        value != null &&
        typeof value === 'object' &&
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.email === 'string'
    );
}

// Export common validators
export const validators = {
    isEmergencyContact,
    isEmergencyContactArray,
    isUser,
};

export default {
    parse: safeJSONParse,
    stringify: safeJSONStringify,
    parseWithValidation: safeJSONParseWithValidation,
    validators,
};
