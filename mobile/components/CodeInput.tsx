import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/lib/theme';

export const CODE_LENGTH = 6;

type Props = {
  value: string;
  onChange: (digits: string) => void;
  onComplete: (digits: string) => void;
  autoComplete: 'sms-otp' | 'one-time-code';
};

export type CodeInputHandle = { focus: () => void };

// Six boxes driven by one hidden input, so paste and SMS / email autofill work.
export const CodeInput = forwardRef<CodeInputHandle, Props>(function CodeInput(
  { value, onChange, onComplete, autoComplete },
  ref,
) {
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  return (
    <View>
      <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxes} accessible={false}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <View key={i} style={[styles.box, i === value.length && styles.boxActive]}>
            <Text style={styles.digit}>{value[i] ?? ''}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
          onChange(digits);
          if (digits.length === CODE_LENGTH) onComplete(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={autoComplete}
        maxLength={CODE_LENGTH}
        autoFocus
        style={styles.hiddenInput}
        accessibilityLabel={`${CODE_LENGTH} digit code`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  boxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  box: {
    width: 48,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: colors.accent,
  },
  digit: {
    ...typography.title,
    fontSize: 26,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
