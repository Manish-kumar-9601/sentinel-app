import * as React from "react";
import * as WebBrowser from "expo-web-browser";
import {
  AuthRequestConfig,
  DiscoveryDocument,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { AuthUser } from "@/utils/middleware"; // Import the AuthUser type


WebBrowser.maybeCompleteAuthSession();

const AuthContext = React.createContext<{
  user: AuthUser | null;
  signIn: () => Promise<AuthUser | null>;
  signOut: () => void;
  isLoading: boolean;
}>({
  user: null,
  signIn: async () => null,
  signOut: () => {},
  isLoading: false,
});

const config: AuthRequestConfig = {
  clientId: "google", // Replace with your Google Client ID
  scopes: ["openid", "profile", "email"],
  redirectUri: makeRedirectUri(),
};

const discovery: DiscoveryDocument = {
  authorizationEndpoint: `https://accounts.google.com/o/oauth2/v2/auth`,
  tokenEndpoint: `https://oauth2.googleapis.com/token`,
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [request, response, promptAsync] = useAuthRequest(config, discovery);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (response?.type === 'success') {
      // Handle successful authentication
      // In a real app, you would exchange the code for a token here
      // For this example, we'll simulate a user object
      const mockUser: AuthUser = {
          id: 'mockuser123',
          name: 'John Doe',
          email: 'john.doe@example.com',
          picture: 'https://i.pravatar.cc/150'
      };
      setUser(mockUser);
    } else if (response?.type === 'error') {
        console.error("Authentication Error:", response.error);
    }
    setIsLoading(false);
  }, [response]);

  const signIn = async (): Promise<AuthUser | null> => {
    setIsLoading(true);
    await promptAsync();
    // The useEffect hook will handle the response
    // For now, we return the user state after the auth flow completes
    return user;
  };

  const signOut = () => {
    setUser(null);
    // In a real app, you would also clear any stored tokens
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
