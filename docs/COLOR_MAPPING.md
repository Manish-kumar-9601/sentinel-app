# Color Mapping Guide - Hardcoded to Themed

This guide provides a complete reference for migrating hardcoded colors to theme-aware variables.

## Quick Reference Table

| Hardcoded Color  | Light Mode Use Case  | Theme Variable               | Dark Mode Color |
| ---------------- | -------------------- | ---------------------------- | --------------- |
| `#FFFFFF`        | Main background      | `colors.background`          | `#000000`       |
| `#F7F8FA`        | Secondary background | `colors.backgroundSecondary` | `#1C1C1E`       |
| `#EEEFF1`        | Tertiary background  | `colors.backgroundTertiary`  | `#2C2C2E`       |
| `#11181C`        | Primary text         | `colors.text`                | `#ECEDEE`       |
| `#687076`        | Secondary text       | `colors.textSecondary`       | `#9BA1A6`       |
| `#9BA1A6`        | Tertiary text        | `colors.textTertiary`        | `#687076`       |
| `#FF4500`        | Primary/Emergency    | `colors.primary`             | `#FF6B33`       |
| `#FF6B33`        | Primary light        | `colors.primaryLight`        | `#FF8552`       |
| `#CC3700`        | Primary dark         | `colors.primaryDark`         | `#FF4500`       |
| `#E5E7EB`        | Border               | `colors.border`              | `#3A3A3C`       |
| `#F3F4F6`        | Light border         | `colors.borderLight`         | `#2C2C2E`       |
| `#006422`        | Success              | `colors.success`             | `#10B981`       |
| `#10B981`        | Success light        | `colors.successLight`        | `#34D399`       |
| `#D93025`        | Error                | `colors.error`               | `#EF4444`       |
| `#EF4444`        | Error light          | `colors.errorLight`          | `#F87171`       |
| `#F59E0B`        | Warning              | `colors.warning`             | `#FCD34D`       |
| `#FCD34D`        | Warning light        | `colors.warningLight`        | `#FDE68A`       |
| `#007AFF`        | Info                 | `colors.info`                | `#3B82F6`       |
| `#3B82F6`        | Info light           | `colors.infoLight`           | `#60A5FA`       |
| `#0a7ea4`        | Tint                 | `colors.tint`                | `#FFFFFF`       |
| `white` / `#FFF` | Card background      | `colors.card`                | `#1C1C1E`       |

## Common Pattern Replacements

### Backgrounds

```javascript
// ❌ Before
backgroundColor: "#FFFFFF";
backgroundColor: "#F7F8FA";
backgroundColor: "#EEEFF1";
backgroundColor: "white";

// ✅ After
backgroundColor: colors.background;
backgroundColor: colors.backgroundSecondary;
backgroundColor: colors.backgroundTertiary;
backgroundColor: colors.card;
```

### Text Colors

```javascript
// ❌ Before
color: "#11181C";
color: "#687076";
color: "#9BA1A6";
color: "#000000";
color: "black";
color: "white";

// ✅ After
color: colors.text;
color: colors.textSecondary;
color: colors.textTertiary;
color: colors.text;
color: colors.text;
color: colors.textInverse;
```

### Borders

```javascript
// ❌ Before
borderColor: "#E5E7EB";
borderColor: "#F3F4F6";
borderColor: "#E5E5EA";
borderColor: "#ddd";

// ✅ After
borderColor: colors.border;
borderColor: colors.borderLight;
borderColor: colors.border;
borderColor: colors.border;
```

### Primary/Brand Colors

```javascript
// ❌ Before
backgroundColor: "#FF4500";
color: "#FF4500";
backgroundColor: "#FF6B33";

// ✅ After
backgroundColor: colors.primary;
color: colors.primary;
backgroundColor: colors.primaryLight;
```

### Status Colors

```javascript
// ❌ Before
// Success
backgroundColor: "#006422";
color: "#10B981";

// Error
backgroundColor: "#D93025";
color: "#EF4444";

// Warning
backgroundColor: "#F59E0B";

// Info
backgroundColor: "#007AFF";

// ✅ After
// Success
backgroundColor: colors.success;
color: colors.successLight;

// Error
backgroundColor: colors.error;
color: colors.errorLight;

// Warning
backgroundColor: colors.warning;

// Info
backgroundColor: colors.info;
```

### Icons

```javascript
// ❌ Before
<Ionicons name="icon" size={24} color="#687076" />
<Ionicons name="icon" size={24} color="#FF4500" />
<Ionicons name="icon" size={24} color="#007AFF" />

// ✅ After
<Ionicons name="icon" size={24} color={colors.icon} />
<Ionicons name="icon" size={24} color={colors.primary} />
<Ionicons name="icon" size={24} color={colors.info} />
```

