import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useUserInfo } from '@/hooks/useUserInfo';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function UserInfoScreen() {
    const { user, logout } = useAuth();
    const { data, loading, error, lastSync, refresh, save } = useUserInfo();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        bloodGroup: '',
        allergies: '',
        medications: '',
    });

    const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
    const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });
    const [showAddContact, setShowAddContact] = useState(false);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    useEffect(() => {
        if (data) {
            setFormData({
                name: data.userInfo.name || '',
                phone: data.userInfo.phone || '',
                bloodGroup: data.medicalInfo.bloodGroup || '',
                allergies: data.medicalInfo.allergies || '',
                medications: data.medicalInfo.medications || '',
            });
            setEmergencyContacts(data.emergencyContacts || []);
            setSyncError(null);
        }
    }, [data]);

    const handleFieldChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const validateContact = (contact: any) => {
        const errors: string[] = [];
        
        if (!contact.name || !contact.name.trim()) {
            errors.push('Name is required');
        }
        
        if (!contact.phone || !contact.phone.trim()) {
            errors.push('Phone number is required');
        } else if (!/^\d{10}$|^\+\d{1,15}$|^\(\d{3}\)\s\d{3}-\d{4}$/.test(contact.phone.trim())) {
            errors.push('Please enter a valid phone number');
        }
        
        return errors;
    };

    const handleAddContact = () => {
        const errors = validateContact(newContact);
        
        if (errors.length > 0) {
            Alert.alert('Validation Error', errors.join('\n'));
            return;
        }

        try {
            if (editingContactId) {
                setEmergencyContacts(prev =>
                    prev.map(c =>
                        c.id === editingContactId
                            ? { 
                                ...c, 
                                name: newContact.name.trim(),
                                phone: newContact.phone.trim(),
                                relationship: newContact.relationship.trim() || '',
                                updatedAt: new Date().toISOString()
                              }
                            : c
                    )
                );
                setEditingContactId(null);
            } else {
                const contact = {
                    id: `temp_${Date.now()}_${Math.random()}`,
                    name: newContact.name.trim(),
                    phone: newContact.phone.trim(),
                    relationship: newContact.relationship.trim() || '',
                    createdAt: new Date().toISOString(),
                };
                setEmergencyContacts(prev => [...prev, contact]);
            }

            setNewContact({ name: '', phone: '', relationship: '' });
            setShowAddContact(false);
            setHasChanges(true);
        } catch (error) {
            console.error('Error adding contact:', error);
            Alert.alert('Error', 'Failed to add contact. Please try again.');
        }
    };

    const handleEditContact = (contact: any) => {
        setNewContact({
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship || '',
        });
        setEditingContactId(contact.id);
        setShowAddContact(true);
    };

    const handleDeleteContact = (id: string) => {
        Alert.alert(
            'Delete Contact',
            'Are you sure you want to remove this emergency contact?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    onPress: () => {
                        setEmergencyContacts(prev => prev.filter(c => c.id !== id));
                        setHasChanges(true);
                    },
                    style: 'destructive',
                },
            ]
        );
    };

    const handleSave = async () => {
        // Validate all contacts before saving
        const invalidContacts = emergencyContacts.filter(contact => {
            const errors = validateContact(contact);
            return errors.length > 0;
        });

        if (invalidContacts.length > 0) {
            Alert.alert(
                'Invalid Contacts',
                'Please fix the following contacts before saving:\n' + 
                invalidContacts.map(c => `- ${c.name || 'Unnamed'}`).join('\n')
            );
            return;
        }

        setIsSaving(true);
        setSyncError(null);

        try {
            // Prepare emergency contacts for database
            const contactsForDb = emergencyContacts.map(contact => ({
                id: contact.id,
                name: contact.name,
                phone: contact.phone,
                relationship: contact.relationship || '',
                createdAt: contact.createdAt || new Date().toISOString(),
            }));

            // Call the save function from the hook
            const result = await save({
                userInfo: {
                    name: formData.name,
                    email: data?.userInfo.email || '',
                    phone: formData.phone,
                },
                medicalInfo: {
                    bloodGroup: formData.bloodGroup,
                    allergies: formData.allergies,
                    medications: formData.medications,
                    emergencyContactName: '',
                    emergencyContactPhone: '',
                },
                emergencyContacts: contactsForDb,
                lastUpdated: new Date().toISOString(),
            });

            if (result.success) {
                Alert.alert('Success', 'Your information has been saved');
                setHasChanges(false);
                // Refresh data from server
                refresh(true);
            } else {
                const errorMsg = result.error || 'Failed to save information';
                setSyncError(errorMsg);
                Alert.alert('Error', errorMsg);
            }
        } catch (error: any) {
            const errorMsg = error.message || 'An unexpected error occurred';
            console.error('Save error:', error);
            setSyncError(errorMsg);
            Alert.alert('Error', errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearCache = async () => {
        Alert.alert(
            'Refresh Data',
            'This will reload your data from the server.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Refresh',
                    onPress: () => {
                        refresh(true);
                        setSyncError(null);
                    },
                    style: 'default',
                },
            ]
        );
    };

    if (loading && !data) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading your information...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error && !data) {
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
                        style={[styles.retryButton, styles.logoutButton]}
                        onPress={logout}
                    >
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={() => refresh(true)} />
                }
            >
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerPressable} onPress={() => router.back()}>
                        <Feather name="chevron-left" size={24} color="#007AFF" />
                        <Text style={styles.headerTitle}>User & Medical Info</Text>
                    </TouchableOpacity>
                </View>

                {error && (
                    <View style={styles.errorBanner}>
                        <Feather name="alert-triangle" size={16} color="#FF3B30" />
                        <Text style={styles.errorBannerText}>{error}</Text>
                    </View>
                )}

                {syncError && (
                    <View style={styles.syncErrorBanner}>
                        <Feather name="alert-circle" size={16} color="#FF9500" />
                        <Text style={styles.syncErrorText}>{syncError}</Text>
                    </View>
                )}

                {lastSync && (
                    <Text style={styles.syncText}>
                        Last synced: {lastSync.toLocaleString()}
                    </Text>
                )}

                {/* Personal Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="user" size={20} color="#007AFF" />
                        <Text style={styles.sectionTitle}>Personal Information</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(value) => handleFieldChange('name', value)}
                            placeholder="Enter your name"
                            placeholderTextColor="#C7C7CC"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={data?.userInfo.email}
                            editable={false}
                            placeholderTextColor="#C7C7CC"
                        />
                        <Text style={styles.helperText}>Email cannot be changed</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.phoneInputContainer}>
                            <Text style={styles.phonePrefix}>+91</Text>
                            <TextInput
                                style={styles.phoneInput}
                                value={formData.phone}
                                onChangeText={(value) => handleFieldChange('phone', value)}
                                placeholder="9876543210"
                                keyboardType="phone-pad"
                                placeholderTextColor="#C7C7CC"
                            />
                        </View>
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
                        <TextInput
                            style={styles.input}
                            value={formData.bloodGroup}
                            onChangeText={(value) => handleFieldChange('bloodGroup', value)}
                            placeholder="e.g., O+, A-, B+"
                            placeholderTextColor="#C7C7CC"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Allergies</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput]}
                            value={formData.allergies}
                            onChangeText={(value) => handleFieldChange('allergies', value)}
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
                            value={formData.medications}
                            onChangeText={(value) => handleFieldChange('medications', value)}
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
                                <View key={contact.id} style={[
                                    styles.contactCard,
                                    index !== emergencyContacts.length - 1 && styles.contactCardBorder
                                ]}>
                                    <View style={styles.contactInfo}>
                                        <View style={styles.contactHeader}>
                                            <Text style={styles.contactName}>{contact.name}</Text>
                                            {contact.relationship && (
                                                <Text style={styles.relationship}>{contact.relationship}</Text>
                                            )}
                                        </View>
                                        <View style={styles.phoneRow}>
                                            <Feather name="phone" size={14} color="#007AFF" />
                                            <Text style={styles.contactPhone}>{contact.phone}</Text>
                                        </View>
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
                            setEditingContactId(null);
                            setNewContact({ name: '', phone: '', relationship: '' });
                            setShowAddContact(true);
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

                    <TouchableOpacity
                        style={[styles.button, styles.clearButton]}
                        onPress={handleClearCache}
                    >
                        <Feather name="refresh-cw" size={18} color="#007AFF" />
                        <Text style={[styles.buttonText, styles.clearButtonText]}>
                            Refresh Data
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Add/Edit Contact Modal */}
            <Modal
                visible={showAddContact}
                transparent
                animationType="slide"
                onRequestClose={() => {
                    setShowAddContact(false);
                    setEditingContactId(null);
                    setNewContact({ name: '', phone: '', relationship: '' });
                }}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => {
                            setShowAddContact(false);
                            setEditingContactId(null);
                            setNewContact({ name: '', phone: '', relationship: '' });
                        }}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {editingContactId ? 'Edit Contact' : 'New Contact'}
                        </Text>
                        <View style={{ width: 60 }} />
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={newContact.name}
                                onChangeText={(value) => setNewContact(prev => ({ ...prev, name: value }))}
                                placeholder="Enter name"
                                placeholderTextColor="#C7C7CC"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number *</Text>
                            <TextInput
                                style={styles.input}
                                value={newContact.phone}
                                onChangeText={(value) => setNewContact(prev => ({ ...prev, phone: value }))}
                                placeholder="Enter phone number"
                                keyboardType="phone-pad"
                                placeholderTextColor="#C7C7CC"
                            />
                            <Text style={styles.helperText}>10 digits or with country code</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Relationship</Text>
                            <TextInput
                                style={styles.input}
                                value={newContact.relationship}
                                onChangeText={(value) => setNewContact(prev => ({ ...prev, relationship: value }))}
                                placeholder="e.g., Mother, Spouse, Friend"
                                placeholderTextColor="#C7C7CC"
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={handleAddContact}
                        >
                            <Text style={styles.buttonText}>
                                {editingContactId ? 'Update Contact' : 'Add Contact'}
                            </Text>
                        </TouchableOpacity>
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
        paddingHorizontal: 20,
        marginTop: 10,
        fontSize: 12,
        color: '#8E8E93',
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
    syncErrorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: 12,
        margin: 15,
        borderRadius: 8,
        gap: 8,
    },
    syncErrorText: {
        flex: 1,
        color: '#FF9500',
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
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent',
        paddingLeft: 12,
    },
    phonePrefix: {
        fontSize: 16,
        fontWeight: '500',
        color: '#8E8E93',
        marginRight: 8,
    },
    phoneInput: {
        flex: 1,
        padding: 12,
        fontSize: 16,
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
    contactHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    relationship: {
        fontSize: 12,
        color: '#8E8E93',
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    contactPhone: {
        fontSize: 14,
        color: '#007AFF',
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
    clearButton: {
        backgroundColor: '#E5E5EA',
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    clearButtonText: {
        color: '#007AFF',
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        marginTop: 10,
    },
    logoutButtonText: {
        color: 'white',
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
});