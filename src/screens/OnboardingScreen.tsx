import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '../components/GradientButton';
import { Text } from '../components/LocalizedText';
import { colors, layout, radii, typography } from '../theme';

const appIcon = require('../assets/logo-app.png');
const logoMark = require('../assets/logo-nobackground.png');
const logoWordmark = require('../assets/logofont.png');
const landscape = require('../assets/onboarding-landscape.png');
const findCompanion = require('../assets/timnguoidonghanh.png');

const pages = [
  {
    title: 'Find your mate',
    subtitle: 'Discover people who are ready to turn shared interests into real plans.',
  },
  {
    title: 'Share your world',
    subtitle: 'Create activities, share the moment, and invite the right people along.',
  },
  {
    title: 'Build your community',
    subtitle: 'Plan together, stay connected, and make every activity easier to join.',
  },
] as const;

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <Pressable accessibilityLabel="Continue" onPress={() => setShowSplash(false)} style={styles.splash}>
        <StatusBar style="light" />
        <Image source={appIcon} style={styles.appIcon} />
        <Image resizeMode="contain" source={logoWordmark} style={styles.splashWordmark} tintColor={colors.white} />
      </Pressable>
    );
  }

  const lastPage = page === pages.length - 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onDone}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <OnboardingVisual page={page} />
          <View style={styles.dots}>
            {pages.map((item, index) => <View key={item.title} style={[styles.dot, index === page && styles.activeDot]} />)}
          </View>
          <Text style={styles.title}>{pages[page].title}</Text>
          <Text style={styles.subtitle}>{pages[page].subtitle}</Text>
        </View>

        <GradientButton
          label={lastPage ? 'Get Started' : 'Continue'}
          onPress={() => lastPage ? onDone() : setPage((current) => current + 1)}
          trailing={null}
        />
      </View>
    </SafeAreaView>
  );
}

function OnboardingVisual({ page }: { page: number }) {
  if (page === 1) {
    return (
      <View style={[styles.visual, styles.landscapeVisual]}>
        <View style={styles.sun} />
        <Image resizeMode="cover" source={landscape} style={styles.landscape} />
        <View style={styles.sharePill}><Ionicons color={colors.primary} name="sparkles" size={14} /><Text style={styles.sharePillText}>New memories</Text></View>
      </View>
    );
  }

  if (page === 2) {
    const labels = ['Plans', 'Chats', 'Inspire', 'Connect', 'Grow together', 'Travel', 'Memories'];
    return (
      <View style={[styles.visual, styles.communityVisual]}>
        <View style={styles.communityGlow} />
        <Image resizeMode="contain" source={logoMark} style={styles.communityMark} />
        <View style={styles.tagCloud}>
          {labels.map((label, index) => <View key={label} style={[styles.communityTag, index % 3 === 1 && styles.communityTagOffset]}><Text style={styles.communityTagText}>{label}</Text></View>)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.visual, styles.mateVisual]}>
      <Image resizeMode="contain" source={findCompanion} style={styles.mateImage} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  splash: { alignItems: 'center', backgroundColor: colors.primary, flex: 1, justifyContent: 'center' },
  appIcon: { borderRadius: 27, height: 112, width: 112 },
  splashWordmark: { height: 52, marginTop: 22, width: 156 },
  page: { alignSelf: 'center', flex: 1, justifyContent: 'space-between', maxWidth: layout.maxWidth, paddingBottom: 14, paddingHorizontal: 20, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', height: 58, justifyContent: 'space-between' },
  headerSpacer: { width: 42 },
  skip: { color: colors.textSecondary, ...typography.label },
  content: { alignItems: 'center', marginTop: -10 },
  visual: { borderRadius: radii.largeCard, height: 284, overflow: 'hidden', width: '100%' },
  mateVisual: { backgroundColor: colors.discoveryStart },
  mateImage: { height: '100%', width: '100%' },
  landscapeVisual: { backgroundColor: colors.primarySoft },
  landscape: { bottom: 0, height: 220, position: 'absolute', width: '100%' },
  sun: { backgroundColor: colors.warningSoft, borderRadius: 36, height: 72, left: 34, position: 'absolute', top: 28, width: 72 },
  sharePill: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.pill, flexDirection: 'row', gap: 5, paddingHorizontal: 12, paddingVertical: 8, position: 'absolute', right: 16, top: 16 },
  sharePillText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  communityVisual: { backgroundColor: colors.primary },
  communityGlow: { backgroundColor: colors.whiteFaint, borderRadius: 150, height: 280, position: 'absolute', right: -80, top: -100, width: 280 },
  communityMark: { height: 76, left: 20, opacity: 0.22, position: 'absolute', top: 18, width: 76 },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingHorizontal: 18, paddingTop: 76 },
  communityTag: { backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 11, transform: [{ rotate: '-4deg' }] },
  communityTagOffset: { transform: [{ rotate: '4deg' }] },
  communityTagText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 22 },
  dot: { backgroundColor: colors.border, borderRadius: 3, height: 4, width: 5 },
  activeDot: { backgroundColor: colors.primary, width: 18 },
  title: { color: colors.text, marginTop: 18, textAlign: 'center', ...typography.title },
  subtitle: { color: colors.textSecondary, marginTop: 8, maxWidth: 330, textAlign: 'center', ...typography.body },
});
