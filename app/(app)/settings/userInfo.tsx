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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useUserInfo } from '@/hooks/useUserInfo';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
// import { Stack } from 'expo-router';

export default function UserInfoScreen() {
    const { user, logout } = useAuth();
    const { data, loading, error, lastSync, refresh, save } = useUserInfo();

    // Local state for form
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        bloodGroup: '',
        allergies: '',
        medications: '',
    });

    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Update form when data loads
    useEffect(() => {
        if (data) {
            setFormData({
                name: data.userInfo.name || '',
                phone: data.userInfo.phone || '',
                bloodGroup: data.medicalInfo.bloodGroup || '',
                allergies: data.medicalInfo.allergies || '',
                medications: data.medicalInfo.medications || '',
            });
        }
    }, [data]);

    const handleFieldChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);

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
            emergencyContacts: data?.emergencyContacts || [],
            lastUpdated: new Date().toISOString(),
        });

        setIsSaving(false);

        if (result.success) {
            Alert.alert('Success', 'Your information has been saved');
            setHasChanges(false);
        } else {
            Alert.alert('Error', result.error || 'Failed to save information');
        }
    };

    const handleClearCache = async () => {
        Alert.alert(
            'Clear Cache',
            'This will reload your data from the server.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    onPress: () => refresh(true),
                    style: 'destructive',
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
            {/* <Stack.Screen options={{headerTitle:'User info'}} /> */}
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={() => refresh(true)} />
                }
            >
                <View style={styles.header}>

                    <TouchableOpacity style={styles.headerPressable} onPress={() => { router.back() }}>
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
                {lastSync && (
                    <Text style={styles.syncText}>
                        Last synced: {lastSync.toLocaleString()}
                    </Text>
                )}
                {/* Personal Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(value) => handleFieldChange('name', value)}
                            placeholder="Enter your name"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={data?.userInfo.email}
                            editable={false}
                        />
                        <Text style={styles.helperText}>Email cannot be changed</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number (optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.phone}
                            onChangeText={(value) => handleFieldChange('phone', value)}
                            placeholder="Enter your phone number"
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                {/* Medical Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Medical Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Blood Group</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.bloodGroup}
                            onChangeText={(value) => handleFieldChange('bloodGroup', value)}
                            placeholder="e.g., O+, A-, B+"
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
                        />
                    </View>
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
                            <Text style={styles.buttonText}>
                                {hasChanges ? 'Save Changes' : 'No Changes'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.clearButton]}
                        onPress={handleClearCache}
                    >
                        <Text style={[styles.buttonText, styles.clearButtonText]}>
                            Clear Cache
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
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
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 5,
        color: '#000',
    },
    input: {
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
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
    actions: {
        padding: 20,
        gap: 10,
        paddingBottom: 40,
    },
    button: {
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: '#007AFF',
    },
    clearButton: {
        backgroundColor: '#E5E5EA',
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        marginTop: 10,
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
        color: '#000',
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
});