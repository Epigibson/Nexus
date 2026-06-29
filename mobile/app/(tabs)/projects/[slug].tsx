import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api, type ProjectResponse, type EnvironmentResponse, type SkillResponse } from '../../src/api/client';
import {
  ArrowLeft, GitBranch, Terminal, Key, Globe, Plus, Settings, Activity,
  CheckCircle2, XCircle, ToggleLeft, ToggleRight, ExternalLink,
} from 'lucide-react-native';

type Tab = 'envs' | 'skills' | 'activity';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('envs');

  const loadProject = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await api.getProject(slug);
      setProject(data);
    } catch (e) {
      console.error('Failed to load project', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProject();
  };

  if (!project && !loading) {
    return (
      <View style={styles.container}>
        <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
          <Text fontSize={16} color="#64748b">Proyecto no encontrado</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text fontSize={14} color="#7c3aed">Volver</Text>
          </Pressable>
        </YStack>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* Header */}
        <YStack padding="$6" paddingTop={60} gap="$3">
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#94a3b8" />
            <Text fontSize={14} color="#94a3b8">Volver</Text>
          </Pressable>

          <XStack alignItems="center" gap="$3">
            <View style={styles.projectIcon}>
              <Text fontSize={20}>📦</Text>
            </View>
            <YStack flex={1}>
              <Text fontSize={22} fontWeight="800" color="#f8fafc">
                {project?.name}
              </Text>
              {project?.description ? (
                <Text fontSize={13} color="#64748b">{project.description}</Text>
              ) : null}
            </YStack>
          </XStack>

          {project?.repo_url ? (
            <XStack alignItems="center" gap="$2">
              <ExternalLink size={14} color="#64748b" />
              <Text fontSize={12} color="#7c3aed">{project.repo_url}</Text>
            </XStack>
          ) : null}
        </YStack>

        {/* Tabs */}
        <XStack paddingHorizontal="$4" gap="$2">
          {(['envs', 'skills', 'activity'] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text fontSize={13} fontWeight="600" color={activeTab === tab ? '#f8fafc' : '#64748b'}>
                {tab === 'envs' ? 'Entornos' : tab === 'skills' ? 'Skills' : 'Actividad'}
              </Text>
            </Pressable>
          ))}
        </XStack>

        {/* Tab Content */}
        <YStack paddingHorizontal="$4" paddingTop="$4" gap="$3">
          {activeTab === 'envs' && (
            <EnvironmentsTab environments={project?.environments ?? []} />
          )}
          {activeTab === 'skills' && (
            <SkillsTab skills={project?.skills ?? []} />
          )}
          {activeTab === 'activity' && (
            <ActivityTab slug={slug || ''} />
          )}
        </YStack>
      </ScrollView>
    </View>
  );
}

function EnvironmentsTab({ environments }: { environments: EnvironmentResponse[] }) {
  if (environments.length === 0) {
    return (
      <YStack alignItems="center" padding="$8" gap="$2">
        <GitBranch size={32} color="#3a3a4a" />
        <Text fontSize={14} color="#64748b">No hay entornos configurados</Text>
      </YStack>
    );
  }

  return (
    <>
      {environments.map((env) => (
        <View key={env.id} style={styles.envCard}>
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$2">
              <View style={[styles.envBadge, { backgroundColor: envColor(env.environment) + '20' }]}>
                <Text fontSize={12} fontWeight="700" color={envColor(env.environment)}>
                  {env.environment}
                </Text>
              </View>
              <Text fontSize={15} fontWeight="600" color="#f8fafc">{env.name}</Text>
            </XStack>
          </XStack>

          {env.git_branch ? (
            <XStack alignItems="center" gap="$2" marginTop="$2">
              <GitBranch size={12} color="#64748b" />
              <Text fontSize={12} color="#64748b">{env.git_branch}</Text>
            </XStack>
          ) : null}

          {env.cli_profiles.length > 0 ? (
            <XStack flexWrap="wrap" gap="$2" marginTop="$3">
              {env.cli_profiles.map((profile, i) => (
                <View key={i} style={styles.profileChip}>
                  <Terminal size={10} color="#a78bfa" />
                  <Text fontSize={10} color="#a78bfa">{profile.tool}</Text>
                </View>
              ))}
            </XStack>
          ) : null}

          {Object.keys(env.env_vars).length > 0 ? (
            <YStack gap="$1" marginTop="$3">
              <Text fontSize={11} color="#4a4a5a">Variables de entorno:</Text>
              {Object.keys(env.env_vars).slice(0, 5).map((key) => (
                <XStack key={key} alignItems="center" gap="$2">
                  <Key size={10} color="#64748b" />
                  <Text fontSize={11} color="#64748b" fontFamily="monospace">{key}</Text>
                </XStack>
              ))}
              {Object.keys(env.env_vars).length > 5 && (
                <Text fontSize={10} color="#4a4a5a">
                  +{Object.keys(env.env_vars).length - 5} más
                </Text>
              )}
            </YStack>
          ) : null}
        </View>
      ))}
    </>
  );
}

