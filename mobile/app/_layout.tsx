import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display/500Medium';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { isPhoneVerified } from '@/lib/auth';
import { SessionProvider, useSession } from '@/lib/session';
import { colors, spacing, typography } from '@/lib/theme';

// Keep the splash screen up until fonts and the stored session are ready, so nothing flashes.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  // Only the weights we use are imported, to keep the download small.
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const { session, loading, profileStatus, refreshProfile } = useSession();
  // Once signed in with a verified phone, routing also depends on whether the profile exists.
  const needsProfileStatus = !!session && isPhoneVerified(session.user);
  const ready = (fontsLoaded || !!fontError) && !loading && !(needsProfileStatus && profileStatus === 'loading');

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  if (needsProfileStatus && profileStatus === 'error') {
    return (
      <View style={styles.error}>
        <StatusBar style="light" />
        <Text style={[typography.body, styles.errorText]}>
          {"We couldn't load your account. Check your connection and try again."}
        </Text>
        <Button label="Try again" variant="secondary" onPress={refreshProfile} />
      </View>
    );
  }

  const signedIn = !!session;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Signing in or out switches groups automatically and clears the old history. */}
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  errorText: {
    textAlign: 'center',
  },
});
