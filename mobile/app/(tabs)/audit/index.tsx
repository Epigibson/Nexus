import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useEffect, useCallback } from 'react';
import { api, type AuditEntry } from '@/api/client';
import {
  CheckCircle2, XCircle, ChevronRight, ChevronDown, SkipForward,
  Zap, GitBranch, Terminal, Key, FileText, AlertTriangle, Clock, Search,
} from 'lucide-react-native';

type SkillStatus = 'success' | 'warning' | 'error';

const actionConfig: Record<string, { label: string; color: string; icon: any }> = {
  context_switch: { label: 'Context Switch', color: '#7c3aed', icon: Zap },
  env_inject: { label: 'Env Inject', color: '#10b981', icon: Key },
  git_switch: { label: 'Git Switch', color: '#3b82f6', icon: GitBranch },
  cli_switch: { label: 'CLI Switch', color: '#f59e0b', icon: Terminal },
  project_init: { label: 'Init', color: '#64748b', icon: FileText },
  error: { label: 'Error', color: '#ef4444', icon: AlertTriangle },
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
  id: string;
  entry: AuditEntry;
  children: AuditEntry[];
  totalDuration: number;
  successCount: number;
  warningCount: number;
  errorCount: number;
}

function groupBySwitches(entries: AuditEntry[]): SwitchGroup[] {
  const switches = entries.filter((e) => e.action === 'context_switch');
  const others = entries.filter((e) => e.action !== 'context_switch');

  return switches.map((sw) => {
    const swTime = new Date(sw.created_at).getTime();
    const children = others.filter((e) => {
      const eTime = new Date(e.created_at).getTime();
      return Math.abs(eTime - swTime) < 15000 && e.project_name === sw.project_name;
    });
    const totalDuration = children.reduce((sum, c) => sum + (c.duration_ms || 0), 0);

    let successCount = 0, warningCount = 0, errorCount = 0;
    for (const c of children) {
      const s = getSkillStatus(c);
      if (s === 'success') successCount++;
      else if (s === 'warning') warningCount++;
      else errorCount++;
    }

    return { id: sw.id, entry: sw, children, totalDuration, successCount, warningCount, errorCount };
  });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusIcon({ status, size = 16 }: { status: SkillStatus; size?: number }) {
  if (status === 'success') return <CheckCircle2 size={size} color="#10b981" />;
  if (status === 'warning') return <SkipForward size={size} color="#f59e0b" />;
  return <XCircle size={size} color="#ef4444" />;
}

function ExpandableRow({ group }: { group: SwitchGroup }) {
  const [expanded, setExpanded] = useState(false);
  const { entry, children, totalDuration, successCount, warningCount, errorCount } = group;
  const config = actionConfig[entry.action] || actionConfig.error;
  const Icon = config.icon;

  return (
    <View style={styles.groupCard}>
      <Pressable style={styles.groupHeader} onPress={() => setExpanded(!expanded)}>
        <View style={styles.expandIcon}>
          {expanded ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#3a3a4a" />}
        </View>

        <StatusIcon status={errorCount > 0 ? 'error' : 'success'} />

        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2">
            <Text fontSize={14} fontWeight="600" color="#f8fafc">{entry.project_name}</Text>
            <View style={[styles.envBadge, { borderColor: '#2a2a3a' }]}>
              <Text fontSize={10} color="#94a3b8">{entry.environment}</Text>
            </View>
          </XStack>
          <XStack alignItems="center" gap="$1">
            <Clock size={10} color="#4a4a5a" />
            <Text fontSize={11} color="#4a4a5a">{formatTimestamp(entry.created_at)}</Text>
          </XStack>
        </YStack>

        <XStack alignItems="center" gap="$2">
          {successCount > 0 && (
            <XStack alignItems="center" gap="$1">
              <CheckCircle2 size={12} color="#10b981" />
              <Text fontSize={11} color="#10b981">{successCount}</Text>
            </XStack>
          )}
          {warningCount > 0 && (
            <XStack alignItems="center" gap="$1">
              <SkipForward size={12} color="#f59e0b" />
              <Text fontSize={11} color="#f59e0b">{warningCount}</Text>
            </XStack>
          )}
          {errorCount > 0 && (
            <XStack alignItems="center" gap="$1">
              <XCircle size={12} color="#ef4444" />
              <Text fontSize={11} color="#ef4444">{errorCount}</Text>
            </XStack>
          )}
          <Text fontSize={11} color="#4a4a5a">
            {formatDuration(totalDuration > 0 ? totalDuration : entry.duration_ms ?? 0)}
          </Text>
        </XStack>
      </Pressable>

      {expanded && children.length > 0 && (
        <View style={styles.childrenContainer}>
          {children.map((child) => {
            const childStatus = getSkillStatus(child);
            const childConfig = actionConfig[child.action] || actionConfig.error;
            return (
              <View key={child.id} style={styles.childRow}>
                <StatusIcon status={childStatus} size={14} />
                <View style={[styles.childBadge, { borderColor: childConfig.color + '30' }]}>
                  <Text fontSize={10} color={childConfig.color}>{child.skill_name || childConfig.label}</Text>
                </View>
                <Text flex={1} fontSize={11} color="#64748b" numberOfLines={1}>{child.message}</Text>
                <Text fontSize={10} color="#3a3a4a">{formatDuration(child.duration_ms ?? 0)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function AuditScreen() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await api.listAudit({ limit: 200 });
      setEntries(data);
    } catch (e) {
      console.error('Failed to load audit', e);
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

  const groups = groupBySwitches(entries);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* Header */}
        <YStack padding="$6" paddingTop={60} gap="$1">
          <Text fontSize={24} fontWeight="800" color="#f8fafc">
            Audit Log
          </Text>
          <Text fontSize={14} color="#64748b">
            {groups.length} switch{groups.length !== 1 && 'es'}
          </Text>
        </YStack>

        {/* Legend */}
        <XStack paddingHorizontal="$6" gap="$4" marginBottom="$2">
          <XStack alignItems="center" gap="$1">
            <CheckCircle2 size={12} color="#10b981" />
            <Text fontSize={10} color="#64748b">OK</Text>
          </XStack>
          <XStack alignItems="center" gap="$1">
            <SkipForward size={12} color="#f59e0b" />
            <Text fontSize={10} color="#64748b">Skipped</Text>
          </XStack>
          <XStack alignItems="center" gap="$1">
            <XCircle size={12} color="#ef4444" />
            <Text fontSize={10} color="#64748b">Error</Text>
          </XStack>
        </XStack>

        {/* Groups */}
        <YStack paddingHorizontal="$4" gap="$2">
          {groups.length === 0 && !loading ? (
            <YStack alignItems="center" padding="$12" gap="$2">
              <Clock size={32} color="#3a3a4a" />
              <Text fontSize={14} color="#64748b">No hay registros de auditoría</Text>
            </YStack>
          ) : (
            groups.map((group) => (
              <ExpandableRow key={group.id} group={group} />
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
  groupCard: {
    backgroundColor: '#111118',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e2a',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  expandIcon: {
    width: 20,
    alignItems: 'center',
  },
  envBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  childrenContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a24',
    padding: 10,
    gap: 6,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#0e0e14',
    borderRadius: 8,
  },
  childBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
});
