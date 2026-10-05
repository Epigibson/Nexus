import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { FolderKanban, Link2, AlignLeft, Hash } from 'lucide-react-native';
import { api } from '@/api/client';
import { Field, Button } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

const toSlug = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function CreateProjectModal() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finalSlug = slugEdited ? slug : toSlug(name);

  const create = async () => {
    if (name.trim().length < 2) return setError('El nombre necesita al menos 2 caracteres.');
    if (finalSlug.length < 2) return setError('El identificador necesita al menos 2 caracteres.');
    setLoading(true);
    setError('');
    try {
      await api.createProject({
        name: name.trim(),
        slug: finalSlug,
        description: description.trim() || undefined,
        repo_url: repoUrl.trim() || undefined,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'No se pudo crear el proyecto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <YStack gap={space.xl}>
        <Field label="Nombre" icon={<FolderKanban size={18} color={colors.textMuted} />}
          placeholder="Mi SaaS" value={name} onChangeText={setName} autoFocus />
        <Field label="Identificador" icon={<Hash size={18} color={colors.textMuted} />}
          placeholder="mi-saas" value={finalSlug} autoCapitalize="none" autoCorrect={false}
          onChangeText={(t) => { setSlugEdited(true); setSlug(toSlug(t)); }}
          hint="Lo usas en el CLI: nexus switch mi-saas" />
        <Field label="Descripción (opcional)" icon={<AlignLeft size={18} color={colors.textMuted} />}
          placeholder="Para qué es este proyecto" value={description} onChangeText={setDescription} />
        <Field label="Repositorio (opcional)" icon={<Link2 size={18} color={colors.textMuted} />}
          placeholder="https://github.com/…" value={repoUrl} onChangeText={setRepoUrl}
          autoCapitalize="none" autoCorrect={false} keyboardType="url" />

        {error ? <Text fontSize={13} color={colors.danger} textAlign="center">{error}</Text> : null}

        <Button label="Crear proyecto" onPress={create} loading={loading} />
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingBottom: space.xxl * 2 },
});
