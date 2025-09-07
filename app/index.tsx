import { useModal } from '../context/ModalContext';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
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
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SentinelIcon from '../assets/images/sentinel-nav-icon.png';
import BottomNavBar from '../components/BottomNavBar';
import ContactListModal from '../components/ContactListModal';
import EmergencyGrid from '../components/EmergencyGrid';
// --- Configuration ---
const CONTACTS_STORAGE_KEY = 'emergency_contacts';
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const LOCATION_TIMEOUT = 15000; // 15 seconds
const LOCATION_FALLBACK_TIMEOUT = 10000; // 10 seconds for fallback

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

    static formatPhoneNumber(phone) {
        let cleaned = phone.replace(/\D/g, '');
        if (!cleaned.startsWith('91') && cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }
        return cleaned;
    }

    static async sendWhatsAppMessage(phoneNumber, message) {
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

    static async sendToMultipleContacts(contacts, message) {
        const results = [];
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            try {
                await this.sendWhatsAppMessage(contact.phone, message);
                results.push({ contact: contact.name, success: true });
                if (i < contacts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                results.push({ contact: contact.name, success: false, error: error.message });
            }
        }
        return results;
    }
}

// --- Enhanced SOS Service ---
class SOSService {
    static async sendEmergencyMessages(contacts, location, options = {}) {
        const { includeSMS = true, includeWhatsApp = true } = options;
        const results = { sms: null, whatsapp: null };

        const message = `🚨 EMERGENCY SOS! I need immediate help! My current location is: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude} - Sent automatically from Emergency App`;

        if (includeSMS) {
            try {
                const isSmsAvailable = await SMS.isAvailableAsync();
                if (isSmsAvailable) {
                    const contactNumbers = contacts.map(c => c.phone);
                    await SMS.sendSMSAsync(contactNumbers, message);
                    results.sms = { success: true, count: contacts.length };
                } else {
                    results.sms = { success: false, error: 'SMS not available' };
                }
            } catch (error) {
                console.error('SMS sending failed:', error);
                results.sms = { success: false, error: error.message };
            }
        }

        if (includeWhatsApp) {
            try {
                const isWhatsAppAvailable = await WhatsAppService.isWhatsAppInstalled();
                if (isWhatsAppAvailable) {
                    // const whatsappResults = await WhatsAppService.sendToMultipleContacts(contacts, message);
                    const successCount = whatsappResults.filter(r => r.success).length;
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
                results.whatsapp = { success: false, error: error.message };
            }
        }

        return results;
    }
}

// --- Enhanced Location Service ---
class LocationService {
    static async checkPermissionStatus() {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            return status;
        } catch (error) {
            console.error('Error checking location permission:', error);
            return 'undetermined';
        }
    }

    static async requestPermission() {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            return status;
        } catch (error) {
            console.error('Error requesting location permission:', error);
            return 'denied';
        }
    }

    static async checkLocationServices() {
        try {
            return await Location.hasServicesEnabledAsync();
        } catch (error) {
            console.error('Error checking location services:', error);
            return false;
        }
    }

    static async getLastKnownLocation() {
        try {
            return await Location.getLastKnownPositionAsync({
                maxAge: LOCATION_CACHE_DURATION,
                requiredAccuracy: 1000,
            });
        } catch (error) {
            console.log('No last known location available');
            return null;
        }
    }

    static async getCurrentLocationWithTimeout(accuracy = Location.Accuracy.High, timeout = LOCATION_TIMEOUT) {
        try {
            const locationPromise = Location.getCurrentPositionAsync({
                accuracy,
                timeout,
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Location request timeout')), timeout)
            );

            return await Promise.race([locationPromise, timeoutPromise]);
        } catch (error) {
            throw error;
        }
    }
}

// --- UI Components ---
const Header = ({ onProfile }) => (
    <View style={styles.header}>
        <View>
            <Image
                source={SentinelIcon}
                style={{ width: 40, height: 40 }}
            />
        </View>
        <View style={styles.headerIcons}>
            <TouchableOpacity style={{ marginLeft: 0 }} onPress={onProfile}>
                <FontAwesome5 name="user-circle" size={30} color="#333" />
            </TouchableOpacity>
        </View>
    </View>
);

