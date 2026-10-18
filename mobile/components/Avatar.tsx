import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/lib/theme';

// Round photo (thumbnail) with the first letter of the name as a fallback.
export function Avatar({ url, cacheKey, name, size }: { url: string | null; cacheKey?: string; name: string; size: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    return <Image source={{ uri: url, cacheKey }} style={[styles.base, shape]} contentFit="cover" transition={100} />;
  }
  return (
    <View style={[styles.base, styles.initialBox, shape]}>
      <Text style={[typography.subtitle, { fontSize: size * 0.4 }]}>{name.slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceRaised,
  },
  initialBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
