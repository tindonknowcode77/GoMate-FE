import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/LocalizedText';
import { ScreenHeader } from '../components/ScreenHeader';
import { RemoteState } from '../components/RemoteState';
import { useProfile } from '../services/ProfileContext';
import { getMyReviews } from '../services/profileService';
import { useRemote } from '../services/useRemote';
import { colors, layout } from '../theme';
export function VerificationStatusScreen({ onBack }: { onBack: () => void }) {
  const { profile } = useProfile();
  const profileComplete = Boolean(profile?.profileComplete);
  return <SafeAreaView style={styles.safe}><ScreenHeader title="Xác minh tài khoản" onBack={onBack} /><ScrollView contentContainerStyle={styles.page}>
    <View style={styles.card}><Ionicons name={profile?.emailVerified ? 'checkmark-circle' : 'mail-outline'} size={42} color={profile?.emailVerified ? colors.success : colors.textMuted} /><Text style={styles.title}>{profile?.emailVerified ? 'Email đã xác minh' : 'Email chưa xác minh'}</Text><Text>{profile?.email}</Text><Text style={styles.note}>Email được xác minh khi bạn đăng ký hoặc đăng nhập bằng Google.</Text></View>
    <View style={styles.card}>
      <View style={styles.verificationRow}>
        <View style={styles.phoneIcon}><Ionicons name="call-outline" size={22} color={colors.primary} /></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={styles.title}>Xác minh số điện thoại</Text><Text style={styles.note}>Chưa xác minh</Text></View>
        <Ionicons name="time-outline" size={20} color={colors.textMuted} />
      </View>
      <Text style={styles.note}>Xác minh bằng mã SMS sẽ giúp hoàn thiện bảo mật tài khoản.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={styles.disabledAction}><Text style={styles.disabledActionText}>Xác minh qua SMS · Sắp có</Text></Pressable>
      <Text style={styles.note}>Chức năng gửi mã SMS chưa được kết nối.</Text>
    </View>
    <View style={styles.card}><Text style={styles.title}>Hồ sơ GoMate</Text><Text>{profileComplete ? 'Bạn đã hoàn thiện thông tin hồ sơ.' : 'Hãy hoàn thiện thông tin để người đồng hành hiểu bạn hơn.'}</Text><Text style={styles.note}>Xác minh email xác nhận quyền truy cập email của bạn. GoMate chưa cung cấp xác minh giấy tờ tùy thân.</Text></View>
  </ScrollView></SafeAreaView>;
}
export function MyReviewsScreen({ onBack }: { onBack: () => void }) {
  const remote = useRemote(getMyReviews, null);
  return <SafeAreaView style={styles.safe}><ScreenHeader title="Điểm đánh giá của tôi" onBack={onBack} /><ScrollView contentContainerStyle={styles.page}><RemoteState {...remote} onRetry={remote.reload} />
    {remote.data && !remote.loading && !remote.error && <><View style={styles.card}><Ionicons name="star" size={38} color={colors.primary} /><Text style={styles.score}>{remote.data.average === null ? 'Chưa có đánh giá' : `${remote.data.average.toFixed(1)} / 5`}</Text><Text style={styles.note}>{remote.data.count ? `${remote.data.count} đánh giá từ các hoạt động` : 'Đánh giá từ người đồng hành sẽ xuất hiện tại đây sau những hoạt động cùng nhau.'}</Text></View>
      {remote.data.items.map(item => <View key={item.id} style={styles.card}><Text style={styles.title}>{item.score} / 5 ★</Text>{item.activityTitle ? <Text>{item.activityTitle}</Text> : null}{item.comment ? <Text>{item.comment}</Text> : null}<Text style={styles.note}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text></View>)}</>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, page: { alignSelf: 'center', width: '100%', maxWidth: Math.min(layout.maxWidth, 800), padding: 18, gap: 16 }, card: { borderRadius: 22, padding: 22, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, gap: 14 }, title: { fontSize: 20, color: colors.text, fontWeight: '700' }, note: { fontSize: 13, lineHeight: 20, color: colors.textSecondary }, verificationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, phoneIcon: { backgroundColor: colors.primarySoft, borderRadius: 13, padding: 12 }, disabledAction: { minHeight: 48, borderRadius: 14, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }, disabledActionText: { color: colors.textMuted, fontWeight: '700' }, score: { fontSize: 28, fontWeight: '700', color: colors.text } });
