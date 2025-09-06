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
    BackHandler,
    Image,
    Linking,
    Modal,
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

// --- Configuration ---
const CONTACTS_STORAGE_KEY = 'emergency_contacts';
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const LOCATION_TIMEOUT = 15000; // 15 seconds
const LOCATION_FALLBACK_TIMEOUT = 10000; // 10 seconds for fallback
const PERMISSION_CHECK_KEY = 'location_permission_checked';
const LOCATION_SERVICES_CHECK_KEY = 'location_services_checked';

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
                    const whatsappResults = await WhatsAppService.sendToMultipleContacts(contacts, message);
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

const EmergencyCategory = ({ icon, name, color, iconSet, onPress }) => {
    const IconComponent = iconSet === 'MaterialCommunity' ? (iconSet === 'MaterialIcons') ? MaterialIcons : MaterialCommunityIcons : (iconSet === 'MaterialIcons') ? MaterialIcons : FontAwesome5;
    const IconSize = iconSet === 'MaterialCommunity' ? 36 : (iconSet === 'MaterialIcons') ? 36 : 28;
    return (
        <TouchableOpacity style={styles.categoryBox} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <IconComponent name={icon} size={IconSize} color="white" />
            </View>
            <Text style={styles.categoryText}>{name}</Text>
        </TouchableOpacity>
    );
};

const CATEGORY_CONFIG = [
    { id: 'medical', icon: 'medical-bag', color: '#FF6B6B', iconSet: 'MaterialCommunity' },
    { id: 'fire', icon: 'fire', color: '#FFA500', iconSet: 'FontAwesome5' },
    { id: 'accident', icon: 'car-crash', color: '#9370DB', iconSet: 'FontAwesome5' },
    { id: 'violence', icon: 'user-ninja', color: '#4682B4', iconSet: 'FontAwesome5' },
    { id: 'natural_disaster', icon: 'cloud-showers-heavy', color: '#1E90FF', iconSet: 'FontAwesome5' },
    { id: 'rescue', icon: 'hands-helping', color: '#3CB371', iconSet: 'FontAwesome5' },
    { id: 'psychiatrist', icon: 'psychology', color: '#d44ec2ff', iconSet: 'MaterialIcons' },
    { id: 'record', icon: 'video', color: '#5856D6', iconSet: 'MaterialCommunity' },
    { id: 'sound_recorder', icon: 'multitrack-audio', color: '#7a78f0ff', iconSet: 'MaterialIcons' },
];

const EmergencyGrid = ({ onCategorySelect }) => {
    const router = useRouter();
    const { t } = useTranslation();

    const categories = CATEGORY_CONFIG.map(cat => ({
        ...cat,
        name: t(`home.categories.${cat.id}`),
    }));

    const handlePress = (category) => {
        if (category.id === 'record') {
            router.push('/recorder');
        } else if (category.id === 'sound_recorder') {
            router.push('/audioRecorder');
        } else {
            onCategorySelect(category);
        }
    };

    return (
        <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>{t('home.emergencyGridTitle')}</Text>
            <View style={styles.categoriesGrid}>
                {categories.map((cat) => (
                    <EmergencyCategory
                        key={cat.id}
                        icon={cat.icon}
                        name={cat.name}
                        color={cat.color}
                        iconSet={cat.iconSet}
                        onPress={() => handlePress(cat)}
                    />
                ))}
            </View>
        </View>
    );
};

