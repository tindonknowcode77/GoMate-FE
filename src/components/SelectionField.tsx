import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { UserAvatar } from './UserAvatar';
import { searchKey } from '../data/profileOptions';
import { colors } from '../theme';

export type SelectionOption = {
  value: string;
  label: string;
  subtitle?: string;
  avatarUrl?: string | null;
};

export function SelectionField({
  label,
  options,
  selected,
  onChange,
  multiple = false,
  emptyLabel = 'Chọn thông tin',
  searchable = false,
}: {
  label: string;
  options: SelectionOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  emptyLabel?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>([]);

  const rows = useMemo(() => {
    const key = searchKey(query);
    if (!key) return options;
    return options.filter(option => searchKey(option.label).includes(key) || (option.subtitle ? searchKey(option.subtitle).includes(key) : false));
  }, [options, query]);

  const summary = selected
    .map(value => options.find(option => option.value === value)?.label)
    .filter(Boolean)
    .join(' · ');

  const show = () => {
    setDraft(selected);
    setQuery('');
    setOpen(true);
  };

  const toggle = (value: string) => {
    if (!multiple) {
      onChange([value]);
      setOpen(false);
      return;
    }
    setDraft(items => (items.includes(value) ? items.filter(item => item !== value) : [...items, value]));
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={show} style={styles.trigger}>
        <Text numberOfLines={2} style={{ flex: 1, color: summary ? colors.text : colors.textMuted, fontSize: 14 }}>
          {summary || emptyLabel}
        </Text>
        <Ionicons name="chevron-down" color={colors.textMuted} size={18} />
      </Pressable>

      <Modal transparent animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={10} onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {searchable && (
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={`Tìm ${label.toLowerCase()} (hỗ trợ không dấu)...`}
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  autoCorrect={false}
                />
                {query ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            )}

            {multiple && draft.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
                {draft.map(value => {
                  const opt = options.find(option => option.value === value);
                  if (!opt) return null;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityLabel={`Bỏ chọn ${opt.label}`}
                      onPress={() => setDraft(items => items.filter(item => item !== value))}
                      style={styles.selectedChip}
                    >
                      <Text style={styles.selectedChipText}>{opt.label}</Text>
                      <Ionicons name="close" size={14} color={colors.primary} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <FlatList
              data={rows}
              keyExtractor={item => item.value}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.empty}>Không có lựa chọn phù hợp.</Text>}
              renderItem={({ item }) => {
                const isSelected = multiple ? draft.includes(item.value) : selected.includes(item.value);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => toggle(item.value)}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  >
                    {item.avatarUrl !== undefined && (
                      <UserAvatar uri={item.avatarUrl} name={item.label} size={38} />
                    )}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{item.label}</Text>
                      {item.subtitle ? <Text style={styles.optionSubtitle}>{item.subtitle}</Text> : null}
                    </View>
                    <Ionicons
                      name={multiple ? (isSelected ? 'checkbox' : 'square-outline') : (isSelected ? 'checkmark-circle' : 'ellipse-outline')}
                      size={22}
                      color={isSelected ? colors.primary : colors.border}
                    />
                  </Pressable>
                );
              }}
            />

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange([]);
                  setDraft([]);
                  setOpen(false);
                }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearText}>Xóa lựa chọn</Text>
              </Pressable>
              {multiple && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                  style={styles.doneBtn}
                >
                  <Text style={styles.doneText}>Xong{draft.length ? ` (${draft.length})` : ''}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export function StringSelectionField({
  label,
  options,
  value,
  onChange,
  emptyLabel,
  searchable = true,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
  searchable?: boolean;
}) {
  return (
    <SelectionField
      label={label}
      options={[...new Set(options)].map(item => ({ value: item, label: item }))}
      selected={value ? [value] : []}
      onChange={values => onChange(values[0] || '')}
      emptyLabel={emptyLabel}
      searchable={searchable}
    />
  );
}

const styles = StyleSheet.create({
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  trigger: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', maxHeight: 680, paddingTop: 14, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16, gap: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderColor: colors.border },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceMuted, borderRadius: 14, paddingHorizontal: 12, minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 10 },
  chipsScroll: { maxHeight: 44, flexGrow: 0 },
  chipsContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  selectedChipText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { gap: 6, paddingBottom: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optionRowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
  optionLabelSelected: { color: colors.primary, fontWeight: '700' },
  optionSubtitle: { fontSize: 12, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 28, fontSize: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderColor: colors.border },
  clearBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  clearText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  doneBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12 },
  doneText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
