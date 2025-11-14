/**
 * Zod Validation Schemas
 * 
 * Provides type-safe validation for all app data structures.
 * Catches errors early and provides clear error messages.
 * 
 * Usage Example:
 * ```typescript
 * try {
 *   const validData = userInfoSchema.parse(userData);
 *   // validData is now type-safe and validated
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.log(error.errors); // Array of validation errors
 *   }
 * }
 * ```
 */

import { z } from 'zod';

// ==================== AUTHENTICATION SCHEMAS ====================

/**
 * User Registration Schema
 * Validates new user registration data
 */
export const registerSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be less than 100 characters')
        .trim(),

    email: z.string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),

    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be less than 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

    confirmPassword: z.string().optional(),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

/**
 * User Login Schema
 * Validates login credentials
 */
export const loginSchema = z.object({
    email: z.string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),

    password: z.string()
        .min(6, 'Password must be at least 6 characters'),
});

// ==================== USER INFO SCHEMAS ====================

/**
 * Phone Number Schema
 * Validates Indian phone numbers
 */
export const phoneSchema = z.string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (must be 10 digits starting with 6-9)')
    .or(z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid phone number with country code'));

/**
 * Emergency Contact Schema
 * Validates emergency contact information
 */
export const emergencyContactSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string()
        .min(2, 'Contact name must be at least 2 characters')
        .max(100, 'Contact name must be less than 100 characters')
        .trim(),

    phone: phoneSchema,

    relationship: z.string()
        .min(2, 'Relationship must be specified')
        .max(50, 'Relationship must be less than 50 characters')
        .optional(),

    isPrimary: z.boolean().optional().default(false),

    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
});

/**
 * Medical Information Schema
 * Validates user medical data
 */
export const medicalInfoSchema = z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'])
        .optional()
        .nullable(),

    allergies: z.string()
        .max(500, 'Allergies description must be less than 500 characters')
        .optional()
        .nullable(),

    medications: z.string()
        .max(500, 'Medications list must be less than 500 characters')
        .optional()
        .nullable(),

    medicalConditions: z.string()
        .max(1000, 'Medical conditions must be less than 1000 characters')
        .optional()
        .nullable(),

    emergencyNotes: z.string()
        .max(1000, 'Emergency notes must be less than 1000 characters')
        .optional()
        .nullable(),
});

/**
 * Complete User Info Schema
 * Validates full user profile data
 */
export const userInfoSchema = z.object({
    userId: z.string().uuid().optional(),

    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be less than 100 characters')
        .trim(),

    email: z.string()
        .email('Invalid email address')
        .toLowerCase()
        .trim(),

    phone: phoneSchema.optional().nullable(),

    address: z.string()
        .max(500, 'Address must be less than 500 characters')
        .optional()
        .nullable(),

    city: z.string()
        .max(100, 'City must be less than 100 characters')
        .optional()
        .nullable(),

    state: z.string()
        .max(100, 'State must be less than 100 characters')
        .optional()
        .nullable(),

    pincode: z.string()
        .regex(/^\d{6}$/, 'Invalid pincode (must be 6 digits)')
        .optional()
        .nullable(),

    age: z.number()
        .int('Age must be a whole number')
        .min(1, 'Age must be at least 1')
        .max(150, 'Age must be less than 150')
        .optional()
        .nullable(),

    gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say'])
        .optional()
        .nullable(),

    medicalInfo: medicalInfoSchema.optional().nullable(),

    emergencyContacts: z.array(emergencyContactSchema)
        .max(10, 'Maximum 10 emergency contacts allowed')
        .optional(),

    profilePicture: z.string().url('Invalid profile picture URL').optional().nullable(),

    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
});

// ==================== LOCATION SCHEMAS ====================

/**
 * Location Coordinates Schema
 * Validates GPS coordinates
 */
export const locationSchema = z.object({
    latitude: z.number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),

    longitude: z.number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),

    accuracy: z.number().positive().optional(),

    altitude: z.number().optional().nullable(),

    timestamp: z.number().or(z.string().datetime()).optional(),
});

// ==================== SOS SCHEMAS ====================

/**
 * SOS Alert Schema
 * Validates SOS emergency alert data
 */
export const sosAlertSchema = z.object({
    location: locationSchema,

    message: z.string()
        .min(1, 'Message cannot be empty')
        .max(500, 'Message must be less than 500 characters')
        .optional(),

    category: z.enum([
        'medical',
        'fire',
        'accident',
        'violence',
        'natural_disaster',
        'rescue',
        'psychiatrist',
        'other'
    ]).optional(),

    contactIds: z.array(z.string().uuid())
        .min(1, 'At least one contact must be selected')
        .max(10, 'Maximum 10 contacts allowed'),

    includeSMS: z.boolean().optional().default(true),

    timestamp: z.string().datetime().optional(),
});

// ==================== API REQUEST/RESPONSE SCHEMAS ====================

/**
 * API Error Response Schema
 */
export const apiErrorSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
    details: z.any().optional(),
});

/**
 * API Success Response Schema
 */
export const apiSuccessSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    data: z.any().optional(),
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Validates data and returns typed result or throws error
 * 
 * @example
 * const contact = validate(emergencyContactSchema, rawData);
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
}

/**
 * Validates data and returns { success, data, error }
 * Safe version that doesn't throw
 * 
 * @example
 * const result = safeValidate(userInfoSchema, userData);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.log(result.error);
 * }
 */
export function safeValidate<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Formats Zod error messages into user-friendly strings
 * 
 * @example
 * const errors = formatZodError(error);
 * // ['Name must be at least 2 characters', 'Email is invalid']
 */
export function formatZodError(error: z.ZodError): string[] {
    return error.issues.map((err: z.ZodIssue) => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
    });
}

/**
 * Validates partial updates (only validate provided fields)
 * 
 * @example
 * const partial = userInfoSchema.partial();
 * const updates = validate(partial, { name: "New Name" });
 */
export function createPartialSchema<T extends z.ZodRawShape>(
    schema: z.ZodObject<T>
): z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }> {
    return schema.partial();
}

// ==================== TYPE EXPORTS ====================
// Extract TypeScript types from Zod schemas

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type MedicalInfo = z.infer<typeof medicalInfoSchema>;
export type UserInfo = z.infer<typeof userInfoSchema>;
export type Location = z.infer<typeof locationSchema>;
export type SOSAlert = z.infer<typeof sosAlertSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiSuccess = z.infer<typeof apiSuccessSchema>;