import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CountryPicker } from '@/components/CountryPicker';
import { sendCode, whatsappEnabled, type OtpChannel } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { defaultCountry, toE164, type Country } from '@/lib/phone';
import { colors, radius, spacing, typography } from '@/lib/theme';

export default function PhoneScreen() {
  const [country, setCountry] = useState<Country>(defaultCountry);
  const [number, setNumber] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState<OtpChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const phone = toE164(number, country);

  const submit = async (channel: OtpChannel) => {
    if (!phone) {
      setError("That phone number doesn't look right. Check it and try again.");
      return;
    }
    setError(null);
    setSending(channel);
    try {
      await sendCode(phone, channel);
      router.push({ pathname: '/otp', params: { phone, channel } });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSending(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} style={styles.back}>
          <Text style={[typography.button, { color: colors.accent }]}>Back</Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={typography.title}>{"What's your phone number?"}</Text>
          <Text style={typography.bodyMuted}>
            {"We'll send you a code to sign in. Your number is never shown on your profile."}
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
              onSubmitEditing={() => submit('sms')}
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
          <Button label="Send code by SMS" onPress={() => submit('sms')} loading={sending === 'sms'} disabled={!number || sending !== null} />
          {whatsappEnabled && (
            <Button
              label="Send via WhatsApp"
              variant="secondary"
              onPress={() => submit('whatsapp')}
              loading={sending === 'whatsapp'}
              disabled={!number || sending !== null}
            />
          )}
          <Text style={[typography.caption, styles.center]}>
            By continuing you confirm you are 18 or older. Standard message rates may apply.
          </Text>
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
  back: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  content: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
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
    gap: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
});
