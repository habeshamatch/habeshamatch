import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Notice } from '@/components/FormControls';
import { signOut } from '@/lib/auth';
import { LINKS } from '@/lib/links';
import { useSession } from '@/lib/session';
import { colors, spacing, typography } from '@/lib/theme';

// Shown until an admin approves the member (or when their account is suspended or banned).
// Checks again whenever the app comes back to the front, and on pull to refresh.
export default function ReviewScreen() {
  const { verification, accountStatus, hasPreferences, refreshProfile } = useSession();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile(); // once approved, routing opens the app
    setRefreshing(false);
  }, [refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshProfile();
    });
    return () => sub.remove();
  }, [refreshProfile]);

  const restricted = accountStatus === 'suspended' || accountStatus === 'banned';
  const rejected = !restricted && verification.status === 'rejected';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      >
        <Ionicons
          name={restricted ? 'lock-closed-outline' : rejected ? 'alert-circle-outline' : 'time-outline'}
          size={56}
          color={rejected || restricted ? colors.rose : colors.accent}
          style={styles.center}
        />
        {restricted ? (
          <>
            <Text style={[typography.title, styles.center]}>Your account is {accountStatus}</Text>
            <Text style={[typography.bodyMuted, styles.center]}>
              You cannot use HabeshaMatch at the moment. If you think this is a mistake, please contact support.
            </Text>
            <Button label="Contact support" variant="secondary" onPress={() => Linking.openURL(LINKS.support)} />
          </>
        ) : rejected ? (
          <>
            <Text style={[typography.title, styles.center]}>Your profile needs a change</Text>
            <Notice tone="warning">{verification.reason ?? 'Our team could not approve your profile.'}</Notice>
            <Text style={[typography.bodyMuted, styles.center]}>
              Update your photos if needed, then take a new selfie to send your profile again.
            </Text>
            <Button label="Update photos" variant="secondary" onPress={() => router.push('/photos')} />
            <Button label="Take a new selfie" onPress={() => router.push('/selfie')} />
          </>
        ) : (
          <>
            <Text style={[typography.title, styles.center]}>{"We're reviewing your profile"}</Text>
            <Text style={[typography.bodyMuted, styles.center]}>
              Our team checks every member to keep HabeshaMatch real and safe. This usually takes less than a day. Pull
              down to check again.
            </Text>
            {hasPreferences ? (
              <Button label="Edit preferences" variant="secondary" onPress={() => router.push('/preferences')} />
            ) : (
              <Button label="Set your preferences" onPress={() => router.push('/preferences')} />
            )}
            <Button label="Edit photos" variant="secondary" onPress={() => router.push('/photos')} />
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Sign out" variant="text" onPress={() => signOut().catch(() => {})} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  center: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  footer: {
    padding: spacing.lg,
  },
});
