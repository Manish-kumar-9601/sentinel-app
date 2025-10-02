import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    
    Keyboard,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
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

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship?: string;
    isPrimary?: boolean;
    createdAt?: string;
}

interface ApiResponse {
    userInfo: UserInfo;
    medicalInfo: MedicalInfo;
    emergencyContacts: EmergencyContact[];
    lastUpdated: string;
}

interface CachedData extends ApiResponse {
    cacheTimestamp: string;
}

const CACHE_KEY = 'user_info_cache';
const CONTACTS_CACHE_KEY = 'emergency_contacts_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

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
    const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    // Check if cached data is still valid
    const isCacheValid = (cacheTimestamp: string): boolean => {
        const now = new Date().getTime();
        const cacheTime = new Date(cacheTimestamp).getTime();
        return (now - cacheTime) < CACHE_EXPIRY;
    };

    // Load data from cache
    const loadFromCache = async (): Promise<CachedData | null> => {
        try {
            const cachedData = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedData) {
                const parsed: CachedData = JSON.parse(cachedData);
                console.log('Loaded data from cache:', parsed.cacheTimestamp);
                return parsed;
            }
        } catch (error) {
            console.error('Failed to load cache:', error);
        }
        return null;
    };

    // Save data to cache
    const saveToCache = async (data: ApiResponse): Promise<void> => {
        try {
            const cacheData: CachedData = {
                ...data,
                cacheTimestamp: new Date().toISOString()
            };
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            
            // Also sync contacts with the old contacts storage for backward compatibility
            await AsyncStorage.setItem('emergency_contacts', JSON.stringify(data.emergencyContacts));
            console.log('Data saved to cache');
        } catch (error) {
            console.error('Failed to save to cache:', error);
        }
    };

    // Load saved info from API or cache
    const loadInfo = useCallback(async (forceRefresh = false, showLoader = true) => {
        try {
            if (showLoader) setIsLoading(true);
            
            // Try to load from cache first if not forcing refresh
            if (!forceRefresh) {
                const cachedData = await loadFromCache();
                if (cachedData && isCacheValid(cachedData.cacheTimestamp)) {
                    console.log('Using cached data');
                    setUserInfo(cachedData.userInfo);
                    setMedicalInfo(cachedData.medicalInfo);
                    setEmergencyContacts(cachedData.emergencyContacts || []);
                    setLastUpdated(cachedData.lastUpdated);
                    setHasUnsavedChanges(false);
                    if (showLoader) setIsLoading(false);
                    setIsRefreshing(false);
                    return;
                }
            }

            // Fetch from API if cache is invalid or force refresh
            console.log('Fetching fresh data from API');
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
                    console.log('No existing user data found - using defaults');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: ApiResponse = await response.json();
            
            // Set state with API data
            setUserInfo({
                name: data.userInfo?.name || '',
                email: data.userInfo?.email || '',
                phone: data.userInfo?.phone || '',
            });
            
            setMedicalInfo({
                bloodGroup: data.medicalInfo?.bloodGroup || '',
                allergies: data.medicalInfo?.allergies || '',
                medications: data.medicalInfo?.medications || '',
                emergencyContactName: data.medicalInfo?.emergencyContactName || '',
                emergencyContactPhone: data.medicalInfo?.emergencyContactPhone || '',
            });

            setEmergencyContacts(data.emergencyContacts || []);
            setLastUpdated(data.lastUpdated);
            setHasUnsavedChanges(false);

            // Save fresh data to cache
            await saveToCache(data);

        } catch (error) {
            console.error('Failed to load user info:', error);
            
            // Try to use cached data as fallback
            const cachedData = await loadFromCache();
            if (cachedData) {
                console.log('Using stale cached data as fallback');
                setUserInfo(cachedData.userInfo);
                setMedicalInfo(cachedData.medicalInfo);
                setEmergencyContacts(cachedData.emergencyContacts || []);
                setLastUpdated(cachedData.lastUpdated);
                Alert.alert(
                    'Using Offline Data', 
                    'Could not connect to server. Using your last saved information.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    'Error', 
                    'Could not load your information. Please check your internet connection and try again.',
                    [
                        { text: 'Retry', onPress: () => loadInfo(forceRefresh, showLoader) },
                        { text: 'Cancel', style: 'cancel' }
                    ]
                );
            }
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
        loadInfo(true, false); // Force refresh, don't show main loader
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
                    phone: userInfo.phone.trim() || null,
                }, 
                medicalInfo: {
                    bloodGroup: medicalInfo.bloodGroup.trim() || null,
                    allergies: medicalInfo.allergies.trim() || null,
                    medications: medicalInfo.medications.trim() || null,
                    emergencyContactName: medicalInfo.emergencyContactName.trim() || null,
                    emergencyContactPhone: medicalInfo.emergencyContactPhone.trim() || null,
                },
                emergencyContacts: emergencyContacts.map(contact => ({
                    id: contact.id,
                    name: contact.name,
                    phone: contact.phone,
                    relationship: contact.relationship,
                    isPrimary: contact.isPrimary,
                    createdAt: contact.createdAt
                }))
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
            setLastUpdated(result.lastUpdated);
            
            // Update cache after successful save
            const updatedData: ApiResponse = {
                userInfo,
                medicalInfo,
                emergencyContacts,
                lastUpdated: result.lastUpdated
            };
            await saveToCache(updatedData);
            
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

    // Clear cache function for debugging
    const clearCache = async () => {
        try {
            await AsyncStorage.removeItem(CACHE_KEY);
            await AsyncStorage.removeItem('emergency_contacts');
            Alert.alert('Cache Cleared', 'Local cache has been cleared.');
            loadInfo(true);
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
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
                {lastUpdated && (
                    <View style={styles.syncStatus}>
                        <Ionicons name="sync" size={12} color="#666" />
                        <Text style={styles.syncText}>
                            Last synced: {new Date(lastUpdated).toLocaleString()}
                        </Text>
                        {/* Debug button - remove in production */}
                        <TouchableOpacity onPress={clearCache} style={styles.debugButton}>
                            <Text style={styles.debugButtonText}>Clear Cache</Text>
                        </TouchableOpacity>
                    </View>
                )}

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

                {emergencyContacts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Saved Emergency Contacts ({emergencyContacts.length})</Text>
                        <View style={styles.card}>
                            {emergencyContacts.map((contact, index) => (
                                <View key={contact.id} style={styles.contactItem}>
                                    <View style={styles.contactAvatar}>
                                        <Text style={styles.contactAvatarText}>{contact.name.charAt(0)}</Text>
                                    </View>
                                    <View style={styles.contactInfo}>
                                        <Text style={styles.contactName}>{contact.name}</Text>
                                        <Text style={styles.contactPhone}>{contact.phone}</Text>
                                        {contact.relationship && (
                                            <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                                        )}
                                    </View>
                                    {contact.isPrimary && (
                                        <View style={styles.primaryBadge}>
                                            <Text style={styles.primaryBadgeText}>Primary</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

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
    syncStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#F8F8F8',
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 5,
    },
    syncText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
        flex: 1,
    },
    debugButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#FF3B30',
        borderRadius: 4,
    },
    debugButtonText: {
        fontSize: 10,
        color: 'white',
        fontWeight: 'bold',
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
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
        marginBottom: 8,
    },
    contactAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contactAvatarText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    contactPhone: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    contactRelationship: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
        fontStyle: 'italic',
    },
    primaryBadge: {
        backgroundColor: '#34C759',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    primaryBadgeText: {
        fontSize: 10,
        color: 'white',
        fontWeight: 'bold',
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