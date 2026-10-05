import { View, Pressable, Switch, Linking, StyleSheet } from 'react-native';
import { useDialog } from '@/components/Dialog';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { api, type ProjectResponse, type EnvironmentResponse, type SkillResponse, type AuditEntry } from '@/api/client';
import { GitBranch, Terminal, KeyRound, Plus, Activity, CheckCircle2, XCircle, ExternalLink, Layers, Sparkles } from 'lucide-react-native';
import {
  Screen, ScreenHeader, Section, Card, IconTile, Badge, ListGroup, RowDivider,
  LoadingState, EmptyState, ErrorBanner, Button, Monogram, FadeIn,
} from '@/components/ui';
import { colors, radius, space, envColor } from '@/theme/tokens';
import { timeAgo } from '@/lib/format';

type Tab = 'envs' | 'skills' | 'activity';
const TABS: { id: Tab; label: string }[] = [
  { id: 'envs', label: 'Entornos' },
  { id: 'skills', label: 'Skills' },
  { id: 'activity', label: 'Actividad' },
];

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('envs');

  const loadProject = useCallback(async () => {
    if (!slug) return;
    try {
      setProject(await api.getProject(slug));
      setError('');
    } catch {
      setError('No pudimos cargar el proyecto.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  // Recarga al volver (p. ej. después de crear un entorno)
  useFocusEffect(useCallback(() => { loadProject(); }, [loadProject]));

  if (loading) {
    return (
      <Screen>
        <ScreenHeader back title="Proyecto" />
        <LoadingState />
      </Screen>
    );
  }

  if (!project) {
    return (
      <Screen>
        <ScreenHeader back title="Proyecto" />
        {error ? <ErrorBanner message={error} onRetry={loadProject} /> : null}
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProject(); }}>
      <ScreenHeader back title={project.name} subtitle={project.description || `/${project.slug}`} right={<Monogram name={project.name} size={52} />} />

      {project.repo_url ? (
        <Pressable onPress={() => Linking.openURL(project.repo_url!)} style={styles.repo} hitSlop={8}>
          <ExternalLink size={14} color={colors.primaryBright} />
          <Text fontSize={13} color={colors.primaryBright} numberOfLines={1} flexShrink={1}>
            {project.repo_url.replace(/^https?:\/\//, '')}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.segmented}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}
            style={[styles.segment, tab === t.id && styles.segmentActive]}
          >
            <Text fontSize={13} fontWeight="700" color={tab === t.id ? colors.text : colors.textMuted}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'envs' && (
        <EnvironmentsTab
          environments={project.environments ?? []}
          onAdd={() => router.push({ pathname: '/modals/create-environment', params: { projectSlug: project.slug } })}
        />
      )}
      {tab === 'skills' && <SkillsTab project={project} onChanged={loadProject} />}
      {tab === 'activity' && <ActivityTab projectId={project.id} />}
    </Screen>
  );
}

function EnvironmentsTab({ environments, onAdd }: { environments: EnvironmentResponse[]; onAdd: () => void }) {
  const addButton = <Button compact variant="ghost" label="Agregar" icon={<Plus size={16} color={colors.primaryBright} />} onPress={onAdd} />;

  if (environments.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={28} color={colors.textMuted} />}
        title="Sin entornos"
        message="Agrega development, staging o production para poder cambiar entre ellos con el CLI."
        action={<Button compact label="Agregar entorno" icon={<Plus size={16} color="#fff" />} onPress={onAdd} />}
      />
    );
  }

  return (
    <Section title={`${environments.length} entorno${environments.length === 1 ? '' : 's'}`} action={addButton}>
      {environments.map((env, index) => {
        const keys = env.env_var_keys?.length ? env.env_var_keys : Object.keys(env.env_vars ?? {});
        return (
          <FadeIn key={env.id} index={index}>
          <Card>
            <XStack alignItems="center" gap={space.sm}>
              <View style={[styles.envDot, { backgroundColor: envColor(env.environment) }]} />
              <Text fontSize={16} fontWeight="700" color={colors.text} flex={1} numberOfLines={1}>{env.name}</Text>
              {env.name !== env.environment ? <Badge label={env.environment} color={envColor(env.environment)} /> : null}
            </XStack>

            <YStack gap={space.sm} marginTop={space.md}>
              {env.git_branch ? (
                <Detail icon={<GitBranch size={14} color={colors.textMuted} />} text={env.git_branch} mono />
              ) : null}
              {keys.length > 0 ? (
                <Detail
                  icon={<KeyRound size={14} color={colors.textMuted} />}
                  text={`${keys.length} variable${keys.length === 1 ? '' : 's'} · ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '…' : ''}`}
                  mono
                />
              ) : null}
            </YStack>

            {env.cli_profiles.length > 0 ? (
              <XStack flexWrap="wrap" gap={space.sm} marginTop={space.md}>
                {env.cli_profiles.map((p, i) => (
                  <View key={`${p.tool}-${i}`} style={styles.chip}>
                    <Terminal size={11} color={colors.primaryBright} />
                    <Text fontSize={12} color={colors.textSecondary}>{p.tool}</Text>
                    <Text fontSize={12} color={colors.textFaint}>· {p.account}</Text>
                  </View>
                ))}
              </XStack>
            ) : null}
          </Card>
          </FadeIn>
        );
      })}
    </Section>
  );
}

function Detail({ icon, text, mono }: { icon: React.ReactNode; text: string; mono?: boolean }) {
  return (
    <XStack alignItems="center" gap={space.sm}>
      {icon}
      <Text fontSize={13} color={colors.textSecondary} fontFamily={mono ? 'monospace' : undefined} numberOfLines={1} flexShrink={1}>
        {text}
      </Text>
    </XStack>
  );
}

function SkillsTab({ project, onChanged }: { project: ProjectResponse; onChanged: () => void }) {
  const [skills, setSkills] = useState<SkillResponse[]>(project.skills ?? []);
  const [busy, setBusy] = useState<string | null>(null);
  const dialog = useDialog();

  useEffect(() => setSkills(project.skills ?? []), [project.skills]);

  const toggle = async (skill: SkillResponse, enabled: boolean) => {
    setBusy(skill.id);
    setSkills((list) => list.map((s) => (s.id === skill.id ? { ...s, is_enabled: enabled } : s)));
    try {
      await api.toggleSkill(project.slug, skill.id, enabled);
      onChanged();
    } catch (e: any) {
      setSkills((list) => list.map((s) => (s.id === skill.id ? { ...s, is_enabled: !enabled } : s)));
      dialog.notify({ title: 'No se pudo cambiar el skill', message: e?.message || 'Intenta de nuevo.' });
    } finally {
      setBusy(null);
    }
  };

  if (skills.length === 0) {
    return <EmptyState icon={<Sparkles size={28} color={colors.textMuted} />} title="Sin skills" message="Este proyecto no tiene skills configurados." />;
  }

  return (
    <Section title="Se ejecutan en cada switch">
      <ListGroup>
        {skills.map((skill, i) => (
          <View key={skill.id}>
            {i > 0 ? <RowDivider /> : null}
            <XStack alignItems="center" gap={space.md} paddingHorizontal={space.lg} paddingVertical={13}>
              <YStack flex={1} gap={3}>
                <XStack alignItems="center" gap={space.sm}>
                  <Text fontSize={15} fontWeight="600" color={colors.text}>{skill.name}</Text>
                  {skill.is_premium ? <Badge label="PRO" color={colors.warning} /> : null}
                </XStack>
                <Text fontSize={12} color={colors.textMuted} numberOfLines={2}>{skill.description}</Text>
              </YStack>
              <Switch
                value={skill.is_enabled}
                disabled={busy === skill.id}
                onValueChange={(v) => toggle(skill, v)}
                trackColor={{ false: colors.borderStrong, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </XStack>
          </View>
        ))}
      </ListGroup>
    </Section>
  );
}

function ActivityTab({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    api.listAudit({ project_id: projectId, limit: 30 }).then(setEntries).catch(() => setEntries([]));
  }, [projectId]);

  if (!entries) return <LoadingState />;
  if (entries.length === 0) {
    return <EmptyState icon={<Activity size={28} color={colors.textMuted} />} title="Sin actividad" message="Los switches de este proyecto aparecerán aquí." />;
  }

  return (
    <Section title="Últimos eventos">
      <ListGroup>
        {entries.map((e, i) => (
          <View key={e.id}>
            {i > 0 ? <RowDivider /> : null}
            <XStack alignItems="center" gap={space.md} paddingHorizontal={space.lg} paddingVertical={12}>
              <IconTile size={30} color={e.success ? colors.successSoft : colors.dangerSoft}>
                {e.success ? <CheckCircle2 size={15} color={colors.success} /> : <XCircle size={15} color={colors.danger} />}
              </IconTile>
              <YStack flex={1} gap={2}>
                <Text fontSize={14} color={colors.text} numberOfLines={1}>{e.message}</Text>
                <Text fontSize={12} color={colors.textMuted}>
                  {[e.skill_name, e.environment].filter(Boolean).join(' · ') || e.action}
                </Text>
              </YStack>
              <Text fontSize={12} color={colors.textFaint}>{timeAgo(e.created_at)}</Text>
            </XStack>
          </View>
        ))}
      </ListGroup>
    </Section>
  );
}

const styles = StyleSheet.create({
  repo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.xl, marginTop: -space.md, marginBottom: space.xl },
  segmented: {
    flexDirection: 'row',
    marginHorizontal: space.xl,
    marginBottom: space.xxl,
    padding: 4,
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.surfacePressed, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  envDot: { width: 9, height: 9, borderRadius: 5, shadowOpacity: 0.9, shadowRadius: 6, elevation: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
