import { View, StyleSheet } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/provider';
import { api, type DashboardStats, type RecentSwitch } from '@/api/client';
import { Zap, FolderKanban, Terminal, Plug, CheckCircle2, XCircle, History, Plus } from 'lucide-react-native';
import {
  Screen, ScreenHeader, Section, Card, IconTile, Badge, ListGroup, RowDivider,
  LoadingState, EmptyState, ErrorBanner, Button,
} from '@/components/ui';
import { colors, space, envColor } from '@/theme/tokens';
import { timeAgo } from '@/lib/format';

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function OverviewScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentSwitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const overview = await api.getDashboardOverview();
      setStats(overview.stats);
      setRecent(overview.recent);
      setError('');
    } catch {
      setError('No pudimos cargar tu resumen.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const firstName = (user?.display_name || user?.email || '').split(/[\s@]/)[0];

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }}>
      <ScreenHeader eyebrow={greeting()} title={firstName || 'Nexus'} />

      {error ? <ErrorBanner message={error} onRetry={loadData} /> : null}

      {loading ? (
        <LoadingState label="Cargando tu resumen…" />
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard icon={<FolderKanban size={18} color={colors.primaryBright} />} tint={colors.primarySoft}
              value={stats?.total_projects ?? 0} label="Proyectos" />
            <StatCard icon={<Zap size={18} color={colors.warning} />} tint={colors.warningSoft}
              value={stats?.switches_today ?? 0} label="Switches hoy" />
            <StatCard icon={<Terminal size={18} color={colors.success} />} tint={colors.successSoft}
              value={stats?.skills_executed ?? 0} label="Skills (7 días)" />
            <StatCard icon={<Plug size={18} color={colors.info} />} tint={colors.infoSoft}
              value={stats?.tools_connected ?? 0} label="Herramientas" />
          </View>

          <Section title="Switches recientes">
            {recent.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<History size={28} color={colors.textMuted} />}
                  title="Aún no hay switches"
                  message="Cuando cambies de contexto con el CLI (nexus switch), aparecerán aquí."
                  action={stats?.total_projects ? undefined : (
                    <Button compact label="Crear proyecto" icon={<Plus size={16} color="#fff" />}
                      onPress={() => router.push('/modals/create-project')} />
                  )}
                />
              </Card>
            ) : (
              <ListGroup>
                {recent.map((sw, i) => (
                  <View key={sw.id}>
                    {i > 0 ? <RowDivider /> : null}
                    <XStack alignItems="center" gap={space.md} paddingHorizontal={space.lg} paddingVertical={13}>
                      <IconTile size={34} color={sw.success ? colors.successSoft : colors.dangerSoft}>
                        {sw.success ? <CheckCircle2 size={17} color={colors.success} /> : <XCircle size={17} color={colors.danger} />}
                      </IconTile>
                      <YStack flex={1} gap={3}>
                        <XStack alignItems="center" gap={space.sm}>
                          <Text fontSize={15} fontWeight="600" color={colors.text} numberOfLines={1} flexShrink={1}>
                            {sw.project_name}
                          </Text>
                          <Badge label={sw.environment} color={envColor(sw.environment)} />
                        </XStack>
                        <Text fontSize={12} color={colors.textMuted} numberOfLines={1}>{sw.message}</Text>
                      </YStack>
                      <Text fontSize={12} color={colors.textFaint}>{timeAgo(sw.created_at)}</Text>
                    </XStack>
                  </View>
                ))}
              </ListGroup>
            )}
          </Section>
        </>
      )}
    </Screen>
  );
}

function StatCard({ icon, tint, value, label }: { icon: React.ReactNode; tint: string; value: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <IconTile size={34} color={tint}>{icon}</IconTile>
      <YStack gap={2} marginTop={space.md}>
        <Text fontSize={26} fontWeight="800" color={colors.text} letterSpacing={-0.5}>{value}</Text>
        <Text fontSize={12} color={colors.textMuted}>{label}</Text>
      </YStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    paddingHorizontal: space.xl,
    marginBottom: space.xxl,
  },
  stat: { flexBasis: '47%', flexGrow: 1, padding: space.lg },
});
