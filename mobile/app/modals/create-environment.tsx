import { useState } from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GitBranch, Tag } from 'lucide-react-native';
import { api } from '@/api/client';
import { Field, Button } from '@/components/ui';
import { colors, radius, space, envColor } from '@/theme/tokens';

const PRESETS = [
  { value: 'development', label: 'Development', branch: 'develop' },
  { value: 'staging', label: 'Staging', branch: 'staging' },
  { value: 'production', label: 'Production', branch: 'main' },
];

export default function CreateEnvironmentModal() {
  const router = useRouter();
  const { projectSlug = '' } = useLocalSearchParams<{ projectSlug?: string }>();
  const [environment, setEnvironment] = useState('development');
  const [name, setName] = useState('');
  const [gitBranch, setGitBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const preset = PRESETS.find((p) => p.value === environment)!;

  const create = async () => {
    if (!projectSlug) return setError('No se especificó el proyecto.');
    setLoading(true);
    setError('');
    try {
      await api.createEnvironment(projectSlug, {
        name: name.trim() || environment,
        environment,
        git_branch: gitBranch.trim() || undefined,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'No se pudo crear el entorno.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <YStack gap={space.xl}>
        <YStack gap={space.sm}>
          <Text fontSize={13} fontWeight="600" color={colors.textSecondary}>Tipo</Text>
          <XStack gap={space.sm}>
            {PRESETS.map((p) => {
              const selected = environment === p.value;
              const c = envColor(p.value);
              return (
                <Pressable
                  key={p.value}
                  onPress={() => setEnvironment(p.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.preset, selected && { borderColor: c, backgroundColor: c + '1a' }]}
                >
                  <Text fontSize={13} fontWeight="700" color={selected ? c : colors.textMuted}>{p.label}</Text>
                </Pressable>
              );
            })}
          </XStack>
        </YStack>

        <Field label="Nombre" icon={<Tag size={18} color={colors.textMuted} />}
          placeholder={environment} value={name} onChangeText={setName}
          autoCapitalize="none" autoCorrect={false} hint={`Si lo dejas vacío se llamará "${environment}".`} />
        <Field label="Rama de Git (opcional)" icon={<GitBranch size={18} color={colors.textMuted} />}
          placeholder={preset.branch} value={gitBranch} onChangeText={setGitBranch}
          autoCapitalize="none" autoCorrect={false} hint="El CLI hará checkout de esta rama al cambiar a este entorno." />

        {error ? <Text fontSize={13} color={colors.danger} textAlign="center">{error}</Text> : null}

        <Button label="Crear entorno" onPress={create} loading={loading} />
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingBottom: space.xxl * 2 },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
});
