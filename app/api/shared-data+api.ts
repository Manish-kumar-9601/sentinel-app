/**
 * API Endpoint: Shared Data Viewer
 * Allows emergency contacts to view shared evidence and location history
 * Validates access tokens and tracks views
 */

import { db } from '@/db/client';
import { evidence, locationHistory, sharedDataSessions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const sessionId = url.pathname.split('/').pop();
        const token = url.searchParams.get('token');

        if (!sessionId || !token) {
            return Response.json(
                { error: 'Session ID and access token are required' },
                { status: 400 }
            );
        }

        // Get session
        const session = await db.query.sharedDataSessions.findFirst({
            where: and(
                eq(sharedDataSessions.id, sessionId),
                eq(sharedDataSessions.accessToken, token)
            ),
        });

        if (!session) {
            return Response.json(
                { error: 'Invalid session or access token' },
                { status: 404 }
            );
        }

        // Check if expired
        if (session.expiresAt && new Date() > session.expiresAt) {
            return Response.json(
                { error: 'This link has expired' },
                { status: 410 }
            );
        }

        // Check if revoked
        if (session.status === 'revoked') {
            return Response.json(
                { error: 'This link has been revoked' },
                { status: 403 }
            );
        }

        // Update view count
        const newViewCount = parseInt(session.viewCount || '0') + 1;
        await db.update(sharedDataSessions)
            .set({
                viewCount: newViewCount.toString(),
                lastViewedAt: new Date(),
            })
            .where(eq(sharedDataSessions.id, sessionId));

        // Get evidence
        const evidenceIds = JSON.parse(session.evidenceIds || '[]');
        const evidenceItems = [];

        for (const evidId of evidenceIds) {
            const evid = await db.query.evidence.findFirst({
                where: eq(evidence.id, evidId),
            });
            if (evid) evidenceItems.push(evid);
        }

        // Get location history (last 24 hours)
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const locations = await db.query.locationHistory.findMany({
            where: and(
                eq(locationHistory.userId, session.userId),
                eq(locationHistory.isShared, 'true')
            ),
        });

        // Format response
        const response = {
            session: {
                id: session.id,
                recipientName: session.recipientName,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt,
                viewCount: newViewCount,
            },
            evidence: evidenceItems.map(e => ({
                id: e.id,
                type: e.type,
                fileName: e.fileName,
                thumbnailUri: e.thumbnailUri,
                latitude: e.latitude ? parseFloat(e.latitude) : null,
                longitude: e.longitude ? parseFloat(e.longitude) : null,
                address: e.address,
                createdAt: e.createdAt,
            })),
            locationHistory: locations.map(l => ({
                id: l.id,
                latitude: parseFloat(l.latitude),
                longitude: parseFloat(l.longitude),
                accuracy: l.accuracy ? parseFloat(l.accuracy) : null,
                address: l.address,
                timestamp: l.timestamp,
                isEmergency: l.isEmergency === 'true',
            })),
        };

        return Response.json(response, {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        });

    } catch (error) {
        console.error('Error fetching shared data:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
