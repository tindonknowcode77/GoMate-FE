import { View, ViewStyle } from 'react-native';
import { api } from '../services/api';
import { getUnreadMessageCount } from '../services/chatService';
import { useLiveRefresh } from '../services/useLiveRefresh';
import { useRemote } from '../services/useRemote';
import { colors } from '../theme';
const noticeCount = async () => (await api<{ unreadCount: number }>('/community/notifications?limit=1')).unreadCount;
export function UnreadDot({ kind, style }: { kind: 'messages' | 'notifications'; style?: ViewStyle }) {
  const remote = useRemote(kind === 'messages' ? getUnreadMessageCount : noticeCount, 0), reload = remote.reload;
  useLiveRefresh(reload);
  if (!remote.data || remote.error) return null;
  return <View accessibilityLabel={`${remote.data} ${kind === 'messages' ? 'tin nhắn' : 'thông báo'} chưa đọc`} style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.match }, style]} />;
}
