import { Pressable, StyleSheet } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, type ProjectResponse } from '@/api/client';
import { FolderKanban, Plus, Layers, Zap, Clock, ChevronRight } from 'lucide-react-native';
import { Screen, ScreenHeader, Section, Card, IconTile, LoadingState, EmptyState, ErrorBanner, Button } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';
import { timeAgo } from '@/lib/format';

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = useCallback(async () => {
    try {
      setProjects(await api.listProjects());
      setError('');
    } catch {
      setError('No pudimos cargar tus proyectos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recarga al volver a la pestaña (p. ej. después de crear un proyecto)
  useFocusEffect(useCallback(() => { loadProjects(); }, [loadProjects]));

  const newProject = () => router.push('/modals/create-project');

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProjects(); }}>
      <ScreenHeader
        title="Proyectos"
        subtitle={loading ? undefined : `${projects.length} proyecto${projects.length === 1 ? '' : 's'}`}
        right={
          <Pressable
            onPress={newProject}
            accessibilityRole="button"
            accessibilityLabel="Nuevo proyecto"
            style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}
          >
            <Plus size={22} color="#ffffff" />
          </Pressable>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={loadProjects} /> : null}

      {loading ? (
        <LoadingState label="Cargando proyectos…" />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} color={colors.textMuted} />}
          title="Crea tu primer proyecto"
          message="Un proyecto agrupa los entornos (desarrollo, staging, producción) entre los que cambias con el CLI."
          action={<Button label="Crear proyecto" icon={<Plus size={18} color="#fff" />} onPress={newProject} />}
        />
      ) : (
        <Section>
          {projects.map((project) => (
            <Card
              key={project.id}
              onPress={() => router.push(`/(tabs)/projects/${project.slug}`)}
              accessibilityLabel={`Abrir ${project.name}`}
            >
              <XStack alignItems="center" gap={space.md}>
                <IconTile size={44}>
                  <Text fontSize={18} fontWeight="800" color={colors.primaryBright}>
                    {project.name.charAt(0).toUpperCase()}
                  </Text>
                </IconTile>
                <YStack flex={1} gap={2}>
                  <Text fontSize={16} fontWeight="700" color={colors.text} numberOfLines={1}>{project.name}</Text>
                  <Text fontSize={13} color={colors.textMuted} numberOfLines={1}>
                    {project.description || `/${project.slug}`}
                  </Text>
                </YStack>
                <ChevronRight size={18} color={colors.textFaint} />
              </XStack>

              <XStack gap={space.lg} marginTop={space.md} paddingTop={space.md} style={styles.meta}>
                <Meta icon={<Layers size={13} color={colors.textMuted} />}
                  text={`${project.environments?.length ?? 0} entorno${project.environments?.length === 1 ? '' : 's'}`} />
                <Meta icon={<Zap size={13} color={colors.textMuted} />} text={`${project.switch_count} switches`} />
                <Meta icon={<Clock size={13} color={colors.textMuted} />} text={timeAgo(project.last_switch)} />
              </XStack>
            </Card>
          ))}
        </Section>
      )}
    </Screen>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <XStack alignItems="center" gap={5}>
      {icon}
      <Text fontSize={12} color={colors.textMuted}>{text}</Text>
    </XStack>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
