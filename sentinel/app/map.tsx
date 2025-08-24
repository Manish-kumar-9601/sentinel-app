import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, Stack } from 'expo-router';

const MapScreen = () => {
  // Get the location passed from the HomeScreen
  const { latitude, longitude } = useLocalSearchParams();

  // Convert params to numbers
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return (
      <View style={styles.centered}>
        <Text>Invalid location data.</Text>
      </View>
    );
  }

  const initialRegion = {
    latitude: lat,
    longitude: lon,
    latitudeDelta: 0.01, // Controls the zoom level
    longitudeDelta: 0.01,
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Current Location', headerShown: true }} />
      <View style={styles.container}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
        >
          <Marker
            coordinate={{ latitude: lat, longitude: lon }}
            title="Your Location"
            pinColor="red"
          />
        </MapView>
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
  },
});

export default MapScreen;
