import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Button, SafeAreaView, Linking, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Brightness from 'expo-brightness';

interface EvidenceRecorderScreenProps { }

const EvidenceRecorderScreen: React.FC<EvidenceRecorderScreenProps> = () => {
  const router = useRouter();

  // ALL HOOKS MUST BE DECLARED FIRST - NEVER AFTER CONDITIONAL RETURNS
  const [isBrightnessOff, setIsBrightnessOff] = useState(false);
  const [originalBrightness, setOriginalBrightness] = useState(1);
  const [brightnessPermission, setBrightnessPermission] = useState(null);

  // Use the new permission hooks - THESE MUST ALWAYS BE CALLED
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request brightness permissions when the component loads
  useEffect(() => {
    const checkInitialPermission = async () => {
      const permissionStatus = await Brightness.getPermissionsAsync();
      setBrightnessPermission(permissionStatus);
    };
    checkInitialPermission();
  }, []);

  // --- Request Camera/Microphone/MediaLibrary Permissions ---
  useEffect(() => {
    const setupPermissions = async () => {
      if (cameraPermission && !cameraPermission.granted) {
        await requestCameraPermission();
      }
      if (microphonePermission && !microphonePermission.granted) {
        await requestMicrophonePermission();
      }
      if (mediaLibraryPermission && !mediaLibraryPermission.granted) {
        await requestMediaLibraryPermission();
      }
    };

    setupPermissions();
  }, [cameraPermission, microphonePermission, mediaLibraryPermission]);

  // --- Timer Logic ---
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setRecordingDuration(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  // Function to open modify system settings specifically
  const openModifySystemSettings = async () => {
    // This feature is only available on Android.
    if (Platform.OS !== 'android') {
      Alert.alert('Info', 'This feature is only available on Android devices.');
      return;
    }

    try {
      // This is the specific Android Intent action for the "Modify system settings" screen.
      const intentAction = 'android.settings.action.MANAGE_WRITE_SETTINGS';
      
      // The sendIntent method triggers the native Android screen.
      await Linking.sendIntent(intentAction);

    } catch (error) {
      console.error('Failed to open settings:', error);
      Alert.alert('Error', 'Could not open the required settings screen.');
    }
  };

  // --- PERMISSION HANDLER ---
  const handleBrightnessPermissionRequest = async () => {
    // 1. Get the most up-to-date permission status
    const currentPermission = await Brightness.getPermissionsAsync();

    // 2. If undetermined, request it with the pop-up
    if (currentPermission.status === 'undetermined') {
      const requestedPermission = await Brightness.requestPermissionsAsync();
      setBrightnessPermission(requestedPermission);
      return;
    }

    // 3. If permanently denied, guide user to settings
    if (currentPermission.status === 'denied' && !currentPermission.canAskAgain) {
      Alert.alert(
        'Permission Required',
        'You have permanently denied the brightness permission. Please go to your device settings to enable it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Modify Settings', onPress: openModifySystemSettings },
        ]
      );
      return;
    }
    
    // 4. If denied but we can ask again, request it
    if (currentPermission.status === 'denied' && currentPermission.canAskAgain) {
      const requestedPermission = await Brightness.requestPermissionsAsync();
      setBrightnessPermission(requestedPermission);
      return;
    }
    
    // 5. If already granted, just inform the user
    if (currentPermission.status === 'granted') {
      Alert.alert('Permission Granted', 'You can already control the brightness.');
    }
  };

  const turnBrightnessOff = async () => {
    try {
      // 1. Save the current brightness level
      const currentBrightness = await Brightness.getBrightnessAsync();
      setOriginalBrightness(currentBrightness);

      // 2. Set brightness to 0 (screen appears off but recording continues)
      await Brightness.setBrightnessAsync(0);
      setIsBrightnessOff(true);
      console.log('Brightness turned off successfully');
    } catch (error) {
      console.error('Error turning brightness off:', error);
      Alert.alert('Error', 'Could not control brightness. Please ensure you have granted the modify system settings permission.');
    }
  };

  const turnBrightnessOn = async () => {
    try {
      console.log('Attempting to turn brightness on, original:', originalBrightness);
      // 1. Restore the original brightness
      await Brightness.setBrightnessAsync(originalBrightness);

      // 2. Update state
      setIsBrightnessOff(false);
      console.log('Brightness restored successfully');
    } catch (error) {
      console.error('Error turning brightness on:', error);
      Alert.alert('Error', 'Could not restore brightness.');
    }
  };

  // The gesture to restore brightness (4 taps) - only active when brightness is off
  const restoreBrightnessGesture = Gesture.Tap()
    .numberOfTaps(4)
    .maxDelay(1000) // Allow up to 1 second between taps
    .onEnd((event, success) => {
      console.log('4-tap gesture triggered, success:', success, 'isBrightnessOff:', isBrightnessOff);
      if (success && isBrightnessOff) {
        turnBrightnessOn();
      }
    });

  // --- Recording Handlers ---
  const recordVideo = async (): Promise<void> => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);

        const recordedVideo = await cameraRef.current.recordAsync({
          quality: '720p',
          maxDuration: 300, // 5 minutes max
        });

        if (recordedVideo && recordedVideo.uri) {
          await MediaLibrary.saveToLibraryAsync(recordedVideo.uri);
          Alert.alert("Video Saved", "Your evidence has been saved to your photo library.");
        } else {
          throw new Error('No video data received');
        }
      } catch (error) {
        console.error("Error during recording or saving:", error);
        Alert.alert("Error", "Could not record or save the video: " + (error as Error).message);
      } finally {
        setIsRecording(false);
      }
    }
  };

  const stopRecording = (): void => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      // setIsRecording will be set to false in the recordVideo's finally block
    }
  };

  const handleRecordButtonPress = (): void => {
    if (isRecording) {
      stopRecording();
    } else {
      recordVideo();
    }
  };

  const toggleCameraType = (): void => {
    setCameraType(current => current === 'back' ? 'front' : 'back');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // --- RENDER CONTENT BASED ON PERMISSIONS (NO EARLY RETURNS BEFORE THIS) ---
  
  // Check if permissions are still loading
  const permissionsLoading = !cameraPermission || !microphonePermission || !mediaLibraryPermission;
  
  // Check if any required permissions are missing
  const permissionsMissing = cameraPermission && microphonePermission && mediaLibraryPermission && 
    (!cameraPermission.granted || !microphonePermission.granted || !mediaLibraryPermission.granted);

  if (permissionsLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionMessage}>Loading permissions...</Text>
      </View>
    );
  }

  if (permissionsMissing) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionMessage}>
          We need access to your camera, microphone, and media library to record evidence.
        </Text>
        <Button
          onPress={async () => {
            await requestCameraPermission();
            await requestMicrophonePermission();
            await requestMediaLibraryPermission();
          }}
          title="Grant Permissions"
        />
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <GestureDetector gesture={restoreBrightnessGesture}>
          <CameraView
            style={styles.camera}
            facing={cameraType}
            ref={cameraRef}
            mode="video"
            videoQuality="720p"
          />
        </GestureDetector>

        {/* Overlay controls using absolute positioning */}
        <View style={styles.controlsContainer}>
          <View style={styles.topControls}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
              </View>
            )}
            
            {/* Brightness Permission Status and Controls */}
            <View style={styles.brightnessControls}>
              <Text style={styles.permissionStatusText}>
                Brightness Permission: {brightnessPermission?.status ?? 'loading...'}
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={handleBrightnessPermissionRequest}
              >
                <Text style={styles.permissionButtonText}>Fix Brightness Permission</Text>
              </TouchableOpacity>
              {isBrightnessOff && (
                <Text style={styles.brightnessOffIndicator}>
                  Brightness OFF - Tap 4 times on camera to restore
                </Text>
              )}
            </View>
          </View>

          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                if (isRecording) {
                  Alert.alert(
                    'Recording Active',
                    'Stop recording before leaving?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Stop & Exit', onPress: () => {
                          stopRecording();
                          setTimeout(() => router.back(), 500);
                        }
                      }
                    ]
                  );
                } else {
                  router.back();
                }
              }}
            >
              <Ionicons name="close" size={35} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordingActive]}
              onPress={handleRecordButtonPress}
            >
              <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleCameraType}
              disabled={isRecording}
            >
              <Ionicons
                name="camera-reverse"
                size={35}
                color={isRecording ? "gray" : "white"}
              />
            </TouchableOpacity>

         
            {/* Manual restore button for backup */}
            {isBrightnessOff ? (
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={turnBrightnessOn}
              >
                <Ionicons name="sunny" size={40} color="white" />
              </TouchableOpacity>
            ): (
   <TouchableOpacity
              style={styles.screenOffButton}
              onPress={turnBrightnessOff}
            >
              <Ionicons name="moon" size={30} color="white" />
            </TouchableOpacity>

            )}
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center'
  },
  camera: {
    flex: 1
  },
  controlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    zIndex: 1,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    marginRight: 8,
  },
  timerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brightnessControls: {
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  permissionStatusText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 8,
  },
  permissionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  brightnessOffIndicator: {
    color: 'yellow',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    fontWeight: 'bold',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  recordingActive: {
    borderColor: 'red',
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
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  screenOffButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2,
    borderColor: 'white',
  },
  restoreButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,0,0.3)',
    borderWidth: 1,
    borderColor: 'yellow',
  },
});

export default EvidenceRecorderScreen;