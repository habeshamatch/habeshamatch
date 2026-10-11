import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/lib/theme';

type Props = {
  value: string | null; // YYYY-MM-DD
  onChange: (value: string) => void;
  maximumDate: Date;
};

export function toIsoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function fromIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const MINIMUM_DATE = new Date(1930, 0, 1);

// Tap to open the system date picker: a spinner below the field on iOS, a dialog on Android.
export function DateOfBirthField({ value, onChange, maximumDate }: Props) {
  const [open, setOpen] = useState(false);
  const current = value ? fromIsoDate(value) : new Date(maximumDate.getFullYear() - 7, 0, 1);
  const display = value
    ? fromIsoDate(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Select your date of birth';

  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.field}
        accessibilityRole="button"
        accessibilityLabel={`Date of birth: ${display}. Change`}
      >
        <Text style={[typography.body, !value && { color: colors.textMuted }]}>{display}</Text>
      </Pressable>
      {open && (
        <View style={Platform.OS === 'ios' ? styles.iosPicker : undefined}>
          <DateTimePicker
            value={current}
            mode="date"
            display="spinner"
            maximumDate={maximumDate}
            minimumDate={MINIMUM_DATE}
            themeVariant="dark"
            textColor={colors.text}
            onValueChange={(_e, date) => {
              onChange(toIsoDate(date));
              if (Platform.OS === 'android') setOpen(false);
            }}
            onDismiss={() => setOpen(false)}
          />
          {Platform.OS === 'ios' && (
            <Pressable onPress={() => setOpen(false)} style={styles.done} accessibilityRole="button" hitSlop={8}>
              <Text style={[typography.button, { color: colors.accent }]}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  iosPicker: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  done: {
    alignSelf: 'flex-end',
    padding: spacing.md,
  },
});
