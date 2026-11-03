import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '@/lib/theme';

// Blue tick for photo-verified members. Free for everyone; never shows who pays.
// onBrand: on a blue frame (photo tiles), where the usual blue would not show.
export function VerifiedBadge({ size = 16, onBrand = false }: { size?: number; onBrand?: boolean }) {
  return (
    <Ionicons
      name="checkmark-circle"
      size={size}
      color={onBrand ? colors.verifiedOnBrand : colors.verified}
      accessibilityLabel="Photo verified"
      accessibilityRole="image"
    />
  );
}
