/**
 * Evidence & Location Sharing Service
 * Shares evidence (photos, videos, audio) and location history with emergency contacts
 * Creates secure shareable links with access tokens
 */

import { db } from '@/db/client';
import { emergencyContacts, evidence, locationHistory, sharedDataSessions } from '@/db/schema';
import { and, desc, eq, gte } from 'drizzle-orm';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

// Types
export interface EvidenceItem {
    id: string;
    type: 'photo' | 'video' | 'audio' | 'document';
    fileName: string;
    localUri: string;
    cloudUri?: string;
    thumbnailUri?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    createdAt: Date;
    isShared: boolean;
}

export interface LocationHistoryPoint {
    id: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: Date;
    address?: string;
    isEmergency: boolean;
}

export interface SharedDataPackage {
    sessionId: string;
    shareLink: string;
    accessToken: string;
    evidence: EvidenceItem[];
    locationHistory: LocationHistoryPoint[];
    expiresAt: Date;
    recipientName: string;
    recipientPhone: string;
}

export class EvidenceLocationSharingService {
    private static readonly API_URL = process.env.EXPO_PUBLIC_API_URL || '';
    private static readonly SHARE_EXPIRY_HOURS = 48; // Links expire after 48 hours

    /**
     * Capture and store evidence (photo/video/audio)
     */
    static async captureEvidence(
        userId: string,
        type: 'photo' | 'video' | 'audio',
        fileUri: string,
        options?: {
            alertId?: string;
            location?: { latitude: number; longitude: number };
            description?: string;
            tags?: string[];
        }
    ): Promise<string> {
        try {
            const evidenceId = `evidence_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const fileName = fileUri.split('/').pop() || 'unknown';

            // Get file info
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            const fileSize = fileInfo.exists ? (fileInfo as any).size : 0;

            // Get location if not provided
            let location = options?.location;
            let address;

            if (!location) {
                try {
                    const currentLocation = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    location = {
                        latitude: currentLocation.coords.latitude,
                        longitude: currentLocation.coords.longitude,
                    };
                } catch (error) {
                    console.error('Could not get location for evidence:', error);
                }
            }

            // Reverse geocode if we have location
            if (location) {
                try {
                    const addresses = await Location.reverseGeocodeAsync(location);
                    if (addresses && addresses.length > 0) {
                        const addr = addresses[0];
                        address = `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
                    }
                } catch (error) {
                    console.error('Reverse geocoding failed:', error);
                }
            }

            // Get device info
            const deviceInfo = {
                platform: Platform.OS,
                model: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
                timestamp: new Date().toISOString(),
            };

            // Store in database
            await db.insert(evidence).values({
                id: evidenceId,
                userId,
                alertId: options?.alertId || null,
                type,
                fileName,
                fileSize: fileSize.toString(),
                mimeType: this.getMimeType(type, fileName),
                localUri: fileUri,
                latitude: location?.latitude.toString(),
                longitude: location?.longitude.toString(),
                address,
                deviceInfo: JSON.stringify(deviceInfo),
                description: options?.description,
                tags: options?.tags?.join(','),
                isShared: 'false',
            });

            console.log(`✅ Evidence captured: ${evidenceId}`);
            return evidenceId;

        } catch (error) {
            console.error('Error capturing evidence:', error);
            throw error;
        }
    }

    /**
     * Store location history point
     */
    static async storeLocationPoint(
        userId: string,
        location: {
            latitude: number;
            longitude: number;
            accuracy?: number;
            altitude?: number;
            speed?: number;
            heading?: number;
        },
        options?: {
            isEmergency?: boolean;
            alertId?: string;
        }
    ): Promise<string> {
        try {
            const locationId = `loc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Reverse geocode
            let address;
            try {
                const addresses = await Location.reverseGeocodeAsync({
                    latitude: location.latitude,
                    longitude: location.longitude,
                });
                if (addresses && addresses.length > 0) {
                    const addr = addresses[0];
                    address = `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
                }
            } catch (error) {
                console.error('Reverse geocoding failed:', error);
            }

            // Store in database
            await db.insert(locationHistory).values({
                id: locationId,
                userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                accuracy: location.accuracy?.toString(),
                altitude: location.altitude?.toString(),
                speed: location.speed?.toString(),
                heading: location.heading?.toString(),
                address,
                isEmergency: options?.isEmergency ? 'true' : 'false',
                alertId: options?.alertId || null,
                isShared: 'false',
            });

            return locationId;

        } catch (error) {
            console.error('Error storing location point:', error);
            throw error;
        }
    }

    /**
     * Create shareable data package for emergency contacts
     * Generates secure link with evidence and location history
     */
    static async createSharedDataPackage(
        userId: string,
        contactIds: string[],
        options?: {
            alertId?: string;
            includeLastHours?: number; // Include location history from last X hours
            includeAllEvidence?: boolean;
            specificEvidenceIds?: string[];
        }
    ): Promise<SharedDataPackage[]> {
        try {
            const packages: SharedDataPackage[] = [];
            const includeLastHours = options?.includeLastHours || 24;

            // Get evidence to share
            let evidenceToShare: any[] = [];
            if (options?.specificEvidenceIds) {
                // Specific evidence
                for (const evidId of options.specificEvidenceIds) {
                    const evid = await db.query.evidence.findFirst({
                        where: and(
                            eq(evidence.userId, userId),
                            eq(evidence.id, evidId)
                        ),
                    });
                    if (evid) evidenceToShare.push(evid);
                }
            } else if (options?.includeAllEvidence) {
                // All evidence
                evidenceToShare = await db.query.evidence.findMany({
                    where: eq(evidence.userId, userId),
                    orderBy: [desc(evidence.createdAt)],
                });
            } else if (options?.alertId) {
                // Evidence linked to specific alert
                evidenceToShare = await db.query.evidence.findMany({
                    where: and(
                        eq(evidence.userId, userId),
                        eq(evidence.alertId, options.alertId)
                    ),
                });
            }

            // Get location history from last X hours
            const cutoffTime = new Date(Date.now() - includeLastHours * 60 * 60 * 1000);
            const locationHistoryToShare = await db.query.locationHistory.findMany({
                where: and(
                    eq(locationHistory.userId, userId),
                    gte(locationHistory.timestamp, cutoffTime)
                ),
                orderBy: [desc(locationHistory.timestamp)],
            });

            // Create share session for each contact
            for (const contactId of contactIds) {
                // Get contact info
                const contact = await db.query.emergencyContacts.findFirst({
                    where: eq(emergencyContacts.id, contactId),
                });

                if (!contact) continue;

                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const accessToken = this.generateAccessToken();
                const shareLink = `${this.API_URL}/shared/${sessionId}?token=${accessToken}`;
                const expiresAt = new Date(Date.now() + this.SHARE_EXPIRY_HOURS * 60 * 60 * 1000);

                // Create session in database
                await db.insert(sharedDataSessions).values({
                    id: sessionId,
                    userId,
                    alertId: options?.alertId || null,
                    recipientContactId: contactId,
                    recipientPhone: contact.phone,
                    recipientName: contact.name,
                    evidenceIds: JSON.stringify(evidenceToShare.map(e => e.id)),
                    locationHistoryCount: locationHistoryToShare.length.toString(),
                    shareLink,
                    accessToken,
                    status: 'active',
                    expiresAt,
                });

                // Mark evidence and locations as shared
                for (const evid of evidenceToShare) {
                    await db.update(evidence)
                        .set({
                            isShared: 'true',
                            sharedWith: JSON.stringify([...JSON.parse(evid.sharedWith || '[]'), contactId]),
                            sharedAt: new Date(),
                        })
                        .where(eq(evidence.id, evid.id));
                }

                for (const loc of locationHistoryToShare) {
                    await db.update(locationHistory)
                        .set({
                            isShared: 'true',
                            sharedWith: JSON.stringify([...JSON.parse(loc.sharedWith || '[]'), contactId]),
                        })
                        .where(eq(locationHistory.id, loc.id));
                }

                packages.push({
                    sessionId,
                    shareLink,
                    accessToken,
                    evidence: evidenceToShare.map(e => ({
                        id: e.id,
                        type: e.type as any,
                        fileName: e.fileName,
                        localUri: e.localUri,
                        cloudUri: e.cloudUri,
                        thumbnailUri: e.thumbnailUri,
                        latitude: e.latitude ? parseFloat(e.latitude) : undefined,
                        longitude: e.longitude ? parseFloat(e.longitude) : undefined,
                        address: e.address,
                        createdAt: e.createdAt,
                        isShared: e.isShared === 'true',
                    })),
                    locationHistory: locationHistoryToShare.map(l => ({
                        id: l.id,
                        latitude: parseFloat(l.latitude),
                        longitude: parseFloat(l.longitude),
                        accuracy: l.accuracy ? parseFloat(l.accuracy) : undefined,
                        timestamp: l.timestamp,
                        address: l.address,
                        isEmergency: l.isEmergency === 'true',
                    })),
                    expiresAt,
                    recipientName: contact.name,
                    recipientPhone: contact.phone,
                });

                console.log(`✅ Created share package for ${contact.name}: ${shareLink}`);
            }

            return packages;

        } catch (error) {
            console.error('Error creating shared data package:', error);
            throw error;
        }
    }

    /**
     * Share evidence and location via WhatsApp/SMS
     */
    static async shareViaMessaging(
        packages: SharedDataPackage[],
        method: 'whatsapp' | 'sms' | 'both' = 'both'
    ): Promise<void> {
        const { Linking } = await import('react-native');
        const SMS = await import('expo-sms');

        for (const pkg of packages) {
            const message = this.formatShareMessage(pkg);

            if (method === 'whatsapp' || method === 'both') {
                try {
                    const phoneNumber = pkg.recipientPhone.replace(/\D/g, '');
                    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
                    const canOpen = await Linking.canOpenURL(whatsappUrl);
                    if (canOpen) {
                        await Linking.openURL(whatsappUrl);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.error('WhatsApp share failed:', error);
                }
            }

            if (method === 'sms' || method === 'both') {
                try {
                    const isAvailable = await SMS.isAvailableAsync();
                    if (isAvailable) {
                        await SMS.sendSMSAsync([pkg.recipientPhone], message);
                    }
                } catch (error) {
                    console.error('SMS share failed:', error);
                }
            }
        }
    }

    /**
     * Get user's evidence
     */
    static async getUserEvidence(
        userId: string,
        filters?: {
            type?: 'photo' | 'video' | 'audio';
            alertId?: string;
            limit?: number;
        }
    ): Promise<EvidenceItem[]> {
        try {
            let query = db.select().from(evidence).where(eq(evidence.userId, userId));

            const results = await query;

            return results
                .filter(e => !filters?.type || e.type === filters.type)
                .filter(e => !filters?.alertId || e.alertId === filters.alertId)
                .slice(0, filters?.limit || 100)
                .map(e => ({
                    id: e.id,
                    type: e.type as any,
                    fileName: e.fileName,
                    localUri: e.localUri || '',
                    cloudUri: e.cloudUri || undefined,
                    thumbnailUri: e.thumbnailUri || undefined,
                    latitude: e.latitude ? parseFloat(e.latitude) : undefined,
                    longitude: e.longitude ? parseFloat(e.longitude) : undefined,
                    address: e.address || undefined,
                    createdAt: e.createdAt,
                    isShared: e.isShared === 'true',
                }));

        } catch (error) {
            console.error('Error getting evidence:', error);
            return [];
        }
    }

    /**
     * Get user's location history from database
     */
    static async getUserLocationHistory(
        userId: string,
        filters?: {
            lastHours?: number;
            isEmergency?: boolean;
            limit?: number;
        }
    ): Promise<LocationHistoryPoint[]> {
        try {
            const cutoffTime = filters?.lastHours
                ? new Date(Date.now() - filters.lastHours * 60 * 60 * 1000)
                : new Date(0);

            let query = db.select()
                .from(locationHistory)
                .where(
                    and(
                        eq(locationHistory.userId, userId),
                        gte(locationHistory.timestamp, cutoffTime)
                    )
                )
                .orderBy(desc(locationHistory.timestamp));

            const results = await query;

            return results
                .filter(l => filters?.isEmergency === undefined || (l.isEmergency === 'true') === filters.isEmergency)
                .slice(0, filters?.limit || 1000)
                .map(l => ({
                    id: l.id,
                    latitude: parseFloat(l.latitude),
                    longitude: parseFloat(l.longitude),
                    accuracy: l.accuracy ? parseFloat(l.accuracy) : undefined,
                    timestamp: l.timestamp,
                    address: l.address || undefined,
                    isEmergency: l.isEmergency === 'true',
                }));

        } catch (error) {
            console.error('Error getting location history:', error);
            return [];
        }
    }

    /**
     * Generate secure access token
     */
    private static generateAccessToken(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    /**
     * Get MIME type from file extension
     */
    private static getMimeType(type: string, fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase();

        if (type === 'photo') {
            if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
            if (ext === 'png') return 'image/png';
            if (ext === 'heic') return 'image/heic';
            return 'image/*';
        }

        if (type === 'video') {
            if (ext === 'mp4') return 'video/mp4';
            if (ext === 'mov') return 'video/quicktime';
            return 'video/*';
        }

        if (type === 'audio') {
            if (ext === 'm4a') return 'audio/mp4';
            if (ext === 'mp3') return 'audio/mpeg';
            if (ext === 'wav') return 'audio/wav';
            return 'audio/*';
        }

        return 'application/octet-stream';
    }

    /**
     * Format share message
     */
    private static formatShareMessage(pkg: SharedDataPackage): string {
        const evidenceCount = pkg.evidence.length;
        const locationCount = pkg.locationHistory.length;
        const expiryDate = pkg.expiresAt.toLocaleDateString();

        return `🚨 EMERGENCY ALERT - Shared Data

${evidenceCount} evidence file(s) and ${locationCount} location points have been shared with you.

📍 View real-time location and evidence:
${pkg.shareLink}

⏰ This link expires on ${expiryDate}

🔒 This is a secure, private link. Keep it confidential.

- Sentinel Safety App`;
    }

    /**
     * Delete evidence
     */
    static async deleteEvidence(evidenceId: string): Promise<void> {
        try {
            await db.delete(evidence).where(eq(evidence.id, evidenceId));
            console.log(`🗑️ Evidence deleted: ${evidenceId}`);
        } catch (error) {
            console.error('Error deleting evidence:', error);
            throw error;
        }
    }

    /**
     * Revoke shared data session
     */
    static async revokeShareSession(sessionId: string): Promise<void> {
        try {
            await db.update(sharedDataSessions)
                .set({ status: 'revoked' })
                .where(eq(sharedDataSessions.id, sessionId));
            console.log(`🚫 Share session revoked: ${sessionId}`);
        } catch (error) {
            console.error('Error revoking session:', error);
            throw error;
        }
    }
}
