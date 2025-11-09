/**
 * Practical Example: Using Zod Validation + Sentry Together
 * 
 * This example shows how to use both in your API routes for robust error handling
 */

import { db } from '@/db/client';
import { emergencyContacts, users } from '@/db/schema';
import {
    addBreadcrumb,
    captureError,
    captureMessage
} from '@/utils/sentry';
import {
    emergencyContactSchema,
    formatZodError,
    safeValidate
} from '@/utils/validation';
import { eq } from 'drizzle-orm';

/**
 * EXAMPLE 1: Add Emergency Contact with Full Error Handling
 */
export async function POST(request: Request) {
    try {
        // Log the attempt
        addBreadcrumb({
            message: 'API: Add emergency contact request received',
            category: 'api',
            level: 'info',
        });

        // Parse request body
        const body = await request.json();

        // STEP 1: Validate input with Zod
        const validation = safeValidate(emergencyContactSchema, body);

        if (!validation.success) {
            // Invalid data - log to Sentry
            captureMessage('Invalid contact data submitted', 'warning', {
                errors: formatZodError(validation.error),
                body: body,
            });

            // Return user-friendly error
            return Response.json(
                {
                    error: 'Invalid contact information',
                    details: formatZodError(validation.error)
                },
                { status: 400 }
            );
        }

        // Data is now validated and type-safe!
        const contactData = validation.data;

        // STEP 2: Save to database
        addBreadcrumb({
            message: 'Saving contact to database',
            category: 'database',
            data: { contactName: contactData.name },
        });

        const [newContact] = await db
            .insert(emergencyContacts)
            .values(contactData)
            .returning();

        // STEP 3: Log success
        captureMessage('Emergency contact added successfully', 'info', {
            contactId: newContact.id,
            userId: contactData.userId,
        });

        return Response.json({
            success: true,
            contact: newContact
        });

    } catch (error) {
        // STEP 4: Catch and report unexpected errors to Sentry
        captureError(error as Error, {
            endpoint: '/api/contacts',
            method: 'POST',
            context: 'Adding emergency contact',
        });

        // Return generic error to user (don't expose internals)
        return Response.json(
            { error: 'Failed to add contact. Please try again.' },
            { status: 500 }
        );
    }
}

/**
 * EXAMPLE 2: Update User Profile with Validation
 */
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const userId = body.userId;

        if (!userId) {
            return Response.json(
                { error: 'User ID required' },
                { status: 400 }
            );
        }

        // Validate partial update (only provided fields)
        const partialSchema = userInfoSchema.partial();
        const validation = safeValidate(partialSchema, body);

        if (!validation.success) {
            captureMessage('Invalid user update data', 'warning', {
                userId,
                errors: formatZodError(validation.error),
            });

            return Response.json(
                {
                    error: 'Invalid data',
                    details: formatZodError(validation.error)
                },
                { status: 400 }
            );
        }

        // Update database
        const [updatedUser] = await db
            .update(users)
            .set(validation.data)
            .where(eq(users.id, userId))
            .returning();

        captureMessage('User profile updated', 'info', {
            userId,
            fieldsUpdated: Object.keys(validation.data),
        });

        return Response.json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        captureError(error as Error, {
            endpoint: '/api/user-info',
            method: 'PATCH',
        });

        return Response.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}

/**
 * EXAMPLE 3: Client-Side Form Validation + Error Tracking
 */

// In a React component (e.g., app/(app)/settings/myCircle.tsx)
import { useState } from 'react';
import { Alert } from 'react-native';

export function AddContactForm() {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        relationship: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async () => {
        try {
            // Clear previous errors
            setErrors({});

            // STEP 1: Validate on client side (instant feedback)
            const validation = safeValidate(emergencyContactSchema, formData);

            if (!validation.success) {
                // Show validation errors
                const errorMap: Record<string, string> = {};
                validation.error.issues.forEach(issue => {
                    const field = issue.path[0]?.toString() || 'form';
                    errorMap[field] = issue.message;
                });
                setErrors(errorMap);
                return;
            }

            // Track attempt
            addBreadcrumb({
                message: 'User submitting contact form',
                category: 'user-action',
            });

            // STEP 2: Send to API (already validated!)
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validation.data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add contact');
            }

            // Success!
            captureMessage('Contact added successfully', 'info');
            Alert.alert('Success', 'Emergency contact added!');

            // Clear form
            setFormData({ name: '', phone: '', relationship: '' });

        } catch (error) {
            // Track error
            captureError(error as Error, {
                action: 'add-contact',
                formData: { ...formData, phone: '[REDACTED]' }, // Don't log sensitive data
            });

            Alert.alert(
                'Error',
                'Failed to add contact. Please try again.'
            );
        }
    };

    return (
        <View>
            <TextInput
                placeholder="Name"
                value={formData.name}
                onChangeText={(name) => setFormData({ ...formData, name })}
            />
            {errors.name && <Text style={styles.error}>{errors.name}</Text>}

            <TextInput
                placeholder="Phone (10 digits)"
                value={formData.phone}
                onChangeText={(phone) => setFormData({ ...formData, phone })}
                keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

            <TextInput
                placeholder="Relationship"
                value={formData.relationship}
                onChangeText={(relationship) => setFormData({ ...formData, relationship })}
            />
            {errors.relationship && <Text style={styles.error}>{errors.relationship}</Text>}

            <Button title="Add Contact" onPress={handleSubmit} />
        </View>
    );
}

/**
 * EXAMPLE 4: SOS Alert with Complete Error Handling
 */
export async function sendSOSAlertWithTracking(
    location: any,
    contacts: any[],
    message: string,
    category: string
) {
    try {
        // Track SOS initiation
        addBreadcrumb({
            message: 'User initiated SOS alert',
            category: 'sos',
            level: 'warning',
            data: {
                contactCount: contacts.length,
                category,
            },
        });

        // Validate SOS data
        const sosData = {
            location,
            message,
            category,
            contactIds: contacts.map(c => c.id),
            includeSMS: true,
            includeWhatsApp: false,
        };

        const validation = safeValidate(sosAlertSchema, sosData);

        if (!validation.success) {
            const errorMsg = formatZodError(validation.error).join(', ');

            captureError(new Error('Invalid SOS data'), {
                action: 'sos-alert',
                errors: errorMsg,
                location,
                contactCount: contacts.length,
            });

            throw new Error(`Invalid SOS data: ${errorMsg}`);
        }

        // Send SOS (data is validated and type-safe)
        await sendSMSToContacts(validation.data);

        // Track success
        captureMessage('SOS alert sent successfully', 'warning', {
            contactCount: contacts.length,
            category,
            hasLocation: !!location,
        });

        return { success: true };

    } catch (error) {
        // Track critical error
        captureError(error as Error, {
            action: 'sos-alert',
            category,
            contactCount: contacts.length,
            severity: 'critical', // This is a critical feature!
        });

        throw error; // Re-throw so UI can handle it
    }
}

/**
 * Benefits of This Approach:
 * 
 * 1. ✅ User gets clear, specific error messages
 *    "phone: Invalid Indian phone number" 
 *    NOT "Something went wrong"
 * 
 * 2. ✅ Developer knows exactly what went wrong
 *    Error in Sentry shows:
 *    - What user tried to do
 *    - What data was invalid
 *    - Full context and breadcrumbs
 * 
 * 3. ✅ Type safety throughout
 *    TypeScript knows shape of validated data
 * 
 * 4. ✅ Security
 *    Invalid data caught before reaching database
 *    SQL injection prevented
 * 
 * 5. ✅ Monitoring
 *    You know when users hit errors
 *    Can proactively fix issues
 */
