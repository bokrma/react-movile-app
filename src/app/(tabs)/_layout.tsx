import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 58,
            paddingBottom: 6,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="reminders"
          options={{
            title: 'Reminders',
            tabBarIcon: ({ color, size }) => <Ionicons name="alarm" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="knowledge"
          options={{
            title: 'Knowledge',
            tabBarIcon: ({ color, size }) => <Ionicons name="library" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            title: 'Notes',
            tabBarIcon: ({ color, size }) => <Ionicons name="journal" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}
