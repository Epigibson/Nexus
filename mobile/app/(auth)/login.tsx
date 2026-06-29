import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/provider';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Completa todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);

      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
        router.push({ pathname: '/(auth)/verify-2fa', params: { email } });
      } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
        router.push({ pathname: '/(auth)/verify-2fa', params: { email } });
      }
      // If DONE, the AuthGate will redirect to tabs
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Background glow */}
        <View style={styles.glow1} />
        <View style={styles.glow2} />

        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$6">
          {/* Logo */}
          <YStack alignItems="center" gap="$3">
            <View style={styles.logoContainer}>
              <Zap size={28} color="#7c3aed" />
            </View>
            <Text fontSize={28} fontWeight="800" color="#f8fafc" letterSpacing={-1}>
              Nexus
            </Text>
            <Text fontSize={14} color="#94a3b8" textAlign="center">
              Development Environment Control Center
            </Text>
          </YStack>

          {/* Form */}
          <YStack width="100%" maxWidth={360} gap="$4">
            {/* Email */}
            <YStack gap="$2">
              <Text fontSize={13} fontWeight="600" color="#94a3b8">
                Email
              </Text>
              <View style={styles.inputContainer}>
                <Mail size={18} color="#64748b" style={styles.inputIcon} />
                <input
                  style={styles.input as any}
                  placeholder="tu@email.com"
                  placeholderTextColor="#4a4a5a"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </YStack>

            {/* Password */}
            <YStack gap="$2">
              <Text fontSize={13} fontWeight="600" color="#94a3b8">
                Contraseña
              </Text>
              <View style={styles.inputContainer}>
                <Lock size={18} color="#64748b" style={styles.inputIcon} />
                <input
                  style={styles.input as any}
                  placeholder="••••••••"
                  placeholderTextColor="#4a4a5a"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                </Pressable>
              </View>
            </YStack>

            {/* Error */}
            {error ? (
              <Text fontSize={13} color="#ef4444" textAlign="center">
                {error}
              </Text>
            ) : null}

            {/* Button */}
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text fontSize={15} fontWeight="700" color="#ffffff">
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Text>
              {!loading && <ArrowRight size={18} color="#ffffff" />}
            </Pressable>

            {/* Register link */}
            <XStack justifyContent="center" gap="$2" marginTop="$2">
              <Text fontSize={14} color="#64748b">
                ¿No tienes cuenta?
              </Text>
              <Pressable onPress={() => router.push('/(auth)/register')}>
                <Text fontSize={14} fontWeight="600" color="#7c3aed">
                  Regístrate
                </Text>
              </Pressable>
            </XStack>
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
  glow1: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    transform: [{ translateX: -200 }],
  },
  glow2: {
    position: 'absolute',
    bottom: '20%',
    right: '20%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(217, 70, 239, 0.06)',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
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
    color: '#f8fafc',
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineStyle: 'none',
  } as any,
  eyeButton: {
    padding: 4,
  },
  button: {
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
