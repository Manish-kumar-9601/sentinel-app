/**
 * Home Screen - WITH LOCATION TRACKING INTEGRATION
 * 
 * ✅ Changes:
 * 1. Added useLocationSync hook (performance-optimized)
 * 2. Added LocationStatusPill component
 * 3. No unnecessary re-renders (React.memo + useMemo)
 */

import { GlobalSyncStatus } from '@/components/GlobalSyncStatus';
import { LocationStatusPill } from '@/components/LocationStatusPill';
import { useContacts } from '@/store';
import { useLocationSync } from '@/hooks/useLocationSync';
import { FontAwesome5 } from '@expo/vector-icons';
// @ts-ignore
import SentinelIcon from '@/assets/images/sentinel-nav-icon.png';
import { borderRadius } from '@/styles';
import * as ExpoLocation from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    AppState,
    Image,
    Linking,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { promptForEnableLocationIfNeeded } from 'react-native-android-location-enabler';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContactListModal from '../../components/ContactListModal';
import { EmergencyGrid } from '../../components/EmergencyGrid';
import { SOSCard } from '../../components/SOSCard';
import { useModal } from '../../context/ModalContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useAuth } from '../../context/AuthContext';

// --- Configuration ---
const LOCATION_TIMEOUT = 15000; // 15 seconds
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// --- Enhanced SOS Service ---
interface SOSOptions {
    includeSMS?: boolean;
}

interface SOSResult {
    sms: { success: boolean; count?: number; error?: string } | null;
}

class SOSService {
    static async sendEmergencyMessages(contacts: any[], location: any, options: SOSOptions = {}): Promise<SOSResult> {
        const { includeSMS = true } = options;
        const results: SOSResult = { sms: null };

        const lat = location.latitude || location.coords?.latitude;
        const lng = location.longitude || location.coords?.longitude;

        const message = `🚨 EMERGENCY SOS! I need immediate help! My current location is: https://maps.google.com/?q=${lat},${lng} - Sent automatically from Emergency App`;

        if (includeSMS) {
            try {
                const isSmsAvailable = await SMS.isAvailableAsync();
                if (isSmsAvailable) {
                    const contactNumbers = contacts.map((c: any) => c.phone);
                    await SMS.sendSMSAsync(contactNumbers, message);
                    results.sms = { success: true, count: contacts.length };
                } else {
                    results.sms = { success: false, error: 'SMS not available' };
                }
            } catch (error) {
                console.error('SMS sending failed:', error);
                const err = error as Error;
                results.sms = { success: false, error: err.message };
            }
        }

        return results;
    }
}

// --- Enhanced Location Service ---
class LocationService {
    static async checkPermissionStatus() {
        try {
            const { status } = await ExpoLocation.getForegroundPermissionsAsync();
            return status;
        } catch (error) {
            console.error('Error checking location permission:', error);
            return 'undetermined';
        }
    }

    static async requestPermission() {
        try {
            const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
            return status;
        } catch (error) {
            console.error('Error requesting location permission:', error);
            return 'denied';
        }
    }

    static async checkLocationServices() {
        try {
            return await ExpoLocation.hasServicesEnabledAsync();
        } catch (error) {
            console.error('Error checking location services:', error);
            return false;
        }
    }

    static async getLastKnownLocation() {
        try {
            return await ExpoLocation.getLastKnownPositionAsync({
                maxAge: LOCATION_CACHE_DURATION,
                requiredAccuracy: 1000,
            });
        } catch (error) {
            console.log('No last known location available');
            return null;
        }
    }

