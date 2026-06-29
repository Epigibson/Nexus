import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useAuth } from '../../src/auth/provider';
import { useRouter } from 'expo-router';
import {
  User, Shield, Key, CreditCard, Users, LogOut, ChevronRight, Moon, Zap,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <YStack padding="$6" paddingTop={60} gap="$1">
          <Text fontSize={24} fontWeight="800" color="#f8fafc">
            Configuración
          </Text>
          <Text fontSize={14} color="#64748b">
            Gestiona tu cuenta y preferencias
          </Text>
        </YStack>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <User size={24} color="#a78bfa" />
          </View>
          <YStack flex={1} gap="$1">
            <Text fontSize={16} fontWeight="700" color="#f8fafc">
              {user?.display_name || 'Usuario'}
            </Text>
            <Text fontSize={13} color="#64748b">
              {user?.email}
            </Text>
          </YStack>
          <View style={styles.planBadge}>
            <Text fontSize={10} fontWeight="700" color="#a78bfa">
              {user?.plan?.toUpperCase() || 'FREE'}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <YStack paddingHorizontal="$4" gap="$2" marginTop="$4">
          <MenuItem
            icon={<User size={18} color="#94a3b8" />}
            label="Perfil"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Shield size={18} color="#94a3b8" />}
            label="Seguridad & 2FA"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Key size={18} color="#94a3b8" />}
            label="API Keys"
            onPress={() => router.push('/(tabs)/settings/api-keys')}
          />
          <MenuItem
            icon={<CreditCard size={18} color="#94a3b8" />}
            label="Facturación"
            onPress={() => router.push('/(tabs)/settings/billing')}
          />
          <MenuItem
            icon={<Users size={18} color="#94a3b8" />}
            label="Equipo"
            onPress={() => {}}
          />
          <MenuItem
            icon={<Moon size={18} color="#94a3b8" />}
            label="Apariencia"
            onPress={() => {}}
          />

          <View style={styles.separator} />

          <MenuItem
            icon={<LogOut size={18} color="#ef4444" />}
            label="Cerrar Sesión"
            color="#ef4444"
            onPress={handleLogout}
          />
        </YStack>

        {/* Version */}
        <YStack alignItems="center" padding="$8" gap="$1">
          <Zap size={16} color="#3a3a4a" />
          <Text fontSize={11} color="#3a3a4a">
            Nexus Mobile v1.2.0
          </Text>
        </YStack>
      </ScrollView>
    </View>
  );
}

function MenuItem({ icon, label, color, onPress }: { icon: React.ReactNode; label: string; color?: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIcon}>{icon}</View>
      <Text flex={1} fontSize={15} fontWeight="500" color={color || '#f8fafc'}>
        {label}
      </Text>
      <ChevronRight size={16} color="#3a3a4a" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scroll: {
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#1e1e2a',
    marginVertical: 8,
  },
});
