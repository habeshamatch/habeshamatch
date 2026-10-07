import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { RESEND_SECONDS, sendCode, verifyCode, whatsappEnabled, type OtpChannel } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { formatForDisplay } from '@/lib/phone';
import { colors, radius, spacing, typography } from '@/lib/theme';

const CODE_LENGTH = 6;

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone: string; channel: OtpChannel }>();
  const phone = params.phone ?? '';
  const [channel, setChannel] = useState<OtpChannel>(params.channel === 'whatsapp' ? 'whatsapp' : 'sms');

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);

  // Resend countdown.
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
      await verifyCode(phone, value);
      // The session listener in the root layout takes the user to the next screen.
    } catch (e) {
      setError(friendlyError(e));
      setCode('');
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const resend = async (via: OtpChannel) => {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await sendCode(phone, via);
      setChannel(via);
      setSecondsLeft(RESEND_SECONDS);
      setNotice(via === 'whatsapp' ? 'New code sent on WhatsApp.' : 'New code sent by SMS.');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setResending(false);
    }
  };

  const otherChannel: OtpChannel = channel === 'sms' ? 'whatsapp' : 'sms';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
          <Text style={[typography.button, { color: colors.accent }]}>Change number</Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={typography.title}>Enter your code</Text>
          <Text style={typography.bodyMuted}>
            We sent a {CODE_LENGTH} digit code {channel === 'whatsapp' ? 'on WhatsApp' : 'by SMS'} to{' '}
            <Text style={{ color: colors.text }}>{formatForDisplay(phone)}</Text>
          </Text>

          {/* One hidden input drives the six boxes, so paste and SMS autofill work. */}
          <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxes} accessible={false}>
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <View key={i} style={[styles.box, i === code.length && styles.boxActive]}>
                <Text style={styles.digit}>{code[i] ?? ''}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
              setCode(digits);
              setError(null);
              if (digits.length === CODE_LENGTH) verify(digits);
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={CODE_LENGTH}
            autoFocus
            style={styles.hiddenInput}
            accessibilityLabel={`${CODE_LENGTH} digit code`}
          />

          {error && (
            <Text style={[typography.caption, styles.error]} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
          {notice && !error && <Text style={typography.caption}>{notice}</Text>}
        </View>

        <View style={styles.actions}>
          <Button
            label="Verify"
            onPress={() => verify(code)}
            loading={verifying}
            disabled={code.length !== CODE_LENGTH}
          />
          {secondsLeft > 0 ? (
            <Text style={[typography.caption, styles.center]}>You can ask for a new code in {secondsLeft}s</Text>
          ) : (
            <>
              <Button label="Send a new code" variant="text" onPress={() => resend(channel)} disabled={resending} />
              {whatsappEnabled && (
                <Button
                  label={otherChannel === 'whatsapp' ? 'Send via WhatsApp instead' : 'Send by SMS instead'}
                  variant="text"
                  onPress={() => resend(otherChannel)}
                  disabled={resending}
                />
              )}
            </>
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
