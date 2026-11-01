import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from './LocalizedText';
import { colors } from '../theme';

export function RemoteState({ loading, error, empty, emptyMessage = 'Hiện chưa có nội dung nào.', onRetry }: { loading: boolean; error: string; empty?: boolean; emptyMessage?: string; onRetry: () => void }) {
  if (!loading && !error && !empty) return null;
  return <View style={{ padding: 20, gap: 12, alignItems: 'center' }}>
    {loading ? <ActivityIndicator color={colors.primary} /> : <Text>{error || emptyMessage}</Text>}
    {!loading && Boolean(error) && <Pressable onPress={onRetry}><Text style={{ color: colors.primary }}>Tải lại</Text></Pressable>}
  </View>;
}