const SOSCard = ({ onSOSPress, isReady, buttonText, locationText, onLocationPress, locationStatus, onSOSOptions }) => (
    <View style={styles.sosCard}>
        <TouchableOpacity onPress={onSOSPress} disabled={!isReady} onLongPress={onSOSOptions}>
            <LinearGradient
                colors={isReady ? ['#FF6B6B', '#FF4500'] : ['#D3D3D3', '#A9A9A9']}
                style={styles.sosButton}
            >
                <View style={styles.sosButtonInner}>
                    {buttonText === 'PREPARING...' || buttonText === 'LOCATING...' || buttonText === 'SENDING...' ? (
                        <ActivityIndicator size="large" color="white" />
                    ) : (
                        <>
                            <Text style={styles.sosText}>SOS</Text>
                            <Text style={styles.sosSubtext}>{buttonText}</Text>
                        </>
                    )}
                </View>
            </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLocationPress} style={styles.locationContainer}>
            <View style={styles.locationBox}>
                <Ionicons
                    name="location-sharp"
                    size={20}
                    color={locationStatus === 'available' ? '#ff4500' : '#999'}
                />
                <Text
                    style={[
                        styles.locationText,
                        { color: locationStatus === 'available' ? '#555' : '#999' }
                    ]}
                    numberOfLines={1}
                >
                    {locationText}
                </Text>
            </View>
        </TouchableOpacity>
        <Text style={styles.sosHelpText}>Tap to send • Hold for options</Text>
    </View>
);



