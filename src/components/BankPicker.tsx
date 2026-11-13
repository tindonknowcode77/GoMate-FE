import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SUPPORTED_BANKS, findBank, type BankInfo } from '../constants/banks';
import { colors } from '../theme';

interface BankPickerProps {
  value: string;
  onChange: (bank: BankInfo) => void;
  disabled?: boolean;
}

export function BankPicker({ value, onChange, disabled }: BankPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedBank = findBank(value);

  const filteredBanks = SUPPORTED_BANKS.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.code.toLowerCase().includes(q) ||
      b.shortName.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel="Chọn ngân hàng"
        disabled={disabled}
        style={[styles.selector, disabled && styles.disabled]}
        onPress={() => {
          setSearch('');
          setModalVisible(true);
        }}
      >
        <View style={styles.selectedRow}>
          {selectedBank ? (
            <Image
              source={selectedBank.logo}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.logoPlaceholder} />
          )}
          <View style={styles.nameBlock}>
            <Text style={styles.shortName}>
              {selectedBank ? `${selectedBank.shortName} (${selectedBank.code})` : 'Chọn ngân hàng'}
            </Text>
            {selectedBank?.name ? (
              <Text style={styles.fullName} numberOfLines={1}>
                {selectedBank.name}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngân hàng</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng chọn ngân hàng"
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo mã, tên ngân hàng..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />

            <FlatList
              data={filteredBanks}
              keyExtractor={item => item.code}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.code === selectedBank?.code;
                return (
                  <Pressable
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => {
                      onChange(item);
                      setModalVisible(false);
                    }}
                  >
                    <Image
                      source={item.logo}
                      style={styles.itemLogo}
                      resizeMode="contain"
                    />
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemCode, isSelected && styles.itemTextSelected]}>
                        {item.shortName} <Text style={styles.itemCodeSub}>({item.code})</Text>
                      </Text>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    {isSelected && <Text style={styles.check}>✓</Text>}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Không tìm thấy ngân hàng phù hợp</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    minHeight: 56,
  },
  disabled: { opacity: 0.6 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  logo: { width: 50, height: 28 },
  logoPlaceholder: { width: 50, height: 28, backgroundColor: '#f0f0f0', borderRadius: 4 },
  nameBlock: { flex: 1 },
  shortName: { fontSize: 15, fontWeight: '700', color: colors.text },
  fullName: { fontSize: 12, color: colors.textMuted },
  chevron: { fontSize: 18, color: colors.textMuted, marginLeft: 8 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: { padding: 6 },
  closeText: { fontSize: 16, color: colors.textMuted, fontWeight: '700' },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
  },
  list: { marginTop: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemSelected: {
    backgroundColor: colors.primarySoft || '#f3edff',
  },
  itemLogo: { width: 54, height: 30, backgroundColor: '#fff', borderRadius: 4 },
  itemInfo: { flex: 1 },
  itemCode: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemCodeSub: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  itemName: { fontSize: 12, color: colors.textMuted },
  itemTextSelected: { color: colors.primary },
  check: { fontSize: 16, fontWeight: '800', color: colors.primary },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});
