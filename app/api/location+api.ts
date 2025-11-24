/**
 * ============================================================================
 * ENHANCED LOCATION API ENDPOINT - Simplified for Existing Schema
 * Works with existing users table + location JSONB array
 * ============================================================================
 */

// File: app/api/location+api.ts

import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '@/utils/logger';

// ==================== TYPES ====================

interface LocationPayload {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
    meta?: {
        emergencyContact?: string;
        trigger?: 'SOS' | 'background' | 'manual';
        [key: string]: any;
    };
}

interface LocationSyncResponse {
    success: boolean;
    processed: number;
    failed: number;
    message: string;
    timestamp: string;
}

// ==================== MIDDLEWARE ====================

/**
 * Verify JWT token and extract userId
 * TODO: Replace with your actual JWT verification logic
 */
async function verifyToken(token: string): Promise<string | null> {
    try {
        if (!token || token.length < 10) {
            return null;
        }

        // Placeholder: Extract userId from token
        // In production, use proper JWT library (jsonwebtoken, jose, etc.)
        // Example with jsonwebtoken:
        // const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
        // return decoded.userId;

        // For now, basic parsing (replace with real JWT verification)
        const userId = extractUserIdFromToken(token);
        return userId;
    } catch (error) {
        console.error('[Location API] Token verification failed:', error);
        return null;
    }
}

/**
 * Extract userId from JWT token (placeholder)
 */
function extractUserIdFromToken(token: string): string | null {
    try {
        // Decode JWT payload (doesn't verify signature - unsafe for production!)
        // This is just for development/testing
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        // Try common userId field names
        return payload.userId || payload.sub || payload.id || null;
    } catch {
        return null;
    }
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return new Response(response.body, { ...response, headers });
}

/**
 * Validate location data
 */
function validateLocation(location: any): location is LocationPayload {
    return (
        typeof location === 'object' &&
        typeof location.latitude === 'number' &&
        typeof location.longitude === 'number' &&
        typeof location.timestamp === 'string' &&
        location.latitude >= -90 &&
        location.latitude <= 90 &&
        location.longitude >= -180 &&
        location.longitude <= 180 &&
        !isNaN(new Date(location.timestamp).getTime())
    );
}

// ==================== MAIN API HANDLER ====================

