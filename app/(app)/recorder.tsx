import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Brightness from 'expo-brightness';
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dimensions, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const EvidenceRecorderScreen: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();

  // Enhanced state for brightness and blackout features
  const [isScreenBlackedOut, setIsScreenBlackedOut] = useState(false);
  const [originalBrightness, setOriginalBrightness] = useState<number>(1);
  const [brightnessPermission, setBrightnessPermission] = useState<boolean>(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const brightnessRestoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize brightness permissions and store original brightness
  useEffect(() => {
    const initializeBrightness = async () => {
      try {
        // Request brightness permissions
        const { status } = await Brightness.requestPermissionsAsync();
        setBrightnessPermission(status === 'granted');

        if (status === 'granted') {
          // Store original brightness level
          const currentBrightness = await Brightness.getBrightnessAsync();
          setOriginalBrightness(currentBrightness);
          console.log('📱 Original brightness stored:', currentBrightness);
        } else {
          console.log('⚠️ Brightness permission denied');
        }
      } catch (error) {
        console.error('❌ Error initializing brightness:', error);
      }
    };

    initializeBrightness();
  }, []);

  // Setup permissions
  useEffect(() => {
    const setupPermissions = async () => {
      if (cameraPermission && !cameraPermission.granted) await requestCameraPermission();
      if (microphonePermission && !microphonePermission.granted) await requestMicrophonePermission();
      if (mediaLibraryPermission && !mediaLibraryPermission.granted) await requestMediaLibraryPermission();
    };
    setupPermissions();
  }, [cameraPermission, microphonePermission, mediaLibraryPermission]);

  // Recording timer
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

  // Handle screen focus/unfocus to restore brightness
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Cleanup: restore brightness when leaving screen
        if (isScreenBlackedOut && brightnessPermission) {
          restoreBrightness();
        }
      };
    }, [isScreenBlackedOut, brightnessPermission, originalBrightness])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending brightness restore timeout
      if (brightnessRestoreTimeoutRef.current) {
        clearTimeout(brightnessRestoreTimeoutRef.current);
      }
      // Restore brightness if screen was blacked out
      if (isScreenBlackedOut && brightnessPermission) {
        restoreBrightness();
      }
    };
  }, []);

  // Enhanced brightness control functions
  const setBrightnessToMinimum = async () => {
    if (!brightnessPermission) return;

    try {
      // Set brightness to absolute minimum (0.01 instead of 0 to avoid completely black screen issues)
      await Brightness.setBrightnessAsync(0.01);
      console.log('🌑 Brightness set to minimum');
    } catch (error) {
      console.error('❌ Error setting brightness to minimum:', error);
    }
  };

  const restoreBrightness = async () => {
    if (!brightnessPermission) return;

    try {
      // Restore to original brightness or a reasonable default
      const brightnessToRestore = originalBrightness > 0.1 ? originalBrightness : 0.5;
      await Brightness.setBrightnessAsync(brightnessToRestore);
      console.log('🌞 Brightness restored to:', brightnessToRestore);
    } catch (error) {
      console.error('❌ Error restoring brightness:', error);
    }
  };

  // Enhanced blackout function with brightness control
  const blackOutScreen = () => {
    'use worklet';

    runOnJS(() => {
      setIsScreenBlackedOut(true);
      // Set brightness to minimum after a short delay to ensure UI updates first
      setTimeout(() => {
        setBrightnessToMinimum();
      }, 100);
      console.log('🌑 Screen blacked out with minimum brightness');
    })();
  };

  // Enhanced restore function with brightness control
  const restoreScreen = () => {
    'use worklet';

    runOnJS(() => {
      setIsScreenBlackedOut(false);
      // Restore brightness after a short delay
      setTimeout(() => {
        restoreBrightness();
      }, 100);
      console.log('🌞 Screen restored with original brightness');
    })();
  };

  // Gesture handler for restore
  const handleRestoreGesture = () => {
    if (isScreenBlackedOut) {
      restoreScreen();
    }
  };

  // Enhanced gesture with haptic feedback simulation
  const restoreScreenGesture = Gesture.Tap()
    .numberOfTaps(5)
    .maxDelay(1500)
    .onEnd(() => {
      'use worklet';
      runOnJS(handleRestoreGesture)();
    });

  // Alternative restore gesture - long press anywhere on screen
  const longPressRestoreGesture = Gesture.LongPress()
    .minDuration(2000)
    .onEnd(() => {
      'use worklet';
      runOnJS(() => {
        if (isScreenBlackedOut) {
          restoreScreen();
        }
      })();
    });

  // Combine gestures
  const combinedGesture = Gesture.Race(restoreScreenGesture, longPressRestoreGesture);

  // Recording handlers (unchanged)
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
          Alert.alert(t('recorder.videoSaved'), t('recorder.videoSavedMessage'));
        } else {
          throw new Error('No video data received');
        }
      } catch (error) {
        console.error("Error during recording or saving:", error);
        Alert.alert(t('recorder.error'), t('recorder.recordError') + (error as Error).message);
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

  // Permission checks
  const permissionsLoading = !cameraPermission || !microphonePermission || !mediaLibraryPermission;
  const permissionsMissing = cameraPermission && microphonePermission && mediaLibraryPermission &&
    (!cameraPermission.granted || !microphonePermission.granted || !mediaLibraryPermission.granted);

  if (permissionsLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionMessage}>{t('recorder.loadingPermissions')}</Text>
      </View>
    );
  }

  if (permissionsMissing) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionMessage}>
          We need access to your camera, microphone, and media library to record evidence.
          {!brightnessPermission && '\n\nBrightness control is optional but recommended for stealth mode.'}
        </Text>
        <Button
          onPress={async () => {
            await requestCameraPermission();
            await requestMicrophonePermission();
            await requestMediaLibraryPermission();

            // Also request brightness permission
            if (!brightnessPermission) {
              const { status } = await Brightness.requestPermissionsAsync();
              setBrightnessPermission(status === 'granted');
            }
          }}
          title="Grant Permissions"
        />
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={combinedGesture}>
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
              {isRecording && !isScreenBlackedOut && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
                </View>
              )}

              {/* Brightness warning indicator */}
              {!brightnessPermission && !isScreenBlackedOut && (
                <View style={styles.brightnessWarning}>
                  <Ionicons name="warning" size={16} color="#FFA500" />
                  <Text style={styles.brightnessWarningText}>
                    Brightness control unavailable
                  </Text>
                </View>
              )}
            </View>

            {!isScreenBlackedOut && (
              <View style={styles.bottomControls}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => {
                    // Restore brightness before leaving if it was modified
                    if (isScreenBlackedOut && brightnessPermission) {
                      restoreBrightness();
                    }
                    router.back();
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

                <TouchableOpacity
                  style={styles.screenOffButton}
                  onPress={blackOutScreen}
                >
                  <View style={styles.screenOffContent}>
                    <Ionicons name="moon" size={24} color="white" />
                    {brightnessPermission && (
                      <View style={styles.brightnessIcon}>
                        <Ionicons name="sunny" size={12} color="#FFA500" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Enhanced blackout overlay with realistic mobile screen simulation */}
          {isScreenBlackedOut && (
            <View style={styles.blackoutOverlay}>
              {/* Simulate mobile screen bezel/border */}
              <View style={styles.screenBezel}>
                {/* Top speaker/camera area */}
                <View style={styles.topNotch}>
                  <View style={styles.speaker} />
                  <View style={styles.frontCamera} />
                </View>

                {/* Main black screen area */}
                <View style={styles.blackScreen}>
                  {/* Subtle recording indicator - barely visible */}
                  {isRecording && (
                    <View style={styles.subtleRecordingIndicator}>
                      <View style={styles.subtleDot} />
                    </View>
                  )}

                  {/* Restore instructions - very subtle */}
                  <View style={styles.restoreInstructions}>
                    <Text style={styles.subtleText}>
                      5 taps or long press to restore
                    </Text>
                    {brightnessPermission && (
                      <Text style={styles.subtleText}>
                        Enhanced stealth mode active
                      </Text>
                    )}
                  </View>
                </View>

                {/* Bottom home indicator (for modern phones) */}
                <View style={styles.homeIndicator} />
              </View>
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
    lineHeight: 22,
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
    marginBottom: 10,
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
  brightnessWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  brightnessWarningText: {
    color: '#FFA500',
    fontSize: 12,
    marginLeft: 6,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 2,
    borderColor: 'white',
    position: 'relative',
  },
  screenOffContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  brightnessIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    padding: 2,
  },
  // Enhanced blackout overlay styles
  blackoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenBezel: {
    width: width,
    height: height,
    backgroundColor: '#0a0a0a',
    borderRadius: Platform.OS === 'ios' ? 25 : 15,
    borderWidth: 3,
    borderColor: '#1a1a1a',
    overflow: 'hidden',
    position: 'relative',
  },
  topNotch: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    paddingBottom: 10,
    gap: 15,
  },
  speaker: {
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
  },
  frontCamera: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  blackScreen: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  subtleRecordingIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    opacity: 0.3,
  },
  subtleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff0000',
    opacity: 0.5,
  },
  restoreInstructions: {
    alignItems: 'center',
    opacity: 0.15,
  },
  subtleText: {
    color: '#333333',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 2,
  },
  homeIndicator: {
    alignSelf: 'center',
    width: 140,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    marginBottom: Platform.OS === 'ios' ? 8 : 16,
  },
});

export default EvidenceRecorderScreen;