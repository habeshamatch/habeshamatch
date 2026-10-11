import { router } from 'expo-router';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CountryPicker } from '@/components/CountryPicker';
import { sendPhoneVerificationCode, signOut } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { defaultCountry, getCountry, toE164, type Country } from '@/lib/phone';
import { useSession } from '@/lib/session';
import { colors, radius, spacing, typography } from '@/lib/theme';

// One-time phone verification. Required before the profile is created, because the database
// checks this number when someone declares a local-tier residence. There is no skip.
export default function PhoneScreen() {
  const { session } = useSession();

  // If the app was closed after a code was requested, start from that pending number.
  const pending = session?.user.new_phone ? parsePhoneNumberFromString(`+${session.user.new_phone}`) : undefined;
  const [country, setCountry] = useState<Country>(() =>
    pending?.country ? getCountry(pending.country) : defaultCountry(),
  );
  const [number, setNumber] = useState(pending?.nationalNumber ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const phone = toE164(number, country);
    if (!phone) {
      setError("That phone number doesn't look right. Check it and try again.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await sendPhoneVerificationCode(phone);
      router.push({ pathname: '/phone-code', params: { phone } });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={typography.title}>Verify your phone number</Text>
          <Text style={typography.bodyMuted}>
            We check every member&apos;s number once to keep HabeshaMatch real and safe. Your number is never
            shown on your profile.
          </Text>

          <View style={styles.inputRow}>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={styles.countryButton}
              accessibilityRole="button"
              accessibilityLabel={`Country: ${country.name}, plus ${country.dialCode}. Change`}
            >
              <Text style={styles.flag}>{country.flag}</Text>
              <Text style={typography.body}>+{country.dialCode}</Text>
            </Pressable>
            <TextInput
              value={number}
              onChangeText={(t) => {
                setNumber(t);
                setError(null);
              }}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              autoFocus
              style={styles.numberInput}
              returnKeyType="done"
              onSubmitEditing={submit}
              accessibilityLabel="Phone number"
            />
          </View>

          {error && (
            <Text style={[typography.caption, styles.error]} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <Button label="Send code by SMS" onPress={submit} loading={sending} disabled={!number || sending} />
          <Text style={[typography.caption, styles.center]}>Standard message rates may apply.</Text>
          <Button label="Sign out" variant="text" onPress={() => signOut().catch((e) => setError(friendlyError(e)))} />
        </View>
      </KeyboardAvoidingView>

      <CountryPicker
        visible={pickerOpen}
        selected={country}
        onSelect={(c) => {
          setCountry(c);
          setError(null);
        }}
        onClose={() => setPickerOpen(false)}
      />
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
  content: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  flag: {
    fontSize: 22,
  },
  numberInput: {
    ...typography.body,
    fontSize: 18,
    flex: 1,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
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
