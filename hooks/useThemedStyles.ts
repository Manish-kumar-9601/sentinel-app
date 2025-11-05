import { useTheme } from '../context/ThemeContext';
import { createGlobalStyles } from '../styles/globalStyles';

/**
 * Custom hook that combines theme colors with global styles
 * Usage in components:
 * 
 * const { colors, styles } = useThemedStyles();
 * 
 * Then use:
 * - colors.primary, colors.background, etc.
 * - styles.containers.container
 * - styles.text.heading1
 * - styles.buttons.buttonPrimary
 * etc.
 */
export const useThemedStyles = () => {
    const { colors, themeMode, activeTheme, setThemeMode, toggleTheme } = useTheme();
    const styles = createGlobalStyles(colors);

    return {
        colors,
        styles,
        themeMode,
        activeTheme,
        setThemeMode,
        toggleTheme,
    };
};

export default useThemedStyles;
