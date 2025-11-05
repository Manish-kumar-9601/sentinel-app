/**
 * Global Styles - Central Export
 * 
 * This file exports everything you need for themed styles.
 * Import from here for convenience:
 * 
 * import { useThemedStyles, spacing, fontSize, ... } from '@/styles';
 */

// Re-export the hook
export { default as useThemedStyles } from '../hooks/useThemedStyles';

// Re-export theme context
export { darkColors, lightColors, ThemeProvider, useTheme } from '../context/ThemeContext';

// Re-export all style utilities
export {
    borderRadius, createBadgeStyles, createButtonStyles, createCardStyles, createContainerStyles, createDividerStyles,
    createGlobalStyles, createHeaderStyles, createInputStyles, createListStyles,
    createModalStyles, fontSize,
    fontWeight, layout, shadows, spacing
} from './globalStyles';

// Re-export types
export type { ThemeColors } from './globalStyles';

