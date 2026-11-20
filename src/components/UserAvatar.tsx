import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './LocalizedText';
import { imageUrl } from '../services/profileService';
import { useProfile } from '../services/ProfileContext';
import { colors } from '../theme';

const PALETTE = ['#EDE9FE', '#FCE7F3', '#DBEAFE', '#D1FAE5', '#FEF3C7', '#FFE4E6', '#E0E7FF'];
const TEXT_PALETTE = ['#6D28D9', '#BE185D', '#1D4ED8', '#047857', '#B45309', '#BE123C', '#4338CA'];

function hashIndex(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(hash) % PALETTE.length;
}

function initialsOf(name: string) {
  const parts = String(name || 'U').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0] || 'U').slice(0, 2).toUpperCase();
}

export const UserAvatar = memo(function UserAvatar({
  uri,
  name,
  size = 44,
  borderColor,
  onPress,
}: {
  uri?: string | null;
  name?: string;
  size?: number;
  borderColor?: string;
  onPress?: () => void;
}) {
  const ctx = useProfile();
  const resolvedUri = uri !== undefined ? uri : (name === undefined ? ctx.profile?.avatarUrl : null);
  const resolvedName = name !== undefined ? name : (ctx.profile?.name || 'Thành viên');
  const radius = size / 2;
  const idx = hashIndex(resolvedName);
  const borderStyle = borderColor ? { borderWidth: 2, borderColor } : null;
  const content = resolvedUri ? (
    <Image
      source={{ uri: imageUrl(resolvedUri) }}
      style={[{ width: size, height: size, borderRadius: radius, backgroundColor: colors.surfaceMuted }, borderStyle]}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: PALETTE[idx] },
        borderStyle,
      ]}
    >
      <Text style={{ color: TEXT_PALETTE[idx], fontWeight: '800', fontSize: Math.max(12, Math.round(size * 0.36)) }}>
        {initialsOf(resolvedName)}
      </Text>
    </View>
  );
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ cá nhân" onPress={onPress} hitSlop={6}>
        {content}
      </Pressable>
    );
  }
  return content;
});

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
