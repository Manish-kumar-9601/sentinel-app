import { useAuth } from '@/context/AuthContext';
import { useUserInfo} from '@/hooks/useUserInfo';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SyncStatusBar } from '@/components/SyncStatusBar';
// Blood group options
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface UserInfo {
    name: string;
    email: string;
    phone?: string;
}

interface MedicalInfo {
    bloodGroup: string;
    allergies: string;
    medications: string;
}

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship?: string;
    createdAt?: string;
}

export default function UserInfoScreen() {
    const { user: authUser, logout } = useAuth();
    const {
        data: userInfoData,
        loading: isLoadingUserInfo,
        error: userInfoError,
        lastSync,
        isOnline,  
        refresh,
        save
    } = useUserInfo();

    // Loading and error states
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Form data
    const [userInfo, setUserInfo] = useState<UserInfo>({
        name: '',
        email: '',
        phone: '',
    });

    const [medicalInfo, setMedicalInfo] = useState<MedicalInfo>({
        bloodGroup: '',
        allergies: '',
        medications: '',
    });

    const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

    // Original data for comparison
    const [originalData, setOriginalData] = useState<any>(null);

    // Modal states
    const [showContactModal, setShowContactModal] = useState(false);
    const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
    const [showBloodGroupPicker, setShowBloodGroupPicker] = useState(false);

    // New contact form
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        relationship: '',
    });

    // Initialize data from hook when loaded
    useEffect(() => {
        console.log('📊 UserInfo screen - Data update:', {
            hasData: !!userInfoData,
            loading: isLoadingUserInfo,
            error: userInfoError,
            isInitialized
        });

        if (userInfoData && !isInitialized) {
            console.log('🎬 Initializing form with fetched data');
            const initialUserInfo = {
                name: userInfoData.userInfo.name || '',
                email: userInfoData.userInfo.email || '',
                phone: userInfoData.userInfo.phone || '',
            };
            const initialMedicalInfo = {
                bloodGroup: userInfoData.medicalInfo.bloodGroup || '',
                allergies: userInfoData.medicalInfo.allergies || '',
                medications: userInfoData.medicalInfo.medications || '',
            };
            const initialContacts = Array.isArray(userInfoData.emergencyContacts)
                ? userInfoData.emergencyContacts
                : [];

            setUserInfo(initialUserInfo);
            setMedicalInfo(initialMedicalInfo);
            setEmergencyContacts(initialContacts);
            setOriginalData({
                userInfo: initialUserInfo,
                medicalInfo: initialMedicalInfo,
                emergencyContacts: initialContacts,
            });
            setLastSyncTime(lastSync);
            setError(null);
            setIsInitialized(true);
            console.log('✅ Form initialized with data');
        }
    }, [userInfoData, isInitialized, lastSync]);

    // Update error state from hook
    useEffect(() => {
        if (userInfoError) {
            console.log('⚠️ Error from hook:', userInfoError);
            setError(userInfoError);
        }
    }, [userInfoError]);

    // Check for changes
    useEffect(() => {
        if (!originalData || !isInitialized) {
            setHasChanges(false);
            return;
        }

        const hasUserInfoChanges =
            userInfo.name !== originalData.userInfo.name ||
            userInfo.phone !== originalData.userInfo.phone;

        const hasMedicalChanges =
            medicalInfo.bloodGroup !== originalData.medicalInfo.bloodGroup ||
            medicalInfo.allergies !== originalData.medicalInfo.allergies ||
            medicalInfo.medications !== originalData.medicalInfo.medications;

        const hasContactChanges = JSON.stringify(emergencyContacts) !== JSON.stringify(originalData.emergencyContacts);

        const changed = hasUserInfoChanges || hasMedicalChanges || hasContactChanges;
        setHasChanges(changed);
    }, [userInfo, medicalInfo, emergencyContacts, originalData, isInitialized]);

    const handleRefresh = async () => {
        console.log('🔄 Manual refresh triggered');
        setIsRefreshing(true);
        setError(null);
        try {
            await refresh(true); // Force refresh
        } catch (err: any) {
            console.error('❌ Refresh failed:', err);
            setError('Failed to refresh data');
        } finally {
            setIsRefreshing(false);
        }
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!userInfo.name.trim()) {
            errors.push('Name is required');
        }

        if (userInfo.phone && !/^\+?\d{10,15}$/.test(userInfo.phone.replace(/[\s()-]/g, ''))) {
            errors.push('Invalid phone number format');
        }

        // Validate emergency contacts
        emergencyContacts.forEach((contact, index) => {
            if (!contact.name.trim()) {
                errors.push(`Contact ${index + 1}: Name is required`);
            }
            if (!contact.phone.trim() || !/^\+?\d{10,15}$/.test(contact.phone.replace(/[\s()-]/g, ''))) {
                errors.push(`Contact ${index + 1}: Valid phone number required`);
            }
        });

        return errors;
    };

    const handleSave = async () => {
        console.log('💾 Save button pressed');

        // Validate form
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            Alert.alert('Validation Error', validationErrors.join('\n'));
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const payload = {
                userInfo: {
                    name: userInfo.name.trim(),
                    email: userInfo.email,
                    phone: userInfo.phone?.trim() || undefined,
                },
                medicalInfo: {
                    bloodGroup: medicalInfo.bloodGroup.trim(),
                    allergies: medicalInfo.allergies.trim(),
                    medications: medicalInfo.medications.trim(),
                },
                emergencyContacts: emergencyContacts.map(contact => ({
                    id: contact.id,
                    name: contact.name.trim(),
                    phone: contact.phone.trim(),
                    relationship: contact.relationship?.trim() || '',
                    createdAt: contact.createdAt || new Date().toISOString(),
                })),
                lastUpdated: new Date().toISOString(),
            };

            console.log('📦 Saving payload:', {
                userName: payload.userInfo.name,
                contactsCount: payload.emergencyContacts.length
            });

            const result = await save(payload);

            if (result.success) {
                // Update original data to reflect saved state
                setOriginalData({
                    userInfo,
                    medicalInfo,
                    emergencyContacts,
                });
                setHasChanges(false);
                setLastSyncTime(new Date());

                // Show success message
                Alert.alert('Success', result.message || 'Your information has been saved successfully');

                console.log('✅ User info saved successfully');
            } else {
                throw new Error(result.error || 'Failed to save user information');
            }
        } catch (err: any) {
            console.error('❌ Error saving user info:', err);
            const errorMsg = err.message || 'Failed to save user information';
            setError(errorMsg);
            Alert.alert('Save Failed', errorMsg + '\n\nPlease try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddContact = () => {
        // Validate new contact
        if (!newContact.name.trim()) {
            Alert.alert('Validation Error', 'Contact name is required');
            return;
        }

        if (!newContact.phone.trim() || !/^\+?\d{10,15}$/.test(newContact.phone.replace(/[\s()-]/g, ''))) {
            Alert.alert('Validation Error', 'Please enter a valid phone number');
            return;
        }

        const contact: EmergencyContact = {
            id: editingContact?.id || `temp_${Date.now()}_${Math.random()}`,
            name: newContact.name.trim(),
            phone: newContact.phone.trim(),
            relationship: newContact.relationship.trim(),
            createdAt: editingContact?.createdAt || new Date().toISOString(),
        };

        if (editingContact) {
            // Update existing contact
            setEmergencyContacts(prev =>
                prev.map(c => c.id === editingContact.id ? contact : c)
            );
        } else {
            // Add new contact
            setEmergencyContacts(prev => [...prev, contact]);
        }

        // Reset form
        setNewContact({ name: '', phone: '', relationship: '' });
        setEditingContact(null);
        setShowContactModal(false);
    };

    const handleEditContact = (contact: EmergencyContact) => {
        setEditingContact(contact);
        setNewContact({
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship || '',
        });
        setShowContactModal(true);
    };

    const handleDeleteContact = (contactId: string) => {
        Alert.alert(
            'Delete Contact',
            'Are you sure you want to remove this emergency contact?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setEmergencyContacts(prev => prev.filter(c => c.id !== contactId));
                    },
                },
            ]
        );
    };

    // Loading state
    if (isLoadingUserInfo && !isInitialized) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading your information...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state (only if no data and there's an error)
    if (error && !isInitialized && !userInfoData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <Feather name="alert-circle" size={64} color="#FF3B30" />
                    <Text style={styles.errorTitle}>Failed to Load</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => refresh(true)}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: '#FF3B30', marginTop: 10 }]}
                        onPress={logout}
                    >
                        <Text style={styles.retryButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scrollView}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                    }
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.headerPressable}
                            onPress={() => {
                                if (hasChanges) {
                                    Alert.alert(
                                        'Unsaved Changes',
                                        'You have unsaved changes. Do you want to discard them?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Discard', style: 'destructive', onPress: () => router.back() },
                                        ]
                                    );
                                } else {
                                    router.back();
                                }
                            }}
                        >
                            <Feather name="chevron-left" size={24} color="#007AFF" />
                            <Text style={styles.headerTitle}>User & Medical Info</Text>
                        </TouchableOpacity>
                    </View>
                    <SyncStatusBar
                        lastSync={lastSync}
                        onRefresh={() => refresh(true)}
                    />

                    {/* Show offline warning if needed */}
                    {!isOnline && (
                        <View style={styles.offlineWarning}>
                            <Ionicons name="cloud-offline" size={16} color="#FF9500" />
                            <Text style={styles.offlineWarningText}>
                                You're offline. Changes will sync when online.
                            </Text>
                        </View>
                    )}

                    {/* Sync Status */}
                    {lastSyncTime && (
                        <View style={styles.syncStatus}>
                            <Feather name="check-circle" size={14} color="#34C759" />
                            <Text style={styles.syncText}>
                                Last synced: {lastSyncTime.toLocaleTimeString()}
                            </Text>
                        </View>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <View style={styles.errorBanner}>
                            <Feather name="alert-triangle" size={16} color="#FF3B30" />
                            <Text style={styles.errorBannerText}>{error}</Text>
                        </View>
                    )}

                    {/* Personal Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="user" size={20} color="#007AFF" />
                            <Text style={styles.sectionTitle}>Personal Information</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={userInfo.name}
                                onChangeText={(text) => setUserInfo(prev => ({ ...prev, name: text }))}
                                placeholder="Enter your name"
                                placeholderTextColor="#C7C7CC"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={[styles.input, styles.disabledInput]}
                                value={userInfo.email}
                                editable={false}
                                placeholderTextColor="#C7C7CC"
                            />
                            <Text style={styles.helperText}>Email cannot be changed</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                value={userInfo.phone}
                                onChangeText={(text) => setUserInfo(prev => ({ ...prev, phone: text }))}
                                placeholder="+91 9876543210"
                                keyboardType="phone-pad"
                                placeholderTextColor="#C7C7CC"
                            />
                        </View>
                    </View>

                    {/* Medical Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="heart" size={20} color="#FF3B30" />
                            <Text style={styles.sectionTitle}>Medical Information</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Blood Group</Text>
                            <TouchableOpacity
                                style={styles.pickerButton}
                                onPress={() => setShowBloodGroupPicker(true)}
                            >
                                <Text style={[styles.pickerButtonText, !medicalInfo.bloodGroup && styles.placeholderText]}>
                                    {medicalInfo.bloodGroup || 'Select blood group'}
                                </Text>
                                <Feather name="chevron-down" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Allergies</Text>
                            <TextInput
                                style={[styles.input, styles.multilineInput]}
                                value={medicalInfo.allergies}
                                onChangeText={(text) => setMedicalInfo(prev => ({ ...prev, allergies: text }))}
                                placeholder="e.g., peanuts, shellfish, medications"
                                multiline
                                numberOfLines={3}
                                placeholderTextColor="#C7C7CC"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Current Medications</Text>
                            <TextInput
                                style={[styles.input, styles.multilineInput]}
                                value={medicalInfo.medications}
                                onChangeText={(text) => setMedicalInfo(prev => ({ ...prev, medications: text }))}
                                placeholder="Include dosages"
                                multiline
                                numberOfLines={3}
                                placeholderTextColor="#C7C7CC"
                            />
                        </View>
                    </View>

                    {/* Emergency Contacts */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="phone" size={20} color="#34C759" />
                            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
                            <View style={styles.contactBadge}>
                                <Text style={styles.contactBadgeText}>{emergencyContacts.length}</Text>
                            </View>
                        </View>

                        {emergencyContacts.length > 0 ? (
                            <View style={styles.contactsList}>
                                {emergencyContacts.map((contact, index) => (
                                    <View
                                        key={contact.id}
                                        style={[
                                            styles.contactCard,
                                            index !== emergencyContacts.length - 1 && styles.contactCardBorder,
                                        ]}
                                    >
                                        <View style={styles.contactInfo}>
                                            <Text style={styles.contactName}>{contact.name}</Text>
                                            <Text style={styles.contactPhone}>{contact.phone}</Text>
                                            {contact.relationship && (
                                                <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                                            )}
                                        </View>
                                        <View style={styles.contactActions}>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleEditContact(contact)}
                                            >
                                                <Feather name="edit-2" size={16} color="#007AFF" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.deleteButton]}
                                                onPress={() => handleDeleteContact(contact.id)}
                                            >
                                                <Feather name="trash-2" size={16} color="#FF3B30" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.emptyText}>No emergency contacts added</Text>
                        )}

                        <TouchableOpacity
                            style={styles.addContactButton}
                            onPress={() => {
                                setEditingContact(null);
                                setNewContact({ name: '', phone: '', relationship: '' });
                                setShowContactModal(true);
                            }}
                        >
                            <Feather name="plus" size={18} color="#007AFF" />
                            <Text style={styles.addContactText}>Add Emergency Contact</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton, !hasChanges && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={!hasChanges || isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Feather name="save" size={18} color="white" />
                                    <Text style={styles.buttonText}>
                                        {hasChanges ? 'Save Changes' : 'No Changes'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Contact Modal */}
            <Modal
                visible={showContactModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowContactModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowContactModal(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {editingContact ? 'Edit Contact' : 'New Contact'}
                        </Text>
                        <View style={{ width: 60 }} />
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={newContact.name}
                                onChangeText={(text) => setNewContact(prev => ({ ...prev, name: text }))}
                                placeholder="Enter name"
                                placeholderTextColor="#C7C7CC"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number *</Text>
                            <TextInput
                                style={styles.input}
                                value={newContact.phone}
                                onChangeText={(text) => setNewContact(prev => ({ ...prev, phone: text }))}
                                placeholder="Enter phone number"
                                keyboardType="phone-pad"
                                placeholderTextColor="#C7C7CC"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Relationship</Text>
                            <TextInput
                                style={styles.input}
                                value={newContact.relationship}
                                onChangeText={(text) => setNewContact(prev => ({ ...prev, relationship: text }))}
                                placeholder="e.g., Mother, Spouse, Friend"
                                placeholderTextColor="#C7C7CC"
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleAddContact}>
                            <Text style={styles.buttonText}>
                                {editingContact ? 'Update Contact' : 'Add Contact'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Blood Group Picker Modal */}
            <Modal
                visible={showBloodGroupPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowBloodGroupPicker(false)}
            >
                <SafeAreaView style={styles.pickerModalContainer}>
                    <View style={styles.pickerModalContent}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Blood Group</Text>
                            <TouchableOpacity onPress={() => setShowBloodGroupPicker(false)}>
                                <Feather name="x" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {BLOOD_GROUPS.map((group) => (
                                <TouchableOpacity
                                    key={group}
                                    style={styles.pickerOption}
                                    onPress={() => {
                                        setMedicalInfo(prev => ({ ...prev, bloodGroup: group }));
                                        setShowBloodGroupPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerOptionText}>{group}</Text>
                                    {medicalInfo.bloodGroup === group && (
                                        <Feather name="check" size={20} color="#007AFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    scrollView: {
        flex: 1,
    },
    contactRelationship: {
        fontSize: 12,
        color: '#8E8E93',
        fontStyle: 'italic',
    },
    header: {
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        marginBottom: 10,
    },
    headerPressable: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    syncText: {
        fontSize: 12,
        color: '#34C759',
        marginLeft: 6,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#8E8E93',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFE5E5',
        padding: 12,
        margin: 15,
        borderRadius: 8,
        gap: 8,
    },
    errorBannerText: {
        flex: 1,
        color: '#FF3B30',
        fontSize: 14,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 5,
    },
    errorText: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    syncStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#F0F9FF',
        marginBottom: 10,
    },
    pickerModalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    pickerModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '50%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    pickerOptionText: {
        fontSize: 16,
        color: '#000',
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#000',
    },
    placeholderText: {
        color: '#C7C7CC',
    },
    section: {
        backgroundColor: 'white',
        padding: 20,
        marginTop: 15,
        borderRadius: 12,
        marginHorizontal: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        flex: 1,
    },
    contactBadge: {
        backgroundColor: '#34C759',
        borderRadius: 12,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        color: '#000',
    },
    input: {
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    multilineInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    disabledInput: {
        opacity: 0.6,
    },
    helperText: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 5,
    },
    contactsList: {
        marginBottom: 15,
    },
    contactCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    contactCardBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    contactPhone: {
        fontSize: 14,
        color: '#007AFF',
        marginTop: 4,
    },
    contactActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#F2F2F7',
    },
    deleteButton: {
        backgroundColor: '#FFE5E5',
    },
    emptyText: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        paddingVertical: 20,
    },
    addContactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#E5F1FF',
        borderRadius: 10,
        gap: 8,
        borderWidth: 1,
        borderColor: '#007AFF',
        borderStyle: 'dashed',
    },
    addContactText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
    },
    actions: {
        padding: 20,
        gap: 10,
        paddingBottom: 40,
    },
    button: {
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    saveButton: {
        backgroundColor: '#007AFF',
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 10,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    modalCancelText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    modalActions: {
        padding: 20,
        paddingBottom: 30,
    },
    offlineWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3CD',
        padding: 12,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 8,
        gap: 8,
    },
    offlineWarningText: {
        flex: 1,
        color: '#856404',
        fontSize: 13,
    },
});