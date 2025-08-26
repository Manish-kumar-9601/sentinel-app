import   {useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// --- Configuration ---
const FAKE_CALLER_NAME_KEY = 'fake_caller_name';
const FAKE_CALLER_NUMBER_KEY = 'fake_caller_number';
const FAKE_CALL_RINGTONE_KEY = 'fake_call_ringtone_uri';
const DEFAULT_CALLER_NAME = 'Nevil Modi BMP Clg';
const DEFAULT_CALLER_NUMBER = '+91 81606 17183';

const FakeIncomingCallScreen = () => {
  const router = useRouter();
  const [callerName, setCallerName] = useState(DEFAULT_CALLER_NAME);
  const [callerNumber, setCallerNumber] = useState(DEFAULT_CALLER_NUMBER);
  const [ringtoneSource, setRingtoneSource] = useState(null);
  
  // Create audio player instance
  const player = useAudioPlayer();

  // --- Animation Value ---
  const translateY = useSharedValue(0);

  // --- Load settings and prepare ringtone ---
  useEffect(() => {
    let isMounted = true;
    
    const loadSettings = async () => {
      try {
        // Load caller settings
        const storedName = await AsyncStorage.getItem(FAKE_CALLER_NAME_KEY);
        if (isMounted && storedName) setCallerName(storedName);

        const storedNumber = await AsyncStorage.getItem(FAKE_CALLER_NUMBER_KEY);
        if (isMounted && storedNumber) setCallerNumber(storedNumber);
        
        // Load ringtone
        let ringtoneUri = require('../assets/ringtone.mp3');
        const customRingtoneUri = await AsyncStorage.getItem(FAKE_CALL_RINGTONE_KEY);
        
        if (customRingtoneUri) {
          const fileInfo = await FileSystem.getInfoAsync(customRingtoneUri);
          if (fileInfo?.exists) {
            ringtoneUri = customRingtoneUri;
          }
        }

        if (isMounted) {
          setRingtoneSource(ringtoneUri);
        }
      } catch (error) {
        console.error("Failed to load settings", error);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- Start ringing when ringtone is loaded ---
  useEffect(() => {
    if (!ringtoneSource) return;

    const startRinging = async () => {
      try {
        // Start vibration
        Vibration.vibrate([500, 1000, 500], true);

        // Load and play ringtone
        if (typeof ringtoneSource === 'string') {
          // Custom ringtone from file system
          player.replace(ringtoneSource);
        } else {
          // Default ringtone from assets
          player.replace(ringtoneSource);
        }
        
        // Set to loop and play
        player.loop = true;
        player.play();

      } catch (error) {
        console.error("Failed to start ringing", error);
      }
    };

    startRinging();

    // Start bouncing animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1, // Infinite loop
      true // Reverse animation
    );

    // Cleanup function
    return () => {
      player.pause();
      Vibration.cancel();
    };
  }, [ringtoneSource]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      player.pause();
      Vibration.cancel();
    };
  }, []);

  const onDecline = () => {
    player.pause();
    Vibration.cancel();
    router.push('/');
  };

  const onAccept = () => {
    player.pause();
    Vibration.cancel();
    router.push('/fakeCall');
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.callerInfoContainer}>
          <View style={styles.callerHeader}>
            <View>
              <Text style={styles.callerName}>{callerName}</Text>
              <Text style={styles.callerNumber}>{callerNumber}</Text>
              <Text style={styles.callerLocation}>India</Text>
            </View>
            <Image 
              source={{ uri: 'https://placehold.co/60x60/FF4500/FFFFFF?text=S' }} // Placeholder image
              style={styles.avatar} 
            />
          </View>
          <Text style={styles.callStatus}>Incoming call</Text>
        </View>

        <View style={styles.controlsContainer}>
          <View style={styles.callActions}>
            <TouchableOpacity onPress={onDecline}>
              <Animated.View style={[styles.callButton, styles.declineButton, animatedStyle]}>
                <Ionicons name="call" size={35} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity onPress={onAccept}>
              <Animated.View style={[styles.callButton, styles.acceptButton, animatedStyle]}>
                <Ionicons name="call" size={35} color="white" />
              </Animated.View>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.smsButton}>
            <Text style={styles.smsButtonText}>SMS reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000ff',
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 40,
  },
  callerInfoContainer: { 
    paddingHorizontal: 30,
  },
  callerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  callerName: { 
    fontSize: 38, 
    color: 'white', 
    fontWeight: '400',
    marginBottom: 8,
  },
  callerNumber: { 
    fontSize: 22, 
    color: '#ffffffff', 
    marginBottom: 4,
  },
  callerLocation: {
    fontSize: 18,
    color: '#A9A9A9',
  },
  callStatus: { 
    fontSize: 18, 
    color: '#ffffffff', 
    marginTop: 35,
    textAlign: 'left',
  },
  controlsContainer: { 
    alignItems: 'center' 
  },
  smsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    marginBottom: 0,
  },
  smsButtonText: { 
    color: 'white', 
    fontSize: 16 
  },
  callActions: { 
    flexDirection: 'row', 
    width: '80%', 
    justifyContent: 'space-between' 
  },
  callButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
      backgroundColor: '#FF3B30', // Red for decline
  },
  acceptButton: {
      backgroundColor: '#34C759', // Green for accept
  }
});

export default FakeIncomingCallScreen;