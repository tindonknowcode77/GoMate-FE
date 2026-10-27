import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '../components/GradientButton';
import { Text } from '../components/LocalizedText';
import { colors, layout, radii, typography } from '../theme';

type Step = 'notifications' | 'location' | 'done';

export function OnboardingPermissionsScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>('notifications');

  const advance = () => setStep(step === 'notifications' ? 'location' : 'done');
  const enableAndAdvance = () => {
    // TODO: Request the native notification/location permission when those
    // services are connected; the onboarding UI remains functional meanwhile.
    advance();
  };

  if (step === 'done') {
    return (
      <SafeAreaView style={styles.doneSafeArea}>
        <StatusBar style="light" />
        <View style={styles.donePage}>
          <View style={styles.doneVisual}>
            <View style={styles.doneGlow} />
            <Image source={require('../assets/logo-app.png')} style={styles.doneIcon} />
            <View style={styles.doneCheck}><Ionicons color={colors.primary} name="checkmark" size={22} /></View>
          </View>
          <View style={styles.doneCopy}>
            <Text style={styles.doneTitle}>You are all set!</Text>
            <Text style={styles.doneText}>Your GoMate is ready. Jump in and find your next activity.</Text>
          </View>
          <Pressable onPress={onDone} style={({ pressed }) => [styles.exploreButton, pressed && styles.pressed]}>
            <Text style={styles.exploreText}>Start exploring</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const notifications = step === 'notifications';
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <View style={styles.content}>
          <View style={[styles.permissionIcon, notifications ? styles.bellIcon : styles.locationIcon]}>
            <Ionicons color={notifications ? colors.match : colors.primary} name={notifications ? 'notifications' : 'location'} size={43} />
          </View>
          <Text style={styles.title}>{notifications ? 'Stay in the loop' : 'Discover what is nearby'}</Text>
          <Text style={styles.subtitle}>{notifications ? 'Get notified when hosts respond, plans change, or your activity is about to begin.' : 'Find nearby activities, meeting points, and experiences happening around you.'}</Text>

          {notifications ? (
            <View style={styles.previewStack}>
              <NotificationPreview icon="checkmark-circle" />
              <NotificationPreview icon="chatbubble" faded />
            </View>
          ) : (
            <View style={styles.mapPreview}>
              <View style={[styles.mapLine, styles.mapLineOne]} />
              <View style={[styles.mapLine, styles.mapLineTwo]} />
              <View style={[styles.mapPoint, styles.mapPointOne]} />
              <View style={[styles.mapPoint, styles.mapPointTwo]} />
              <View style={styles.currentPin}><Ionicons color={colors.white} name="navigate" size={23} /></View>
            </View>
          )}
        </View>

        <View>
          <GradientButton label={notifications ? 'Allow Notifications' : 'Enable Location'} onPress={enableAndAdvance} trailing={null} />
          <Pressable onPress={advance} style={styles.laterButton}>
            <Text style={styles.laterText}>{notifications ? 'Maybe later' : 'Not now'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function NotificationPreview({ icon, faded = false }: { icon: 'checkmark-circle' | 'chatbubble'; faded?: boolean }) {
  return (
    <View style={[styles.notificationPreview, faded && styles.fadedPreview]}>
      <View style={styles.previewIcon}><Ionicons color={colors.primary} name={icon} size={18} /></View>
      <View style={styles.previewCopy}><View style={styles.previewTitle} /><View style={styles.previewText} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: { alignSelf: 'center', flex: 1, justifyContent: 'space-between', maxWidth: layout.maxWidth, paddingBottom: 12, paddingHorizontal: 20, paddingTop: 78, width: '100%' },
  content: { alignItems: 'center' },
  permissionIcon: { alignItems: 'center', borderRadius: 46, height: 92, justifyContent: 'center', width: 92 },
  bellIcon: { backgroundColor: colors.matchSoft },
  locationIcon: { backgroundColor: colors.primarySoft },
  title: { color: colors.text, marginTop: 26, textAlign: 'center', ...typography.title },
  subtitle: { color: colors.textSecondary, marginTop: 10, maxWidth: 330, textAlign: 'center', ...typography.body },
  previewStack: { gap: 10, marginTop: 42, width: '100%' },
  notificationPreview: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.input, borderWidth: 1, flexDirection: 'row', padding: 12 },
  fadedPreview: { opacity: 0.58 },
  previewIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  previewCopy: { flex: 1, gap: 7, marginLeft: 11 },
  previewTitle: { backgroundColor: colors.surfaceStrong, borderRadius: 4, height: 8, width: '54%' },
  previewText: { backgroundColor: colors.surfaceMuted, borderRadius: 4, height: 7, width: '82%' },
  mapPreview: { backgroundColor: colors.primarySoft, borderRadius: radii.largeCard, height: 190, marginTop: 42, overflow: 'hidden', width: '100%' },
  mapLine: { backgroundColor: colors.surface, height: 16, opacity: 0.9, position: 'absolute', width: 310 },
  mapLineOne: { left: -35, top: 74, transform: [{ rotate: '16deg' }] },
  mapLineTwo: { left: 80, top: 110, transform: [{ rotate: '-28deg' }] },
  mapPoint: { backgroundColor: colors.surface, borderColor: colors.primaryLight, borderRadius: 12, borderWidth: 4, height: 24, position: 'absolute', width: 24 },
  mapPointOne: { left: 48, top: 38 },
  mapPointTwo: { bottom: 26, right: 48 },
  currentPin: { alignItems: 'center', backgroundColor: colors.primary, borderColor: colors.surface, borderRadius: 27, borderWidth: 4, height: 54, justifyContent: 'center', left: '50%', marginLeft: -27, marginTop: -27, position: 'absolute', top: '50%', width: 54 },
  laterButton: { alignItems: 'center', height: 42, justifyContent: 'center' },
  laterText: { color: colors.textMuted, ...typography.caption },
  doneSafeArea: { backgroundColor: colors.primary, flex: 1 },
  donePage: { alignSelf: 'center', flex: 1, justifyContent: 'space-between', maxWidth: layout.maxWidth, padding: 20, width: '100%' },
  doneVisual: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  doneGlow: { backgroundColor: colors.whiteFaint, borderRadius: 150, height: 300, position: 'absolute', width: 300 },
  doneIcon: { borderColor: colors.white, borderRadius: 34, borderWidth: 4, height: 132, width: 132 },
  doneCheck: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 22, bottom: '31%', height: 44, justifyContent: 'center', position: 'absolute', right: '26%', width: 44 },
  doneCopy: { alignItems: 'center', paddingBottom: 40 },
  doneTitle: { color: colors.white, textAlign: 'center', ...typography.display },
  doneText: { color: colors.whiteMuted, marginTop: 10, maxWidth: 320, textAlign: 'center', ...typography.body },
  exploreButton: { alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.pill, height: 56, justifyContent: 'center' },
  exploreText: { color: colors.primary, ...typography.heading },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
