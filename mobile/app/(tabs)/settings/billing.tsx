import { View, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/provider';
import { api } from '@/api/client';
import {
  CreditCard, CheckCircle2, Zap, Crown, Building2, ExternalLink,
  FolderOpen, Terminal, Users, ArrowRight,
} from 'lucide-react-native';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/mes',
    color: '#64748b',
    icon: Zap,
    features: ['3 proyectos', '5 herramientas CLI', '1 miembro', 'Skills básicos'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$12',
    period: '/mes',
    color: '#7c3aed',
    icon: Crown,
    features: ['10 proyectos', 'Todas las herramientas', '50 miembros', 'Skills premium', 'Audit log completo'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    color: '#f59e0b',
    icon: Building2,
    features: ['Proyectos ilimitados', 'Todo de Premium', 'SSO/SAML', 'SLA personalizado', 'Soporte dedicado'],
  },
];

export default function BillingScreen() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSubscription()
      .then(setSubscription)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleManage = async () => {
    try {
      const { portal_url } = await api.createPortal();
      Linking.openURL(portal_url);
    } catch (e) {
      console.error('Failed to open portal', e);
    }
  };

  const currentPlan = subscription?.plan || user?.plan || 'free';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <YStack padding="$6" paddingTop={60} gap="$2">
          <Text fontSize={24} fontWeight="800" color="#f8fafc">
            Facturación
          </Text>
          <Text fontSize={14} color="#64748b">
            Gestiona tu suscripción y plan
          </Text>
        </YStack>

        {/* Current Plan */}
        <View style={styles.currentPlanCard}>
          <XStack alignItems="center" gap="$3">
            <View style={[styles.planIcon, { backgroundColor: '#7c3aed' + '20' }]}>
              <Crown size={20} color="#7c3aed" />
            </View>
            <YStack flex={1}>
              <Text fontSize={12} color="#64748b">Plan Actual</Text>
              <Text fontSize={18} fontWeight="700" color="#f8fafc">
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </Text>
            </YStack>
            {currentPlan !== 'free' && (
              <Pressable style={styles.manageButton} onPress={handleManage}>
                <Text fontSize={12} fontWeight="600" color="#7c3aed">Gestionar</Text>
                <ExternalLink size={12} color="#7c3aed" />
              </Pressable>
            )}
          </XStack>
        </View>

        {/* Plan Comparison */}
        <YStack paddingHorizontal="$4" gap="$4" marginTop="$6">
          <Text fontSize={16} fontWeight="700" color="#f8fafc">
            Planes Disponibles
          </Text>

          {PLANS.map((plan) => {
            const PlanIcon = plan.icon;
            const isCurrent = currentPlan === plan.id;
            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  isCurrent && { borderColor: plan.color, backgroundColor: plan.color + '08' },
                ]}
              >
                <XStack alignItems="center" gap="$3">
                  <View style={[styles.planCardIcon, { backgroundColor: plan.color + '15' }]}>
                    <PlanIcon size={20} color={plan.color} />
                  </View>
                  <YStack flex={1}>
                    <Text fontSize={16} fontWeight="700" color="#f8fafc">{plan.name}</Text>
                    <XStack alignItems="baseline" gap="$1">
                      <Text fontSize={20} fontWeight="800" color={plan.color}>{plan.price}</Text>
                      {plan.period && <Text fontSize={12} color="#64748b">{plan.period}</Text>}
                    </XStack>
                  </YStack>
                  {isCurrent && (
                    <View style={[styles.currentBadge, { backgroundColor: plan.color + '20' }]}>
                      <Text fontSize={10} fontWeight="700" color={plan.color}>ACTUAL</Text>
                    </View>
                  )}
                </XStack>

                <YStack gap="$2" marginTop="$3">
                  {plan.features.map((feature, i) => (
                    <XStack key={i} alignItems="center" gap="$2">
                      <CheckCircle2 size={14} color={plan.color} />
                      <Text fontSize={13} color="#94a3b8">{feature}</Text>
                    </XStack>
                  ))}
                </YStack>

                {!isCurrent && plan.id !== 'enterprise' && (
                  <Pressable style={[styles.upgradeButton, { backgroundColor: plan.color }]}>
                    <Text fontSize={13} fontWeight="700" color="#ffffff">
                      {plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                    </Text>
                    <ArrowRight size={14} color="#ffffff" />
                  </Pressable>
                )}

                {plan.id === 'enterprise' && !isCurrent && (
                  <Pressable style={[styles.upgradeButton, { backgroundColor: plan.color }]}>
                    <Text fontSize={13} fontWeight="700" color="#ffffff">Contactar Ventas</Text>
                    <ArrowRight size={14} color="#ffffff" />
                  </Pressable>
                )}
              </View>
            );
          })}
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
  currentPlanCard: {
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  planCard: {
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e2a',
  },
  planCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    marginTop: 12,
  },
});
