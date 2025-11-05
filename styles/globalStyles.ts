import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

/**
 * Global Style Variables and Utilities
 * This file provides theme-aware style utilities that work with ThemeContext
 * Import these functions in your components and pass colors from useTheme()
 */

// Type definitions for better TypeScript support
export type ThemeColors = {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;
    border: string;
    borderLight: string;
    card: string;
    cardElevated: string;
    success: string;
    successLight: string;
    error: string;
    errorLight: string;
    warning: string;
    warningLight: string;
    info: string;
    infoLight: string;
    tint: string;
    icon: string;
    tabIconDefault: string;
    tabIconSelected: string;
    shadow: string;
    overlay: string;
    emergency: string;
    emergencyLight: string;
    inputBackground: string;
    inputBorder: string;
    inputText: string;
    inputPlaceholder: string;
};

/**
 * Common spacing values (in pixels)
 */
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
} as const;

/**
 * Common border radius values
 */
export const borderRadius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    round: 50,
    circle: 999,
} as const;

/**
 * Typography scale
 */
export const fontSize = {
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
    massive: 48,
} as const;

/**
 * Font weights
 */
export const fontWeight = {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
};

/**
 * Common shadows
 */
export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
} as const;

/**
 * Create common container styles with theme colors
 */
export const createContainerStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,

    containerPadded: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
    } as ViewStyle,

    containerCentered: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,

    scrollContainer: {
        flex: 1,
        backgroundColor: colors.background,
    } as ViewStyle,

    scrollContent: {
        padding: spacing.lg,
    } as ViewStyle,
});

/**
 * Create common card styles with theme colors
 */
export const createCardStyles = (colors: ThemeColors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,

    cardElevated: {
        backgroundColor: colors.cardElevated,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.md,
    } as ViewStyle,

    cardNoPadding: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,
});

/**
 * Create common text styles with theme colors
 */
export const createTextStyles = (colors: ThemeColors) => StyleSheet.create({
    heading1: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.md,
    } as TextStyle,

    heading2: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.sm,
    } as TextStyle,

    heading3: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginBottom: spacing.sm,
    } as TextStyle,

    heading4: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    } as TextStyle,

    body: {
        fontSize: fontSize.base,
        color: colors.text,
        lineHeight: 20,
    } as TextStyle,

    bodyLarge: {
        fontSize: fontSize.md,
        color: colors.text,
        lineHeight: 24,
    } as TextStyle,

    bodySmall: {
        fontSize: fontSize.sm,
        color: colors.text,
        lineHeight: 18,
    } as TextStyle,

    caption: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        lineHeight: 16,
    } as TextStyle,

    subtitle: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        lineHeight: 20,
    } as TextStyle,

    label: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.text,
        marginBottom: spacing.xs,
    } as TextStyle,

    link: {
        fontSize: fontSize.base,
        color: colors.primary,
        textDecorationLine: 'underline',
    } as TextStyle,

    textCenter: {
        textAlign: 'center',
    } as TextStyle,

    textBold: {
        fontWeight: fontWeight.bold,
    } as TextStyle,

    textSemibold: {
        fontWeight: fontWeight.semibold,
    } as TextStyle,
});

/**
 * Create common button styles with theme colors
 */
export const createButtonStyles = (colors: ThemeColors) => StyleSheet.create({
    buttonPrimary: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    } as ViewStyle,

    buttonSecondary: {
        backgroundColor: colors.backgroundSecondary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,

    buttonOutline: {
        backgroundColor: 'transparent',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
    } as ViewStyle,

    buttonText: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.textInverse,
    } as TextStyle,

    buttonTextSecondary: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    } as TextStyle,

    buttonTextOutline: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
    } as TextStyle,

    buttonSmall: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.sm,
    } as ViewStyle,

    buttonLarge: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xxl,
        borderRadius: borderRadius.lg,
    } as ViewStyle,

    buttonDisabled: {
        backgroundColor: colors.border,
        opacity: 0.5,
    } as ViewStyle,
});

/**
 * Create common input styles with theme colors
 */
