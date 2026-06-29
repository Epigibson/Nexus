import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/auth/provider';
import tamaguiConfig from '@/theme/tamagui.config';

// Import auth config
import '@/auth/config';

SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add custom fonts here if needed
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      <AuthProvider>
        <StatusBar style="light" />
        <AuthGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="modals/create-project"
            options={{
              presentation: 'modal',
              headerShown: true,
              headerTitle: 'Nuevo Proyecto',
              headerStyle: { backgroundColor: '#111118' },
              headerTintColor: '#f8fafc',
            }}
          />
          <Stack.Screen
            name="modals/create-environment"
            options={{
              presentation: 'modal',
              headerShown: true,
              headerTitle: 'Nuevo Entorno',
              headerStyle: { backgroundColor: '#111118' },
              headerTintColor: '#f8fafc',
            }}
          />
        </Stack>
      </AuthProvider>
    </TamaguiProvider>
  );
}
