import { View, Linking, StyleSheet } from 'react-native';
import { useDialog } from '@/components/Dialog';
import { Text, YStack, XStack } from 'tamagui';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Check, Crown, Building2, Zap, ExternalLink } from 'lucide-react-native';
import { useAuth } from '@/auth/provider';
import { api } from '@/api/client';
import { Screen, ScreenHeader, Section, Card, IconTile, Badge, Button, LoadingState } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

const BILLING_URL = 'https://nexusproject.pro/dashboard/billing';

const PLANS = [
  { id: 'free', name: 'Free', price: '$0', period: '/mes', icon: Zap, color: colors.textSecondary,
    features: ['3 proyectos', '5 herramientas CLI', '1 miembro', 'Skills básicos'] },
  { id: 'premium', name: 'Premium', price: '$12', period: '/mes', icon: Crown, color: colors.primaryBright,
    features: ['10 proyectos', 'Todas las herramientas', 'Hasta 50 miembros', 'Skills premium', 'Audit log completo'] },
  { id: 'enterprise', name: 'Enterprise', price: 'A medida', period: '', icon: Building2, color: colors.warning,
    features: ['Proyectos ilimitados', 'Todo lo de Premium', 'SSO / SAML', 'SLA y soporte dedicado'] },
];

type Limits = Awaited<ReturnType<typeof api.getPlanLimits>>;

export default function BillingScreen() {
  const { user, refreshProfile } = useAuth();
  const [limits, setLimits] = useState<Limits | null>(null);
  const [opening, setOpening] = useState(false);
  const dialog = useDialog();

  useFocusEffect(useCallback(() => {
    api.getPlanLimits().then(setLimits).catch(() => setLimits(null));
    refreshProfile();
  }, [refreshProfile]));

  const plan = limits?.plan ?? user?.plan ?? 'free';
  const current = PLANS.find((p) => p.id === plan) ?? PLANS[0];

  // Los pagos se hacen en el dashboard web (Stripe); la app solo lleva ahí.
  const openPortal = async () => {
    setOpening(true);
    try {
      const { portal_url } = await api.createPortal();
      await Linking.openURL(portal_url);
    } catch {
      await Linking.openURL(BILLING_URL);
    } finally {
      setOpening(false);
    }
  };

  const upgrade = async () => {
    const ok = await dialog.confirm({
      title: 'Mejorar a Premium',
      message: 'El pago se hace de forma segura en el dashboard web (Stripe).',
      confirmLabel: 'Continuar',
    });
    if (ok) Linking.openURL(BILLING_URL);
  };

  const CurrentIcon = current.icon;
  const maxProjects = Number(limits?.limits.max_projects ?? 0);
  const maxMembers = Number(limits?.limits.max_members ?? 0);

  return (
    <Screen>
      <ScreenHeader back title="Plan y facturación" />

      <Section>
        <Card>
          <XStack alignItems="center" gap={space.lg}>
            <IconTile size={48} color={current.color + '22'}><CurrentIcon size={22} color={current.color} /></IconTile>
            <YStack flex={1} gap={2}>
              <Text fontSize={13} color={colors.textMuted}>Tu plan</Text>
              <Text fontSize={22} fontWeight="800" color={colors.text}>{current.name}</Text>
            </YStack>
            {plan !== 'free' ? (
              <Button compact variant="secondary" label="Gestionar" loading={opening}
                icon={<ExternalLink size={14} color={colors.text} />} onPress={openPortal} />
            ) : null}
          </XStack>

          {limits ? (
            <YStack gap={space.lg} marginTop={space.xl}>
              <Usage label="Proyectos" used={limits.usage.projects} max={maxProjects} />
              <Usage label="Miembros" used={limits.usage.members} max={maxMembers} />
            </YStack>
          ) : (
            <LoadingState label="Cargando uso…" />
          )}
        </Card>
      </Section>

      <Section title="Planes">
        {PLANS.map((p) => {
          const Icon = p.icon;
          const isCurrent = p.id === plan;
          return (
            <Card key={p.id} style={isCurrent ? { borderColor: p.color + '66', borderWidth: 1 } : undefined}>
              <XStack alignItems="center" gap={space.md}>
                <IconTile size={40} color={p.color + '1f'}><Icon size={19} color={p.color} /></IconTile>
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="700" color={colors.text}>{p.name}</Text>
                  <XStack alignItems="baseline" gap={3}>
                    <Text fontSize={20} fontWeight="800" color={colors.text}>{p.price}</Text>
                    {p.period ? <Text fontSize={12} color={colors.textMuted}>{p.period}</Text> : null}
                  </XStack>
                </YStack>
                {isCurrent ? <Badge label="ACTUAL" color={p.color} /> : null}
              </XStack>
              <YStack gap={space.sm} marginTop={space.lg}>
                {p.features.map((f) => (
                  <XStack key={f} alignItems="center" gap={space.sm}>
                    <Check size={15} color={p.color} />
                    <Text fontSize={14} color={colors.textSecondary}>{f}</Text>
                  </XStack>
                ))}
              </YStack>
              {!isCurrent && p.id === 'premium' && plan === 'free' ? (
                <Button style={{ marginTop: space.lg }} label="Mejorar a Premium" onPress={upgrade} />
              ) : null}
              {!isCurrent && p.id === 'enterprise' ? (
                <Button style={{ marginTop: space.lg }} variant="secondary" label="Hablar con ventas"
                  onPress={() => Linking.openURL(BILLING_URL)} />
              ) : null}
            </Card>
          );
        })}
      </Section>
    </Screen>
  );
}

function Usage({ label, used, max }: { label: string; used: number; max: number }) {
  const unlimited = max >= 999999;
  const pct = unlimited || !max ? 0 : Math.min(1, used / max);
  const full = !unlimited && used >= max;
  return (
    <YStack gap={6}>
      <XStack justifyContent="space-between">
        <Text fontSize={13} color={colors.textSecondary}>{label}</Text>
        <Text fontSize={13} fontWeight="600" color={full ? colors.warning : colors.textSecondary}>
          {used} {unlimited ? '· ilimitado' : `de ${max}`}
        </Text>
      </XStack>
      {!unlimited ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: full ? colors.warning : colors.primary }]} />
        </View>
      ) : null}
    </YStack>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surfacePressed, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
