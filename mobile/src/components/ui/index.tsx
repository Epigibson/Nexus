// Componentes base de Nexus Mobile: pantallas, encabezados, tarjetas, botones y estados.
import type { ReactNode } from 'react';
import {
  View, ScrollView, RefreshControl, Pressable, ActivityIndicator, StyleSheet, TextInput,
  type StyleProp, type ViewStyle, type TextInputProps,
} from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, radius, space, gutter } from '@/theme/tokens';

// ─── Screen ───

type ScreenProps = {
  children: ReactNode;
  /** Pull-to-refresh: se muestra si se pasa onRefresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** false para pantallas que manejan su propio scroll. */
  scroll?: boolean;
};

/** Fondo, margen superior seguro (notch/barra de estado) y scroll con pull-to-refresh. */
export function Screen({ children, refreshing = false, onRefresh, scroll = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: insets.top + space.md, paddingBottom: space.xxl * 2 };
  if (!scroll) {
    return <View style={[styles.screen, padding]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={padding}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryBright}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surfaceRaised}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

// ─── Header ───

type HeaderProps = {
  title: string;
  subtitle?: string;
  /** Muestra el botón de regreso (pantallas de detalle). */
  back?: boolean;
  right?: ReactNode;
  eyebrow?: string;
};

export function ScreenHeader({ title, subtitle, back, right, eyebrow }: HeaderProps) {
  const router = useRouter();
  return (
    <YStack paddingHorizontal={gutter} paddingBottom={space.xl} gap={space.xs}>
      {back ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ChevronLeft size={20} color={colors.textSecondary} />
          <Text fontSize={15} color={colors.textSecondary}>Volver</Text>
        </Pressable>
      ) : null}
      <XStack alignItems="center" justifyContent="space-between" gap={space.md}>
        <YStack flex={1} gap={2}>
          {eyebrow ? (
            <Text fontSize={13} color={colors.textMuted}>{eyebrow}</Text>
          ) : null}
          <Text fontSize={28} fontWeight="800" color={colors.text} letterSpacing={-0.6} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text fontSize={14} color={colors.textMuted}>{subtitle}</Text>
          ) : null}
        </YStack>
        {right}
      </XStack>
    </YStack>
  );
}

// ─── Section ───

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <YStack paddingHorizontal={gutter} gap={space.md} marginBottom={space.xxl}>
      {title ? (
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize={13} fontWeight="700" color={colors.textMuted} textTransform="uppercase" letterSpacing={0.8}>
            {title}
          </Text>
          {action}
        </XStack>
      ) : null}
      {children}
    </YStack>
  );
}

// ─── Card ───

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Tarjeta base; con onPress se vuelve presionable con retroalimentación visual. */
export function Card({ children, onPress, style, accessibilityLabel }: CardProps) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
    >
      {children}
    </Pressable>
  );
}

/** Contenedor de íconos cuadrado con fondo suave. */
export function IconTile({ children, color = colors.primarySoft, size = 40 }: { children: ReactNode; color?: string; size?: number }) {
  return (
    <View style={[styles.iconTile, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: color }]}>
      {children}
    </View>
  );
}

// ─── Badge ───

export function Badge({ label, color = colors.primaryBright, soft }: { label: string; color?: string; soft?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: soft ?? color + '1f' }]}>
      <Text fontSize={11} fontWeight="700" color={color} letterSpacing={0.3}>{label}</Text>
    </View>
  );
}

// ─── Button ───

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, compact, style }: ButtonProps) {
  const v = buttonVariants[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !off && styles.pressed,
        off && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={v.text} /> : icon}
      <Text fontSize={compact ? 13 : 15} fontWeight="700" color={v.text}>{label}</Text>
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, border: colors.primary, text: '#ffffff' },
  secondary: { bg: colors.surfaceRaised, border: colors.borderStrong, text: colors.text },
  danger: { bg: colors.dangerSoft, border: 'rgba(239, 68, 68, 0.35)', text: colors.danger },
  ghost: { bg: 'transparent', border: 'transparent', text: colors.primaryBright },
};

// ─── List rows (ajustes) ───

type RowProps = {
  icon: ReactNode;
  label: string;
  detail?: string;
  onPress?: () => void;
  destructive?: boolean;
  trailing?: ReactNode;
};

export function ListGroup({ children }: { children: ReactNode }) {
  return <View style={styles.listGroup}>{children}</View>;
}

export function ListRow({ icon, label, detail, onPress, destructive, trailing }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      <IconTile size={34} color={destructive ? colors.dangerSoft : colors.surfacePressed}>{icon}</IconTile>
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="600" color={destructive ? colors.danger : colors.text}>{label}</Text>
        {detail ? <Text fontSize={12} color={colors.textMuted} numberOfLines={1}>{detail}</Text> : null}
      </YStack>
      {trailing ?? (onPress && !destructive ? <ChevronRight size={18} color={colors.textFaint} /> : null)}
    </Pressable>
  );
}

export function RowDivider() {
  return <View style={styles.rowDivider} />;
}

// ─── Form field ───

type FieldProps = TextInputProps & { label: string; icon?: ReactNode; hint?: string };

export function Field({ label, icon, hint, style, ...input }: FieldProps) {
  return (
    <YStack gap={space.sm}>
      <Text fontSize={13} fontWeight="600" color={colors.textSecondary}>{label}</Text>
      <View style={styles.field}>
        {icon}
        <TextInput placeholderTextColor={colors.textFaint} style={[styles.fieldInput, style]} {...input} />
      </View>
      {hint ? <Text fontSize={12} color={colors.textMuted}>{hint}</Text> : null}
    </YStack>
  );
}

// ─── States ───

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <YStack alignItems="center" paddingVertical={space.xxl * 2} gap={space.md}>
      <ActivityIndicator color={colors.primaryBright} />
      <Text fontSize={13} color={colors.textMuted}>{label}</Text>
    </YStack>
  );
}

type EmptyProps = { icon: ReactNode; title: string; message?: string; action?: ReactNode };

export function EmptyState({ icon, title, message, action }: EmptyProps) {
  return (
    <YStack alignItems="center" paddingVertical={space.xxl * 1.5} paddingHorizontal={space.xl} gap={space.md}>
      <IconTile size={64} color={colors.surfaceRaised}>{icon}</IconTile>
      <Text fontSize={16} fontWeight="700" color={colors.text} textAlign="center">{title}</Text>
      {message ? (
        <Text fontSize={14} color={colors.textMuted} textAlign="center" maxWidth={280} lineHeight={20}>{message}</Text>
      ) : null}
      {action ? <View style={{ marginTop: space.sm }}>{action}</View> : null}
    </YStack>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <Text flex={1} fontSize={13} color={colors.danger}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text fontSize={13} fontWeight="700" color={colors.text}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -6, marginBottom: space.sm, alignSelf: 'flex-start' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
  },
  cardPressed: { backgroundColor: colors.surfacePressed, transform: [{ scale: 0.985 }] },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: radius.sm - 2, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: 50,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonCompact: { height: 38, paddingHorizontal: space.md, borderRadius: radius.sm + 2 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  listGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 13 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: space.lg + 34 + space.md },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 50,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  fieldInput: { flex: 1, height: '100%', color: colors.text, fontSize: 16 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginHorizontal: gutter,
    marginBottom: space.lg,
  },
});
