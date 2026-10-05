// Capa de bloqueo: cubre la app (sin desmontarla) hasta que el usuario pone la huella.
import { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fingerprint, ScanFace } from 'lucide-react-native';
import { useAuth } from '@/auth/provider';
import { Button, Glow } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

export function LockScreen() {
  const { user, unlock, logout, biometric } = useAuth();
  const insets = useSafeAreaInsets();
  const [failed, setFailed] = useState(false);
  const prompted = useRef(false);

  const tryUnlock = async () => {
    const ok = await unlock();
    setFailed(!ok);
  };

  // Abre el lector en cuanto aparece la pantalla
  useEffect(() => {
    if (prompted.current) return;
    prompted.current = true;
    const t = setTimeout(tryUnlock, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = (user?.display_name || user?.email || '').split(/[\s@]/)[0];
  const Icon = biometric.kind === 'rostro' ? ScanFace : Fingerprint;
  const label = biometric.kind === 'rostro' ? 'Desbloquear con rostro' : 'Desbloquear con huella';

  return (
    <View style={[StyleSheet.absoluteFill, styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + space.xl }]}>
      <Glow color="#7c3aed" size={560} opacity={0.32} style={styles.glowTop} />
      <Glow color="#d946ef" size={420} opacity={0.14} style={styles.glowBottom} />

      <YStack flex={1} alignItems="center" justifyContent="center" gap={space.md} paddingHorizontal={space.xl}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.logo} accessibilityLabel="Nexus" />
        <Text fontSize={15} color={colors.textMuted} marginTop={space.lg}>Hola de nuevo</Text>
        <Text fontSize={28} fontWeight="800" color={colors.text} letterSpacing={-0.6}>{firstName || 'Nexus'}</Text>
        <View style={styles.iconRing}>
          <Icon size={34} color={failed ? colors.warning : colors.primaryBright} />
        </View>
        <Text fontSize={14} color={failed ? colors.warning : colors.textMuted} textAlign="center">
          {failed ? 'No se pudo verificar. Intenta de nuevo.' : 'Nexus está bloqueada'}
        </Text>
      </YStack>

      <YStack gap={space.md} paddingHorizontal={space.xl}>
        <Button label={label} icon={<Icon size={18} color="#fff" />} onPress={tryUnlock} />
        <Button variant="ghost" label="Entrar con mi contraseña" onPress={logout} />
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.bg, zIndex: 100, elevation: 100 },
  glowTop: { position: 'absolute', top: -200, left: -160 },
  glowBottom: { position: 'absolute', bottom: -140, right: -170 },
  logo: { width: 96, height: 96 },
  iconRing: {
    marginTop: space.xxl,
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
});
