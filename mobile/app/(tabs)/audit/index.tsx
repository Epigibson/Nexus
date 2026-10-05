import { View, Pressable, StyleSheet } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { api, type AuditEntry } from '@/api/client';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, SkipForward, History } from 'lucide-react-native';
import { Screen, ScreenHeader, Section, Badge, LoadingState, EmptyState, ErrorBanner, FadeIn } from '@/components/ui';
import { colors, radius, space, envColor } from '@/theme/tokens';
import { dateTime, duration, parseDate } from '@/lib/format';

type SkillStatus = 'success' | 'warning' | 'error';
type Filter = 'all' | 'ok' | 'errors';

const SKILL_LABELS: Record<string, string> = {
  env_inject: 'Variables',
  git_switch: 'Git',
  cli_switch: 'CLI',
  project_init: 'Init',
};

function getSkillStatus(entry: AuditEntry): SkillStatus {
  if (entry.success) return 'success';
  const msg = entry.message.toLowerCase();
  if (
    msg.includes('skipped') || msg.includes('not installed') || msg.includes('not authenticated') ||
    msg.includes('not defined') || msg.includes('disabled') || msg.includes('no commands') ||
    msg.includes('no branch') || msg.includes('no env') || msg.includes('no executor')
  ) {
    return 'warning';
  }
  return 'error';
}

interface SwitchGroup {
  entry: AuditEntry;
  children: AuditEntry[];
  totalDuration: number;
  counts: Record<SkillStatus, number>;
}

/** Agrupa cada context_switch con los skills que corrieron en los 15 s alrededor del mismo proyecto. */
function groupBySwitches(entries: AuditEntry[]): SwitchGroup[] {
  const switches = entries.filter((e) => e.action === 'context_switch');
  const others = entries.filter((e) => e.action !== 'context_switch');
  return switches.map((sw) => {
    const swTime = parseDate(sw.created_at).getTime();
    const children = others.filter(
      (e) => Math.abs(parseDate(e.created_at).getTime() - swTime) < 15000 && e.project_name === sw.project_name,
    );
    const counts: Record<SkillStatus, number> = { success: 0, warning: 0, error: 0 };
    for (const c of children) counts[getSkillStatus(c)]++;
    if (!sw.success && counts.error === 0) counts.error = 1;
    const totalDuration = children.reduce((sum, c) => sum + (c.duration_ms || 0), 0) || sw.duration_ms || 0;
    return { entry: sw, children, totalDuration, counts };
  });
}

function StatusIcon({ status, size = 16 }: { status: SkillStatus; size?: number }) {
  if (status === 'success') return <CheckCircle2 size={size} color={colors.success} />;
  if (status === 'warning') return <SkipForward size={size} color={colors.warning} />;
  return <XCircle size={size} color={colors.danger} />;
}

function SwitchRow({ group }: { group: SwitchGroup }) {
  const [expanded, setExpanded] = useState(false);
  const { entry, children, totalDuration, counts } = group;
  const failed = counts.error > 0;

  return (
    <View style={styles.group}>
      <Pressable
        onPress={() => children.length && setExpanded(!expanded)}
        style={({ pressed }) => [styles.groupHeader, pressed && children.length > 0 && { backgroundColor: colors.surfacePressed }]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <StatusIcon status={failed ? 'error' : 'success'} size={20} />
        <YStack flex={1} gap={4}>
          <XStack alignItems="center" gap={space.sm}>
            <Text fontSize={15} fontWeight="600" color={colors.text} numberOfLines={1} flexShrink={1}>
              {entry.project_name ?? 'Proyecto'}
            </Text>
            {entry.environment ? <Badge label={entry.environment} color={envColor(entry.environment)} /> : null}
          </XStack>
          <XStack alignItems="center" gap={space.md}>
            <Text fontSize={12} color={colors.textMuted}>{dateTime(entry.created_at)}</Text>
            <Text fontSize={12} color={colors.textFaint}>{duration(totalDuration)}</Text>
          </XStack>
        </YStack>
        <XStack alignItems="center" gap={space.sm}>
          {(['success', 'warning', 'error'] as SkillStatus[]).map((s) =>
            counts[s] > 0 ? (
              <XStack key={s} alignItems="center" gap={3}>
                <StatusIcon status={s} size={12} />
                <Text fontSize={12} color={colors.textSecondary}>{counts[s]}</Text>
              </XStack>
            ) : null,
          )}
          {children.length > 0 ? (
            expanded ? <ChevronDown size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textFaint} />
          ) : null}
        </XStack>
      </Pressable>

      {expanded ? (
        <View style={styles.children}>
          {children.map((child) => (
            <XStack key={child.id} alignItems="center" gap={space.sm} paddingVertical={7}>
              <StatusIcon status={getSkillStatus(child)} size={14} />
              <Text fontSize={12} fontWeight="700" color={colors.textSecondary} width={64} numberOfLines={1}>
                {child.skill_name || SKILL_LABELS[child.action] || child.action}
              </Text>
              <Text flex={1} fontSize={12} color={colors.textMuted} numberOfLines={2}>{child.message}</Text>
              <Text fontSize={11} color={colors.textFaint}>{duration(child.duration_ms ?? 0)}</Text>
            </XStack>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function AuditScreen() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const loadData = useCallback(async () => {
    try {
      setEntries(await api.listAudit({ limit: 200 }));
      setError('');
    } catch {
      setError('No pudimos cargar la actividad.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const groups = useMemo(() => groupBySwitches(entries), [entries]);
  const visible = groups.filter((g) =>
    filter === 'all' ? true : filter === 'errors' ? g.counts.error > 0 : g.counts.error === 0,
  );
  const errorCount = groups.filter((g) => g.counts.error > 0).length;

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: `Todo · ${groups.length}` },
    { id: 'ok', label: 'Correctos' },
    { id: 'errors', label: `Con errores${errorCount ? ` · ${errorCount}` : ''}` },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }}>
      <ScreenHeader title="Actividad" subtitle="Historial de switches y lo que ejecutó cada uno" />

      {error ? <ErrorBanner message={error} onRetry={loadData} /> : null}

      {loading ? (
        <LoadingState label="Cargando actividad…" />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<History size={28} color={colors.textMuted} />}
          title="Sin actividad todavía"
          message="Cada vez que corras nexus switch en tu terminal, quedará registrado aquí."
        />
      ) : (
        <>
          <XStack paddingHorizontal={space.xl} gap={space.sm} marginBottom={space.xl}>
            {FILTERS.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[styles.filter, filter === f.id && styles.filterActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === f.id }}
              >
                <Text fontSize={13} fontWeight="600" color={filter === f.id ? colors.text : colors.textMuted}>{f.label}</Text>
              </Pressable>
            ))}
          </XStack>
          <Section>
            {visible.length === 0 ? (
              <Text fontSize={14} color={colors.textMuted} textAlign="center" paddingVertical={space.xxl}>
                Nada que mostrar con este filtro.
              </Text>
            ) : (
              visible.map((g, i) => <FadeIn key={g.entry.id} index={i}><SwitchRow group={g} /></FadeIn>)
            )}
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  children: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: colors.bg,
  },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
});
