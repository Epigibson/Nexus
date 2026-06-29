import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/auth/provider';
import { api, type DashboardStats, type RecentSwitch, type ActivityPoint } from '@/api/client';
import { Zap, FolderOpen, Terminal, Activity, Clock, CheckCircle2, XCircle } from 'lucide-react-native';

export default function OverviewScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentSwitch[]>([]);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const overview = await api.getDashboardOverview();
      setStats(overview.stats);
      setRecent(overview.recent);
      setActivity(overview.activity);
    } catch (e) {
      console.error('Failed to load overview', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* Header */}
        <YStack padding="$6" paddingTop={60} gap="$1">
          <Text fontSize={13} color="#64748b">
            Bienvenido de vuelta
          </Text>
          <Text fontSize={24} fontWeight="800" color="#f8fafc">
            {user?.display_name || user?.email || 'Usuario'}
          </Text>
        </YStack>

        {/* Stats Grid */}
        <XStack flexWrap="wrap" paddingHorizontal="$4" gap="$3">
          <StatCard
            icon={<FolderOpen size={18} color="#a78bfa" />}
            label="Proyectos"
            value={stats?.total_projects ?? 0}
            color="#7c3aed"
          />
          <StatCard
            icon={<Zap size={18} color="#fcd34d" />}
            label="Switches Hoy"
            value={stats?.switches_today ?? 0}
            color="#f59e0b"
          />
          <StatCard
            icon={<Terminal size={18} color="#6ee7b7" />}
            label="Skills (7d)"
            value={stats?.skills_executed ?? 0}
            color="#10b981"
          />
          <StatCard
            icon={<Activity size={18} color="#93c5fd" />}
            label="Herramientas"
            value={stats?.tools_connected ?? 0}
            color="#3b82f6"
          />
        </XStack>

        {/* Recent Switches */}
        <YStack paddingHorizontal="$6" paddingTop="$8" gap="$4">
          <Text fontSize={16} fontWeight="700" color="#f8fafc">
            Switches Recientes
          </Text>

          {recent.length === 0 && !loading ? (
            <YStack alignItems="center" padding="$8" gap="$2">
              <Clock size={32} color="#3a3a4a" />
              <Text fontSize={14} color="#64748b">
                No hay switches recientes
              </Text>
            </YStack>
          ) : (
            recent.map((sw) => (
              <View key={sw.id} style={styles.switchCard}>
                <View style={styles.switchIcon}>
                  {sw.success ? (
                    <CheckCircle2 size={16} color="#10b981" />
                  ) : (
                    <XCircle size={16} color="#ef4444" />
                  )}
                </View>
                <YStack flex={1} gap="$1">
                  <XStack alignItems="center" gap="$2">
                    <Text fontSize={14} fontWeight="600" color="#f8fafc">
                      {sw.project_name}
                    </Text>
                    <View style={styles.envBadge}>
                      <Text fontSize={10} color="#94a3b8">
                        {sw.environment}
                      </Text>
                    </View>
                  </XStack>
                  <Text fontSize={12} color="#64748b" numberOfLines={1}>
                    {sw.message}
                  </Text>
                </YStack>
                <Text fontSize={11} color="#4a4a5a">
                  {formatTime(sw.created_at)}
                </Text>
              </View>
            ))
          )}
        </YStack>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '20' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <Text fontSize={24} fontWeight="800" color="#f8fafc">
        {value}
      </Text>
      <Text fontSize={11} color="#64748b">
        {label}
      </Text>
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
  statCard: {
    width: '47%',
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
  switchIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1a1a24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  envBadge: {
    backgroundColor: '#1e1e2a',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
