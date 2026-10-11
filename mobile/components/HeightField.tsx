import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chips } from '@/components/Chips';
import { TextField } from '@/components/FormControls';
import { cmToFeetInches, feetInchesToCm, type HeightUnit } from '@/lib/height';
import { spacing, typography } from '@/lib/theme';

type Props = {
  heightCm: number | null;
  unit: HeightUnit;
  onChange: (heightCm: number | null, unit: HeightUnit) => void;
};

const UNITS = [
  { value: 'ftin' as const, label: 'ft / in' },
  { value: 'cm' as const, label: 'cm' },
];

const digits = (t: string) => t.replace(/\D/g, '');

// Height entered in cm or feet and inches, always reported back in cm.
export function HeightField({ heightCm, unit, onChange }: Props) {
  const initial = heightCm ? cmToFeetInches(heightCm) : null;
  const [cmText, setCmText] = useState(heightCm ? String(heightCm) : '');
  const [ftText, setFtText] = useState(initial ? String(initial.feet) : '');
  const [inText, setInText] = useState(initial ? String(initial.inches) : '');

  const switchUnit = (next: HeightUnit) => {
    if (next === unit) return;
    // Carry the value across so switching units never loses what was typed.
    if (heightCm) {
      const fi = cmToFeetInches(heightCm);
      setCmText(String(heightCm));
      setFtText(String(fi.feet));
      setInText(String(fi.inches));
    }
    onChange(heightCm, next);
  };

  const fromFeetInches = (ft: string, inch: string) => {
    const f = Number(ft);
    const i = Number(inch || '0');
    onChange(ft && i < 12 ? feetInchesToCm(f, i) : null, unit);
  };

  return (
    <View style={styles.wrap}>
      <Chips options={UNITS} selected={[unit]} onToggle={switchUnit} label="Height unit" />
      {unit === 'cm' ? (
        <View style={styles.row}>
          <TextField
            value={cmText}
            onChangeText={(t) => {
              const v = digits(t).slice(0, 3);
              setCmText(v);
              onChange(v ? Number(v) : null, unit);
            }}
            keyboardType="number-pad"
            placeholder="170"
            style={styles.input}
            accessibilityLabel="Height in centimetres"
          />
          <Text style={typography.bodyMuted}>cm</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <TextField
            value={ftText}
            onChangeText={(t) => {
              const v = digits(t).slice(0, 1);
              setFtText(v);
              fromFeetInches(v, inText);
            }}
            keyboardType="number-pad"
            placeholder="5"
            style={styles.input}
            accessibilityLabel="Feet"
          />
          <Text style={typography.bodyMuted}>ft</Text>
          <TextField
            value={inText}
            onChangeText={(t) => {
              const v = digits(t).slice(0, 2);
              setInText(v);
              fromFeetInches(ftText, v);
            }}
            keyboardType="number-pad"
            placeholder="7"
            style={styles.input}
            accessibilityLabel="Inches"
          />
          <Text style={typography.bodyMuted}>in</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    width: 80,
    textAlign: 'center',
  },
});
