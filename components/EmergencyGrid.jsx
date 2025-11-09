import { borderRadius, fontSize, fontWeight, layout, spacing, useTheme } from "@/styles";
import { FontAwesome5, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

const EmergencyCategory = ({ icon, name, color, iconSet, onPress, textColor }) =>
{
    const IconComponent = iconSet === 'MaterialCommunity' ? MaterialCommunityIcons : (iconSet === 'MaterialIcons') ? MaterialIcons : FontAwesome5;
    const IconSize = iconSet === 'MaterialCommunity' || iconSet === 'MaterialIcons' ? 36 : 28;
    return (
        <TouchableOpacity
            style={{
                width: '30%',
                alignItems: 'center',
                marginBottom: spacing.lg
            }}
            onPress={onPress}
        >
            <View style={[
                layout.center,
                {
                    width: 60,
                    height: 60,
                    borderRadius: borderRadius.md,
                    backgroundColor: color,
                    marginBottom: spacing.xs
                }
            ]}>
                <IconComponent name={icon} size={IconSize} color="white" />
            </View>
            <Text style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: textColor
            }}>
                {name}
            </Text>
        </TouchableOpacity>
    );
};

const CATEGORY_CONFIG = [
    { id: 'medical', icon: 'medical-bag', color: '#FF6B6B', iconSet: 'MaterialCommunity' },
    { id: 'fire', icon: 'fire', color: '#FFA500', iconSet: 'FontAwesome5' },
    { id: 'accident', icon: 'car-crash', color: '#9370DB', iconSet: 'FontAwesome5' },
    { id: 'violence', icon: 'user-ninja', color: '#4682B4', iconSet: 'FontAwesome5' },
    { id: 'natural_disaster', icon: 'cloud-showers-heavy', color: '#1E90FF', iconSet: 'FontAwesome5' },
    { id: 'rescue', icon: 'hands-helping', color: '#3CB371', iconSet: 'FontAwesome5' },
    { id: 'psychiatrist', icon: 'psychology', color: '#d44ec2ff', iconSet: 'MaterialIcons' },
    { id: 'record', icon: 'video', color: '#5856D6', iconSet: 'MaterialCommunity' },
    { id: 'sound_recorder', icon: 'multitrack-audio', color: '#7a78f0ff', iconSet: 'MaterialIcons' },
];

export const EmergencyGrid = ({ onCategorySelect }) =>
{
    const router = useRouter();
    const { t } = useTranslation();
    const { colors } = useTheme();

    const categories = CATEGORY_CONFIG.map(cat => ({
        ...cat,
        name: t(`home.categories.${cat.id}`),
    }));

    const handlePress = (category) =>
    {
        if (category.id === 'record')
        {
            router.push('/recorder');
        } else if (category.id === 'sound_recorder')
        {
            router.push('/audioRecorder');
        } else
        {
            onCategorySelect(category);
        }
    };

    return (
        <View style={{
            paddingHorizontal: spacing.lg,
            marginTop: spacing.sm
        }}>
            <Text style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
                color: colors.text
            }}>
                {t('home.emergencyGridTitle')}
            </Text>
            <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                marginTop: spacing.md
            }}>
                {categories.map((cat) => (
                    <EmergencyCategory
                        key={cat.id}
                        icon={cat.icon}
                        name={cat.name}
                        color={cat.color}
                        iconSet={cat.iconSet}
                        textColor={colors.text}
                        onPress={() => handlePress(cat)}
                    />
                ))}
            </View>
        </View>
    );
};

