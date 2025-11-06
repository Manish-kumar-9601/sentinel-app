import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Image,
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

const RegisterScreen = () => {
    const { t } = useTranslation();
    const { colors } = useThemedStyles();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { register } = useAuth();

    const handleRegister = async () => {
        if (!name || !email || !password) {
            return Alert.alert(t('auth.error'), t('auth.fillAllFields'));
        }

        setIsLoading(true);

        try {
            const result = await register(name, email, password);

            if (result.success) {
                router.replace('/(app)');
            } else {
                Alert.alert(t('auth.registrationFailed'), result.error || t('auth.couldNotCreate'));
            }
        } catch (error) {
            Alert.alert(t('auth.error'), t('auth.unexpectedError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Image source={SentinelIcon} style={styles.logo} />
                <Text style={[styles.title, { color: colors.text }]}>{t('auth.createAccount')}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.getStarted')}</Text>

                <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground }]}>
                    <Feather name="user" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder={t('auth.fullName')}
                        placeholderTextColor={colors.textTertiary}
                        value={name}
                        onChangeText={setName}
                        editable={!isLoading}
                    />
                </View>

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
                        placeholder={t('auth.passwordMin')}
                        placeholderTextColor={colors.textTertiary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        editable={!isLoading}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.info }]}
                    onPress={handleRegister}
                    disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color={colors.textInverse} />
                    ) : (
                        <Text style={[styles.buttonText, { color: colors.textInverse }]}>{t('auth.signUp')}</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('auth.alreadyHaveAccount')}</Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                        <Text style={[styles.linkText, { color: colors.info }]}> {t('auth.logIn')}</Text>
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
        borderRadius: 50,
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

export default RegisterScreen;