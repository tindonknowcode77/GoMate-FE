import { Image, StyleSheet, View } from 'react-native';

type BrandLogoProps = {
  compact?: boolean;
  markOnly?: boolean;
};

export function BrandLogo({ compact = false, markOnly = false }: BrandLogoProps) {
  return (
    <View style={styles.wrap}>
      <Image
        resizeMode="contain"
        source={markOnly ? require('../assets/logo-nobackground.png') : require('../assets/logofont.png')}
        style={markOnly ? styles.heroMark : compact ? styles.compactWordmark : styles.wordmark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', flexDirection: 'row' },
  heroMark: { height: 86, width: 86 },
  wordmark: { height: 54, width: 162 },
  compactWordmark: { height: 38, width: 114 },
});
