import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  Circle,
  Callout
} from 'react-native-maps';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// Free OpenStreetMap + Overpass API for nearby places
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Landmark categories with OpenStreetMap tags
const LANDMARK_CATEGORIES = {
  hospital: {
    icon: 'local-hospital',
    color: '#FF6B6B',
    iconSet: 'MaterialIcons',
    osmTag: 'amenity=hospital',
    displayName: 'Hospitals'
  },
  police: {
    icon: 'local-police',
    color: '#4A90E2',
    iconSet: 'MaterialIcons',
    osmTag: 'amenity=police',
    displayName: 'Police Stations'
  },
  fire_station: {
    icon: 'fire-truck',
    color: '#FF8C00',
    iconSet: 'MaterialIcons',
    osmTag: 'amenity=fire_station',
    displayName: 'Fire Stations'
  },
  fuel: {
    icon: 'local-gas-station',
    color: '#32CD32',
    iconSet: 'MaterialIcons',
    osmTag: 'amenity=fuel',
    displayName: 'Gas Stations'
  },
  pharmacy: {
    icon: 'local-pharmacy',
    color: '#9370DB',
    iconSet: 'MaterialIcons',
    osmTag: 'amenity=pharmacy',
    displayName: 'Pharmacies'
  },
  atm: {
    icon: 'local-atm',
    color: '#20B2AA',
    iconSet: 'MaterialIcons',
    osmTag: 'amenity=atm',
    displayName: 'ATMs'
  },
  restaurant: {
    icon: 'restaurant',
    color: '#FFD700',
    iconSet: 'MaterialIcons',
    osmTag: 'amenity=restaurant',
    displayName: 'Restaurants'
  },
  school: {
    icon: 'school',
    color: '#8A2BE2',
    iconSet: 'MaterialIcons',
    osmTag: 'amenity=school',
    displayName: 'Schools'
  }
};

// Calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
};

const MapScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const mapRef = useRef(null);

  // Debug params
  console.log('Map params received:', params);

  // States
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const [showUserLocation, setShowUserLocation] = useState(true);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [searchRadius, setSearchRadius] = useState(2000); // 2km default
  const [mapReady, setMapReady] = useState(false);
  const [region, setRegion] = useState(null);

  // Convert params to numbers - handle both string and number formats
  const lat = params.latitude ? parseFloat(params.latitude) : null;
  const lon = params.longitude ? parseFloat(params.longitude) : null;

  console.log('Parsed coordinates:', { lat, lon });

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    // Set initial region when we have coordinates
    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
      const newRegion = {
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      setCurrentLocation({ latitude: lat, longitude: lon });
      console.log('Set region from params:', newRegion);
    }
  }, [lat, lon]);

  const initializeMap = async () => {
    try {
      setIsLoading(true);

      if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
        // We have valid coordinates from params
        console.log('Using coordinates from params:', { lat, lon });
        const coords = { latitude: lat, longitude: lon };
        setCurrentLocation(coords);
        setIsLoading(false);
      } else {
        // No valid coordinates, get current location
        console.log('No valid params, getting current location');
        await getCurrentLocation();
      }
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to initialize map: ' + error.message);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show your position on the map.');
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      const newRegion = {
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      console.log('Got current location:', coords);
      setCurrentLocation(coords);
      setRegion(newRegion);

    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get your current location: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onMapReady = () => {
    console.log('Map is ready');
    setMapReady(true);
  };

  const onRegionChangeComplete = (newRegion) => {
    console.log('Region changed:', newRegion);
    setRegion(newRegion);
  };

  // Fetch nearby places using FREE Overpass API (OpenStreetMap)
  const fetchNearbyPlaces = async (category) => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please allow location access to find nearby places.');
      return;
    }

    setIsLoadingPlaces(true);
    try {
      const categoryConfig = LANDMARK_CATEGORIES[category];
      const radiusInMeters = searchRadius;

      // Build Overpass QL query with error handling
      const overpassQuery = `
        [out:json][timeout:30];
        (
          node["${categoryConfig.osmTag}"](around:${radiusInMeters},${currentLocation.latitude},${currentLocation.longitude});
          way["${categoryConfig.osmTag}"](around:${radiusInMeters},${currentLocation.latitude},${currentLocation.longitude});
          relation["${categoryConfig.osmTag}"](around:${radiusInMeters},${currentLocation.latitude},${currentLocation.longitude});
        );
        out center meta;
      `;

      console.log('Fetching places for category:', category);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(OVERPASS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Overpass API response elements:', data.elements?.length || 0);

      if (!data.elements || data.elements.length === 0) {
        setNearbyPlaces([]);
        setSelectedCategory(category);
        Alert.alert('No Results', `No ${categoryConfig.displayName.toLowerCase()} found within ${searchRadius / 1000}km radius.`);
        return;
      }

      const places = data.elements
        .filter(element => {
          const lat = element.lat || element.center?.lat;
          const lon = element.lon || element.center?.lon;
          return lat && lon && lat !== 0 && lon !== 0;
        })
        .map((element, index) => {
          const lat = element.lat || element.center?.lat;
          const lon = element.lon || element.center?.lon;
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            lat,
            lon
          );

          return {
            id: `${element.id}_${index}`,
            name: element.tags?.name || element.tags?.brand || `${categoryConfig.displayName}`,
            coordinate: { latitude: lat, longitude: lon },
            category: category,
            distance: distance.toFixed(1),
            address: element.tags?.['addr:street']
              ? `${element.tags['addr:housenumber'] || ''} ${element.tags['addr:street']}`.trim()
              : 'Address not available',
            phone: element.tags?.phone || 'Phone not available',
            website: element.tags?.website,
            openingHours: element.tags?.opening_hours || 'Hours not available',
          };
        })
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
        .slice(0, 20);

      console.log('Processed places:', places.length);
      setNearbyPlaces(places);
      setSelectedCategory(category);

      if (places.length === 0) {
        Alert.alert('No Results', `No ${categoryConfig.displayName.toLowerCase()} found within ${searchRadius / 1000}km radius.`);
      } else {
        Alert.alert('Success', `Found ${places.length} ${categoryConfig.displayName.toLowerCase()}`);
      }

    } catch (error) {
      console.error('Error fetching nearby places:', error);
      if (error.name === 'AbortError') {
        Alert.alert('Timeout', 'Search timed out. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to fetch nearby places. Please check your internet connection and try again.');
      }
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  const centerOnUserLocation = () => {
    if (currentLocation && mapRef.current && mapReady) {
      const newRegion = {
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
      setRegion(newRegion);
    }
  };

  const toggleMapType = () => {
    const types = ['standard', 'satellite', 'hybrid', 'terrain'];
    const currentIndex = types.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % types.length;
    setMapType(types[nextIndex]);
  };

  const clearMarkers = () => {
    setNearbyPlaces([]);
    setSelectedCategory(null);
  };

  const changeSearchRadius = () => {
    Alert.alert(
      'Search Radius',
      'Select search radius:',
      [
        { text: '1 km', onPress: () => setSearchRadius(1000) },
        { text: '2 km', onPress: () => setSearchRadius(2000) },
        { text: '5 km', onPress: () => setSearchRadius(5000) },
        { text: '10 km', onPress: () => setSearchRadius(10000) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderCustomMarker = (place) => {
    const categoryConfig = LANDMARK_CATEGORIES[place.category];
    const IconComponent = MaterialIcons;

    return (
      <Marker
        key={place.id}
        coordinate={place.coordinate}
        onPress={() => {
          console.log('Marker pressed:', place.name);
        }}
      >
        <View style={[styles.customMarker, { backgroundColor: categoryConfig.color }]}>
          <IconComponent
            name={categoryConfig.icon}
            size={20}
            color="white"
          />
        </View>
        <Callout style={styles.callout}>
          <View style={styles.calloutContent}>
            <Text style={styles.calloutTitle}>{place.name}</Text>
            <Text style={styles.calloutSubtitle}>{place.address}</Text>
            <View style={styles.calloutDetails}>
              <Text style={styles.calloutDistance}>📍 {place.distance} km</Text>
              {place.phone !== 'Phone not available' && (
                <Text style={styles.calloutPhone}>📞 {place.phone}</Text>
              )}
            </View>
            {place.openingHours !== 'Hours not available' && (
              <Text style={styles.calloutHours}>🕒 {place.openingHours}</Text>
            )}
          </View>
        </Callout>
      </Marker>
    );
  };

  // Show loading screen
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF4500" />
        <Text style={styles.loadingText}>Loading map...</Text>
        <Text style={styles.debugText}>
          Coordinates: {lat && lon ? `${lat}, ${lon}` : 'Getting location...'}
        </Text>
      </View>
    );
  }

  // Show error if no location available
  if (!currentLocation && !region) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Unable to determine location</Text>
        <Text style={styles.debugText}>
          Please check location permissions and GPS settings
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeMap}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayRegion = region || (currentLocation ? {
    ...currentLocation,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : null);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Emergency Map',
          headerShown: true,
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
        }}
      />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.container}>
        {displayRegion && (
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            region={displayRegion}
            mapType={mapType}
            showsUserLocation={showUserLocation}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            showsBuildings={true}
            showsTraffic={false}
            onMapReady={onMapReady}
            onRegionChangeComplete={onRegionChangeComplete}
            loadingEnabled={true}
            loadingIndicatorColor="#FF4500"
            onError={(error) => {
              console.error('MapView error:', error);
            }}
            // Force re-render with key
            key={`${displayRegion.latitude}_${displayRegion.longitude}`}
          >
            {/* User location marker */}
            {currentLocation && (
              <>
                <Marker
                  coordinate={currentLocation}
                  title="Your Current Location"
                  description="You are here"
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.userLocationMarker}>
                    <View style={styles.userLocationInner} />
                  </View>
                </Marker>

                {/* Search radius circle */}
                {selectedCategory && (
                  <Circle
                    center={currentLocation}
                    radius={searchRadius}
                    strokeColor="rgba(255, 69, 0, 0.5)"
                    fillColor="rgba(255, 69, 0, 0.1)"
                    strokeWidth={2}
                  />
                )}
              </>
            )}

            {/* Nearby places markers */}
            {nearbyPlaces.map(renderCustomMarker)}
          </MapView>
        )}

        {/* Debug info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Ready: {mapReady ? '✓' : '✗'} | 
            Location: {currentLocation ? '✓' : '✗'} | 
            Places: {nearbyPlaces.length} |
            Region: {displayRegion ? '✓' : '✗'}
          </Text>
        </View>

        {/* Floating controls */}
        <View style={styles.controlsContainer}>
          {/* Search radius */}
          <TouchableOpacity style={styles.controlButton} onPress={changeSearchRadius}>
            <MaterialIcons name="zoom-out-map" size={24} color="#333" />
            <Text style={styles.radiusText}>{searchRadius / 1000}km</Text>
          </TouchableOpacity>

          {/* Map type toggle */}
          <TouchableOpacity style={styles.controlButton} onPress={toggleMapType}>
            <MaterialIcons name="layers" size={24} color="#333" />
          </TouchableOpacity>

          {/* Center on user location */}
          <TouchableOpacity 
            style={[styles.controlButton, !currentLocation && styles.disabledButton]} 
            onPress={centerOnUserLocation}
            disabled={!currentLocation}
          >
            <MaterialIcons name="my-location" size={24} color={currentLocation ? "#FF4500" : "#ccc"} />
          </TouchableOpacity>

          {/* Clear markers */}
          {nearbyPlaces.length > 0 && (
            <TouchableOpacity style={styles.controlButton} onPress={clearMarkers}>
              <MaterialIcons name="clear" size={24} color="#333" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category buttons */}
        <View style={styles.categoryContainer}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>Find Nearby Emergency Services:</Text>
            <Text style={styles.categorySubtitle}>Powered by OpenStreetMap (Free)</Text>
          </View>
          <View style={styles.categoryGrid}>
            {Object.entries(LANDMARK_CATEGORIES).map(([key, config]) => {
              const IconComponent = MaterialIcons;
              const isSelected = selectedCategory === key;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: config.color },
                    isSelected && styles.selectedCategoryButton,
                    (!currentLocation || isLoadingPlaces) && styles.disabledButton
                  ]}
                  onPress={() => fetchNearbyPlaces(key)}
                  disabled={isLoadingPlaces || !currentLocation}
                >
                  <IconComponent name={config.icon} size={18} color="white" />
                  {isSelected && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Loading overlay for places */}
        {isLoadingPlaces && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#FF4500" />
              <Text style={styles.loadingPlacesText}>
                Searching {selectedCategory ? LANDMARK_CATEGORIES[selectedCategory].displayName.toLowerCase() : 'places'}...
              </Text>
            </View>
          </View>
        )}

        {/* Places count badge */}
        {nearbyPlaces.length > 0 && (
          <View style={styles.placesCountBadge}>
            <Text style={styles.placesCountText}>
              {nearbyPlaces.length} {LANDMARK_CATEGORIES[selectedCategory]?.displayName.toLowerCase()} found
            </Text>
          </View>
        )}

        {/* Free API notice */}
        <View style={styles.freeApiNotice}>
          <Text style={styles.freeApiText}>🆓 Using free OpenStreetMap data</Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  debugText: {
    fontSize: 11,
    color: 'white',
    textAlign: 'center',
  },
  debugContainer: {
    position: 'absolute',
    top: 80,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 5,
  },
  retryButton: {
    backgroundColor: '#FF4500',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsContainer: {
    position: 'absolute',
    top: 120,
    right: 15,
    flexDirection: 'column',
  },
  controlButton: {
    backgroundColor: 'white',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    opacity: 0.5,
  },
  radiusText: {
    fontSize: 8,
    color: '#333',
    marginTop: -2,
  },
  categoryContainer: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  categoryHeader: {
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categorySubtitle: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    position: 'relative',
  },
  selectedCategoryButton: {
    transform: [{ scale: 1.1 }],
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4500',
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  callout: {
    width: 250,
  },
  calloutContent: {
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  calloutDetails: {
    marginBottom: 4,
  },
  calloutDistance: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  calloutPhone: {
    fontSize: 12,
    color: '#4A90E2',
    marginBottom: 2,
  },
  calloutHours: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  loadingCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingPlacesText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  placesCountBadge: {
    position: 'absolute',
    top: 120,
    left: 15,
    backgroundColor: '#FF4500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  placesCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  freeApiNotice: {
    position: 'absolute',
    top: 80,
    left: 15,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeApiText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
export default MapScreen;