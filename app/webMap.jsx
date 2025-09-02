import React, { useState, useEffect } from 'react';
import
    {
        View,
        StyleSheet,
        ActivityIndicator,
        Text,
        TouchableOpacity,
        Alert,
        Dimensions,
        StatusBar,
    } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const WebMapScreen = () =>
{
    const params = useLocalSearchParams();
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mapHtml, setMapHtml] = useState('');

    // Convert params to numbers
    const lat = params.latitude ? parseFloat(params.latitude) : null;
    const lon = params.longitude ? parseFloat(params.longitude) : null;

    useEffect(() =>
    {
        initializeMap();
    }, []);

    const initializeMap = async () =>
    {
        try
        {
            setIsLoading(true);

            let finalLat, finalLon;

            if (lat && lon && !isNaN(lat) && !isNaN(lon))
            {
                finalLat = lat;
                finalLon = lon;
                setCurrentLocation({ latitude: lat, longitude: lon });
            } else
            {
                const location = await getCurrentLocation();
                if (location)
                {
                    finalLat = location.latitude;
                    finalLon = location.longitude;
                }
            }

            if (finalLat && finalLon)
            {
                generateMapHtml(finalLat, finalLon);
            }
        } catch (error)
        {
            console.error('Failed to initialize map:', error);
            Alert.alert('Error', 'Failed to initialize map: ' + error.message);
        } finally
        {
            setIsLoading(false);
        }
    };

    const getCurrentLocation = async () =>
    {
        try
        {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted')
            {
                throw new Error('Location permission denied');
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeout: 10000,
            });

            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            setCurrentLocation(coords);
            return coords;
        } catch (error)
        {
            console.error('Error getting location:', error);
            return null;
        }
    };

    const generateMapHtml = (latitude, longitude) =>
    {
        const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Emergency Map</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100vw; }
            .category-buttons {
                position: absolute;
                bottom: 20px;
                left: 10px;
                right: 10px;
                z-index: 1000;
                background: white;
                border-radius: 15px;
                padding: 15px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            .category-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: center;
            }
            .category-btn {
                padding: 8px 12px;
                border: none;
                border-radius: 20px;
                color: white;
                font-size: 12px;
                cursor: pointer;
                min-width: 80px;
            }
            .category-title {
                text-align: center;
                margin-bottom: 10px;
                font-weight: bold;
                color: #333;
            }
            .loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 2000;
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <div class="category-buttons">
            <div class="category-title">Find Nearby Emergency Services</div>
            <div class="category-grid">
                <button class="category-btn" style="background-color: #FF6B6B;" onclick="searchNearby('hospital')">🏥 Hospitals</button>
                <button class="category-btn" style="background-color: #4A90E2;" onclick="searchNearby('police')">👮 Police</button>
                <button class="category-btn" style="background-color: #FF8C00;" onclick="searchNearby('fire_station')">🚒 Fire</button>
                <button class="category-btn" style="background-color: #32CD32;" onclick="searchNearby('fuel')">⛽ Gas</button>
                <button class="category-btn" style="background-color: #9370DB;" onclick="searchNearby('pharmacy')">💊 Pharmacy</button>
                <button class="category-btn" style="background-color: #20B2AA;" onclick="searchNearby('atm')">🏧 ATM</button>
                <button class="category-btn" style="background-color: #FFD700;" onclick="searchNearby('restaurant')">🍴 Food</button>
                <button class="category-btn" style="background-color: #8A2BE2;" onclick="searchNearby('school')">🏫 Schools</button>
            </div>
        </div>

        <script>
            // Initialize map
            const map = L.map('map').setView([${latitude}, ${longitude}], 15);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Add user location marker
            const userMarker = L.marker([${latitude}, ${longitude}])
                .addTo(map)
                .bindPopup('📍 Your Current Location')
                .openPopup();

            // Style the user marker
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div style="width: 20px; height: 20px; background: #FF4500; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            userMarker.setIcon(userIcon);

            let markersGroup = L.layerGroup().addTo(map);
            let searchCircle = null;

            const categoryConfig = {
                hospital: { tag: 'amenity=hospital', color: '#FF6B6B', name: 'Hospitals' },
                police: { tag: 'amenity=police', color: '#4A90E2', name: 'Police Stations' },
                fire_station: { tag: 'amenity=fire_station', color: '#FF8C00', name: 'Fire Stations' },
                fuel: { tag: 'amenity=fuel', color: '#32CD32', name: 'Gas Stations' },
                pharmacy: { tag: 'amenity=pharmacy', color: '#9370DB', name: 'Pharmacies' },
                atm: { tag: 'amenity=atm', color: '#20B2AA', name: 'ATMs' },
                restaurant: { tag: 'amenity=restaurant', color: '#FFD700', name: 'Restaurants' },
                school: { tag: 'amenity=school', color: '#8A2BE2', name: 'Schools' }
            };

            function showLoading(show, message = 'Searching...') {
                let loading = document.getElementById('loading');
                if (show) {
                    if (!loading) {
                        loading = document.createElement('div');
                        loading.id = 'loading';
                        loading.className = 'loading';
                        loading.innerHTML = '<div>' + message + '</div>';
                        document.body.appendChild(loading);
                    }
                } else {
                    if (loading) {
                        loading.remove();
                    }
                }
            }

            async function searchNearby(category) {
                try {
                    showLoading(true, 'Searching ' + categoryConfig[category].name.toLowerCase() + '...');
                    
                    // Clear previous markers and circle
                    markersGroup.clearLayers();
                    if (searchCircle) {
                        map.removeLayer(searchCircle);
                    }

                    const config = categoryConfig[category];
                    const radius = 2000; // 2km

                    // Add search radius circle
                    searchCircle = L.circle([${latitude}, ${longitude}], {
                        color: config.color,
                        fillColor: config.color,
                        fillOpacity: 0.1,
                        radius: radius
                    }).addTo(map);

                    // Build Overpass query
                    const query = \`
                        [out:json][timeout:25];
                        (
                            node["\${config.tag}"](around:\${radius},${latitude},${longitude});
                            way["\${config.tag}"](around:\${radius},${latitude},${longitude});
                        );
                        out center;
                    \`;

                    const response = await fetch('https://overpass-api.de/api/interpreter', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'data=' + encodeURIComponent(query)
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch data');
                    }

                    const data = await response.json();
                    let count = 0;

                    data.elements.forEach(element => {
                        const lat = element.lat || (element.center && element.center.lat);
                        const lon = element.lon || (element.center && element.center.lon);
                        
                        if (lat && lon) {
                            const distance = calculateDistance(${latitude}, ${longitude}, lat, lon);
                            
                            const marker = L.marker([lat, lon]);
                            const name = element.tags?.name || config.name;
                            const address = element.tags?.['addr:street'] ? 
                                (element.tags['addr:housenumber'] || '') + ' ' + element.tags['addr:street'] : 
                                'Address not available';
                            
                            const popupContent = \`
                                <div style="min-width: 200px;">
                                    <strong>\${name}</strong><br>
                                    <small>\${address}</small><br>
                                    <small>📍 \${distance.toFixed(1)} km away</small>
                                    \${element.tags?.phone ? '<br><small>📞 ' + element.tags.phone + '</small>' : ''}
                                    \${element.tags?.opening_hours ? '<br><small>🕒 ' + element.tags.opening_hours + '</small>' : ''}
                                </div>
                            \`;
                            
                            marker.bindPopup(popupContent);
                            markersGroup.addLayer(marker);
                            count++;
                        }
                    });

                    showLoading(false);
                    
                    if (count === 0) {
                        alert('No ' + config.name.toLowerCase() + ' found within 2km radius.');
                    } else {
                        alert('Found ' + count + ' ' + config.name.toLowerCase());
                        // Fit map to show all markers
                        if (markersGroup.getLayers().length > 0) {
                            const group = new L.featureGroup([searchCircle, ...markersGroup.getLayers()]);
                            map.fitBounds(group.getBounds().pad(0.1));
                        }
                    }

                } catch (error) {
                    showLoading(false);
                    console.error('Error searching:', error);
                    alert('Failed to search for places. Please try again.');
                }
            }

            function calculateDistance(lat1, lon1, lat2, lon2) {
                const R = 6371; // Earth's radius in km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            }

            // Add click handler for map
            map.on('click', function(e) {
                console.log('Map clicked at: ' + e.latlng);
            });

            // Message React Native when ready
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapReady',
                    location: { lat: ${latitude}, lng: ${longitude} }
                }));
            }
        </script>
    </body>
    </html>
    `;

        setMapHtml(html);
    };

    const handleWebViewMessage = (event) =>
    {
        try
        {
            const message = JSON.parse(event.nativeEvent.data);
            console.log('WebView message:', message);

            if (message.type === 'mapReady')
            {
                console.log('WebView map is ready');
            }
        } catch (error)
        {
            console.error('Error parsing WebView message:', error);
        }
    };

    if (isLoading)
    {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FF4500" />
                <Text style={styles.loadingText}>Loading map...</Text>
            </View>
        );
    }

    if (!mapHtml)
    {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Failed to load map</Text>
                <TouchableOpacity style={styles.retryButton} onPress={initializeMap}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Emergency Map (Web)',
                    headerShown: true,
                    headerStyle: { backgroundColor: '#fff' },
                    headerTintColor: '#000',
                }}
            />
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.container}>
                <WebView
                    source={{ html: mapHtml }}
                    style={styles.webview}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.webviewLoading}>
                            <ActivityIndicator size="large" color="#FF4500" />
                            <Text style={styles.loadingText}>Loading map...</Text>
                        </View>
                    )}
                    onError={(syntheticEvent) =>
                    {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView error: ', nativeEvent);
                        Alert.alert('Map Error', 'Failed to load web map');
                    }}
                />
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#FF4500',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 20,
    },
    retryText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    webviewLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
});

export default WebMapScreen;