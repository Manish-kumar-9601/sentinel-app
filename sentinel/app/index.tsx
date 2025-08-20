import React,{useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import ContactListModal from '../components/ContactListModal';
import BottomNavBar from '../components/BottomNavBar'
import { useModal } from '../context/ModalContext';
// --- Configuration ---
const CONTACTS_STORAGE_KEY = 'emergency_contacts';

// --- UI Components (Header, SOSCard, etc. remain the same) ---
const Header = ({ locationText }) => (
  <View style={styles.header}>
    <View style={styles.locationContainer}>
      <Ionicons name="location-sharp" size={20} color="#ff4500" />
      <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
    </View>
    <View style={styles.headerIcons}>
      <TouchableOpacity>
        <Ionicons name="notifications-outline" size={24} color="#333" />
      </TouchableOpacity>
      <TouchableOpacity style={{ marginLeft: 15 }}>
        <FontAwesome5 name="user-circle" size={24} color="#333" />
      </TouchableOpacity>
    </View>
  </View>
);

const SOSCard = ({ onSOSPress, isReady, buttonText }) => (
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
    </View>
);

const EmergencyCategory = ({ icon, name, color, iconSet, onPress }) => {
    const IconComponent = iconSet === 'MaterialCommunity' ? MaterialCommunityIcons : FontAwesome5;
    return (
        <TouchableOpacity style={styles.categoryBox} onPress={() => onPress(name)}>
            <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <IconComponent name={icon} size={24} color="white" />
            </View>
            <Text style={styles.categoryText}>{name}</Text>
        </TouchableOpacity>
    );
};

const EmergencyGrid = ({ onCategorySelect }) => {
    const router = useRouter();
    const categories = [
        { icon: 'medical-bag', name: 'Medical', color: '#FF6B6B', iconSet: 'MaterialCommunity' },
        { icon: 'fire', name: 'Fire', color: '#FFA500', iconSet: 'FontAwesome5' },
        { icon: 'video', name: 'Record', color: '#5856D6', iconSet: 'MaterialCommunity' },
        { icon: 'car-crash', name: 'Accident', color: '#9370DB', iconSet: 'FontAwesome5' },
        { icon: 'user-ninja', name: 'Violence', color: '#4682B4', iconSet: 'FontAwesome5' },
            { icon: 'cloud-showers-heavy', name: 'Natural disaster', color: '#1E90FF', iconSet: 'FontAwesome5' },

        { icon: 'hands-helping', name: 'Rescue', color: '#3CB371', iconSet: 'FontAwesome5' },
    ];

    const handlePress = (name) => {
        if (name === 'Record') {
            router.push('/recorder');
        } else {
            onCategorySelect(name);
        }
    };

    return (
        <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>What's your emergency?</Text>
            <View style={styles.categoriesGrid}>
                {categories.map((cat) => (
                    <EmergencyCategory
                        key={cat.name}
                        icon={cat.icon}
                        name={cat.name}
                        color={cat.color}
                        iconSet={cat.iconSet}
                        onPress={handlePress}
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
  const [locationWatcher, setLocationWatcher] = useState(null);
  const router = useRouter();
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
    const setupPermissionsAndTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (newLocation) => {
          setLocation(newLocation);
          setErrorMsg(null);
        }
      );
      setLocationWatcher(watcher);
    };
    setupPermissionsAndTracking();
    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
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

  const handleCheckInSelect = async (contact) => {
    
    if (!location) {
      Alert.alert('Location Not Found', 'Cannot send check-in without your location.');
      return;
    }
    const message = `Check-in: I'm here and safe. My location is: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
    await sendSmsWithDevice(message, [contact.phone]);
  };

  const handleCategorySelect = (categoryName) => {
    Alert.alert('Emergency Selected', `You have selected: ${categoryName}. Help is on the way.`, [{ text: 'OK' }]);
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
 
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header locationText={locationText} />
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>Are you in an emergency?</Text>
          <Text style={styles.subtitle}>
            Press the SOS button, an SMS with your live location will be sent to your emergency contacts.
          </Text>
           
        </View>
        <SOSCard onSOSPress={handleSOSPress} isReady={isReady} buttonText={sosButtonText} />
        <EmergencyGrid onCategorySelect={handleCategorySelect} />
      </ScrollView>
  
      <BottomNavBar     />
      <ContactListModal
                visible={isContactModalVisible}
                onClose={closeContactModal}            
            />
    
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop:15,
    flex: 1,
    backgroundColor: '#ffffffff',
  },
  scrollContent: {
    paddingBottom: 80, // Space for the custom nav bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#555',
    flexShrink: 1,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  titleContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
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
  checkInButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 15,
  },
  checkInButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sosCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    // margin: 20,
    padding: 10,
    alignItems: 'center',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 5 },
    // shadowOpacity: 0.1,
    // shadowRadius: 15,
    // elevation: 5,
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
    marginTop: 10,
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
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
});
