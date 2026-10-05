import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// Importadas por variante: el índice del paquete arrastra las 18 (itálicas, Thin, Black…).
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { AuthProvider, useAuth } from '@/auth/provider';
import { DialogProvider } from '@/components/Dialog';
import tamaguiConfig from '@/theme/tamagui.config';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const modalOptions = {
  presentation: 'modal' as const,
  headerShown: true,
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: 'Inter_700Bold' },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { isAuthenticated, isLoading } = useAuth();
  const ready = fontsReady && !isLoading;

  // El splash nativo se queda hasta tener la tipografía y saber si hay sesión:
  // así nunca se ve un cambio de fuente ni una pantalla equivocada.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modals/create-project" options={{ ...modalOptions, title: 'Nuevo proyecto' }} />
        <Stack.Screen name="modals/create-environment" options={{ ...modalOptions, title: 'Nuevo entorno' }} />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      <AuthProvider>
        <DialogProvider>
          <StatusBar style="light" />
          <RootNavigator fontsReady={fontsLoaded || !!fontError} />
        </DialogProvider>
      </AuthProvider>
    </TamaguiProvider>
  );
}