function SkillsTab({ skills }: { skills: SkillResponse[] }) {
  if (skills.length === 0) {
    return (
      <YStack alignItems="center" padding="$8" gap="$2">
        <Terminal size={32} color="#3a3a4a" />
        <Text fontSize={14} color="#64748b">No hay skills configurados</Text>
      </YStack>
    );
  }

  return (
    <>
      {skills.map((skill) => (
        <View key={skill.id} style={styles.skillCard}>
          <XStack alignItems="center" gap="$3">
            <View style={[styles.skillIcon, { backgroundColor: skill.is_enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)' }]}>
              {skill.is_enabled ? (
                <CheckCircle2 size={16} color="#10b981" />
              ) : (
                <XCircle size={16} color="#64748b" />
              )}
            </View>
            <YStack flex={1}>
              <XStack alignItems="center" gap="$2">
                <Text fontSize={14} fontWeight="600" color="#f8fafc">{skill.name}</Text>
                {skill.is_premium && (
                  <View style={styles.premiumBadge}>
                    <Text fontSize={9} fontWeight="700" color="#f59e0b">PRO</Text>
                  </View>
                )}
              </XStack>
              <Text fontSize={11} color="#64748b" numberOfLines={1}>{skill.description}</Text>
            </YStack>
            <Text fontSize={10} color="#4a4a5a">{skill.category}</Text>
          </XStack>
        </View>
      ))}
    </>
  );
}

function ActivityTab({ slug }: { slug: string }) {
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    api.listAudit({ limit: 15 }).then(setAudit).catch(console.error);
  }, []);

  if (audit.length === 0) {
    return (
      <YStack alignItems="center" padding="$8" gap="$2">
        <Activity size={32} color="#3a3a4a" />
        <Text fontSize={14} color="#64748b">No hay actividad reciente</Text>
      </YStack>
    );
  }

  return (
    <>
      {audit.map((entry) => (
        <View key={entry.id} style={styles.activityCard}>
          <XStack alignItems="center" gap="$3">
            {entry.success ? (
              <CheckCircle2 size={14} color="#10b981" />
            ) : (
              <XCircle size={14} color="#ef4444" />
            )}
            <YStack flex={1}>
              <Text fontSize={13} color="#f8fafc" numberOfLines={1}>{entry.message}</Text>
              <Text fontSize={11} color="#4a4a5a">
                {new Date(entry.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </YStack>
          </XStack>
        </View>
      ))}
    </>
  );
}

function envColor(env: string): string {
  switch (env) {
    case 'development': return '#10b981';
    case 'staging': return '#f59e0b';
    case 'production': return '#ef4444';
    default: return '#7c3aed';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scroll: {
    paddingBottom: 100,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
  tabActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  envCard: {
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e2a',
    gap: 4,
  },
  envBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  skillCard: {
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
  skillIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  activityCard: {
    backgroundColor: '#111118',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
});
