import { View, Pressable, TextInput, StyleSheet } from 'react-native';
import { useDialog } from '@/components/Dialog';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { KeyRound, Plus, Copy, Check, Trash2, TriangleAlert } from 'lucide-react-native';
import { api, type ApiKeyResponse } from '@/api/client';
import {
  Screen, ScreenHeader, Section, Card, IconTile, ListGroup, RowDivider,
  LoadingState, EmptyState, ErrorBanner, Button,
} from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';
import { timeAgo } from '@/lib/format';

export default function ApiKeysScreen() {
  const [keys, setKeys] = useState<ApiKeyResponse[] | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialog = useDialog();

  const loadKeys = useCallback(async () => {
    try {
      setKeys(await api.listApiKeys());
      setError('');
    } catch {
      setKeys([]);
      setError('No pudimos cargar tus API keys.');
    }
  }, []);

  useFocusEffect(useCallback(() => { loadKeys(); }, [loadKeys]));

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateApiKey(name.trim() || 'Móvil');
      setNewKey(result.full_key);
      setName('');
      setCopied(false);
      await loadKeys();
    } catch (e: any) {
      dialog.notify({ title: 'No se pudo generar la key', message: e?.message || 'Intenta de nuevo.' });
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!newKey) return;
    await Clipboard.setStringAsync(newKey);
    setCopied(true);
  };

  const revoke = async (key: ApiKeyResponse) => {
    const ok = await dialog.confirm({
      title: `Revocar "${key.name}"`,
      message: 'Los CLI que usen esta key dejarán de tener acceso. Esta acción no se puede deshacer.',
      confirmLabel: 'Revocar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.revokeApiKey(key.id);
      await loadKeys();
    } catch (e: any) {
      dialog.notify({ title: 'No se pudo revocar', message: e?.message || 'Intenta de nuevo.' });
    }
  };

  const active = (keys ?? []).filter((k) => k.is_active);

  return (
    <Screen>
      <ScreenHeader back title="API Keys" subtitle="Conectan el CLI (nexus login) con tu cuenta" />

      {error ? <ErrorBanner message={error} onRetry={loadKeys} /> : null}

      {newKey ? (
        <Section>
          <Card style={styles.newKey}>
            <XStack alignItems="center" gap={space.sm}>
              <TriangleAlert size={16} color={colors.warning} />
              <Text flex={1} fontSize={14} fontWeight="700" color={colors.text}>Cópiala ahora: no la volverás a ver</Text>
            </XStack>
            <Pressable onPress={copy} style={({ pressed }) => [styles.keyBox, pressed && { opacity: 0.8 }]}>
              <Text flex={1} fontSize={13} color={colors.text} fontFamily="monospace" numberOfLines={2}>{newKey}</Text>
              {copied ? <Check size={18} color={colors.success} /> : <Copy size={18} color={colors.textMuted} />}
            </Pressable>
            <Button
              label={copied ? 'Copiada' : 'Copiar key'}
              variant={copied ? 'secondary' : 'primary'}
              icon={copied ? <Check size={18} color={colors.success} /> : <Copy size={18} color="#fff" />}
              onPress={copy}
            />
            <Text fontSize={13} color={colors.textMuted} lineHeight={19}>
              En tu terminal corre <Text fontFamily="monospace" color={colors.textSecondary}>nexus login</Text> y pégala.
            </Text>
            <Button variant="ghost" compact label="Listo" onPress={() => setNewKey(null)} />
          </Card>
        </Section>
      ) : (
        <Section title="Nueva key">
          <Card>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nombre (p. ej. Laptop trabajo)"
              placeholderTextColor={colors.textFaint}
              maxLength={60}
              style={styles.input}
            />
            <Button style={{ marginTop: space.md }} label="Generar key" icon={<Plus size={18} color="#fff" />}
              onPress={generate} loading={generating} />
          </Card>
        </Section>
      )}

      <Section title={`Activas${keys ? ` · ${active.length}` : ''}`}>
        {keys === null ? (
          <LoadingState />
        ) : active.length === 0 ? (
          <EmptyState icon={<KeyRound size={28} color={colors.textMuted} />} title="Sin keys activas"
            message="Genera una para conectar el CLI desde tu computadora." />
        ) : (
          <ListGroup>
            {active.map((k, i) => (
              <View key={k.id}>
                {i > 0 ? <RowDivider /> : null}
                <XStack alignItems="center" gap={space.md} paddingHorizontal={space.lg} paddingVertical={13}>
                  <IconTile size={34}><KeyRound size={16} color={colors.primaryBright} /></IconTile>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={15} fontWeight="600" color={colors.text} numberOfLines={1}>{k.name}</Text>
                    <Text fontSize={12} color={colors.textMuted} numberOfLines={1}>
                      <Text fontFamily="monospace" fontSize={12} color={colors.textMuted}>{k.key_prefix.replace(/\.+$/, "")}…</Text>
                      {'  ·  '}{k.last_used_at ? `usada ${timeAgo(k.last_used_at)}` : 'sin usar'}
                    </Text>
                  </YStack>
                  <Pressable onPress={() => revoke(k)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Revocar ${k.name}`}
                    style={({ pressed }) => [styles.revoke, pressed && { backgroundColor: colors.dangerSoft }]}>
                    <Trash2 size={17} color={colors.danger} />
                  </Pressable>
                </XStack>
              </View>
            ))}
          </ListGroup>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  newKey: { gap: space.md, borderColor: 'rgba(245, 158, 11, 0.35)' },
  keyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  input: {
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  revoke: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
