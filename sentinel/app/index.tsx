  import React, { useState, useEffect } from 'react';
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
import { Link, useFocusEffect, usePathname, useRouter } from 'expo-router';
import ContactListModal from '../components/ContactListModal';

// --- Configuration ---
const CONTACTS_STORAGE_KEY = 'emergency_contacts';

// =================================================================
// 1. UI COMPONENTS (Presentational)
// =================================================================

const Header = ({ locationText }) => (
  <View style={styles.header}>
    <View style={styles.locationContainer}>
      <Ionicons name="location-sharp" size={20} color="#ff4500" />
      <Text style={styles.locationText} numberOfLines={1}>
        {locationText}
      </Text>
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
  const IconComponent =
    iconSet === 'MaterialCommunity' ? MaterialCommunityIcons : FontAwesome5;
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
  const categories = [
    { icon: 'medical-bag', name: 'Medical', color: '#FF6B6B', iconSet: 'MaterialCommunity' },
    { icon: 'fire', name: 'Fire', color: '#FFA500', iconSet: 'FontAwesome5' },
    { icon: 'cloud-showers-heavy', name: 'Natural disaster', color: '#1E90FF', iconSet: 'FontAwesome5' },
    { icon: 'car-crash', name: 'Accident', color: '#9370DB', iconSet: 'FontAwesome5' },
    { icon: 'user-ninja', name: 'Violence', color: '#4682B4', iconSet: 'FontAwesome5' },
    { icon: 'hands-helping', name: 'Rescue', color: '#3CB371', iconSet: 'FontAwesome5' },
  ];

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
            onPress={onCategorySelect}
          />
        ))}
      </View>
    </View>
  );
};

const BottomNavBar = ({ activeTab, onTabPress }) => (
  <View style={styles.navBar}>

 
    <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('home')}>
      <Ionicons name="home" size={26} color={activeTab === '/' ? '#FF4500' : '#A9A9A9'} />
      <Text style={[styles.navText, { color: activeTab === '/' ? '#FF4500' : '#A9A9A9' }]}>Home</Text>
    </TouchableOpacity>
 


 

    <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('myCircle')}>
      <Ionicons name="people-circle-outline" size={26} color={activeTab === '/myCircle' ? '#FF4500' : '#A9A9A9'} />
      <Text style={[styles.navText, { color: activeTab === '/myCircle' ? '#FF4500' : '#A9A9A9' }]}>My circle</Text>
    </TouchableOpacity>
  

  

    <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('explore')}>
      <Ionicons name="compass-outline" size={26} color={activeTab === '/explore' ? '#FF4500' : '#A9A9A9'} />
      <Text style={[styles.navText, { color: activeTab === 'Explore' ? '#FF4500' : '#A9A9A9' }]}>Explore</Text>
    </TouchableOpacity>
 



    <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('profile')}>
      <Ionicons name="person-outline" size={26} color={activeTab === 'profile' ? '#FF4500' : '#A9A9A9'} />
      <Text style={[styles.navText, { color: activeTab === 'Profile' ? '#FF4500' : '#A9A9A9' }]}>Profile</Text>
    </TouchableOpacity>


  </View>
);

// =================================================================
// 2. SCREEN COMPONENT (Container with Logic)
// =================================================================

export default function HomeScreen() {
  const pathName=usePathname()
  console.log("current path",pathName)
   const router = useRouter(); 
  const [activeTab, setActiveTab] = useState('Home');
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [locationWatcher, setLocationWatcher] = useState(null);

  // --- 1. Load contacts from storage whenever the screen is focused ---
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

  // --- 2. Request Permissions and Start Location Tracking ---
  useEffect(() => {
    const setupPermissionsAndTracking = async () => {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setErrorMsg('Location services are disabled.');
        Alert.alert('Location Disabled', 'Please enable location services in your device settings.');
        return;
      }
      let { status } = await Location.requestForegroundPermissionsAsync();
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

  // --- 3. Universal SMS Sending Function ---
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

  // --- 4. SOS Button Press Handler ---
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
    const message = `Emergency SOS! I need help! My location is: http://googleusercontent.com/maps.google.com/9{location.coords.latitude},${location.coords.longitude}`;
    await sendSmsWithDevice(message, contactNumbers);
  };

  // --- 5. Check-In Handler ---
  const handleCheckInSelect = async (contact) => {
    setModalVisible(false);
    if (!location) {
      Alert.alert('Location Not Found', 'Cannot send check-in without your location.');
      return;
    }
    const message = `Check-in: I'm here and safe. My location is: http://maps.google.com/maps?q=$0{location.coords.latitude},${location.coords.longitude}`;
    await sendSmsWithDevice(message, [contact.phone]);
  };

  // --- Other Handlers ---
  const handleCategorySelect = (categoryName) => {
    Alert.alert('Emergency Selected', `You have selected: ${categoryName}. Help is on the way.`, [{ text: 'OK' }]);
  };

  const handleTabPress = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'home') {
      router.push('/');
    } else if (tabName === 'explore') {
      router.push('/explore');
    }
    else if (tabName === 'myCircle') {
      router.push('/myCircle');
    }else if (tabName === 'profile') {
      router.push('/profile');
    }
    console.log(`Navigating to ${tabName}`);
  };

  // --- UI Rendering Logic ---
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
          <TouchableOpacity style={styles.checkInButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.checkInButtonText}>Send a Check-In</Text>
          </TouchableOpacity>
        </View>

        <SOSCard onSOSPress={handleSOSPress} isReady={isReady} buttonText={sosButtonText} />

        <EmergencyGrid onCategorySelect={handleCategorySelect} />
      </ScrollView>

      <ContactListModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSelectContact={handleCheckInSelect}
        contacts={emergencyContacts}
      />
      <BottomNavBar activeTab={pathName} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

// =================================================================
// 4. STYLES
// =================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollContent: {
    paddingBottom: 80,
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
    // backgroundColor: 'white',
    // borderRadius: 30,
    // margin: 10,
    // padding: 10,
    alignItems: 'center',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.1,
    // shadowRadius: 15,
    // elevation: 4,
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
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 2,
  },
}); 
