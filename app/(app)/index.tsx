import { GlobalSyncStatus } from '@/components/GlobalSyncStatus';
<<<<<<< HEAD
import { StorageService } from '@/services/StorageService';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
=======
import { useEmergencyContacts } from '@/context/EmergencyContactsContext';
import { useLocation } from '@/context/LocationContext';
import { useUser } from '@/context/UserContext';
import { useVoiceSOS } from '@/hooks/useVoiceSOS';
import { MultiLayerSOSService } from '@/services/multiLayerSOSService';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
>>>>>>> 8496b3f7aefa1e42e06318f68c1f526fcd481795
import { useFocusEffect, useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    AppState,
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
<<<<<<< HEAD
import SentinelIcon from '../../assets/images/sentinel-nav-icon.png';
=======
>>>>>>> 8496b3f7aefa1e42e06318f68c1f526fcd481795
import ContactListModal from '../../components/ContactListModal';
import { EmergencyGrid } from '../../components/EmergencyGrid';
import { SOSCard } from '../../components/SOSCard';
import { useModal } from '../../context/ModalContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

// --- Configuration ---
<<<<<<< HEAD
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
=======
>>>>>>> 8496b3f7aefa1e42e06318f68c1f526fcd481795
const LOCATION_TIMEOUT = 15000; // 15 seconds
const LOCATION_FALLBACK_TIMEOUT = 10000; // 10 seconds for fallback
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// --- WhatsApp Service ---
class WhatsAppService {
    static async isWhatsAppInstalled() {
        try {
            const canOpen = await Linking.canOpenURL('whatsapp://send');
            return canOpen;
        } catch (error) {
            console.error('Error checking WhatsApp availability:', error);
            return false;
        }
    }

    static formatPhoneNumber(phone: string): string {
        let cleaned = phone.replace(/\D/g, '');
        if (!cleaned.startsWith('91') && cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }
        return cleaned;
    }

    static async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
        try {
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodedMessage}`;

            const canOpen = await Linking.canOpenURL(whatsappUrl);
            if (canOpen) {
                await Linking.openURL(whatsappUrl);
                return true;
            } else {
                throw new Error('WhatsApp not available');
            }
        } catch (error) {
            console.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }

    static async sendToMultipleContacts(contacts: any[], message: string) {
        const results: any[] = [];
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            try {
                await this.sendWhatsAppMessage(contact.phone, message);
                results.push({ contact: contact.name, success: true });
                if (i < contacts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                const err = error as Error;
                results.push({ contact: contact.name, success: false, error: err.message });
            }
        }
        return results;
    }
}

// --- Enhanced SOS Service ---
interface SOSOptions {
    includeSMS?: boolean;
    includeWhatsApp?: boolean;
}

interface SOSResult {
    sms: { success: boolean; count?: number; error?: string } | null;
    whatsapp: { success: boolean; count?: number; total?: number; details?: any[]; error?: string } | null;
}

class SOSService {
    static async sendEmergencyMessages(contacts: any[], location: any, options: SOSOptions = {}): Promise<SOSResult> {
        const { includeSMS = true, includeWhatsApp = true } = options;
        const results: SOSResult = { sms: null, whatsapp: null };

        // Handle both CurrentLocation and LocationData formats
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

        if (includeWhatsApp) {
            try {
                const isWhatsAppAvailable = await WhatsAppService.isWhatsAppInstalled();
                if (isWhatsAppAvailable) {
                    const whatsappResults = await WhatsAppService.sendToMultipleContacts(contacts, message);
                    const successCount = whatsappResults.filter((r: any) => r.success).length;
                    results.whatsapp = {
                        success: successCount > 0,
                        count: successCount,
                        total: contacts.length,
                        details: whatsappResults
                    };
                } else {
                    results.whatsapp = { success: false, error: 'WhatsApp not installed' };
                }
            } catch (error) {
                console.error('WhatsApp sending failed:', error);
                const err = error as Error;
                results.whatsapp = { success: false, error: err.message };
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
}

// --- UI Components ---
const Header: React.FC<HeaderProps> = ({ onProfile, colors }) => (
    <View style={styles.header}>
<<<<<<< HEAD
        <View>
            <Image
                source={SentinelIcon}
                style={{ width: 40, height: 40, borderRadius: 50 }}
            />
        </View>
=======
>>>>>>> 8496b3f7aefa1e42e06318f68c1f526fcd481795
        <View style={styles.headerIcons}>
            <TouchableOpacity style={{ marginLeft: 0 }} onPress={onProfile}>
                <FontAwesome5 name="user-circle" size={30} color={colors.text} />
            </TouchableOpacity>
        </View>
    </View>
);


export default function HomeScreen() {
    const { colors } = useThemedStyles();

    // Global contexts
    const { contacts: emergencyContacts, loading: contactsLoading, refreshContacts } = useEmergencyContacts();
    const {
        currentLocation: location,
        locationError,
        isLoadingLocation,
        permissionStatus,
        refreshLocation,
        requestPermission: requestLocationPermission
    } = useLocation();
    const { userInfo } = useUser();

    // Local state
    const [isSending, setIsSending] = useState(false);
    const [locationServicesEnabled, setLocationServicesEnabled] = useState(null);
    const [whatsappAvailable, setWhatsappAvailable] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const router = useRouter();
    const { t } = useTranslation();
    const { isContactModalVisible, closeContactModal } = useModal();

    // Voice SOS Hook
    const voiceSOS = useVoiceSOS({
        enabled: true,
        voiceFeedback: true,
        confirmationRequired: true,
    });

    const locationRequestInProgress = useRef(false);
    const appStateRef = useRef(AppState.currentState);
    const initialLocationRequest = useRef(false);

    // Check WhatsApp availability on mount
    useEffect(() => {
        const checkWhatsAppAvailability = async () => {
            const isAvailable = await WhatsAppService.isWhatsAppInstalled();
            setWhatsappAvailable(isAvailable);
        };
        checkWhatsAppAvailability();
    }, []);

    // Refresh contacts when screen is focused
    useFocusEffect(
        useCallback(() => {
<<<<<<< HEAD
            const loadContacts = async () => {
                try {
                    const storedContacts = await StorageService.getEmergencyContacts();
                    console.log('Stored contacts:', storedContacts);
                    setEmergencyContacts(storedContacts);
                } catch (error) {
                    console.error('Failed to load contacts from storage.', error);
                }
            };
            loadContacts();
        }, [])
=======
            refreshContacts();
        }, [refreshContacts])
>>>>>>> 8496b3f7aefa1e42e06318f68c1f526fcd481795
    );

    // App initialization with automatic location setup
    useEffect(() => {
        const initializeApp = async () => {
            if (initialLocationRequest.current) return;
            initialLocationRequest.current = true;

            console.log('🚀 Initializing app with automatic location setup...');
            await requestLocationPermissionAndSetup();
        };

        initializeApp();
    }, []);

    // Simplified permission request using context
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

    // Simplified refresh function using context
    const refreshAppState = async () => {
        setRefreshing(true);
        try {
            console.log('🔄 Pull-to-refresh: Starting refresh...');

<<<<<<< HEAD
            locationRequestInProgress.current = false;
            initialLocationRequest.current = false;

            setLocation(null);
            setLocationError(null);

            // Reload contacts
            try {
                const storedContacts = await StorageService.getEmergencyContacts();
                setEmergencyContacts(storedContacts);
            } catch (error) {
                console.error('Pull-to-refresh: Failed to reload contacts', error);
            }
=======
            // Refresh all global data in parallel
            await Promise.all([
                refreshContacts(),
                refreshLocation(),
            ]);
>>>>>>> 8496b3f7aefa1e42e06318f68c1f526fcd481795

            // Re-check WhatsApp
            const isAvailable = await WhatsAppService.isWhatsAppInstalled();
            setWhatsappAvailable(isAvailable);

        } catch (error) {
            console.error('Pull-to-refresh: Error during refresh:', error);
        } finally {
            setRefreshing(false);
        }
    };

    // Focus effect to refresh location when screen becomes focused
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

        // if (results.whatsapp) {
        //     if (results.whatsapp.success) {
        //         message += `✅ WhatsApp messages initiated for ${results.whatsapp.count}/${results.whatsapp.total} contact(s)\n`;
        //         hasSuccess = true;
        //     } else {
        //         message += `❌ WhatsApp failed: ${results.whatsapp.error}\n`;
        //     }
        // }


    };



    const handleSOSPress = async () => {
        if (isSending) return;

        if (emergencyContacts.length === 0) {
            Alert.alert(
                t('home.noContactsAlertTitle'),
                t('home.noContactsAlertMessage'),
                [{ text: 'OK' }]
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
            console.log('🚨 Initiating Multi-Layer SOS...');

            // Get user ID (you'll need to pass this from auth context)
            const userId = 'user_current'; // TODO: Replace with actual user ID from auth

            // Convert CurrentLocation to LocationData format expected by MultiLayerSOSService
            const locationData = {
                coords: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                    altitude: location.altitude,
                    speed: location.speed,
                    heading: location.heading,
                },
                timestamp: location.timestamp || Date.now(),
            };

            // Execute Multi-Layer SOS
            const result = await MultiLayerSOSService.executeMultiLayerSOS(
                userId,
                emergencyContacts,
                locationData,
                t('home.emergencyMessage') || '🚨 EMERGENCY! I need help immediately!',
                {
                    skipAPI: false,  // Try API first
                    skipWhatsApp: !whatsappAvailable, // Skip if not available
                    skipSMS: false,  // Always try SMS
                    skipCall: false, // Offer call if all else fails
                }
            );

            // Format and show results
            const resultMessage = MultiLayerSOSService.formatResultsForUser(result);

            Alert.alert(
                '🚨 Emergency Alert Sent',
                resultMessage,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Log the alert details
                            console.log('Alert Summary:', {
                                alertId: result.alertId,
                                contactsNotified: result.totalContactsNotified,
                                layersUsed: result.layers.length,
                                timestamp: new Date(result.timestamp).toISOString(),
                            });
                        }
                    }
                ]
            );

            // Also show a brief success toast if available
            if (result.totalContactsNotified > 0) {
                console.log(`✅ Success: ${result.totalContactsNotified} contacts notified`);
            } else {
                console.warn('⚠️ Warning: No contacts were notified');
            }

        } catch (error) {
            console.error('❌ Multi-Layer SOS failed:', error);

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
                    latitude: location.latitude,
                    longitude: location.longitude,
                },
            });
        } else {
            // Try to resolve location issues
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

    // Determine location display text and status
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
                text: `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}`,
                status: 'available'
            };
        }

        return { text: t('home.unavailable'), status: 'error' };
    };

    // Determine SOS button state
    const getSosButtonState = () => {
        if (isSending) {
            return { isReady: false, text: t('home.sending') };
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
                onPress: () => sendSOSWithOptions({ includeSMS: true, includeWhatsApp: false })
            }
        ];

        if (whatsappAvailable) {
            options.push({
                text: t('home.sosOptionsWhatsapp'),
                onPress: () => sendSOSWithOptions({ includeSMS: false, includeWhatsApp: true })
            });
            options.push({
                text: t('home.sosOptionsBoth'),
                onPress: () => sendSOSWithOptions({ includeSMS: true, includeWhatsApp: true })
            });
        }

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
                <Header onProfile={onProfile} colors={colors} />
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
                <EmergencyGrid onCategorySelect={handleCategorySelect}
                />
            </ScrollView>
            {/* <BottomNavBar /> */}
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
    sosHelpText: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    categoriesSection: {
        paddingHorizontal: 20,
        marginTop: 0,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 15,
    },
    categoryBox: {
        width: '30%',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '500',
    },
    navBar: {
        height: 45,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderTopWidth: 0,
    },
    navItem: {
        alignItems: 'center',
    },
    navText: {
        fontSize: 12,
        marginTop: 2,
    },
});