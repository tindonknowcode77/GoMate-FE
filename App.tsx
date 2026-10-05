import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LanguageProvider } from './src/i18n/LanguageContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { MainApp } from './src/screens/MainApp';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { OnboardingPermissionsScreen } from './src/screens/OnboardingPermissionsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { VerifyEmailScreen } from './src/screens/VerifyEmailScreen';

import { Credentials, logout } from './src/services/authService';
import { Alert } from 'react-native';

type Screen = 'onboarding' | 'auth' | 'verify' | 'profile' | 'permissions' | 'main';

export default function App() {
  const [screen, setScreen] = useState<Screen>('onboarding');

  const [pending, setPending] = useState<Credentials | null>(null);
  const handleLogout = async () => {
    try { await logout(); setScreen('auth'); }
    catch (error) { Alert.alert('Đăng xuất thất bại', error instanceof Error ? error.message : 'Vui lòng thử lại.'); }
  };

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StatusBar style="dark" />
        {screen === 'onboarding' && <OnboardingScreen onDone={() => setScreen('auth')} />}
        {screen === 'auth' && (
          <AuthScreen
            onLogin={() => setScreen('main')}
            onRegister={(credentials) => { setPending(credentials); setScreen('verify'); }}
          />
        )}
        {screen === 'verify' && pending && (
          <VerifyEmailScreen credentials={pending} onBack={() => { setPending(null); setScreen('auth'); }} onVerified={() => { setPending(null); setScreen('profile'); }} />
        )}
        {screen === 'profile' && (
          <ProfileScreen
            onFinish={() => setScreen('permissions')}
            onSkip={() => setScreen('permissions')}
          />
        )}
        {screen === 'permissions' && <OnboardingPermissionsScreen onDone={() => setScreen('main')} />}
        {screen === 'main' && <MainApp onLogout={() => void handleLogout()} />}
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
