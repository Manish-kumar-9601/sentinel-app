import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Brightness from 'expo-brightness';
import * as FileSystem from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  AppState,
  Dimensions,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

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
  const { t } = useTranslation();

  // Audio recording setup
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  // Enhanced state for blackout and brightness features
  const [isScreenBlackedOut, setIsScreenBlackedOut] = useState(false);
  const [originalBrightness, setOriginalBrightness] = useState<number>(1);
  const [brightnessPermission, setBrightnessPermission] = useState<boolean>(false);

  // Existing state management
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

  // Brightness and blackout refs
  const brightnessRestoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize brightness permissions and store original brightness
  useEffect(() => {
    const initializeBrightness = async () => {
      try {
        const { status } = await Brightness.requestPermissionsAsync();
        setBrightnessPermission(status === 'granted');

        if (status === 'granted') {
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

  // Enhanced permission handling
  useEffect(() => {
    requestPermissions();
  }, []);

  // App state monitoring for background recording
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [recorderState.isRecording, appState]);

  // Handle screen focus/unfocus to restore brightness
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (isScreenBlackedOut && brightnessPermission) {
          restoreBrightness();
        }
      };
    }, [isScreenBlackedOut, brightnessPermission, originalBrightness])
  );

  // Enhanced cleanup on unmount
  useEffect(() => {
    return () => {
      if (brightnessRestoreTimeoutRef.current) {
        clearTimeout(brightnessRestoreTimeoutRef.current);
      }
      if (isScreenBlackedOut && brightnessPermission) {
        restoreBrightness();
      }
      if (recorderState.isRecording) {
        stopRecording().catch(console.error);
      }
      deactivateKeepAwake().catch(console.error);
      Notifications.dismissAllNotificationsAsync().catch(console.error);
    };
  }, []);

  const requestPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const audioRes = await AudioModule.requestRecordingPermissionsAsync();
      const mediaLibRes = await MediaLibrary.requestPermissionsAsync();
      const notificationsRes = await Notifications.requestPermissionsAsync();

      // Request brightness permission
      const brightnessRes = await Brightness.requestPermissionsAsync();
      setBrightnessPermission(brightnessRes.status === 'granted');

      let writePermissionGranted = true;
      if (Platform.OS === 'android' && Platform.Version >= 29) {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync(true);
          writePermissionGranted = status === 'granted';
        } catch (error) {
          console.log('Write permission not available:', error);
          writePermissionGranted = true;
        }
      }

      if (audioRes.granted && mediaLibRes.granted && notificationsRes.granted) {
        setHasPermissions(true);
        console.log('All permissions granted successfully');
        if (brightnessRes.status === 'granted') {
          const currentBrightness = await Brightness.getBrightnessAsync();
          setOriginalBrightness(currentBrightness);
        }
        if (!writePermissionGranted) {
          console.log('Note: Limited media library access (scoped storage)');
        }
      } else {
        console.log('Permissions denied:', { audioRes, mediaLibRes, notificationsRes });
        Alert.alert(
          t('audioRecorder.permissionsRequired'),
          t('audioRecorder.permissionsMessage')
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert(t('audioRecorder.error'), t('audioRecorder.permissionError'));
    }
    setPermissionsLoading(false);
  };

  // Enhanced brightness control functions
  const setBrightnessToMinimum = async () => {
    if (!brightnessPermission) return;

    try {
      await Brightness.setBrightnessAsync(0.01);
      console.log('🌑 Brightness set to minimum');
    } catch (error) {
      console.error('❌ Error setting brightness to minimum:', error);
    }
  };

  const restoreBrightness = async () => {
    if (!brightnessPermission) return;

    try {
      const brightnessToRestore = originalBrightness > 0.1 ? originalBrightness : 0.5;
      await Brightness.setBrightnessAsync(brightnessToRestore);
      console.log('🌞 Brightness restored to:', brightnessToRestore);
    } catch (error) {
      console.error('❌ Error restoring brightness:', error);
    }
  };

  // Enhanced blackout function with brightness control
  const blackOutScreen = () => {
    setIsScreenBlackedOut(true);
    setTimeout(() => {
      setBrightnessToMinimum();
    }, 100);
    console.log('🌑 Audio recorder screen blacked out with minimum brightness');
  };

  // Enhanced restore function with brightness control
  const restoreScreen = () => {
    setIsScreenBlackedOut(false);
    setTimeout(() => {
      restoreBrightness();
    }, 100);
    console.log('🌞 Audio recorder screen restored with original brightness');
  };

  // Gesture handlers for restore
  const handleRestoreGesture = () => {
    if (isScreenBlackedOut) {
      restoreScreen();
    }
  };

  const restoreScreenGesture = Gesture.Tap()
    .numberOfTaps(5)
    .maxDelay(1500)
    .onEnd(() => {
      runOnJS(handleRestoreGesture)();
    });

  const longPressRestoreGesture = Gesture.LongPress()
    .minDuration(2000)
    .onEnd(() => {
      runOnJS(() => {
        if (isScreenBlackedOut) {
          restoreScreen();
        }
      })();
    });

  const combinedGesture = Gesture.Race(restoreScreenGesture, longPressRestoreGesture);

  const handleAppStateChange = async (nextAppState) => {
    console.log('App state changed from', appState, 'to', nextAppState);

    if (recorderState.isRecording) {
      if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        setBackgroundPausedAt(Date.now());
        setDisplayedDuration(recorderState.durationMillis / 1000);

        await showNotification(
          'Audio Recording in Background',
          `Recording continues in background${isScreenBlackedOut ? ' (Stealth Mode Active)' : ''}. Tap to return.`,
          true
        );
        console.log('Audio recording continues in background, timer display paused');
      } else if (appState.match(/inactive|background/) && nextAppState === 'active') {
        if (backgroundPausedAt) {
          const backgroundDuration = Date.now() - backgroundPausedAt;
          setDisplayedDuration(prev => prev + (backgroundDuration / 1000));
          setBackgroundPausedAt(null);
        }

        await Notifications.dismissAllNotificationsAsync();
        console.log('Returned to foreground, audio timer display resumed');
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
          categoryIdentifier: 'audio_recording',
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
      Alert.alert(t('audioRecorder.permissionsRequired'), t('audioRecorder.permissionsNeeded'));
      return;
    }

    try {
      console.log('Starting audio recording...');

      await activateKeepAwakeAsync();
      await audioRecorder.prepareToRecordAsync();
      const result = await audioRecorder.record();

      const uri = result?.url || result?.uri || result;

      setCurrentRecordingUri(uri);
      setRecordingStartTime(Date.now());
      setIsPaused(false);
      setPausedDuration(0);
      setLastPauseTime(null);
      setDisplayedDuration(0);
      setBackgroundPausedAt(null);

      const notificationTitle = isScreenBlackedOut ? t('audioRecorder.stealthRecordingActive') : t('audioRecorder.audioRecordingActive');
      const notificationBody = isScreenBlackedOut ?
        t('audioRecorder.stealthRecordingBody') :
        t('audioRecorder.audioRecordingBody');

      await showNotification(notificationTitle, notificationBody, true);

      console.log('Audio recording started successfully');
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      await deactivateKeepAwake();
      Alert.alert(t('audioRecorder.recordingError'), t('audioRecorder.couldNotStartRecording') + (error as Error).message);
    }
  };

  const stopRecording = async () => {
    try {
      console.log('Stopping audio recording...');

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

      const uri = result?.url || result?.uri || result;

      if (uri && typeof uri === 'string') {
        console.log('Audio recording stopped, URI:', uri);
        await saveRecordingToLibrary(uri);
      } else {
        console.error('Invalid URI received:', result);
        throw new Error('No valid recording URI received');
      }
    } catch (error) {
      console.error("Error stopping/saving audio recording:", error);
      Alert.alert(t('audioRecorder.error'), t('audioRecorder.couldNotSaveRecording') + (error as Error).message);
    }
  };

  const saveRecordingToLibrary = async (uri) => {
    try {
      console.log('Saving audio recording to media library...');

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Recording file does not exist');
      }

      console.log('File info:', fileInfo);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `audio_recording_${timestamp}.m4a`;

      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('Asset created:', asset);

      console.log('Audio recording saved successfully to media library');

      const duration = recorderState.durationMillis / 1000;
      const size = fileInfo.size ? (fileInfo.size / (1024 * 1024)).toFixed(2) : 'Unknown';

      Alert.alert(
        t('audioRecorder.audioRecordingSaved'),
        `${t('audioRecorder.duration')}: ${formatTime(duration)}\n${t('audioRecorder.size')}: ${size} MB\n${t('audioRecorder.savedToMusic')}${isScreenBlackedOut ? '\n(' + t('audioRecorder.recordedInStealth') + ')' : ''}`,
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error) {
      console.error('Failed to save audio recording:', error);
      Alert.alert(
        t('audioRecorder.savingError'),
        t('audioRecorder.couldNotSaveToLibrary') + (error as Error).message
      );
    }
  };

  const pauseRecording = async () => {
    try {
      console.log('Pausing audio recording...');
      setLastPauseTime(Date.now());
      setIsPaused(true);
      const notificationTitle = isScreenBlackedOut ? 'Stealth Recording Paused' : 'Audio Recording Paused';
      await showNotification(notificationTitle, 'Your audio recording is paused.');
    } catch (error) {
      console.error('Failed to pause audio recording:', error);
      Alert.alert("Error", "Could not pause the recording.");
    }
  };

  const resumeRecording = async () => {
    try {
      console.log('Resuming audio recording...');
      if (lastPauseTime) {
        setPausedDuration(prev => prev + (Date.now() - lastPauseTime));
      }
      setIsPaused(false);
      setLastPauseTime(null);
      const notificationTitle = isScreenBlackedOut ? 'Stealth Recording Resumed' : 'Audio Recording Resumed';
      const notificationBody = isScreenBlackedOut ?
        'Audio recording resumed in stealth mode.' :
        'Your audio recording has resumed.';
      await showNotification(notificationTitle, notificationBody, true);
    } catch (error) {
      console.error('Failed to resume audio recording:', error);
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
        'Are you sure you want to stop and save this audio recording?',
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

  // Animation logic
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
            toValue: 0.3,
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
      animations.forEach(anim => anim.stop());
    };
  }, [recorderState.isRecording, isPaused, pulseAnim, waveAnim1, waveAnim2, waveAnim3]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';

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
      t('audioRecorder.permissionsRequired'),
      t('audioRecorder.permissionsSettings'),
      [
        { text: t('audioRecorder.cancel'), style: "cancel" },
        {
          text: t('audioRecorder.openSettings'),
          onPress: () => Linking.openSettings()
        }
      ]
    );
  };

  // Timer update effect
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

  // Loading screen
  if (permissionsLoading) {
    return (
      <LinearGradient colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']} style={styles.container}>
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="loading" size={50} color="#FF6B6B" />
          <Text style={styles.permissionMessage}>{t('audioRecorder.initializing')}</Text>
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
            {t('audioRecorder.permissionsDescription')}
          </Text>
          {!brightnessPermission && (
            <Text style={styles.brightnessWarningText}>
              {t('audioRecorder.brightnessWarning')}
            </Text>
          )}
          <TouchableOpacity style={styles.permissionButton} onPress={handlePermissionReRequest}>
            <Text style={styles.permissionButtonText}>{t('audioRecorder.enablePermissions')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Main recorder interface
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={combinedGesture}>
        <LinearGradient colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']} style={styles.container}>
          <SafeAreaView style={styles.controlsContainer}>
            {/* Header */}
            {!isScreenBlackedOut && (
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    if (recorderState.isRecording) {
                      Alert.alert(
                        t('audioRecorder.recordingActive'),
                        t('audioRecorder.stopRecordingBeforeLeaving'),
                        [
                          { text: t('audioRecorder.cancel'), style: 'cancel' },
                          {
                            text: t('audioRecorder.stopAndExit'),
                            onPress: async () => {
                              await stopRecording();
                              if (isScreenBlackedOut && brightnessPermission) {
                                restoreBrightness();
                              }
                              router.back();
                            }
                          }
                        ]
                      );
                    } else {
                      if (isScreenBlackedOut && brightnessPermission) {
                        restoreBrightness();
                      }
                      router.back();
                    }
                  }}
                >
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Audio Recorder</Text>

                {/* Brightness permission indicator */}
                {brightnessPermission ? (
                  <View style={styles.brightnessIndicator}>
                    <Ionicons name="sunny" size={20} color="#FFA500" />
                  </View>
                ) : (
                  <View style={styles.placeholder} />
                )}
              </View>
            )}

            {/* Status Container */}
            {!isScreenBlackedOut && (
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

                    {/* Timer Display */}
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
                    <Text style={styles.subText}>High-quality audio with background recording & stealth mode</Text>

                    {/* Brightness status */}
                    {!brightnessPermission && (
                      <View style={styles.brightnessWarning}>
                        <Ionicons name="warning" size={16} color="#FFA500" />
                        <Text style={styles.brightnessWarningText}>
                          Limited stealth mode - brightness control unavailable
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Record Button Container */}
            {!isScreenBlackedOut && (
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
                  {isPaused ? t('audioRecorder.tapToResume') : recorderState.isRecording ? t('audioRecorder.tapToStopAndSave') : t('audioRecorder.tapToStartRecording')}
                </Text>

                {/* Control buttons */}
                <View style={styles.controlButtons}>
                  {/* Pause/Resume Button */}
                  {recorderState.isRecording && (
                    <TouchableOpacity
                      style={styles.pauseButton}
                      onPress={isPaused ? resumeRecording : pauseRecording}
                    >
                      <Ionicons name={isPaused ? "play" : "pause"} size={24} color="white" />
                      <Text style={styles.pauseButtonText}>{isPaused ? t('audioRecorder.resume') : t('audioRecorder.pause')}</Text>
                    </TouchableOpacity>
                  )}

                  {/* Stealth Mode Button */}
                  <TouchableOpacity
                    style={styles.stealthButton}
                    onPress={blackOutScreen}
                  >
                    <View style={styles.stealthButtonContent}>
                      <Ionicons name="moon" size={24} color="white" />
                      {brightnessPermission && (
                        <View style={styles.brightnessIcon}>
                          <Ionicons name="sunny" size={12} color="#FFA500" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.stealthButtonText}>
                      {brightnessPermission ? t('audioRecorder.stealthMode') : t('audioRecorder.screenOff')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </SafeAreaView>

          {/* Enhanced blackout overlay */}
          {isScreenBlackedOut && (
            <View style={styles.blackoutOverlay}>
              <View style={styles.screenBezel}>
                {/* Top notch/speaker area */}
                <View style={styles.topNotch}>
                  <View style={styles.speaker} />
                  <View style={styles.frontCamera} />
                </View>

                {/* Main black screen area */}
                <View style={styles.blackScreen}>
                  {/* Subtle recording indicator */}
                  {recorderState.isRecording && (
                    <View style={styles.subtleRecordingIndicator}>
                      <View style={[styles.subtleDot, isPaused && { backgroundColor: '#666' }]} />
                      {!isPaused && (
                        <Text style={styles.subtleText}>{t('audioRecorder.rec')}</Text>
                      )}
                    </View>
                  )}

                  {/* Restore instructions */}
                  <View style={styles.restoreInstructions}>
                    <Text style={styles.subtleText}>
                      {t('audioRecorder.restoreInstructions')}
                    </Text>
                    {brightnessPermission && (
                      <Text style={styles.subtleText}>
                        {t('audioRecorder.enhancedStealthActive')}
                      </Text>
                    )}
                    {isPaused && (
                      <Text style={styles.subtleText}>
                        {t('audioRecorder.recordingPaused')}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Bottom home indicator */}
                <View style={styles.homeIndicator} />
              </View>
            </View>
          )}
        </LinearGradient>
      </GestureDetector>
    </GestureHandlerRootView>
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
  brightnessWarningText: {
    textAlign: 'center',
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFA500',
    lineHeight: 20,
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
  brightnessIndicator: {
    padding: 10,
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
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
    paddingHorizontal: 20,
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
    marginTop: 15,
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
    boxShadow: '0 10px 20px rgba(255, 107, 107, 1)',
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
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 15,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  pauseButtonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  stealthButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
    position: 'relative',
  },
  stealthButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  brightnessIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 2,
  },
  stealthButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff0000',
    opacity: 0.5,
    marginRight: 4,
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

export default AudioRecorderScreen;