    static async getCurrentLocationWithTimeout(accuracy = ExpoLocation.Accuracy.High, timeout = LOCATION_TIMEOUT) {
        try {
            const locationPromise = ExpoLocation.getCurrentPositionAsync({
                accuracy,
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Location request timeout')), timeout)
            );

            return await Promise.race([locationPromise, timeoutPromise]);
        } catch (error) {
            throw error;
        }
    }
}

interface HeaderProps {
    onProfile: () => void;
    colors: any;
    locationStatus?: 'tracking' | 'syncing' | 'idle' | 'error';
}

// ✅ NEW: Header with Location Status
const Header: React.FC<HeaderProps> = React.memo(({ onProfile, colors, locationStatus }) => (
    <View style={styles.header}>
        <Image style={[styles.brandLogo, { borderRadius: borderRadius.circle }]} source={SentinelIcon} />
        
        {/* ✅ NEW: Location Status Pill */}
        <LocationStatusPill status={locationStatus} />
        
        <View style={styles.headerIcons}>
            <TouchableOpacity style={{ marginLeft: 0 }} onPress={onProfile}>
                <FontAwesome5 name="user-circle" size={30} color={colors.text} />
            </TouchableOpacity>
        </View>
    </View>
));

export default function HomeScreen() {
    const { colors } = useThemedStyles();
    const { user, token } = useAuth();

    // 🎯 LOCATION TRACKING HOOK (Performance-Optimized)
    const { status: locationSyncStatus, trackLocation } = useLocationSync();

    // 🎯 GLOBAL STORE HOOK
    const {
        contacts: emergencyContacts,
        loading: contactsLoading,
        loadContacts,
    } = useContacts();

    // Local state for location
    const [location, setLocation] = useState<ExpoLocation.LocationObject | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<ExpoLocation.PermissionStatus | null>(null);

    // Other local state
    const [isSending, setIsSending] = useState(false);
    const [locationServicesEnabled, setLocationServicesEnabled] = useState<boolean | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const router = useRouter();
    const { t } = useTranslation();
    const { isContactModalVisible, closeContactModal } = useModal();

    // Refs
    const locationRequestInProgress = useRef(false);
    const initialLocationRequest = useRef(false);

    // ✅ OPTIMIZATION: Memoize location status for Header
    const headerLocationStatus = useMemo(() => {
        return locationSyncStatus;
    }, [locationSyncStatus]);

    // Request location permission
    const requestLocationPermission = async (): Promise<ExpoLocation.PermissionStatus> => {
        try {
            console.log('📍 Requesting location permission...');
            const status = await LocationService.requestPermission();
            setPermissionStatus(status as ExpoLocation.PermissionStatus);
            return status as ExpoLocation.PermissionStatus;
        } catch (error) {
            console.error('Error requesting permission:', error);
            return 'denied' as ExpoLocation.PermissionStatus;
        }
    };

    // Refresh location
    const refreshLocation = useCallback(async () => {
        if (locationRequestInProgress.current) {
            console.log('⏭️ Location request already in progress, skipping...');
            return;
        }

        locationRequestInProgress.current = true;
        setIsLoadingLocation(true);
        setLocationError(null);

        try {
            console.log('🔄 Refreshing location...');

            const status = await LocationService.checkPermissionStatus();
            setPermissionStatus(status as ExpoLocation.PermissionStatus);

            if (status !== 'granted') {
                setLocationError('permission_denied');
                setLocation(null);
                return;
            }

            const servicesEnabled = await LocationService.checkLocationServices();
            setLocationServicesEnabled(servicesEnabled);

            if (!servicesEnabled) {
                setLocationError('location_services_disabled');
                setLocation(null);
                return;
            }

            const lastKnown = await LocationService.getLastKnownLocation();
            if (lastKnown) {
                console.log('✅ Using last known location');
                setLocation(lastKnown);
            }

            try {
                const currentLocation = await LocationService.getCurrentLocationWithTimeout(
                    ExpoLocation.Accuracy.High,
                    LOCATION_TIMEOUT
                );
                console.log('✅ Got current location');
                setLocation(currentLocation);
                setLocationError(null);
            } catch (error) {
                if (lastKnown) {
                    console.log('⚠️ Current location timeout, using last known');
                } else {
                    console.error('❌ Location fetch failed:', error);
                    setLocationError('location_fetch_failed');
                }
            }
        } catch (error) {
            console.error('Error refreshing location:', error);
            setLocationError('location_fetch_failed');
        } finally {
            setIsLoadingLocation(false);
            locationRequestInProgress.current = false;
        }
    }, []);

    useEffect(() => {
        console.log('📋 [HomeScreen] Emergency contacts updated:', {
            count: emergencyContacts.length,
            contacts: emergencyContacts.map(c => ({ id: c.id, name: c.name })),
            loading: contactsLoading
        });
    }, [emergencyContacts, contactsLoading]);

    // App initialization
    useEffect(() => {
        const initializeApp = async () => {
            if (initialLocationRequest.current) return;
            initialLocationRequest.current = true;

            console.log('🚀 Initializing app with automatic location setup...');
            await requestLocationPermissionAndSetup();
        };

        initializeApp();
    }, []);

    const requestLocationPermissionAndSetup = async () => {
        try {
            console.log('📍 Starting location permission request...');
            const status = await requestLocationPermission();

            if (status === 'granted') {
                await refreshLocation();
            } else {
                console.log('❌ Permission denied');
                Alert.alert(
                    t('home.permissionDenied'),
                    t('home.locationAccessNeeded'),
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('common.settings'), onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.error('Error in location permission request:', error);
        }
    };

    const openLocationSettings = async () => {
        if (Platform.OS === 'android') {
            try {
                const result = await promptForEnableLocationIfNeeded();
                console.log('promptForEnableLocationIfNeeded result', result);
                if (result === 'enabled' || result === 'already-enabled') {
                    await refreshLocation();
                }
            } catch (error) {
                const err = error as any;
                console.error(err.message);
                if (err.code === 'ERR_ANDROID_LOCATION_SERVICES_DISABLED') {
                    Alert.alert(
                        'Location services are disabled.',
                        'Please enable them in the device settings.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => Linking.openSettings() }
                        ]
                    );
                }
            }
        } else {
            Linking.openSettings();
        }
    };

    const refreshAppState = async () => {
        setRefreshing(true);
        try {
            console.log('🔄 Pull-to-refresh: Starting refresh...');

            locationRequestInProgress.current = false;
            initialLocationRequest.current = false;

            setLocation(null);
            setLocationError(null);

            await loadContacts();

        } catch (error) {
            console.error('Pull-to-refresh: Error during refresh:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            if (permissionStatus === 'granted' && !locationError) {
                refreshLocation();
            }
        }, [permissionStatus, locationError, refreshLocation])
    );

    const showSOSResults = (results: SOSResult) => {
        let message = '';
        let hasSuccess = false;

        if (results.sms) {
            if (results.sms.success) {
                message += `✅ SMS sent to ${results.sms.count} contact(s)\n`;
                hasSuccess = true;
            } else {
                message += `❌ SMS failed: ${results.sms.error}\n`;
            }
        }

        Alert.alert(
            hasSuccess ? '🚨 Emergency Alert Sent' : '❌ Emergency Alert Failed',
            message.trim() || 'Failed to send emergency messages',
            [{ text: 'OK' }]
        );
    };

    const handleSOSPress = async () => {
        console.log('🚨 [SOS] Button pressed');

        if (isSending) return;

        if (emergencyContacts.length === 0) {
            console.log('❌ [SOS] No emergency contacts available');
            Alert.alert(
                t('home.noContactsAlertTitle'),
                t('home.noContactsAlertMessage'),
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Add Contacts',
                        onPress: () => router.push('/settings/myCircle')
                    }
                ]
            );
            return;
        }

