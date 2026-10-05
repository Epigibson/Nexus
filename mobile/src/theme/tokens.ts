// Tokens de diseño de Nexus Mobile. Usa estos valores en vez de colores sueltos en cada pantalla.

export const colors = {
  bg: '#09090d',
  surface: 'rgba(22, 22, 32, 0.92)',
  surfaceRaised: '#16161e',
  surfacePressed: '#1b1b25',
  border: '#1f1f2b',
  /** Borde de tarjetas: blanco muy tenue, se ve "de vidrio" sobre el fondo con resplandor. */
  hairline: 'rgba(255, 255, 255, 0.07)',
  borderStrong: '#2c2c3b',

  text: '#f4f4f8',
  textSecondary: '#a1a1b5',
  textMuted: '#6b6b80',
  textFaint: '#45455a',

  primary: '#7c3aed',
  primaryBright: '#a78bfa',
  primarySoft: 'rgba(124, 58, 237, 0.14)',
  primaryBorder: 'rgba(124, 58, 237, 0.32)',

  success: '#10b981',
  successSoft: 'rgba(16, 185, 129, 0.12)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  danger: '#ef4444',
  dangerSoft: 'rgba(239, 68, 68, 0.12)',
  info: '#3b82f6',
  infoSoft: 'rgba(59, 130, 246, 0.12)',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/** Margen lateral estándar de las pantallas. */
export const gutter = space.xl;

export const envColors: Record<string, string> = {
  development: colors.success,
  staging: colors.warning,
  production: colors.danger,
};

export function envColor(env: string): string {
  return envColors[env] ?? colors.primaryBright;
}

/** Degradados de marca (de → a). */
export const gradients = {
  brand: ['#8b5cf6', '#6d28d9'] as const,
  hero: ['#2a1659', '#140d2b'] as const,
  avatar: ['#a78bfa', '#ec4899'] as const,
};

/** Paleta para monogramas de proyecto: el color sale del nombre, así cada proyecto es reconocible. */
const MONOGRAM_PALETTES: readonly (readonly [string, string])[] = [
  ['#8b5cf6', '#6d28d9'],
  ['#3b82f6', '#1d4ed8'],
  ['#10b981', '#047857'],
  ['#f59e0b', '#b45309'],
  ['#ec4899', '#be185d'],
  ['#06b6d4', '#0e7490'],
];

export function paletteFor(name: string): readonly [string, string] {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return MONOGRAM_PALETTES[h % MONOGRAM_PALETTES.length];
}
