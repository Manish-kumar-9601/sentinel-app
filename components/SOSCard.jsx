import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useThemedStyles } from '../hooks/useThemedStyles';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
export const SOSCard = ({ onSOSPress, isReady, buttonText, locationText, onLocationPress, locationStatus, onSOSOptions }) =>
{
    const { t } = useTranslation();
    const { colors } = useThemedStyles();
    const shadowSpread = useSharedValue(2);

    // Check if button text indicates loading state
    const isLoadingState = [
        t('home.preparing'),
        t('home.locating'),
        t('home.sending')
    ].includes(buttonText);

    const animatedStyle = useAnimatedStyle(() =>
    {
        return {
            boxShadow: `0px ${shadowSpread.value * 1.33}px ${shadowSpread.value * 7.5}px ${shadowSpread.value * 0.66}px ${colors.errorLight}`,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 30,
            shadowOpacity: 1,
            shadowColor: colors.errorLight,
            elevation: shadowSpread.value, // Android fallback
        };
    });
    let withTimerValue = 0;
    let direction = 1;

    setInterval(() =>
    {
        shadowSpread.value = withTiming(withTimerValue, { duration: 500 });

        // Step forward or backward
        withTimerValue += direction;

        // Reverse direction at bounds
        if (withTimerValue >= 4) direction = -1;
        if (withTimerValue <= 0) direction = 1;
    }, 1500);

    return (
        <View style={[styles.sosCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity
                onPress={onSOSPress}
                onLongPress={onSOSOptions}
                disabled={!isReady}

            >
                <AnimatedLinearGradient
                    colors={isReady ? [colors.error, colors.primary] : [colors.disabled, colors.disabledDark]}
                    style={[styles.sosButton, animatedStyle]}
                >
                    <View style={styles.sosButtonInner}>
                        {isLoadingState ? (
                            <ActivityIndicator size="large" color={colors.textInverse} />
                        ) : (
                            <>
                                <Text style={[styles.sosText, { color: colors.textInverse }]}>{t('home.sos')}</Text>
                                <Text style={[styles.sosSubtext, { color: colors.textInverse }]}>{buttonText}</Text>
                            </>
                        )}
                    </View>
                </AnimatedLinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={onLocationPress} style={[styles.locationContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                <View style={styles.locationBox}>
                    <Ionicons
                        name="location-sharp"
                        size={20}
                        color={locationStatus === 'available' ? colors.primary : colors.textTertiary}
                    />
                    <Text
                        style={[
                            styles.locationText,
                            { color: locationStatus === 'available' ? colors.textSecondary : colors.textTertiary }
                        ]}
                        numberOfLines={1}
                    >
                        {locationText}
                    </Text>
                </View>
            </TouchableOpacity>
            <Text style={[styles.sosHelpText, { color: colors.textTertiary }]}>{t('home.sosHelpText')}</Text>
        </View>
    )
};

const styles = StyleSheet.create({
    sosCard: {
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
        fontWeight: 'bold',
    },
    sosSubtext: {
        fontSize: 12,
        marginTop: 2,
    },
    sosHelpText: {
        fontSize: 12,
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
        flexShrink: 1,
    },
});


