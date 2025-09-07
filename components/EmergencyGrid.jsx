import { FontAwesome5, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const EmergencyCategory = ({ icon, name, color, iconSet, onPress }) => {
    const IconComponent = iconSet === 'MaterialCommunity' ? MaterialCommunityIcons : (iconSet === 'MaterialIcons') ? MaterialIcons : FontAwesome5;
    const IconSize = iconSet === 'MaterialCommunity' || iconSet === 'MaterialIcons' ? 36 : 28;
    return (
        <TouchableOpacity style={styles.categoryBox} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <IconComponent name={icon} size={IconSize} color="white" />
            </View>
            <Text style={styles.categoryText}>{name}</Text>
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

 const EmergencyGrid = ({ onCategorySelect }) => {
    const router = useRouter();
    const { t } = useTranslation();

    const categories = CATEGORY_CONFIG.map(cat => ({
        ...cat,
        name: t(`home.categories.${cat.id}`),
    }));

    const handlePress = (category) => {
        if (category.id === 'record') {
            router.push('/recorder');
        } else if (category.id === 'sound_recorder') {
            router.push('/audioRecorder');
        } else {
            onCategorySelect(category);
        }
    };

    return (
        <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>{t('home.emergencyGridTitle')}</Text>
            <View style={styles.categoriesGrid}>
                {categories.map((cat) => (
                    <EmergencyCategory
                        key={cat.id}
                        icon={cat.icon}
                        name={cat.name}
                        color={cat.color}
                        iconSet={cat.iconSet}
                        onPress={() => handlePress(cat)}
                    />
                ))}
            </View>
        </View>
    );
};
const styles = StyleSheet.create({
    categoriesSection: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E1E1E',
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 15,
    },
    categoryBox: {
        width: '30%',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#333',
    },
 
});

export default EmergencyGrid;