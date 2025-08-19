import React, {useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Button } from 'react-native';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';

const EvidenceRecorderScreen = () => {
  const router = useRouter();
  const [facing, setFacing] = useState('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false); // <-- New state to disable button
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const [microphonePermission, setMicrophonePermission] = useState(null);

  useEffect(() => {
    (async () => {
        await requestCameraPermission();
        await requestMediaLibraryPermission();
        const microphoneStatus = await Camera.requestMicrophonePermissionsAsync();
        setMicrophonePermission(microphoneStatus.status === 'granted');
    })();
  }, []);

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

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  const handleRecording = async () => {
    if (!cameraRef.current) return;

    if (isRecording) {
      // --- Stop Recording ---
      cameraRef.current.stopRecording();
      setIsRecording(false);
    } else {
      // --- Start Recording ---
      setIsRecording(true);
      setIsButtonDisabled(true); // Disable the button immediately
      setTimeout(() => setIsButtonDisabled(false), 1000); // Re-enable after 1 second

      try {
        const videoRecordPromise = cameraRef.current.recordAsync({ quality: '720p' });
        if (videoRecordPromise) {
          const data = await videoRecordPromise;
          await MediaLibrary.saveToLibraryAsync(data.uri);
          Alert.alert("Video Saved", "Your evidence has been saved to your photo library.");
        }
      } catch (error) {
        console.error("Error recording video: ", error);
        // Don't show an alert for this specific timing error
        if (!error.message.includes('Recording was stopped before any data could be produced')) {
          Alert.alert("Error", "Could not save the video.");
        }
      } finally {
        setIsRecording(false);
      }
    }
  };

  if (!cameraPermission || !mediaLibraryPermission || microphonePermission === null) {
    return <View />;
  }

  if (!cameraPermission.granted || !mediaLibraryPermission.granted || !microphonePermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionMessage}>We need your permission to access the camera, microphone, and media library.</Text>
        <Button onPress={async () => {
            await requestCameraPermission();
            await requestMediaLibraryPermission();
            const micStatus = await Camera.requestMicrophonePermissionsAsync();
            setMicrophonePermission(micStatus.status === 'granted');
        }} title="Grant Permissions" />
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
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
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
            disabled={isButtonDisabled} // <-- Disable button when needed
          >
            <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse" size={35} color="white" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1, justifyContent: 'space-between' },
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
