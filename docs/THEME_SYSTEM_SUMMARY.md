# Global Theme System - Implementation Summary

## 🎨 What's Been Created

### 1. Core Theme System

- **`context/ThemeContext.tsx`** - Theme provider with light/dark mode support
- **`styles/globalStyles.ts`** - Comprehensive style utilities and constants
- **`hooks/useThemedStyles.ts`** - Custom hook combining theme + styles

### 2. Documentation

- **`THEME_GUIDE.md`** - General theme usage guide
- **`docs/THEME_MIGRATION_GUIDE.tsx`** - Detailed migration examples
- **`docs/COLOR_MAPPING.md`** - Complete color reference table

### 3. UI Components

- **`app/(app)/settings/theme.tsx`** - Theme selection screen
- **Updated `app/(app)/profile.tsx`** - Added theme menu item

### 4. Example Implementation

- **`app/(app)/settings/privacy.jsx`** - Converted to use themed styles

## 📚 System Architecture

```
┌─────────────────────────────────────┐
│      ThemeProvider (Root)          │
│   - Manages theme state             │
│   - Loads/saves preferences         │
│   - Provides colors to app          │
└────────────┬────────────────────────┘
             │
             ├─► Light Colors
             ├─► Dark Colors
             └─► System Detection
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐         ┌──────▼──────┐
    │  useTheme│         │useThemedStyles│
    │          │         │               │
    │ Returns: │         │  Returns:     │
    │ - colors │         │  - colors     │
    │ - mode   │         │  - styles.*   │
    │ - toggle │         │  - spacing    │
    └──────────┘         │  - sizes      │
                         └───────────────┘
```

## 🎯 Available Resources

### Colors (60+ variables)

```typescript
colors.primary              colors.background
colors.text                 colors.border
colors.success             colors.error
colors.warning             colors.info
colors.emergency           colors.inputBackground
// ... and many more
```

### Pre-built Styles

```typescript
styles.containers.*    // container, containerPadded, etc.
styles.cards.*         // card, cardElevated, etc.
styles.text.*          // heading1-4, body, subtitle, etc.
styles.buttons.*       // buttonPrimary, buttonSecondary, etc.
styles.inputs.*        // input, inputLabel, etc.
styles.headers.*       // header, headerTitle, etc.
styles.lists.*         // listItem, listItemCard, etc.
styles.modals.*        // modalOverlay, modalContainer, etc.
styles.badges.*        // badge, badgePrimary, etc.
styles.dividers.*      // divider, dividerThick, etc.
```

### Constants

```typescript
spacing; // xs, sm, md, lg, xl, xxl, xxxl, huge
borderRadius; // xs, sm, md, lg, xl, round, circle
fontSize; // xs, sm, base, md, lg, xl, xxl, xxxl, huge, massive
fontWeight; // light, normal, medium, semibold, bold, extrabold
shadows; // sm, md, lg, xl
layout; // row, rowCenter, rowBetween, column, center, flex1
```

## 🚀 How to Use

### Option 1: Pre-built Styles (Recommended)

```javascript
import { useThemedStyles } from "../../hooks/useThemedStyles";

const MyComponent = () => {
  const { colors, styles } = useThemedStyles();

  return (
    <View style={styles.containers.container}>
      <View style={styles.cards.card}>
        <Text style={styles.text.heading1}>Title</Text>
        <Text style={styles.text.body}>Content</Text>
        <TouchableOpacity style={styles.buttons.buttonPrimary}>
          <Text style={styles.buttons.buttonText}>Action</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

### Option 2: Custom Styles with Theme Colors

```javascript
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { StyleSheet } from "react-native";

const MyComponent = () => {
  const { colors } = useThemedStyles();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      padding: 16,
    },
    text: {
      color: colors.text,
      fontSize: 16,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello</Text>
    </View>
  );
};
```

### Option 3: Mix Both Approaches

```javascript
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { spacing, borderRadius } from "../../styles/globalStyles";
import { StyleSheet } from "react-native";

const MyComponent = () => {
  const { colors, styles: globalStyles } = useThemedStyles();

  const customStyles = StyleSheet.create({
    specialCard: {
      backgroundColor: colors.cardElevated,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
    },
  });

  return (
    <View style={globalStyles.containers.container}>
      <View style={[globalStyles.cards.card, customStyles.specialCard]}>
        <Text style={globalStyles.text.heading2}>Title</Text>
      </View>
    </View>
  );
};
```

## 🔄 Migration Process

### Step 1: Import Hook

```javascript
import { useThemedStyles } from "../../hooks/useThemedStyles";
```

### Step 2: Use in Component

```javascript
const { colors, styles } = useThemedStyles();
```

### Step 3: Replace Colors

```javascript
// Before
backgroundColor: "#FFFFFF";
color: "#000000";
borderColor: "#E5E7EB";

