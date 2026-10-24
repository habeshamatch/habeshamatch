import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius } from '@/lib/theme';

// Round buttons under a swipe card: big ✕ / ♥, and a small undo.
export function RoundButton({
  icon,
  color,
  label,
  onPress,
  small = false,
  disabled = false,
}: {
  icon: 'close' | 'heart' | 'arrow-undo';
  color: string;
  label: string;
  onPress: () => void;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.round, small && styles.small, pressed && styles.pressed, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
    >
      <Ionicons name={icon} size={small ? 22 : 32} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceRaised,
  },
  small: {
    width: 48,
    height: 48,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.35,
  },
});
