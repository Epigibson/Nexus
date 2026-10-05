import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { House, FolderKanban, Activity, Settings } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

// Una pestaña por sección. Cada carpeta (projects, audit, settings) tiene su propio Stack,
// así sus pantallas de detalle se abren encima de la pestaña en lugar de crear pestañas nuevas.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primaryBright,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
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

const styles = StyleSheet.create({
  // Sin altura fija: React Navigation suma el margen seguro inferior (barra de gestos) por su cuenta.
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    elevation: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
