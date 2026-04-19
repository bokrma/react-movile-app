import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { LLMProvider } from '@/context/LLMContext';
import {
  setupNotificationHandler,
  requestNotificationPermissions,
  registerBackgroundTask,
  syncAllReminders,
} from '@/services/notifications/scheduler';

function AppContent() {
  const { isDark, colors } = useTheme();

  useEffect(() => {
    setupNotificationHandler();
    requestNotificationPermissions().then((granted) => {
      if (granted) {
        registerBackgroundTask().catch(() => {});
        syncAllReminders().catch(() => {});
      }
    });
  }, []);

  return (
    <SafeAreaProvider>
      <LLMProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="chat/[sessionId]"
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </LLMProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
