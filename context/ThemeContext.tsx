import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';
type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
    themeMode: ThemeMode;
    activeTheme: ActiveTheme;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
    colors: typeof lightColors;
}

const THEME_STORAGE_KEY = '@theme_mode';

// Light theme colors
export const lightColors = {
    // Primary colors
    primary: '#FF4500',
    primaryLight: '#FF6B33',
    primaryDark: '#CC3700',

    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F7F8FA',
    backgroundTertiary: '#EEEFF1',

    // Text colors
    text: '#11181C',
    textSecondary: '#687076',
    textTertiary: '#9BA1A6',
    textInverse: '#FFFFFF',

    // UI colors
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',

    // Status colors
    success: '#006422',
    successLight: '#10B981',
    error: '#D93025',
    errorLight: '#EF4444',
    warning: '#F59E0B',
    warningLight: '#FCD34D',
    info: '#007AFF',
    infoLight: '#3B82F6',

    // Special colors
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Emergency colors
    emergency: '#FF4500',
    emergencyLight: '#FF6B33',

    // Input colors
    inputBackground: '#F7F8FA',
    inputBorder: '#E5E7EB',
    inputText: '#11181C',
    inputPlaceholder: '#9BA1A6',
};

// Dark theme colors
export const darkColors = {
    // Primary colors
    primary: '#FF6B33',
    primaryLight: '#FF8552',
    primaryDark: '#FF4500',

    // Background colors
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    backgroundTertiary: '#2C2C2E',

    // Text colors
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    textTertiary: '#687076',
    textInverse: '#11181C',

    // UI colors
    border: '#3A3A3C',
    borderLight: '#2C2C2E',
    card: '#1C1C1E',
    cardElevated: '#2C2C2E',

    // Status colors
    success: '#10B981',
    successLight: '#34D399',
    error: '#EF4444',
    errorLight: '#F87171',
    warning: '#FCD34D',
    warningLight: '#FDE68A',
    info: '#3B82F6',
    infoLight: '#60A5FA',

    // Special colors
    tint: '#FFFFFF',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FFFFFF',
    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.7)',

    // Emergency colors
    emergency: '#FF6B33',
    emergencyLight: '#FF8552',

    // Input colors
    inputBackground: '#2C2C2E',
    inputBorder: '#3A3A3C',
    inputText: '#ECEDEE',
    inputPlaceholder: '#687076',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemColorScheme = useSystemColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [isLoading, setIsLoading] = useState(true);

    // Load saved theme preference
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
                    setThemeModeState(savedTheme as ThemeMode);
                }
            } catch (error) {
                console.error('Failed to load theme preference:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadTheme();
    }, []);

    // Determine active theme based on mode and system preference
    const activeTheme: ActiveTheme =
        themeMode === 'system'
            ? (systemColorScheme === 'dark' ? 'dark' : 'light')
            : themeMode;

    // Get colors based on active theme
    const colors = activeTheme === 'dark' ? darkColors : lightColors;

    // Save theme preference
    const setThemeMode = async (mode: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            setThemeModeState(mode);
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    };

    // Toggle between light and dark (ignores system)
    const toggleTheme = () => {
        const newMode = activeTheme === 'dark' ? 'light' : 'dark';
        setThemeMode(newMode);
    };

    if (isLoading) {
        return null; // Or a loading screen
    }

    return (
        <ThemeContext.Provider
            value={{
                themeMode,
                activeTheme,
                setThemeMode,
                toggleTheme,
                colors,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Export colors for direct use if needed
export { darkColors as dark, lightColors as light };

