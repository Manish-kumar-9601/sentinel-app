import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Button, SafeAreaView, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
const EvidenceRecorderScreen: React.FC = () => {
  const router = useRouter();

  // ✅ New, simpler state for the black screen overlay
  const [isScreenBlackedOut, setIsScreenBlackedOut] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const setupPermissions = async () => {
      if (cameraPermission && !cameraPermission.granted) await requestCameraPermission();
      if (microphonePermission && !microphonePermission.granted) await requestMicrophonePermission();
      if (mediaLibraryPermission && !mediaLibraryPermission.granted) await requestMediaLibraryPermission();
    };
    setupPermissions();
  }, [cameraPermission, microphonePermission, mediaLibraryPermission]);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording]);

  // ✅ New, simpler functions to control the overlay
  // ✅ FIX: Converted to a worklet.
  const blackOutScreen = () => {
    'use worklet'; // <-- Add this directive at the top of the function
    // ✅ FIX: Wrap the state update in runOnJS.
    runOnJS(setIsScreenBlackedOut)(true);
    console.log('Screen blacked out. Recording continues.');
  };

  // ✅ FIX: Converted to a worklet.
  const restoreScreen = () => {
    'use worklet'; // <-- Add this directive at the top of the function
    // ✅ FIX: Wrap the state update in runOnJS.
    runOnJS(setIsScreenBlackedOut)(false);
    console.log('Screen restored.');
  };
  // ✅ ADD THIS NEW FUNCTION
// This function will run on the JS thread and can safely access state.
const handleRestoreGesture = () => {
  // Because this runs on the JS thread, it knows the true value of isScreenBlackedOut
  if (isScreenBlackedOut) {
    // Since restoreScreen is a worklet, we call it to perform the action.
    // It will correctly bridge back to the JS thread for the state update.
    restoreScreen();
  }
};
// ✅ UPDATE the restoreScreenGesture
const restoreScreenGesture = Gesture.Tap()
  .numberOfTaps(5)
  .maxDelay(1500) // Now allows up to 1.5 seconds between taps
  .onEnd(() => {
    'use worklet'; // <-- It's good practice to mark gesture callbacks as worklets
    // The only job of the gesture callback is to trigger the handler on the JS thread.
    runOnJS(handleRestoreGesture)();
  });

  // --- Recording Handlers (UNCHANGED) ---
  const recordVideo = async (): Promise<void> => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        const recordedVideo = await cameraRef.current.recordAsync({
          quality: '720p',
          maxDuration: 300,
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

  const permissionsLoading = !cameraPermission || !microphonePermission || !mediaLibraryPermission;
  const permissionsMissing = cameraPermission && microphonePermission && mediaLibraryPermission &&
    (!cameraPermission.granted || !microphonePermission.granted || !mediaLibraryPermission.granted);

  if (permissionsLoading) {
    return <View style={styles.container}><Text style={styles.permissionMessage}>Loading permissions...</Text></View>;
  }

  if (permissionsMissing) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionMessage}>We need access to your camera, microphone, and media library to record evidence.</Text>
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
      <GestureDetector gesture={restoreScreenGesture}>
        <View style={styles.container}>
          <CameraView
            style={styles.camera}
            facing={cameraType}
            ref={cameraRef}
            mode="video"
            videoQuality="720p"
          />

          <View style={styles.controlsContainer}>
            <View style={styles.topControls}>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
                </View>
              )}
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                <Ionicons name="close" size={35} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordingActive]}
                onPress={handleRecordButtonPress}
              >
                <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={toggleCameraType} disabled={isRecording}>
                <Ionicons name="camera-reverse" size={35} color={isRecording ? "gray" : "white"} />
              </TouchableOpacity>

              {isScreenBlackedOut ? (
                <TouchableOpacity style={styles.restoreButton} onPress={restoreScreen}>
                  <Ionicons name="sunny" size={40} color="white" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.screenOffButton} onPress={blackOutScreen}>
                  <Ionicons name="moon" size={30} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isScreenBlackedOut && (
            <View style={styles.blackoutOverlay}>
              <Text style={styles.blackoutText}>Tap 5 times to restore screen</Text>
            </View>
          )}
        </View>
      </GestureDetector>
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
  // ✅ New styles for the blackout overlay
  blackoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blackoutText: {
    color: '#444',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default EvidenceRecorderScreen;