export async function POST(request: Request) {
    const startTime = Date.now();
    const requestId = `req_${crypto.randomBytes(4).toString('hex')}`;

    try {
        logger.info(`[Location API] ${requestId} Request received`, {
            method: request.method,
            url: request.url,
            time: new Date().toISOString(),
        });

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            logger.info(`[Location API] ${requestId} CORS preflight`);
            return addCorsHeaders(new Response(null, { status: 200 }));
        }

        // ==================== AUTH VERIFICATION ====================

        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '').trim();

        if (!token) {
            logger.warn(`[Location API] ${requestId} Missing authorization token`);
            return addCorsHeaders(
                new Response(
                    JSON.stringify({
                        success: false,
                        message: 'Missing authorization token',
                    }),
                    { status: 401, headers: { 'Content-Type': 'application/json' } }
                )
            );
        }

        // Verify token and extract userId
        const userId = await verifyToken(token);
        if (!userId) {
            logger.warn(`[Location API] ${requestId} Invalid or expired token`);
            return addCorsHeaders(
                new Response(
                    JSON.stringify({
                        success: false,
                        message: 'Invalid or expired token',
                    }),
                    { status: 403, headers: { 'Content-Type': 'application/json' } }
                )
            );
        }

        console.log(`[Location API] ${requestId} ✅ Auth verified for user: ${userId}`);

        // ==================== PARSE REQUEST BODY ====================

        let body: any;
        try {
            body = await request.json();
        } catch {
            logger.error(`[Location API] ${requestId} Invalid JSON in request body`);
            return addCorsHeaders(
                new Response(
                    JSON.stringify({
                        success: false,
                        message: 'Invalid JSON in request body',
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                )
            );
        }

        // Normalize to array
        const locationsToProcess = Array.isArray(body) ? body : [body];

        if (locationsToProcess.length === 0) {
            logger.info(`[Location API] ${requestId} No locations in request`);
            return addCorsHeaders(
                new Response(
                    JSON.stringify({
                        success: true,
                        processed: 0,
                        failed: 0,
                        message: 'No locations in request',
                        timestamp: new Date().toISOString(),
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            );
        }

        logger.info(`[Location API] ${requestId} 📦 Processing batch`, {
            batchSize: locationsToProcess.length,
            userId,
        });

        // ==================== VALIDATE LOCATIONS ====================

        const validLocations: LocationPayload[] = [];
        const invalidLocations: any[] = [];

        for (const location of locationsToProcess) {
            if (validateLocation(location)) {
                validLocations.push(location);
            } else {
                invalidLocations.push(location);
                console.warn(`[Location API] ${requestId} Invalid location rejected`, location);
            }
        }

        if (validLocations.length === 0) {
            logger.error(`[Location API] ${requestId} No valid locations in batch`);
            return addCorsHeaders(
                new Response(
                    JSON.stringify({
                        success: false,
                        processed: 0,
                        failed: invalidLocations.length,
                        message: 'No valid locations in batch',
                        timestamp: new Date().toISOString(),
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                )
            );
        }

        logger.info(`[Location API] ${requestId} ✅ Validation complete`, {
            valid: validLocations.length,
            invalid: invalidLocations.length,
        });

        // ==================== UPDATE USERS TABLE ====================

        try {
            // Convert to location objects matching your schema
            const locationObjects = validLocations.map((loc) => ({
                latitude: loc.latitude,
                longitude: loc.longitude,
                timestamp: loc.timestamp,
                accuracy: loc.accuracy || null,
                altitude: loc.altitude || null,
                speed: loc.speed || null,
                heading: loc.heading || null,
                meta: loc.meta || null,
            }));

            console.log(`[Location API] ${requestId} Preparing database update`, {
                userId,
                locations: locationObjects.length,
                // Log if we have meta data for debugging
                hasMeta: locationObjects.some(l => l.meta !== null)
            });

            // Use PostgreSQL JSONB array concatenation to append (not overwrite)
            // This ensures we preserve existing locations and only add new ones
            const result = await db
                .update(users)
                .set({
                    location: sql`COALESCE(${users.location}, '[]'::jsonb) || ${JSON.stringify(
                        locationObjects
                    )}::jsonb`,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, userId))
                .execute();

            logger.info(`[Location API] ${requestId} ✅ Database updated`, {
                userId,
                processedCount: validLocations.length,
            });

            // ==================== CLEAN UP OLD LOCATIONS ====================

            // Optional: Keep only last 1000 locations per user (prevents DB bloat)
            try {
                await db
                    .update(users)
                    .set({
                        location: sql`(
              SELECT jsonb_agg(elem ORDER BY (elem->>'timestamp') DESC)
              FROM (
                SELECT jsonb_array_elements(${users.location}) as elem
                WHERE elem->>'timestamp' IS NOT NULL
                LIMIT 1000
              ) AS limited
            )`,
                    })
                    .where(eq(users.id, userId))
                    .execute();

                console.log(`[Location API] ${requestId} ✅ Cleaned up old locations (kept last 1000)`);
            } catch (cleanupError) {
                console.warn(`[Location API] ${requestId} Cleanup failed (non-critical):`, cleanupError);
                // Don't fail if cleanup fails - it's just optimization
            }

            // ==================== PREPARE RESPONSE ====================

            const processingTime = Date.now() - startTime;

            const response: LocationSyncResponse = {
                success: true,
                processed: validLocations.length,
                failed: invalidLocations.length,
                message:
                    invalidLocations.length > 0
                        ? `Processed ${validLocations.length} locations (${invalidLocations.length} invalid)`
                        : `Successfully processed ${validLocations.length} locations`,
                timestamp: new Date().toISOString(),
            };

            console.log(`[Location API] ${requestId} ✅ Response sent`, {
                ...response,
                processingTime: `${processingTime}ms`,
            });

            return addCorsHeaders(
                new Response(JSON.stringify(response), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        } catch (dbError) {
            console.error(`[Location API] ${requestId} ❌ Database error:`, dbError);

            const errorMessage =
                dbError instanceof Error ? dbError.message : 'Unknown database error';

            return addCorsHeaders(
                new Response(
                    JSON.stringify({
                        success: false,
                        processed: 0,
                        failed: validLocations.length,
                        message: `Database error: ${errorMessage}`,
                        timestamp: new Date().toISOString(),
                    }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                )
            );
        }
    } catch (error) {
        console.error(`[Location API] ${requestId} ❌ Unhandled error:`, error);

        const errorMessage = error instanceof Error ? error.message : 'Internal server error';

        return addCorsHeaders(
            new Response(
                JSON.stringify({
                    success: false,
                    processed: 0,
                    failed: 0,
                    message: errorMessage,
                    timestamp: new Date().toISOString(),
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        );
    }
}

// ==================== OPTIONAL: GET ENDPOINT ====================

/**
 * Optional: Retrieve user's location history
 * Usage: GET /api/location?userId=xxx
 */
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '').trim();

        if (!token) {
            return addCorsHeaders(
                new Response(
                    JSON.stringify({ error: 'Missing authorization' }),
                    { status: 401, headers: { 'Content-Type': 'application/json' } }
                )
            );
        }

        const userId = await verifyToken(token);
        if (!userId) {
            return addCorsHeaders(
                new Response(
                    JSON.stringify({ error: 'Invalid token' }),
                    { status: 403, headers: { 'Content-Type': 'application/json' } }
                )
            );
        }

        // Get user's locations
        const result = await db
            .select({ location: users.location })
            .from(users)
            .where(eq(users.id, userId))
            .execute();

        if (!result || result.length === 0) {
            return addCorsHeaders(
                new Response(
                    JSON.stringify({ locations: [], count: 0 }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            );
        }

        const locations = (result[0].location as any[]) || [];

        console.log(`[Location API] GET: Retrieved ${locations.length} locations for user ${userId}`);

        return addCorsHeaders(
            new Response(
                JSON.stringify({
                    userId,
                    locations,
                    count: locations.length,
                    lastLocation: locations[locations.length - 1] || null,
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        );
    } catch (error) {
        console.error('[Location API] GET error:', error);
        return addCorsHeaders(
            new Response(
                JSON.stringify({ error: 'Server error' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        );
    }
}

// ==================== TESTING UTILITIES ====================

/**
 * Test helper: Generate mock locations
 */
export function generateMockLocations(count: number = 10) {
    const locations: LocationPayload[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        locations.push({
            latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
            longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
            timestamp: new Date(now - (count - i) * 3000).toISOString(),
            accuracy: Math.random() * 50,
            altitude: 100 + Math.random() * 50,
            speed: Math.random() * 10,
            heading: Math.random() * 360,
        });
    }

    return locations;
}
