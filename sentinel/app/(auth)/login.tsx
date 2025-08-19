
import { Image, useColorScheme, View, StyleSheet, Pressable } from "react-native";
import { useAuth } from "../../context/auth";
import { useRouter } from 'expo-router';
import { ThemedView } from '../../components/ThemedView';  
import { ThemedText } from '../../components/ThemedText';

// --- Reusable Components (place in e.g., app/components/) ---

function SignInWithGoogleButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean; }) {
    return (
        <Pressable onPress={onPress} disabled={disabled}>
            <View style={styles.googleButton}>
                <Image
                    source={require("../../assets/images/google-icon.png")} // Make sure you have this asset
                    style={styles.googleIcon}
                />
                <ThemedText type="defaultSemiBold" darkColor="#000">
                    Continue with Google
                </ThemedText>
            </View>
        </Pressable>
    );
}

function LoginForm() {
    const { signIn, isLoading } = useAuth();
    const theme = useColorScheme();
    const router = useRouter();

    const handleSignIn = async () => {
        const user = await signIn();
        if (user) {
            // On successful sign-in, navigate to the onboarding flow
            router.replace('/onboarding/permissions');
        }
    }

    return (
        <ThemedView style={styles.container}>
            <View style={styles.card}>
                <Image
                    source={
                        theme === "dark"
                            ? require("../../assets/images/icon-white.png") // Make sure you have this asset
                            : require('../../assets/images/icon-dark.png') // Make sure you have this asset
                    }
                    style={styles.logo}
                />
                <View style={styles.contentContainer}>
                    <View style={styles.titleContainer}>
                        <ThemedText type="subtitle" style={styles.title}>
                            Welcome to Safety First
                        </ThemedText>
                        <ThemedText style={styles.description}>
                            Your personal safety companion.
                        </ThemedText>
                    </View>
                    <View style={styles.buttonContainer}>
                        <SignInWithGoogleButton onPress={handleSignIn} disabled={isLoading} />
                    </View>
                </View>
            </View>
        </ThemedView>
    );
}

// --- Main Login Screen ---
export default function LoginScreen() {
    return <LoginForm />;
}

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
    card: { width: "100%", maxWidth: 360, alignItems: "center" },
    logo: { width: 100, height: 100, resizeMode: "contain", marginBottom: 32 },
    contentContainer: { width: "100%", gap: 32 },
    titleContainer: { alignItems: "center", gap: 12 },
    title: { textAlign: "center", fontSize: 30 },
    description: { textAlign: "center", fontSize: 16, color: "#666", lineHeight: 24 },
    buttonContainer: { width: "100%", gap: 12 },
    googleButton: { width: "100%", height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 5, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc" },
    googleIcon: { width: 18, height: 18, marginRight: 12 }
});
