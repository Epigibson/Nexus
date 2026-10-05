// Contenedor que deja espacio exactamente del tamaño del teclado mientras está abierto.
// Reemplaza a KeyboardAvoidingView: en Android con edge-to-edge calculaba mal la altura y,
// al cerrar el teclado, dejaba un hueco abajo y el contenido desplazado.
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

export function KeyboardAware({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const keyboard = useAnimatedKeyboard();
  const padding = useAnimatedStyle(() => ({ paddingBottom: keyboard.height.value }));
  return <Animated.View style={[{ flex: 1 }, style, padding]}>{children}</Animated.View>;
}
