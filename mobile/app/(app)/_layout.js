import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { registerForPushNotifications } from '../../src/lib/notifications';
import { api } from '../../src/lib/api';

export default function AppLayout() {
  const done = useRef(false);

  // Register this device's push token once, after the user reaches the app.
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      const token = await registerForPushNotifications();
      if (!token) return;
      try {
        await api.registerPushToken(token, Platform.OS);
      } catch (e) {
        console.warn('push token register failed:', e.message);
      }
    })();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}