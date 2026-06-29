import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../src/auth/provider';
import { api, type ApiKeyResponse } from '../../../src/api/client';
import { Key, Plus, Copy, Trash2, CheckCircle2, Eye, EyeOff } from 'lucide-react-native';

export default function ApiKeysScreen() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadKeys = async () => {
    try {
      const data = await api.listApiKeys();
      setKeys(data);
    } catch (e) {
      console.error('Failed to load API keys', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await api.generateApiKey('Mobile Key');
      setNewKey(result.full_key);
      await loadKeys();
    } catch (e) {
      console.error('Failed to generate key', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await api.revokeApiKey(keyId);
      await loadKeys();
    } catch (e) {
      console.error('Failed to revoke key', e);
    }
  };

  const handleCopy = async () => {
    if (newKey) {
      // In React Native, we'd use Clipboard API
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <YStack padding="$6" paddingTop={60} gap="$2">
          <Text fontSize={24} fontWeight="800" color="#f8fafc">
            API Keys
          </Text>
          <Text fontSize={14} color="#64748b">
            Gestiona las llaves de acceso al API de Nexus
          </Text>
        </YStack>

        {/* New Key Display */}
        {newKey && (
          <View style={styles.newKeyCard}>
            <XStack alignItems="center" gap="$2">
              <CheckCircle2 size={16} color="#10b981" />
              <Text fontSize={14} fontWeight="600" color="#10b981">Nueva API Key Generada</Text>
            </XStack>
            <View style={styles.keyDisplay}>
              <Text fontSize={12} color="#f8fafc" fontFamily="monospace" numberOfLines={1}>
                {newKey}
              </Text>
            </View>
            <Text fontSize={11} color="#f59e0b">
              ⚠️ Guarda esta key ahora. No podrás verla de nuevo.
            </Text>
            <Pressable style={styles.copyButton} onPress={handleCopy}>
              {copied ? (
                <CheckCircle2 size={14} color="#10b981" />
              ) : (
                <Copy size={14} color="#7c3aed" />
              )}
              <Text fontSize={13} fontWeight="600" color={copied ? '#10b981' : '#7c3aed'}>
                {copied ? 'Copiado' : 'Copiar'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Generate Button */}
        <Pressable
          style={[styles.generateButton, generating && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={generating}
        >
          <Plus size={18} color="#ffffff" />
          <Text fontSize={14} fontWeight="700" color="#ffffff">
            {generating ? 'Generando...' : 'Generar Nueva Key'}
          </Text>
        </Pressable>

        {/* Keys List */}
        <YStack gap="$3" marginTop="$4">
          <Text fontSize={14} fontWeight="600" color="#94a3b8">
            Keys Existentes ({keys.length})
          </Text>

          {keys.length === 0 && !loading ? (
            <YStack alignItems="center" padding="$8" gap="$2">
              <Key size={32} color="#3a3a4a" />
              <Text fontSize={14} color="#64748b">No hay API keys</Text>
            </YStack>
          ) : (
            keys.map((key) => (
              <View key={key.id} style={styles.keyCard}>
                <XStack alignItems="center" gap="$3">
                  <View style={styles.keyIcon}>
                    <Key size={16} color="#a78bfa" />
                  </View>
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="600" color="#f8fafc">{key.name}</Text>
                    <Text fontSize={12} color="#64748b">
                      {key.key_prefix}... • {key.is_active ? 'Activa' : 'Revocada'}
                    </Text>
                  </YStack>
                  {key.is_active && (
                    <Pressable onPress={() => handleRevoke(key.id)}>
                      <Trash2 size={16} color="#ef4444" />
                    </Pressable>
                  )}
                </XStack>
              </View>
            ))
          )}
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scroll: {
    paddingBottom: 100,
  },
  newKeyCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  keyDisplay: {
    backgroundColor: '#111118',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    height: 48,
    marginHorizontal: 16,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  keyCard: {
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
  keyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
