import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { persistSession } from '../services/api';
import type { StaffWorkspaceScreenProps } from './StaffWorkspaceScreen';

export function StaffWorkspaceScreen({ onBack, onLogout }: StaffWorkspaceScreenProps) {
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'gomate.session' && !event.newValue) void persistSession(null).finally(onLogout);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [onLogout]);

  return <SafeAreaView style={styles.safe}>
    <ScreenHeader title="GoMate Staff" onBack={onBack} />
    <View style={styles.frame}><iframe title="Không gian Staff GoMate" src="/staff" style={{ border: 'none', flex: 1, height: '100%', width: '100%' }} /></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { backgroundColor: '#F8F9FC', flex: 1 }, frame: { flex: 1 } });
