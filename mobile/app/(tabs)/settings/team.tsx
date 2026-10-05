import { View, Linking } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Users, ExternalLink } from 'lucide-react-native';
import { useAuth } from '@/auth/provider';
import { api, type TeamMember } from '@/api/client';
import {
  Screen, ScreenHeader, Section, IconTile, Badge, ListGroup, RowDivider,
  LoadingState, EmptyState, ErrorBanner, Button,
} from '@/components/ui';
import { colors, space } from '@/theme/tokens';

const ROLE: Record<string, { label: string; color: string }> = {
  owner: { label: 'Dueño', color: colors.primaryBright },
  admin: { label: 'Admin', color: colors.info },
  member: { label: 'Miembro', color: colors.textSecondary },
  viewer: { label: 'Lector', color: colors.textMuted },
};

export default function TeamScreen() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.getTeamMembers()
      .then((m) => { setMembers(m); setError(''); })
      .catch(() => { setMembers([]); setError('No pudimos cargar el equipo.'); });
  }, []);

  useFocusEffect(load);

  return (
    <Screen>
      <ScreenHeader back title="Equipo" subtitle={members ? `${members.length} miembro${members.length === 1 ? '' : 's'}` : undefined} />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {members === null ? (
        <LoadingState />
      ) : members.length === 0 ? (
        <EmptyState icon={<Users size={28} color={colors.textMuted} />} title="Sin miembros" />
      ) : (
        <Section>
          <ListGroup>
            {members.map((m, i) => {
              const role = ROLE[m.role] ?? { label: m.role, color: colors.textSecondary };
              const isMe = m.user_id === user?.id;
              return (
                <View key={m.user_id}>
                  {i > 0 ? <RowDivider /> : null}
                  <XStack alignItems="center" gap={space.md} paddingHorizontal={space.lg} paddingVertical={13}>
                    <IconTile size={36}>
                      <Text fontSize={15} fontWeight="800" color={colors.primaryBright}>
                        {(m.display_name || m.email).charAt(0).toUpperCase()}
                      </Text>
                    </IconTile>
                    <YStack flex={1} gap={2}>
                      <Text fontSize={15} fontWeight="600" color={colors.text} numberOfLines={1}>
                        {m.display_name || m.email.split('@')[0]}{isMe ? ' (tú)' : ''}
                      </Text>
                      <Text fontSize={12} color={colors.textMuted} numberOfLines={1}>{m.email}</Text>
                    </YStack>
                    <Badge label={role.label} color={role.color} />
                  </XStack>
                </View>
              );
            })}
          </ListGroup>
          <Text fontSize={13} color={colors.textMuted} textAlign="center" lineHeight={19}>
            Las invitaciones y los cambios de rol se gestionan desde el dashboard web.
          </Text>
          <Button variant="secondary" label="Abrir dashboard" icon={<ExternalLink size={16} color={colors.text} />}
            onPress={() => Linking.openURL('https://nexusproject.pro/dashboard/team')} />
        </Section>
      )}
    </Screen>
  );
}
