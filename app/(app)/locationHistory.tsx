/**
 * Location History Timeline Screen
 * Shows user's location history with timeline and map visualization
 */

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { LocationHistoryService, LocationPoint } from '@/services/locationHistoryService';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

export default function LocationHistoryScreen() {
    const router = useRouter();
    const { colors } = useThemedStyles();

    const [history, setHistory] = useState<LocationPoint[]>([]);
    const [isTracking, setIsTracking] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState<'today' | 'all'>('today');
    const [stats, setStats] = useState<any>(null);
    const [mapRegion, setMapRegion] = useState<any>(null);

    useEffect(() => {
        loadData();
        checkTrackingStatus();
    }, [selectedDate]);

    const loadData = async () => {
        try {
            setIsLoading(true);

            // Get history based on selected date
            const locationHistory = selectedDate === 'today'
                ? await LocationHistoryService.getTodayHistory()
                : await LocationHistoryService.getHistory();

            setHistory(locationHistory);

            // Get stats
            const statsData = await LocationHistoryService.getStats();
            setStats(statsData);

            // Set map region to latest location
            if (locationHistory.length > 0) {
                const latest = locationHistory[0];
                setMapRegion({
                    latitude: latest.latitude,
                    longitude: latest.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
            }

        } catch (error) {
            console.error('Error loading location history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const checkTrackingStatus = async () => {
        const tracking = await LocationHistoryService.isTracking();
        setIsTracking(tracking);
    };

    const handleToggleTracking = async () => {
        try {
            if (isTracking) {
                await LocationHistoryService.stopTracking();
                setIsTracking(false);
                Alert.alert('Tracking Stopped', 'Location history tracking has been disabled.');
            } else {
                const started = await LocationHistoryService.startTracking();
                if (started) {
                    setIsTracking(true);
                    Alert.alert('Tracking Started', 'Location history will be recorded in the background.');
                } else {
                    Alert.alert(
                        'Permission Required',
                        'Please grant location permissions to enable tracking.'
                    );
                }
            }
        } catch (error) {
            console.error('Error toggling tracking:', error);
            Alert.alert('Error', 'Failed to toggle location tracking.');
        }
    };

    const handleClearHistory = () => {
        Alert.alert(
            'Clear Location History',
            'Are you sure you want to delete all location history? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        await LocationHistoryService.clearHistory();
                        loadData();
                        Alert.alert('Success', 'Location history cleared.');
                    },
                },
            ]
        );
    };

    const handleExport = async () => {
        try {
            const geoJSON = await LocationHistoryService.exportAsGeoJSON();
            // Here you would typically use FileSystem to save the file
            Alert.alert('Export Ready', 'Location history exported as GeoJSON.');
            console.log('GeoJSON:', geoJSON.substring(0, 200) + '...');
        } catch (error) {
            console.error('Error exporting:', error);
            Alert.alert('Error', 'Failed to export location history.');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatDistance = (km: number) => {
        if (km < 1) {
            return `${Math.round(km * 1000)} m`;
        }
        return `${km.toFixed(2)} km`;
    };

    const renderTimelineItem = ({ item, index }: { item: LocationPoint; index: number }) => (
        <View style={styles.timelineItem}>
            <View style={styles.timelineMarker}>
                <View style={[styles.markerDot, { backgroundColor: colors.primary }]} />
                {index < history.length - 1 && (
                    <View style={[styles.markerLine, { backgroundColor: colors.border }]} />
                )}
            </View>

            <TouchableOpacity
                style={[styles.timelineCard, { backgroundColor: colors.card }]}
                onPress={() => {
                    setMapRegion({
                        latitude: item.latitude,
                        longitude: item.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                }}
            >
                <View style={styles.cardHeader}>
                    <Ionicons name="location" size={20} color={colors.primary} />
                    <Text style={[styles.cardTime, { color: colors.text }]}>
                        {formatTime(item.timestamp)}
                    </Text>
                </View>

                <Text style={[styles.cardCoords, { color: colors.textSecondary }]}>
                    {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                </Text>

                <View style={styles.cardDetails}>
                    {item.accuracy && (
                        <View style={styles.detailItem}>
                            <Ionicons name="radio-outline" size={14} color={colors.textTertiary} />
                            <Text style={[styles.detailText, { color: colors.textTertiary }]}>
                                ±{Math.round(item.accuracy)}m
                            </Text>
                        </View>
                    )}
                    {item.speed && item.speed > 0 && (
                        <View style={styles.detailItem}>
                            <Ionicons name="speedometer-outline" size={14} color={colors.textTertiary} />
                            <Text style={[styles.detailText, { color: colors.textTertiary }]}>
                                {Math.round(item.speed * 3.6)} km/h
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading location history...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    Location History
                </Text>
                <TouchableOpacity onPress={handleExport}>
                    <Ionicons name="download-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Tracking Toggle */}
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="track-changes" size={24} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                Location Tracking
                            </Text>
                        </View>
                        <Switch
                            value={isTracking}
                            onValueChange={handleToggleTracking}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={isTracking ? '#FFFFFF' : '#F4F3F4'}
                        />
                    </View>
                    <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                        {isTracking
                            ? 'Your location is being tracked in the background for safety.'
                            : 'Enable to record your location history automatically.'}
                    </Text>
                </View>

                {/* Statistics */}
                {stats && stats.totalPoints > 0 && (
                    <View style={[styles.section, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Statistics
                        </Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.primary }]}>
                                    {stats.totalPoints}
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                    Points
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.primary }]}>
                                    {formatDistance(stats.totalDistance)}
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                    Distance
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.primary }]}>
                                    {Math.round(stats.timeSpan / (1000 * 60 * 60))}h
                                </Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                    Duration
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Map View */}
                {mapRegion && history.length > 0 && (
                    <View style={styles.mapContainer}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={styles.map}
                            region={mapRegion}
                            showsUserLocation
                            showsMyLocationButton
                        >
                            {/* Draw polyline connecting points */}
                            <Polyline
                                coordinates={history.map((point) => ({
                                    latitude: point.latitude,
                                    longitude: point.longitude,
                                }))}
                                strokeColor={colors.primary}
                                strokeWidth={3}
                            />

                            {/* Markers for significant points */}
                            {history.length > 0 && (
                                <>
                                    <Marker
                                        coordinate={{
                                            latitude: history[0].latitude,
                                            longitude: history[0].longitude,
                                        }}
                                        title="Latest Location"
                                        pinColor={colors.primary}
                                    />
                                    {history.length > 1 && (
                                        <Marker
                                            coordinate={{
                                                latitude: history[history.length - 1].latitude,
                                                longitude: history[history.length - 1].longitude,
                                            }}
                                            title="First Location"
                                            pinColor="#666"
                                        />
                                    )}
                                </>
                            )}
                        </MapView>
                    </View>
                )}

                {/* Date Filter */}
                <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedDate === 'today' && {
                                backgroundColor: colors.primary,
                            },
                        ]}
                        onPress={() => setSelectedDate('today')}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                {
                                    color:
                                        selectedDate === 'today'
                                            ? '#FFFFFF'
                                            : colors.textSecondary,
                                },
                            ]}
                        >
                            Today
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedDate === 'all' && {
                                backgroundColor: colors.primary,
                            },
                        ]}
                        onPress={() => setSelectedDate('all')}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                {
                                    color:
                                        selectedDate === 'all'
                                            ? '#FFFFFF'
                                            : colors.textSecondary,
                                },
                            ]}
                        >
                            All Time
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Timeline */}
                {history.length > 0 ? (
                    <View style={[styles.section, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Timeline
                        </Text>
                        <FlatList
                            data={history}
                            renderItem={renderTimelineItem}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                        />
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons
                            name="location-outline"
                            size={64}
                            color={colors.textTertiary}
                        />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No location history yet
                        </Text>
                        <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                            Enable tracking to start recording your location
                        </Text>
                    </View>
                )}

                {/* Clear History Button */}
                {history.length > 0 && (
                    <TouchableOpacity
                        style={[styles.clearButton, { backgroundColor: colors.error }]}
                        onPress={handleClearHistory}
                    >
                        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.clearButtonText}>Clear History</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 48,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    section: {
        margin: 16,
        padding: 16,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    sectionDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    mapContainer: {
        height: 300,
        margin: 16,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
    },
    map: {
        flex: 1,
    },
    filterContainer: {
        flexDirection: 'row',
        gap: 12,
        margin: 16,
        padding: 8,
        borderRadius: 12,
    },
    filterButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineMarker: {
        alignItems: 'center',
        marginRight: 12,
    },
    markerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    markerLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
    },
    timelineCard: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    cardTime: {
        fontSize: 16,
        fontWeight: '600',
    },
    cardCoords: {
        fontSize: 12,
        marginBottom: 8,
    },
    cardDetails: {
        flexDirection: 'row',
        gap: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        margin: 16,
        padding: 16,
        borderRadius: 12,
    },
    clearButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
