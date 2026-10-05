// Piezas visuales "premium": degradados SVG, resplandor de fondo, monogramas, animación de entrada y gráfica.
import { useId, type ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text, YStack, XStack } from 'tamagui';
import { colors, radius, paletteFor } from '@/theme/tokens';

const svgId = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, '');

/** Rellena a su padre con un degradado lineal (diagonal por defecto). El padre necesita overflow hidden + radio. */
export function GradientFill({ from, to, vertical }: { from: string; to: string; vertical?: boolean }) {
  const id = svgId(useId());
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Resplandor violeta suave detrás del encabezado de cada pantalla. */
export function Backdrop() {
  const { width } = useWindowDimensions();
  const id = svgId(useId());
  return (
    <View pointerEvents="none" style={[styles.backdrop, { width }]}>
      <Svg width={width} height={420}>
        <Defs>
          <RadialGradient id={id} cx="18%" cy="0%" rx="85%" ry="75%">
            <Stop offset="0" stopColor="#7c3aed" stopOpacity="0.30" />
            <Stop offset="0.55" stopColor="#7c3aed" stopOpacity="0.06" />
            <Stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={420} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Resplandor circular difuso (degradado radial a transparente). */
export function Glow({ color, size, opacity = 0.55, style }: { color: string; size: number; opacity?: number; style?: StyleProp<ViewStyle> }) {
  const id = svgId(useId());
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Ícono de proyecto: inicial sobre un degradado cuyo color depende del nombre. */
export function Monogram({ name, size = 44 }: { name: string; size?: number }) {
  const [from, to] = paletteFor(name);
  return (
    <View style={[styles.monogram, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <GradientFill from={from} to={to} />
      <Text fontSize={size * 0.42} fontWeight="800" color="#ffffff">{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** Entrada escalonada para elementos de lista. */
export function FadeIn({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.duration(380).delay(Math.min(index, 8) * 55)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Barras verticales para series cortas (p. ej. switches por día). */
export function BarChart({ data, height = 84 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const lastIndex = data.length - 1;
  return (
    <XStack alignItems="flex-end" justifyContent="space-between" height={height + 22} gap={6}>
      {data.map((d, i) => {
        const h = d.value === 0 ? 4 : Math.max(8, (d.value / max) * height);
        const today = i === lastIndex;
        return (
          <YStack key={`${d.label}-${i}`} flex={1} alignItems="center" gap={6}>
            <View style={[styles.bar, { height: h, opacity: d.value === 0 ? 0.35 : 1 }]}>
              <GradientFill from={today ? '#c4b5fd' : 'rgba(196,181,253,0.55)'} to={today ? '#7c3aed' : 'rgba(124,58,237,0.35)'} vertical />
            </View>
            <Text fontSize={11} fontWeight={today ? '700' : '500'} color={today ? colors.text : colors.textMuted}>{d.label}</Text>
          </YStack>
        );
      })}
    </XStack>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, height: 420 },
  monogram: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  bar: { width: '100%', maxWidth: 26, borderRadius: radius.sm - 2, overflow: 'hidden' },
});
