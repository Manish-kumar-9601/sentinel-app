import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Button, 
  AppState,
  Platform
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Background task for video recording
const BACKGROUND_RECORDING_TASK = 'background-recording-task';

// Register background task
TaskManager.defineTask(BACKGROUND_RECORDING_TASK, () => {
  try {
    // Keep recording alive in background
    console.log('Background recording task running...');
    return BackgroundTask.BackgroundTaskResult.NewData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

const EvidenceRecorderScreen = () => {
  const router = useRouter();
  const [facing, setFacing] = useState('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isInBackground, setIsInBackground] = useState(false);
  const [backgroundTaskId, setBackgroundTaskId] = useState(null);
  
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);
  const recordingPromiseRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const backgroundStartTime = useRef(null);

  // --- Modern Permission Hooks ---
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  // --- Request all necessary permissions on load ---
  useEffect(() => {
    const setupPermissions = async () => {
      if (!cameraPermission?.granted) await requestCameraPermission();
      if (!microphonePermission?.granted) await requestMicrophonePermission();
      if (!mediaLibraryPermission?.granted) await requestMediaLibraryPermission();
      
      // Request notification permissions for background alerts
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permission not granted');
      }
    };
    setupPermissions();
  }, []);

  // --- App State Management ---
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (isInBackground && isRecording) {
          setIsInBackground(false);
          await stopBackgroundTask();
          // Show notification that recording continued
          showNotification('Recording Active', 'Your video recording is still active');
        }
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App went to background
        if (isRecording) {
          setIsInBackground(true);
          backgroundStartTime.current = Date.now();
          await startBackgroundTask();
          showNotification('Recording in Background', 'Your video is still being recorded');
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
        
        // Set a timer to finish the task before iOS kills it (typically 30 seconds)
        setTimeout(async () => {
          if (taskId) {
            await BackgroundTask.finishBackgroundTaskAsync(taskId);
          }
        }, 25000); // 25 seconds to be safe
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
        sound: false, // Don't interrupt recording with sound
      },
      trigger: null, // Show immediately
    });
  };

  // --- Timer Logic with Background Support ---
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(async () => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Save duration to storage for persistence
          AsyncStorage.setItem('recordingDuration', newDuration.toString());
          return newDuration;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setRecordingDuration(0);
      AsyncStorage.removeItem('recordingDuration');
    }
    return () => clearInterval(intervalRef.current);
  }, [isRecording]);

  // --- Restore recording state on app resume ---
  useEffect(() => {
    const restoreRecordingState = async () => {
      try {
        const savedDuration = await AsyncStorage.getItem('recordingDuration');
        if (savedDuration && parseInt(savedDuration) > 0) {
          setRecordingDuration(parseInt(savedDuration));
          // You might want to ask user if they want to continue the recording
        }
      } catch (error) {
        console.error('Failed to restore recording state:', error);
      }
    };
    restoreRecordingState();
  }, []);

  // --- Handlers ---
  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  const startRecording = async () => {
    if (!cameraRef.current) return;
    
    try {
      setIsRecording(true);
      console.log('Starting video recording...');
      
      // Start recording with enhanced options
      recordingPromiseRef.current = cameraRef.current.recordAsync({
        quality: '720p',
        maxDuration: 1800, // 30 minutes max
        mute: false,
        videoBitrate: 5000000, // 5 Mbps for good quality
      });

      // Show initial notification
      await showNotification(
        'Recording Started', 
        'Video recording has begun. You can minimize the app.'
      );
      
    } catch (error) {
      console.error("Error starting recording: ", error);
      Alert.alert("Error", "Could not start recording.");
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !recordingPromiseRef.current) return;
    
    try {
      console.log('Stopping video recording...');
      
      // Clean up background task
      await stopBackgroundTask();
      setIsInBackground(false);
      
      // Stop the recording
      cameraRef.current.stopRecording();
      setIsRecording(false);
      
      // Show stopping notification
      await showNotification('Saving Video', 'Your recording is being saved...');
      
      // Wait for the recording to complete and get the result
      const data = recordingPromiseRef.current;
      recordingPromiseRef.current = null;
      
      console.log('Recording completed:', data);
      
      if (data && data.uri) {
        // Save to media library
        const asset = await MediaLibrary.saveToLibraryAsync(data.uri);
        console.log('Video saved to library:', asset);
        
        // Calculate total recording time
        const totalMinutes = Math.floor(recordingDuration / 60);
        const totalSeconds = recordingDuration % 60;
        
        Alert.alert(
          "Video Saved", 
          `Your evidence has been saved to your photo library.\nDuration: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`,
          [{ text: "OK" }]
        );

        await showNotification(
          'Video Saved Successfully', 
          `Recording duration: ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`
        );
      } else {
        throw new Error('No video data received');
      }
      
    } catch (error) {
      console.error("Error stopping or saving video: ", error);
      if (!error.message.includes('Recording was stopped') && 
          !error.message.includes('Recording stopped')) {
        Alert.alert("Error", "Could not save the video: " + error.message);
      }
    } finally {
      // Clean up storage
      AsyncStorage.removeItem('recordingDuration');
    }
  };

  const handleRecording = () => {
    if (isRecording) {
      Alert.alert(
        'Stop Recording',
        'Are you sure you want to stop the recording?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Stop', onPress: stopRecording, style: 'destructive' }
        ]
      );
    } else {
      startRecording();
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (isRecording && cameraRef.current) {
        cameraRef.current.stopRecording();
      }
      if (backgroundTaskId) {
        stopBackgroundTask();
      }
    };
  }, []);

  // Show warning before leaving while recording
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRecording) {
        Alert.alert(
          'Recording Active',
          'You have an active recording. Closing the app will stop the recording.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue Recording', onPress: () => {}, style: 'default' }
          ]
        );
      }
    };

    // This would typically be used in web environments
    // For React Native, the AppState change handler above covers this
  }, [isRecording]);

  // --- Permission Loading/Denied States ---
  if (!cameraPermission || !microphonePermission || !mediaLibraryPermission) {
    return <View style={styles.container} />; // Permissions are still loading
  }

  if (!cameraPermission.granted || !microphonePermission.granted || !mediaLibraryPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionMessage}>
          We need full access to your camera, microphone, and media library to record evidence.
          Background recording also requires notification permissions.
        </Text>
        <Button onPress={async () => {
            await requestCameraPermission();
            await requestMicrophonePermission();
            await requestMediaLibraryPermission();
        }} title="Grant All Permissions" />
      </View>
    );
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing} 
        ref={cameraRef}
        mode="video"
      />
      
      <View style={styles.controlsContainer}>
        <View style={styles.topControls}>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={[styles.recordingDot, isInBackground && styles.backgroundDot]} />
              <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
              {isInBackground && (
                <Text style={styles.backgroundText}>Background</Text>
              )}
            </View>
          )}
          
          {isRecording && (
            <View style={styles.backgroundInfo}>
              <Text style={styles.backgroundInfoText}>
                {isInBackground 
                  ? "Recording in background - you can minimize the app" 
                  : "Recording active - minimize app to continue in background"}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => {
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
          }}>
             <Ionicons name="close" size={35} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.recordButton, 
              isRecording && styles.recordingButton,
              isInBackground && styles.backgroundRecordingButton
            ]} 
            onPress={handleRecording}
          >
            <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={toggleCameraFacing}
            disabled={isRecording} // Disable flip while recording
          >
            <Ionicons 
              name="camera-reverse" 
              size={35} 
              color={isRecording ? "gray" : "white"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { ...StyleSheet.absoluteFillObject },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'black',
  },
  permissionMessage: {
    textAlign: 'center',
    paddingBottom: 20,
    fontSize: 16,
    color: 'white',
  },
  topControls: {
    paddingTop: 60,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'red',
    marginRight: 8,
  },
  backgroundDot: {
    backgroundColor: 'orange',
  },
  timerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backgroundText: {
    color: 'orange',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  backgroundInfo: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginTop: 10,
    maxWidth: '90%',
  },
  backgroundInfoText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingTop: 20,
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  recordingButton: {
    borderColor: 'red',
  },
  backgroundRecordingButton: {
    borderColor: 'orange',
  },
  recordIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'red',
  },
  stopIcon: {
    width: 30,
    height: 30,
    backgroundColor: 'red',
    borderRadius: 5,
  },
  iconButton: {
    padding: 10,
  },
});

export default EvidenceRecorderScreen;