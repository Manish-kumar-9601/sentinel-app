/**
 * Multi-Layer SOS Service
 * Implements 4-layer safety net for emergency alerts
 * 
 * Layer 1: Network/API (Primary - 100% automatic)
 * Layer 2: WhatsApp (Secondary - 95% automatic)
 * Layer 3: SMS (Fallback - 50% automatic, needs user click)
 * Layer 4: Phone Call (Manual - backup option)
 */

import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import { Alert } from 'react-native';

// Types
export interface EmergencyContact {
    id?: string;
    name: string;
    phone: string;
    relationship?: string;
}

export interface LocationData {
    coords: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    address?: string;
}

export interface SOSResult {
    layer: 'api' | 'whatsapp' | 'sms' | 'call';
    success: boolean;
    contactsReached: number;
    details: string;
    error?: string;
}

export interface MultiLayerSOSResult {
    alertId: string;
    layers: SOSResult[];
    totalContactsNotified: number;
    timestamp: number;
    location: LocationData | null;
}

export class MultiLayerSOSService {
    private static API_URL = process.env.EXPO_PUBLIC_API_URL || '';

    /**
     * LAYER 1: Network/API Alert
     * Send emergency alert via API to server
     * Server can then send push notifications, emails, etc.
     */
    static async sendNetworkAlert(
        userId: string,
        contacts: EmergencyContact[],
        location: LocationData | null,
        message: string
    ): Promise<SOSResult> {
        try {
            const response = await fetch(`${this.API_URL}/api/emergency-alert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    contacts: contacts.map(c => ({
                        name: c.name,
                        phone: c.phone,
                    })),
                    location: location ? {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy,
                        address: location.address,
                    } : null,
                    message,
                    timestamp: Date.now(),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    layer: 'api',
                    success: true,
                    contactsReached: data.notified || contacts.length,
                    details: `Network alert sent to ${data.notified || contacts.length} contacts`,
                };
            } else {
                throw new Error(`API returned ${response.status}`);
            }
        } catch (error) {
            console.error('Layer 1 (Network) failed:', error);
            return {
                layer: 'api',
                success: false,
                contactsReached: 0,
                details: 'Network alert failed - no internet connection',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * LAYER 2: WhatsApp Messages
     * Send emergency messages via WhatsApp
     * Works 95% automatically if WhatsApp is installed
     */
    static async sendWhatsAppAlerts(
        contacts: EmergencyContact[],
        location: LocationData | null,
        message: string
    ): Promise<SOSResult> {
        try {
            // Check if WhatsApp is installed
            const canOpen = await Linking.canOpenURL('whatsapp://send');
            if (!canOpen) {
                return {
                    layer: 'whatsapp',
                    success: false,
                    contactsReached: 0,
                    details: 'WhatsApp not installed',
                };
            }

            const locationText = location
                ? `\n📍 Location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`
                : '';

            const fullMessage = `${message}${locationText}`;
            let successCount = 0;

            // Send to each contact (with delays between messages)
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                try {
                    let phoneNumber = contact.phone.replace(/\D/g, '');

                    // Add country code if needed (assuming India +91)
                    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
                        phoneNumber = '91' + phoneNumber;
                    }

                    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(fullMessage)}`;
                    await Linking.openURL(whatsappUrl);
                    successCount++;

                    // Wait 2 seconds between messages (except for last one)
                    if (i < contacts.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.error(`WhatsApp failed for ${contact.name}:`, error);
                }
            }

            return {
                layer: 'whatsapp',
                success: successCount > 0,
                contactsReached: successCount,
                details: `WhatsApp messages opened for ${successCount}/${contacts.length} contacts`,
            };
        } catch (error) {
            console.error('Layer 2 (WhatsApp) failed:', error);
            return {
                layer: 'whatsapp',
                success: false,
                contactsReached: 0,
                details: 'WhatsApp messaging failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * LAYER 3: SMS Messages
     * Send emergency SMS (requires user to click "Send")
     * 50% automatic - needs user confirmation
     */
    static async sendSMSAlerts(
        contacts: EmergencyContact[],
        location: LocationData | null,
        message: string
    ): Promise<SOSResult> {
        try {
            // Check if SMS is available
            const isAvailable = await SMS.isAvailableAsync();
            if (!isAvailable) {
                return {
                    layer: 'sms',
                    success: false,
                    contactsReached: 0,
                    details: 'SMS not available on this device',
                };
            }

            const locationText = location
                ? `\nLocation: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`
                : '';

            const fullMessage = `${message}${locationText}`;
            const phoneNumbers = contacts.map(c => c.phone);

            // Open SMS compose dialog
            const { result } = await SMS.sendSMSAsync(phoneNumbers, fullMessage);

            return {
                layer: 'sms',
                success: result === 'sent',
                contactsReached: result === 'sent' ? contacts.length : 0,
                details: result === 'sent'
                    ? `SMS sent to ${contacts.length} contacts`
                    : 'SMS compose opened (waiting for user to send)',
            };
        } catch (error) {
            console.error('Layer 3 (SMS) failed:', error);
            return {
                layer: 'sms',
                success: false,
                contactsReached: 0,
                details: 'SMS failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * LAYER 4: Phone Call
     * Emergency call to primary contact
     * Manual - user must confirm and dial
     */
    static async initiateEmergencyCall(
        primaryContact: EmergencyContact
    ): Promise<SOSResult> {
        try {
            const phoneUrl = `tel:${primaryContact.phone}`;
            const canOpen = await Linking.canOpenURL(phoneUrl);

            if (!canOpen) {
                return {
                    layer: 'call',
                    success: false,
                    contactsReached: 0,
                    details: 'Phone dialer not available',
                };
            }

            await Linking.openURL(phoneUrl);

            return {
                layer: 'call',
                success: true,
                contactsReached: 1,
                details: `Phone dialer opened for ${primaryContact.name}`,
            };
        } catch (error) {
            console.error('Layer 4 (Call) failed:', error);
            return {
                layer: 'call',
                success: false,
                contactsReached: 0,
                details: 'Phone call failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * MAIN METHOD: Execute Multi-Layer SOS
     * Tries all 4 layers in sequence
     * Returns comprehensive results
     */
    static async executeMultiLayerSOS(
        userId: string,
        contacts: EmergencyContact[],
        location: LocationData | null,
        message: string,
        options: {
            skipAPI?: boolean;
            skipWhatsApp?: boolean;
            skipSMS?: boolean;
            skipCall?: boolean;
            primaryContactId?: string;
        } = {}
    ): Promise<MultiLayerSOSResult> {
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const results: SOSResult[] = [];
        const timestamp = Date.now();

        console.log('🚨 Executing Multi-Layer SOS...');
        console.log(`📋 Contacts: ${contacts.length}`);
        console.log(`📍 Location: ${location ? 'Yes' : 'No'}`);

        // LAYER 1: Network/API Alert (Primary)
        if (!options.skipAPI) {
            console.log('🌐 Layer 1: Network Alert...');
            const apiResult = await this.sendNetworkAlert(userId, contacts, location, message);
            results.push(apiResult);

            if (apiResult.success) {
                console.log('✅ Layer 1 SUCCESS');
            } else {
                console.log('❌ Layer 1 FAILED - Trying fallbacks...');
            }
        }

        // LAYER 2: WhatsApp (Secondary)
        if (!options.skipWhatsApp) {
            console.log('💬 Layer 2: WhatsApp...');
            const whatsappResult = await this.sendWhatsAppAlerts(contacts, location, message);
            results.push(whatsappResult);

            if (whatsappResult.success) {
                console.log('✅ Layer 2 SUCCESS');
            } else {
                console.log('❌ Layer 2 FAILED - Trying fallbacks...');
            }
        }

        // LAYER 3: SMS (Fallback)
        if (!options.skipSMS) {
            console.log('📱 Layer 3: SMS...');
            const smsResult = await this.sendSMSAlerts(contacts, location, message);
            results.push(smsResult);

            if (smsResult.success) {
                console.log('✅ Layer 3 SUCCESS');
            } else {
                console.log('⚠️ Layer 3 needs user confirmation');
            }
        }

        // LAYER 4: Phone Call (Manual backup)
        if (!options.skipCall && contacts.length > 0) {
            // Find primary contact or use first contact
            const primaryContact = options.primaryContactId
                ? contacts.find(c => c.id === options.primaryContactId) || contacts[0]
                : contacts[0];

            // Only offer call if other layers failed
            const allLayersFailed = results.every(r => !r.success);
            if (allLayersFailed) {
                Alert.alert(
                    '⚠️ All Alert Methods Failed',
                    `Would you like to call ${primaryContact.name} directly?`,
                    [
                        { text: 'No', style: 'cancel' },
                        {
                            text: 'Call Now',
                            onPress: async () => {
                                console.log('📞 Layer 4: Emergency Call...');
                                const callResult = await this.initiateEmergencyCall(primaryContact);
                                results.push(callResult);
                                console.log('✅ Layer 4 initiated');
                            },
                        },
                    ]
                );
            }
        }

        // Calculate total contacts notified
        const totalContactsNotified = results.reduce(
            (sum, result) => sum + result.contactsReached,
            0
        );

        console.log('🎯 Multi-Layer SOS Complete');
        console.log(`📊 Total contacts notified: ${totalContactsNotified}`);
        console.log(`📈 Layers used: ${results.length}`);

        return {
            alertId,
            layers: results,
            totalContactsNotified,
            timestamp,
            location,
        };
    }

    /**
     * Format results for user display
     */
    static formatResultsForUser(result: MultiLayerSOSResult): string {
        const lines: string[] = ['🚨 Emergency Alert Status:\n'];

        result.layers.forEach((layer, index) => {
            const emoji = layer.success ? '✅' : '❌';
            const layerName = layer.layer.toUpperCase();
            lines.push(`${emoji} Layer ${index + 1} (${layerName}): ${layer.details}`);
        });

        lines.push(`\n📊 Total Contacts Notified: ${result.totalContactsNotified}`);

        if (result.location) {
            lines.push('📍 Location shared with contacts');
        }

        return lines.join('\n');
    }
}