### Input Fields

```javascript
// ❌ Before
const styles = StyleSheet.create({
  input: {
    backgroundColor: "#F7F8FA",
    borderColor: "#E5E7EB",
    color: "#11181C",
  },
});

// ✅ After
const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.inputBorder,
    color: colors.inputText,
  },
});
```

### Special Colors

```javascript
// ❌ Before
backgroundColor: "rgba(0, 0, 0, 0.5)";
shadowColor: "#000";
shadowColor: "rgba(0, 0, 0, 0.1)";

// ✅ After
backgroundColor: colors.overlay;
shadowColor: colors.shadow;
shadowColor: colors.shadow;
```

## Complete Component Example

```javascript
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const ExampleScreen = () => {
  const { colors } = useThemedStyles();

  const styles = StyleSheet.create({
    // Containers
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },

    // Cards
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },

    // Text
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },

    // Buttons
    primaryButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 8,
    },
    secondaryButton: {
      backgroundColor: colors.backgroundSecondary,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      color: colors.textInverse,
      fontSize: 16,
      fontWeight: "600",
    },
    buttonTextSecondary: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },

    // Status indicators
    successBadge: {
      backgroundColor: colors.success,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    errorBadge: {
      backgroundColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    badgeText: {
      color: colors.textInverse,
      fontSize: 12,
      fontWeight: "600",
    },

    // Dividers
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Hello World</Text>
        <Text style={styles.subtitle}>This component is fully themed</Text>

        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.buttonText}>Primary Action</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.buttonTextSecondary}>Secondary Action</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={styles.successBadge}>
            <Text style={styles.badgeText}>Success</Text>
          </View>
          <View style={styles.errorBadge}>
            <Text style={styles.badgeText}>Error</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ExampleScreen;
```

## Color Categories by Use Case

### Emergency/SOS

- `colors.emergency` - Main emergency color
- `colors.emergencyLight` - Lighter emergency color
- Use for: SOS button, emergency alerts, critical actions

### Navigation/Tabs

- `colors.tint` - Navigation tint color
- `colors.tabIconDefault` - Inactive tab icons
- `colors.tabIconSelected` - Active tab icons
- Use for: Bottom navigation, tab bars

### Forms/Inputs

- `colors.inputBackground` - Input field background
- `colors.inputBorder` - Input field border
- `colors.inputText` - Input text color
- `colors.inputPlaceholder` - Placeholder text
- Use for: TextInput components, form fields

### Cards/Surfaces

- `colors.card` - Standard card background
- `colors.cardElevated` - Elevated card (with shadow)
- Use for: List items, content cards, panels

### Status Feedback

- `colors.success` / `colors.successLight` - Success states
- `colors.error` / `colors.errorLight` - Error states
- `colors.warning` / `colors.warningLight` - Warning states
- `colors.info` / `colors.infoLight` - Information states
- Use for: Alerts, badges, status indicators

## Testing Your Implementation

1. **Import the hook:**

   ```javascript
   import { useThemedStyles } from "../../hooks/useThemedStyles";
   const { colors } = useThemedStyles();
   ```

2. **Replace all hardcoded colors** with `colors.*` variables

3. **Test in both themes:**

   - Navigate to: Profile → App Settings → Theme
   - Switch to Light Mode - verify all looks correct
   - Switch to Dark Mode - verify all looks correct
   - Switch to System Default - verify it follows device

4. **Check for missed colors:**
   - Search your file for: `#`, `'white'`, `'black'`, `'rgb'`, `'rgba'`
   - Replace any remaining hardcoded colors

## Common Mistakes to Avoid

❌ **Don't** mix hardcoded and themed colors:

```javascript
// Bad - inconsistent
backgroundColor: colors.background,
color: '#000000', // Hardcoded!
```

❌ **Don't** use colors outside StyleSheet:

```javascript
// Bad
<View style={{ backgroundColor: colors.background }}>
```

✅ **Do** create styles with theme colors:

```javascript
// Good
const styles = StyleSheet.create({
  container: { backgroundColor: colors.background }
});
<View style={styles.container}>
```

❌ **Don't** forget to update icon colors:

```javascript
// Bad
<Ionicons name="icon" color="#FF4500" />

// Good
<Ionicons name="icon" color={colors.primary} />
```

## Need Help?

- See `THEME_GUIDE.md` for general theme usage
- See `THEME_MIGRATION_GUIDE.tsx` for detailed examples
- Check `styles/globalStyles.ts` for pre-built styles
- All theme colors are in `context/ThemeContext.tsx`
