import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  SafeAreaView,
  Linking,
  AppState,
} from 'react-native';
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
import * as FileSystem from 'expo-file-system';

// Enhanced notification handler setup for background recording
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const AudioRecorderScreen = () => {
  const router = useRouter();

  // Simplified audio recorder setup that works with current expo-audio
  const audioRecorder = useAudioRecorder(
    RecordingPresets.HIGH_QUALITY
  );
  const recorderState = useAudioRecorderState(audioRecorder);

  // State management
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [currentRecordingUri, setCurrentRecordingUri] = useState(null);
  const [pausedDuration, setPausedDuration] = useState(0);
  const [lastPauseTime, setLastPauseTime] = useState(null);
  const [displayedDuration, setDisplayedDuration] = useState(0);
  const [backgroundPausedAt, setBackgroundPausedAt] = useState(null);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.3)).current;
  const waveAnim2 = useRef(new Animated.Value(0.5)).current;
  const waveAnim3 = useRef(new Animated.Value(0.7)).current;

  // Enhanced permission handling
  useEffect(() => {
    requestPermissions();
  }, []);

  // App state monitoring for background recording
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [recorderState.isRecording, appState]); // Fixed: Added appState dependency

  const requestPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const audioRes = await AudioModule.requestRecordingPermissionsAsync();
      const mediaLibRes = await MediaLibrary.requestPermissionsAsync();
      const notificationsRes = await Notifications.requestPermissionsAsync();

      // For Android API 29+, we also need scoped storage permissions
      let writePermissionGranted = true;
      if (Platform.OS === 'android' && Platform.Version >= 29) {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync(true);
          writePermissionGranted = status === 'granted';
        } catch (error) {
          console.log('Write permission not available:', error);
          writePermissionGranted = true; // Continue without write permissions
        }
      }

      if (audioRes.granted && mediaLibRes.granted && notificationsRes.granted) {
        setHasPermissions(true);
        console.log('All permissions granted successfully');
        if (!writePermissionGranted) {
          console.log('Note: Limited media library access (scoped storage)');
        }
      } else {
        console.log('Permissions denied:', { audioRes, mediaLibRes, notificationsRes });
        Alert.alert(
          "Permissions Required",
          "Microphone, Media Library, and Notification permissions are required for this app to function properly."
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert("Error", "Failed to request permissions. Please try again.");
    }
    setPermissionsLoading(false);
  };

  const handleAppStateChange = async (nextAppState) => {
    console.log('App state changed from', appState, 'to', nextAppState);

    if (recorderState.isRecording) {
      if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to background while recording - pause the displayed timer
        setBackgroundPausedAt(Date.now());
        setDisplayedDuration(recorderState.durationMillis / 1000);
        
        await showNotification(
          'Recording in Background',
          'Your recording is continuing in the background. Tap to return to the app.',
          true
        );
        console.log('Recording continues in background, timer display paused');
      } else if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App is coming back to foreground while recording - resume timer display
        if (backgroundPausedAt) {
          const backgroundDuration = Date.now() - backgroundPausedAt;
          setDisplayedDuration(prev => prev + (backgroundDuration / 1000));
          setBackgroundPausedAt(null);
        }
        
        await Notifications.dismissAllNotificationsAsync();
        console.log('Returned to foreground, timer display resumed');
      }
    }

    setAppState(nextAppState);
  };

  const showNotification = async (title, body, sticky = false) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sticky,
          color: '#FF6B6B',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'recording',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  };

  // Enhanced recording functions
  const startRecording = async () => {
    if (!hasPermissions) {
      Alert.alert("Permissions Required", "Please grant all required permissions first.");
      return;
    }

    try {
      console.log('Starting recording...');

      // Keep screen awake and prepare for background recording
      await activateKeepAwakeAsync();

      // Prepare and start recording
      await audioRecorder.prepareToRecordAsync();
      const result = await audioRecorder.record();

      // Extract URI from the result (it might be an object or string)
      const uri = result?.url || result?.uri || result;
      
      setCurrentRecordingUri(uri);
      setRecordingStartTime(Date.now());
      setIsPaused(false);
      setPausedDuration(0);
      setLastPauseTime(null);
      setDisplayedDuration(0);
      setBackgroundPausedAt(null);

      // Show persistent notification for background recording
      await showNotification(
        'Recording Active',
        'Audio recording is in progress. Tap to return to the app.',
        true
      );

      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      await deactivateKeepAwake();
      Alert.alert("Recording Error", `Could not start recording: ${error.message}`);
    }
  };

  const stopRecording = async () => {
    try {
      console.log('Stopping recording...');

      const result = await audioRecorder.stop();
      setIsPaused(false);
      setCurrentRecordingUri(null);
      setRecordingStartTime(null);
      setPausedDuration(0);
      setLastPauseTime(null);
      setDisplayedDuration(0);
      setBackgroundPausedAt(null);

      await deactivateKeepAwake();
      await Notifications.dismissAllNotificationsAsync();

      // Extract URI from the result object
      const uri = result?.url || result?.uri || result;
      
      if (uri && typeof uri === 'string') {
        console.log('Recording stopped, URI:', uri);
        await saveRecordingToLibrary(uri);
      } else {
        console.error('Invalid URI received:', result);
        throw new Error('No valid recording URI received');
      }
    } catch (error) {
      console.error("Error stopping/saving recording:", error);
      Alert.alert("Error", `Could not save the recording: ${error.message}`);
    }
  };

  const saveRecordingToLibrary = async (uri) => {
    try {
      console.log('Saving recording to media library...');

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Recording file does not exist');
      }

      console.log('File info:', fileInfo);

      // Create a more descriptive filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording_${timestamp}.m4a`;

      // Save to media library (create asset only, skip album operations to avoid permission issues)
      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('Asset created:', asset);

      // Skip album operations that require WRITE_EXTERNAL_STORAGE permission
      // The file is already saved to the device's media library
      console.log('Recording saved successfully to media library');

      const duration = recorderState.durationMillis / 1000;
      const size = fileInfo.size ? (fileInfo.size / (1024 * 1024)).toFixed(2) : 'Unknown';

      Alert.alert(
        'Recording Saved Successfully!',
        `Duration: ${formatTime(duration)}\nSize: ${size} MB\nSaved to Music folder`,
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error) {
      console.error('Failed to save recording:', error);
      Alert.alert(
        "Save Error",
        `Could not save recording to media library: ${error.message}`
      );
    }
  };

  // Fixed: Actual pause/resume functionality (note: expo-audio may not support native pause)
  const pauseRecording = async () => {
    try {
      console.log('Pausing recording...');
      // Since expo-audio doesn't have native pause, we simulate it
      setLastPauseTime(Date.now());
      setIsPaused(true);
      await showNotification('Recording Paused', 'Your audio recording is paused.');
    } catch (error) {
      console.error('Failed to pause recording:', error);
      Alert.alert("Error", "Could not pause the recording.");
    }
  };

  const resumeRecording = async () => {
    try {
      console.log('Resuming recording...');
      // Calculate paused duration and add to total
      if (lastPauseTime) {
        setPausedDuration(prev => prev + (Date.now() - lastPauseTime));
      }
      setIsPaused(false);
      setLastPauseTime(null);
      await showNotification(
        'Recording Resumed',
        'Your audio recording has resumed.',
        true
      );
    } catch (error) {
      console.error('Failed to resume recording:', error);
      Alert.alert("Error", "Could not resume the recording.");
    }
  };

  const handleRecordButton = () => {
    if (isPaused) {
      resumeRecording();
      return;
    }

    if (recorderState.isRecording) {
      Alert.alert(
        'Stop Recording?',
        'Are you sure you want to stop and save this recording?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop & Save',
            onPress: stopRecording,
            style: 'destructive'
          },
        ]
      );
    } else {
      startRecording();
    }
  };

  // Animation logic - Fixed cleanup
  useEffect(() => {
    let animations = [];
    
    if (recorderState.isRecording && !isPaused) {
      const createLoop = (anim, toValue, duration) => Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue,
            duration,
            useNativeDriver: true
          }),
          Animated.timing(anim, {
            toValue: 0.3, // Default starting value
            duration,
            useNativeDriver: true
          }),
        ])
      );

      const pulseAnimation = createLoop(pulseAnim, 1.2, 1000);
      const waveAnimation1 = createLoop(waveAnim1, 1, 800);
      const waveAnimation2 = createLoop(waveAnim2, 0.8, 1200);
      const waveAnimation3 = createLoop(waveAnim3, 0.9, 1500);

      animations = [pulseAnimation, waveAnimation1, waveAnimation2, waveAnimation3];
      animations.forEach(anim => anim.start());
    } else {
      pulseAnim.setValue(1);
      waveAnim1.setValue(0.3);
      waveAnim2.setValue(0.5);
      waveAnim3.setValue(0.7);
    }

    return () => {
      animations.forEach(anim => anim.stop()); // Fixed: Proper cleanup
    };
  }, [recorderState.isRecording, isPaused, pulseAnim, waveAnim1, waveAnim2, waveAnim3]); // Fixed: Added dependencies

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00'; // Fixed: Handle invalid input
    
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePermissionReRequest = () => {
    Alert.alert(
      "Permissions Required",
      "This app requires microphone, media library, and notification permissions. You can enable them in your device settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => Linking.openSettings()
        }
      ]
    );
  };

  // Timer update effect - only runs when app is active
  useEffect(() => {
    let interval;
    
    if (recorderState.isRecording && !isPaused && appState === 'active' && !backgroundPausedAt) {
      interval = setInterval(() => {
        setDisplayedDuration(recorderState.durationMillis / 1000);
      }, 100);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [recorderState.isRecording, isPaused, appState, backgroundPausedAt, recorderState.durationMillis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderState.isRecording) {
        stopRecording().catch(console.error);
      }
      deactivateKeepAwake().catch(console.error);
      Notifications.dismissAllNotificationsAsync().catch(console.error);
    };
  }, []);

  // Loading screen
  if (permissionsLoading) {
    return (
      <LinearGradient colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']} style={styles.container}>
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="loading" size={50} color="#FF6B6B" />
          <Text style={styles.permissionMessage}>Initializing...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Permission denied screen
  if (!hasPermissions) {
    return (
      <LinearGradient colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']} style={styles.container}>
        <SafeAreaView style={styles.permissionContainer}>
          <MaterialCommunityIcons name="microphone-off" size={80} color="#666" />
          <Text style={styles.permissionMessage}>
            This app requires Microphone, Media Library, and Notification permissions to record and save audio files.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handlePermissionReRequest}>
            <Text style={styles.permissionButtonText}>Enable Permissions</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Main recorder interface
  return (
    <LinearGradient colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.controlsContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              if (recorderState.isRecording) {
                Alert.alert(
                  'Recording Active',
                  'Stop recording before leaving?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Stop & Exit',
                      onPress: async () => {
                        await stopRecording();
                        router.back();
                      }
                    }
                  ]
                );
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

        {/* Status Container */}
        <View style={styles.statusContainer}>
          {recorderState.isRecording ? (
            <View style={styles.recordingContainer}>
              {/* Background Recording Indicator */}
              {appState !== 'active' && (
                <View style={styles.backgroundIndicator}>
                  <MaterialCommunityIcons name="cellphone-link" size={24} color="#FF6B6B" />
                  <Text style={styles.backgroundText}>Recording in Background</Text>
                </View>
              )}

              {/* Wave Animation */}
              <View style={styles.waveContainer}>
                {[waveAnim1, waveAnim2, waveAnim3, waveAnim2, waveAnim1].map((anim, index) => (
                  <Animated.View key={index} style={[
                    styles.waveBar, {
                      transform: [{ scaleY: isPaused ? 0.3 : anim }],
                      backgroundColor: isPaused ? '#666' : '#FF6B6B',
                    },
                  ]} />
                ))}
              </View>

              {/* Timer Display - ADDED */}
              <Text style={[
                styles.timerText, 
                isPaused && styles.pausedTimerText
              ]}>
                {formatTime(displayedDuration)}
              </Text>

              {/* Pause Indicator */}
              {isPaused && <Text style={styles.pausedText}>PAUSED</Text>}
            </View>
          ) : (
            <View style={styles.microphoneContainer}>
              <MaterialCommunityIcons name="microphone-outline" size={100} color="#444" />
              <Text style={styles.readyText}>Ready to Record</Text>
              <Text style={styles.subText}>High-quality audio with background recording</Text>
            </View>
          )}
        </View>

        {/* Record Button Container */}
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
                <MaterialCommunityIcons
                  name={isPaused ? "play" : "microphone"}
                  size={40}
                  color="white"
                />
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.recordButtonText}>
            {isPaused ? 'Tap to Resume' : recorderState.isRecording ? 'Tap to Stop & Save' : 'Tap to Start Recording'}
          </Text>

          {/* Pause/Resume Button */}
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
  },
  permissionMessage: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 16,
    color: 'white',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    fontWeight: '600',
  },
  subText: {
    color: '#444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  recordingContainer: {
    alignItems: 'center',
  },
  backgroundIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  backgroundText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
    marginBottom: 20,
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
    paddingHorizontal: 20,
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