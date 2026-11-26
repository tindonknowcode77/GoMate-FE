import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './LocalizedText';
import { colors, control, radii, typography } from '../theme';

type GradientButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  trailing?: ReactNode;
};

export function GradientButton({ disabled = false, label, onPress, style, trailing }: GradientButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityState={{ disabled }}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.shadow, style, disabled && { opacity: 0.5 }, pressed && styles.pressed]}
    >
      <View style={styles.gradient}>
        <Text style={styles.label}>{label}</Text>
        {trailing === undefined ? <Ionicons name="arrow-forward" size={18} color={colors.white} /> : trailing}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radii.button,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  gradient: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    flexDirection: 'row',
    gap: 8,
    height: control.buttonHeight,
    justifyContent: 'center',
  },
  label: {
    color: colors.white,
    ...typography.heading,
  },
});
