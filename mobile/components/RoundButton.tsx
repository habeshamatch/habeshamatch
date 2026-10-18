import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius } from '@/lib/theme';

// Big round ✕ / ♥ buttons under a swipe card.
export function RoundButton({
  icon,
  color,
  label,
  onPress,
}: {
  icon: 'close' | 'heart';
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.round, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Ionicons name={icon} size={32} color={color} />
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
  pressed: {
    opacity: 0.8,
  },
});
