import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { sendEmailCode } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { colors, radius, spacing, typography } from '@/lib/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(value)) {
      setError("That email address doesn't look right. Check it and try again.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await sendEmailCode(value);
      router.push({ pathname: '/email-code', params: { email: value } });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
          <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={typography.title}>{"What's your email?"}</Text>
          <Text style={typography.bodyMuted}>
            {"We'll send you a 6 digit code to sign in. No password needed."}
          </Text>
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null);
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="send"
            onSubmitEditing={submit}
            style={styles.input}
            accessibilityLabel="Email address"
          />
          {error && (
            <Text style={[typography.caption, styles.error]} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <Button label="Send code" onPress={submit} loading={sending} disabled={!email.trim()} />
          <Text style={[typography.caption, styles.center]}>By continuing you confirm you are 18 or older.</Text>
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
  input: {
    ...typography.body,
    fontSize: 18,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  error: {
    color: colors.rose,
  },
  actions: {
    gap: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
});
