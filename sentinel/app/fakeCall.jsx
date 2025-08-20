import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Configuration ---
const FAKE_CALLER_NAME_KEY = 'fake_caller_name';
const FAKE_CALLER_NUMBER_KEY = 'fake_caller_number';
const DEFAULT_CALLER_NAME = 'Work';
const DEFAULT_CALLER_NUMBER = '+91 9601727836';

// --- Reusable UI Component for the control buttons ---
const ControlButton = ({ icon, label, onPress, iconComponent: Icon = MaterialCommunityIcons }) => (
  <TouchableOpacity style={styles.control} onPress={onPress}>
    <View style={styles.controlIconCircle}>
      <Icon name={icon} size={32} color="white" />
    </View>
    {label && <Text style={styles.controlLabel}>{label}</Text>}
  </TouchableOpacity>
);

const FakeCallScreen = () => {
  const router = useRouter();
  const [callerName, setCallerName] = useState(DEFAULT_CALLER_NAME);
  const [callerNumber, setCallerNumber] = useState(DEFAULT_CALLER_NUMBER);
  const [callDuration, setCallDuration] = useState(0);

  // --- Load Caller Info ---
  useEffect(() => {
    const loadCallerInfo = async () => {
      try {
        const storedName = await AsyncStorage.getItem(FAKE_CALLER_NAME_KEY);
        if (storedName) setCallerName(storedName);

        const storedNumber = await AsyncStorage.getItem(FAKE_CALLER_NUMBER_KEY);
        if (storedNumber) setCallerNumber(storedNumber);
      } catch (error) {
        console.error("Failed to load caller info", error);
      }
    };
    loadCallerInfo();
  }, []);

  // --- Start Call Timer ---
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCallDuration(prevDuration => prevDuration + 1);
    }, 1000);

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(timerInterval);
  }, []);

  const handleEndCall = () => {
    router.back();
  };

  const handleDummyAction = () => {
    console.log("Control button pressed");
  };

  // --- Helper function to format the timer ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <View style={styles.container}>
      {/* --- Caller Info --- */}
      <View style={styles.callerInfoContainer}>
        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callerNumber}>{callerNumber}</Text>
        <Text style={styles.callerLocation}>India</Text>
        {/* --- Call Timer --- */}
        <Text style={styles.callStatus}>{formatTime(callDuration)}</Text>
      </View>

      {/* --- Control Grid --- */}
      <View style={styles.controlsGrid}>
        <ControlButton icon="record-circle-outline" label="Record" onPress={handleDummyAction} />
        <ControlButton icon="pause" label="Hold" onPress={handleDummyAction} />
        <ControlButton icon="plus" label="Add call" onPress={handleDummyAction} />
        <ControlButton icon="microphone-off" label="Mute" onPress={handleDummyAction} />
        <ControlButton icon="video-outline" label="Video call" onPress={handleDummyAction} />
      </View>

      {/* --- Main Action Buttons --- */}
      <View style={styles.mainActionsContainer}>
        <ControlButton icon="volume-high" iconComponent={Ionicons} onPress={handleDummyAction} />
        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <MaterialCommunityIcons name="phone-hangup" size={32} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.control}>
          <View style={styles.controlIconCircle}>
            <Entypo name="dial-pad" size={32} color="white" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303ff',
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 60,
  },
  callerInfoContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  callerName: {
    fontSize: 38,
    color: 'white',
    fontWeight: '400',
  },
  callerNumber: {
    fontSize: 20,
    color: '#ffffffff',
    marginTop: 8,
  },
  callerLocation: {
    fontSize: 16,
    color: '#b5b5b5ff',
    marginTop: 8,
  },
  callStatus: {
    fontSize: 18,
    color: '#ffffffff',
    marginTop: 32,
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 30,
    marginTop: 40,
  },
  control: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 30,
  },
  controlIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlLabel: {
    color: 'white',
    fontSize: 14,
    marginTop: 10,
  },
  mainActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 30,
    marginLeft: 5,
    marginRight: 5,
    backgroundColor: '#ff4e45ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FakeCallScreen;
