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
  Linking,
} from 'react-native';
// ✅ Using the latest expo-audio library with its hook-based API
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  useAudioRecorderState,
} from 'expo-audio';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// Notification handler setup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const AudioRecorderScreen = () => {
  const router = useRouter();

  // ✅ 1. Set up the new audio recorder hooks from expo-audio
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  // State for permissions and UI
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  // ✅ 2. Manually track the paused state, as recorderState does not provide it
  const [isPaused, setIsPaused] = useState(false);

  // Animation refs are unchanged
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.3)).current;
  const waveAnim2 = useRef(new Animated.Value(0.5)).current;
  const waveAnim3 = useRef(new Animated.Value(0.7)).current;

  // Permission handling logic
  useEffect(() => {
    (async () => {
      setPermissionsLoading(true);
      const audioRes = await AudioModule.requestRecordingPermissionsAsync();
      const mediaLibRes = await MediaLibrary.requestPermissionsAsync();
      const notificationsRes = await Notifications.requestPermissionsAsync();
      if (audioRes.granted && mediaLibRes.granted && notificationsRes.granted) {
        setHasPermissions(true);
      } else {
        Alert.alert("Permissions Required", "All permissions are required to use this feature.");
      }
      setPermissionsLoading(false);
    })();
  }, []);

  const showNotification = async (title, body, sticky = false) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sticky, color: '#FF6B6B' },
      trigger: null,
    });
  };

  // ✅ 3. Recording logic updated for the new hook-based API
  const startRecording = async () => {
    if (!hasPermissions) {
        Alert.alert("Permissions Required", "Please grant all required permissions first.");
        return;
    };
    try {
      await activateKeepAwakeAsync();
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsPaused(false); // Ensure pause state is reset
      await showNotification('Recording Active', 'Sentinel is recording audio.', true);
    } catch (err) {
      await deactivateKeepAwake();
      console.error('Failed to start recording', err);
      Alert.alert("Error", "Could not start recording.");
    }
  };

  const stopRecording = async () => {
    try {
      const uri = await audioRecorder.stop();
      setIsPaused(false);
      await deactivateKeepAwake();
      await Notifications.dismissAllNotificationsAsync();
      if (uri) {
        await MediaLibrary.createAssetAsync(uri);
        Alert.alert('Audio Saved', `Recording saved.\nDuration: ${formatTime(recorderState.durationMillis / 1000)}`);
      }
    } catch (error) {
      console.error("Error stopping/saving recording: ", error);
      Alert.alert("Error", "Could not save the recording.");
    }
  };
  
  const pauseRecording = async () => {
    try {
      await audioRecorder.pause();
      setIsPaused(true);
      showNotification('Recording Paused', 'Your recording is paused.');
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  const resumeRecording = async () => {
    try {
      await audioRecorder.resume();
      setIsPaused(false);
      showNotification('Recording Resumed', 'Your recording has resumed.');
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  };

  const handleRecordButton = () => {
    if (isPaused) {
      resumeRecording();
      return;
    }
    if (recorderState.isRecording) {
      Alert.alert('Stop Recording?', 'Are you sure you want to stop and save?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop & Save', onPress: stopRecording, style: 'destructive' },
      ]);
    } else {
      startRecording();
    }
  };

  // Animation logic now driven by the correct state properties
  useEffect(() => {
    if (recorderState.isRecording && !isPaused) {
      const createLoop = (anim, toValue, duration) => Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: anim._startingValue || 0.3, duration, useNativeDriver: true }),
        ])
      );
      const pulseAnimation = createLoop(pulseAnim, 1.2, 1000);
      const waveAnimation1 = createLoop(waveAnim1, 1, 800);
      const waveAnimation2 = createLoop(waveAnim2, 0.8, 1200);
      const waveAnimation3 = createLoop(waveAnim3, 0.9, 1500);
      const animations = [pulseAnimation, waveAnimation1, waveAnimation2, waveAnimation3];
      animations.forEach(anim => anim.start());
      return () => animations.forEach(anim => anim.stop());
    } else {
      pulseAnim.setValue(1);
      waveAnim1.setValue(0.3);
      waveAnim2.setValue(0.5);
      waveAnim3.setValue(0.7);
    }
  }, [recorderState.isRecording, isPaused]);

  const formatTime = (seconds) => {
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
const handlePermissionReRequest = () => {
    Alert.alert(
      "Permissions Required",
      "You have previously denied the required permissions. To use this feature, you must enable them in your device's settings.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Open Settings",
          // This will open the app's specific settings screen
          onPress: () => Linking.openSettings()
        }
      ]
    );
  };
  if (permissionsLoading) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionMessage}>Loading...</Text>
      </View>
    );
  }

  if (!hasPermissions) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <MaterialCommunityIcons name="microphone-off" size={80} color="#666" />
        <Text style={styles.permissionMessage}>
          This app requires Microphone, Media Library, and Notification permissions to function correctly.
        </Text>
        <Button title="Grant Permissions" onPress={handlePermissionReRequest} />
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.controlsContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              if (recorderState.isRecording) {
                Alert.alert('Recording Active', 'Stop recording before leaving?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Stop & Exit', onPress: async () => { await stopRecording(); router.back(); } }
                ]);
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Audio Recorder</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.statusContainer}>
          {recorderState.isRecording ? (
            <View style={styles.recordingContainer}>
              <View style={styles.waveContainer}>
                {[waveAnim1, waveAnim2, waveAnim3, waveAnim2, waveAnim1].map((anim, index) => (
                  <Animated.View key={index} style={[
                    styles.waveBar, {
                      transform: [{ scaleY: isPaused ? (anim._startingValue || 0.3) : anim }],
                      backgroundColor: isPaused ? '#666' : '#FF6B6B',
                    },
                  ]} />
                ))}
              </View>
              <Text style={[styles.timerText, isPaused && styles.pausedTimerText]}>
                {formatTime(recorderState.durationMillis / 1000)}
              </Text>
              {isPaused && <Text style={styles.pausedText}>PAUSED</Text>}
            </View>
          ) : (
            <View style={styles.microphoneContainer}>
              <MaterialCommunityIcons name="microphone-outline" size={100} color="#444" />
              <Text style={styles.readyText}>Ready to Record</Text>
            </View>
          )}
        </View>
        <View style={styles.recordButtonContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                recorderState.isRecording && !isPaused && styles.recordingButton,
                isPaused && styles.pausedButton,
              ]}
              onPress={handleRecordButton}
            >
              {recorderState.isRecording && !isPaused ? (
                <Ionicons name="stop" size={40} color="white" />
              ) : (
                <MaterialCommunityIcons name="microphone" size={40} color="white" />
              )}
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.recordButtonText}>
            {isPaused ? 'Tap to Resume' : recorderState.isRecording ? 'Tap to Stop' : 'Tap to Record'}
          </Text>
          {recorderState.isRecording && (
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={isPaused ? resumeRecording : pauseRecording}
            >
              <Ionicons name={isPaused ? "play" : "pause"} size={24} color="white" />
              <Text style={styles.pauseButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
          )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
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
  statusContainer: {
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
  recordingContainer: {
    alignItems: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
    gap: 8,
    marginBottom: 40,
  },
  waveBar: {
    width: 12,
    height: 60,
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  pausedTimerText: {
    color: '#999',
  },
  pausedText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
    fontWeight: 'bold',
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
  pausedButton: {
    backgroundColor: '#666',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
  },
  pauseButtonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default AudioRecorderScreen;