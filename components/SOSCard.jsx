import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, View } from 'react-native';

export const SOSCard = ({ onSOSPress, isReady, buttonText, locationText, onLocationPress, locationStatus, onSOSOptions }) => (
    <View style={styles.sosCard}>
        <TouchableOpacity onPress={onSOSPress} disabled={!isReady} onLongPress={onSOSOptions}>
            <LinearGradient
                colors={isReady ? ['#FF6B6B', '#FF4500'] : ['#D3D3D3', '#A9A9A9']}
                style={styles.sosButton}
            >
                <View style={styles.sosButtonInner}>
                    {buttonText === 'PREPARING...' || buttonText === 'LOCATING...' || buttonText === 'SENDING...' ? (
                        <ActivityIndicator size="large" color="white" />
                    ) : (
                        <>
                            <Text style={styles.sosText}>SOS</Text>
                            <Text style={styles.sosSubtext}>{buttonText}</Text>
                        </>
                    )}
                </View>
            </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLocationPress} style={styles.locationContainer}>
            <View style={styles.locationBox}>
                <Ionicons
                    name="location-sharp"
                    size={20}
                    color={locationStatus === 'available' ? '#ff4500' : '#999'}
                />
                <Text
                    style={[
                        styles.locationText,
                        { color: locationStatus === 'available' ? '#555' : '#999' }
                    ]}
                    numberOfLines={1}
                >
                    {locationText}
                </Text>
            </View>
        </TouchableOpacity>
        <Text style={styles.sosHelpText}>Tap to send • Hold for options</Text>
    </View>
);

const styles = StyleSheet.create({
    sosCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        marginTop: 20,
        padding: 0,
        alignItems: 'center',
    },
    sosButton: {
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2876b8',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    sosButtonInner: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sosText: {
        fontSize: 36,
        color: 'white',
        fontWeight: 'bold',
    },
    sosSubtext: {
        fontSize: 12,
        color: 'white',
        marginTop: 2,
    },
    sosHelpText: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginTop: 10,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 10
    },
    locationBox: {
        display: 'flex',
        flexDirection: 'row',
        gap: 2,
    },
    locationText: {
        fontSize: 14,
        color: '#555',
        flexShrink: 1,
    },
});


