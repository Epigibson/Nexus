import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '@/auth/provider';
import { useDialog } from '@/components/Dialog';
import { wasBiometricOffered, markBiometricOffered } from '@/auth/biometric';
import { House, FolderKanban, Activity, Settings } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { TabBar } from '@/components/TabBar';

// Una pestaña por sección. Cada carpeta (projects, audit, settings) tiene su propio Stack,
// así sus pantallas de detalle se abren encima de la pestaña en lugar de crear pestañas nuevas.
export default function TabsLayout() {
  const { biometric, setBiometric, locked } = useAuth();
  const dialog = useDialog();

  // Una sola vez: si el teléfono tiene lector y la huella no está activada, la ofrecemos
  useEffect(() => {
    if (!biometric.available || biometric.enabled || locked) return;
    let cancelled = false;
    (async () => {
      if (await wasBiometricOffered()) return;
      await markBiometricOffered();
      if (cancelled) return;
      const ok = await dialog.confirm({
        title: `¿Entrar con tu ${biometric.kind === 'rostro' ? 'rostro' : 'huella'}?`,
        message: 'La próxima vez que abras Nexus te pediremos tu huella en lugar de mostrar la app directo. Puedes cambiarlo en Ajustes → Seguridad.',
        confirmLabel: 'Activar',
        cancelLabel: 'Ahora no',
      });
      if (ok) await setBiometric(true);
    })();
    return () => { cancelled = true; };
  }, [biometric.available, biometric.enabled, biometric.kind, locked, dialog, setBiometric]);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: ({ color }) => <House size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="projects"
        options={{ title: 'Proyectos', tabBarIcon: ({ color }) => <FolderKanban size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="audit"
        options={{ title: 'Actividad', tabBarIcon: ({ color }) => <Activity size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Ajustes', tabBarIcon: ({ color }) => <Settings size={22} color={color} /> }}
      />
    </Tabs>
  );
}
