import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
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
  const IconComponent = iconSet === 'MaterialCommunity' ? MaterialCommunityIcons : FontAwesome5;
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

export default function HomeScreen() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const router = useRouter();
  const { t } = useTranslation();
  const { isContactModalVisible, closeContactModal } = useModal();

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

  useEffect(() => {
    const setupAndGetLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        setLocation(lastKnown);
      }
      try {
        const freshLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(freshLocation);
      } catch (error) {
        console.error("Could not get high-accuracy location", error);
      }
    };
    setupAndGetLocation();
  }, []);

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
    if (isSending || !location) return;
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

  let locationText = 'Waiting for location...';
  if (errorMsg) {
    locationText = errorMsg;
  } else if (location) {
    locationText = `Lat: ${location.coords.latitude.toFixed(4)}, Lon: ${location.coords.longitude.toFixed(4)}`;
  }

  const isReady = !isSending && location;
  let sosButtonText = 'Press to Send';
  if (isSending) {
    sosButtonText = 'PREPARING...';
  } else if (!location) {
    sosButtonText = 'LOCATING...';
  }

  const onProfile = () => {
    router.push('/profile');
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
      Alert.alert("Location Not Available", "We are still trying to find your location.");
    }
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
