import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    Keyboard,
    ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const UserInfoScreen = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [userInfo, setUserInfo] = useState({
        name: '',
        email: '',
        phone: '',
    });
    const [medicalInfo, setMedicalInfo] = useState({
        bloodGroup: '',
        allergies: '',
        medications: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
    });

    // --- Load saved info from the database via API ---
    useEffect(() => {
        const loadInfo = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/user-info');
                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }
                const data = await response.json();
                setUserInfo(data.userInfo);
                setMedicalInfo(data.medicalInfo);
            } catch (error) {
                console.error('Failed to load user info from server.', error);
                Alert.alert('Error', 'Could not load your information.');
            } finally {
                setIsLoading(false);
            }
        };
        loadInfo();
    }, []);

    const handleUserInfoChange = (field, value) => {
        setUserInfo(prev => ({ ...prev, [field]: value }));
    };

    const handleMedicalInfoChange = (field, value) => {
        setMedicalInfo(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        Keyboard.dismiss();
        try {
            const response = await fetch('/api/user-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userInfo, medicalInfo }),
            });
            if (!response.ok) {
                throw new Error('Failed to save data');
            }
            Alert.alert('Saved!', 'Your information has been updated.');
        } catch (error) {
            console.error('Failed to save user info.', error);
            Alert.alert('Error', 'Could not save your information.');
        }
    };

    const handleShare = async () => {
        // In a real app, this would trigger a backend process to SMS the emergency contact
        Alert.alert(
            'Share Information',
            `This will send your details to ${medicalInfo.emergencyContactName || 'your emergency contact'}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Share', onPress: () => console.log('Sharing info...') },
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>Loading Your Info...</Text>
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'User & Medical Info',
                    headerShown: true,
                }}
            />
            <ScrollView>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={userInfo.name}
                            onChangeText={text => handleUserInfoChange('name', text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            value={userInfo.email}
                            onChangeText={text => handleUserInfoChange('email', text)}
                            keyboardType="email-address"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            value={userInfo.phone}
                            onChangeText={text => handleUserInfoChange('phone', text)}
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Medical Information</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.input}
                            placeholder="Blood Group (e.g., O+)"
                            value={medicalInfo.bloodGroup}
                            onChangeText={text => handleMedicalInfoChange('bloodGroup', text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Allergies"
                            value={medicalInfo.allergies}
                            onChangeText={text => handleMedicalInfoChange('allergies', text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Current Medications"
                            value={medicalInfo.medications}
                            onChangeText={text =>
                                handleMedicalInfoChange('medications', text)
                            }
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Emergency Contact</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.input}
                            placeholder="Emergency Contact Name"
                            value={medicalInfo.emergencyContactName}
                            onChangeText={text =>
                                handleMedicalInfoChange('emergencyContactName', text)
                            }
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Emergency Contact Phone"
                            value={medicalInfo.emergencyContactPhone}
                            onChangeText={text =>
                                handleMedicalInfoChange('emergencyContactPhone', text)
                            }
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>


                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Information</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Feather name="share-2" size={20} color="white" />
                    <Text style={styles.shareButtonText}>Share with Emergency Contact</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    section: {
        marginBottom: 24,
        marginHorizontal: 16,
        marginTop: 10
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6D6D72',
        marginBottom: 8,
        paddingLeft: 12,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
    },
    input: {
        height: 50,
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 10,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
        marginHorizontal: 16,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    shareButton: {
        flexDirection: 'row',
        backgroundColor: '#34C759',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 20,
    },
    shareButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
});

export default UserInfoScreen;
