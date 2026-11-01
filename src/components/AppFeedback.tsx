import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { FeedbackPayload, subscribeFeedback } from '../services/feedback';
import { colors } from '../theme';

export function AppFeedback() {
  const [payload, setPayload] = useState<FeedbackPayload | null>(null);
  useEffect(() => subscribeFeedback(setPayload), []);
  const dismiss = () => {
    const onDismiss = payload?.onDismiss;
    setPayload(null);
    onDismiss?.();
  };
  const runAction = () => {
    const onAction = payload?.onAction;
    setPayload(null);
    onAction?.();
  };
  return <Modal visible={Boolean(payload?.message)} transparent animationType="fade" onRequestClose={dismiss}>
    <View style={styles.backdrop}><View accessibilityViewIsModal style={styles.card}>
      <Ionicons name="information-circle-outline" color={colors.primary} size={36} />
      <Text style={styles.title}>{payload?.title || 'Thông báo'}</Text>
      <Text accessibilityRole="alert" style={styles.message}>{payload?.message || ''}</Text>
      {payload?.onAction ? (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={runAction} style={styles.button}><Text style={styles.buttonText}>{payload.actionLabel || 'Bổ sung thông tin ngay'}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={dismiss} style={styles.secondaryButton}><Text style={styles.secondaryText}>Để sau</Text></Pressable>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={dismiss} style={styles.button}><Text style={styles.buttonText}>Đã hiểu</Text></Pressable>
      )}
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#15203388', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: colors.white, borderRadius: 24, padding: 24, gap: 16, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 23, textAlign: 'center', color: colors.textSecondary },
  actions: { alignSelf: 'stretch', gap: 10 },
  button: { backgroundColor: colors.primary, borderRadius: 16, padding: 14, alignSelf: 'stretch', alignItems: 'center' },
  buttonText: { color: colors.white, fontWeight: '700' },
  secondaryButton: { borderRadius: 16, padding: 10, alignSelf: 'stretch', alignItems: 'center' },
  secondaryText: { color: colors.textSecondary, fontWeight: '600' },
});
