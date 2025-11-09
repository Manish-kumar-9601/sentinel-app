import { StorageService } from '@/services/StorageService';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SentinelIcon from '../../assets/images/sentinel-icon.png';
import { useAuth } from '../../context/AuthContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

const LoginScreen = () => {
    const { t } = useTranslation();
    const { colors } = useThemedStyles();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            return Alert.alert(t('auth.error'), t('auth.enterBothFields'));
        }

        Keyboard.dismiss();
        setIsLoading(true);

        try {
            const result = await login(email, password);

            if (result.success) {
                router.replace('/(app)');
            } else {
                Alert.alert(t('auth.loginFailed'), result.error || t('auth.invalidCredentials'));
            }
        } catch (error) {
            Alert.alert(t('auth.error'), t('auth.unexpectedError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinueAsGuest = async () => {
        await StorageService.setGuestMode(true);
        router.replace('/(app)');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Image source={SentinelIcon} style={styles.logo} />
                <Text style={[styles.title, { color: colors.text }]}>{t('auth.welcomeBack')}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.signInAccount')}</Text>

                <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
                    <Feather name="mail" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder={t('auth.email')}
                        placeholderTextColor={colors.textTertiary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isLoading}
                    />
                </View>

                <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
                    <Feather name="lock" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder={t('auth.password')}
                        placeholderTextColor={colors.textTertiary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        editable={!isLoading}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.info }]}
                    onPress={handleLogin}
                    disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color={colors.textInverse} />
                    ) : (
                        <Text style={[styles.buttonText, { color: colors.textInverse }]}>{t('auth.logIn')}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.guestButton, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={handleContinueAsGuest}
                    disabled={isLoading}>
                    <Text style={[styles.buttonText, styles.guestButtonText, { color: colors.text }]}>{t('auth.continueAsGuest')}</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('auth.noAccount')}</Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                        <Text style={[styles.linkText, { color: colors.info }]}> {t('auth.signUp')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 30,
    },
    logo: {
        width: 100,
        height: 100,
        alignSelf: 'center',
        marginBottom: 20,
        borderRadius: 50
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 15,
    },
    inputIcon: {
        padding: 15,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
    },
    button: {
        borderRadius: 10,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    guestButton: {
        marginTop: 15,
    },
    guestButtonText: {
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    footerText: {
        fontSize: 16,
    },
    linkText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default LoginScreen;