import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth/provider';
import { OTPInput } from '@/components/ui/OTPInput';
import { ShieldCheck, Zap, ArrowLeft } from 'lucide-react-native';

export default function Verify2FAScreen() {
  const { confirmMfa } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleComplete = async (otpCode: string) => {
    setLoading(true);
    setError('');

    try {
      await confirmMfa(otpCode);
      // AuthGate will redirect to tabs
    } catch (err: any) {
      setError(err.message || 'Código inválido. Intenta de nuevo.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$6">
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#94a3b8" />
          <Text fontSize={14} color="#94a3b8">Volver</Text>
        </Pressable>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <ShieldCheck size={32} color="#7c3aed" />
        </View>

        {/* Title */}
        <YStack alignItems="center" gap="$2">
          <Text fontSize={24} fontWeight="800" color="#f8fafc">
            Verificación 2FA
          </Text>
          <Text fontSize={14} color="#94a3b8" textAlign="center" maxWidth={300}>
            Ingresa el código de 6 dígitos de tu app autenticadora
          </Text>
        </YStack>

        {/* OTP Input */}
        <YStack alignItems="center" gap="$6">
          <OTPInput
            length={6}
            onComplete={handleComplete}
            value={code}
            onChange={setCode}
            autoFocus
          />

          {/* Error */}
          {error ? (
            <Text fontSize={13} color="#ef4444" textAlign="center" maxWidth={280}>
              {error}
            </Text>
          ) : null}

          {/* Loading */}
          {loading ? (
            <Text fontSize={13} color="#94a3b8">
              Verificando...
            </Text>
          ) : null}
        </YStack>

        {/* Resend */}
        <YStack alignItems="center" gap="$2" marginTop="$4">
          <Text fontSize={13} color="#64748b">
            ¿No tienes acceso a tu autenticador?
          </Text>
          <Pressable disabled={countdown > 0}>
            <Text fontSize={13} fontWeight="600" color={countdown > 0 ? '#4a4a5a' : '#7c3aed'}>
              {countdown > 0 ? `Reenviar código en ${countdown}s` : 'Usar código de respaldo'}
            </Text>
          </Pressable>
        </YStack>
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
  glow2: {
    position: 'absolute',
    bottom: '30%',
    right: '15%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(217, 70, 239, 0.06)',
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
