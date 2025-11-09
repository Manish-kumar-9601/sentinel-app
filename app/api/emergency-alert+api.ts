/**
 * Emergency Alert API Endpoint
 * Receives SOS alerts and processes them
 * This is Layer 1 of the Multi-Layer Safety Net
 */

import { db } from '@/db/client';
import { sosAlerts, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, contacts, location, message, timestamp } = body;

        console.log('🚨 Emergency Alert Received');
        console.log(`User ID: ${userId}`);
        console.log(`Contacts: ${contacts?.length || 0}`);
        console.log(`Location: ${location ? 'Yes' : 'No'}`);

        // Validate required fields
        if (!userId || !message) {
            return Response.json(
                { error: 'Missing required fields: userId, message' },
                { status: 400 }
            );
        }

        // Get user info
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Create alert record in database
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        await db.insert(sosAlerts).values({
            id: alertId,
            userId: userId,
            message: message,
            location: location ? JSON.stringify(location) : null,
            status: 'sent',
            apiSent: 'success',
            whatsappSent: 'pending',
            smsSent: 'pending',
            callMade: 'no',
            contactsNotified: contacts?.map((c: any) => c.phone).join(',') || '',
            deliveryDetails: JSON.stringify({
                timestamp,
                method: 'api',
                userAgent: request.headers.get('user-agent') || 'unknown',
            }),
        });

        console.log(`✅ Alert stored in database: ${alertId}`);

        // TODO: Add additional processing here:
        // - Send push notifications (if implemented)
        // - Send emails to contacts
        // - Log to monitoring system
        // - Trigger webhooks

        // For now, we'll just acknowledge receipt
        return Response.json({
            success: true,
            alertId,
            notified: contacts?.length || 0,
            message: 'Emergency alert received and logged',
            timestamp: Date.now(),
        });

    } catch (error) {
        console.error('❌ Emergency Alert API Error:', error);

        return Response.json(
            {
                error: 'Failed to process emergency alert',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Health check endpoint
export async function GET(request: Request) {
    return Response.json({
        status: 'operational',
        endpoint: 'emergency-alert',
        timestamp: Date.now(),
    });
}
