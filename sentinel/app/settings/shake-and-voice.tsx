import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
// For the slider, you might need to install a community package:
// npx expo install @react-native-community/slider
import Slider from '@react-native-community/slider';


// Define keys for storing settings
const SHAKE_SETTINGS_KEY = 'shake_alert_settings';
const VOICE_SETTINGS_KEY = 'voice_alert_settings';

// --- Reusable UI Component for a settings row ---
const SettingsRow = ({ label, description, value, onValueChange, children }) => (
    <View style={styles.row}>
        <View style={styles.textContainer}>
            <Text style={styles.label}>{label}</Text>
            {description && <Text style={styles.description}>{description}</Text>}
        </View>
        <View style={styles.controlContainer}>
            {children ? children : <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#767577", true: "#4CAF50" }} thumbColor={value ? "#f4f3f4" : "#f4f3f4"} />}
        </View>
    </View>
);


export default function ShakeAndVoiceSettingsScreen() {
    // --- State for Shake-to-Alert ---
    const [isShakeEnabled, setIsShakeEnabled] = useState(false);
    const [shakeSensitivity, setShakeSensitivity] = useState(50); // A value from 0 to 100

    // --- State for Voice Activation ---
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [activationPhrase, setActivationPhrase] = useState("Hey Safety"); // This would be more complex in a real app

    // --- Load settings from storage when the component mounts ---
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Load shake settings
                const shakeSettingsJSON = await AsyncStorage.getItem(SHAKE_SETTINGS_KEY);
                if (shakeSettingsJSON) {
                    const { enabled, sensitivity } = JSON.parse(shakeSettingsJSON);
                    setIsShakeEnabled(enabled);
                    setShakeSensitivity(sensitivity);
                }

                // Load voice settings
                const voiceSettingsJSON = await AsyncStorage.getItem(VOICE_SETTINGS_KEY);
                if (voiceSettingsJSON) {
                    const { enabled } = JSON.parse(voiceSettingsJSON);
                    setIsVoiceEnabled(enabled);
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
                Alert.alert("Error", "Could not load your saved settings.");
            }
        };

        loadSettings();
    }, []);

    // --- Handlers to save settings when they change ---
    const handleShakeToggle = async (newValue) => {
        setIsShakeEnabled(newValue);
        saveShakeSettings({ enabled: newValue, sensitivity: shakeSensitivity });
        // In a real app, you would start or stop the accelerometer listener here
    };

    const handleSensitivityChange = (newValue) => {
        setShakeSensitivity(newValue);
    };
    
    const handleSensitivitySave = async (newValue) => {
        saveShakeSettings({ enabled: isShakeEnabled, sensitivity: newValue });
    };

    const handleVoiceToggle = async (newValue) => {
        setIsVoiceEnabled(newValue);
        saveVoiceSettings({ enabled: newValue });
         // In a real app, you would start or stop the voice recognition listener here
    };

    // --- Helper functions to persist settings ---
    const saveShakeSettings = async (settings) => {
        try {
            await AsyncStorage.setItem(SHAKE_SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error("Failed to save shake settings:", error);
        }
    };

    const saveVoiceSettings = async (settings) => {
        try {
            await AsyncStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error("Failed to save voice settings:", error);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="phone-portrait-outline" size={24} color="#333" />
                    <Text style={styles.sectionTitle}>Shake-to-Alert</Text>
                </View>
                <View style={styles.card}>
                    <SettingsRow
                        label="Enable Shake-to-Alert"
                        description="Trigger an SOS alert by shaking your phone vigorously."
                        value={isShakeEnabled}
                        onValueChange={handleShakeToggle}
                    />
                    {isShakeEnabled && (
                        <View style={styles.sliderContainer}>
                            <Text style={styles.label}>Sensitivity</Text>
                            <Slider
                                style={{ width: '100%', height: 40 }}
                                minimumValue={0}
                                maximumValue={100}
                                step={1}
                                value={shakeSensitivity}
                                onValueChange={handleSensitivityChange}
                                onSlidingComplete={handleSensitivitySave}
                                minimumTrackTintColor="#FF4500"
                                maximumTrackTintColor="#d3d3d3"
                                thumbTintColor="#FF4500"
                            />
                            <View style={styles.sliderLabels}>
                                <Text style={styles.sliderLabelText}>Low</Text>
                                <Text style={styles.sliderLabelText}>High</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="mic-outline" size={24} color="#333" />
                    <Text style={styles.sectionTitle}>Voice Activation</Text>
                </View>
                <View style={styles.card}>
                    <SettingsRow
                        label="Enable Voice Activation"
                        description={`Say "${activationPhrase}" to trigger an SOS alert.`}
                        value={isVoiceEnabled}
                        onValueChange={handleVoiceToggle}
                    />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    section: {
        marginTop: 20,
        marginHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingLeft: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1c1c1e',
        marginLeft: 10,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#EFEFF4',
    },
    textContainer: {
        flex: 1,
        paddingRight: 10,
    },
    label: {
        fontSize: 16,
        color: '#000',
    },
    description: {
        fontSize: 13,
        color: '#6e6e73',
        marginTop: 4,
    },
    controlContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    sliderContainer: {
        paddingVertical: 10,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 5,
    },
    sliderLabelText: {
        fontSize: 12,
        color: '#6e6e73',
    }
});
