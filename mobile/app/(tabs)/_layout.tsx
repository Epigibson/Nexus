import { Tabs } from 'expo-router';
import { House, FolderKanban, Activity, Settings } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { TabBar } from '@/components/TabBar';

// Una pestaña por sección. Cada carpeta (projects, audit, settings) tiene su propio Stack,
// así sus pantallas de detalle se abren encima de la pestaña en lugar de crear pestañas nuevas.
export default function TabsLayout() {
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
