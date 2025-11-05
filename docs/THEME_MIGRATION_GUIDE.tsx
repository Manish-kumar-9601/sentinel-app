/**
 * MIGRATION GUIDE: From Hardcoded Colors to Themed Styles
 * 
 * This guide shows how to migrate existing components to use the global theme system.
 */

// ============================================
// BEFORE: Component with hardcoded colors
// ============================================

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const OldComponent = () => {
    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Hello World</Text>
                <Text style={styles.subtitle}>This is a subtitle</Text>
                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>Click Me</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // ❌ Hardcoded
        padding: 16,
    },
    card: {
        backgroundColor: '#FFFFFF', // ❌ Hardcoded
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB', // ❌ Hardcoded
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#11181C', // ❌ Hardcoded
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#687076', // ❌ Hardcoded
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#FF4500', // ❌ Hardcoded
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF', // ❌ Hardcoded
        fontSize: 16,
        fontWeight: '600',
    },
});

// ============================================
// AFTER: Component with themed styles
// ============================================

import React from 'react';
import { useThemedStyles } from '../../hooks/useThemedStyles';

const NewComponent = () => {
    // ✅ Get theme colors and pre-built styles
    const { colors, styles } = useThemedStyles();

    return (
        // ✅ Use pre-built container style
        <View style={styles.containers.containerPadded}>
            {/* ✅ Use pre-built card style */}
            <View style={styles.cards.card}>
                {/* ✅ Use pre-built text styles */}
                <Text style={styles.text.heading2}>Hello World</Text>
                <Text style={styles.text.subtitle}>This is a subtitle</Text>

                {/* ✅ Use pre-built button style */}
                <TouchableOpacity style={styles.buttons.buttonPrimary}>
                    <Text style={styles.buttons.buttonText}>Click Me</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ============================================
// OPTION 2: Custom styles with theme colors
// ============================================

import React from 'react';

const CustomStyledComponent = () => {
    const { colors } = useThemedStyles();

    // ✅ Create custom styles using theme colors
    const customStyles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background, // ✅ Theme-aware
            padding: 16,
        },
        card: {
            backgroundColor: colors.card, // ✅ Theme-aware
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border, // ✅ Theme-aware
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text, // ✅ Theme-aware
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 14,
            color: colors.textSecondary, // ✅ Theme-aware
            marginBottom: 16,
        },
        button: {
            backgroundColor: colors.primary, // ✅ Theme-aware
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
        },
        buttonText: {
            color: colors.textInverse, // ✅ Theme-aware
            fontSize: 16,
            fontWeight: '600',
        },
    });

    return (
        <View style={customStyles.container}>
            <View style={customStyles.card}>
                <Text style={customStyles.title}>Hello World</Text>
                <Text style={customStyles.subtitle}>This is a subtitle</Text>
                <TouchableOpacity style={customStyles.button}>
                    <Text style={customStyles.buttonText}>Click Me</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ============================================
// OPTION 3: Mix pre-built and custom styles
// ============================================

import React from 'react';
import { borderRadius, fontSize, fontWeight, spacing } from '../../styles/globalStyles';

const MixedStyleComponent = () => {
    const { colors, styles } = useThemedStyles();

    // ✅ Use pre-built styles + spacing/size constants
    const customStyles = StyleSheet.create({
        specialCard: {
            backgroundColor: colors.cardElevated,
            borderRadius: borderRadius.lg,
            padding: spacing.xl,
            marginBottom: spacing.lg,
        },
        specialTitle: {
            fontSize: fontSize.xxl,
            fontWeight: fontWeight.bold,
            color: colors.primary,
        },
    });

    return (
        <View style={styles.containers.container}>
            {/* Mix pre-built and custom */}
            <View style={[styles.cards.card, customStyles.specialCard]}>
                <Text style={[styles.text.heading1, customStyles.specialTitle]}>
                    Special Title
                </Text>
                <Text style={styles.text.body}>
                    Regular body text with theme colors
                </Text>
            </View>
        </View>
    );
};

// ============================================
// COLOR MAPPING REFERENCE
// ============================================

/*
HARDCODED COLOR → THEME COLOR VARIABLE

Whites/Backgrounds:
  '#FFFFFF' → colors.background / colors.card
  '#F7F8FA' → colors.backgroundSecondary / colors.inputBackground
  '#EEEFF1' → colors.backgroundTertiary

Blacks/Text:
  '#000000' → colors.background (dark mode)
  '#11181C' → colors.text
  '#687076' → colors.textSecondary / colors.icon
  '#9BA1A6' → colors.textTertiary / colors.inputPlaceholder

Primary/Brand:
  '#FF4500' → colors.primary / colors.emergency
  '#FF6B33' → colors.primaryLight / colors.emergencyLight
  '#CC3700' → colors.primaryDark

Borders:
  '#E5E7EB' → colors.border / colors.inputBorder
  '#F3F4F6' → colors.borderLight
  '#3A3A3C' → colors.border (dark mode)

Status Colors:
  '#006422' → colors.success
  '#10B981' → colors.successLight
  '#D93025' → colors.error
  '#EF4444' → colors.errorLight
  '#F59E0B' → colors.warning
  '#FCD34D' → colors.warningLight
  '#007AFF' → colors.info
  '#3B82F6' → colors.infoLight

Special:
  '#0a7ea4' → colors.tint
  'rgba(0, 0, 0, 0.5)' → colors.overlay
  'rgba(0, 0, 0, 0.1)' → colors.shadow

Dark Mode Only:
  '#1C1C1E' → colors.backgroundSecondary
  '#2C2C2E' → colors.backgroundTertiary / colors.cardElevated
  '#ECEDEE' → colors.text
*/

// ============================================
// PRE-BUILT STYLES REFERENCE
// ============================================

/*
Available pre-built style categories from useThemedStyles():

1. styles.containers
   - container
   - containerPadded
   - containerCentered
   - scrollContainer
   - scrollContent

2. styles.cards
   - card
   - cardElevated
   - cardNoPadding

3. styles.text
   - heading1, heading2, heading3, heading4
   - body, bodyLarge, bodySmall
   - caption, subtitle, label, link
   - textCenter, textBold, textSemibold

4. styles.buttons
   - buttonPrimary, buttonSecondary, buttonOutline
   - buttonText, buttonTextSecondary, buttonTextOutline
   - buttonSmall, buttonLarge, buttonDisabled

5. styles.inputs
   - inputContainer, inputLabel, input
   - inputFocused, inputError, inputErrorText
   - inputMultiline

6. styles.headers
   - header, headerTitle, headerButton

7. styles.lists
   - listItem, listItemCard, listItemContent
   - listItemTitle, listItemSubtitle
   - emptyState, emptyStateText

8. styles.modals
   - modalOverlay, modalContainer
   - modalTitle, modalMessage, modalButtons

9. styles.badges
   - badge, badgePrimary, badgeSuccess, badgeError
   - badgeWarning, badgeInfo, badgeText

10. styles.dividers
    - divider, dividerThick, dividerLight

Constants available directly:
- spacing: xs, sm, md, lg, xl, xxl, xxxl, huge
- borderRadius: xs, sm, md, lg, xl, round, circle
- fontSize: xs, sm, base, md, lg, xl, xxl, xxxl, huge, massive
- fontWeight: light, normal, medium, semibold, bold, extrabold
- shadows: sm, md, lg, xl
- layout: row, rowCenter, rowBetween, column, center, flex1
*/

// ============================================
// STEP-BY-STEP MIGRATION PROCESS
// ============================================

/*
1. Import useThemedStyles hook:
   import { useThemedStyles } from '../../hooks/useThemedStyles';

2. Use hook in component:
   const { colors, styles } = useThemedStyles();

3. For each hardcoded color:
   a. Check the color mapping reference above
   b. Replace with appropriate theme color
   c. Example: '#FFFFFF' → colors.background

4. For common patterns, use pre-built styles:
   a. Replace custom container styles with styles.containers.*
   b. Replace custom text styles with styles.text.*
   c. Replace custom button styles with styles.buttons.*

5. For custom styles, use StyleSheet.create inside component:
   const customStyles = StyleSheet.create({
     myStyle: {
       backgroundColor: colors.background,
       color: colors.text,
     }
   });

6. Test in both light and dark modes:
   - Go to Profile → App Settings → Theme
   - Toggle between Light and Dark modes
   - Verify all colors adapt correctly

7. Use spacing/size constants for consistency:
   import { spacing, fontSize, borderRadius } from '../../styles/globalStyles';
   padding: spacing.lg,
   fontSize: fontSize.md,
   borderRadius: borderRadius.md,
*/

export { };

