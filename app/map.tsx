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

// Enhanced OpenStreetMap queries with multiple tag variations
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Enhanced landmark categories with multiple OSM tag variations
const LANDMARK_CATEGORIES = {
  hospital: {
    icon: 'local-hospital',
    color: '#FF6B6B',
    iconSet: 'MaterialIcons',
    osmTags: [
      'amenity=hospital',
      'amenity=clinic',
      'healthcare=hospital',
      'healthcare=clinic',
      'building=hospital'
    ],
    displayName: 'Hospitals & Clinics'
  },
  police: {
    icon: 'local-police',
    color: '#4A90E2',
    iconSet: 'MaterialIcons',
    osmTags: [
      'amenity=police',
      'office=police',
      'building=police_station'
    ],
    displayName: 'Police Stations'
  },
  fire_station: {
    icon: 'fire-truck',
    color: '#FF8C00',
    iconSet: 'MaterialIcons',
    osmTags: [
      'amenity=fire_station',
      'emergency=fire_station',
      'building=fire_station',
      'office=fire_department'
    ],
    displayName: 'Fire Stations'
  },
  fuel: {
    icon: 'local-gas-station',
    color: '#32CD32',
    iconSet: 'MaterialIcons',
    osmTags: [
      'amenity=fuel',
      'shop=gas_station',
      'shop=fuel'
    ],
    displayName: 'Gas Stations'
  },
  pharmacy: {
    icon: 'local-pharmacy',
    color: '#9370DB',
    iconSet: 'MaterialIcons',
    osmTags: [
      'amenity=pharmacy',
      'shop=pharmacy',
      'healthcare=pharmacy'
    ],
    displayName: 'Pharmacies'
  },
  atm: {
    icon: 'local-atm',
    color: '#20B2AA',
    iconSet: 'MaterialIcons',
    osmTags: [
      'amenity=atm',
      'amenity=bank',
      'shop=bank'
    ],
    displayName: 'ATMs & Banks'
  },
  restaurant: {
    icon: 'restaurant',
    color: '#FFD700',
    iconSet: 'MaterialIcons',
    osmTags: [
      'amenity=restaurant',
      'amenity=fast_food',
      'amenity=cafe',
      'shop=food'
    ],
    displayName: 'Restaurants & Food'
  },
  school: {
    icon: 'school',
    color: '#8A2BE2',
    iconSet: 'MaterialIcons',
    osmTags: [
      'amenity=school',
      'amenity=university',
      'amenity=college',
      'building=school'
    ],
    displayName: 'Schools & Education'
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

  // Enhanced fetch function with multiple tag queries and better error handling
  const fetchNearbyPlaces = async (category) => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please allow location access to find nearby places.');
      return;
    }

    setIsLoadingPlaces(true);
    try {
      const categoryConfig = LANDMARK_CATEGORIES[category];
      const radiusInMeters = searchRadius;

      // Build multiple queries for different tag variations
      const queryParts = categoryConfig.osmTags.map(tag => {
        return `
          node["${tag}"](around:${radiusInMeters},${currentLocation.latitude},${currentLocation.longitude});
          way["${tag}"](around:${radiusInMeters},${currentLocation.latitude},${currentLocation.longitude});
          relation["${tag}"](around:${radiusInMeters},${currentLocation.latitude},${currentLocation.longitude});
        `;
      }).join('');

      // Enhanced Overpass QL query with better timeout and multiple tag support
      const overpassQuery = `
        [out:json][timeout:45];
        (
          ${queryParts}
        );
        out center meta tags;
      `;

      console.log('Enhanced query for category:', category);
      console.log('Tags being searched:', categoryConfig.osmTags);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      // Try primary Overpass API first
      let response;
      try {
        response = await fetch(OVERPASS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: controller.signal,
        });
      } catch (error) {
        // Try backup Overpass API if primary fails
        console.log('Primary API failed, trying backup...');
        response = await fetch('https://overpass.openstreetmap.org/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Enhanced API response elements:', data.elements?.length || 0);

      if (!data.elements || data.elements.length === 0) {
        setNearbyPlaces([]);
        setSelectedCategory(category);
        
        // Show more detailed "no results" message with suggestions
        Alert.alert(
          'No Results Found', 
          `No ${categoryConfig.displayName.toLowerCase()} found within ${searchRadius / 1000}km.\n\n` +
          `This could be because:\n` +
          `• The area may not be fully mapped in OpenStreetMap\n` +
          `• Try increasing the search radius\n` +
          `• The facilities might be tagged differently\n\n` +
          `Would you like to try a larger search area?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Search 5km', 
              onPress: () => {
                setSearchRadius(5000);
                setTimeout(() => fetchNearbyPlaces(category), 500);
              }
            }
          ]
        );
        return;
      }

      // Enhanced place processing with better data extraction
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

          // Better name extraction
          let name = element.tags?.name || 
                    element.tags?.brand || 
                    element.tags?.operator || 
                    element.tags?.['name:en'] ||
                    categoryConfig.displayName.slice(0, -1); // Remove 's' from end

          // Add type information to name if available
          if (element.tags?.amenity && !name.toLowerCase().includes(element.tags.amenity)) {
            name += ` (${element.tags.amenity})`;
          }

          // Enhanced address extraction
          let address = 'Address not available';
          if (element.tags) {
            const addressParts = [];
            if (element.tags['addr:housenumber']) addressParts.push(element.tags['addr:housenumber']);
            if (element.tags['addr:street']) addressParts.push(element.tags['addr:street']);
            if (element.tags['addr:city']) addressParts.push(element.tags['addr:city']);
            
            if (addressParts.length > 0) {
              address = addressParts.join(' ');
            } else if (element.tags['addr:full']) {
              address = element.tags['addr:full'];
            }
          }

          return {
            id: `${element.id}_${index}`,
            name: name,
            coordinate: { latitude: lat, longitude: lon },
            category: category,
            distance: distance.toFixed(1),
            address: address,
            phone: element.tags?.phone || element.tags?.['contact:phone'] || 'Phone not available',
            website: element.tags?.website || element.tags?.['contact:website'],
            openingHours: element.tags?.opening_hours || element.tags?.['service_times'] || 'Hours not available',
            osmType: element.type,
            osmId: element.id,
            matchedTag: categoryConfig.osmTags.find(tag => {
              const [key, value] = tag.split('=');
              return element.tags?.[key] === value;
            }) || 'unknown'
          };
        })
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
        .slice(0, 25); // Increase limit to 25

      console.log('Enhanced processed places:', places.length);
      console.log('Sample place data:', places[0]);
      
      setNearbyPlaces(places);
      setSelectedCategory(category);

      if (places.length === 0) {
        Alert.alert('No Results', `No ${categoryConfig.displayName.toLowerCase()} found within ${searchRadius / 1000}km radius.`);
      } else {
        // Show success with more details
        Alert.alert(
          'Found Results!', 
          `Found ${places.length} ${categoryConfig.displayName.toLowerCase()} within ${searchRadius / 1000}km.\n\n` +
          `Closest: ${places[0].name} (${places[0].distance}km away)`
        );
      }

    } catch (error) {
      console.error('Enhanced error fetching nearby places:', error);
      if (error.name === 'AbortError') {
        Alert.alert('Timeout', 'Search timed out. The server might be busy. Please try again.');
      } else {
        Alert.alert(
          'Search Error', 
          `Failed to fetch nearby places.\n\n` +
          `Error: ${error.message}\n\n` +
          `This might be due to:\n` +
          `• Network connectivity issues\n` +
          `• Overpass API server being busy\n` +
          `• Location data not available\n\n` +
          `Please check your internet connection and try again.`
        );
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
        { text: '20 km', onPress: () => setSearchRadius(20000) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Enhanced marker rendering with better info
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
              <Text style={styles.calloutDistance}>📍 {place.distance} km away</Text>
              {place.phone !== 'Phone not available' && (
                <Text style={styles.calloutPhone}>📞 {place.phone}</Text>
              )}
              {place.website && (
                <Text style={styles.calloutWebsite}>🌐 Website available</Text>
              )}
            </View>
            {place.openingHours !== 'Hours not available' && (
              <Text style={styles.calloutHours}>🕒 {place.openingHours}</Text>
            )}
            <Text style={styles.calloutDebug}>
              OSM: {place.osmType} #{place.osmId} | Tag: {place.matchedTag}
            </Text>
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
        <Text style={styles.loadingText}>Loading enhanced map...</Text>
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
          title: 'Enhanced Emergency Map',
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

        {/* Enhanced debug info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Enhanced Mode | Ready: {mapReady ? '✓' : '✗'} | 
            Location: {currentLocation ? '✓' : '✗'} | 
            Places: {nearbyPlaces.length} |
            Radius: {searchRadius/1000}km |
            Region: {displayRegion ? '✓' : '✗'}
          </Text>
          {selectedCategory && (
            <Text style={styles.debugText}>
              Searching: {LANDMARK_CATEGORIES[selectedCategory]?.osmTags.length} tag variations
            </Text>
          )}
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

        {/* Enhanced category buttons */}
        <View style={styles.categoryContainer}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>Find Nearby Emergency Services:</Text>
            <Text style={styles.categorySubtitle}>Enhanced OpenStreetMap Detection</Text>
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

        {/* Enhanced loading overlay */}
        {isLoadingPlaces && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#FF4500" />
              <Text style={styles.loadingPlacesText}>
                Enhanced search: {selectedCategory ? LANDMARK_CATEGORIES[selectedCategory].displayName.toLowerCase() : 'places'}...
                {'\n'}Using multiple data sources
              </Text>
            </View>
          </View>
        )}

        {/* Enhanced places count badge */}
        {nearbyPlaces.length > 0 && (
          <View style={styles.placesCountBadge}>
            <Text style={styles.placesCountText}>
              {nearbyPlaces.length} {LANDMARK_CATEGORIES[selectedCategory]?.displayName.toLowerCase()} found
            </Text>
            <Text style={styles.placesCountSubtext}>
              Closest: {nearbyPlaces[0]?.distance}km away
            </Text>
          </View>
        )}

        {/* Enhanced API notice */}
        <View style={styles.freeApiNotice}>
          <Text style={styles.freeApiText}>🔍 Enhanced Detection Mode</Text>
        </View>
      </View>
    </>
  );
};

// Enhanced styles
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
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
  },
  debugContainer: {
    position: 'absolute',
    top: 80,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
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
    top: 140,
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