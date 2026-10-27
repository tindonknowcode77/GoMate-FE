import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BrandLogo } from './BrandLogo';
import { colors } from '../theme';

type AppHeaderProps = {
  onFilterPress?: () => void;
  onNotificationPress?: () => void;
  showNotification?: boolean;
};

export function AppHeader({ onFilterPress, onNotificationPress, showNotification = false }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <BrandLogo compact />
      {onFilterPress ? (
        <Pressable
          accessibilityLabel="Mở bộ lọc"
          onPress={onFilterPress}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons color={colors.text} name="options-outline" size={22} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel="Thông báo"
          onPress={onNotificationPress}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons color={colors.text} name="notifications-outline" size={22} />
          {showNotification && <View style={styles.notificationDot} />}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 58,
    justifyContent: 'space-between',
  },
  action: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  pressed: { opacity: 0.65 },
  notificationDot: {
    backgroundColor: colors.match,
    borderColor: colors.background,
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 7,
    top: 6,
    width: 10,
  },
});
