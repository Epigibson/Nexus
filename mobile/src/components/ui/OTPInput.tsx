import { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import { Text } from 'tamagui';

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  value?: string;
  onChange?: (code: string) => void;
  autoFocus?: boolean;
}

export function OTPInput({ length = 6, onComplete, value = '', onChange, autoFocus = true }: OTPInputProps) {
  const [code, setCode] = useState<string[]>(value.split('').concat(Array(length - value.length).fill('')));
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputs.current[0]?.focus(), 100);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (value) {
      setCode(value.split('').concat(Array(length - value.length).fill('')));
    }
  }, [value, length]);

  const handleChange = (text: string, index: number) => {
    // Handle paste
    if (text.length > 1) {
      const pasted = text.slice(0, length).split('');
      const newCode = [...code];
      pasted.forEach((char, i) => {
        if (index + i < length) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);
      onChange?.(newCode.join(''));

      const nextIndex = Math.min(index + pasted.length, length - 1);
      inputs.current[nextIndex]?.focus();

      if (newCode.every((c) => c !== '')) {
        onComplete(newCode.join(''));
        Keyboard.dismiss();
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    onChange?.(newCode.join(''));

    if (text && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (newCode.every((c) => c !== '')) {
      onComplete(newCode.join(''));
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      onChange?.(newCode.join(''));
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }, (_, index) => (
        <View
          key={index}
          style={[
            styles.inputWrapper,
            code[index] ? styles.inputFilled : null,
            index === code.findIndex((c) => c === '') ? styles.inputActive : null,
          ]}
        >
          <TextInput
            ref={(ref) => { inputs.current[index] = ref; }}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={1}
            value={code[index]}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            selectTextOnFocus
          />
          {code[index] ? <View style={styles.dot} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  inputWrapper: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2a2a3a',
    backgroundColor: '#16161f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputFilled: {
    borderColor: '#7c3aed',
    backgroundColor: '#1a1a24',
  },
  inputActive: {
    borderColor: '#a78bfa',
  },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#f8fafc',
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7c3aed',
  },
});
