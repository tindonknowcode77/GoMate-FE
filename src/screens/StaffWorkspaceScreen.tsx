import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/LocalizedText';
import { colors } from '../theme';

export type StaffWorkspaceScreenProps = { onBack: () => void; onLogout: () => void };

export function StaffWorkspaceScreen({ onBack }: StaffWorkspaceScreenProps) {
  return <SafeAreaView style={styles.safe}><ScreenHeader title="Không gian Staff" onBack={onBack} /><View style={styles.message}><Text>Không gian Staff hiện chỉ mở trong ứng dụng GoMate trên Android và iOS.</Text><Pressable accessibilityRole="button" onPress={onBack}><Text style={styles.action}>Quay lại hồ sơ</Text></Pressable></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, message: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', padding: 24 }, action: { color: colors.primary, fontWeight: '700' } });
