import Slider from '@react-native-community/slider';
import { MAX_RADIUS_SLIDER, normalizeSearchRadius, radiusLabel, requiresSearchPoint } from '../services/filterService';
import { ComponentProps, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { currentCoordinates } from '../services/locationService';
import type { Coordinates } from '../services/locationService';
import { Text } from '../components/LocalizedText';
import { AdvancedPreferences, emptyPreferences, ParticipantPreferences } from '../components/ActivityChoices';
import { DateRangeField, dateToIso, TimeField } from '../components/DateTimeField';
import { SelectionField } from '../components/SelectionField';
import { ActivityLocationFields } from '../components/ActivityLocationFields';
import { activityCategories } from '../data/activityOptions';
import { colors, control, layout, radii } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ActivityFilters = {
  organizerType: 'all' | 'personal' | 'business';
  sort: 'recommended' | 'nearest' | 'soonest';
  radiusEnabled: boolean;
  coordinates?: Coordinates | null;
  province: string;
  district: string;
  ward?: string;
  distance: number;
  categories: string[];
  availableDays: string[];
  timePeriods: string[];
  minBudget: number;
  maxBudget: number;
  minimumCapacity: number;
  maximumCapacity: number;
  dateFrom: string;
  dateTo: string;
  fromTime: string;
  toTime: string;
  preferences: ParticipantPreferences;
};

export const defaultActivityFilters: ActivityFilters = {
  organizerType: 'all', sort: 'recommended', radiusEnabled: true, coordinates: null,
  province: 'Tất cả', district: 'Tất cả', distance: 10, categories: [],
  availableDays: [], timePeriods: [], minBudget: 0, maxBudget: 2000000, minimumCapacity: 0,
  maximumCapacity: 0, dateFrom: '', dateTo: '', fromTime: '', toTime: '', preferences: emptyPreferences,
};

type FilterScreenProps = { saving?: boolean; saveError?: string; initialFilters?: ActivityFilters; onApply: (filters: ActivityFilters) => void; onClose: () => void };
const budgets = [0, 100000, 300000, 500000, 1000000, 2000000];
const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const periods = ['Sáng', 'Chiều', 'Tối'];

function moneyLabel(value: number) {
  if (value === 0) return '0đ';
  if (value >= 1000000) return `${value / 1000000} triệu`;
  return `${value / 1000}k`;
}

export function FilterScreen(props: FilterScreenProps) { return <FilterSheet {...props} />; }

export function FilterSheet({ saving = false, saveError, initialFilters = defaultActivityFilters, onApply, onClose }: FilterScreenProps) {
  const [filters, setFilters] = useState<ActivityFilters>(() => normalizeSearchRadius(initialFilters));
  const [slidingRadius, setSlidingRadius] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const locationLock = useRef(false);
  const locate = async () => {
    if (locationLock.current) return;
    locationLock.current = true; setLocating(true); setError('');
    try { const coordinates = await currentCoordinates(); setFilters(current => ({ ...current, coordinates })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa lấy được vị trí GPS.'); }
    finally { locationLock.current = false; setLocating(false); }
  };
  const apply = () => {
    if (filters.dateFrom && filters.dateTo && dateToIso(filters.dateFrom) > dateToIso(filters.dateTo)) { setError('Ngày kết thúc không được trước ngày bắt đầu.'); return; }
    if (filters.fromTime && filters.toTime && filters.fromTime > filters.toTime) { setError('Giờ kết thúc không được trước giờ bắt đầu.'); return; }
    if ((filters.fromTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(filters.fromTime)) || (filters.toTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(filters.toTime))) { setError('Giờ cần theo định dạng HH:mm.'); return; }
    if (filters.maximumCapacity && filters.minimumCapacity > filters.maximumCapacity) { setError('Số lượng tối thiểu không được lớn hơn tối đa.'); return; }
    if ([filters.minimumCapacity, filters.maximumCapacity].some(value => value !== 0 && (!Number.isInteger(value) || value < 2 || value > 1000))) { setError('Số lượng thành viên cần từ 2 đến 1000.'); return; }
    if (requiresSearchPoint(filters) && !filters.coordinates) { setError('Chọn vị trí hoặc bật GPS để lọc theo bán kính.'); return; }
    onApply(filters);
  };
  const toggleList = (key: 'categories' | 'availableDays' | 'timePeriods', value: string) => setFilters((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));

  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.sheetHandle} /><View style={styles.header}><Pressable accessibilityLabel="Đóng bộ lọc" onPress={onClose} style={styles.headerButton}><Ionicons color={colors.text} name="close" size={26} /></Pressable><View style={styles.headerCopy}><Text style={styles.headerTitle}>Bộ lọc hoạt động</Text><Text style={styles.headerSubtitle}>Tìm hoạt động phù hợp nhất với bạn</Text></View><Pressable onPress={() => setFilters(current => ({ ...defaultActivityFilters, coordinates: current.coordinates }))} style={styles.resetButton}><Text style={styles.resetText}>Đặt lại</Text></Pressable></View>
    <ScrollView scrollEnabled={!slidingRadius} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}><View style={styles.page}>
      <FilterSection icon="business-outline" subtitle="Nguồn tổ chức & thứ tự hiển thị" title="Loại hoạt động">
        <ChipGroup options={['Tất cả', 'Cá nhân', 'Doanh nghiệp']} selected={[{ all: 'Tất cả', personal: 'Cá nhân', business: 'Doanh nghiệp' }[filters.organizerType]]} onPress={label => setFilters(current => ({ ...current, organizerType: label === 'Cá nhân' ? 'personal' : label === 'Doanh nghiệp' ? 'business' : 'all' }))} />
        <Text style={styles.innerLabel}>Sắp xếp gợi ý</Text><ChipGroup options={['Dành cho bạn', 'Gần nhất', 'Sắp diễn ra']} selected={[{ recommended: 'Dành cho bạn', nearest: 'Gần nhất', soonest: 'Sắp diễn ra' }[filters.sort]]} onPress={label => setFilters(current => ({ ...current, sort: label === 'Gần nhất' ? 'nearest' : label === 'Sắp diễn ra' ? 'soonest' : 'recommended' }))} />
      </FilterSection>
      <FilterSection icon="location-outline" subtitle="Khu vực & khoảng cách" title="Khu vực">
        <ActivityLocationFields filter province={filters.province} district={filters.district} ward={filters.ward} onChange={patch => setFilters(current => ({ ...current, ...patch }))} />
        <View style={styles.gpsCard}>
          <View style={[styles.gpsIcon, filters.coordinates && styles.gpsIconActive]}>
            <Ionicons name={filters.coordinates ? 'navigate' : 'navigate-outline'} size={17} color={filters.coordinates ? colors.primary : colors.textMuted} />
          </View>
          <View style={styles.gpsCopy}>
            <Text style={styles.gpsTitle}>Vị trí hiện tại</Text>
            <View style={styles.gpsStatusRow}>
              <View style={[styles.gpsDot, filters.coordinates ? styles.gpsDotActive : styles.gpsDotIdle]} />
              <Text style={styles.gpsStatus}>{locating ? 'Đang cập nhật...' : filters.coordinates ? 'Đã định vị quanh bạn' : 'Chưa bật định vị'}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" disabled={locating} onPress={() => void locate()} style={[styles.gpsBtn, locating && { opacity: 0.6 }]}>
            <Ionicons name={filters.coordinates ? 'refresh-outline' : 'locate-outline'} size={15} color={colors.primary} />
            <Text style={styles.gpsBtnText}>{locating ? 'Đang lấy...' : filters.coordinates ? 'Cập nhật' : 'Định vị'}</Text>
          </Pressable>
        </View>
        {!filters.coordinates && filters.radiusEnabled && <Text style={styles.allHint}>Cần định vị để lọc trong bán kính {radiusLabel(filters.distance)}.</Text>}
        <View style={styles.sliderHeader}><Text style={styles.sliderLabel}>Bán kính tìm kiếm</Text><View style={styles.radiusBadge}><Text style={styles.sliderValue}>{radiusLabel(filters.distance)}</Text></View></View>
        <Slider accessibilityLabel="Bán kính tìm kiếm" accessibilityValue={{ min: 1, max: MAX_RADIUS_SLIDER, now: filters.distance, text: radiusLabel(filters.distance) }} minimumValue={1} maximumValue={MAX_RADIUS_SLIDER} step={1} value={filters.distance} minimumTrackTintColor={colors.primary} maximumTrackTintColor={colors.border} thumbTintColor={colors.primary} tapToSeek onSlidingStart={() => setSlidingRadius(true)} onSlidingComplete={() => setSlidingRadius(false)} onValueChange={distance => setFilters(current => ({ ...current, distance, radiusEnabled: distance < MAX_RADIUS_SLIDER }))} style={{ height: 42, marginHorizontal: -8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={[styles.sliderTick, { textAlign: 'left' }]}>1 km</Text><Text style={styles.sliderTick}>25 km</Text><Text style={[styles.sliderTick, { textAlign: 'right' }]}>50 km+</Text></View>
        {filters.distance >= MAX_RADIUS_SLIDER && <Text style={styles.allHint}>Không giới hạn khoảng cách trong {filters.province === 'Tất cả' ? 'mọi khu vực' : filters.province}.</Text>}
      </FilterSection>

      <FilterSection icon="grid-outline" subtitle="Có thể chọn nhiều danh mục" title="Danh mục">
        <SelectionField label="Danh mục hoạt động" options={[...activityCategories, 'Khác'].map(label => ({ value: label, label }))} selected={filters.categories} onChange={categories => setFilters(current => ({ ...current, categories }))} multiple searchable emptyLabel="Tất cả danh mục" />
      </FilterSection>

      <FilterSection icon="calendar-outline" subtitle="Để trống nếu thời gian linh hoạt" title="Thời gian phù hợp">
        <Text style={styles.innerLabel}>Ngày trong tuần</Text><ChipGroup compact options={days} selected={filters.availableDays} onPress={(day) => toggleList('availableDays', day)} />
        <Text style={styles.innerLabel}>Buổi trong ngày</Text><ChipGroup options={periods} selected={filters.timePeriods} onPress={(period) => toggleList('timePeriods', period)} />
        <View style={{ gap: 12, marginTop: 16 }}>
          <DateRangeField label="Khoảng ngày hoạt động" start={filters.dateFrom} end={filters.dateTo} onChange={(dateFrom, dateTo) => setFilters(current => ({ ...current, dateFrom, dateTo }))} allowPast />
          {Boolean(filters.dateFrom) && <Pressable accessibilityRole="button" onPress={() => setFilters(current => ({ ...current, dateFrom: '', dateTo: '' }))} style={styles.gpsBtn}><Ionicons name="close-circle-outline" size={15} color={colors.primary} /><Text style={styles.gpsBtnText}>Xóa khoảng ngày</Text></Pressable>}
          <TimeField label="Giờ bắt đầu từ" value={filters.fromTime} onChange={fromTime => setFilters(current => ({ ...current, fromTime }))} />
          <TimeField label="Giờ bắt đầu đến" value={filters.toTime} onChange={toTime => setFilters(current => ({ ...current, toTime }))} />
        </View>
      </FilterSection>

      <FilterSection icon="wallet-outline" subtitle="Chi phí dự kiến cho mỗi người" title="Khoảng chi phí">
        <SelectionField label="Chi phí từ" options={budgets.map(value => ({ value: String(value), label: moneyLabel(value) }))} selected={[String(filters.minBudget)]} onChange={values => setFilters(current => ({ ...current, minBudget: Number(values[0] || 0), maxBudget: Math.max(current.maxBudget, Number(values[0] || 0)) }))} />
        <SelectionField label="Chi phí đến" options={budgets.map(value => ({ value: String(value), label: value === 2000000 ? 'Không giới hạn' : moneyLabel(value) }))} selected={[String(filters.maxBudget)]} onChange={values => setFilters(current => ({ ...current, maxBudget: Number(values[0] || 0), minBudget: Math.min(current.minBudget, Number(values[0] || 0)) }))} />
      </FilterSection>

      <FilterSection icon="people-outline" subtitle="Lọc theo sức chứa của nhóm" title="Số lượng thành viên">
        <SelectionField label="Nhóm có tối thiểu" options={[{ value: '0', label: 'Bất kỳ' }, ...Array.from({ length: 999 }, (_, index) => ({ value: String(index + 2), label: `${index + 2} người` }))]} selected={[String(filters.minimumCapacity)]} onChange={values => setFilters(current => ({ ...current, minimumCapacity: Number(values[0] || 0) }))} />
        <SelectionField label="Nhóm có tối đa" options={[{ value: '0', label: 'Bất kỳ' }, ...Array.from({ length: 999 }, (_, index) => ({ value: String(index + 2), label: `${index + 2} người` }))]} selected={[String(filters.maximumCapacity)]} onChange={values => setFilters(current => ({ ...current, maximumCapacity: Number(values[0] || 0) }))} />
      </FilterSection>
      <AdvancedPreferences filter value={filters.preferences} onChange={preferences => setFilters(current => ({ ...current, preferences }))} />
      {saveError ? <Text style={{ color: colors.danger }}>{saveError}</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </View></ScrollView>
    <View style={styles.footer}><Pressable disabled={saving} onPress={apply} style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}><Ionicons color={colors.white} name="options" size={19} /><Text style={styles.applyText}>{saving ? 'Đang lưu...' : 'Áp dụng bộ lọc'}</Text></Pressable></View>
  </SafeAreaView>;
}

function FilterSection({ children, icon, subtitle, title }: { children: React.ReactNode; icon: IconName; subtitle: string; title: string }) { return <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.sectionIcon}><Ionicons color={colors.primary} name={icon} size={20} /></View><View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View></View><View style={styles.sectionBody}>{children}</View></View>; }
function ChipGroup({ compact = false, onPress, options, selected }: { compact?: boolean; onPress: (value: string) => void; options: string[]; selected: string[] }) { return <View style={styles.chipRow}>{options.map((option) => { const active = selected.includes(option); return <Pressable key={option} onPress={() => onPress(option)} style={[styles.chip, compact && styles.compactChip, active && styles.activeChip]}><Text style={[styles.chipText, active && styles.activeChipText]}>{option}</Text></Pressable>; })}</View>; }

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 }, sheetHandle: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: 2, height: 4, marginTop: 4, width: 42 }, header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: 12 }, headerButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }, headerCopy: { flex: 1, marginLeft: 4 }, headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, headerSubtitle: { color: colors.textMuted, fontSize: 10.5, marginTop: 2 }, resetButton: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 58 }, resetText: { color: colors.primary, fontSize: 12.5, fontWeight: '700' }, scrollContent: { paddingBottom: 22 }, page: { alignSelf: 'center', gap: 12, maxWidth: layout.maxWidth, paddingHorizontal: 15, width: '100%' },
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, padding: 15 }, sectionHeader: { alignItems: 'center', flexDirection: 'row' }, sectionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 13, height: 40, justifyContent: 'center', marginRight: 10, width: 40 }, sectionTitle: { color: colors.text, fontSize: 14.5, fontWeight: '800' }, sectionSubtitle: { color: colors.textMuted, fontSize: 10.5, marginTop: 2 }, sectionBody: { marginTop: 14 }, innerLabel: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '700', marginBottom: 8, marginTop: 14 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 }, compactChip: { alignItems: 'center', flex: 1, minWidth: 38, paddingHorizontal: 7 }, activeChip: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, chipText: { color: colors.textSecondary, fontSize: 10.5, fontWeight: '600' }, activeChipText: { color: colors.primary, fontWeight: '800' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, categoryCard: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border, borderRadius: 13, borderWidth: 1, height: 70, justifyContent: 'center', width: '31.5%' }, categoryCardActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, categoryText: { color: colors.textSecondary, fontSize: 9.5, marginTop: 4 }, categoryTextActive: { color: colors.primary, fontWeight: '800' }, allHint: { color: colors.textMuted, fontSize: 10, marginTop: 9, textAlign: 'center' },
  gpsCard: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 14, paddingHorizontal: 12, paddingVertical: 11 },
  gpsIcon: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 11, height: 36, justifyContent: 'center', width: 36 },
  gpsIconActive: { backgroundColor: colors.primarySoft },
  gpsCopy: { flex: 1, gap: 2 },
  gpsTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  gpsStatusRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  gpsDot: { borderRadius: 4, height: 7, width: 7 },
  gpsDotActive: { backgroundColor: colors.success },
  gpsDotIdle: { backgroundColor: colors.textMuted },
  gpsStatus: { color: colors.textSecondary, fontSize: 11.5 },
  gpsBtn: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 11, flexDirection: 'row', gap: 5, paddingHorizontal: 11, paddingVertical: 8 },
  gpsBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  sliderHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, sliderLabel: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' }, radiusBadge: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }, sliderValue: { color: colors.primary, fontSize: 12, fontWeight: '800' }, slider: { marginTop: 8 }, sliderTouch: { height: 30, justifyContent: 'center', marginHorizontal: 8 }, sliderTrack: { backgroundColor: colors.border, borderRadius: 3, height: 5, position: 'relative' }, sliderFill: { backgroundColor: colors.primary, borderRadius: 3, height: 5 }, sliderThumb: { backgroundColor: colors.primary, borderColor: colors.white, borderRadius: 11, borderWidth: 3, elevation: 2, height: 22, marginLeft: -11, position: 'absolute', top: -8.5, width: 22 }, sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' }, sliderTick: { color: colors.textMuted, flex: 1, fontSize: 10, textAlign: 'center' }, sliderTickActive: { color: colors.primary, fontWeight: '800' },
  footer: { backgroundColor: colors.background, paddingBottom: 12, paddingHorizontal: 16, paddingTop: 10 }, applyButton: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primary, borderRadius: radii.pill, flexDirection: 'row', gap: 8, height: control.buttonHeight, justifyContent: 'center', maxWidth: layout.maxWidth, width: '100%' }, applyText: { color: colors.white, fontSize: 14, fontWeight: '800' }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
