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
  AppState,
  AppStateStatus,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Background task name
const BACKGROUND_AUDIO_TASK = 'background-audio-recording';

// Register background task
TaskManager.defineTask(BACKGROUND_AUDIO_TASK, () => {
  try {
    console.log('Background audio recording task running...');
    return BackgroundTask.BackgroundTaskResult.NewData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

interface AudioRecorderScreenProps {}

const AudioRecorderScreen: React.FC<AudioRecorderScreenProps> = () => {
  const router = useRouter();
  
  // Recording setup
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Permissions state
  const [audioPermission, setAudioPermission] = useState<boolean>(false);
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  // State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [isInBackground, setIsInBackground] = useState<boolean>(false);
  const [backgroundTaskId, setBackgroundTaskId] = useState<string | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState<boolean>(true);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.3)).current;
  const waveAnim2 = useRef(new Animated.Value(0.5)).current;
  const waveAnim3 = useRef(new Animated.Value(0.7)).current;
  const appState = useRef<AppStateStatus>(AppState.currentState);
  
  // FIXED: Use refs to track recording time accurately
  const recordingStartTime = useRef<number>(0);
  const lastKnownDuration = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Recording options
  const recordingOptions = {
    android: {
      extension: '.m4a',
      outputFormat: Audio.AndroidOutputFormat.MPEG_4,
      audioEncoder: Audio.AndroidAudioEncoder.AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
      audioQuality: Audio.IOSAudioQuality.HIGH,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm;codecs=opus',
      bitsPerSecond: 128000,
    },
  };

  // --- Request Audio Permissions ---
  const requestAudioPermission = async (): Promise<boolean> => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      const granted = permission.status === 'granted';
      setAudioPermission(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request audio permission:', error);
      setAudioPermission(false);
      return false;
    }
  };

  // --- Check Audio Permissions ---
  const checkAudioPermission = async (): Promise<boolean> => {
    try {
      const permission = await Audio.getPermissionsAsync();
      const granted = permission.status === 'granted';
      setAudioPermission(granted);
      return granted;
    } catch (error) {
      console.error('Failed to check audio permission:', error);
      setAudioPermission(false);
      return false;
    }
  };

  // --- Request Permissions ---
  useEffect(() => {
    const setupPermissions = async () => {
      try {
        setPermissionsLoading(true);
        
        // Check audio permission first
        const hasAudioPermission = await checkAudioPermission();
        
        // Request media library permission
        if (!mediaLibraryPermission?.granted) {
          await requestMediaLibraryPermission();
        }
        
        // Request notification permissions
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Notification permission not granted');
        }
        
        // Set audio recording mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        
      } catch (error) {
        console.error('Failed to setup permissions:', error);
      } finally {
        setPermissionsLoading(false);
      }
    };
    setupPermissions();
  }, []);

  // NEW: Continuous timer that works in background using requestAnimationFrame fallback
  const updateTimer = () => {
    if (recordingStartTime.current > 0) {
      const currentTime = Date.now();
      const elapsed = Math.floor((currentTime - recordingStartTime.current) / 1000);
      
      // Only update state if duration actually changed to avoid unnecessary renders
      if (elapsed !== lastKnownDuration.current) {
        lastKnownDuration.current = elapsed;
        setRecordingDuration(elapsed);
        
        // Save to storage periodically
        if (elapsed % 5 === 0) {
          AsyncStorage.setItem('audioRecordingDuration', elapsed.toString());
          AsyncStorage.setItem('audioRecordingStartTime', recordingStartTime.current.toString());
        }
      }
    }
    
    // Continue updating if still recording
    if (recordingStartTime.current > 0) {
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }
  };

  // Start the continuous timer
  const startTimer = () => {
    recordingStartTime.current = Date.now();
    lastKnownDuration.current = 0;
    
    // Use both setInterval (for when app is active) and requestAnimationFrame (fallback)
    intervalRef.current = setInterval(() => {
      if (recordingStartTime.current > 0) {
        const elapsed = Math.floor((Date.now() - recordingStartTime.current) / 1000);
        if (elapsed !== lastKnownDuration.current) {
          lastKnownDuration.current = elapsed;
          setRecordingDuration(elapsed);
        }
      }
    }, 1000);
    
    // Also start animation frame based timer as backup
    updateTimer();
  };

  // Stop the timer
  const stopTimer = () => {
    recordingStartTime.current = 0;
    lastKnownDuration.current = 0;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setRecordingDuration(0);
  };

  // --- App State Management for Background Recording ---
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('App state change:', appState.current, '->', nextAppState);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (isRecording && recordingStartTime.current > 0) {
          console.log('App came to foreground during recording');
          setIsInBackground(false);
          
          // Immediately update the duration from timestamp
          const currentTime = Date.now();
          const elapsed = Math.floor((currentTime - recordingStartTime.current) / 1000);
          console.log('Calculated elapsed time on foreground:', elapsed);
          
          lastKnownDuration.current = elapsed;
          setRecordingDuration(elapsed);
          
          await stopBackgroundTask();
          showNotification('Recording Active', `Recording resumed (${Math.floor(elapsed/60)}:${(elapsed%60).toString().padStart(2,'0')})`);
        }
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App went to background
        if (isRecording && recordingStartTime.current > 0) {
          console.log('App went to background during recording');
          setIsInBackground(true);
          
          // Save current accurate time before going to background
          const currentTime = Date.now();
          const elapsed = Math.floor((currentTime - recordingStartTime.current) / 1000);
          
          await AsyncStorage.multiSet([
            ['audioRecordingDuration', elapsed.toString()],
            ['audioRecordingStartTime', recordingStartTime.current.toString()],
            ['isRecordingInBackground', 'true'],
            ['backgroundTransitionTime', currentTime.toString()]
          ]);
          
          await startBackgroundTask();
          showNotification('Recording in Background', `Recording continues (${Math.floor(elapsed/60)}:${(elapsed%60).toString().padStart(2,'0')})`);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isRecording]);

  // --- Background Task Management ---
  const startBackgroundTask = async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        const taskId = await BackgroundTask.startBackgroundTaskAsync();
        setBackgroundTaskId(taskId);
        console.log('Background task started with ID:', taskId);
        
        // Auto-finish task after 25 seconds (iOS limit is ~30 seconds)
        setTimeout(async () => {
          if (taskId) {
            console.log('Auto-finishing background task');
            await BackgroundTask.finishBackgroundTaskAsync(taskId);
          }
        }, 25000);
      }
    } catch (error) {
      console.error('Failed to start background task:', error);
    }
  };

  const stopBackgroundTask = async (): Promise<void> => {
    try {
      if (backgroundTaskId && Platform.OS === 'ios') {
        console.log('Stopping background task:', backgroundTaskId);
        await BackgroundTask.finishBackgroundTaskAsync(backgroundTaskId);
        setBackgroundTaskId(null);
      }
    } catch (error) {
      console.error('Failed to stop background task:', error);
    }
  };

  // --- Notification Helper ---
  const showNotification = async (title: string, body: string): Promise<void> => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
      },
      trigger: null,
    });
  };

  // --- Animation Management ---
  useEffect(() => {
    if (isRecording && !isInBackground) {
      // Start animations only when recording and in foreground
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { 
            toValue: 1.2, 
            duration: 1000, 
            useNativeDriver: true 
          }),
          Animated.timing(pulseAnim, { 
            toValue: 1, 
            duration: 1000, 
            useNativeDriver: true 
          }),
        ])
      );

      const waveAnimation1 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, { 
            toValue: 1, 
            duration: 800, 
            useNativeDriver: true 
          }),
          Animated.timing(waveAnim1, { 
            toValue: 0.3, 
            duration: 800, 
            useNativeDriver: true 
          }),
        ])
      );

      const waveAnimation2 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim2, { 
            toValue: 0.8, 
            duration: 1200, 
            useNativeDriver: true 
          }),
          Animated.timing(waveAnim2, { 
            toValue: 0.5, 
            duration: 1200, 
            useNativeDriver: true 
          }),
        ])
      );

      const waveAnimation3 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim3, { 
            toValue: 0.9, 
            duration: 1500, 
            useNativeDriver: true 
          }),
          Animated.timing(waveAnim3, { 
            toValue: 0.7, 
            duration: 1500, 
            useNativeDriver: true 
          }),
        ])
      );

      pulseAnimation.start();
      waveAnimation1.start();
      waveAnimation2.start();
      waveAnimation3.start();

      return () => {
        pulseAnimation.stop();
        waveAnimation1.stop();
        waveAnimation2.stop();
        waveAnimation3.stop();
      };
    } else {
      // Reset animations when not recording or in background
      pulseAnim.setValue(1);
      waveAnim1.setValue(0.3);
      waveAnim2.setValue(0.5);
      waveAnim3.setValue(0.7);
    }
  }, [isRecording, isInBackground]);

  // --- Restore recording state on mount ---
  useEffect(() => {
    const restoreRecordingState = async () => {
      try {
        const [savedDuration, savedStartTime, wasRecordingInBackground, backgroundTransition] = await Promise.all([
          AsyncStorage.getItem('audioRecordingDuration'),
          AsyncStorage.getItem('audioRecordingStartTime'),
          AsyncStorage.getItem('isRecordingInBackground'),
          AsyncStorage.getItem('backgroundTransitionTime')
        ]);
        
        if (savedStartTime && wasRecordingInBackground === 'true') {
          // App was closed/backgrounded while recording
          const startTime = parseInt(savedStartTime);
          const currentTime = Date.now();
          const actualElapsed = Math.floor((currentTime - startTime) / 1000);
          
          recordingStartTime.current = startTime;
          lastKnownDuration.current = actualElapsed;
          setRecordingDuration(actualElapsed);
          
          console.log('Restored recording state. Elapsed time:', actualElapsed);
          
          // Show notification about restored session
          showNotification(
            'Recording Session Restored', 
            `Previous recording: ${Math.floor(actualElapsed / 60)}:${(actualElapsed % 60).toString().padStart(2, '0')}`
          );
        }
      } catch (error) {
        console.error('Failed to restore recording state:', error);
      }
    };
    restoreRecordingState();
  }, []);

  // --- Audio Recording Functions ---
  const startRecording = async (): Promise<void> => {
    try {
      if (!audioPermission || !mediaLibraryPermission?.granted) {
        Alert.alert('Permissions Required', 'Microphone and Media Library access are needed.');
        return;
      }

      if (isRecording || recording) {
        console.log('Recording already in progress');
        return;
      }

      console.log('Starting recording...');
      
      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(newRecording);
      setIsRecording(true);
      
      // Start the timer
      startTimer();
      
      // Save initial state
      await AsyncStorage.multiSet([
        ['audioRecordingStartTime', recordingStartTime.current.toString()],
        ['audioRecordingDuration', '0'],
        ['isRecordingInBackground', 'false']
      ]);
      
      await showNotification(
        'Audio Recording Started',
        'Audio recording has begun. You can minimize the app.'
      );
      
      console.log('Recording started successfully at:', recordingStartTime.current);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Could not start recording: ' + error);
      setIsRecording(false);
      setRecording(null);
      stopTimer();
    }
  };

  const stopRecording = async (): Promise<void> => {
    try {
      console.log('Stopping recording... isRecording state:', isRecording);
      
      if (!isRecording || !recording) {
        console.log('No active recording to stop');
        return;
      }
      
      // Get final duration before stopping timer
      const finalDuration = recordingStartTime.current > 0 
        ? Math.floor((Date.now() - recordingStartTime.current) / 1000)
        : lastKnownDuration.current;
      
      console.log('Final recording duration:', finalDuration);
      
      // Stop timer first
      stopTimer();
      
      await stopBackgroundTask();
      setIsInBackground(false);
      
      await showNotification('Saving Audio', 'Your recording is being saved...');
      
      console.log('Stopping recording...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      console.log('Recording stopped. URI:', uri);
      
      // Clear the recording state immediately after stopping
      setIsRecording(false);
      setRecording(null);

      if (uri && typeof uri === 'string' && uri.length > 0) {
        try {
          console.log('Attempting to save audio file at:', uri);
          const asset = await MediaLibrary.createAssetAsync(uri);
          console.log('Asset created successfully:', asset);
          
          const totalMinutes = Math.floor(finalDuration / 60);
          const totalSeconds = finalDuration % 60;
          
          Alert.alert(
            'Audio Saved',
            `Your audio evidence has been saved to your media library.\nDuration: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`
          );
          
          await showNotification(
            'Audio Saved Successfully',
            `Recording duration: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`
          );
        } catch (saveError) {
          console.error('Error saving to media library:', saveError);
          Alert.alert('Save Error', 'Could not save the audio to media library. The recording was completed but not saved.');
        }
      } else {
        console.error('No valid URI returned from recording. URI:', uri);
        Alert.alert('Error', 'Recording completed but no valid audio file was produced. Please try again.');
      }
    } catch (error) {
      console.error('Error in stopRecording function:', error);
      if (!error.toString().includes('already been unloaded')) {
        Alert.alert('Error', 'Could not stop recording: ' + error);
      }
      setIsRecording(false);
      setRecording(null);
      stopTimer();
    } finally {
      // Clean up AsyncStorage
      AsyncStorage.multiRemove([
        'audioRecordingDuration', 
        'audioRecordingStartTime', 
        'isRecordingInBackground',
        'backgroundTransitionTime'
      ]);
    }
  };

  const handleRecording = (): void => {
    if (isRecording) {
      Alert.alert(
        'Stop Recording',
        'Are you sure you want to stop the audio recording?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Stop', onPress: stopRecording, style: 'destructive' },
        ]
      );
    } else {
      startRecording();
    }
  };

  // --- Cleanup ---
  useEffect(() => {
    return () => {
      stopTimer();
      if (recording) {
        recording.stopAndUnloadAsync().catch((error) => {
          if (!error.toString().includes('already been unloaded')) {
            console.error('Cleanup error:', error);
          }
        });
      }
      if (backgroundTaskId) {
        stopBackgroundTask();
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (permissionsLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionMessage}>Loading permissions...</Text>
      </View>
    );
  }

  if (!audioPermission || !mediaLibraryPermission?.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <MaterialCommunityIcons name="microphone-off" size={80} color="#666" />
        <Text style={styles.permissionMessage}>
          We need access to your microphone and media library to record audio evidence.
          Background recording also requires notification permissions.
        </Text>
        <Button
          onPress={async () => {
            await requestAudioPermission();
            await requestMediaLibraryPermission();
          }}
          title="Grant Permissions"
        />
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']} style={styles.container}>
      <SafeAreaView style={styles.controlsContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => {
              if (isRecording) {
                Alert.alert(
                  'Recording Active',
                  'Stop recording before leaving?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Stop & Exit', onPress: () => {
                      stopRecording();
                      setTimeout(() => router.back(), 1000);
                    }}
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

        {/* Status Display */}
        <View style={styles.statusContainer}>
          {isRecording && (
            <View style={styles.recordingStatus}>
              <View style={[styles.statusDot, isInBackground && styles.backgroundStatusDot]} />
              <Text style={styles.statusText}>
                {isInBackground ? 'Recording in Background' : 'Recording'}
              </Text>
            </View>
          )}
        </View>

        {/* Visual Container */}
        <View style={styles.visualContainer}>
          {!isRecording ? (
            <View style={styles.microphoneContainer}>
              <MaterialCommunityIcons name="microphone" size={120} color="#666" />
              <Text style={styles.readyText}>Ready to Record</Text>
            </View>
          ) : (
            <View style={styles.recordingContainer}>
              <View style={styles.waveContainer}>
                <Animated.View style={[
                  styles.waveBar, 
                  { 
                    transform: [{ scaleY: waveAnim1 }],
                    backgroundColor: isInBackground ? '#FFA500' : '#FF6B6B' 
                  }
                ]} />
                <Animated.View style={[
                  styles.waveBar, 
                  { 
                    transform: [{ scaleY: waveAnim2 }],
                    backgroundColor: isInBackground ? '#FFA500' : '#FF6B6B' 
                  }
                ]} />
                <Animated.View style={[
                  styles.waveBar, 
                  { 
                    transform: [{ scaleY: waveAnim3 }],
                    backgroundColor: isInBackground ? '#FFA500' : '#FF6B6B' 
                  }
                ]} />
                <Animated.View style={[
                  styles.waveBar, 
                  { 
                    transform: [{ scaleY: waveAnim2 }],
                    backgroundColor: isInBackground ? '#FFA500' : '#FF6B6B' 
                  }
                ]} />
                <Animated.View style={[
                  styles.waveBar, 
                  { 
                    transform: [{ scaleY: waveAnim1 }],
                    backgroundColor: isInBackground ? '#FFA500' : '#FF6B6B' 
                  }
                ]} />
              </View>
              <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
            </View>
          )}
        </View>

        {/* Info Text */}
        {isRecording && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {isInBackground 
                ? "Recording continues in background" 
                : "You can minimize the app to record in background"}
            </Text>
          </View>
        )}

        {/* Record Button */}
        <View style={styles.recordButtonContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordingButton,
                isInBackground && styles.backgroundRecordingButton
              ]}
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
    padding: 20,
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
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    marginRight: 8,
  },
  backgroundStatusDot: {
    backgroundColor: 'orange',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
  infoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  infoText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
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
  backgroundRecordingButton: {
    backgroundColor: '#FFA500',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
});

export default AudioRecorderScreen;