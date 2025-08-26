import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Button, 
  AppState,
  Platform,
  Animated
} from 'react-native';
import { AudioRecorder, AudioPlayer, useAudioRecorder, useAudioPlayer } from 'expo-audio';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

// Background task for audio recording
const BACKGROUND_AUDIO_RECORDING_TASK = 'background-audio-recording-task';

// Register background task
TaskManager.defineTask(BACKGROUND_AUDIO_RECORDING_TASK, () => {
  try {
    console.log('Background audio recording task running...');
    return BackgroundTask.BackgroundTaskResult.NewData;
  } catch (error) {
    console.error('Background audio task error:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

const AudioRecorderScreen = () => {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isInBackground, setIsInBackground] = useState(false);
  const [backgroundTaskId, setBackgroundTaskId] = useState(null);
  const [audioLevels, setAudioLevels] = useState(0);
  const [recordingUri, setRecordingUri] = useState(null);
  
  // Using the new expo-audio hooks
  const recorder = useAudioRecorder({
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 'high',
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
  });

  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const backgroundStartTime = useRef(null);
  
  // Animation values for visual feedback
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.3)).current;
  const waveAnim2 = useRef(new Animated.Value(0.5)).current;
  const waveAnim3 = useRef(new Animated.Value(0.7)).current;

  // --- Permissions ---
  const [audioPermission, setAudioPermission] = useState(null);
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  // --- Request permissions on load ---
  useEffect(() => {
    const setupPermissions = async () => {
      try {
        // Request audio permissions using expo-audio
        const audioStatus = await AudioRecorder.requestPermissionsAsync();
        setAudioPermission(audioStatus);
        
        // Request media library permissions
        if (!mediaLibraryPermission?.granted) {
          await requestMediaLibraryPermission();
        }
        
        // Request notification permissions
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Notification permission not granted');
        }

        // Configure audio session for recording
        await AudioRecorder.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: true,
        });
      } catch (error) {
        console.error('Failed to setup permissions:', error);
      }
    };
    setupPermissions();
  }, []);

  // --- Animation Effects ---
  useEffect(() => {
    if (isRecording) {
      // Pulse animation for record button
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      // Wave animations
      const waveAnimation1 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim1, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      const waveAnimation2 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim2, {
            toValue: 0.8,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim2, {
            toValue: 0.5,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );

      const waveAnimation3 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim3, {
            toValue: 0.9,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim3, {
            toValue: 0.7,
            duration: 1500,
            useNativeDriver: true,
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
      // Reset animations
      pulseAnim.setValue(1);
      waveAnim1.setValue(0.3);
      waveAnim2.setValue(0.5);
      waveAnim3.setValue(0.7);
    }
  }, [isRecording]);

  // --- App State Management ---
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isInBackground && isRecording) {
          setIsInBackground(false);
          await stopBackgroundTask();
          showNotification('Audio Recording Active', 'Your audio recording is still active');
        }
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (isRecording) {
          setIsInBackground(true);
          backgroundStartTime.current = Date.now();
          await startBackgroundTask();
          showNotification('Recording in Background', 'Your audio is still being recorded');
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isRecording, isInBackground]);

  // --- Background Task Management ---
  const startBackgroundTask = async () => {
    try {
      if (Platform.OS === 'ios') {
        const taskId = await BackgroundTask.startBackgroundTaskAsync();
        setBackgroundTaskId(taskId);
        
        setTimeout(async () => {
          if (taskId) {
            await BackgroundTask.finishBackgroundTaskAsync(taskId);
          }
        }, 25000);
      }
    } catch (error) {
      console.error('Failed to start background task:', error);
    }
  };

  const stopBackgroundTask = async () => {
    try {
      if (backgroundTaskId && Platform.OS === 'ios') {
        await BackgroundTask.finishBackgroundTaskAsync(backgroundTaskId);
        setBackgroundTaskId(null);
      }
    } catch (error) {
      console.error('Failed to stop background task:', error);
    }
  };

  // --- Notification Helper ---
  const showNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
      },
      trigger: null,
    });
  };

  // --- Timer Logic ---
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(async () => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          AsyncStorage.setItem('audioRecordingDuration', newDuration.toString());
          return newDuration;
        });

        // Simulate audio level changes for visual feedback
        setAudioLevels(Math.random() * 100);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setRecordingDuration(0);
      AsyncStorage.removeItem('audioRecordingDuration');
    }
    return () => clearInterval(intervalRef.current);
  }, [isRecording]);

  // --- Restore recording state ---
  useEffect(() => {
    const restoreRecordingState = async () => {
      try {
        const savedDuration = await AsyncStorage.getItem('audioRecordingDuration');
        if (savedDuration && parseInt(savedDuration) > 0) {
          setRecordingDuration(parseInt(savedDuration));
        }
      } catch (error) {
        console.error('Failed to restore recording state:', error);
      }
    };
    restoreRecordingState();
  }, []);

  // --- Audio Recording Functions ---
  const startRecording = async () => {
    try {
      setIsRecording(true);
      console.log('Starting audio recording...');

      // Start recording using the new expo-audio API
      const uri = await recorder.recordAsync();
      setRecordingUri(uri);

      await showNotification(
        'Audio Recording Started', 
        'Audio recording has begun. You can minimize the app.'
      );
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Could not start audio recording: ' + error.message);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      console.log('Stopping audio recording...');
      
      await stopBackgroundTask();
      setIsInBackground(false);
      
      setIsRecording(false);
      
      await showNotification('Saving Audio', 'Your recording is being saved...');
      
      // Stop recording using the new expo-audio API
      const uri = await recorder.stopAsync();
      
      console.log('Recording completed:', uri);

      if (uri) {
        // Save to media library
        const asset = await MediaLibrary.saveToLibraryAsync(uri);
        console.log('Audio saved to library:', asset);
        
        const totalMinutes = Math.floor(recordingDuration / 60);
        const totalSeconds = recordingDuration % 60;
        
        Alert.alert(
          "Audio Saved", 
          `Your audio evidence has been saved to your media library.\nDuration: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`,
          [{ text: "OK" }]
        );

        await showNotification(
          'Audio Saved Successfully', 
          `Recording duration: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`
        );
        
        setRecordingUri(null);
      } else {
        throw new Error('No audio data received');
      }
      
    } catch (error) {
      console.error('Error stopping or saving audio:', error);
      Alert.alert('Error', 'Could not save the audio: ' + error.message);
    } finally {
      AsyncStorage.removeItem('audioRecordingDuration');
    }
  };

  const handleRecording = () => {
    if (isRecording) {
      Alert.alert(
        'Stop Recording',
        'Are you sure you want to stop the audio recording?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Stop', onPress: stopRecording, style: 'destructive' }
        ]
      );
    } else {
      startRecording();
    }
  };

  // --- Cleanup ---
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (recorder && isRecording) {
        recorder.stopAsync();
      }
      if (backgroundTaskId) {
        stopBackgroundTask();
      }
    };
  }, []);

  // --- Permission States ---
  if (!audioPermission || !mediaLibraryPermission) {
    return <View style={styles.container} />;
  }

  if (!audioPermission.granted || !mediaLibraryPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="microphone-off" size={80} color="#666" />
        <Text style={styles.permissionMessage}>
          We need access to your microphone and media library to record audio evidence.
          Background recording also requires notification permissions.
        </Text>
        <Button 
          onPress={async () => {
            const audioStatus = await AudioRecorder.requestPermissionsAsync();
            setAudioPermission(audioStatus);
            await requestMediaLibraryPermission();
          }} 
          title="Grant Permissions" 
        />
      </View>
    );
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
      style={styles.container}
    >
      <View style={styles.controlsContainer}>
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

        {/* Visual Audio Feedback */}
        <View style={styles.visualContainer}>
          {!isRecording ? (
            <View style={styles.microphoneContainer}>
              <MaterialCommunityIcons name="microphone" size={120} color="#666" />
              <Text style={styles.readyText}>Ready to Record</Text>
            </View>
          ) : (
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
          )}
        </View>

        {/* Timer Display */}
        {isRecording && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
          </View>
        )}

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
      </View>
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
    paddingTop: 60,
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
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 150,
    gap: 8,
  },
  waveBar: {
    width: 12,
    height: 100,
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
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