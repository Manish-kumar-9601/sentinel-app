import React, { useState, useEffect, useCallback } from 'react';
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
    RefreshControl,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';

interface UserInfo {
    name: string;
    email: string;
    phone: string;
}

interface MedicalInfo {
    bloodGroup: string;
    allergies: string;
    medications: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
}

interface ApiResponse {
    userInfo: UserInfo;
    medicalInfo: MedicalInfo;
}

const UserInfoScreen = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo>({
        name: '',
        email: '',
        phone: '',
    });
    const [medicalInfo, setMedicalInfo] = useState<MedicalInfo>({
        bloodGroup: '',
        allergies: '',
        medications: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
    });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Load saved info from the database via API
    const loadInfo = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setIsLoading(true);
            
            const response = await fetch('/api/user-info', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    Alert.alert('Authentication Error', 'Please log in again.');
                    return;
                } else if (response.status === 404) {
                    // User might not have any data yet - this is fine
                    console.log('No existing user data found - using defaults');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse = await response.json();
            
            // Safely set user info with fallbacks
            setUserInfo({
                name: data.userInfo?.name || '',
                email: data.userInfo?.email || '',
                phone: data.userInfo?.phone || '',
            });
            
            // Safely set medical info with fallbacks
            setMedicalInfo({
                bloodGroup: data.medicalInfo?.bloodGroup || '',
                allergies: data.medicalInfo?.allergies || '',
                medications: data.medicalInfo?.medications || '',
                emergencyContactName: data.medicalInfo?.emergencyContactName || '',
                emergencyContactPhone: data.medicalInfo?.emergencyContactPhone || '',
            });

            setHasUnsavedChanges(false);

        } catch (error) {
            console.error('Failed to load user info:', error);
            Alert.alert(
                'Error', 
                'Could not load your information. Please check your internet connection and try again.',
                [
                    { text: 'Retry', onPress: () => loadInfo(showLoader) },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } finally {
            if (showLoader) setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadInfo();
    }, [loadInfo]);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadInfo(false);
    }, [loadInfo]);

    const handleUserInfoChange = (field: keyof UserInfo, value: string) => {
        setUserInfo(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleMedicalInfoChange = (field: keyof MedicalInfo, value: string) => {
        setMedicalInfo(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const validateData = () => {
        const errors: string[] = [];

        // Basic validation
        if (!userInfo.name.trim()) {
            errors.push('Full name is required');
        }

        if (userInfo.email.trim() && !isValidEmail(userInfo.email)) {
            errors.push('Please enter a valid email address');
        }

        if (userInfo.phone.trim() && !isValidPhone(userInfo.phone)) {
            errors.push('Please enter a valid phone number');
        }

        if (medicalInfo.emergencyContactPhone.trim() && !isValidPhone(medicalInfo.emergencyContactPhone)) {
            errors.push('Please enter a valid emergency contact phone number');
        }

        // Check if emergency contact info is complete or both empty
        const hasEmergencyName = medicalInfo.emergencyContactName.trim();
        const hasEmergencyPhone = medicalInfo.emergencyContactPhone.trim();
        
        if ((hasEmergencyName && !hasEmergencyPhone) || (!hasEmergencyName && hasEmergencyPhone)) {
            errors.push('Please provide both emergency contact name and phone number, or leave both empty');
        }

        return errors;
    };

    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    };

    const isValidPhone = (phone: string) => {
        const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
        return phoneRegex.test(phone.trim());
    };

    const handleSave = async () => {
        Keyboard.dismiss();
        
        // Validate data before saving
        const validationErrors = validateData();
        if (validationErrors.length > 0) {
            Alert.alert('Validation Error', validationErrors.join('\n\n'));
            return;
        }

        try {
            setIsSaving(true);
            
            const payload = {
                userInfo: {
                    name: userInfo.name.trim(),
                    // Only include email if it's changed (since it might be readonly in some cases)
                    phone: userInfo.phone.trim() || null,
                }, 
                medicalInfo: {
                    bloodGroup: medicalInfo.bloodGroup.trim() || null,
                    allergies: medicalInfo.allergies.trim() || null,
                    medications: medicalInfo.medications.trim() || null,
                    emergencyContactName: medicalInfo.emergencyContactName.trim() || null,
                    emergencyContactPhone: medicalInfo.emergencyContactPhone.trim() || null,
                }
            };

            const response = await fetch('/api/user-info', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 401) {
                    Alert.alert('Authentication Error', 'Please log in again.');
                    return;
                }
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setHasUnsavedChanges(false);
            Alert.alert('Success!', 'Your information has been saved successfully.');
            
        } catch (error) {
            console.error('Failed to save user info:', error);
            Alert.alert(
                'Error', 
                `Could not save your information: ${error.message || 'Unknown error'}`,
                [
                    { text: 'Retry', onPress: handleSave },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleShare = async () => {
        // Check if emergency contact info is available
        if (!medicalInfo.emergencyContactName.trim() || !medicalInfo.emergencyContactPhone.trim()) {
            Alert.alert(
                'Missing Information',
                'Please add emergency contact information before sharing.',
                [
                    { text: 'Add Contact Info', onPress: () => {
                        // Could scroll to emergency contact section
                    }},
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
            return;
        }

        // Check if there's meaningful data to share
        const hasUserInfo = userInfo.name.trim();
        const hasMedicalInfo = medicalInfo.bloodGroup.trim() || 
                              medicalInfo.allergies.trim() || 
                              medicalInfo.medications.trim();

        if (!hasUserInfo && !hasMedicalInfo) {
            Alert.alert(
                'No Information to Share',
                'Please fill in your information before sharing.',
                [
                    { text: 'Fill Info', onPress: () => {
                        // Could focus on first empty field
                    }},
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
            return;
        }

        // Warn about unsaved changes
        if (hasUnsavedChanges) {
            Alert.alert(
                'Unsaved Changes',
                'You have unsaved changes. Do you want to save them before sharing?',
                [
                    { text: 'Share Without Saving', onPress: proceedWithShare },
                    { text: 'Save First', onPress: async () => {
                        await handleSave();
                        if (!hasUnsavedChanges) { // If save was successful
                            proceedWithShare();
                        }
                    }},
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } else {
            proceedWithShare();
        }
    };

    const proceedWithShare = () => {
        Alert.alert(
            'Share Information',
            `This will send your medical and emergency information to ${medicalInfo.emergencyContactName}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Share', 
                    onPress: async () => {
                        try {
                            // Here you would implement the actual sharing logic
                            // For example, call an API endpoint to send SMS
                            console.log('Sharing info to:', medicalInfo.emergencyContactName, medicalInfo.emergencyContactPhone);
                            Alert.alert('Shared!', 'Your information has been sent to your emergency contact.');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to share information. Please try again.');
                        }
                    }
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'User & Medical Info',
                        headerShown: true,
                    }}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading Your Information...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'User & Medical Info',
                    headerShown: true,
                }}
            />
            <ScrollView 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name *"
                            value={userInfo.name}
                            onChangeText={text => handleUserInfoChange('name', text)}
                            maxLength={100}
                            editable={!isSaving}
                        />
                        <TextInput
                            style={[styles.input, styles.readonlyInput]}
                            placeholder="Email Address"
                            value={userInfo.email}
                            editable={false}
                            selectTextOnFocus={false}
                        />
                        <Text style={styles.helperText}>Email cannot be changed here</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number (optional)"
                            value={userInfo.phone}
                            onChangeText={text => handleUserInfoChange('phone', text)}
                            keyboardType="phone-pad"
                            maxLength={20}
                            editable={!isSaving}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Medical Information</Text>
                    <View style={styles.card}>
                        <TextInput
                            style={styles.input}
                            placeholder="Blood Group (e.g., O+, A-, B+)"
                            value={medicalInfo.bloodGroup}
                            onChangeText={text => handleMedicalInfoChange('bloodGroup', text)}
                            maxLength={10}
                            editable={!isSaving}
                        />
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="Allergies (e.g., peanuts, shellfish, medications)"
                            value={medicalInfo.allergies}
                            onChangeText={text => handleMedicalInfoChange('allergies', text)}
                            multiline
                            numberOfLines={3}
                            maxLength={500}
                            textAlignVertical="top"
                            editable={!isSaving}
                        />
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            placeholder="Current Medications (include dosages)"
                            value={medicalInfo.medications}
                            onChangeText={text => handleMedicalInfoChange('medications', text)}
                            multiline
                            numberOfLines={3}
                            maxLength={500}
                            textAlignVertical="top"
                            editable={!isSaving}
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
                            onChangeText={text => handleMedicalInfoChange('emergencyContactName', text)}
                            maxLength={100}
                            editable={!isSaving}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Emergency Contact Phone"
                            value={medicalInfo.emergencyContactPhone}
                            onChangeText={text => handleMedicalInfoChange('emergencyContactPhone', text)}
                            keyboardType="phone-pad"
                            maxLength={20}
                            editable={!isSaving}
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    style={[
                        styles.saveButton, 
                        (isSaving || !hasUnsavedChanges) && styles.disabledButton
                    ]} 
                    onPress={handleSave}
                    disabled={isSaving || !hasUnsavedChanges}
                >
                    {isSaving ? (
                        <View style={styles.buttonContent}>
                            <ActivityIndicator size="small" color="white" style={{ marginRight: 10 }} />
                            <Text style={styles.saveButtonText}>Saving...</Text>
                        </View>
                    ) : (
                        <Text style={styles.saveButtonText}>
                            {hasUnsavedChanges ? 'Save Information' : 'Information Saved'}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.shareButton, isSaving && styles.disabledButton]} 
                    onPress={handleShare}
                    disabled={isSaving}
                >
                    <Feather name="share-2" size={20} color="white" />
                    <Text style={styles.shareButtonText}>Share with Emergency Contact</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F2F2F7' 
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6D6D72',
        textAlign: 'center',
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
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    input: {
        minHeight: 50,
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    readonlyInput: {
        backgroundColor: '#E5E5EA',
        color: '#6D6D72',
    },
    multilineInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    helperText: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: -8,
        marginBottom: 12,
        paddingLeft: 15,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        shadowColor: '#007AFF',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
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
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 20,
        shadowColor: '#34C759',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    shareButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
});

export default UserInfoScreen;