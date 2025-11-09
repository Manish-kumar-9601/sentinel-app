/**
 * React Hook: Evidence Management
 * Provides easy access to evidence capture and sharing functionality
 */

import {
    EvidenceItem,
    EvidenceLocationSharingService
} from '@/services/evidenceLocationSharingService';
import { Audio } from 'expo-av';
import * as Camera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useUserInfo } from './useUserInfo';

export interface UseEvidenceResult {
    // State
    evidence: EvidenceItem[];
    loading: boolean;
    capturing: boolean;
    sharing: boolean;

    // Actions
    capturePhoto: () => Promise<string | null>;
    captureVideo: () => Promise<string | null>;
    recordAudio: () => Promise<string | null>;
    pickFromGallery: () => Promise<string | null>;
    deleteEvidence: (id: string) => Promise<void>;
    clearAllEvidence: () => Promise<void>;
    shareWithContacts: (contactIds: string[], options?: ShareOptions) => Promise<void>;
    refreshEvidence: () => Promise<void>;

    // Statistics
    stats: {
        total: number;
        photos: number;
        videos: number;
        audio: number;
        shared: number;
    };
}

export interface ShareOptions {
    includeLastHours?: number;
    includeAllEvidence?: boolean;
    specificEvidenceIds?: string[];
    alertId?: string;
}

