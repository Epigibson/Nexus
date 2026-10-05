import { TextInput, StyleSheet } from 'react-native';
import { useDialog } from '@/components/Dialog';
import { Text, YStack } from 'tamagui';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/provider';
import { api } from '@/api/client';
import { Screen, ScreenHeader, Section, Card, Button } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

export default function ProfileScreen() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const dialog = useDialog();
  const [name, setName] = useState(user?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const changed = trimmed !== (user?.display_name ?? '') && trimmed.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ display_name: trimmed });
      await refreshProfile();
      router.back();
    } catch (e: any) {
      dialog.notify({ title: 'No se pudo guardar', message: e?.message || 'Intenta de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader back title="Perfil" subtitle="Así te ven los miembros de tu equipo" />
      <Section>
        <Card>
          <YStack gap={space.sm}>
            <Text fontSize={13} fontWeight="600" color={colors.textSecondary}>Nombre visible</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textFaint}
              maxLength={100}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => changed && save()}
              style={styles.input}
            />
          </YStack>
          <YStack gap={space.sm} marginTop={space.lg}>
            <Text fontSize={13} fontWeight="600" color={colors.textSecondary}>Correo</Text>
            <Text fontSize={15} color={colors.textMuted}>{user?.email}</Text>
          </YStack>
        </Card>
        <Button label="Guardar cambios" onPress={save} loading={saving} disabled={!changed} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
});