// After
backgroundColor: colors.background;
color: colors.text;
borderColor: colors.border;
```

### Step 4: Update Icons

```javascript
// Before
<Ionicons name="icon" color="#FF4500" />

// After
<Ionicons name="icon" color={colors.primary} />
```

### Step 5: Test Both Themes

- Profile → App Settings → Theme
- Test Light Mode
- Test Dark Mode
- Test System Default

## 📋 Color Mapping Quick Reference

| What           | Hardcoded | Theme Variable         |
| -------------- | --------- | ---------------------- |
| Background     | `#FFFFFF` | `colors.background`    |
| Text           | `#11181C` | `colors.text`          |
| Secondary Text | `#687076` | `colors.textSecondary` |
| Primary        | `#FF4500` | `colors.primary`       |
| Border         | `#E5E7EB` | `colors.border`        |
| Success        | `#006422` | `colors.success`       |
| Error          | `#D93025` | `colors.error`         |
| Warning        | `#F59E0B` | `colors.warning`       |
| Info           | `#007AFF` | `colors.info`          |

## ✅ Example Screens to Migrate

### High Priority (User-facing)

1. ✅ `app/(app)/settings/privacy.jsx` - Done!
2. `app/(app)/index.tsx` - Home screen
3. `app/(app)/profile.tsx` - Profile screen
4. `app/(app)/settings/myCircle.tsx` - My Circle
5. `app/(auth)/login.tsx` - Login screen
6. `app/(auth)/register.tsx` - Register screen

### Medium Priority (Settings)

7. `app/(app)/settings/userInfo.tsx`
8. `app/(app)/settings/language.jsx`
9. `app/(app)/settings/shake-and-voice.tsx`

### Components

10. `components/SOSCard.jsx`
11. `components/EmergencyGrid.jsx`
12. `components/BottomNavBar.jsx`
13. `components/ContactListModal.tsx`

## 🎨 Benefits

✅ **Consistent Colors** - Single source of truth  
✅ **Dark Mode Support** - Automatic color adaptation  
✅ **Easy Maintenance** - Change once, applies everywhere  
✅ **Better UX** - User choice improves satisfaction  
✅ **Accessibility** - Reduced eye strain in dark mode  
✅ **Battery Saving** - Dark mode saves battery on OLED  
✅ **Type Safety** - TypeScript support for all colors  
✅ **Pre-built Styles** - Common patterns ready to use

## 📱 User Access

Users can change theme from:
**Profile → App Settings → Theme**

Options:

- ☀️ Light Mode
- 🌙 Dark Mode
- 📱 System Default (follows device)

## 🔧 Maintenance

### Adding New Colors

Edit `context/ThemeContext.tsx`:

```typescript
export const lightColors = {
  // Add new color
  myNewColor: "#123456",
};

export const darkColors = {
  // Add dark variant
  myNewColor: "#654321",
};
```

### Adding New Pre-built Styles

Edit `styles/globalStyles.ts`:

```typescript
export const createMyStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    myStyle: {
      backgroundColor: colors.background,
      // ...
    },
  });
```

## 📖 Documentation Files

1. **THEME_GUIDE.md** - Basic usage and setup
2. **docs/THEME_MIGRATION_GUIDE.tsx** - Detailed examples
3. **docs/COLOR_MAPPING.md** - Complete color reference
4. **docs/THEME_SYSTEM_SUMMARY.md** - This file!

## 🎯 Next Steps

1. **Start with simple screens** (like privacy.jsx - already done!)
2. **Move to high-impact screens** (home, profile)
3. **Then components** (SOSCard, BottomNavBar)
4. **Finally auth screens** (login, register)

Each screen you migrate becomes theme-aware automatically! 🎉

## 💡 Pro Tips

- Use pre-built styles for 80% of cases
- Only create custom styles when needed
- Always use `colors.*` for any color value
- Import spacing/size constants for consistency
- Test in both light and dark modes
- Check icon colors - they're often hardcoded!

## ❓ Need Help?

- See example in `app/(app)/settings/privacy.jsx`
- Check color mapping in `docs/COLOR_MAPPING.md`
- Review migration guide in `docs/THEME_MIGRATION_GUIDE.tsx`
- All colors defined in `context/ThemeContext.tsx`
- All styles in `styles/globalStyles.ts`
