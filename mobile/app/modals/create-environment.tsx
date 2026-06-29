import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/client';
import { GitBranch, Tag, ArrowRight } from 'lucide-react-native';

const ENV_PRESETS = [
  { value: 'development', label: 'Development', color: '#10b981' },
  { value: 'staging', label: 'Staging', color: '#f59e0b' },
  { value: 'production', label: 'Production', color: '#ef4444' },
];

export default function CreateEnvironmentModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectSlug?: string }>();
  const projectSlug = params.projectSlug || '';

  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState('development');
  const [gitBranch, setGitBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name) {
      setError('El nombre es requerido');
      return;
    }

    if (!projectSlug) {
      setError('No se especificó el proyecto');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.createEnvironment(projectSlug, {
        name,
        environment,
        git_branch: gitBranch || undefined,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Error al crear entorno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <YStack padding="$6" gap="$5">
        {/* Environment Type */}
        <YStack gap="$2">
          <Text fontSize={13} fontWeight="600" color="#94a3b8">Tipo de Entorno</Text>
          <XStack gap="$2">
            {ENV_PRESETS.map((preset) => (
              <Pressable
                key={preset.value}
                style={[
                  styles.presetButton,
                  environment === preset.value && { borderColor: preset.color, backgroundColor: preset.color + '15' },
                ]}
                onPress={() => setEnvironment(preset.value)}
              >
                <Text
                  fontSize={12}
                  fontWeight="600"
                  color={environment === preset.value ? preset.color : '#64748b'}
                >
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {/* Name */}
        <YStack gap="$2">
          <Text fontSize={13} fontWeight="600" color="#94a3b8">Nombre del Entorno</Text>
          <View style={styles.inputContainer}>
            <Tag size={18} color="#64748b" style={styles.inputIcon} />
            <input
              style={styles.input as any}
              placeholder="mi-entorno"
              placeholderTextColor="#4a4a5a"
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
            />
          </View>
        </YStack>

        {/* Git Branch */}
        <YStack gap="$2">
          <Text fontSize={13} fontWeight="600" color="#94a3b8">Git Branch (opcional)</Text>
          <View style={styles.inputContainer}>
            <GitBranch size={18} color="#64748b" style={styles.inputIcon} />
            <input
              style={styles.input as any}
              placeholder="main"
              placeholderTextColor="#4a4a5a"
              value={gitBranch}
              onChangeText={setGitBranch}
              autoCapitalize="none"
            />
          </View>
        </YStack>

        {/* Error */}
        {error ? (
          <Text fontSize={13} color="#ef4444" textAlign="center">{error}</Text>
        ) : null}

        {/* Buttons */}
        <XStack gap="$3">
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text fontSize={14} fontWeight="600" color="#64748b">Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text fontSize={14} fontWeight="700" color="#ffffff">
              {loading ? 'Creando...' : 'Crear Entorno'}
            </Text>
            {!loading && <ArrowRight size={16} color="#ffffff" />}
          </Pressable>
        </XStack>
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  presetButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#f8fafc',
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineStyle: 'none',
  } as any,
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1e1e2a',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  createButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
