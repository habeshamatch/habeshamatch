import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Notice } from '@/components/FormControls';
import { friendlyError } from '@/lib/errors';
import { useSession } from '@/lib/session';
import { colors, radius, spacing, typography } from '@/lib/theme';
import { randomPose, submitVerification } from '@/lib/verification';

type Shot = { uri: string; width: number; height: number };

// Live selfie copying a random pose, taken with the front camera (never from the gallery).
// Sent with the member's photos for review; nobody else ever sees it.
export default function SelfieScreen() {
  const { session, refreshProfile } = useSession();
  const userId = session?.user.id ?? '';
  const [pose, setPose] = useState(randomPose);
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);

  const takeSelfie = async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setCameraDenied(true);
      return;
    }
    setCameraDenied(false);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.front,
      quality: 1, // compressed by us afterwards
      exif: false,
    });
    if (!result.canceled) setShot(result.assets[0]);
  };

  const submit = async () => {
    if (!shot) return;
    setBusy(true);
    setError(null);
    try {
      await submitVerification(userId, shot, pose);
      await refreshProfile();
      router.replace('/');
    } catch (e) {
      setError(friendlyError(e));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.title}>{"Verify it's you"}</Text>
        <Text style={typography.bodyMuted}>
          Every member is checked by our team before they can meet anyone. Take a quick selfie copying the pose below.
          Only our review team sees it.
        </Text>

        <View style={styles.pose} accessibilityLabel={`Pose: ${pose}`}>
          <Ionicons name="hand-left-outline" size={28} color={colors.accent} />
          <Text style={[typography.subtitle, styles.flex]}>{pose}</Text>
        </View>

        {shot ? (
          <Image source={{ uri: shot.uri }} style={styles.preview} contentFit="cover" accessibilityLabel="Your selfie" />
        ) : (
          <View style={[styles.preview, styles.placeholder]}>
            <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          </View>
        )}

        <Notice>
          Make sure your face is clearly visible, with no sunglasses or filters, and the same person as in your photos.
        </Notice>
        {cameraDenied && (
          <Notice tone="warning">
            <Text style={typography.caption}>Camera access is needed for the selfie. </Text>
            <Text style={[typography.caption, { color: colors.accent }]} onPress={() => Linking.openSettings()}>
              Open settings
            </Text>
          </Notice>
        )}
        {error && <Text style={[typography.caption, styles.error]}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        {shot ? (
          <>
            <Button label="Send for review" onPress={submit} loading={busy} />
            <Button label="Retake" variant="text" onPress={takeSelfie} disabled={busy} />
          </>
        ) : (
          <>
            <Button label="Take selfie" onPress={takeSelfie} />
            <Button label="Show a different pose" variant="text" onPress={() => setPose(randomPose())} />
          </>
        )}
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
    padding: spacing.lg,
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  pose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: colors.rose,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
});