export const createInputStyles = (colors: ThemeColors) => StyleSheet.create({
    inputContainer: {
        marginBottom: spacing.lg,
    } as ViewStyle,

    inputLabel: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.text,
        marginBottom: spacing.xs,
    } as TextStyle,

    input: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        fontSize: fontSize.base,
        color: colors.inputText,
    } as ViewStyle,

    inputFocused: {
        borderColor: colors.primary,
        borderWidth: 2,
    } as ViewStyle,

    inputError: {
        borderColor: colors.error,
    } as ViewStyle,

    inputErrorText: {
        fontSize: fontSize.xs,
        color: colors.error,
        marginTop: spacing.xs,
    } as TextStyle,

    inputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingTop: spacing.md,
    } as ViewStyle,
});

/**
 * Create common header styles with theme colors
 */
export const createHeaderStyles = (colors: ThemeColors) => StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    } as ViewStyle,

    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.text,
        marginLeft: spacing.sm,
    } as TextStyle,

    headerButton: {
        padding: spacing.sm,
    } as ViewStyle,
});

/**
 * Create common list item styles with theme colors
 */
export const createListStyles = (colors: ThemeColors) => StyleSheet.create({
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    } as ViewStyle,

    listItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    } as ViewStyle,

    listItemContent: {
        flex: 1,
        marginLeft: spacing.md,
    } as ViewStyle,

    listItemTitle: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.medium,
        color: colors.text,
        marginBottom: spacing.xs,
    } as TextStyle,

    listItemSubtitle: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    } as TextStyle,

    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xxl,
    } as ViewStyle,

    emptyStateText: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.md,
    } as TextStyle,
});

/**
 * Create modal styles with theme colors
 */
export const createModalStyles = (colors: ThemeColors) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,

    modalContainer: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        width: '85%',
        maxWidth: 400,
        ...shadows.xl,
    } as ViewStyle,

    modalTitle: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.text,
        marginBottom: spacing.md,
        textAlign: 'center',
    } as TextStyle,

    modalMessage: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 20,
    } as TextStyle,

    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    } as ViewStyle,
});

/**
 * Create badge/chip styles with theme colors
 */
export const createBadgeStyles = (colors: ThemeColors) => StyleSheet.create({
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.round,
        alignSelf: 'flex-start',
    } as ViewStyle,

    badgePrimary: {
        backgroundColor: colors.primary,
    } as ViewStyle,

    badgeSuccess: {
        backgroundColor: colors.success,
    } as ViewStyle,

    badgeError: {
        backgroundColor: colors.error,
    } as ViewStyle,

    badgeWarning: {
        backgroundColor: colors.warning,
    } as ViewStyle,

    badgeInfo: {
        backgroundColor: colors.info,
    } as ViewStyle,

    badgeText: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: colors.textInverse,
    } as TextStyle,
});

/**
 * Create divider styles with theme colors
 */
export const createDividerStyles = (colors: ThemeColors) => StyleSheet.create({
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    } as ViewStyle,

    dividerThick: {
        height: 2,
        backgroundColor: colors.border,
        marginVertical: spacing.lg,
    } as ViewStyle,

    dividerLight: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: spacing.md,
    } as ViewStyle,
});

/**
 * Utility function to create all common styles at once
 * Usage: const styles = createGlobalStyles(colors);
 */
export const createGlobalStyles = (colors: ThemeColors) => ({
    containers: createContainerStyles(colors),
    cards: createCardStyles(colors),
    text: createTextStyles(colors),
    buttons: createButtonStyles(colors),
    inputs: createInputStyles(colors),
    headers: createHeaderStyles(colors),
    lists: createListStyles(colors),
    modals: createModalStyles(colors),
    badges: createBadgeStyles(colors),
    dividers: createDividerStyles(colors),
});

/**
 * Common layout utilities (theme-independent)
 */
export const layout = StyleSheet.create({
    row: {
        flexDirection: 'row',
    },
    rowCenter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    column: {
        flexDirection: 'column',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    flex1: {
        flex: 1,
    },
});
