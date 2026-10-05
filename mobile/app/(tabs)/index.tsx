import { View, StyleSheet } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/provider';
import { api, type DashboardStats, type RecentSwitch, type ActivityPoint } from '@/api/client';
import { FolderKanban, Terminal, Plug, CheckCircle2, XCircle, History, Plus, Zap } from 'lucide-react-native';
import {
  Screen, Section, Card, IconTile, Badge, ListGroup, RowDivider,
  LoadingState, EmptyState, ErrorBanner, Button, GradientFill, BarChart, FadeIn, Monogram, Glow,
} from '@/components/ui';
import { colors, radius, space, gutter, gradients, envColor } from '@/theme/tokens';
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
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const overview = await api.getDashboardOverview();
      setStats(overview.stats);
      setRecent(overview.recent);
      setActivity(overview.activity);
      setError('');
    } catch {
      setError('No pudimos cargar tu resumen.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const firstName = (user?.display_name || user?.email || '').split(/[\s@]/)[0];
  // La API manda los últimos 7 días en orden (hoy al final), con nombre corto: "Mar", "Mié"…
  const week = activity.map((p) => ({ label: p.day, value: p.switches }));
  const weekTotal = week.reduce((sum, d) => sum + d.value, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }}>
      <YStack paddingHorizontal={gutter} paddingBottom={space.xl} gap={2}>
        <Text fontSize={14} color={colors.textMuted}>{greeting()}</Text>
        <Text fontSize={30} fontWeight="800" color={colors.text} letterSpacing={-0.8}>{firstName || 'Nexus'}</Text>
      </YStack>

      {error ? <ErrorBanner message={error} onRetry={loadData} /> : null}

      {loading ? (
        <LoadingState label="Cargando tu resumen…" />
      ) : (
        <>
          {/* Tarjeta principal: actividad de la semana */}
          <FadeIn style={styles.heroWrap}>
            <View style={styles.hero}>
              <GradientFill from={gradients.hero[0]} to={gradients.hero[1]} />
              <Glow color="#a78bfa" size={280} style={styles.heroGlow} />
              <XStack alignItems="flex-start" justifyContent="space-between">
                <YStack gap={2}>
                  <Text fontSize={13} fontWeight="600" color="rgba(221, 214, 254, 0.8)">Switches esta semana</Text>
                  <XStack alignItems="baseline" gap={space.sm}>
                    <Text fontSize={44} fontWeight="800" color="#ffffff" letterSpacing={-1.5}>{weekTotal}</Text>
                    <Text fontSize={14} fontWeight="600" color="rgba(221, 214, 254, 0.7)">
                      {stats?.switches_today ?? 0} hoy
                    </Text>
                  </XStack>
                </YStack>
                <View style={styles.heroBadge}>
                  <Zap size={14} color="#fde68a" fill="#fde68a" />
                  <Text fontSize={12} fontWeight="700" color="#ffffff">{(user?.plan ?? 'free').toUpperCase()}</Text>
                </View>
              </XStack>
              <View style={{ marginTop: space.lg }}>
                <BarChart data={week} />
              </View>
            </View>
          </FadeIn>

          {/* Indicadores */}
          <View style={styles.statsRow}>
            {[
              { icon: <FolderKanban size={17} color={colors.primaryBright} />, tint: colors.primarySoft, value: stats?.total_projects ?? 0, label: 'Proyectos' },
              { icon: <Terminal size={17} color={colors.success} />, tint: colors.successSoft, value: stats?.skills_executed ?? 0, label: 'Skills 7 d' },
              { icon: <Plug size={17} color={colors.info} />, tint: colors.infoSoft, value: stats?.tools_connected ?? 0, label: 'Herramientas' },
            ].map((s, i) => (
              <FadeIn key={s.label} index={i + 1} style={styles.statWrap}>
                <Card style={styles.stat}>
                  <IconTile size={32} color={s.tint}>{s.icon}</IconTile>
                  <Text fontSize={22} fontWeight="800" color={colors.text} letterSpacing={-0.5} marginTop={space.md}>{s.value}</Text>
                  <Text fontSize={12} color={colors.textMuted} numberOfLines={1}>{s.label}</Text>
                </Card>
              </FadeIn>
            ))}
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
              <FadeIn index={4}>
                <ListGroup>
                  {recent.map((sw, i) => (
                    <View key={sw.id}>
                      {i > 0 ? <RowDivider /> : null}
                      <XStack alignItems="center" gap={space.md} paddingHorizontal={space.lg} paddingVertical={13}>
                        <View>
                          <Monogram name={sw.project_name} size={38} />
                          <View style={[styles.statusDot, { backgroundColor: sw.success ? colors.success : colors.danger }]}>
                            {sw.success ? <CheckCircle2 size={10} color="#fff" /> : <XCircle size={10} color="#fff" />}
                          </View>
                        </View>
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
              </FadeIn>
            )}
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroWrap: { paddingHorizontal: gutter, marginBottom: space.md },
  hero: {
    borderRadius: radius.xl + 4,
    padding: space.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  heroGlow: { position: 'absolute', top: -140, right: -110 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statsRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: gutter, marginBottom: space.xxl },
  statWrap: { flex: 1 },
  stat: { padding: space.md + 2 },
  statusDot: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
