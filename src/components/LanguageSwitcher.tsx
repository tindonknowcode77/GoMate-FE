import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '../i18n/LanguageContext';
import { colors } from '../theme';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <View accessibilityLabel="Language" accessibilityRole="radiogroup" style={styles.container}>
      {(['vi', 'en'] as const).map((item) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: language === item }}
          key={item}
          onPress={() => setLanguage(item)}
          style={[styles.option, language === item && styles.activeOption]}
        >
          <Text style={[styles.label, language === item && styles.activeLabel]}>{item.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surfaceStrong, borderRadius: 14, flexDirection: 'row', padding: 3 },
  option: { alignItems: 'center', borderRadius: 11, minWidth: 34, paddingHorizontal: 8, paddingVertical: 7 },
  activeOption: { backgroundColor: colors.white, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  activeLabel: { color: colors.primary },
});
