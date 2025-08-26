import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5,MaterialIcons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useModal } from '@/context/ModalContext';
import { useTranslation } from 'react-i18next';
import BottomNavBar from '../components/BottomNavBar';
import ContactListModal from '../components/ContactListModal';

// --- Configuration ---
const CONTACTS_STORAGE_KEY = 'emergency_contacts';

// --- UI Components ---
const Header = ({ onProfile }) => (
  <View style={styles.header}>
    <View style={styles.headerIcons}>
      <TouchableOpacity>
        <Ionicons name="notifications-outline" size={30} color="#333" />
      </TouchableOpacity>
      <TouchableOpacity style={{ marginLeft: 15 }} onPress={onProfile}>
        <FontAwesome5 name="user-circle" size={30} color="#333" />
      </TouchableOpacity>
    </View>
  </View>
);

const SOSCard = ({ onSOSPress, isReady, buttonText, locationText, onLocationPress }) => (
  <View style={styles.sosCard}>
    <TouchableOpacity onPress={onSOSPress} disabled={!isReady}>
      <LinearGradient
        colors={isReady ? ['#FF6B6B', '#FF4500'] : ['#D3D3D3', '#A9A9A9']}
        style={styles.sosButton}
      >
        <View style={styles.sosButtonInner}>
          {buttonText === 'PREPARING...' ? (
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
        <Ionicons name="location-sharp" size={20} color="#ff4500" />
        <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
      </View>
    </TouchableOpacity>
  </View>
);

const EmergencyCategory = ({ icon, name, color, iconSet, onPress }) => {
  const IconComponent = iconSet === 'MaterialCommunity' ?(iconSet==='MaterialIcons') ?MaterialIcons: MaterialCommunityIcons : (iconSet==='MaterialIcons') ?MaterialIcons : FontAwesome5;
  return (
    <TouchableOpacity style={styles.categoryBox} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <IconComponent name={icon} size={24} color="white" />
      </View>
      <Text style={styles.categoryText}>{name}</Text>
    </TouchableOpacity>
  );
};

const CATEGORY_CONFIG = [
    { id: 'medical', icon: 'medical-bag', color: '#FF6B6B', iconSet: 'MaterialCommunity' },
    { id: 'fire', icon: 'fire', color: '#FFA500', iconSet: 'FontAwesome5' },
    { id: 'record', icon: 'video', color: '#5856D6', iconSet: 'MaterialCommunity' },
    { id: 'sound_recorder', icon: 'multitrack-audio', color: '#7a78f0ff', iconSet: 'MaterialIcons' },
    { id: 'accident', icon: 'car-crash', color: '#9370DB', iconSet: 'FontAwesome5' },
    { id: 'violence', icon: 'user-ninja', color: '#4682B4', iconSet: 'FontAwesome5' },
    { id: 'natural_disaster', icon: 'cloud-showers-heavy', color: '#1E90FF', iconSet: 'FontAwesome5' },
    { id: 'rescue', icon: 'hands-helping', color: '#3CB371', iconSet: 'FontAwesome5' },
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
    } else if (category.id === 'sound_recorder'){
router.push('/audioRecorder');
    }else {
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

export default function HomeScreen() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState(null);
  
  const router = useRouter();
  const { t } = useTranslation();
  const { isContactModalVisible, closeContactModal } = useModal();
  
  // Refs to prevent multiple simultaneous location requests
  const locationRequestInProgress = useRef(false);
  const appStateRef = useRef(AppState.currentState);

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

  // Enhanced location fetching function
  const fetchLocation = async (forceRefresh = false) => {
    if (locationRequestInProgress.current && !forceRefresh) {
      return;
    }

    locationRequestInProgress.current = true;
    setIsLoadingLocation(true);
    setErrorMsg(null);

    try {
      // Check and request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionStatus(status);

      if (status !== 'granted') {
        setErrorMsg('Location permission denied');
        setLocation(null);
        return;
      }

      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        setErrorMsg('Location services disabled');
        setLocation(null);
        return;
      }

      // Get last known position first for faster response
      if (!location) {
        try {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 5 * 60 * 1000, // 5 minutes
            requiredAccuracy: 1000, // 1km accuracy
          });
          if (lastKnown) {
            setLocation(lastKnown);
          }
        } catch (error) {
          console.log('No last known location available');
        }
      }

      // Get current position with timeout
      try {
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 15000, // 15 seconds timeout
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Location timeout')), 15000)
        );

        const currentLocation = await Promise.race([locationPromise, timeoutPromise]);
        setLocation(currentLocation);
        setErrorMsg(null);
      } catch (error) {
        console.log('High accuracy location failed, trying balanced accuracy');
        try {
          const fallbackLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 10000,
          });
          setLocation(fallbackLocation);
          setErrorMsg(null);
        } catch (fallbackError) {
          if (!location) {
            setErrorMsg('Unable to get location');
          }
          console.error('Location fetch failed:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Location permission or setup failed:', error);
      setErrorMsg('Location access failed');
    } finally {
      setIsLoadingLocation(false);
      locationRequestInProgress.current = false;
    }
  };

  // Initial location fetch on mount
  useEffect(() => {
    fetchLocation();
  }, []);

  // Listen for app state changes to refresh location when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground, refresh location if we don't have it or if it's old
        if (!location || (Date.now() - location.timestamp > 5 * 60 * 1000)) {
          fetchLocation(true);
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [location]);

  // Focus effect to check location when screen becomes focused
  useFocusEffect(
    React.useCallback(() => {
      // Check if location is stale (older than 5 minutes) when screen focuses
      if (!location || (Date.now() - location.timestamp > 5 * 60 * 1000)) {
        fetchLocation(true);
      }
    }, [location])
  );

  const sendSmsWithDevice = async (message, recipients) => {
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      setIsSending(true);
      await SMS.sendSMSAsync(recipients, message);
      setIsSending(false);
    } else {
      Alert.alert('Error', 'SMS is not available on this device.');
    }
  };

  const handleSOSPress = async () => {
    if (isSending) return;
    
    // If no location, try to get it one more time
    if (!location) {
      await fetchLocation(true);
      if (!location) {
        Alert.alert('Location Required', 'Unable to get your location for emergency alert.');
        return;
      }
    }
    
    if (emergencyContacts.length === 0) {
      Alert.alert(
        'No Contacts',
        'Please go to the "My Circle" screen to add emergency contacts first.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const contactNumbers = emergencyContacts.map((c) => c.phone);
    const message = `Emergency SOS! I need help! My location is: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
    await sendSmsWithDevice(message, contactNumbers);
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

  const handleLocationPress = () => {
    if (location) {
      router.push({
        pathname: "/map",
        params: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      });
    } else {
      // Try to get location when pressed
      fetchLocation(true);
      Alert.alert("Getting Location", "Trying to get your current location...");
    }
  };

  // Determine location display text
  let locationText = 'Getting location...';
  if (isLoadingLocation) {
    locationText = 'Getting location...';
  } else if (errorMsg) {
    if (errorMsg.includes('denied')) {
      locationText = 'Location permission needed';
    } else if (errorMsg.includes('disabled')) {
      locationText = 'Turn on location services';
    } else {
      locationText = 'Location unavailable';
    }
  } else if (location) {
    locationText = `Lat: ${location.coords.latitude.toFixed(4)}, Lon: ${location.coords.longitude.toFixed(4)}`;
  }

  // Determine SOS button state
  const isReady = !isSending && location && !isLoadingLocation;
  let sosButtonText = 'Press to Send';
  if (isSending) {
    sosButtonText = 'SENDING...';
  } else if (isLoadingLocation) {
    sosButtonText = 'LOCATING...';
  } else if (!location) {
    sosButtonText = 'NO LOCATION';
  }

  const onProfile = () => {
    router.push('/profile');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header onProfile={onProfile} />
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>{t('home.title')}</Text>
          <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
        </View>
        <SOSCard
          onSOSPress={handleSOSPress}
          isReady={isReady}
          onLocationPress={handleLocationPress}
          buttonText={sosButtonText}
          locationText={locationText}
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
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
    marginBottom:20

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
    shadowColor: '#FF4500',
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
    justifyContent:'space-between',
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