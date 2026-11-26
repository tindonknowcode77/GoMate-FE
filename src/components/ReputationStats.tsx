import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { computeAttendanceRate, Reputation } from '../services/profileService';
import { colors } from '../theme';

function formatRate(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

export function ReputationStats({ reputation }: { reputation?: Reputation }) {
  const attendanceRate = computeAttendanceRate(reputation);
  const attended = reputation?.attendedCount ?? ((reputation?.presentCount ?? 0) + (reputation?.lateCount ?? 0));
  const total = reputation?.attendanceCount ?? 0;
  const lateCancels = reputation?.lateCancelCount ?? 0;
  const isNewUser = reputation?.isNewUser ?? (total === 0 && lateCancels === 0);
  const rateColor = attendanceRate >= 90 ? colors.success : attendanceRate >= 75 ? colors.warning : colors.danger;

  return (
    <View style={styles.bar}>
      <View style={styles.item}>
        <View style={styles.valueRow}>
          <Ionicons name="star" size={16} color={colors.warning} />
          <Text style={styles.value}>
            {reputation?.average != null ? reputation.average.toFixed(1) : '—'}
          </Text>
          {reputation?.average != null && <Text style={styles.unit}>/5</Text>}
        </View>
        <Text style={styles.caption}>
          {reputation?.count ? `${reputation.count} đánh giá` : 'Chưa có đánh giá'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.item}>
        <View style={styles.valueRow}>
          <Ionicons name="checkmark-circle" size={16} color={rateColor} />
          <Text style={styles.value}>{formatRate(attendanceRate)}</Text>
        </View>
        {isNewUser ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>Người dùng mới</Text>
          </View>
        ) : (
          <Text style={styles.caption}>
            {total > 0 ? `Có mặt · ${attended}/${total} buổi` : `${lateCancels} lần hủy sát giờ`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  unit: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  newBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  newBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});
