import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useFonts as usePlayfair, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme';

function Gate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inApp = segments[0] === '(app)';
    if (!session && inApp) router.replace('/login');
    else if (session && !inApp) router.replace('/(app)/dashboard');
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsReady] = usePlayfair({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
