// Diálogos con el estilo de la app (reemplazan a Alert.alert, que en Android sale blanco).
// Uso: const dialog = useDialog();
//      if (await dialog.confirm({ title, message, confirmLabel, destructive: true })) { ... }
//      dialog.notify({ title, message });
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { Button } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type DialogOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Solo un botón (aviso). */
  single?: boolean;
};

type DialogApi = {
  confirm: (o: DialogOptions) => Promise<boolean>;
  notify: (o: Omit<DialogOptions, 'single' | 'destructive' | 'cancelLabel'>) => Promise<void>;
};

const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const confirm = useCallback((o: DialogOptions) => new Promise<boolean>((resolve) => {
    resolver.current = resolve;
    setOptions(o);
  }), []);

  const notify = useCallback(async (o: Omit<DialogOptions, 'single' | 'destructive' | 'cancelLabel'>) => {
    await confirm({ ...o, single: true, confirmLabel: o.confirmLabel ?? 'Entendido' });
  }, [confirm]);

  return (
    <DialogContext.Provider value={{ confirm, notify }}>
      {children}
      <Modal visible={!!options} transparent animationType="fade" statusBarTranslucent onRequestClose={() => close(false)}>
        <Pressable style={styles.scrim} onPress={() => !options?.single && close(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <YStack gap={space.sm}>
              <Text fontSize={18} fontWeight="700" color={colors.text}>{options?.title}</Text>
              {options?.message ? (
                <Text fontSize={14} color={colors.textSecondary} lineHeight={21}>{options.message}</Text>
              ) : null}
            </YStack>
            <XStack gap={space.md} marginTop={space.xl}>
              {!options?.single ? (
                <Button variant="secondary" label={options?.cancelLabel ?? 'Cancelar'} onPress={() => close(false)} style={styles.flex} />
              ) : null}
              <Button
                variant={options?.destructive ? 'danger' : 'primary'}
                label={options?.confirmLabel ?? 'Aceptar'}
                onPress={() => close(true)}
                style={styles.flex}
              />
            </XStack>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog debe usarse dentro de <DialogProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(3, 3, 8, 0.72)', alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#15141f',
    borderRadius: radius.xl + 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: space.xl,
  },
  flex: { flex: 1 },
});
