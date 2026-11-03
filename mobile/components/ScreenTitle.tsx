import { StyleSheet, Text, View } from 'react-native';

import { APP_NAME } from '@/lib/brand';
import { typography } from '@/lib/theme';

// A main screen's title with the app name in small gold capitals above it ("KABA / Discover").
export function ScreenTitle({ title }: { title: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="header" accessibilityLabel={title}>
      <Text style={typography.eyebrow}>{APP_NAME.toUpperCase()}</Text>
      <Text style={typography.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
  },
});
