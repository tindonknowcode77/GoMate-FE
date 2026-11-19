import { View, StyleSheet } from 'react-native';
import { Text } from './LocalizedText';
import { Reputation } from '../services/profileService';
import { colors } from '../theme';

export function ReputationStats({ reputation }: { reputation?: Reputation }) {
  return <View style={styles.wrapper}>
    <View style={styles.row}><View style={styles.stat}><Text style={styles.label}>Điểm đánh giá</Text><Text style={styles.value}>{reputation?.average != null ? `★ ${reputation.average.toFixed(1)} / 5` : 'Chưa có đánh giá'}</Text><Text style={styles.note}>{reputation?.count ?? 0} đánh giá</Text></View>
      <View style={styles.stat}><Text style={styles.label}>Tỉ lệ vắng mặt</Text><Text style={styles.value}>{reputation?.absenceRate != null ? `${reputation.absenceRate.toLocaleString('vi-VN')}%` : 'Chưa đủ dữ liệu'}</Text><Text style={styles.note}>{reputation?.absentCount ?? 0} / {reputation?.attendanceCount ?? 0} hoạt động đã điểm danh</Text></View></View>
    <Text style={styles.note}>Tỉ lệ tính trên hoạt động đã kết thúc, có điểm danh Có mặt, Đến muộn hoặc Vắng. Chưa điểm danh không tính là vắng.</Text>
  </View>;
}
const styles = StyleSheet.create({ wrapper: { gap: 10, paddingVertical: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stat: { flex: 1, minWidth: 135, gap: 6, padding: 13, borderRadius: 14, backgroundColor: colors.primarySoft }, label: { color: colors.textSecondary, fontSize: 13 }, value: { color: colors.text, fontSize: 17, fontWeight: '700' }, note: { color: colors.textMuted, fontSize: 12, lineHeight: 19 } });