export function useEvidence(): UseEvidenceResult {
    const { userInfo } = useUserInfo();
    const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [sharing, setSharing] = useState(false);

    // Load evidence on mount
    useEffect(() => {
        if (userInfo?.id) {
            loadEvidence();
        }
    }, [userInfo?.id]);

    // Load evidence from service
    const loadEvidence = useCallback(async () => {
        if (!userInfo?.id) return;

        setLoading(true);
        try {
            const items = await EvidenceLocationSharingService.getUserEvidence(userInfo.id);
            setEvidence(items);
        } catch (error) {
            console.error('Error loading evidence:', error);
        } finally {
            setLoading(false);
        }
    }, [userInfo?.id]);

    // Refresh evidence
    const refreshEvidence = useCallback(async () => {
        await loadEvidence();
    }, [loadEvidence]);

    // Capture photo from camera
    const capturePhoto = useCallback(async (): Promise<string | null> => {
        if (!userInfo?.id) {
            Alert.alert('Error', 'User not logged in');
            return null;
        }

        try {
            setCapturing(true);

            // Request camera permission
            const { status } = await Camera.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos');
                return null;
            }

            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;

                // Capture with auto-location
                const evidenceId = await EvidenceLocationSharingService.captureEvidence(
                    userInfo.id,
                    'photo',
                    uri
                );

                // Refresh list
                await loadEvidence();

                return evidenceId;
            }

            return null;

        } catch (error) {
            console.error('Error capturing photo:', error);
            Alert.alert('Error', 'Failed to capture photo');
            return null;
        } finally {
            setCapturing(false);
        }
    }, [userInfo?.id, loadEvidence]);

    // Capture video from camera
    const captureVideo = useCallback(async (): Promise<string | null> => {
        if (!userInfo?.id) {
            Alert.alert('Error', 'User not logged in');
            return null;
        }

        try {
            setCapturing(true);

            // Request camera permission
            const { status } = await Camera.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to record videos');
                return null;
            }

            // Launch camera for video
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                quality: 0.8,
                videoMaxDuration: 60, // 60 seconds max
            });

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;

                const evidenceId = await EvidenceLocationSharingService.captureEvidence(
                    userInfo.id,
                    'video',
                    uri
                );

                await loadEvidence();
                return evidenceId;
            }

            return null;

        } catch (error) {
            console.error('Error capturing video:', error);
            Alert.alert('Error', 'Failed to capture video');
            return null;
        } finally {
            setCapturing(false);
        }
    }, [userInfo?.id, loadEvidence]);

    // Record audio
    const recordAudio = useCallback(async (): Promise<string | null> => {
        if (!userInfo?.id) {
            Alert.alert('Error', 'User not logged in');
            return null;
        }

        try {
            setCapturing(true);

            // Request audio permission
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Microphone permission is required to record audio');
                return null;
            }

            // Configure audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Start recording
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            // Show recording dialog
            Alert.alert(
                'Recording Audio',
                'Press OK when finished recording',
                [
                    {
                        text: 'Stop Recording',
                        onPress: async () => {
                            await recording.stopAndUnloadAsync();
                            const uri = recording.getURI();

                            if (uri) {
                                const evidenceId = await EvidenceLocationSharingService.captureEvidence(
                                    userInfo.id,
                                    'audio',
                                    uri
                                );

                                await loadEvidence();
                                return evidenceId;
                            }
                        },
                    },
                ],
            );

            return null;

        } catch (error) {
            console.error('Error recording audio:', error);
            Alert.alert('Error', 'Failed to record audio');
            return null;
        } finally {
            setCapturing(false);
        }
    }, [userInfo?.id, loadEvidence]);

    // Pick from gallery
    const pickFromGallery = useCallback(async (): Promise<string | null> => {
        if (!userInfo?.id) {
            Alert.alert('Error', 'User not logged in');
            return null;
        }

        try {
            setCapturing(true);

            // Request gallery permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery access is required');
                return null;
            }

            // Launch gallery
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const uri = asset.uri;
                const type: 'photo' | 'video' = asset.type === 'video' ? 'video' : 'photo';

                const evidenceId = await EvidenceLocationSharingService.captureEvidence(
                    userInfo.id,
                    type,
                    uri
                );

                await loadEvidence();
                return evidenceId;
            }

            return null;

        } catch (error) {
            console.error('Error picking from gallery:', error);
            Alert.alert('Error', 'Failed to pick media');
            return null;
        } finally {
            setCapturing(false);
        }
    }, [userInfo?.id, loadEvidence]);

    // Delete evidence
    const deleteEvidence = useCallback(async (id: string) => {
        try {
            await EvidenceLocationSharingService.deleteEvidence(id);
            await loadEvidence();
        } catch (error) {
            console.error('Error deleting evidence:', error);
            Alert.alert('Error', 'Failed to delete evidence');
        }
    }, [loadEvidence]);

    // Clear all evidence
    const clearAllEvidence = useCallback(async () => {
        Alert.alert(
            'Clear All Evidence',
            'Are you sure? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete all evidence one by one
                            for (const item of evidence) {
                                await EvidenceLocationSharingService.deleteEvidence(item.id);
                            }
                            await loadEvidence();
                        } catch (error) {
                            console.error('Error clearing evidence:', error);
                            Alert.alert('Error', 'Failed to clear evidence');
                        }
                    },
                },
            ]
        );
    }, [evidence, loadEvidence]);

    // Share with contacts
    const shareWithContacts = useCallback(async (
        contactIds: string[],
        options: ShareOptions = {}
    ) => {
        if (!userInfo?.id) {
            Alert.alert('Error', 'User not logged in');
            return;
        }

        if (contactIds.length === 0) {
            Alert.alert('Error', 'No contacts selected');
            return;
        }

        try {
            setSharing(true);

            // Create share packages
            const packages = await EvidenceLocationSharingService.createSharedDataPackage(
                userInfo.id,
                contactIds,
                options
            );

            // Send via WhatsApp/SMS
            await EvidenceLocationSharingService.shareViaMessaging(packages, 'both');

            Alert.alert(
                'Shared Successfully',
                `Evidence and location shared with ${contactIds.length} contact(s)`
            );

            // Refresh evidence list
            await loadEvidence();

        } catch (error) {
            console.error('Error sharing with contacts:', error);
            Alert.alert('Error', 'Failed to share data');
        } finally {
            setSharing(false);
        }
    }, [userInfo?.id, loadEvidence]);

    // Calculate statistics
    const stats = {
        total: evidence.length,
        photos: evidence.filter(e => e.type === 'photo').length,
        videos: evidence.filter(e => e.type === 'video').length,
        audio: evidence.filter(e => e.type === 'audio').length,
        shared: evidence.filter(e => e.isShared).length,
    };

    return {
        evidence,
        loading,
        capturing,
        sharing,
        capturePhoto,
        captureVideo,
        recordAudio,
        pickFromGallery,
        deleteEvidence,
        clearAllEvidence,
        shareWithContacts,
        refreshEvidence,
        stats,
    };
}
