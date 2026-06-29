import { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { api } from '@/api/client';
import { FolderOpen, Globe, FileText, ArrowRight } from 'lucide-react-native';

export default function CreateProjectModal() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleCreate = async () => {
    if (!name) {
      setError('El nombre es requerido');
      return;
    }

    const finalSlug = slug || generateSlug(name);
    if (!finalSlug) {
      setError('El slug es requerido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.createProject({
        name,
        slug: finalSlug,
        description: description || undefined,
        repo_url: repoUrl || undefined,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Error al crear proyecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <YStack padding="$6" gap="$5">
        {/* Name */}
        <YStack gap="$2">
          <Text fontSize={13} fontWeight="600" color="#94a3b8">Nombre del Proyecto</Text>
          <View style={styles.inputContainer}>
            <FolderOpen size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input as any}
              placeholder="Mi Proyecto"
              placeholderTextColor="#4a4a5a"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (!slug) setSlug(generateSlug(text));
              }}
            />
          </View>
        </YStack>

        {/* Slug */}
        <YStack gap="$2">
          <Text fontSize={13} fontWeight="600" color="#94a3b8">Slug (identificador)</Text>
          <View style={styles.inputContainer}>
            <Text fontSize={14} color="#64748b" style={styles.inputIcon}>/</Text>
            <TextInput
              style={styles.input as any}
              placeholder="mi-proyecto"
              placeholderTextColor="#4a4a5a"
              value={slug}
              onChangeText={setSlug}
              autoCapitalize="none"
            />
          </View>
        </YStack>

        {/* Description */}
        <YStack gap="$2">
          <Text fontSize={13} fontWeight="600" color="#94a3b8">Descripción (opcional)</Text>
          <View style={styles.inputContainer}>
            <FileText size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input as any}
              placeholder="Descripción breve..."
              placeholderTextColor="#4a4a5a"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </YStack>

        {/* Repo URL */}
        <YStack gap="$2">
          <Text fontSize={13} fontWeight="600" color="#94a3b8">Repository URL (opcional)</Text>
          <View style={styles.inputContainer}>
            <Globe size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input as any}
              placeholder="https://github.com/..."
              placeholderTextColor="#4a4a5a"
              value={repoUrl}
              onChangeText={setRepoUrl}
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
              {loading ? 'Creando...' : 'Crear Proyecto'}
            </Text>
            {!loading && <ArrowRight size={16} color="#ffffff" />}
          </Pressable>
        </XStack>
      </YStack>
    </View>
  );
}

import { XStack } from 'tamagui';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
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
