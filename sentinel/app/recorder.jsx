import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Button } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';

const EvidenceRecorderScreen = () => {
  const router = useRouter();
  const [facing, setFacing] = useState('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);

  // --- Modern Permission Hooks ---
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();

  // --- Request all necessary permissions on load ---
  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!microphonePermission?.granted) requestMicrophonePermission();
    if (!mediaLibraryPermission?.granted) requestMediaLibraryPermission();
  }, []);

  // --- Timer Logic ---
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setRecordingDuration(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRecording]);

  // --- Handlers ---
  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setIsRecording(true);
    try {
      const videoRecordPromise = cameraRef.current.recordAsync({ quality: '720p' });
      if (videoRecordPromise) {
        const data = await videoRecordPromise;
        await MediaLibrary.saveToLibraryAsync(data.uri);
        Alert.alert("Video Saved", "Your evidence has been saved to your photo library.");
      }
    } catch (error) {
      console.error("Error recording or saving video: ", error);
      if (!error.message.includes('Recording was stopped')) {
        Alert.alert("Error", "Could not record or save the video.");
      }
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
  };

  const handleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // --- Permission Loading/Denied States ---
  if (!cameraPermission || !microphonePermission || !mediaLibraryPermission) {
    return <View style={styles.container} />; // Permissions are still loading
  }

  if (!cameraPermission.granted || !microphonePermission.granted || !mediaLibraryPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionMessage}>We need full access to your camera, microphone, and media library to record evidence.</Text>
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
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
      
      <View style={styles.controlsContainer}>
        <View style={styles.topControls}>
          {isRecording && <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>}
        </View>
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
             <Ionicons name="close" size={35} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.recordButton} 
            onPress={handleRecording}
          >
            <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse" size={35} color="white" />
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
  timerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
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
