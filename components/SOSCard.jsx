import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity, Text, StyleSheet,ActivityIndicator, View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
export const SOSCard = ({ onSOSPress, isReady, buttonText, locationText, onLocationPress, locationStatus, onSOSOptions }) =>
{
    const shadowSpread = useSharedValue(2);

    const animatedStyle = useAnimatedStyle(() =>
    {
        return {
            boxShadow: `0px ${shadowSpread.value * 1.33}px ${shadowSpread.value * 7.5}px ${shadowSpread.value * 0.66}px rgba(255, 149, 149, 1)`,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 30,
            shadowOpacity: 1,
            shadowColor: 'rgba(255, 149, 149, 1)',
            elevation: shadowSpread.value, // Android fallback
        };
    });
    let withTimerValue = 0;
    let direction = 1;

    setInterval(() =>
    {
        shadowSpread.value = withTiming(withTimerValue, { duration: 500});

        // Step forward or backward
        withTimerValue += direction;

        // Reverse direction at bounds
        if (withTimerValue >= 4) direction = -1;
        if (withTimerValue <= 0) direction = 1;
    }, 1500);

    return (
        <View style={styles.sosCard}>
            <TouchableOpacity
                onPress={onSOSPress}
                onLongPress={onSOSOptions}
                disabled={!isReady}

            >
                <AnimatedLinearGradient
                    colors={isReady ? ['#FF6B6B', '#ff4400ff'] : ['#D3D3D3', '#A9A9A9']}
                    style={[styles.sosButton, animatedStyle]}
                >
                    <View style={styles.sosButtonInner}>
                        {['PREPARING...', 'LOCATING...', 'SENDING...'].includes(buttonText) ? (
                            <ActivityIndicator size="large" color="white" />
                        ) : (
                            <>
                                <Text style={styles.sosText}>SOS</Text>
                                <Text style={styles.sosSubtext}>{buttonText}</Text>
                            </>
                        )}
                    </View>
                </AnimatedLinearGradient>
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
    )
};

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
        boxShadow: ' 0px 4px 30px 1px rgba(255, 156, 156, 1)',
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
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
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


