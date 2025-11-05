import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';

const ThemeScreen = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { themeMode, setThemeMode, activeTheme, colors } = useTheme();

    const themeOptions = [
        {
            value: 'light' as const,
            label: t('theme.light'),
            description: t('theme.lightDescription'),
            icon: 'sunny' as const,
        },
        {
            value: 'dark' as const,
            label: t('theme.dark'),
            description: t('theme.darkDescription'),
            icon: 'moon' as const,
        },
        {
            value: 'system' as const,
            label: t('theme.system'),
            description: t('theme.systemDescription'),
            icon: 'phone-portrait' as const,
        },
    ];

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
        },
        headerPressable: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '600',
            marginLeft: 8,
            color: colors.text,
        },
        content: {
            flex: 1,
        },
        scrollContent: {
            padding: 16,
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.textSecondary,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        optionCard: {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 2,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
        },
        optionCardSelected: {
            borderColor: colors.primary,
            backgroundColor: colors.backgroundSecondary,
        },
        iconContainer: {
            width: 48,
            height: 48,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
        },
        iconContainerLight: {
            backgroundColor: '#FEF3C7',
        },
        iconContainerDark: {
            backgroundColor: '#1E293B',
        },
        iconContainerSystem: {
            backgroundColor: colors.backgroundTertiary,
        },
        optionContent: {
            flex: 1,
        },
        optionLabel: {
            fontSize: 17,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 4,
        },
        optionDescription: {
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 20,
        },
        checkmark: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        previewSection: {
            marginTop: 8,
        },
        previewCard: {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
        },
        previewTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 12,
        },
        previewRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        previewLabel: {
            fontSize: 14,
            color: colors.textSecondary,
        },
        colorSwatch: {
            width: 32,
            height: 32,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
        },
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerPressable} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    <Text style={styles.headerTitle}>{t('theme.title')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('theme.selectTheme')}</Text>

                    {themeOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.optionCard,
                                themeMode === option.value && styles.optionCardSelected,
                            ]}
                            onPress={() => setThemeMode(option.value)}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    styles.iconContainer,
                                    option.value === 'light' && styles.iconContainerLight,
                                    option.value === 'dark' && styles.iconContainerDark,
                                    option.value === 'system' && styles.iconContainerSystem,
                                ]}
                            >
                                <Ionicons
                                    name={option.icon}
                                    size={24}
                                    color={
                                        option.value === 'light'
                                            ? '#F59E0B'
                                            : option.value === 'dark'
                                                ? '#60A5FA'
                                                : colors.primary
                                    }
                                />
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionLabel}>{option.label}</Text>
                                <Text style={styles.optionDescription}>{option.description}</Text>
                            </View>
                            {themeMode === option.value && (
                                <View style={styles.checkmark}>
                                    <Ionicons name="checkmark" size={16} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={[styles.section, styles.previewSection]}>
                    <Text style={styles.sectionTitle}>{t('theme.currentTheme')}</Text>
                    <View style={styles.previewCard}>
                        <Text style={styles.previewTitle}>{t('theme.preview')}</Text>

                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>{t('theme.activeTheme')}</Text>
                            <Text style={[styles.optionLabel, { fontSize: 14 }]}>
                                {activeTheme === 'dark' ? t('theme.dark') : t('theme.light')}
                            </Text>
                        </View>

                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>{t('theme.primaryColor')}</Text>
                            <View style={[styles.colorSwatch, { backgroundColor: colors.primary }]} />
                        </View>

                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>{t('theme.backgroundColor')}</Text>
                            <View style={[styles.colorSwatch, { backgroundColor: colors.background }]} />
                        </View>

                        <View style={[styles.previewRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.previewLabel}>{t('theme.textColor')}</Text>
                            <View style={[styles.colorSwatch, { backgroundColor: colors.text }]} />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ThemeScreen;
