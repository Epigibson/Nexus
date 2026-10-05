import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/provider';
import { Glow } from '@/components/ui';
import { OTPInput } from '@/components/ui/OTPInput';
import { Mail, ArrowLeft } from 'lucide-react-native';

export default function VerifyEmailScreen() {
  const { confirmRegistration, resendVerification } = useAuth();
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleComplete = async (otpCode: string) => {
    setLoading(true);
    setError('');
    try {
      await confirmRegistration(email, otpCode);
      // AuthGate redirige a tabs
    } catch (err: any) {
      setError(err.message || 'Código inválido. Intenta de nuevo.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await resendVerification(email);
      setInfo('Te enviamos un código nuevo');
    } catch (err: any) {
      setError(err.message || 'No se pudo reenviar el código');
    }
  };

  return (
    <View style={styles.container}>
      <Glow color="#7c3aed" size={520} opacity={0.32} style={{ position: 'absolute', top: -160, left: -140 }} />

      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$6">
        <Pressable style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
          <ArrowLeft size={20} color="#94a3b8" />
          <Text fontSize={14} color="#94a3b8">Volver</Text>
        </Pressable>

        <View style={styles.iconContainer}>
          <Mail size={32} color="#7c3aed" />
        </View>

        <YStack alignItems="center" gap="$2">
          <Text fontSize={24} fontWeight="800" color="#f8fafc">
            Verifica tu correo
          </Text>
          <Text fontSize={14} color="#94a3b8" textAlign="center" maxWidth={300}>
            Ingresa el código de 6 dígitos que enviamos a {email}
          </Text>
        </YStack>

        <YStack alignItems="center" gap="$6">
          <OTPInput length={6} onComplete={handleComplete} value={code} onChange={setCode} autoFocus />
          {error ? (
            <Text fontSize={13} color="#ef4444" textAlign="center" maxWidth={280}>{error}</Text>
          ) : info ? (
            <Text fontSize={13} color="#10b981" textAlign="center" maxWidth={280}>{info}</Text>
          ) : null}
          {loading ? <Text fontSize={13} color="#94a3b8">Verificando...</Text> : null}
        </YStack>

        <Pressable onPress={handleResend}>
          <Text fontSize={13} fontWeight="600" color="#7c3aed">Reenviar código</Text>
        </Pressable>
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  glow1: {
    position: 'absolute',
    top: '25%',
    left: '50%',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    transform: [{ translateX: -175 }],
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
});