export default function HomeScreen() {
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [emergencyContacts, setEmergencyContacts] = useState([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('undetermined');
    const [locationServicesEnabled, setLocationServicesEnabled] = useState(null);
    const [whatsappAvailable, setWhatsappAvailable] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const router = useRouter();
    const { t } = useTranslation();
    const { isContactModalVisible, closeContactModal } = useModal();

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

    // Load contacts when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            const loadContacts = async () => {
                try {
                    const storedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
                    if (storedContacts !== null) {
                        setEmergencyContacts(JSON.parse(storedContacts));
                    } else {
                        setEmergencyContacts([]);
                    }
                } catch (error) {
                    console.error('Failed to load contacts from storage.', error);
                }
            };
            loadContacts();
        }, [])
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

    // Direct permission request and location setup
    const requestLocationPermissionAndSetup = async () => {
        try {
            console.log('📍 Starting location permission request...');

            // Check current permission status
            const currentPermission = await LocationService.checkPermissionStatus();
            setPermissionStatus(currentPermission);

            if (currentPermission === 'undetermined') {
                // Request permission directly - this shows the native dialog
                console.log('📱 Requesting location permission (native dialog)...');
                const newStatus = await LocationService.requestPermission();
                setPermissionStatus(newStatus);

                if (newStatus === 'granted') {
                    await setupLocationAfterPermission();
                } else {
                    console.log('❌ Permission denied');
                    setLocationError('permission_denied');
                }
            } else if (currentPermission === 'granted') {
                await setupLocationAfterPermission();
            } else {
                setLocationError('permission_denied');
            }
        } catch (error) {
            console.error('Error in location permission request:', error);
            setLocationError('setup_failed');
        }
    };

    // Setup location after permission is granted
    const setupLocationAfterPermission = async () => {
        try {
            // Check location services
            const servicesEnabled = await LocationService.checkLocationServices();
            setLocationServicesEnabled(servicesEnabled);

            if (!servicesEnabled) {
                setLocationError('location_services_disabled');
                // Show alert asking user to enable location services
                Alert.alert(
                    'Location Services Disabled',
                    'Please enable location services in your device settings to use emergency location features.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            } else {
                // Everything is good, get location
                await fetchLocation(true);
            }
        } catch (error) {
            console.error('Error in location setup:', error);
            setLocationError('setup_failed');
        }
    };

    // Enhanced app state change handler
    useEffect(() => {
        const loadLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    await Location.getCurrentPositionAsync({});

                } else {
                    Alert.alert("Permission Denied", "Location access is needed for check-in messages.");
                }
            } catch (error) {
                console.error("Failed to get location", error);
            }
        };
        loadLocation()


        const handleAppStateChange = async (nextAppState) => {
            console.log('App state changed from', appStateRef.current, 'to', nextAppState);

            if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('🔄 App came to foreground - rechecking location setup');

                // Recheck permission status
                const currentPermission = await LocationService.checkPermissionStatus();
                setPermissionStatus(currentPermission);

                // Recheck location services if we have permission
                if (currentPermission === 'granted') {
                    const servicesEnabled = await LocationService.checkLocationServices();
                    setLocationServicesEnabled(servicesEnabled);

                    // If both are good and we don't have recent location, fetch it
                    if (servicesEnabled && (!location || (Date.now() - location.timestamp > LOCATION_CACHE_DURATION))) {
                        await fetchLocation(true);
                    }
                }
            }

            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [location, permissionStatus]);

    // Enhanced refresh function
    const refreshAppState = async () => {
        setRefreshing(true);
        try {
            console.log('🔄 Pull-to-refresh: Starting refresh...');

            locationRequestInProgress.current = false;
            initialLocationRequest.current = false;

            setLocation(null);
            setLocationError(null);

            // Reload contacts
            try {
                const storedContacts = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
                if (storedContacts !== null) {
                    setEmergencyContacts(JSON.parse(storedContacts));
                }
            } catch (error) {
                console.error('Pull-to-refresh: Failed to reload contacts', error);
            }

            // Re-check WhatsApp
            try {
                const isAvailable = await WhatsAppService.isWhatsAppInstalled();
                setWhatsappAvailable(isAvailable);
            } catch (error) {
                console.error('Pull-to-refresh: Failed to check WhatsApp', error);
            }

            // Re-run location setup
            await requestLocationPermissionAndSetup();

        } catch (error) {
            console.error('Pull-to-refresh: Error during refresh:', error);
        } finally {
            setRefreshing(false);
        }
    };

    // Enhanced location fetching
    const fetchLocation = async (forceRefresh = false) => {
        if (locationRequestInProgress.current && !forceRefresh) {
            console.log('Location request already in progress, skipping...');
            return;
        }

        console.log('📍 Fetching location... (forceRefresh:', forceRefresh, ')');

        setLocationError(null);

        if (permissionStatus !== 'granted') {
            setLocationError('permission_not_granted');
            return;
        }

        const servicesEnabled = await LocationService.checkLocationServices();
        setLocationServicesEnabled(servicesEnabled);

        if (!servicesEnabled) {
            setLocationError('location_services_disabled');
            return;
        }

        locationRequestInProgress.current = true;
        setIsLoadingLocation(true);

        try {
            if (!location || forceRefresh) {
                const lastKnown = await LocationService.getLastKnownLocation();
                if (lastKnown && (!location || forceRefresh)) {
                    setLocation(lastKnown);
                    console.log('📍 Set last known location as temporary location');
                }
            }

            try {
                console.log('📍 Attempting high accuracy location...');
                const currentLocation = await LocationService.getCurrentLocationWithTimeout(
                    Location.Accuracy.High,
                    LOCATION_TIMEOUT
                );
                setLocation(currentLocation);
                setLocationError(null);
                console.log('✅ High accuracy location obtained successfully');
            } catch (error) {
                console.log('📍 High accuracy failed, trying balanced accuracy');
                try {
                    const fallbackLocation = await LocationService.getCurrentLocationWithTimeout(
                        Location.Accuracy.Balanced,
                        LOCATION_FALLBACK_TIMEOUT
                    );
                    setLocation(fallbackLocation);
                    setLocationError(null);
                    console.log('✅ Balanced accuracy location obtained successfully');
                } catch (fallbackError) {
                    console.error('❌ All location attempts failed:', fallbackError);
                    if (!location) {
                        setLocationError('location_fetch_failed');
                    }
                }
            }
        } catch (error) {
            console.error('Location fetch error:', error);
            if (!location) {
                setLocationError('location_fetch_failed');
            }
        } finally {
            setIsLoadingLocation(false);
            locationRequestInProgress.current = false;
            console.log('📍 Location fetch process completed');
        }
    };

    // Focus effect to refresh location when screen becomes focused
    useFocusEffect(
        React.useCallback(() => {
            if (permissionStatus === 'granted' && locationServicesEnabled) {
                if (!location || (Date.now() - location.timestamp > LOCATION_CACHE_DURATION)) {
                    fetchLocation(true);
                }
            }
        }, [permissionStatus, locationServicesEnabled, location])
    );

    const showSOSResults = (results) => {
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

        if (results.whatsapp) {
            if (results.whatsapp.success) {
                message += `✅ WhatsApp messages initiated for ${results.whatsapp.count}/${results.whatsapp.total} contact(s)\n`;
                hasSuccess = true;
            } else {
                message += `❌ WhatsApp failed: ${results.whatsapp.error}\n`;
            }
        }

        Alert.alert(
            hasSuccess ? 'Emergency Alert Sent' : 'Emergency Alert Failed',
            message.trim(),
            [{ text: 'OK' }]
        );
    };

    const openLocationSettings = () => {
        if (Platform.OS === 'android') {
            Linking.openURL('android.settings.LOCATION_SOURCE_SETTINGS');
        } else {
            Linking.openSettings(); // iOS fallback
        }
    };

    const handleSOSPress = async () => {
        if (isSending) return;

        if (emergencyContacts.length === 0) {
            Alert.alert(
                'No Emergency Contacts',
                'Please add emergency contacts in the "My Circle" screen before using SOS.',
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
                                const status = await LocationService.requestPermission();
                                setPermissionStatus(status);
                                if (status === 'granted') {
                                    await setupLocationAfterPermission();
                                }
                            }
                        }
                    ]
                );
                return;
            } else if (!locationServicesEnabled) {
                Alert.alert(
                    'Location Services Disabled',
                    'Please enable location services in device settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: openLocationSettings }
                    ]
                );
                return;
            } else {
                Alert.alert(
                    'Location Required',
                    'Getting your location for emergency alerts...',
                    [{ text: 'OK' }]
                );
                await fetchLocation(true);
                if (!location) return;
            }
        }

        setIsSending(true);
        try {
            const results = await SOSService.sendEmergencyMessages(emergencyContacts, location, {
                includeSMS: true,
                includeWhatsApp: whatsappAvailable
            });
            showSOSResults(results);
        } catch (error) {
            console.error('SOS sending failed:', error);
            Alert.alert('Error', 'Failed to send emergency alerts. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const handleCategorySelect = (category) => {
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
                                const status = await LocationService.requestPermission();
                                setPermissionStatus(status);
                                if (status === 'granted') {
                                    await setupLocationAfterPermission();
                                }
                            }
                        }
                    ]
                );
            } else if (!locationServicesEnabled) {
                Alert.alert(
                    'Location Services Disabled',
                    'Please enable location services in device settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            } else {
                Alert.alert("Getting Location", "Trying to get your current location...");
                await fetchLocation(true);
            }
        }
    };

    // Determine location display text and status
    const getLocationDisplay = () => {
        if (isLoadingLocation) {
            return { text: 'Getting location...', status: 'loading' };
        }

        if (permissionStatus !== 'granted') {
            return { text: 'Location permission needed', status: 'error' };
        }

        if (locationServicesEnabled === false) {
            return { text: 'Location services disabled', status: 'error' };
        }

        if (locationError) {
            switch (locationError) {
                case 'location_services_disabled':
                    return { text: 'Turn on location services', status: 'error' };
                case 'permission_denied':
                    return { text: 'Location permission denied', status: 'error' };
                case 'location_fetch_failed':
                    return { text: 'Unable to get location', status: 'error' };
                default:
                    return { text: 'Location unavailable', status: 'error' };
            }
        }

        if (location) {
            return {
                text: `Lat: ${location.coords.latitude.toFixed(4)}, Lon: ${location.coords.longitude.toFixed(4)}`,
                status: 'available'
            };
        }

        return { text: 'Location unavailable', status: 'error' };
    };

    // Determine SOS button state
    const getSosButtonState = () => {
        if (isSending) {
            return { isReady: false, text: 'SENDING...' };
        }

        if (isLoadingLocation) {
            return { isReady: false, text: 'LOCATING...' };
        }

        if (permissionStatus !== 'granted' || !locationServicesEnabled) {
            return { isReady: false, text: 'SETUP NEEDED' };
        }

        if (!location) {
            return { isReady: false, text: 'NO LOCATION' };
        }

        return { isReady: true, text: 'PRESS TO SEND' };
    };

    const onProfile = () => {
        console.log('Navigating to Profile screen');
        router.push('/profile');
    };

    const locationDisplay = getLocationDisplay();
    const sosButtonState = getSosButtonState();

    const handleSOSOptions = () => {
        if (!location || emergencyContacts.length === 0) return;

        const options = [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'SMS Only',
                onPress: () => sendSOSWithOptions({ includeSMS: true, includeWhatsApp: false })
            }
        ];

        if (whatsappAvailable) {
            options.push({
                text: 'WhatsApp Only',
                onPress: () => sendSOSWithOptions({ includeSMS: false, includeWhatsApp: true })
            });
            options.push({
                text: 'Both SMS & WhatsApp',
                onPress: () => sendSOSWithOptions({ includeSMS: true, includeWhatsApp: true })
            });
        }

        Alert.alert('SOS Options', 'Choose how to send emergency alerts:', options);
    };

    const sendSOSWithOptions = async (options) => {
        setIsSending(true);
        try {
            const results = await SOSService.sendEmergencyMessages(emergencyContacts, location, options);
            showSOSResults(results);
        } catch (error) {
            console.error('SOS sending failed:', error);
            Alert.alert('Error', 'Failed to send emergency alerts. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refreshAppState}
                        colors={['#2876b8', '#6bdfffff']}
                        tintColor="#2876b8"
                        title="Pull to refresh location and contacts"
                        titleColor="#666"
                    />
                }
            >
                <Header onProfile={onProfile} />
                <View style={styles.titleContainer}>
                    <Text style={styles.mainTitle}>{t('home.title')}</Text>
                    <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
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
            <BottomNavBar />
            <ContactListModal
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
        backgroundColor: '#ffffffff',
    },
    scrollContent: {
        paddingBottom: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 0,
        paddingBottom: 0,
        borderBottomColor: '#000000ff',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginTop: 10,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 10
    },
    locationBox: {
        display: 'flex',
        flexDirection: 'row',
        gap: 2,
    },
    locationText: {
        fontSize: 14,
        color: '#555',
        flexShrink: 1,
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
        color: '#1E1E1E',
    },
    subtitle: {
        fontSize: 14,
        color: '#777',
        marginTop: 10,
        lineHeight: 20,
    },
    sosCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        marginTop: 20,
        padding: 0,
        alignItems: 'center',
    },
    sosButton: {
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2876b8',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    sosButtonInner: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sosText: {
        fontSize: 36,
        color: 'white',
        fontWeight: 'bold',
    },
    sosSubtext: {
        fontSize: 12,
        color: 'white',
        marginTop: 2,
    },
    sosHelpText: {
        fontSize: 12,
        color: '#999',
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
        color: '#1E1E1E',
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
        color: '#333',
    },
    navBar: {
        height: 45,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'white',
        borderTopWidth: 0,
        borderTopColor: '#e8e8e8',
    },
    navItem: {
        alignItems: 'center',
    },
    navText: {
        fontSize: 12,
        marginTop: 2,
    },
});