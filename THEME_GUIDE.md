# Theme System Guide

## Overview

The Sentinel app now has a comprehensive theme system supporting Light Mode, Dark Mode, and System Default mode.

## Features

- ✅ Light Mode - Bright interface for daytime use
- ✅ Dark Mode - Eye-friendly for low-light environments
- ✅ System Default - Automatically matches device settings
- ✅ Persistent theme preference (saved in AsyncStorage)
- ✅ Complete color palette for both themes
- ✅ Easy-to-use React hooks

## How to Use the Theme in Your Components

### 1. Import the useTheme hook

```tsx
import { useTheme } from "../../../context/ThemeContext";
```

### 2. Access theme in your component

```tsx
const MyComponent = () => {
  const { themeMode, activeTheme, colors, setThemeMode, toggleTheme } =
    useTheme();

  // Use colors in your styles
  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    text: {
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World</Text>
    </View>
  );
};
```

### 3. Available Theme Values

#### Theme Properties

- `themeMode`: `'light' | 'dark' | 'system'` - User's selected preference
- `activeTheme`: `'light' | 'dark'` - The currently active theme
- `colors`: Complete color palette object
- `setThemeMode(mode)`: Function to change theme
- `toggleTheme()`: Function to toggle between light and dark

#### Available Colors

**Primary Colors**

- `colors.primary` - Main brand color (#FF4500 light / #FF6B33 dark)
- `colors.primaryLight` - Lighter variant
- `colors.primaryDark` - Darker variant

**Background Colors**

- `colors.background` - Main background (#FFFFFF light / #000000 dark)
- `colors.backgroundSecondary` - Secondary background (#F7F8FA light / #1C1C1E dark)
- `colors.backgroundTertiary` - Tertiary background (#EEEFF1 light / #2C2C2E dark)

**Text Colors**

- `colors.text` - Primary text (#11181C light / #ECEDEE dark)
- `colors.textSecondary` - Secondary text (#687076 light / #9BA1A6 dark)
- `colors.textTertiary` - Tertiary text (#9BA1A6 light / #687076 dark)
- `colors.textInverse` - Inverse text (#FFFFFF light / #11181C dark)

**UI Colors**

- `colors.border` - Border color (#E5E7EB light / #3A3A3C dark)
- `colors.borderLight` - Light border (#F3F4F6 light / #2C2C2E dark)
- `colors.card` - Card background (#FFFFFF light / #1C1C1E dark)
- `colors.cardElevated` - Elevated card (#FFFFFF light / #2C2C2E dark)

**Status Colors**

- `colors.success` / `colors.successLight` - Success states
- `colors.error` / `colors.errorLight` - Error states
- `colors.warning` / `colors.warningLight` - Warning states
- `colors.info` / `colors.infoLight` - Info states

**Special Colors**

- `colors.emergency` / `colors.emergencyLight` - Emergency/SOS colors
- `colors.shadow` - Shadow color with opacity
- `colors.overlay` - Overlay background with opacity

**Input Colors**

- `colors.inputBackground` - Input field background
- `colors.inputBorder` - Input field border
- `colors.inputText` - Input text color
- `colors.inputPlaceholder` - Placeholder text color

## Complete Example Component

```tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

const ExampleComponent = () => {
  const { activeTheme, colors, toggleTheme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    buttonText: {
      color: colors.textInverse,
      fontSize: 16,
      fontWeight: "600",
    },
    themeToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.backgroundSecondary,
      padding: 16,
      borderRadius: 8,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Theme System Example</Text>
        <Text style={styles.subtitle}>
          Current theme: {activeTheme === "dark" ? "Dark Mode" : "Light Mode"}
        </Text>

        <TouchableOpacity style={styles.button} onPress={toggleTheme}>
          <Text style={styles.buttonText}>Toggle Theme</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.themeToggle}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name={activeTheme === "dark" ? "moon" : "sunny"}
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.title, { marginLeft: 12, marginBottom: 0 }]}>
            {activeTheme === "dark" ? "Dark Mode" : "Light Mode"}
          </Text>
        </View>
        <Switch
          value={activeTheme === "dark"}
          onValueChange={toggleTheme}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.background}
        />
      </View>
    </View>
  );
};

export default ExampleComponent;
```

## Accessing Theme Settings

Users can access theme settings from:

1. **Profile Screen** → App Settings → Theme
2. Direct navigation to `/settings/theme`

The theme screen allows users to choose between:

- ☀️ Light Mode
- 🌙 Dark Mode
- 📱 System Default (follows device settings)

## Benefits

1. **Better User Experience**: Users can choose their preferred appearance
2. **Battery Saving**: Dark mode can save battery on OLED screens
3. **Accessibility**: Reduces eye strain in low-light conditions
4. **Consistency**: All components use the same color system
5. **Easy Maintenance**: Change colors in one place (ThemeContext.tsx)

## Migration Guide

To update existing components to use the theme:

### Before:

```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
  },
  text: {
    color: "#000000",
  },
});
```

### After:

```tsx
const MyComponent = () => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    text: {
      color: colors.text,
    },
  });

  return <View style={styles.container}>...</View>;
};
```

## Notes

- Theme preference is automatically saved and persisted across app restarts
- The theme system is already integrated into the app's root layout
- All new screens should use the theme colors for consistency
- The system respects device appearance when "System Default" is selected
