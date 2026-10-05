import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, TextInput } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/provider';
import { Glow, GradientFill } from '@/components/ui';
import { gradients } from '@/theme/tokens';
import { KeyRound, Mail, Lock, ArrowLeft, ArrowRight } from 'lucide-react-native';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ForgotPasswordScreen() {
  const { forgotPassword, resetPassword } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (step === 'email') {
      if (!email) return setError('Escribe tu correo');
    } else {
      if (code.length !== 6) return setError('El código tiene 6 dígitos');
      if (!PASSWORD_RULE.test(password)) return setError('Mínimo 8 caracteres, con mayúscula, minúscula y número');
    }

    setLoading(true);
    try {
      if (step === 'email') {
        await forgotPassword(email);
        setInfo(`Si ${email} tiene cuenta, le enviamos un código`);
        setStep('reset');
      } else {
        await resetPassword(email, code, password);
        router.replace('/(auth)/login');
      }
    } catch (err: any) {
      setError(err.message || 'Algo salió mal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Glow color="#7c3aed" size={520} opacity={0.32} style={{ position: 'absolute', top: -160, left: -140 }} />
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#94a3b8" />
          <Text fontSize={14} color="#94a3b8">Volver</Text>
        </Pressable>

        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$6">
          <View style={styles.iconContainer}>
            <KeyRound size={32} color="#7c3aed" />
          </View>

          <YStack alignItems="center" gap="$2">
            <Text fontSize={24} fontWeight="800" color="#f8fafc">
              {step === 'email' ? 'Recupera tu contraseña' : 'Contraseña nueva'}
            </Text>
            <Text fontSize={14} color="#94a3b8" textAlign="center" maxWidth={300}>
              {step === 'email' ? 'Te enviaremos un código a tu correo' : info}
            </Text>
          </YStack>

          <YStack width="100%" maxWidth={360} gap="$4">
            {step === 'email' ? (
              <View style={styles.inputContainer}>
                <Mail size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input as any}
                  placeholder="tu@email.com"
                  placeholderTextColor="#4a4a5a"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                />
              </View>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <KeyRound size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input as any}
                    placeholder="Código de 6 dígitos"
                    placeholderTextColor="#4a4a5a"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Lock size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input as any}
                    placeholder="Contraseña nueva"
                    placeholderTextColor="#4a4a5a"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="new-password"
                  />
                </View>
              </>
            )}

            {error ? (
              <Text fontSize={13} color="#ef4444" textAlign="center">{error}</Text>
            ) : null}

            <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
              <GradientFill from={gradients.brand[0]} to={gradients.brand[1]} />
              <GradientFill from={gradients.brand[0]} to={gradients.brand[1]} />
              <Text fontSize={15} fontWeight="700" color="#ffffff">
                {loading ? 'Procesando...' : step === 'email' ? 'Enviar código' : 'Guardar contraseña'}
              </Text>
              {!loading && <ArrowRight size={18} color="#ffffff" />}
            </Pressable>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scroll: {
    flexGrow: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 1,
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
    fontFamily: 'Inter_500Medium',
    color: '#f8fafc',
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineStyle: 'none',
  } as any,
  button: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    height: 48,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
