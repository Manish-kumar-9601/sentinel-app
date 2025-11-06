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
    primary: '#ff5416ff',
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
    navigatorColor: '#007AFF',
    // Status colors
    success: '#006422',
    successLight: '#10B981',
    error: '#D93025',
    errorLight: '#EF4444',
    warning: '#F59E0B',
    warningLight: '#FCD34D',
    info: '#007AFF',
    infoLight: '#3B82F6',

    // --- New Base Colors ---

    // Red
    red: '#EF4444',
    redLight: '#FEE2E2',
    redDark: '#B91C1C',

    // Green
    green: '#22C55E',
    greenLight: '#DCFCE7',
    greenDark: '#15803D',

    // Blue
    blue: '#3B82F6',
    blueLight: '#DBEAFE',
    blueDark: '#1D4ED8',

    // Yellow
    yellow: '#F59E0B',
    yellowLight: '#FEF3C7',
    yellowDark: '#B45309',

    // Purple
    purple: '#8B5CF6',
    purpleLight: '#EDE9FE',
    purpleDark: '#6D28D9',

    // Pink
    pink: '#EC4899',
    pinkLight: '#FCE7F3',
    pinkDark: '#BE185D',

    // Teal
    teal: '#14B8A6',
    tealLight: '#CCFBF1',
    tealDark: '#0F766E',

    // --- New Grayscale ---
    grey100: '#F7F8FA', // Same as backgroundSecondary
    grey200: '#EEEFF1', // Same as backgroundTertiary
    grey300: '#E5E7EB', // Same as border
    grey400: '#D1D5DB',
    grey500: '#9BA1A6', // Same as textTertiary
    grey600: '#687076', // Same as textSecondary
    grey700: '#4B5563',
    grey800: '#1F2937',
    grey900: '#11181C', // Same as text

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
    primary: '#FF4500', // Often, the primary color stays vibrant
    primaryLight: '#FF6B33',
    primaryDark: '#CC3700',

    // Background colors
    background: '#11181C', // Dark main background
    backgroundSecondary: '#1F2937', // Slightly lighter
    backgroundTertiary: '#4B5563', // Even lighter

    // Text colors
    text: '#FFFFFF', // White
    textSecondary: '#E5E7EB', // Light grey
    textTertiary: '#9BA1A6', // Muted grey
    textInverse: '#11181C', // Dark

    // UI colors
    border: '#4B5563', // Dark border
    borderLight: '#1F2937', // Very subtle border
    card: '#11181C', // Card background
    cardElevated: '#1F2937', // Card background
    navigatorColor: '#FF4500',

    // Status colors
    success: '#22C55E', // Bright green
    successLight: '#15803D', // Darker green for backgrounds
    error: '#EF4444', // Bright red
    errorLight: '#B91C1C', // Darker red for backgrounds
    warning: '#F59E0B', // Bright yellow/orange
    warningLight: '#B45309', // Darker yellow for backgrounds
    info: '#3B82F6', // Bright blue
    infoLight: '#1D4ED8', // Darker blue for backgrounds

    // --- Base Colors (Adjusted for dark mode) ---

    // Red
    red: '#EF4444',
    redLight: '#F87171', // Lighter shade for emphasis
    redDark: '#B91C1C', // Darker shade for backgrounds

    // Green
    green: '#22C55E',
    greenLight: '#4ADE80',
    greenDark: '#15803D',

    // Blue
    blue: '#3B82F6',
    blueLight: '#60A5FA',
    blueDark: '#1D4ED8',

    // Yellow
    yellow: '#F59E0B',
    yellowLight: '#FBBF24',
    yellowDark: '#B45309',

    // Purple
    purple: '#8B5CF6',
    purpleLight: '#A78BFA',
    purpleDark: '#6D28D9',

    // Pink
    pink: '#EC4899',
    pinkLight: '#F472B6',
    pinkDark: '#BE185D',

    // Teal
    teal: '#14B8A6',
    tealLight: '#2DD4BF',
    tealDark: '#0F766E',

    // --- Grayscale (Inverted logic) ---
    grey100: '#11181C', // Same as background
    grey200: '#1F2937', // Same as backgroundSecondary
    grey300: '#4B5563', // Same as backgroundTertiary
    grey400: '#687076', // Muted text/icons
    grey500: '#9BA1A6', // Same as textTertiary
    grey600: '#D1D5DB', // Light grey
    grey700: '#E5E7EB', // Same as textSecondary
    grey800: '#F3F4F6', // Lighter grey
    grey900: '#FFFFFF', // Same as text

    // Special colors
    tint: '#0a7ea4', // May want to adjust this for contrast
    icon: '#9BA1A6', // Muted grey
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#0a7ea4', // Same tint
    shadow: 'rgba(0, 0, 0, 0.1)', // Shadows are less prominent in dark mode
    overlay: 'rgba(0, 0, 0, 0.5)', // Stays the same, or could be a light overlay

    // Emergency colors
    emergency: '#FF4500',
    emergencyLight: '#FF6B33',

    // Input colors
    inputBackground: '#1F2937', // Dark input
    inputBorder: '#4B5563', // Muted border
    inputText: '#FFFFFF', // Light text
    inputPlaceholder: '#9BA1A6', // Muted placeholder
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

