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
            .search-container {
                position: absolute;
                top: 10px;
                left: 55%;
                transform: translateX(-50%);
                z-index: 1000;
                display: flex;
                width: 85%;
                max-width: 400px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            #searchQuery {
                flex-grow: 1;
                border: none;
                padding: 12px 15px;
                font-size: 14px;
                border-radius: 25px 0 0 25px;
            }
            #searchButton {
                border: none;
                background-color: #FF4500;
                color: white;
                padding: 0 20px;
                cursor: pointer;
                font-weight: bold;
                border-radius: 0 25px 25px 0;
            }
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
            .category-btn:hover { transform: scale(1.05); }
            .category-btn:active { transform: scale(0.95); }
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
                position: absolute; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                z-index: 2000; background: white; padding: 20px;
                border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                text-align: center;
            }
            .loading-spinner {
                width: 30px; height: 30px; border: 3px solid #f3f3f3;
                border-top: 3px solid #FF4500; border-radius: 50%;
                animation: spin 1s linear infinite; margin: 0 auto 10px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .controls {
                position: absolute; top: 80px;
                right: 20px; z-index: 1000; background: white;
                border-radius: 10px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .control-btn {
                display: block; margin: 5px 0; padding: 8px;
                border: none; background: #f0f0f0; border-radius: 5px;
                cursor: pointer; font-size: 12px;
            }
            .results-info {
                position: absolute; top: 80px;
                left: 20px; z-index: 1000; background: rgba(255, 69, 0, 0.9);
                color: white; padding: 8px 12px; border-radius: 8px;
                font-size: 12px; font-weight: bold; display: none;
            }
            .status-message {
                position: absolute; top: 120px; left: 20px; right: 20px;
                z-index: 1000; background: #4CAF50; color: white;
                padding: 10px 15px; border-radius: 8px; text-align: center;
                font-size: 12px; font-weight: bold; display: none;
            }
            .status-message.error { background: #f44336; }
            .debug-info {
                position: absolute; bottom: 0; right: 0;
                z-index: 2000; background: rgba(0,0,0,0.5);
                color: white; padding: 2px 5px;
                font-size: 8px; border-radius: 3px 0 0 0;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        
        <div class="search-container">
            <input type="text" id="searchQuery" placeholder="Search for a place or address...">
            <button id="searchButton" onclick="searchByQuery()">Search</button>
        </div>

        <div class="results-info" id="resultsInfo"></div>
        <div class="status-message" id="statusMessage"></div>
        
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

        <div class="debug-info" id="debugInfo"></div>

        <script>
            // Initialize map
            const map = L.map('map').setView([${latitude}, ${longitude}], 15);

            // Set debug info
            document.getElementById('debugInfo').innerText = 'Coords: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}';

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            const userMarker = L.marker([${latitude}, ${longitude}])
                .addTo(map)
                .bindPopup('📍 Your Current Location')
                .openPopup();
            
            const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div style="width: 20px; height: 20px; background: #FF4500; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            userMarker.setIcon(userIcon);

            let categoryMarkersGroup = L.layerGroup().addTo(map);
            let searchMarkersGroup = L.layerGroup().addTo(map); 
            let searchCircle = null;
            let currentRadius = 2000;

            const categoryConfig = {
                hospital: { 
                    tags: ['amenity=hospital', 'amenity=clinic', 'healthcare=hospital'], 
                    nominatimQuery: 'hospital',
                    color: '#FF6B6B', 
                    name: 'Hospitals & Clinics', 
                    icon: '🏥' 
                },
                police: { 
                    tags: ['amenity=police'], 
                    nominatimQuery: 'police',
                    color: '#4A90E2', 
                    name: 'Police Stations', 
                    icon: '👮' 
                },
                fire_station: { 
                    tags: ['amenity=fire_station'], 
                    nominatimQuery: 'fire station',
                    color: '#FF8C00', 
                    name: 'Fire Stations', 
                    icon: '🚒' 
                },
                fuel: { 
                    tags: ['amenity=fuel'], 
                    nominatimQuery: 'gas station',
                    color: '#32CD32', 
                    name: 'Gas Stations', 
                    icon: '⛽' 
                },
                pharmacy: { 
                    tags: ['amenity=pharmacy'], 
                    nominatimQuery: 'pharmacy',
                    color: '#9370DB', 
                    name: 'Pharmacies', 
                    icon: '💊' 
                },
                atm: { 
                    tags: ['amenity=atm', 'amenity=bank'], 
                    nominatimQuery: 'atm',
                    color: '#20B2AA', 
                    name: 'ATMs & Banks', 
                    icon: '🏧' 
                },
                restaurant: { 
                    tags: ['amenity=restaurant', 'amenity=fast_food'], 
                    nominatimQuery: 'restaurant',
                    color: '#FFD700', 
                    name: 'Restaurants & Food', 
                    icon: '🍴' 
                },
                school: { 
                    tags: ['amenity=school'], 
                    nominatimQuery: 'school',
                    color: '#8A2BE2', 
                    name: 'Schools & Education', 
                    icon: '🏫' 
                }
            };

            // Improved fetch with timeout and retry
            async function fetchWithTimeout(url, options, timeout = 15000, retries = 2) {
                for (let i = 0; i <= retries; i++) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), timeout);
                        
                        const response = await fetch(url, {
                            ...options,
                            signal: controller.signal
                        });
                        
                        clearTimeout(timeoutId);
                        
                        if (response.ok) {
                            return response;
                        }
                        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                        
                    } catch (error) {
                        if (i === retries) {
                            throw error;
                        }
                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                    }
                }
            }

            // Fallback search using Nominatim
            async function nominatimSearch(category, lat, lon, radius) {
                try {
                    const config = categoryConfig[category];
                    const radiusKm = radius / 1000;
                    
                    const url = \`https://nominatim.openstreetmap.org/search?q=\${encodeURIComponent(config.nominatimQuery)}&format=json&lat=\${lat}&lon=\${lon}&limit=20&bounded=1&viewbox=\${lon-0.05},\${lat+0.05},\${lon+0.05},\${lat-0.05}\`;
                    
                    const response = await fetchWithTimeout(url, {
                        headers: { 'User-Agent': 'EmergencyMap/1.0' }
                    });
                    
                    const data = await response.json();
                    
                    return data.filter(item => {
                        const distance = calculateDistance(lat, lon, parseFloat(item.lat), parseFloat(item.lon));
                        return distance <= radiusKm;
                    }).map(item => ({
                        lat: parseFloat(item.lat),
                        lon: parseFloat(item.lon),
                        tags: { 
                            name: item.display_name.split(',')[0],
                            'addr:full': item.display_name
                        }
                    }));
                } catch (error) {
                    console.error('Nominatim search failed:', error);
                    return [];
                }
            }

            // Main search function with fallbacks
            async function searchNearby(category) {
                try {
                    showLoading(true, 'Searching for ' + categoryConfig[category].name.toLowerCase() + '...');
                    clearResults();
                    
                    const config = categoryConfig[category];

                    searchCircle = L.circle([${latitude}, ${longitude}], {
                        color: config.color, fillColor: config.color,
                        fillOpacity: 0.1, radius: currentRadius
                    }).addTo(map);

                    let results = [];

                    // Try Overpass API first
                    try {
                        showStatusMessage('Trying primary search...', false);
                        results = await overpassSearch(category);
                    } catch (error) {
                        console.log('Overpass failed, trying Nominatim fallback...');
                        showStatusMessage('Primary search failed, trying backup...', false);
                        results = await nominatimSearch(category, ${latitude}, ${longitude}, currentRadius);
                    }

                    // Process and display results
                    let count = 0;
                    let closestDistance = Infinity;

                    if (results && results.length > 0) {
                        results.forEach(element => {
                            const lat = element.lat;
                            const lon = element.lon;
                            
                            if (lat && lon) {
                                const distance = calculateDistance(${latitude}, ${longitude}, lat, lon);
                                if (distance < closestDistance) closestDistance = distance;
                                
                                const customIcon = L.divIcon({
                                    className: 'custom-marker',
                                    html: '<div style="width: 30px; height: 30px; background: ' + config.color + '; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">' + config.icon + '</div>',
                                    iconSize: [30, 30], iconAnchor: [15, 15]
                                });

                                const marker = L.marker([lat, lon], { icon: customIcon });
                                
                                let name = element.tags?.name || config.name.slice(0, -1);
                                let address = element.tags?.['addr:full'] || element.tags?.['addr:street'] || 'Address not available';
                                
                                const popupContent = \`
                                    <div style="min-width: 220px; max-width: 280px;">
                                        <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: \${config.color};">\${config.icon} \${name}</div>
                                        <div style="font-size: 11px; color: #666; margin-bottom: 5px;">📍 \${address}</div>
                                        <div style="font-size: 11px; color: #666; margin-bottom: 8px;">📏 \${distance.toFixed(1)} km away</div>
                                    </div>
                                \`;
                                
                                marker.bindPopup(popupContent);
                                categoryMarkersGroup.addLayer(marker);
                                count++;
                            }
                        });
                    }

                    showLoading(false);
                    showResults(count, category, closestDistance < Infinity ? closestDistance : null);
                    
                    if (count === 0) {
                        showStatusMessage('No results found. Try increasing search radius.', true);
                        const radiusKm = currentRadius / 1000;
                        if (confirm('No ' + config.name.toLowerCase() + ' found within ' + radiusKm + 'km radius.\\n\\nWould you like to try a larger search area?')) {
                            if (currentRadius < 20000) {
                                changeRadius();
                                setTimeout(() => searchNearby(category), 500);
                            }
                        }
                    } else {
                        showStatusMessage(\`Found \${count} \${config.name.toLowerCase()}\`, false);
                        if (categoryMarkersGroup.getLayers().length > 0) {
                            const group = new L.featureGroup([searchCircle, ...categoryMarkersGroup.getLayers()]);
                            map.fitBounds(group.getBounds().pad(0.1));
                        }
                    }

                } catch (error) {
                    showLoading(false);
                    showStatusMessage('Search failed: ' + error.message, true);
                    console.error('Search error:', error);
                }
            }

            // Overpass API search with multiple endpoints
            async function overpassSearch(category) {
                const config = categoryConfig[category];
                const apis = [
                    'https://overpass-api.de/api/interpreter',
                    'https://overpass.kumi.systems/api/interpreter',
                    'https://overpass.openstreetmap.org/api/interpreter'
                ];

                const tagQueries = config.tags.map(tag => \`
                    node["\${tag}"](around:\${currentRadius},${latitude},${longitude});
                    way["\${tag}"](around:\${currentRadius},${latitude},${longitude});
                \`).join('');

                const query = \`
                    [out:json][timeout:20];
                    ( \${tagQueries} );
                    out center 50;
                \`;

                for (const apiUrl of apis) {
                    try {
                        const response = await fetchWithTimeout(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: 'data=' + encodeURIComponent(query)
                        }, 15000, 1);

                        const data = await response.json();
                        
                        if (data.elements && data.elements.length > 0) {
                            return data.elements.map(element => ({
                                lat: element.lat || (element.center && element.center.lat),
                                lon: element.lon || (element.center && element.center.lon),
                                tags: element.tags || {}
                            })).filter(el => el.lat && el.lon);
                        }
                    } catch (error) {
                        console.log(\`API \${apiUrl} failed:, error\`);
                        continue;
                    }
                }
                throw new Error('All Overpass APIs failed');
            }

            async function searchByQuery() {
                const query = document.getElementById('searchQuery').value;
                if (!query || query.trim() === '') {
                    showStatusMessage('Please enter a place or address to search.', true);
                    return;
                }

                showLoading(true, 'Searching for "' + query + '"...');
                clearResults();

                try {
                    const url = \`https://nominatim.openstreetmap.org/search?q=\${encodeURIComponent(query)}&format=json&lat=${latitude}&lon=${longitude}&limit=10&addressdetails=1\`;
                    
                    const response = await fetchWithTimeout(url, {
                        headers: { 'User-Agent': 'EmergencyMap/1.0' }
                    });
                    
                    const data = await response.json();
                    
                    searchMarkersGroup.clearLayers();

                    if (data && data.length > 0) {
                        data.forEach(place => {
                            const marker = L.marker([place.lat, place.lon]);
                            marker.bindPopup(\`<b>\${place.display_name}</b>\`);
                            searchMarkersGroup.addLayer(marker);
                        });
                        
                        map.fitBounds(searchMarkersGroup.getBounds().pad(0.1));
                        showStatusMessage('Found ' + data.length + ' result(s) for "' + query + '"', false);
                    } else {
                        showStatusMessage('No results found for "' + query + '"', true);
                    }

                } catch (error) {
                    console.error('Search error:', error);
                    showStatusMessage('Search failed: ' + error.message, true);
                } finally {
                    showLoading(false);
                }
            }

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
                    if (loading) loading.remove();
                }
            }

            function showStatusMessage(message, isError = false) {
                const statusEl = document.getElementById('statusMessage');
                statusEl.textContent = message;
                statusEl.className = 'status-message' + (isError ? ' error' : '');
                statusEl.style.display = 'block';
                
                if (!isError) {
                    setTimeout(() => statusEl.style.display = 'none', 4000);
                }
            }

            function showResults(count, category, closest = null) {
                const info = document.getElementById('resultsInfo');
                if (count > 0) {
                    let text = count + ' ' + categoryConfig[category].name.toLowerCase() + ' found';
                    if (closest) text += ' • Closest: ' + closest.toFixed(1) + 'km';
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
                
                if (searchCircle) searchCircle.setRadius(currentRadius);
            }

            function clearResults() {
                categoryMarkersGroup.clearLayers();
                searchMarkersGroup.clearLayers();
                if (searchCircle) map.removeLayer(searchCircle);
                document.getElementById('resultsInfo').style.display = 'none';
                document.getElementById('statusMessage').style.display = 'none';
            }

            function centerMap() {
                map.setView([${latitude}, ${longitude}], 15);
            }

            function calculateDistance(lat1, lon1, lat2, lon2) {
                const R = 6371; // Earth's radius in km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            }

            document.getElementById('searchQuery').addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    searchByQuery();
                }
            });

            console.log('Enhanced Emergency Map initialized with improved error handling and fallback APIs');
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
                    title: 'Emergency Map',
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
                    // Enhanced WebView configuration
                    mixedContentMode="compatibility"
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    allowsFullscreenVideo={true}
                    originWhitelist={['*']}
                    userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
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