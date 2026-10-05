import { View, Pressable, Alert, Linking, StyleSheet } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useEffect } from 'react';
import * as Clipboard from 'expo-clipboard';
import { ShieldCheck, ShieldOff, Smartphone, Copy, Check } from 'lucide-react-native';
import { useAuth } from '@/auth/provider';
import { OTPInput } from '@/components/ui/OTPInput';
import { Screen, ScreenHeader, Section, Card, IconTile, Button, LoadingState } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type Step = 'idle' | 'setup';

export default function SecurityScreen() {
  const { getMfaStatus, setupTotp, verifyTotp, disableMfa } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMfaStatus().then((s) => setEnabled(s.enabled));
  }, [getMfaStatus]);

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await setupTotp();
      setSecret(r.secretKey);
      setUri(r.qrCodeUri);
      setCode('');
      setStep('setup');
    } catch (e: any) {
      Alert.alert('No se pudo iniciar', e?.message || 'Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const openAuthenticator = async () => {
    try {
      await Linking.openURL(uri);
    } catch {
      Alert.alert(
        'No encontramos una app autenticadora',
        'Instala Google Authenticator, Microsoft Authenticator o similar, o copia la clave manualmente.',
      );
    }
  };

  const copySecret = async () => {
    await Clipboard.setStringAsync(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirm = async (value: string) => {
    setBusy(true);
    setError('');
    try {
      await verifyTotp(value);
      setEnabled(true);
      setStep('idle');
      setSecret('');
      setUri('');
    } catch (e: any) {
      setError(e?.message || 'Código incorrecto');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const disable = () => {
    Alert.alert(
      'Desactivar verificación en dos pasos',
      'Tu cuenta quedará protegida solo con tu contraseña.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await disableMfa();
              setEnabled(false);
            } catch (e: any) {
              Alert.alert('No se pudo desactivar', e?.message || 'Intenta de nuevo.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader back title="Seguridad" subtitle="Verificación en dos pasos (2FA)" />

      {enabled === null ? (
        <LoadingState />
      ) : step === 'setup' ? (
        <Section>
          <Card>
            <StepTitle n={1} title="Agrega Nexus a tu app autenticadora" />
            <Text fontSize={14} color={colors.textMuted} lineHeight={20} marginTop={space.sm}>
              Ábrela directamente desde aquí, o copia la clave y pégala en la app.
            </Text>
            <Button style={{ marginTop: space.lg }} label="Abrir app autenticadora"
              icon={<Smartphone size={18} color="#fff" />} onPress={openAuthenticator} />
            <Pressable onPress={copySecret} style={({ pressed }) => [styles.secret, pressed && { opacity: 0.8 }]}>
              <Text flex={1} fontSize={14} color={colors.text} fontFamily="monospace" letterSpacing={1}>
                {secret.match(/.{1,4}/g)?.join(' ')}
              </Text>
              {copied ? <Check size={18} color={colors.success} /> : <Copy size={18} color={colors.textMuted} />}
            </Pressable>
          </Card>

          <Card>
            <StepTitle n={2} title="Escribe el código de 6 dígitos" />
            <View style={{ marginTop: space.lg, alignItems: 'center' }}>
              <OTPInput length={6} value={code} onChange={setCode} onComplete={confirm} autoFocus={false} />
            </View>
            {error ? <Text fontSize={13} color={colors.danger} textAlign="center" marginTop={space.md}>{error}</Text> : null}
            {busy ? <Text fontSize={13} color={colors.textMuted} textAlign="center" marginTop={space.md}>Verificando…</Text> : null}
          </Card>

          <Button variant="secondary" label="Cancelar" onPress={() => setStep('idle')} />
        </Section>
      ) : (
        <Section>
          <Card>
            <XStack alignItems="center" gap={space.lg}>
              <IconTile size={52} color={enabled ? colors.successSoft : colors.warningSoft}>
                {enabled ? <ShieldCheck size={26} color={colors.success} /> : <ShieldOff size={26} color={colors.warning} />}
              </IconTile>
              <YStack flex={1} gap={4}>
                <Text fontSize={17} fontWeight="700" color={colors.text}>{enabled ? 'Activada' : 'Desactivada'}</Text>
                <Text fontSize={13} color={colors.textMuted} lineHeight={18}>
                  {enabled
                    ? 'Al iniciar sesión te pediremos un código de tu app autenticadora.'
                    : 'Agrega una capa extra: además de tu contraseña, un código que cambia cada 30 s.'}
                </Text>
              </YStack>
            </XStack>
          </Card>
          {enabled ? (
            <Button variant="danger" label="Desactivar 2FA" onPress={disable} loading={busy} />
          ) : (
            <Button label="Activar 2FA" icon={<ShieldCheck size={18} color="#fff" />} onPress={start} loading={busy} />
          )}
        </Section>
      )}
    </Screen>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <XStack alignItems="center" gap={space.md}>
      <View style={styles.stepNumber}>
        <Text fontSize={13} fontWeight="800" color={colors.primaryBright}>{n}</Text>
      </View>
      <Text flex={1} fontSize={16} fontWeight="700" color={colors.text}>{title}</Text>
    </XStack>
  );
}

const styles = StyleSheet.create({
  secret: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
