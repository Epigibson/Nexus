import { createTamagui, createTokens } from 'tamagui';
import { config } from '@tamagui/config/v3';

const tokens = createTokens({
  color: {
    // Primary (Violet)
    primary: '#7c3aed',
    primaryLight: '#a78bfa',
    primaryDark: '#5b21b6',
    primary50: '#f5f3ff',
    primary100: '#ede9fe',
    primary200: '#ddd6fe',
    primary300: '#c4b5fd',
    primary400: '#a78bfa',
    primary500: '#8b5cf6',
    primary600: '#7c3aed',
    primary700: '#6d28d9',
    primary800: '#5b21b6',
    primary900: '#4c1d95',

    // Success (Emerald)
    success: '#10b981',
    successLight: '#6ee7b7',
    successDark: '#059669',

    // Warning (Amber)
    warning: '#f59e0b',
    warningLight: '#fcd34d',
    warningDark: '#d97706',

    // Error (Red)
    error: '#ef4444',
    errorLight: '#fca5a5',
    errorDark: '#dc2626',

    // Backgrounds
    bg: '#0a0a0f',
    bgCard: '#111118',
    bgCardHover: '#1a1a24',
    bgMuted: '#1e1e2a',
    bgInput: '#16161f',

    // Borders
    border: '#2a2a3a',
    borderLight: '#3a3a4a',
    borderFocus: '#7c3aed',

    // Text
    text: '#f8fafc',
    textMuted: '#94a3b8',
    textDim: '#64748b',

    // White/Black
    white: '#ffffff',
    black: '#000000',
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    true: 32,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    full: 9999,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});

const nexusConfig = createTamagui({
  ...config,
  tokens,
  themes: {
    dark: {
      bg: tokens.color.bg,
      bgCard: tokens.color.bgCard,
      bgCardHover: tokens.color.bgCardHover,
      bgMuted: tokens.color.bgMuted,
      bgInput: tokens.color.bgInput,
      border: tokens.color.border,
      borderLight: tokens.color.borderLight,
      borderFocus: tokens.color.borderFocus,
      color: tokens.color.text,
      colorMuted: tokens.color.textMuted,
      colorDim: tokens.color.textDim,
      primary: tokens.color.primary,
      primaryLight: tokens.color.primaryLight,
      primaryDark: tokens.color.primaryDark,
      success: tokens.color.success,
      warning: tokens.color.warning,
      error: tokens.color.error,
    },
    light: {
      bg: '#f8fafc',
      bgCard: '#ffffff',
      bgCardHover: '#f1f5f9',
      bgMuted: '#e2e8f0',
      bgInput: '#f1f5f9',
      border: '#e2e8f0',
      borderLight: '#cbd5e1',
      borderFocus: tokens.color.primary,
      color: '#0f172a',
      colorMuted: '#64748b',
      colorDim: '#94a3b8',
      primary: tokens.color.primary,
      primaryLight: tokens.color.primaryLight,
      primaryDark: tokens.color.primaryDark,
      success: tokens.color.success,
      warning: tokens.color.warning,
      error: tokens.color.error,
    },
  },
});

export type NexusTamaguiConfig = typeof nexusConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends NexusTamaguiConfig {}
}

export default nexusConfig;
