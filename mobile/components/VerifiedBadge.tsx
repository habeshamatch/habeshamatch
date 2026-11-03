import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '@/lib/theme';

// Blue tick for photo-verified members. Free for everyone; never shows who pays.
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <Ionicons
      name="checkmark-circle"
      size={size}
      color={colors.verified}
      accessibilityLabel="Photo verified"
      accessibilityRole="image"
    />
  );
}