// --- New Permission Modal Component ---
const LocationPermissionModal = ({ visible, onRequestPermission, onClose, type = 'permission' }) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalIcon}>
                        <Ionicons
                            name="location"
                            size={60}
                            color="#FF6B6B"
                        />
                    </View>

                    <Text style={styles.modalTitle}>
                        {type === 'permission' ? 'Location Permission Required' : 'Turn On Location Services'}
                    </Text>

                    <Text style={styles.modalDescription}>
                        {type === 'permission'
                            ? 'Sentinel needs access to your location to send accurate emergency alerts to your contacts. Your location will only be used during emergencies.'
                            : 'Location services are disabled. Please enable them in your device settings to use emergency location features.'
                        }
                    </Text>

                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={styles.modalButtonSecondary}
                            onPress={onClose}
                        >
                            <Text style={styles.modalButtonTextSecondary}>Not Now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalButtonPrimary}
                            onPress={onRequestPermission}
                        >
                            <Text style={styles.modalButtonTextPrimary}>
                                {type === 'permission' ? 'Allow Location' : 'Open Settings'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

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

    // New state for permission modals
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [showLocationServicesModal, setShowLocationServicesModal] = useState(false);
    const [hasShownInitialPermissionPrompt, setHasShownInitialPermissionPrompt] = useState(false);

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

    // Enhanced app initialization with proactive permission checking
    useEffect(() => {
        const initializeApp = async () => {
            if (initialLocationRequest.current) return;
            initialLocationRequest.current = true;

            console.log('🚀 Initializing app with proactive location setup...');
            await proactiveLocationSetup();
        };

        initializeApp();
    }, []);

    // Proactive location setup - similar to Google Maps behavior
    const proactiveLocationSetup = async () => {
        try {
            console.log('📍 Starting proactive location setup...');

            // Check if we've already prompted the user in this session
            const hasPromptedBefore = await AsyncStorage.getItem(PERMISSION_CHECK_KEY);

            // Always check current permission status
            const currentPermission = await LocationService.checkPermissionStatus();
            setPermissionStatus(currentPermission);

            console.log('Current permission status:', currentPermission);
            console.log('Has prompted before:', hasPromptedBefore);

            if (currentPermission === 'undetermined' || (currentPermission === 'denied' && !hasPromptedBefore)) {
                // Show our custom modal immediately for better UX
                console.log('📲 Showing permission modal...');
                setShowPermissionModal(true);
                return;
            }

            if (currentPermission === 'granted') {
                // Check location services
                const servicesEnabled = await LocationService.checkLocationServices();
                setLocationServicesEnabled(servicesEnabled);

                console.log('Location services enabled:', servicesEnabled);

                if (!servicesEnabled) {
                    // Show location services modal
                    console.log('⚙️ Showing location services modal...');
                    setShowLocationServicesModal(true);
                } else {
                    // Everything is good, get location
                    await fetchLocation(true);
                }
            } else {
                // Permission denied
                setLocationError('permission_denied');
            }
        } catch (error) {
            console.error('Error in proactive location setup:', error);
            setLocationError('setup_failed');
        }
    };

    // Handle permission modal request
    const handlePermissionModalRequest = async () => {
        setShowPermissionModal(false);

        try {
            console.log('📱 Requesting location permission...');
            const status = await LocationService.requestPermission();
            setPermissionStatus(status);

            // Mark that we've prompted the user
            await AsyncStorage.setItem(PERMISSION_CHECK_KEY, 'true');

            if (status === 'granted') {
                console.log('✅ Permission granted! Checking location services...');

                // Now check location services
                const servicesEnabled = await LocationService.checkLocationServices();
                setLocationServicesEnabled(servicesEnabled);

                if (!servicesEnabled) {
                    // Show location services modal
                    setShowLocationServicesModal(true);
                } else {
                    // Everything is ready, get location
                    await fetchLocation(true);
                }
            } else {
                console.log('❌ Permission denied');
                setLocationError('permission_denied');
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            setLocationError('permission_request_failed');
        }
    };

    // Handle location services modal request
    const handleLocationServicesModalRequest = async () => {
        setShowLocationServicesModal(false);

        try {
            await Linking.openSettings();

            // After user potentially enables location services, recheck when they return
            setTimeout(async () => {
                const servicesEnabled = await LocationService.checkLocationServices();
                setLocationServicesEnabled(servicesEnabled);

                if (servicesEnabled && permissionStatus === 'granted') {
                    await fetchLocation(true);
                }
            }, 1000);
        } catch (error) {
            console.error('Error opening settings:', error);
        }
    };

    // Enhanced app state change handler
    useEffect(() => {
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
                } else if (currentPermission === 'undetermined' && !hasShownInitialPermissionPrompt) {
                    // User might have reset permissions, show modal again
                    setShowPermissionModal(true);
                }
            }

            appStateRef.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [location, permissionStatus, hasShownInitialPermissionPrompt]);

    // Back handler for modals (Android)
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (showPermissionModal || showLocationServicesModal) {
                setShowPermissionModal(false);
                setShowLocationServicesModal(false);
                return true;
            }
            return false;
        });

        return () => backHandler.remove();
    }, [showPermissionModal, showLocationServicesModal]);

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

            // Re-run proactive location setup
            await proactiveLocationSetup();

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
            // Try to get location first, or show appropriate modal
            if (permissionStatus !== 'granted') {
                setShowPermissionModal(true);
                return;
            } else if (!locationServicesEnabled) {
                setShowLocationServicesModal(true);
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
            // Try to resolve location issues with modals
            if (permissionStatus !== 'granted') {
                setShowPermissionModal(true);
            } else if (!locationServicesEnabled) {
                setShowLocationServicesModal(true);
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
    }

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

            {/* Enhanced Location Permission Modals */}
            <LocationPermissionModal
                visible={showPermissionModal}
                onRequestPermission={handlePermissionModalRequest}
                onClose={() => setShowPermissionModal(false)}
                type="permission"
            />

            <LocationPermissionModal
                visible={showLocationServicesModal}
                onRequestPermission={handleLocationServicesModalRequest}
                onClose={() => setShowLocationServicesModal(false)}
                type="services"
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
    // New styles for permission modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 350,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 25,
    },
    modalIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1E1E1E',
        textAlign: 'center',
        marginBottom: 12,
    },
    modalDescription: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButtonPrimary: {
        flex: 1,
        backgroundColor: '#FF6B6B',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonSecondary: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonTextPrimary: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    modalButtonTextSecondary: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
});



