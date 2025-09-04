import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';

const { width, height } = Dimensions.get('window');

// Map styles for different themes
const mapStyles = {
  standard: [],
  satellite: [],
  dark: [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#746855" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "featureType": "administrative.locality",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#d59563" }]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#d59563" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry",
      "stylers": [{ "color": "#263c3f" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#6b9a76" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#38414e" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#212a37" }]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#9ca5b3" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#746855" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [{ "color": "#1f2835" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#f3d19c" }]
    },
    {
      "featureType": "transit",
      "elementType": "geometry",
      "stylers": [{ "color": "#2f3948" }]
    },
    {
      "featureType": "transit.station",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#d59563" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#17263c" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#515c6d" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#17263c" }]
    }
  ]
};

const MapScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get coordinates from params or use default
  const initialLatitude = params.latitude ? parseFloat(params.latitude) : 37.78825;
  const initialLongitude = params.longitude ? parseFloat(params.longitude) : -122.4324;
  const initialTitle = params.title || 'Emergency Location';
  const isEmergency = params.isEmergency === 'true';

  const [region, setRegion] = useState({
    latitude: initialLatitude,
    longitude: initialLongitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const [mapStyle, setMapStyle] = useState('standard');
  const [showAccuracyCircle, setShowAccuracyCircle] = useState(true);
  const [address, setAddress] = useState('Loading address...');

  const mapRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
    reverseGeocode(initialLatitude, initialLongitude);
  }, []);

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your current location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setIsLoading(false);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (result.length > 0) {
        const location = result[0];
        const addressString = [
          location.street,
          location.city,
          location.region,
          location.country
        ].filter(Boolean).join(', ');

        setAddress(addressString || 'Address not found');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setAddress('Address not available');
    }
  };

  const handleRegionChangeComplete = (newRegion) => {
    setRegion(newRegion);
  };

  const centerOnLocation = (latitude, longitude) => {
    const newRegion = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1000);
  };

  const centerOnCurrentLocation = () => {
    if (currentLocation) {
      centerOnLocation(currentLocation.latitude, currentLocation.longitude);
    } else {
      getCurrentLocation();
    }
  };

  const centerOnEmergencyLocation = () => {
    centerOnLocation(initialLatitude, initialLongitude);
  };

  const openInExternalMaps = () => {
    const latitude = region.latitude;
    const longitude = region.longitude;

    Alert.alert(
      'Open in Maps',
      'Choose your preferred maps application:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Google Maps',
          onPress: () => {
            const url = `https://maps.google.com/?q=${latitude},${longitude}`;
            Linking.openURL(url);
          },
        },
        {
          text: 'Apple Maps',
          onPress: () => {
            const url = `http://maps.apple.com/?ll=${latitude},${longitude}`;
            Linking.openURL(url);
          },
        },
      ]
    );
  };

  const shareLocation = () => {
    const latitude = region.latitude;
    const longitude = region.longitude;
    const googleMapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

    Alert.alert(
      'Share Location',
      `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\nGoogle Maps: ${googleMapsUrl}`,
      [
        { text: 'OK' },
        {
          text: 'Copy Link',
          onPress: () => {
            // In a real app, you'd use Clipboard API
            Alert.alert('Link Copied', 'Google Maps link copied to clipboard');
          }
        }
      ]
    );
  };

  const toggleMapType = () => {
    const types = ['standard', 'satellite', 'hybrid'];
    const currentIndex = types.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % types.length;
    setMapType(types[nextIndex]);
  };

  const toggleMapStyle = () => {
    const styles = ['standard', 'dark'];
    const currentIndex = styles.indexOf(mapStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    setMapStyle(styles[nextIndex]);
  };

  const getMarkerColor = () => {
    return isEmergency ? '#ff4444' : '#4285f4';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEmergency ? 'Emergency Location' : 'Map View'}
        </Text>
        <TouchableOpacity style={styles.headerButton} onPress={shareLocation}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Address Bar */}
      <View style={styles.addressBar}>
        <Ionicons name="location-outline" size={20} color="#666" />
        <Text style={styles.addressText} numberOfLines={2}>
          {address}
        </Text>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          mapType={mapType}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={mapStyle === 'dark' ? mapStyles.dark : mapStyles.standard}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          toolbarEnabled={false}
        >
          {/* Emergency/Target Location Marker */}
          <Marker
            coordinate={{
              latitude: initialLatitude,
              longitude: initialLongitude,
            }}
            title={initialTitle}
            description={`Lat: ${initialLatitude.toFixed(6)}, Lng: ${initialLongitude.toFixed(6)}`}
            pinColor={getMarkerColor()}
          >
            <View style={[styles.customMarker, { backgroundColor: getMarkerColor() }]}>
              <Ionicons
                name={isEmergency ? "warning" : "location"}
                size={20}
                color="white"
              />
            </View>
          </Marker>

          {/* Current Location with Accuracy Circle */}
          {currentLocation && (
            <>
              <Marker
                coordinate={currentLocation}
                title="Your Current Location"
                description="This is where you are right now"
              >
                <View style={styles.currentLocationMarker}>
                  <View style={styles.currentLocationDot} />
                </View>
              </Marker>

              {showAccuracyCircle && currentLocation.accuracy && (
                <Circle
                  center={currentLocation}
                  radius={currentLocation.accuracy}
                  strokeColor="rgba(66, 133, 244, 0.5)"
                  fillColor="rgba(66, 133, 244, 0.1)"
                  strokeWidth={1}
                />
              )}
            </>
          )}
        </MapView>

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4285f4" />
            <Text style={styles.loadingText}>Getting location...</Text>
          </View>
        )}

        {/* Floating Action Buttons */}
        <View style={styles.fab}>
          {/* Current Location Button */}
          <TouchableOpacity
            style={[styles.fabButton, { backgroundColor: currentLocation ? '#4285f4' : '#ccc' }]}
            onPress={centerOnCurrentLocation}
            disabled={!currentLocation}
          >
            <MaterialIcons name="my-location" size={24} color="white" />
          </TouchableOpacity>

          {/* Emergency Location Button */}
          {isEmergency && (
            <TouchableOpacity
              style={[styles.fabButton, { backgroundColor: '#ff4444' }]}
              onPress={centerOnEmergencyLocation}
            >
              <Ionicons name="warning" size={24} color="white" />
            </TouchableOpacity>
          )}

          {/* Map Type Toggle */}
          <TouchableOpacity
            style={[styles.fabButton, { backgroundColor: '#34a853' }]}
            onPress={toggleMapType}
          >
            <MaterialIcons name="layers" size={24} color="white" />
          </TouchableOpacity>

          {/* Style Toggle */}
          <TouchableOpacity
            style={[styles.fabButton, { backgroundColor: '#ea4335' }]}
            onPress={toggleMapStyle}
          >
            <Ionicons name="color-palette" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bottom Info Panel */}
        <View style={styles.bottomPanel}>
          <View style={styles.coordinatesContainer}>
            <Text style={styles.coordinatesLabel}>Coordinates:</Text>
            <Text style={styles.coordinatesText}>
              {region.latitude.toFixed(6)}, {region.longitude.toFixed(6)}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={openInExternalMaps}>
              <Ionicons name="navigate" size={20} color="#4285f4" />
              <Text style={styles.actionButtonText}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowAccuracyCircle(!showAccuracyCircle)}
            >
              <MaterialIcons
                name={showAccuracyCircle ? "visibility" : "visibility-off"}
                size={20}
                color="#4285f4"
              />
              <Text style={styles.actionButtonText}>Accuracy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Map Type Indicator */}
      <View style={styles.mapTypeIndicator}>
        <Text style={styles.mapTypeText}>
          {mapType.charAt(0).toUpperCase() + mapType.slice(1)}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 1,
  },
  mapLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4285f4',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4285f4',
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    gap: 12,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  coordinatesContainer: {
    marginBottom: 12,
  },
  coordinatesLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  coordinatesText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'monospace',
    fontWeight: '600',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4285f4',
    fontWeight: '500',
    marginLeft: 6,
  },
  mapTypeIndicator: {
    position: 'absolute',
    top: 80,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default MapScreen;