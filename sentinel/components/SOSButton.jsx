import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { sendSosAlert } from '../services/sosService'; // We will create this next

const SOSButton = () => {
  const handlePress = async () => {
    // 1. Get user's permission for location
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Permission to access location was denied');
      return;
    }

    // 2. Get current location
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // 3. Send the alert to the backend
      await sendSosAlert({ latitude, longitude });
      Alert.alert('SOS Sent', 'Your emergency contacts have been notified.');
    
    } catch (error) {
      console.error("Error sending SOS:", error);
      Alert.alert('Error', 'Could not send SOS alert. Please try again.');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.text}>SOS</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  text: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
});

export default SOSButton;