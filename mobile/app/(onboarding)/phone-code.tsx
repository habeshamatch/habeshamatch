import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CODE_LENGTH, CodeInput, type CodeInputHandle } from '@/components/CodeInput';
import { RESEND_SECONDS, sendPhoneVerificationCode, verifyPhoneCode } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { formatForDisplay } from '@/lib/phone';
import { colors, spacing, typography } from '@/lib/theme';

export default function PhoneCodeScreen() {
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef<CodeInputHandle>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const verify = async (value: string) => {
    if (value.length !== CODE_LENGTH || verifying) return;
    setError(null);
    setVerifying(true);
    try {
      await verifyPhoneCode(phone, value);
      // Once the number is confirmed the root layout moves on to profile setup.
    } catch (e) {
      setError(friendlyError(e));
      setCode('');
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await sendPhoneVerificationCode(phone);
      setSecondsLeft(RESEND_SECONDS);
      setNotice('New code sent by SMS.');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
          <Text style={[typography.button, { color: colors.accent }]}>Change number</Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={typography.title}>Enter your code</Text>
          <Text style={typography.bodyMuted}>
            We sent a {CODE_LENGTH} digit code by SMS to{' '}
            <Text style={{ color: colors.text }}>{formatForDisplay(phone)}</Text>
          </Text>
          <CodeInput
            ref={inputRef}
            value={code}
            onChange={(d) => {
              setCode(d);
              setError(null);
            }}
            onComplete={verify}
            autoComplete="sms-otp"
          />
          {error && (
            <Text style={[typography.caption, styles.error]} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
          {notice && !error && <Text style={typography.caption}>{notice}</Text>}
        </View>

        <View style={styles.actions}>
          <Button label="Verify" onPress={() => verify(code)} loading={verifying} disabled={code.length !== CODE_LENGTH} />
          {secondsLeft > 0 ? (
            <Text style={[typography.caption, styles.center]}>You can ask for a new code in {secondsLeft}s</Text>
          ) : (
            <Button label="Send a new code" variant="text" onPress={resend} disabled={resending} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  content: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  error: {
    color: colors.rose,
  },
  actions: {
    gap: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
});
