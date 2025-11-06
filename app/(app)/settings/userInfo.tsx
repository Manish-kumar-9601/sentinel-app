import { SyncStatusBar } from '@/components/SyncStatusBar';
import { useAuth } from '@/context/AuthContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useUserInfo } from '@/hooks/useUserInfo';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const { user: authUser, logout } = useAuth();
    const { colors } = useThemedStyles();
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
            errors.push(t('userInfo.nameRequired'));
        }

        if (userInfo.phone && !/^\+?\d{10,15}$/.test(userInfo.phone.replace(/[\s()-]/g, ''))) {
            errors.push(t('userInfo.invalidPhone'));
        }

        // Validate emergency contacts
        emergencyContacts.forEach((contact, index) => {
            if (!contact.name.trim()) {
                errors.push(t('userInfo.contactNameRequired', { number: index + 1 }));
            }
            if (!contact.phone.trim() || !/^\+?\d{10,15}$/.test(contact.phone.replace(/[\s()-]/g, ''))) {
                errors.push(t('userInfo.contactPhoneRequired', { number: index + 1 }));
            }
        });

        return errors;
    };

    const handleSave = async () => {
        console.log('💾 Save button pressed');

        // Validate form
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            Alert.alert(t('userInfo.validationError'), validationErrors.join('\n'));
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
                Alert.alert(t('userInfo.success'), result.message || t('userInfo.saveSuccess'));

                console.log('✅ User info saved successfully');
            } else {
                throw new Error(result.error || t('userInfo.saveFailed'));
            }
        } catch (err: any) {
            console.error('❌ Error saving user info:', err);
            const errorMsg = err.message || t('userInfo.saveFailed');
            setError(errorMsg);
            Alert.alert(t('userInfo.saveFailed'), errorMsg + '\n\n' + t('userInfo.pleaseRetry'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddContact = () => {
        // Validate new contact
        if (!newContact.name.trim()) {
            Alert.alert(t('userInfo.validationError'), t('userInfo.contactNameRequired', { number: '' }).replace(':', '').trim());
            return;
        }

        if (!newContact.phone.trim() || !/^\+?\d{10,15}$/.test(newContact.phone.replace(/[\s()-]/g, ''))) {
            Alert.alert(t('userInfo.validationError'), t('userInfo.enterValidPhone'));
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
            t('userInfo.deleteContact'),
            t('userInfo.deleteContactMessage'),
            [
                { text: t('userInfo.cancel'), style: 'cancel' },
                {
                    text: t('userInfo.delete'),
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
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.info} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('userInfo.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state (only if no data and there's an error)
    if (error && !isInitialized && !userInfoData) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centerContainer}>
                    <Feather name="alert-circle" size={64} color={colors.error} />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>{t('userInfo.failedToLoad')}</Text>
                    <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
                    <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.info }]} onPress={() => refresh(true)}>
                        <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>{t('userInfo.tryAgain')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.error, marginTop: 10 }]}
                        onPress={logout}
                    >
                        <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>{t('userInfo.logout')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
                    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                        <TouchableOpacity
                            style={styles.headerPressable}
                            onPress={() => {
                                if (hasChanges) {
                                    Alert.alert(
                                        t('userInfo.unsavedChanges'),
                                        t('userInfo.unsavedChangesMessage'),
                                        [
                                            { text: t('userInfo.cancel'), style: 'cancel' },
                                            { text: t('userInfo.discard'), style: 'destructive', onPress: () => router.back() },
                                        ]
                                    );
                                } else {
                                    router.back();
                                }
                            }}
                        >
                            <Ionicons name="chevron-back" size={28} color={colors.navigatorColor} />

                            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('userInfo.title')}</Text>
                        </TouchableOpacity>
                    </View>
                    <SyncStatusBar
                        lastSync={lastSync}
                        onRefresh={() => refresh(true)}
                    />

                    {/* Show offline warning if needed */}
                    {!isOnline && (
                        <View style={[styles.offlineWarning, { backgroundColor: colors.warningLight }]}>
                            <Ionicons name="cloud-offline" size={16} color={colors.warning} />
                            <Text style={[styles.offlineWarningText, { color: colors.warning }]}>
                                {t('userInfo.offlineWarning')}
                            </Text>
                        </View>
                    )}

                    {/* Sync Status */}
                    {lastSyncTime && (
                        <View style={[styles.syncStatus, { backgroundColor: colors.successLight }]}>
                            <Feather name="check-circle" size={14} color={colors.success} />
                            <Text style={[styles.syncText, { color: colors.success }]}>
                                {t('userInfo.lastSynced')}: {lastSyncTime.toLocaleTimeString()}
                            </Text>
                        </View>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
                            <Feather name="alert-triangle" size={16} color={colors.error} />
                            <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
                        </View>
                    )}

                    {/* Personal Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="user" size={20} color={colors.info} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('userInfo.personalInfo')}</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('userInfo.fullName')} *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                value={userInfo.name}
                                onChangeText={(text) => setUserInfo(prev => ({ ...prev, name: text }))}
                                placeholder={t('userInfo.enterName')}
                                placeholderTextColor={colors.inputPlaceholder}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('userInfo.email')}</Text>
                            <TextInput
                                style={[styles.input, styles.disabledInput, { backgroundColor: colors.backgroundTertiary, color: colors.textTertiary, borderColor: colors.border }]}
                                value={userInfo.email}
                                editable={false}
                                placeholderTextColor={colors.inputPlaceholder}
                            />
                            <Text style={[styles.helperText, { color: colors.textTertiary }]}>{t('userInfo.emailCannotChange')}</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('userInfo.phone')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                value={userInfo.phone}
                                onChangeText={(text) => setUserInfo(prev => ({ ...prev, phone: text }))}
                                placeholder={t('userInfo.phonePlaceholder')}
                                keyboardType="phone-pad"
                                placeholderTextColor={colors.inputPlaceholder}
                            />
                        </View>
                    </View>

                    {/* Medical Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="heart" size={20} color={colors.error} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('userInfo.medicalInfo')}</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('userInfo.bloodGroup')}</Text>
                            <TouchableOpacity
                                style={[styles.pickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                onPress={() => setShowBloodGroupPicker(true)}
                            >
                                <Text style={[styles.pickerButtonText, { color: colors.text }, !medicalInfo.bloodGroup && [styles.placeholderText, { color: colors.inputPlaceholder }]]}>
                                    {medicalInfo.bloodGroup || t('userInfo.selectBloodGroup')}
                                </Text>
                                <Feather name="chevron-down" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('userInfo.allergies')}</Text>
                            <TextInput
                                style={[styles.input, styles.multilineInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                value={medicalInfo.allergies}
                                onChangeText={(text) => setMedicalInfo(prev => ({ ...prev, allergies: text }))}
                                placeholder={t('userInfo.allergiesPlaceholder')}
                                multiline
                                numberOfLines={3}
                                placeholderTextColor={colors.inputPlaceholder}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('userInfo.medications')}</Text>
                            <TextInput
                                style={[styles.input, styles.multilineInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                value={medicalInfo.medications}
                                onChangeText={(text) => setMedicalInfo(prev => ({ ...prev, medications: text }))}
                                placeholder={t('userInfo.medicationsPlaceholder')}
                                multiline
                                numberOfLines={3}
                                placeholderTextColor={colors.inputPlaceholder}
                            />
                        </View>
                    </View>

                    {/* Emergency Contacts */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="phone" size={20} color={colors.success} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('userInfo.emergencyContacts')}</Text>
                            <View style={[styles.contactBadge, { backgroundColor: colors.infoLight }]}>
                                <Text style={[styles.contactBadgeText, { color: colors.info }]}>{emergencyContacts.length}</Text>
                            </View>
                        </View>

                        {emergencyContacts.length > 0 ? (
                            <View style={styles.contactsList}>
                                {emergencyContacts.map((contact, index) => (
                                    <View
                                        key={contact.id}
                                        style={[
                                            styles.contactCard,
                                            { backgroundColor: colors.card, borderBottomColor: colors.border },
                                            index !== emergencyContacts.length - 1 && styles.contactCardBorder,
                                        ]}
                                    >
                                        <View style={styles.contactInfo}>
                                            <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                                            <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{contact.phone}</Text>
                                            {contact.relationship && (
                                                <Text style={[styles.contactRelationship, { color: colors.textTertiary }]}>{contact.relationship}</Text>
                                            )}
                                        </View>
                                        <View style={styles.contactActions}>
                                            <TouchableOpacity
                                                style={[styles.actionButton, { backgroundColor: colors.infoLight }]}
                                                onPress={() => handleEditContact(contact)}
                                            >
                                                <Feather name="edit-2" size={16} color={colors.info} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.deleteButton, { backgroundColor: colors.errorLight }]}
                                                onPress={() => handleDeleteContact(contact.id)}
                                            >
                                                <Feather name="trash-2" size={16} color={colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('userInfo.noContacts')}</Text>
                        )}

                        <TouchableOpacity
                            style={[styles.addContactButton, { backgroundColor: colors.infoLight, borderColor: colors.info }]}
                            onPress={() => {
                                setEditingContact(null);
                                setNewContact({ name: '', phone: '', relationship: '' });
                                setShowContactModal(true);
                            }}
                        >
                            <Feather name="plus" size={18} color={colors.info} />
                            <Text style={[styles.addContactText, { color: colors.info }]}>{t('userInfo.addContact')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton, { backgroundColor: colors.info }, !hasChanges && [styles.disabledButton, { backgroundColor: colors.backgroundTertiary }]]}
                            onPress={handleSave}
                            disabled={!hasChanges || isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={colors.textInverse} />
                            ) : (
                                <>
                                    <Feather name="save" size={18} color={colors.textInverse} />
                                    <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                                        {hasChanges ? t('userInfo.saveChanges') : t('userInfo.noChanges')}
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
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={() => setShowContactModal(false)}>
                            <Text style={[styles.modalCancelText, { color: colors.info }]}>{t('userInfo.cancel')}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {editingContact ? t('userInfo.editContact') : t('userInfo.newContact')}
                        </Text>
                        <View style={{ width: 60 }} />
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('userInfo.fullName')} *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                value={newContact.name}
                                onChangeText={(text) => setNewContact(prev => ({ ...prev, name: text }))}
                                placeholder={t('userInfo.enterName')}
                                placeholderTextColor={colors.inputPlaceholder}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('userInfo.phone')} *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                value={newContact.phone}
                                onChangeText={(text) => setNewContact(prev => ({ ...prev, phone: text }))}
                                placeholder={t('userInfo.enterPhone')}
                                keyboardType="phone-pad"
                                placeholderTextColor={colors.inputPlaceholder}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('userInfo.relationship')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                                value={newContact.relationship}
                                onChangeText={(text) => setNewContact(prev => ({ ...prev, relationship: text }))}
                                placeholder={t('userInfo.relationshipPlaceholder')}
                                placeholderTextColor={colors.inputPlaceholder}
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={[styles.button, styles.saveButton, { backgroundColor: colors.info }]} onPress={handleAddContact}>
                            <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                                {editingContact ? t('userInfo.updateContact') : t('userInfo.addContact')}
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
                <SafeAreaView style={[styles.pickerModalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.pickerModalContent, { backgroundColor: colors.background }]}>
                        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('userInfo.selectBloodGroup')}</Text>
                            <TouchableOpacity onPress={() => setShowBloodGroupPicker(false)}>
                                <Feather name="x" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {BLOOD_GROUPS.map((group) => (
                                <TouchableOpacity
                                    key={group}
                                    style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setMedicalInfo(prev => ({ ...prev, bloodGroup: group }));
                                        setShowBloodGroupPicker(false);
                                    }}
                                >
                                    <Text style={[styles.pickerOptionText, { color: colors.text }]}>{group}</Text>
                                    {medicalInfo.bloodGroup === group && (
                                        <Feather name="check" size={20} color={colors.info} />
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
        fontStyle: 'italic',
    },
    header: {
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
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
    },
    syncText: {
        fontSize: 12,
        marginLeft: 6,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        margin: 15,
        borderRadius: 8,
        gap: 8,
    },
    errorBannerText: {
        flex: 1,
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
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    syncStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        marginBottom: 10,
    },
    pickerModalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    pickerModalContent: {
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
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    pickerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    pickerOptionText: {
        fontSize: 16,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
    },
    pickerButtonText: {
        fontSize: 16,
    },
    placeholderText: {
    },
    section: {
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
        flex: 1,
    },
    contactBadge: {
        borderRadius: 12,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactBadgeText: {
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
    },
    input: {
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
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
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
    },
    contactPhone: {
        fontSize: 14,
        marginTop: 4,
    },
    contactActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
    },
    deleteButton: {
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 20,
    },
    addContactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        gap: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    addContactText: {
        fontSize: 14,
        fontWeight: '600',
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
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    retryButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 10,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    modalCancelText: {
        fontSize: 16,
        fontWeight: '500',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
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
        padding: 12,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 8,
        gap: 8,
    },
    offlineWarningText: {
        flex: 1,
        fontSize: 13,
    },
});