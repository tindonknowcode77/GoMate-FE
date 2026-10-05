import { ComponentProps, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '../components/LocalizedText';
import { colors, control, layout, radii } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ActivityFilters = {
  distance: number;
  categories: string[];
  budget: string;
  days: number[];
  fromHour: number;
  toHour: number;
};

export const defaultActivityFilters: ActivityFilters = {
  distance: 10,
  categories: [],
  budget: 'Tất cả',
  days: [],
  fromHour: 0,
  toHour: 24,
};

type FilterScreenProps = {
  initialFilters?: ActivityFilters;
  onApply: (filters: ActivityFilters) => void;
  onClose: () => void;
};

const distances = [1, 5, 10, 20, 50];
const categories: { color: string; icon: IconName; label: string }[] = [
  { color: colors.primary, icon: 'grid', label: 'Tất cả' },
  { color: colors.categoryFood, icon: 'restaurant', label: 'Ăn uống' },
  { color: colors.categorySport, icon: 'barbell', label: 'Thể thao' },
  { color: colors.success, icon: 'airplane', label: 'Du lịch' },
  { color: colors.match, icon: 'musical-notes', label: 'Giải trí' },
  { color: colors.primary, icon: 'school', label: 'Học tập' },
  { color: colors.categoryGaming, icon: 'game-controller', label: 'Gaming' },
  { color: colors.textSecondary, icon: 'ellipsis-horizontal', label: 'Khác' },
];
const budgets = ['Tất cả', 'Miễn phí', 'Dưới 100k', '100k – 300k', '300k – 500k', 'Trên 500k'];

export function FilterScreen(props: FilterScreenProps) {
  return <FilterSheet {...props} />;
}

export function FilterSheet({ initialFilters = defaultActivityFilters, onApply, onClose }: FilterScreenProps) {
  const [filters, setFilters] = useState<ActivityFilters>(initialFilters);
  const distanceIndex = distances.indexOf(filters.distance);
  const selectedAll = filters.categories.length === 0;

  const chooseCategory = (category: string) => {
    if (category === 'Tất cả') {
      setFilters((current) => ({ ...current, categories: [] }));
      return;
    }
    setFilters((current) => ({
      ...current,
      categories: current.categories.includes(category) ? current.categories.filter((item) => item !== category) : [...current.categories, category],
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.sheetHandle} />
      <View style={styles.header}>
        <Pressable accessibilityLabel="Đóng bộ lọc" onPress={onClose} style={styles.headerButton}><Ionicons color={colors.text} name="close" size={26} /></Pressable>
        <Text style={styles.headerTitle}>Bộ lọc</Text>
        <Pressable onPress={() => setFilters(defaultActivityFilters)} style={styles.resetButton}><Text style={styles.resetText}>Đặt lại</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.section}>
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Vị trí</Text><Text style={styles.sectionValue}>Trong {filters.distance} km</Text></View>
            <Text>Áp dụng khi bật “Dùng vị trí của tôi” ở màn Match.</Text>
            <View style={styles.sliderArea}>
              <View style={styles.sliderTrack}><View style={[styles.sliderFill, { width: `${Math.max(distanceIndex, 0) * 25}%` }]} /><View style={[styles.sliderThumb, { left: `${Math.max(distanceIndex, 0) * 25}%` }]} /></View>
              <View style={styles.distanceLabels}>{distances.map((distance) => <Pressable key={distance} onPress={() => setFilters((current) => ({ ...current, distance }))} style={styles.distancePress}><Text style={[styles.distanceText, filters.distance === distance && styles.distanceTextActive]}>{distance} km</Text></Pressable>)}</View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danh mục</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => {
                const selected = category.label === 'Tất cả' ? selectedAll : filters.categories.includes(category.label);
                return <Pressable key={category.label} onPress={() => chooseCategory(category.label)} style={[styles.categoryCard, selected && styles.categoryCardActive]}><View style={[styles.categoryIcon, { backgroundColor: `${category.color}14` }]}><Ionicons color={category.color} name={category.icon} size={24} /></View><Text style={[styles.categoryLabel, selected && styles.categoryLabelActive]}>{category.label}</Text></Pressable>;
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thời gian rảnh</Text>
            <Text>Giờ Việt Nam (UTC+7). Không chọn ngày nghĩa là mọi ngày.</Text>
            <View style={styles.budgetRow}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, index) => <Pressable key={day} onPress={() => setFilters(current => ({ ...current, days: current.days.includes(index + 1) ? current.days.filter(value => value !== index + 1) : [...current.days, index + 1] }))} style={[styles.budgetChip, filters.days.includes(index + 1) && styles.budgetChipActive]}><Text>{day}</Text></Pressable>)}</View>
            <View style={styles.budgetRow}>{[[0, 24, 'Cả ngày'], [6, 12, 'Sáng'], [12, 18, 'Chiều'], [18, 24, 'Tối']].map(([from, to, label]) => <Pressable key={label} onPress={() => setFilters(current => ({ ...current, fromHour: Number(from), toHour: Number(to) }))} style={[styles.budgetChip, filters.fromHour === from && filters.toHour === to && styles.budgetChipActive]}><Text>{label}</Text></Pressable>)}</View>
          </View>

          <View style={[styles.section, styles.lastSection]}>
            <Text style={styles.sectionTitle}>Chi phí (VND/người)</Text>
            <View style={styles.budgetRow}>{budgets.map((budget) => <Pressable key={budget} onPress={() => setFilters((current) => ({ ...current, budget }))} style={[styles.budgetChip, filters.budget === budget && styles.budgetChipActive]}><Text style={[styles.budgetText, filters.budget === budget && styles.budgetTextActive]}>{budget}</Text></Pressable>)}</View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}><Pressable onPress={() => onApply(filters)} style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}><Text style={styles.applyText}>Áp dụng bộ lọc</Text></Pressable></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  sheetHandle: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: 2, height: 4, marginTop: 4, width: 42 },
  header: { alignItems: 'center', flexDirection: 'row', height: 56, paddingHorizontal: 12 },
  headerButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  headerTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  resetButton: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 58 },
  resetText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  scrollContent: { paddingBottom: 18 },
  page: { alignSelf: 'center', maxWidth: layout.maxWidth, paddingHorizontal: 16, width: '100%' },
  section: { paddingBottom: 20, paddingTop: 12 },
  lastSection: { paddingBottom: 4 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sectionValue: { color: colors.textSecondary, fontSize: 12 },
  sliderArea: { marginTop: 22 },
  sliderTrack: { backgroundColor: colors.border, borderRadius: 2, height: 4, marginHorizontal: 8, position: 'relative' },
  sliderFill: { backgroundColor: colors.primary, borderRadius: 2, height: 4 },
  sliderThumb: { backgroundColor: colors.primary, borderRadius: 9, height: 18, marginLeft: -9, position: 'absolute', top: -7, width: 18 },
  distanceLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 13 },
  distancePress: { alignItems: 'center', minWidth: 44 },
  distanceText: { color: colors.textMuted, fontSize: 10.5 },
  distanceTextActive: { color: colors.primary, fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 13 },
  categoryCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: 'transparent', borderRadius: 13, borderWidth: 1.5, height: 84, justifyContent: 'center', width: '22.9%' },
  categoryCardActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  categoryIcon: { alignItems: 'center', borderRadius: 13, height: 40, justifyContent: 'center', width: 40 },
  categoryLabel: { color: colors.textSecondary, fontSize: 10.5, marginTop: 5 },
  categoryLabelActive: { color: colors.primary, fontWeight: '700' },
  availabilityRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.input, borderWidth: 1, flexDirection: 'row', height: 52, marginTop: 12, paddingHorizontal: 13 },
  availabilityText: { color: colors.textSecondary, flex: 1, fontSize: 11.5, marginHorizontal: 10 },
  budgetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  budgetChip: { backgroundColor: colors.surfaceStrong, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10 },
  budgetChipActive: { backgroundColor: colors.primary },
  budgetText: { color: colors.textSecondary, fontSize: 11 },
  budgetTextActive: { color: colors.white, fontWeight: '700' },
  footer: { backgroundColor: colors.background, paddingBottom: 12, paddingHorizontal: 16, paddingTop: 10 },
  applyButton: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primary, borderRadius: radii.pill, height: control.buttonHeight, justifyContent: 'center', maxWidth: layout.maxWidth, width: '100%' },
  applyText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
