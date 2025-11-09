/**
 * Evidence Manager Screen
 * View, capture, and manage evidence (photos/videos/audio)
 * Share evidence with emergency contacts
 */

import { useTheme } from '@/context/ThemeContext';
import { useEvidence } from '@/hooks/useEvidence';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const ITEM_SIZE = (width - 48) / GRID_COLUMNS; // 48 = padding

export default function EvidenceScreen() {
    const { colors } = useTheme();
    const {
        evidence,
        loading,
        capturing,
        sharing,
        capturePhoto,
        captureVideo,
        pickFromGallery,
        deleteEvidence,
        clearAllEvidence,
        refreshEvidence,
        stats,
    } = useEvidence();

    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const handleCapturePhoto = async () => {
        const id = await capturePhoto();
        if (id) {
            Alert.alert('Success', 'Photo captured with GPS location');
        }
    };

    const handleCaptureVideo = async () => {
        const id = await captureVideo();
        if (id) {
            Alert.alert('Success', 'Video captured with GPS location');
        }
    };

    const handlePickFromGallery = async () => {
        const id = await pickFromGallery();
        if (id) {
            Alert.alert('Success', 'Media added to evidence');
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Evidence',
            'Are you sure you want to delete this evidence?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteEvidence(id),
                },
            ]
        );
    };

    const handleShowActions = () => {
        Alert.alert(
            'Capture Evidence',
            'Choose an option',
            [
                {
                    text: 'Take Photo',
                    onPress: handleCapturePhoto,
                },
                {
                    text: 'Record Video',
                    onPress: handleCaptureVideo,
                },
                {
                    text: 'Pick from Gallery',
                    onPress: handlePickFromGallery,
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const renderGridItem = (item: any) => {
        const isSelected = selectedItem === item.id;

        return (
            <TouchableOpacity
                key={item.id}
                style={[
                    styles.gridItem,
                    { backgroundColor: colors.card },
                    isSelected && { borderColor: colors.primary, borderWidth: 3 },
                ]}
                onPress={() => setSelectedItem(isSelected ? null : item.id)}
                onLongPress={() => handleDelete(item.id)}
            >
                {item.type === 'photo' && item.localUri && (
                    <Image source={{ uri: item.localUri }} style={styles.thumbnail} />
                )}
                {item.type === 'video' && (
                    <View style={[styles.thumbnail, styles.videoPlaceholder]}>
                        <Ionicons name="videocam" size={40} color={colors.text} />
                    </View>
                )}
                {item.type === 'audio' && (
                    <View style={[styles.thumbnail, styles.audioPlaceholder]}>
                        <Ionicons name="mic" size={40} color={colors.text} />
                    </View>
                )}

                <View style={styles.itemInfo}>
                    <Ionicons
                        name={item.type === 'photo' ? 'camera' : item.type === 'video' ? 'videocam' : 'mic'}
                        size={16}
                        color={colors.text}
                    />
                    {item.isShared && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    )}
                    {item.latitude && (
                        <Ionicons name="location" size={16} color={colors.success} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderListItem = (item: any) => {
        const isSelected = selectedItem === item.id;

        return (
            <TouchableOpacity
                key={item.id}
                style={[
                    styles.listItem,
                    { backgroundColor: colors.card },
                    isSelected && { borderLeftColor: colors.primary, borderLeftWidth: 4 },
                ]}
                onPress={() => setSelectedItem(isSelected ? null : item.id)}
                onLongPress={() => handleDelete(item.id)}
            >
                <View style={styles.listItemLeft}>
                    <Ionicons
                        name={item.type === 'photo' ? 'camera' : item.type === 'video' ? 'videocam' : 'mic'}
                        size={32}
                        color={colors.primary}
                    />
                </View>

                <View style={styles.listItemCenter}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]}>
                        {item.fileName}
                    </Text>
                    <Text style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>
                        {item.address || 'No location'}
                    </Text>
                    <Text style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>
                        {new Date(item.createdAt).toLocaleString()}
                    </Text>
                </View>

                <View style={styles.listItemRight}>
                    {item.isShared && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const selectedEvidence = evidence.find(e => e.id === selectedItem);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Evidence Manager</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        style={styles.headerButton}
                    >
                        <Ionicons
                            name={viewMode === 'grid' ? 'list' : 'grid'}
                            size={24}
                            color={colors.text}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearAllEvidence} style={styles.headerButton}>
                        <Ionicons name="trash" size={24} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Statistics */}
            <View style={[styles.stats, { backgroundColor: colors.card }]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{stats.photos}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Photos</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{stats.videos}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Videos</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{stats.audio}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Audio</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.success }]}>{stats.shared}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Shared</Text>
                </View>
            </View>

            {/* Evidence List/Grid */}
            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refreshEvidence} />
                }
            >
                {evidence.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="folder-open" size={80} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No evidence captured yet
                        </Text>
                        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                            Tap the + button to start capturing
                        </Text>
                    </View>
                ) : viewMode === 'grid' ? (
                    <View style={styles.grid}>
                        {evidence.map(renderGridItem)}
                    </View>
                ) : (
                    <View style={styles.list}>
                        {evidence.map(renderListItem)}
                    </View>
                )}
            </ScrollView>

            {/* Selected Item Details */}
            {selectedEvidence && (
                <View style={[styles.detailsPanel, { backgroundColor: colors.card }]}>
                    <View style={styles.detailsHeader}>
                        <Text style={[styles.detailsTitle, { color: colors.text }]}>
                            Evidence Details
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedItem(null)}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {selectedEvidence.latitude && selectedEvidence.longitude && (
                        <View style={styles.mapContainer}>
                            <MapView
                                style={styles.map}
                                initialRegion={{
                                    latitude: selectedEvidence.latitude,
                                    longitude: selectedEvidence.longitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }}
                            >
                                <Marker
                                    coordinate={{
                                        latitude: selectedEvidence.latitude,
                                        longitude: selectedEvidence.longitude,
                                    }}
                                    title="Evidence Location"
                                />
                            </MapView>
                        </View>
                    )}

                    <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                        ?? {selectedEvidence.address || 'No location'}
                    </Text>
                    <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                        ?? {new Date(selectedEvidence.createdAt).toLocaleString()}
                    </Text>
                    <Text style={[styles.detailsText, { color: colors.textSecondary }]}>
                        {selectedEvidence.isShared ? '? Shared' : '? Not shared'}
                    </Text>
                </View>
            )}

            {/* Capture Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={handleShowActions}
                disabled={capturing}
            >
                {capturing ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Ionicons name="add" size={32} color="#FFF" />
                )}
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 16,
    },
    headerButton: {
        padding: 4,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    gridItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: 8,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    thumbnail: {
        width: '100%',
        height: ITEM_SIZE - 30,
        resizeMode: 'cover',
    },
    videoPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#333',
    },
    audioPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#444',
    },
    itemInfo: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: 4,
    },
    list: {
        gap: 8,
    },
    listItem: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    listItemLeft: {
        justifyContent: 'center',
        marginRight: 16,
    },
    listItemCenter: {
        flex: 1,
        justifyContent: 'center',
    },
    listItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    listItemSubtitle: {
        fontSize: 12,
        marginBottom: 2,
    },
    listItemRight: {
        justifyContent: 'center',
        marginLeft: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
    },
    detailsPanel: {
        padding: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    mapContainer: {
        height: 150,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
    },
    map: {
        flex: 1,
    },
    detailsText: {
        fontSize: 14,
        marginBottom: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});
