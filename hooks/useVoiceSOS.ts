/**
 * useVoiceSOS Hook
 * Integrates voice-activated SOS into any component
 * Uses expo-speech for text-to-speech
 */

import { VoiceActivatedSOSService } from '@/services/voiceActivatedSOSService';
import { useEffect, useState } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';

export interface VoiceSOSOptions {
    enabled?: boolean;
    voiceFeedback?: boolean;
    confirmationRequired?: boolean;
    onSOSTriggered?: () => Promise<void>;
    onSOSConfirmed?: () => Promise<void>;
    onSOSCancelled?: () => void;
}

export function useVoiceSOS(options: VoiceSOSOptions = {}) {
    const [isListening, setIsListening] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        checkAvailability();

        // Update config
        VoiceActivatedSOSService.updateConfig({
            enabled: options.enabled ?? true,
            voiceFeedback: options.voiceFeedback ?? true,
            confirmationRequired: options.confirmationRequired ?? true,
        });

        // Monitor app state for voice feedback
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
            stopVoice();
        };
    }, [options.enabled]);

    const checkAvailability = async () => {
        const available = await VoiceActivatedSOSService.isAvailable();
        setIsAvailable(available);
    };

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'background') {
            // Stop speaking when app goes to background
            await VoiceActivatedSOSService.stopSpeaking();
            setIsSpeaking(false);
        }
    };

    /**
     * Start voice-guided SOS process
     */
    const startVoiceGuidedSOS = async (
        contactsCount: number,
        hasLocation: boolean
    ) => {
        try {
            setIsListening(true);

            await VoiceActivatedSOSService.startVoiceGuidedSOS(
                contactsCount,
                hasLocation,
                async () => {
                    if (options.onSOSConfirmed) {
                        await options.onSOSConfirmed();
                    }
                }
            );
        } catch (error) {
            console.error('Voice SOS error:', error);
            Alert.alert('Voice SOS Error', 'Failed to start voice-guided emergency alert.');
        } finally {
            setIsListening(false);
        }
    };

    /**
     * Announce SOS activation
     */
    const announceSOS = async (contactsCount: number, hasLocation: boolean) => {
        setIsSpeaking(true);
        await VoiceActivatedSOSService.announceSOS(contactsCount, hasLocation);
        setIsSpeaking(false);
    };

    /**
     * Announce status message
     */
    const announceStatus = async (message: string) => {
        setIsSpeaking(true);
        await VoiceActivatedSOSService.announceStatus(message);
        setIsSpeaking(false);
    };

    /**
     * Start countdown with voice
     */
    const startCountdown = async (
        seconds: number,
        onComplete: () => void,
        onCancel: () => void
    ) => {
        setIsSpeaking(true);
        setIsListening(true);

        await VoiceActivatedSOSService.countdownToSOS(
            seconds,
            (remaining) => {
                console.log(`Countdown: ${remaining}`);
            },
            () => {
                setIsSpeaking(false);
                setIsListening(false);
                onComplete();
            },
            () => {
                setIsSpeaking(false);
                setIsListening(false);
                onCancel();
            }
        );
    };

    /**
     * Announce success
     */
    const announceSuccess = async (contactsNotified: number) => {
        setIsSpeaking(true);
        await VoiceActivatedSOSService.announceSuccess(contactsNotified);
        setIsSpeaking(false);
    };

    /**
     * Announce failure
     */
    const announceFailure = async () => {
        setIsSpeaking(true);
        await VoiceActivatedSOSService.announceFailure();
        setIsSpeaking(false);
    };

    /**
     * Announce calling contact
     */
    const announceCall = async (contactName: string) => {
        setIsSpeaking(true);
        await VoiceActivatedSOSService.announceCall(contactName);
        setIsSpeaking(false);
    };

    /**
     * Stop all voice activity
     */
    const stopVoice = async () => {
        await VoiceActivatedSOSService.stopSpeaking();
        setIsSpeaking(false);
        setIsListening(false);
    };

    /**
     * Test voice functionality
     */
    const testVoice = async () => {
        const success = await VoiceActivatedSOSService.test();
        if (success) {
            Alert.alert('Voice Test', 'Voice services are working correctly!');
        } else {
            Alert.alert('Voice Test Failed', 'Voice services are not available.');
        }
    };

    /**
     * Get available voices
     */
    const getVoices = async () => {
        return await VoiceActivatedSOSService.getAvailableVoices();
    };

    return {
        // State
        isListening,
        isAvailable,
        isSpeaking,

        // Actions
        startVoiceGuidedSOS,
        announceSOS,
        announceStatus,
        startCountdown,
        announceSuccess,
        announceFailure,
        announceCall,
        stopVoice,
        testVoice,
        getVoices,
    };
}
