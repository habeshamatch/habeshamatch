import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Notice } from '@/components/FormControls';
import { friendlyError } from '@/lib/errors';
import { addPhoto, deletePhoto, fetchMyPhotos, MAX_PHOTOS, reorderPhotos, type MyPhoto } from '@/lib/photos';
import { useSession } from '@/lib/session';
import { colors, radius, spacing, typography } from '@/lib/theme';

const COLUMNS = 3;
const GAP = spacing.sm;

export default function PhotosScreen() {
  const { session, refreshProfile } = useSession();
  const userId = session?.user.id ?? '';
  const { width } = useWindowDimensions();
  const tileWidth = Math.floor((width - spacing.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const [photos, setPhotos] = useState<MyPhoto[] | null>(null);
  const [uploading, setUploading] = useState(0); // photos still being compressed and uploaded
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MyPhoto | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchMyPhotos(userId)
      .then((p) => {
        if (!cancelled) setPhotos(p);
      })
      .catch((e) => {
        if (!cancelled) setError(friendlyError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  // Reload the grid and the onboarding progress (photo count) after any change.
  const afterChange = useCallback(async () => {
    setReloadKey((k) => k + 1);
    await refreshProfile();
  }, [refreshProfile]);

  const count = photos?.length ?? 0;
  const free = MAX_PHOTOS - count - uploading;

  const pick = async () => {
    if (free <= 0) return;
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: free,
      quality: 1, // compressed by us afterwards
      exif: false,
    });
    if (result.canceled) return;
    const assets = result.assets.slice(0, free);
    setUploading(assets.length);
    let position = count;
    try {
      for (const asset of assets) {
        position += 1;
        await addPhoto(userId, asset, position);
        setUploading((n) => n - 1);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setUploading(0);
      await afterChange();
    }
  };

  const run = async (action: () => Promise<void>) => {
    setSelected(null);
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
      await afterChange();
    }
  };

  const move = (photo: MyPhoto, to: number) =>
    run(async () => {
      if (!photos) return;
      const ids = photos.map((p) => p.id).filter((id) => id !== photo.id);
      ids.splice(to, 0, photo.id);
      await reorderPhotos(ids);
    });

  const remove = (photo: MyPhoto) =>
    run(async () => {
      if (!photos) return;
      await deletePhoto(
        photo,
        photos.filter((p) => p.id !== photo.id).map((p) => p.id),
      );
    });

  const next = () => {
    if (count === 0) {
      setError('Add at least one photo to continue.');
      return;
    }
    router.replace('/preferences');
  };

  if (!photos) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        {error ? (
          <>
            <Text style={[typography.body, styles.centerText]}>{error}</Text>
            <Button
              label="Try again"
              variant="secondary"
              onPress={() => {
                setError(null);
                setReloadKey((k) => k + 1);
              }}
            />
          </>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </SafeAreaView>
    );
  }

  const selectedIndex = selected ? photos.findIndex((p) => p.id === selected.id) : -1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.title}>Add your photos</Text>
        <Text style={typography.bodyMuted}>
          Add up to {MAX_PHOTOS}. Your first photo is your main photo. Tap a photo to move or delete it.
        </Text>

        <View style={styles.grid}>
          {photos.map((photo, i) => (
            <Pressable
              key={photo.id}
              onPress={() => setSelected(photo)}
              style={[styles.tile, { width: tileWidth, height: tileWidth * 1.33 }]}
              accessibilityRole="button"
              accessibilityLabel={`Photo ${i + 1}${i === 0 ? ', main photo' : ''}${
                photo.status === 'pending' ? ', pending review' : photo.status === 'rejected' ? ', not approved' : ''
              }. Options`}
            >
              {photo.url ? (
                <Image
                  source={{ uri: photo.url, cacheKey: photo.storagePath }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.missing]} />
              )}
              {i === 0 && (
                <View style={[styles.badge, styles.badgeMain]}>
                  <Text style={styles.badgeMainText}>Main</Text>
                </View>
              )}
              {photo.status !== 'approved' && (
                <View style={[styles.badge, styles.badgeStatus, photo.status === 'rejected' && styles.badgeRejected]}>
                  <Text style={styles.badgeText}>{photo.status === 'pending' ? 'Pending review' : 'Not approved'}</Text>
                </View>
              )}
            </Pressable>
          ))}

          {Array.from({ length: uploading }, (_, i) => (
            <View key={`up-${i}`} style={[styles.tile, styles.empty, { width: tileWidth, height: tileWidth * 1.33 }]}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ))}

          {Array.from({ length: Math.max(free, 0) }, (_, i) => (
            <Pressable
              key={`add-${i}`}
              onPress={pick}
              disabled={busy}
              style={[styles.tile, styles.empty, { width: tileWidth, height: tileWidth * 1.33 }]}
              accessibilityRole="button"
              accessibilityLabel="Add photos"
            >
              <Text style={styles.plus}>+</Text>
            </Pressable>
          ))}
        </View>

        <Notice>
          Every photo is checked by our team before other members can see it. Use clear, recent photos of
          yourself, with your face visible in your main photo.
        </Notice>
        {photos.some((p) => p.status === 'rejected') && (
          <Notice tone="warning">
            A photo marked &quot;Not approved&quot; did not meet our guidelines and is hidden from others. You can
            delete it and add another.
          </Notice>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {error && (
          <Text style={[typography.caption, styles.error]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Button label="Continue" onPress={next} disabled={uploading > 0 || busy} loading={busy} />
      </View>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)} accessibilityLabel="Close">
          <Pressable style={styles.sheet}>
            {selected && selectedIndex > 0 && (
              <Button label="Make main photo" variant="secondary" onPress={() => move(selected, 0)} />
            )}
            {selected && selectedIndex > 1 && (
              <Button label="Move earlier" variant="secondary" onPress={() => move(selected, selectedIndex - 1)} />
            )}
            {selected && selectedIndex >= 0 && selectedIndex < photos.length - 1 && (
              <Button label="Move later" variant="secondary" onPress={() => move(selected, selectedIndex + 1)} />
            )}
            {selected && <Button label="Delete photo" variant="secondary" onPress={() => remove(selected)} />}
            <Button label="Cancel" variant="text" onPress={() => setSelected(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    marginTop: spacing.sm,
  },
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surfaceRaised,
  },
  missing: {
    backgroundColor: colors.surfaceRaised,
  },
  plus: {
    ...typography.title,
    color: colors.accent,
  },
  badge: {
    position: 'absolute',
    left: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeMain: {
    top: spacing.xs,
    backgroundColor: colors.accent,
  },
  badgeMainText: {
    ...typography.caption,
    color: colors.background,
    fontFamily: typography.button.fontFamily,
  },
  badgeStatus: {
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.surfaceRaised,
  },
  badgeRejected: {
    backgroundColor: colors.rose,
  },
  badgeText: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    fontSize: 11,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  error: {
    color: colors.rose,
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
});
