import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { api, type ProjectResponse } from '@/api/client';
import { FolderOpen, Plus, GitBranch, Terminal, Clock, ArrowRight } from 'lucide-react-native';

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.listProjects();
      setProjects(data);
    } catch (e) {
      console.error('Failed to load projects', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nunca';
    const d = new Date(iso);
    return d.toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center" padding="$6" paddingTop={60}>
          <YStack gap="$1">
            <Text fontSize={24} fontWeight="800" color="#f8fafc">
              Proyectos
            </Text>
            <Text fontSize={14} color="#64748b">
              {projects.length} proyecto{projects.length !== 1 && 's'}
            </Text>
          </YStack>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/modals/create-project')}
          >
            <Plus size={20} color="#ffffff" />
          </Pressable>
        </XStack>

        {/* Project Cards */}
        <YStack paddingHorizontal="$4" gap="$3">
          {projects.length === 0 && !loading ? (
            <YStack alignItems="center" padding="$12" gap="$4">
              <View style={styles.emptyIcon}>
                <FolderOpen size={40} color="#3a3a4a" />
              </View>
              <Text fontSize={16} fontWeight="600" color="#64748b">
                No hay proyectos
              </Text>
              <Text fontSize={13} color="#4a4a5a" textAlign="center">
                Crea tu primer proyecto para empezar a hacer context switches
              </Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push('/modals/create-project')}
              >
                <Plus size={16} color="#ffffff" />
                <Text fontSize={14} fontWeight="600" color="#ffffff">
                  Crear Proyecto
                </Text>
              </Pressable>
            </YStack>
          ) : (
            projects.map((project) => (
              <Pressable
                key={project.id}
                style={styles.projectCard}
                onPress={() => router.push(`/(tabs)/projects/${project.slug}`)}
              >
                <XStack alignItems="center" gap="$3">
                  <View style={styles.projectIcon}>
                    <FolderOpen size={20} color="#a78bfa" />
                  </View>
                  <YStack flex={1} gap="$1">
                    <Text fontSize={16} fontWeight="700" color="#f8fafc">
                      {project.name}
                    </Text>
                    {project.description ? (
                      <Text fontSize={12} color="#64748b" numberOfLines={1}>
                        {project.description}
                      </Text>
                    ) : null}
                  </YStack>
                  <ArrowRight size={16} color="#3a3a4a" />
                </XStack>

                <XStack gap="$4" marginTop="$3">
                  <XStack alignItems="center" gap="$1">
                    <GitBranch size={12} color="#64748b" />
                    <Text fontSize={11} color="#64748b">
                      {project.environments?.length ?? 0} envs
                    </Text>
                  </XStack>
                  <XStack alignItems="center" gap="$1">
                    <Terminal size={12} color="#64748b" />
                    <Text fontSize={11} color="#64748b">
                      {project.switch_count} switches
                    </Text>
                  </XStack>
                  <XStack alignItems="center" gap="$1">
                    <Clock size={12} color="#64748b" />
                    <Text fontSize={11} color="#64748b">
                      {formatDate(project.last_switch)}
                    </Text>
                  </XStack>
                </XStack>
              </Pressable>
            ))
          )}
        </YStack>
      </ScrollView>
    </View>
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectCard: {
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1a1a24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});
