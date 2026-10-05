import { createTamagui, createFont } from 'tamagui';
import { config } from '@tamagui/config/v3';

// Inter cargada con expo-font (app/_layout.tsx). En Android cada grosor es una familia distinta,
// así que "face" le dice a Tamagui qué archivo usar según fontWeight.
const interFace = {
  400: { normal: 'Inter_400Regular' },
  500: { normal: 'Inter_500Medium' },
  600: { normal: 'Inter_600SemiBold' },
  700: { normal: 'Inter_700Bold' },
  800: { normal: 'Inter_800ExtraBold' },
};

const inter = (base: typeof config.fonts.body) =>
  createFont({ ...base, family: 'Inter_400Regular', face: interFace });

const nexusConfig = createTamagui({
  ...config,
  fonts: { ...config.fonts, body: inter(config.fonts.body), heading: inter(config.fonts.heading) },
  themes: {
    ...config.themes,
    dark: {
      ...config.themes.dark,
      // Override with Nexus colors
      background: '#0a0a0f',
      backgroundHover: '#111118',
      backgroundPress: '#1a1a24',
      backgroundFocus: '#1e1e2a',
      borderColor: '#2a2a3a',
      borderColorHover: '#3a3a4a',
      color: '#f8fafc',
      colorHover: '#e2e8f0',
      colorPress: '#cbd5e1',
      colorFocus: '#94a3b8',
      placeholderColor: '#64748b',
      // Primary
      primary: '#7c3aed',
      primaryLight: '#a78bfa',
      primaryDark: '#5b21b6',
      // Success
      success: '#10b981',
      successLight: '#6ee7b7',
      // Warning
      warning: '#f59e0b',
      warningLight: '#fcd34d',
      // Error
      error: '#ef4444',
      errorLight: '#fca5a5',
    },
    light: {
      ...config.themes.light,
      background: '#f8fafc',
      backgroundHover: '#f1f5f9',
      backgroundPress: '#e2e8f0',
      backgroundFocus: '#cbd5e1',
      borderColor: '#e2e8f0',
      borderColorHover: '#cbd5e1',
      color: '#0f172a',
      colorHover: '#1e293b',
      colorPress: '#334155',
      colorFocus: '#475569',
      placeholderColor: '#94a3b8',
      primary: '#7c3aed',
      primaryLight: '#a78bfa',
      primaryDark: '#5b21b6',
      success: '#10b981',
      successLight: '#6ee7b7',
      warning: '#f59e0b',
      warningLight: '#fcd34d',
      error: '#ef4444',
      errorLight: '#fca5a5',
    },
  },
});

export type NexusTamaguiConfig = typeof nexusConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends NexusTamaguiConfig {}
}

export default nexusConfig;
