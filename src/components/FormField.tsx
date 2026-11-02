import { Text } from './LocalizedText';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { colors, control, radii, typography } from '../theme';
import { useLanguage } from '../i18n/LanguageContext';

type IconName = ComponentProps<typeof Ionicons>['name'];

type FormFieldProps = {
  icon?: IconName;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
  maxLength?: number;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  multiline?: boolean;
  rightIcon?: IconName;
  onRightPress?: () => void;
  rightIconAccessibilityLabel?: string;
};

export function FormField({
  icon,
  label,
  value,
  onChangeText,
  editable,
  maxLength,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  rightIcon,
  onRightPress,
  rightIconAccessibilityLabel,
}: FormFieldProps) {
  const { translate } = useLanguage();
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, multiline && styles.multilineField]}>
        {icon && <Ionicons color={colors.textMuted} name={icon} size={20} />}
        <TextInput
          accessibilityLabel={translate(label)}
          autoCapitalize={keyboardType === 'email-address' || secureTextEntry ? 'none' : 'sentences'}
          autoCorrect={keyboardType !== 'email-address' && !secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={onChangeText}
          editable={editable}
          maxLength={maxLength}
          placeholder={placeholder ? translate(placeholder) : undefined}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          style={[styles.input, !icon && styles.inputWithoutIcon, multiline && styles.multilineInput]}
          value={value}
        />
        {rightIcon && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightIconAccessibilityLabel || 'Thao tác với trường nhập'}
            disabled={!onRightPress}
            hitSlop={8}
            onPress={onRightPress}
            style={styles.rightAction}
          >
            <Ionicons color={colors.textMuted} name={rightIcon} size={20} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 7,
  },
  label: {
    color: colors.textSecondary,
    ...typography.label,
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: control.inputHeight,
    paddingHorizontal: 16,
  },
  multilineField: {
    alignItems: 'flex-start',
    minHeight: 76,
    paddingTop: 16,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    minWidth: 0,
    minHeight: 46,
    marginLeft: 10,
    paddingVertical: 10,
    includeFontPadding: true,
  },
  inputWithoutIcon: { marginLeft: 0 },
  rightAction: { alignItems: 'center', justifyContent: 'center', minHeight: 40, minWidth: 32 },
  multilineInput: {
    minHeight: 46,
    textAlignVertical: 'top',
  },
});