        if (!location) {
            if (permissionStatus !== 'granted') {
                Alert.alert(
                    'Location Permission Needed',
                    'Location permission is required for emergency alerts.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Grant Permission',
                            onPress: async () => {
                                const status = await requestLocationPermission();
                                if (status === 'granted') {
                                    await refreshLocation();
                                }
                            }
                        }
                    ]
                );
                return;
            } else if (locationError === 'location_services_disabled') {
                openLocationSettings();
                return;
            } else {
                Alert.alert(
                    t('home.locationRequiredTitle'),
                    t('home.locationRequiredMessage'),
                    [{ text: 'OK' }]
                );
                await refreshLocation();
                if (!location) return;
            }
        }

        setIsSending(true);

        try {
            console.log('🚨 Sending Emergency SOS...');
            
            // ✅ NEW: Trigger location tracking explicitly
            if (token) {
                trackLocation();
            }

            const results = await SOSService.sendEmergencyMessages(
                emergencyContacts,
                location,
                {
                    includeSMS: true
                }
            );

            showSOSResults(results);

        } catch (error) {
            console.error('❌ SOS sending failed:', error);

            Alert.alert(
                'Emergency Alert Error',
                'Failed to send emergency alert. Please try calling your contacts directly.',
                [
                    { text: 'OK', style: 'cancel' },
                    {
                        text: 'Call Now',
                        onPress: () => {
                            if (emergencyContacts.length > 0) {
                                Linking.openURL(`tel:${emergencyContacts[0].phone}`);
                            }
                        }
                    }
                ]
            );
        } finally {
            setIsSending(false);
        }
    };

    const handleCategorySelect = (category: any) => {
        router.push({
            pathname: '/guide',
            params: {
                categoryId: category.id,
                categoryName: category.name,
            },
        });
    };

    const handleLocationPress = async () => {
        if (location) {
            router.push({
                pathname: "/webMap",
                params: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                },
            });
        } else {
            if (permissionStatus !== 'granted') {
                Alert.alert(
                    'Location Permission Needed',
                    'Would you like to grant location permission?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Grant Permission',
                            onPress: async () => {
                                const status = await requestLocationPermission();
                                if (status === 'granted') {
                                    await refreshLocation();
                                }
                            }
                        }
                    ]
                );
            } else if (locationError === 'location_services_disabled') {
                openLocationSettings();
            } else {
                Alert.alert(t('home.gettingLocationAlert'), t('home.gettingLocationAlertMessage'));
                await refreshLocation();
            }
        }
    };

    const getLocationDisplay = () => {
        if (isLoadingLocation) {
            return { text: t('home.gettingLocation'), status: 'loading' };
        }

        if (permissionStatus !== 'granted') {
            return { text: t('home.permissionNeeded'), status: 'error' };
        }

        if (locationError === 'location_services_disabled') {
            return { text: t('home.servicesDisabled'), status: 'error' };
        }

        if (locationError) {
            switch (locationError) {
                case 'location_services_disabled':
                    return { text: t('home.turnOnServices'), status: 'error' };
                case 'permission_denied':
                    return { text: t('home.permissionNeeded'), status: 'error' };
                case 'location_fetch_failed':
                    return { text: t('home.fetchFailed'), status: 'error' };
                default:
                    return { text: t('home.unavailable'), status: 'error' };
            }
        }

        if (location) {
            return {
                text: `Lat: ${location.coords.latitude.toFixed(4)}, Lon: ${location.coords.longitude.toFixed(4)}`,
                status: 'available'
            };
        }

        return { text: t('home.unavailable'), status: 'error' };
    };

    const getSosButtonState = () => {
        if (isSending) {
            return { isReady: false, text: t('home.sending') };
        }

        if (contactsLoading) {
            return { isReady: false, text: t('home.loading') || 'Loading...' };
        }

        if (emergencyContacts.length === 0) {
            return { isReady: false, text: t('home.noContactsAlertTitle') || 'No Contacts' };
        }

        if (isLoadingLocation) {
            return { isReady: false, text: t('home.locating') };
        }

        if (permissionStatus !== 'granted' || !locationServicesEnabled) {
            return { isReady: false, text: t('home.setupNeeded') };
        }

        if (!location) {
            return { isReady: false, text: t('home.noLocation') };
        }

        return { isReady: true, text: t('home.pressToSend') };
    };

    const onProfile = () => {
        console.log('Navigating to Profile screen');
        router.push('/profile');
    };

    const locationDisplay = getLocationDisplay();
    const sosButtonState = getSosButtonState();

    const handleSOSOptions = () => {
        if (!location || emergencyContacts.length === 0) return;

        const options: Array<{ text: string; style?: 'cancel' | 'default' | 'destructive'; onPress?: () => void | Promise<void> }> = [
            { text: 'Cancel', style: 'cancel' },
            {
                text: t('home.sosOptionsSms'),
                onPress: () => sendSOSWithOptions({ includeSMS: true })
            }
        ];

        Alert.alert(t('home.sosOptionsTitle'), t('home.sosOptionsMessage'), options);
    };

    const sendSOSWithOptions = async (options: SOSOptions) => {
        setIsSending(true);
        try {
            const results = await SOSService.sendEmergencyMessages(emergencyContacts, location, options);
            showSOSResults(results);
        } catch (error) {
            console.error('SOS sending failed:', error);
            Alert.alert('Error', t('home.sosFailedMessage'));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refreshAppState}
                        colors={[colors.primary, colors.primaryLight]}
                        tintColor={colors.primary}
                        title={t('home.pullToRefresh')}
                        titleColor={colors.textSecondary}
                    />
                }
            >
                {/* ✅ UPDATED: Header with location status */}
                <Header 
                    onProfile={onProfile} 
                    colors={colors}
                    locationStatus={headerLocationStatus}
                />
                
                <GlobalSyncStatus />
                <View style={styles.titleContainer}>
                    <Text style={[styles.mainTitle, { color: colors.text }]}>{t('home.title')}</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('home.subtitle')}</Text>
                </View>
                <SOSCard
                    onSOSPress={handleSOSPress}
                    onSOSOptions={handleSOSOptions}
                    isReady={sosButtonState.isReady}
                    onLocationPress={handleLocationPress}
                    buttonText={sosButtonState.text}
                    locationText={locationDisplay.text}
                    locationStatus={locationDisplay.status}
                />
                <EmergencyGrid onCategorySelect={handleCategorySelect} />
            </ScrollView>
            <ContactListModal
                refreshAppState={refreshAppState}
                visible={isContactModalVisible}
                onClose={closeContactModal}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 0,
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 50,
    },
    brandLogo: {
        width: 30,
        height: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 0,
        paddingBottom: 0,
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 2,
    },
    titleContainer: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    mainTitle: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 10,
        lineHeight: 20,
    },
    
});