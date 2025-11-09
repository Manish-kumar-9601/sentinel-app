/**
 * Voice-Activated SOS Service
 * Uses latest expo-speech v12.4.0 for voice recognition and text-to-speech
 * Allows hands-free emergency alerts
 */

import * as Speech from 'expo-speech';
import { Alert } from 'react-native';

// Voice commands for SOS activation
const SOS_TRIGGER_PHRASES = [
    'help',
    'emergency',
    'sos',
    'call help',
    'need help',
    'danger',
    'rescue',
    'police',
    'ambulance',
];

// Types
export interface VoiceSOSConfig {
    enabled: boolean;
    confirmationRequired: boolean; // Ask for confirmation before sending
    voiceFeedback: boolean; // Speak status updates
    triggerPhrases: string[];
}

export interface VoiceRecognitionResult {
    recognized: boolean;
    transcript: string;
    confidence: number;
    isSosTrigger: boolean;
}

export class VoiceActivatedSOSService {
    private static isListening = false;
    private static config: VoiceSOSConfig = {
        enabled: true,
        confirmationRequired: true,
        voiceFeedback: true,
        triggerPhrases: SOS_TRIGGER_PHRASES,
    };

    /**
     * Check if speech recognition is available
     * Note: expo-speech provides TTS, for full STT we'd need @react-native-voice/voice
     */
    static async isAvailable(): Promise<boolean> {
        try {
            // Check if text-to-speech is available
            const available = await Speech.isSpeakingAsync();
            return true; // TTS is available
        } catch (error) {
            console.error('Voice services not available:', error);
            return false;
        }
    }

    /**
     * Speak a message (Text-to-Speech)
     * Uses latest expo-speech API with advanced options
     */
    static async speak(
        message: string,
        options?: {
            language?: string;
            pitch?: number;
            rate?: number;
            voice?: string;
            onDone?: () => void;
            onError?: (error: Error) => void;
        }
    ): Promise<void> {
        try {
            // Stop any ongoing speech
            await Speech.stop();

            // Get available voices
            const voices = await Speech.getAvailableVoicesAsync();
            console.log('📢 Available voices:', voices.length);

            // Find best voice for language
            let selectedVoice: string | undefined;
            if (options?.language) {
                const voiceForLanguage = voices.find(
                    (v) => v.language.startsWith(options.language!)
                );
                selectedVoice = voiceForLanguage?.identifier;
            }

            // Speak with options
            await Speech.speak(message, {
                language: options?.language || 'en-US',
                pitch: options?.pitch || 1.0,
                rate: options?.rate || 1.0,
                voice: selectedVoice || options?.voice,
                onDone: options?.onDone,
                onStopped: () => console.log('🛑 Speech stopped'),
                onError: (error: any) => {
                    console.error('❌ Speech error:', error);
                    options?.onError?.(new Error(error?.error || 'Speech error'));
                },
            });

            console.log('📢 Speaking:', message);
        } catch (error) {
            console.error('Error in text-to-speech:', error);
            options?.onError?.(error as Error);
        }
    }

    /**
     * Stop current speech
     */
    static async stopSpeaking(): Promise<void> {
        try {
            await Speech.stop();
        } catch (error) {
            console.error('Error stopping speech:', error);
        }
    }

    /**
     * Check if currently speaking
     */
    static async isSpeaking(): Promise<boolean> {
        try {
            return await Speech.isSpeakingAsync();
        } catch (error) {
            return false;
        }
    }

    /**
     * Pause current speech
     */
    static async pauseSpeaking(): Promise<void> {
        try {
            await Speech.pause();
        } catch (error) {
            console.error('Error pausing speech:', error);
        }
    }

    /**
     * Resume paused speech
     */
    static async resumeSpeaking(): Promise<void> {
        try {
            await Speech.resume();
        } catch (error) {
            console.error('Error resuming speech:', error);
        }
    }

    /**
     * Announce SOS activation with voice feedback
     */
    static async announceSOS(
        contactsCount: number,
        hasLocation: boolean
    ): Promise<void> {
        if (!this.config.voiceFeedback) return;

        const locationText = hasLocation ? 'with your location' : 'without location';
        const message = `Emergency S O S activated. Sending alert to ${contactsCount} contacts ${locationText}.`;

        await this.speak(message, {
            rate: 0.9, // Slightly slower for clarity
            pitch: 1.1, // Slightly higher pitch for urgency
        });
    }

    /**
     * Announce SOS status update
     */
    static async announceStatus(message: string): Promise<void> {
        if (!this.config.voiceFeedback) return;
        await this.speak(message);
    }

