import { View, StyleSheet } from 'react-native';
import { useDialog } from '@/components/Dialog';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { UserRound, ShieldCheck, KeyRound, CreditCard, Users, LogOut } from 'lucide-react-native';
import { useAuth } from '@/auth/provider';
import { Screen, ScreenHeader, Section, Card, Badge, ListGroup, ListRow, RowDivider, GradientFill } from '@/components/ui';
import { colors, space, gradients } from '@/theme/tokens';

const PLAN_LABEL: Record<string, string> = { free: 'Free', premium: 'Premium', enterprise: 'Enterprise' };

export default function SettingsScreen() {
  const { user, logout, getMfaStatus } = useAuth();
  const router = useRouter();
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const dialog = useDialog();

  useFocusEffect(useCallback(() => {
    getMfaStatus().then((s) => setMfaEnabled(s.enabled));
  }, [getMfaStatus]));

  const confirmLogout = async () => {
    const ok = await dialog.confirm({
      title: 'Cerrar sesión',
      message: '¿Seguro que quieres salir de tu cuenta en este dispositivo?',
      confirmLabel: 'Cerrar sesión',
      destructive: true,
    });
    if (ok) logout();
  };

  const plan = user?.plan ?? 'free';
  const initial = (user?.display_name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <Screen>
      <ScreenHeader title="Ajustes" />

      <Section>
        <Card onPress={() => router.push('/(tabs)/settings/profile')} accessibilityLabel="Editar perfil">
          <XStack alignItems="center" gap={space.lg}>
            <View style={styles.avatarRing}>
              <GradientFill from={gradients.avatar[0]} to={gradients.avatar[1]} />
              <View style={styles.avatar}>
                <Text fontSize={22} fontWeight="800" color={colors.text}>{initial}</Text>
              </View>
            </View>
            <YStack flex={1} gap={3}>
              <Text fontSize={17} fontWeight="700" color={colors.text} numberOfLines={1}>
                {user?.display_name || 'Sin nombre'}
              </Text>
              <Text fontSize={13} color={colors.textMuted} numberOfLines={1}>{user?.email}</Text>
            </YStack>
            <Badge label={(PLAN_LABEL[plan] ?? plan).toUpperCase()} color={plan === 'free' ? colors.textSecondary : colors.primaryBright} />
          </XStack>
        </Card>
      </Section>

      <Section title="Cuenta">
        <ListGroup>
          <ListRow icon={<UserRound size={17} color={colors.textSecondary} />} label="Perfil"
            detail="Nombre visible" onPress={() => router.push('/(tabs)/settings/profile')} />
          <RowDivider />
          <ListRow
            icon={<ShieldCheck size={17} color={mfaEnabled ? colors.success : colors.textSecondary} />}
            label="Seguridad"
            detail={mfaEnabled === null ? 'Verificación en dos pasos' : mfaEnabled ? 'Verificación en dos pasos activada' : 'Activa la verificación en dos pasos'}
            onPress={() => router.push('/(tabs)/settings/security')}
          />
          <RowDivider />
          <ListRow icon={<KeyRound size={17} color={colors.textSecondary} />} label="API Keys"
            detail="Acceso del CLI a tu cuenta" onPress={() => router.push('/(tabs)/settings/api-keys')} />
        </ListGroup>
      </Section>

      <Section title="Organización">
        <ListGroup>
          <ListRow icon={<Users size={17} color={colors.textSecondary} />} label="Equipo"
            detail="Miembros y roles" onPress={() => router.push('/(tabs)/settings/team')} />
          <RowDivider />
          <ListRow icon={<CreditCard size={17} color={colors.textSecondary} />} label="Plan y facturación"
            detail={`Plan ${PLAN_LABEL[plan] ?? plan}`} onPress={() => router.push('/(tabs)/settings/billing')} />
        </ListGroup>
      </Section>

      <Section>
        <ListGroup>
          <ListRow icon={<LogOut size={17} color={colors.danger} />} label="Cerrar sesión" destructive onPress={confirmLogout} />
        </ListGroup>
      </Section>

      <Text fontSize={12} color={colors.textFaint} textAlign="center" style={styles.version}>
        Nexus {Constants.expoConfig?.version}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  version: { marginTop: -space.sm },
  avatarRing: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#1a1428', alignItems: 'center', justifyContent: 'center' },
});
