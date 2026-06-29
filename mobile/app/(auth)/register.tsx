import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, TextInput } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/provider';
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react-native';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !displayName) {
      setError('Completa todos los campos');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(email, password, displayName);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4">
          <View style={styles.logoContainer}>
            <Zap size={28} color="#10b981" />
          </View>
          <Text fontSize={22} fontWeight="700" color="#f8fafc" textAlign="center">
            ¡Cuenta creada!
          </Text>
          <Text fontSize={14} color="#94a3b8" textAlign="center" maxWidth={280}>
            Revisa tu correo para verificar tu cuenta, luego inicia sesión.
          </Text>
          <Pressable style={styles.button} onPress={() => router.replace('/(auth)/login')}>
            <Text fontSize={15} fontWeight="700" color="#ffffff">
              Ir a Iniciar Sesión
            </Text>
          </Pressable>
        </YStack>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.glow1} />
        <View style={styles.glow2} />

        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$6">
          {/* Logo */}
          <YStack alignItems="center" gap="$3">
            <View style={styles.logoContainer}>
              <Zap size={28} color="#7c3aed" />
            </View>
            <Text fontSize={28} fontWeight="800" color="#f8fafc" letterSpacing={-1}>
              Crear Cuenta
            </Text>
            <Text fontSize={14} color="#94a3b8" textAlign="center">
              Únete a Nexus y simplifica tu workflow
            </Text>
          </YStack>

          {/* Form */}
          <YStack width="100%" maxWidth={360} gap="$4">
            {/* Display Name */}
            <YStack gap="$2">
              <Text fontSize={13} fontWeight="600" color="#94a3b8">
                Nombre
              </Text>
              <View style={styles.inputContainer}>
                <User size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input as any}
                  placeholder="Tu nombre"
                  placeholderTextColor="#4a4a5a"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
            </YStack>

            {/* Email */}
            <YStack gap="$2">
              <Text fontSize={13} fontWeight="600" color="#94a3b8">
                Email
              </Text>
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
                <TextInput
                  style={styles.input as any}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor="#4a4a5a"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
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
              onPress={handleRegister}
              disabled={loading}
            >
              <Text fontSize={15} fontWeight="700" color="#ffffff">
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Text>
              {!loading && <ArrowRight size={18} color="#ffffff" />}
            </Pressable>

            {/* Login link */}
            <XStack justifyContent="center" gap="$2" marginTop="$2">
              <Text fontSize={14} color="#64748b">
                ¿Ya tienes cuenta?
              </Text>
              <Pressable onPress={() => router.push('/(auth)/login')}>
                <Text fontSize={14} fontWeight="600" color="#7c3aed">
                  Inicia sesión
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
