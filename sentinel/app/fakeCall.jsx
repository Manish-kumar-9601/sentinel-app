import   {useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import Entypo from '@expo/vector-icons/Entypo';
// --- Configuration ---
const FAKE_CALLER_NAME_KEY = 'fake_caller_name';
const FAKE_CALL_RINGTONE_KEY = 'fake_call_ringtone_uri';
const DEFAULT_CALLER_NAME = 'Work'; // A generic fallback name

// --- Reusable UI Component for the control buttons ---
const ControlButton = ({ icon, label, onPress, iconComponent: Icon = MaterialCommunityIcons }) => (
  <TouchableOpacity style={styles.control} onPress={onPress}>
    <View style={styles.controlIconCircle}>
      <Icon name={icon} size={32} color="white" />
    </View>
  {label &&   <Text style={styles.controlLabel}>{label}</Text>}
  </TouchableOpacity>
);
const FAKE_CALLER_NUMBER_KEY = 'fake_caller_number';
const FakeCallScreen = () =>
{
 
  const router = useRouter();
  const sound = useRef(new Audio.Sound());
  const [callerName, setCallerName] = useState(DEFAULT_CALLER_NAME);
  const [callerNumber, setCallerNumber] = useState('+91 9601727836'); // Example number

  // Load settings and start the call simulation
  useEffect(() =>
  {
    let isMounted = true;
    const startCall = async () =>
    {
      try
      {
        // --- Load Caller Name ---
        const storedName = await AsyncStorage.getItem(FAKE_CALLER_NAME_KEY);
        if (isMounted && storedName) setCallerName(storedName);
          const storedNumber = await AsyncStorage.getItem(FAKE_CALLER_NUMBER_KEY);
        if (isMounted && storedName) setCallerNumber(storedNumber);

        // --- Load and Play Ringtone ---
        let ringtoneSource;
        const customRingtoneUri = await AsyncStorage.getItem(FAKE_CALL_RINGTONE_KEY);
        const fileInfo = customRingtoneUri ? await FileSystem.getInfoAsync(customRingtoneUri) : null;

        if (customRingtoneUri && fileInfo && fileInfo.exists)
        {
          ringtoneSource = { uri: customRingtoneUri };
        } else
        {
          ringtoneSource = require('../assets/ringtone.mp3');
        }

        Vibration.vibrate([500, 1000, 500], true);
        const { sound: playbackObject } = await Audio.Sound.createAsync(
          ringtoneSource,
          { shouldPlay: true, isLooping: true }
        );
        if (isMounted) sound.current = playbackObject;

      } catch (error)
      {
        console.error("Failed to start call simulation", error);
      }
    };

    startCall();

    return () =>
    {
      isMounted = false;
      sound.current.unloadAsync();
      Vibration.cancel();
    };
  }, []);

  const handleEndCall = () =>
  {
    router.back();
  };

  const handleDummyAction = () =>
  {
    // This function does nothing, as per the UI design
    console.log("Control button pressed");
  };

  return (
    <View style={styles.container}>
      {/* --- Caller Info --- */}
      <View style={styles.callerInfoContainer}>
        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callerNumber}>{callerNumber}</Text>
        <Text style={styles.callerLocation}>India</Text>
        <Text style={styles.callStatus}>Waiting for response...</Text>
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
         <ControlButton icon="volume-high"  iconComponent={Ionicons} onPress={handleDummyAction} />
        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <MaterialCommunityIcons name="phone-hangup" size={32} color="white" />
        </TouchableOpacity>
    <TouchableOpacity style={styles.control}  >
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
    alignItems: 'start',
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
    justifyContent: 'start',
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
   marginLeft:5,
   marginRight:5,
    backgroundColor: '#ff4e45ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FakeCallScreen;
