import { View, Pressable, Linking, Switch, StyleSheet } from 'react-native';
import { useDialog } from '@/components/Dialog';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useEffect } from 'react';
import * as Clipboard from 'expo-clipboard';
import { ShieldCheck, ShieldOff, Smartphone, Copy, Check, Fingerprint } from 'lucide-react-native';
import { useAuth } from '@/auth/provider';
import { OTPInput } from '@/components/ui/OTPInput';
import { Screen, ScreenHeader, Section, Card, IconTile, Button, LoadingState } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type Step = 'idle' | 'setup';

export default function SecurityScreen() {
  const { getMfaStatus, setupTotp, verifyTotp, disableMfa, biometric, setBiometric } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const dialog = useDialog();

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
      dialog.notify({ title: 'No se pudo iniciar', message: e?.message || 'Intenta de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  const openAuthenticator = async () => {
    try {
      await Linking.openURL(uri);
    } catch {
      dialog.notify({
        title: 'No encontramos una app autenticadora',
        message: 'Instala Google Authenticator, Microsoft Authenticator o similar, o copia la clave manualmente.',
      });
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

  const disable = async () => {
    const ok = await dialog.confirm({
      title: 'Desactivar verificación en dos pasos',
      message: 'Tu cuenta quedará protegida solo con tu contraseña.',
      confirmLabel: 'Desactivar',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await disableMfa();
      setEnabled(false);
    } catch (e: any) {
      dialog.notify({ title: 'No se pudo desactivar', message: e?.message || 'Intenta de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader back title="Seguridad" subtitle="Cómo proteges tu cuenta y esta app" />

      <Section title="Este teléfono">
        <Card>
          <XStack alignItems="center" gap={space.lg}>
            <IconTile size={48} color={biometric.enabled ? colors.successSoft : colors.primarySoft}>
              <Fingerprint size={24} color={biometric.enabled ? colors.success : colors.primaryBright} />
            </IconTile>
            <YStack flex={1} gap={3}>
              <Text fontSize={16} fontWeight="700" color={colors.text}>
                Entrar con {biometric.kind === 'rostro' ? 'rostro' : 'huella'}
              </Text>
              <Text fontSize={13} color={colors.textMuted} lineHeight={18}>
                {biometric.available
                  ? 'Al abrir Nexus te pedimos tu huella en lugar de mostrar la app directo.'
                  : 'Registra una huella o rostro en los ajustes del teléfono para usar esta opción.'}
              </Text>
            </YStack>
            <Switch
              value={biometric.enabled}
              disabled={!biometric.available}
              onValueChange={async (v) => {
                const ok = await setBiometric(v);
                if (!ok && v) dialog.notify({ title: 'No se activó', message: 'No pudimos verificar tu huella.' });
              }}
              trackColor={{ false: colors.borderStrong, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </XStack>
        </Card>
      </Section>

      <Text fontSize={13} fontWeight="700" color={colors.textMuted} textTransform="uppercase" letterSpacing={0.8} paddingHorizontal={space.xl} marginBottom={space.md}>
        Verificación en dos pasos (2FA)
      </Text>

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
