import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Button,
  Platform,
  Animated,
  SafeAreaView,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const AudioRecorderScreen = () => {
  const router = useRouter();
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissions, setPermissions] = useState({ audio: false, media: false });
  const intervalRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // --- Request Permissions ---
  useEffect(() => {
    const getPermissions = async () => {
      const audioPerms = await Audio.requestPermissionsAsync();
      const mediaPerms = await MediaLibrary.requestPermissionsAsync();
      setPermissions({
        audio: audioPerms.granted,
        media: mediaPerms.granted,
      });
    };
    getPermissions();
  }, []);

  // --- Timer & Animation Logic ---
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      clearInterval(intervalRef.current);
      setRecordingDuration(0);
      pulseAnim.setValue(1);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRecording]);

  // --- Audio Recording Functions ---
  const startRecording = async () => {
    try {
      if (!permissions.audio || !permissions.media) {
        Alert.alert('Permissions Required', 'Microphone and Media Library access are needed.');
        return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
         Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);

    if (uri) {
        try {
            // --- THIS IS THE FIX ---
            // Create an asset in the media library from the recording file.
            const asset = await MediaLibrary.createAssetAsync(uri);
            Alert.alert(
                'Audio Saved',
                `Your audio evidence has been saved to your media library.`
            );
        } catch (error) {
            console.error("Error saving to media library", error);
            Alert.alert("Error", "Could not save the audio.");
        }
    }
    setRecording(null);
  };

  const handleRecording = () => {
    if (isRecording) {
      Alert.alert(
        'Stop Recording', 'Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Stop', onPress: stopRecording, style: 'destructive' },
        ]
      );
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (!permissions.audio || !permissions.media) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <MaterialCommunityIcons name="microphone-off" size={80} color="#666" />
        <Text style={styles.permissionMessage}>
          We need access to your microphone and media library to record audio evidence.
        </Text>
        <Button
          onPress={async () => {
            const audioPerms = await Audio.requestPermissionsAsync();
            const mediaPerms = await MediaLibrary.requestPermissionsAsync();
            setPermissions({ audio: audioPerms.granted, media: mediaPerms.granted });
          }}
          title="Grant Permissions"
        />
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.controlsContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Audio Recorder</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.visualContainer}>
          {!isRecording ? (
            <View style={styles.microphoneContainer}>
              <MaterialCommunityIcons name="microphone" size={120} color="#666" />
              <Text style={styles.readyText}>Ready to Record</Text>
            </View>
          ) : (
            <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
          )}
        </View>

        <View style={styles.recordButtonContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordingButton]}
              onPress={handleRecording}
            >
              {isRecording ? (
                <Ionicons name="stop" size={40} color="white" />
              ) : (
                <MaterialCommunityIcons name="microphone" size={40} color="white" />
              )}
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.recordButtonText}>
            {isRecording ? 'Tap to Stop' : 'Tap to Record'}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlsContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  permissionMessage: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 16,
    color: 'white',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 48,
  },
  visualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  microphoneContainer: {
    alignItems: 'center',
  },
  readyText: {
    color: '#666',
    fontSize: 18,
    marginTop: 20,
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  recordButtonContainer: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  recordingButton: {
    backgroundColor: '#FF4500',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
});

export default AudioRecorderScreen;
