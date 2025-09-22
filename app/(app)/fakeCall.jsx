import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// --- Configuration ---
const FAKE_CALLER_NAME_KEY = 'fake_caller_name';
const FAKE_CALLER_NUMBER_KEY = 'fake_caller_number';
const DEFAULT_CALLER_NAME = 'Work';
const DEFAULT_CALLER_NUMBER = '+91 9601727836';

// --- Reusable UI Component for the control buttons ---
const ControlButton = ({ icon, label, onPress, iconComponent: Icon = MaterialCommunityIcons, disabled }) => (
    <TouchableOpacity style={styles.control} onPress={onPress} disabled={disabled}>
        <View style={[styles.controlIconCircle, disabled && styles.disabledControl]}>
            <Icon name={icon} size={32} color="white" />
        </View>
        {label && <Text style={styles.controlLabel}>{label}</Text>}
    </TouchableOpacity>
);

const FakeCallScreen = () => {
    const navigation = useNavigation();
    const router = useRouter();
    const [callerName, setCallerName] = useState(DEFAULT_CALLER_NAME);
    const [callerNumber, setCallerNumber] = useState(DEFAULT_CALLER_NUMBER);
    const [callDuration, setCallDuration] = useState(0);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            console.log('beforeRemove event triggered. Cleaning up...');
            if (recording && isRecording) {
                stopRecording();
            }
            // Don't prevent navigation, just clean up
        });

        // Cleanup function for component unmount
        return () => {
            unsubscribe();
            if (recording && isRecording) {
                recording.stopAndUnloadAsync().catch(console.error);
            }
        };
    }, [recording, isRecording]);

    // --- Load Caller Info and Start Recording ---
    useEffect(() => {
        let mounted = true;
        
        const loadCallerInfo = async () => {
            try {
                const storedName = await AsyncStorage.getItem(FAKE_CALLER_NAME_KEY);
                if (storedName && mounted) setCallerName(storedName);

                const storedNumber = await AsyncStorage.getItem(FAKE_CALLER_NUMBER_KEY);
                if (storedNumber && mounted) setCallerNumber(storedNumber);
            } catch (error) {
                console.error("Failed to load caller info", error);
            }
        };

        const initializeRecording = async () => {
            await loadCallerInfo();
            if (mounted) {
                startRecording();
            }
        };

        initializeRecording();

        // Cleanup function
        return () => {
            mounted = false;
        };
    }, []); // Remove startRecording from dependency array

    // --- Start Call Timer ---
    useEffect(() => {
        const timerInterval = setInterval(() => {
            setCallDuration(prevDuration => prevDuration + 1);
        }, 1000);

        // Cleanup function to clear the interval when the component unmounts
        return () => clearInterval(timerInterval);
    }, []);

    async function startRecording() {
        try {
            // Don't start if already recording or if recording object exists
            if (isRecording || recording) {
                console.log('Recording already in progress or recording object exists');
                return;
            }

            console.log('Requesting permissions..');
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Microphone permission is required to record audio.');
                return;
            }

            console.log('Setting audio mode..');
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Creating recording..');
            const newRecording = new Audio.Recording();
            await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await newRecording.startAsync();
            
            setRecording(newRecording);
            setIsRecording(true);
            console.log('Recording started successfully');
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Recording Error', 'Failed to start recording: ' + err.message);
        }
    }

    async function stopRecording() {
        if (!recording) {
            console.log('No recording to stop');
            return;
        }

        try {
            console.log('Stopping recording..');
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            console.log('Recording stopped and stored at', uri);
            setRecording(null);
            
            if (uri) {
                saveRecordingToLibrary(uri);
            }
        } catch (error) {
            console.error('Error stopping recording:', error);
        }
    }

    const saveRecordingToLibrary = async (uri) => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Media Library permission is required to save the recording.');
                return;
            }
            
            const asset = await MediaLibrary.createAssetAsync(uri);
            console.log('Recording saved:', asset);
            Alert.alert('Recording Saved', 'Your call recording has been saved to your media library.');
        } catch (error) {
            console.error('Failed to save recording to media library', error);
            Alert.alert('Save Error', 'Failed to save recording: ' + error.message);
        }
    };

    const handleEndCall = async () => {
        if (recording && isRecording) {
            await stopRecording();
        }
        router.push('/');
    };

    const handleDummyAction = () => {
        console.log("Control button pressed");
    };

    // --- Helper function to format the timer ---
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return (
        <View style={styles.container}>
            {/* --- Caller Info --- */}
            <View style={styles.callerInfoContainer}>
                <Text style={styles.callerName}>{callerName}</Text>
                <Text style={styles.callerNumber}>{callerNumber}</Text>
                <Text style={styles.callerLocation}>India</Text>
                {/* --- Call Timer --- */}
                <View style={styles.callStatusContainer}>
                    <Text style={styles.callStatus}>{formatTime(callDuration)}</Text>
                    {isRecording && <View style={styles.recordingIndicator} />}
                </View>
            </View>

            {/* --- Control Grid --- */}
            <View style={styles.controlsGrid}>
                <ControlButton 
                    icon="record-circle-outline" 
                    label="Record" 
                    onPress={handleDummyAction} 
                    disabled={!isRecording}
                />
                <ControlButton icon="pause" label="Hold" onPress={handleDummyAction} />
                <ControlButton icon="plus" label="Add call" onPress={handleDummyAction} />
                <ControlButton icon="microphone-off" label="Mute" onPress={handleDummyAction} />
                <ControlButton icon="video-outline" label="Video call" onPress={handleDummyAction} />
            </View>

            {/* --- Main Action Buttons --- */}
            <View style={styles.mainActionsContainer}>
                <ControlButton icon="volume-high" iconComponent={Ionicons} onPress={handleDummyAction} />
                <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
                    <MaterialCommunityIcons name="phone-hangup" size={32} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.control}>
                    <View style={styles.controlIconCircle}>
                        <Entypo name="dial-pad" size={32} color="white" />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030303ff',
        justifyContent: 'space-between',
        paddingTop: 100,
        paddingBottom: 60,
    },
    callerInfoContainer: {
        alignItems: 'flex-start',
        paddingHorizontal: 20,
    },
    callerName: {
        fontSize: 38,
        color: 'white',
        fontWeight: '400',
    },
    callerNumber: {
        fontSize: 20,
        color: '#ffffffff',
        marginTop: 8,
    },
    callerLocation: {
        fontSize: 16,
        color: '#b5b5b5ff',
        marginTop: 8,
    },
    callStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 32,
    },
    callStatus: {
        fontSize: 18,
        color: '#ffffffff',
    },
    recordingIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'red',
        marginLeft: 10,
    },
    controlsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        paddingHorizontal: 30,
        marginTop: 40,
    },
    control: {
        width: '33.33%',
        alignItems: 'center',
        marginBottom: 30,
    },
    controlIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledControl: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    controlLabel: {
        color: 'white',
        fontSize: 14,
        marginTop: 10,
    },
    mainActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 0,
    },
    endCallButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        marginBottom: 30,
        marginLeft: 5,
        marginRight: 5,
        backgroundColor: '#ff4e45ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default FakeCallScreen;