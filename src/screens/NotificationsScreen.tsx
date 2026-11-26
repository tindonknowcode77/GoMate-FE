import { ActivityInvitations } from '../components/ActivityInvitations';
import { useFeedbackState } from '../services/feedback';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/LocalizedText';
import { ScreenHeader } from '../components/ScreenHeader';
import { RemoteState } from '../components/RemoteState';
import { listNotificationPage, Notification, readNotification } from '../services/communityService';
import { usePagedRemote } from '../services/usePagedRemote';
import { useLiveRefresh } from '../services/useLiveRefresh';
import { colors, layout } from '../theme';
export function NotificationsScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (notice: Notification) => Promise<void> }) {
  const remote = usePagedRemote(listNotificationPage, true, {
    cacheKey: 'notifications',
    staleTimeMs: 15000,
    tags: ['notifications'],
  }), [error, setError] = useFeedbackState(''), [busy, setBusy] = useState(false);
  const reload = remote.reload;
  const unreadCount = remote.data.unreadCount ?? remote.data.items.filter(item => !item.readAt).length;
  useLiveRefresh(reload);
  const open = async (notice?: Notification) => { if (busy) return; setBusy(true); setError(''); try { await readNotification(notice?.id); await remote.reload(); if (notice) await onOpen(notice); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không mở được thông báo'); } finally { setBusy(false); } };
  return <SafeAreaView style={styles.safe}><ScreenHeader title="Thông báo" onBack={onBack} /><View style={styles.heading}><Text style={styles.headingText}>{unreadCount} chưa đọc</Text><Pressable accessibilityRole="button" disabled={busy || unreadCount === 0} onPress={() => void open()} style={[styles.readAllBtn, (busy || unreadCount === 0) && { opacity: 0.45 }]}><Text style={styles.link}>Đánh dấu đã đọc</Text></Pressable></View><ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={remote.loading} onRefresh={remote.reload} />}>
    <ActivityInvitations onAccepted={async activityId => { await onOpen({ id: '', type: 'activity', title: '', text: '', activityId, createdAt: '', readAt: null }); }} />
    {remote.error ? <RemoteState {...remote} loading={false} onRetry={remote.reload} /> : null}
    {!remote.loading && !remote.error && !remote.data.items.length && <View style={styles.empty}><Ionicons name="notifications-outline" size={40} color={colors.primary} /><Text style={styles.headingText}>Bạn đã cập nhật mọi thứ</Text><Text style={styles.note}>Lời mời, tin nhắn và cập nhật hoạt động mới sẽ xuất hiện tại đây.</Text></View>}
    {remote.data.items.map(notice => <Pressable accessibilityRole="button" disabled={busy} onPress={() => void open(notice)} key={notice.id} style={[styles.item, !notice.readAt && { backgroundColor: colors.primarySoft }]}><View style={styles.icon}><Ionicons name={notice.type === 'message' ? 'chatbubble-outline' : notice.type.startsWith('friend') ? 'person-add-outline' : 'calendar-outline'} size={23} color={colors.primary} /></View><View style={{ flex: 1, gap: 6 }}><Text style={styles.title}>{notice.title}</Text><Text numberOfLines={3} style={styles.body}>{notice.text}</Text><Text style={styles.note}>{new Date(notice.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false })}</Text></View>{!notice.readAt && <View style={styles.dot} />}</Pressable>)}
    {remote.data.hasMore && <Pressable accessibilityRole="button" disabled={remote.loading} onPress={remote.loadMore} style={[styles.loadMoreBtn, remote.loading && { opacity: 0.5 }]}><Text style={styles.link}>{remote.loading ? 'Đang tải...' : 'Tải thêm'}</Text></Pressable>}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, heading: { maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center', padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, headingText: { fontSize: 15, fontWeight: '700', color: colors.text }, readAllBtn: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 }, loadMoreBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, height: 44, marginTop: 4 }, link: { color: colors.primary, fontSize: 12.5, fontWeight: '700' }, list: { maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center', paddingHorizontal: 18, paddingBottom: 36, gap: 10 }, item: { padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, icon: { padding: 10, backgroundColor: colors.surface, borderRadius: 15 }, title: { color: colors.text, fontSize: 14, fontWeight: '700' }, body: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 }, note: { color: colors.textMuted, fontSize: 11, lineHeight: 18 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginTop: 8 }, empty: { padding: 40, gap: 16, alignItems: 'center' } });