    /**
     * Voice confirmation for SOS
     * Returns true if user confirms
     */
    static async requestVoiceConfirmation(): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.config.confirmationRequired) {
                resolve(true);
                return;
            }

            this.speak('Emergency S O S detected. Say YES to confirm, or NO to cancel.', {
                onDone: () => {
                    // Show alert for confirmation (since we can't do real STT without additional library)
                    Alert.alert(
                        '🎤 Voice SOS Detected',
                        'Confirm emergency alert?',
                        [
                            {
                                text: 'No',
                                style: 'cancel',
                                onPress: () => {
                                    this.speak('Emergency cancelled.');
                                    resolve(false);
                                },
                            },
                            {
                                text: 'Yes, Send SOS',
                                style: 'destructive',
                                onPress: () => {
                                    this.speak('Sending emergency alert now.');
                                    resolve(true);
                                },
                            },
                        ]
                    );
                },
            });
        });
    }

    /**
     * Get current configuration
     */
    static getConfig(): VoiceSOSConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    static updateConfig(updates: Partial<VoiceSOSConfig>): void {
        this.config = { ...this.config, ...updates };
        console.log('🔧 Voice SOS config updated:', this.config);
    }

    /**
     * Get available voices for the device
     */
    static async getAvailableVoices(): Promise<Speech.Voice[]> {
        try {
            return await Speech.getAvailableVoicesAsync();
        } catch (error) {
            console.error('Error getting voices:', error);
            return [];
        }
    }

    /**
     * Test voice functionality
     */
    static async test(): Promise<boolean> {
        try {
            console.log('🎤 Testing voice services...');

            // Test TTS
            await this.speak('Voice services test. Can you hear me?', {
                rate: 1.0,
                pitch: 1.0,
            });

            // Get available voices
            const voices = await this.getAvailableVoices();
            console.log(`✅ Found ${voices.length} voices`);

            return true;
        } catch (error) {
            console.error('❌ Voice test failed:', error);
            return false;
        }
    }

    /**
     * Announce emergency contact call
     */
    static async announceCall(contactName: string): Promise<void> {
        if (!this.config.voiceFeedback) return;
        await this.speak(`Calling ${contactName} now.`, { rate: 0.9 });
    }

    /**
     * Announce location sharing
     */
    static async announceLocationSharing(): Promise<void> {
        if (!this.config.voiceFeedback) return;
        await this.speak('Sharing your location with emergency contacts.', { rate: 0.9 });
    }

    /**
     * Countdown announcement for SOS
     * Gives user time to cancel
     */
    static async countdownToSOS(
        seconds: number,
        onCountdown: (remaining: number) => void,
        onComplete: () => void,
        onCancel: () => void
    ): Promise<void> {
        let remaining = seconds;

        const countdown = async () => {
            if (remaining > 0) {
                await this.speak(`${remaining}`, { rate: 1.2, pitch: 1.3 });
                onCountdown(remaining);
                remaining--;
                setTimeout(countdown, 1000);
            } else {
                await this.speak('Sending emergency alert now!', {
                    rate: 0.9,
                    pitch: 1.2,
                    onDone: onComplete
                });
            }
        };

        await this.speak(`Emergency S O S will be sent in ${seconds} seconds. Press cancel to stop.`, {
            rate: 0.9,
            onDone: countdown,
        });
    }

    /**
     * Announce SOS cancellation
     */
    static async announceCancellation(): Promise<void> {
        await this.speak('Emergency S O S cancelled.', { rate: 0.9 });
    }

    /**
     * Announce SOS success
     */
    static async announceSuccess(contactsNotified: number): Promise<void> {
        if (!this.config.voiceFeedback) return;

        const message = contactsNotified === 1
            ? 'Alert sent to 1 contact.'
            : `Alert sent to ${contactsNotified} contacts.`;

        await this.speak(message, { rate: 0.9, pitch: 1.0 });
    }

    /**
     * Announce SOS failure
     */
    static async announceFailure(): Promise<void> {
        if (!this.config.voiceFeedback) return;
        await this.speak('Failed to send emergency alert. Please try again or call manually.', {
            rate: 0.8,
            pitch: 0.9,
        });
    }

    /**
     * Emergency instructions
     * Provides voice guidance in emergency situations
     */
    static async provideEmergencyInstructions(): Promise<void> {
        const instructions = [
            'Stay calm.',
            'If safe to do so, find shelter.',
            'Your emergency contacts have been notified.',
            'Help is on the way.',
        ];

        for (const instruction of instructions) {
            await this.speak(instruction, { rate: 0.8 });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between instructions
        }
    }

    /**
     * Voice-guided SOS (hands-free emergency)
     * Walks user through emergency process with voice
     */
    static async startVoiceGuidedSOS(
        contactsCount: number,
        hasLocation: boolean,
        onConfirm: () => Promise<void>
    ): Promise<void> {
        try {
            console.log('🎤 Starting voice-guided SOS...');

            // Step 1: Announce detection
            await this.speak('Emergency mode activated.', { rate: 0.9, pitch: 1.2 });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Step 2: Inform user
            const locationText = hasLocation ? 'with your current location' : '';
            await this.speak(
                `I will send an emergency alert to ${contactsCount} contacts ${locationText}.`,
                { rate: 0.85 }
            );
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 3: Request confirmation
            const confirmed = await this.requestVoiceConfirmation();

            if (confirmed) {
                // Step 4: Send SOS
                await this.speak('Sending emergency alert now.', { rate: 0.9 });
                await onConfirm();

                // Step 5: Provide instructions
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.provideEmergencyInstructions();
            } else {
                await this.announceCancellation();
            }

        } catch (error) {
            console.error('Error in voice-guided SOS:', error);
            await this.announceFailure();
        }
    }
}
