import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { fetchMyPhotos } from '@/lib/photos';
import { useSession } from '@/lib/session';
import { colors, radius, spacing, typography } from '@/lib/theme';

export type Match = { name: string; photoUrl: string | null; conversationId: string };

// "It's a match!" after a mutual like, from the Swipe tab or the Liked you screen.
export function MatchModal({ match, onClose }: { match: Match | null; onClose: () => void }) {
  const { session } = useSession();
  const myId = session?.user.id ?? '';
  const myPhotos = useQuery({ queryKey: ['my-photos', myId], queryFn: () => fetchMyPhotos(myId), enabled: !!match });

  return (
    <Modal visible={!!match} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {match && (
          <View style={styles.box}>
            <Text style={[typography.display, styles.center, { color: colors.accent }]}>{"It's a match!"}</Text>
            <Text style={[typography.body, styles.center]}>{`You and ${match.name} liked each other.`}</Text>
            <View style={styles.pair}>
              <Avatar url={myPhotos.data?.[0]?.url ?? null} name="You" size={96} />
              <Ionicons name="heart" size={32} color={colors.rose} />
              <Avatar url={match.photoUrl} name={match.name} size={96} />
            </View>
            <Text style={[typography.caption, styles.center]}>This chat does not use one of your daily new chats.</Text>
            <Button
              label="Send a message"
              onPress={() => {
                const id = match.conversationId;
                onClose();
                router.push(`/chat/${id}`);
              }}
            />
            <Button label="Keep swiping" variant="text" onPress={onClose} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.overlay,
  },
  box: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  center: {
    textAlign: 'center',
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
});
