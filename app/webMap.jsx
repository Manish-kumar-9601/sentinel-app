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
        <title>Enhanced Emergency Map</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
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
                max-height: 200px;
                overflow-y: auto;
            }
            .category-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                justify-content: center;
            }
            .category-btn {
                padding: 8px 12px;
                border: none;
                border-radius: 20px;
                color: white;
                font-size: 11px;
                cursor: pointer;
                min-width: 70px;
                font-weight: bold;
                transition: transform 0.2s;
            }
            .category-btn:hover {
                transform: scale(1.05);
            }
            .category-btn:active {
                transform: scale(0.95);
            }
            .category-title {
                text-align: center;
                margin-bottom: 10px;
                font-weight: bold;
                color: #333;
                font-size: 14px;
            }
            .category-subtitle {
                text-align: center;
                margin-bottom: 15px;
                font-size: 10px;
                color: #666;
                font-style: italic;
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
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                text-align: center;
            }
            .loading-spinner {
                width: 30px;
                height: 30px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #FF4500;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .controls {
                position: absolute;
                top: 20px;
                right: 20px;
                z-index: 1000;
                background: white;
                border-radius: 10px;
                padding: 10px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .control-btn {
                display: block;
                margin: 5px 0;
                padding: 8px;
                border: none;
                background: #f0f0f0;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            }
            .results-info {
                position: absolute;
                top: 20px;
                left: 20px;
                z-index: 1000;
                background: rgba(255, 69, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: bold;
                display: none;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        
        <div class="results-info" id="resultsInfo"></div>
        
        <div class="controls">
            <button class="control-btn" onclick="changeRadius()">Radius: <span id="radiusText">2km</span></button>
            <button class="control-btn" onclick="clearResults()">Clear</button>
            <button class="control-btn" onclick="centerMap()">📍 Center</button>
        </div>
        
        <div class="category-buttons">
            <div class="category-title">Enhanced Emergency Services Finder</div>
            <div class="category-subtitle">Multiple detection methods • Better coverage</div>
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
            let currentRadius = 2000;

            // Enhanced category configuration with multiple OSM tags
            const categoryConfig = {
                hospital: { 
                    tags: ['amenity=hospital', 'amenity=clinic', 'healthcare=hospital', 'healthcare=clinic', 'building=hospital'],
                    color: '#FF6B6B', 
                    name: 'Hospitals & Clinics',
                    icon: '🏥'
                },
                police: { 
                    tags: ['amenity=police', 'office=police', 'building=police_station'],
                    color: '#4A90E2', 
                    name: 'Police Stations',
                    icon: '👮'
                },
                fire_station: { 
                    tags: ['amenity=fire_station', 'emergency=fire_station', 'building=fire_station', 'office=fire_department'],
                    color: '#FF8C00', 
                    name: 'Fire Stations',
                    icon: '🚒'
                },
                fuel: { 
                    tags: ['amenity=fuel', 'shop=gas_station', 'shop=fuel'],
                    color: '#32CD32', 
                    name: 'Gas Stations',
                    icon: '⛽'
                },
                pharmacy: { 
                    tags: ['amenity=pharmacy', 'shop=pharmacy', 'healthcare=pharmacy'],
                    color: '#9370DB', 
                    name: 'Pharmacies',
                    icon: '💊'
                },
                atm: { 
                    tags: ['amenity=atm', 'amenity=bank', 'shop=bank'],
                    color: '#20B2AA', 
                    name: 'ATMs & Banks',
                    icon: '🏧'
                },
                restaurant: { 
                    tags: ['amenity=restaurant', 'amenity=fast_food', 'amenity=cafe', 'shop=food'],
                    color: '#FFD700', 
                    name: 'Restaurants & Food',
                    icon: '🍴'
                },
                school: { 
                    tags: ['amenity=school', 'amenity=university', 'amenity=college', 'building=school'],
                    color: '#8A2BE2', 
                    name: 'Schools & Education',
                    icon: '🏫'
                }
            };

            function showLoading(show, message = 'Searching...') {
                let loading = document.getElementById('loading');
                if (show) {
                    if (!loading) {
                        loading = document.createElement('div');
                        loading.id = 'loading';
                        loading.className = 'loading';
                        loading.innerHTML = '<div class="loading-spinner"></div><div>' + message + '</div>';
                        document.body.appendChild(loading);
                    }
                    loading.querySelector('div:last-child').textContent = message;
                } else {
                    if (loading) {
                        loading.remove();
                    }
                }
            }

            function showResults(count, category, closest = null) {
                const info = document.getElementById('resultsInfo');
                if (count > 0) {
                    let text = count + ' ' + categoryConfig[category].name.toLowerCase() + ' found';
                    if (closest) {
                        text += ' • Closest: ' + closest.toFixed(1) + 'km';
                    }
                    info.textContent = text;
                    info.style.display = 'block';
                } else {
                    info.style.display = 'none';
                }
            }

            function changeRadius() {
                const radii = [1000, 2000, 5000, 10000, 20000];
                const labels = ['1km', '2km', '5km', '10km', '20km'];
                const currentIndex = radii.indexOf(currentRadius);
                const nextIndex = (currentIndex + 1) % radii.length;
                
                currentRadius = radii[nextIndex];
                document.getElementById('radiusText').textContent = labels[nextIndex];
                
                if (searchCircle) {
                    searchCircle.setRadius(currentRadius);
                }
            }

            function clearResults() {
                markersGroup.clearLayers();
                if (searchCircle) {
                    map.removeLayer(searchCircle);
                }
                document.getElementById('resultsInfo').style.display = 'none';
            }

            function centerMap() {
                map.setView([${latitude}, ${longitude}], 15);
            }

            async function searchNearby(category) {
                try {
                    showLoading(true, 'Enhanced search for ' + categoryConfig[category].name.toLowerCase() + '...');
                    
                    // Clear previous markers and circle
                    markersGroup.clearLayers();
                    if (searchCircle) {
                        map.removeLayer(searchCircle);
                    }

                    const config = categoryConfig[category];

                    // Add search radius circle
                    searchCircle = L.circle([${latitude}, ${longitude}], {
                        color: config.color,
                        fillColor: config.color,
                        fillOpacity: 0.1,
                        radius: currentRadius
                    }).addTo(map);

                    // Build enhanced Overpass query with multiple tags
                    const tagQueries = config.tags.map(tag => {
                        return \`
                            node["\${tag}"](around:\${currentRadius},${latitude},${longitude});
                            way["\${tag}"](around:\${currentRadius},${latitude},${longitude});
                            relation["\${tag}"](around:\${currentRadius},${latitude},${longitude});
                        \`;
                    }).join('');

                    const query = \`
                        [out:json][timeout:45];
                        (
                            \${tagQueries}
                        );
                        out center meta tags;
                    \`;

                    console.log('Searching with', config.tags.length, 'tag variations for', category);

                    // Try primary API first, then fallback
                    let response;
                    try {
                        response = await fetch('https://overpass-api.de/api/interpreter', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: 'data=' + encodeURIComponent(query)
                        });
                    } catch (error) {
                        console.log('Primary API failed, trying backup...');
                        response = await fetch('https://overpass.openstreetmap.org/api/interpreter', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: 'data=' + encodeURIComponent(query)
                        });
                    }

                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                    }

                    const data = await response.json();
                    console.log('API returned', data.elements?.length || 0, 'elements');

                    let count = 0;
                    let closestDistance = Infinity;
                    const processedIds = new Set();

                    data.elements.forEach(element => {
                        // Avoid duplicate markers from multiple tag matches
                        const elementId = element.type + element.id;
                        if (processedIds.has(elementId)) {
                            return;
                        }
                        processedIds.add(elementId);

                        const lat = element.lat || (element.center && element.center.lat);
                        const lon = element.lon || (element.center && element.center.lon);
                        
                        if (lat && lon) {
                            const distance = calculateDistance(${latitude}, ${longitude}, lat, lon);
                            
                            if (distance < closestDistance) {
                                closestDistance = distance;
                            }
                            
                            // Enhanced marker creation
                            const customIcon = L.divIcon({
                                className: 'custom-marker',
                                html: '<div style="width: 30px; height: 30px; background: ' + config.color + '; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">' + config.icon + '</div>',
                                iconSize: [30, 30],
                                iconAnchor: [15, 15]
                            });

                            const marker = L.marker([lat, lon], { icon: customIcon });
                            
                            // Enhanced name extraction
                            let name = element.tags?.name || 
                                      element.tags?.brand || 
                                      element.tags?.operator || 
                                      element.tags?.['name:en'] ||
                                      config.name.slice(0, -1); // Remove 's' from end

                            // Enhanced address extraction
                            let address = 'Address not available';
                            if (element.tags) {
                                const addressParts = [];
                                if (element.tags['addr:housenumber']) addressParts.push(element.tags['addr:housenumber']);
                                if (element.tags['addr:street']) addressParts.push(element.tags['addr:street']);
                                if (element.tags['addr:city']) addressParts.push(element.tags['addr:city']);
                                
                                if (addressParts.length > 0) {
                                    address = addressParts.join(' ');
                                } else if (element.tags['addr:full']) {
                                    address = element.tags['addr:full'];
                                }
                            }

                            // Find which tag matched
                            const matchedTag = config.tags.find(tag => {
                                const [key, value] = tag.split('=');
                                return element.tags?.[key] === value;
                            }) || 'unknown';
                            
                            const popupContent = \`
                                <div style="min-width: 220px; max-width: 280px;">
                                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: \${config.color};">
                                        \${config.icon} \${name}
                                    </div>
                                    <div style="font-size: 11px; color: #666; margin-bottom: 5px;">
                                        📍 \${address}
                                    </div>
                                    <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
                                        📏 \${distance.toFixed(1)} km away
                                    </div>
                                    \${element.tags?.phone ? '<div style="font-size: 11px; color: #4A90E2; margin-bottom: 3px;">📞 ' + element.tags.phone + '</div>' : ''}
                                    \${element.tags?.website ? '<div style="font-size: 11px; color: #32CD32; margin-bottom: 3px;">🌐 Website available</div>' : ''}
                                    \${element.tags?.opening_hours ? '<div style="font-size: 10px; color: #666; margin-bottom: 5px;">🕒 ' + element.tags.opening_hours + '</div>' : ''}
                                    <div style="font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 3px; margin-top: 5px;">
                                        OSM: \${element.type} #\${element.id} • Tag: \${matchedTag}
                                    </div>
                                </div>
                            \`;
                            
                            marker.bindPopup(popupContent);
                            markersGroup.addLayer(marker);
                            count++;
                        }
                    });

                    showLoading(false);
                    showResults(count, category, closestDistance < Infinity ? closestDistance : null);
                    
                    if (count === 0) {
                        const radiusKm = currentRadius / 1000;
                        const message = 'No ' + config.name.toLowerCase() + ' found within ' + radiusKm + 'km radius.\\n\\n' +
                                      'This could be because:\\n' +
                                      '• The area may not be fully mapped\\n' +
                                      '• Try increasing the search radius\\n' +
                                      '• Facilities might be tagged differently\\n\\n' +
                                      'Would you like to try a larger search area?';
                        
                        if (confirm(message)) {
                            if (currentRadius < 20000) {
                                changeRadius();
                                setTimeout(() => searchNearby(category), 500);
                            }
                        }
                    } else {
                        const message = 'Found ' + count + ' ' + config.name.toLowerCase() + 
                                      (closestDistance < Infinity ? '\\nClosest: ' + closestDistance.toFixed(1) + 'km away' : '');
                        alert(message);
                        
                        // Fit map to show results
                        if (markersGroup.getLayers().length > 0) {
                            const group = new L.featureGroup([searchCircle, ...markersGroup.getLayers()]);
                            map.fitBounds(group.getBounds().pad(0.1));
                        }
                    }

                } catch (error) {
                    showLoading(false);
                    console.error('Enhanced search error:', error);
                    
                    const errorMessage = 'Failed to search for places.\\n\\n' +
                                       'Error: ' + error.message + '\\n\\n' +
                                       'This might be due to:\\n' +
                                       '• Network connectivity issues\\n' +
                                       '• Overpass API server being busy\\n' +
                                       '• Location data not available\\n\\n' +
                                       'Please check your connection and try again.';
                    alert(errorMessage);
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

            console.log('Enhanced Emergency Map initialized with multiple detection methods');
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
                console.log('Enhanced WebView map is ready');
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
                <Text style={styles.loadingText}>Loading enhanced map...</Text>
            </View>
        );
    }

    if (!mapHtml)
    {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Failed to load enhanced map</Text>
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
                    title: 'Enhanced Emergency Map (Web)',
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
                            <Text style={styles.loadingText}>Loading enhanced map...</Text>
                        </View>
                    )}
                    onError={(syntheticEvent) =>
                    {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView error: ', nativeEvent);
                        Alert.alert('Map Error', 'Failed to load enhanced web map');
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