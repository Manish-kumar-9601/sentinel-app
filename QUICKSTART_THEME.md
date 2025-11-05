# Quick Start: Using Global Themed Styles

## 1-Minute Setup

### In Any Component:

```javascript
// 1. Import the hook
import { useThemedStyles } from "../../hooks/useThemedStyles";

// 2. Use in your component
const MyComponent = () => {
  const { colors, styles } = useThemedStyles();

  // 3. Use pre-built styles OR colors
  return (
    <View style={styles.containers.container}>
      <Text style={styles.text.heading1}>Title</Text>
    </View>
  );
};
```

## Common Replacements Cheat Sheet

```javascript
// BACKGROUNDS
'#FFFFFF'  →  colors.background
'#F7F8FA'  →  colors.backgroundSecondary
'white'    →  colors.background

// TEXT
'#11181C'  →  colors.text
'#687076'  →  colors.textSecondary
'black'    →  colors.text

// PRIMARY
'#FF4500'  →  colors.primary

// BORDERS
'#E5E7EB'  →  colors.border

// STATUS
'#006422'  →  colors.success
'#D93025'  →  colors.error
'#F59E0B'  →  colors.warning
'#007AFF'  →  colors.info
```

## Pre-built Styles Available

```javascript
const { styles } = useThemedStyles();

// Containers
styles.containers.container;
styles.containers.containerPadded;

// Cards
styles.cards.card;
styles.cards.cardElevated;

// Text
styles.text.heading1;
styles.text.body;
styles.text.subtitle;

// Buttons
styles.buttons.buttonPrimary;
styles.buttons.buttonText;

// Inputs
styles.inputs.input;
styles.inputs.inputLabel;

// Headers
styles.headers.header;
styles.headers.headerTitle;
```

## Complete Example

```javascript
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const MyScreen = () => {
  const { colors, styles } = useThemedStyles();

  return (
    <View style={styles.containers.containerPadded}>
      {/* Card with pre-built style */}
      <View style={styles.cards.card}>
        {/* Text with pre-built styles */}
        <Text style={styles.text.heading2}>Welcome</Text>
        <Text style={styles.text.subtitle}>This is themed!</Text>

        {/* Button with pre-built style */}
        <TouchableOpacity style={styles.buttons.buttonPrimary}>
          <Text style={styles.buttons.buttonText}>Click Me</Text>
        </TouchableOpacity>
      </View>

      {/* Icon with theme color */}
      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
    </View>
  );
};

export default MyScreen;
```

## That's It! 🎉

Your component now:

- ✅ Supports light mode
- ✅ Supports dark mode
- ✅ Uses consistent colors
- ✅ Adapts to user preference

## Need More?

- Full guide: `THEME_GUIDE.md`
- Color mapping: `docs/COLOR_MAPPING.md`
- Migration help: `docs/THEME_MIGRATION_GUIDE.tsx`
- Summary: `docs/THEME_SYSTEM_SUMMARY.md`
