import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { fetchMyLimits } from '@/lib/chats';
import { friendlyError } from '@/lib/errors';
import { LINKS } from '@/lib/links';
import {
  buyPlan,
  fetchPlans,
  manageSubscription,
  purchasesAvailable,
  restorePurchases,
  type Plan,
  type PlanId,
} from '@/lib/revenuecat';
import { colors, radius, spacing, typography } from '@/lib/theme';

// Benefits mirror CLAUDE.md; amounts are not repeated here because limits live in app_config.
const BENEFITS: { icon: ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'chatbubbles-outline', text: 'Start new conversations without the free daily limit' },
  { icon: 'heart-outline', text: 'See everyone who liked you' },
  { icon: 'sparkles-outline', text: 'Suggested: people looking for someone like you' },
  { icon: 'today-outline', text: 'Daily picks chosen for you' },
  { icon: 'albums-outline', text: 'More swipes every day' },
  { icon: 'arrow-undo-outline', text: 'Undo your last swipe' },
];

const BADGE: Partial<Record<PlanId, string>> = { '3m': 'Most popular', '6m': 'Best value' };

// How long to wait for the database to switch Premium on after a purchase (the webhook usually
// takes a few seconds).
const ACTIVATION_TRIES = 10;
const ACTIVATION_INTERVAL_MS = 2000;

type Stage = 'choose' | 'activating' | 'active' | 'pending';

// Premium paywall. Prices come from the App Store via RevenueCat (never hardcoded). Buying only
// takes payment; the database decides Premium once RevenueCat's webhook arrives, so after a
// purchase we wait for get_my_tier() to say premium.
export default function Paywall() {
  const queryClient = useQueryClient();
  const limits = useQuery({ queryKey: ['my-limits'], queryFn: fetchMyLimits });
  const plans = useQuery({ queryKey: ['plans'], queryFn: fetchPlans, enabled: purchasesAvailable });
  const [selected, setSelected] = useState<PlanId>('3m');
  const [stage, setStage] = useState<Stage>('choose');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPremium = limits.data?.tier === 'premium';
  const plan = plans.data?.find((p) => p.id === selected) ?? plans.data?.[0];

  // Polls the database until the webhook has switched Premium on, then refreshes everything.
  const waitForPremium = async () => {
    setStage('activating');
    for (let i = 0; i < ACTIVATION_TRIES; i++) {
      const l = await fetchMyLimits().catch(() => null);
      if (l?.tier === 'premium') {
        queryClient.setQueryData(['my-limits'], l);
        queryClient.invalidateQueries(); // every Premium list and limit changes
        setStage('active');
        return;
      }
      await new Promise((r) => setTimeout(r, ACTIVATION_INTERVAL_MS));
    }
    setStage('pending');
  };

  const buy = async () => {
    if (!plan) return;
    setBusy('buy');
    setError(null);
    try {
      if ((await buyPlan(plan)) === 'purchased') await waitForPremium();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    setError(null);
    try {
      if (await restorePurchases()) await waitForPremium();
      else setError('No Premium subscription was found for this Apple ID.');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const close = () => router.back();

  if (stage === 'activating' || stage === 'active' || stage === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          {stage === 'activating' ? (
            <>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={[typography.subtitle, styles.centerText]}>Switching on Premium…</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={56} color={colors.accent} />
              <Text style={[typography.title, styles.centerText]}>
                {stage === 'active' ? 'Welcome to Premium' : 'Thank you!'}
              </Text>
              <Text style={[typography.bodyMuted, styles.centerText]}>
                {stage === 'active'
                  ? 'Everything is unlocked. Enjoy meeting more people.'
                  : 'Your purchase went through. Premium switches on within a minute; pull to refresh in a moment.'}
              </Text>
              <Button label="Done" onPress={close} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.display}>Premium</Text>
        <Text style={typography.bodyMuted}>Meet more people, faster.</Text>
        <View style={styles.list}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.row}>
              <Ionicons name={b.icon} size={22} color={colors.accent} />
              <Text style={[typography.body, styles.flex]}>{b.text}</Text>
            </View>
          ))}
        </View>

        {isPremium ? (
          <View style={styles.note}>
            <Text style={typography.subtitle}>{"You're Premium"}</Text>
            <Text style={typography.bodyMuted}>Change your plan or cancel any time in your Apple ID settings.</Text>
            {purchasesAvailable && (
              <Button label="Manage subscription" variant="secondary" onPress={() => manageSubscription().catch(() => {})} />
            )}
          </View>
        ) : !purchasesAvailable ? (
          <Text style={[typography.caption, styles.note]}>
            Subscriptions are available in the App Store version of the app. Your blue tick stays free, and nobody can
            see who pays.
          </Text>
        ) : plans.isPending ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : plans.isError || !plans.data?.length ? (
          <View style={styles.note}>
            <Text style={typography.bodyMuted}>
              {plans.isError ? friendlyError(plans.error) : 'Plans are not available right now.'}
            </Text>
            <Button label="Try again" variant="secondary" onPress={() => plans.refetch()} />
          </View>
        ) : (
          <View style={styles.plans}>
            {plans.data.map((p) => (
              <PlanCard key={p.id} plan={p} selected={p.id === plan?.id} onPress={() => setSelected(p.id)} />
            ))}
          </View>
        )}

        {error && <Text style={[typography.caption, styles.error]}>{error}</Text>}

        {!isPremium && purchasesAvailable && (
          <Text style={[typography.caption, styles.fine]}>
            Payment is charged to your Apple ID when you confirm. The subscription renews automatically for the same
            period and price unless you cancel at least 24 hours before it ends. Manage or cancel in your Apple ID
            settings. Your blue tick stays free, and nobody can see who pays.
          </Text>
        )}
        <View style={styles.links}>
          <Text style={[typography.caption, styles.link]} onPress={() => Linking.openURL(LINKS.terms)}>
            Terms of use
          </Text>
          <Text style={[typography.caption, styles.link]} onPress={() => Linking.openURL(LINKS.privacy)}>
            Privacy policy
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!isPremium && purchasesAvailable && plan && (
          <>
            <Button label={`Continue · ${plan.price}`} onPress={buy} loading={busy === 'buy'} disabled={busy !== null} />
            <Button label="Restore purchases" variant="text" onPress={restore} loading={busy === 'restore'} disabled={busy !== null} />
          </>
        )}
        <Button label={isPremium ? 'Close' : 'Not now'} variant="secondary" onPress={close} disabled={busy !== null} />
      </View>
    </SafeAreaView>
  );
}

function PlanCard({ plan, selected, onPress }: { plan: Plan; selected: boolean; onPress: () => void }) {
  const badge = BADGE[plan.id];
  return (
    <Pressable
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.title}, ${plan.price}${plan.perMonth ? `, ${plan.perMonth} a month` : ''}${badge ? `, ${badge}` : ''}`}
    >
      <View style={styles.flex}>
        <View style={styles.planTop}>
          <Text style={[typography.body, styles.planTitle]}>{plan.title}</Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {plan.perMonth && <Text style={typography.caption}>{`${plan.perMonth} a month`}</Text>}
      </View>
      <Text style={[typography.body, styles.planTitle]}>{plan.price}</Text>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.accent : colors.textMuted}
      />
    </Pressable>
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
  list: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  plans: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceRaised,
    backgroundColor: colors.surface,
  },
  planSelected: {
    borderColor: colors.accent,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planTitle: {
    fontFamily: typography.button.fontFamily,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.background,
    fontFamily: typography.button.fontFamily,
  },
  note: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  loading: {
    marginTop: spacing.lg,
  },
  error: {
    color: colors.rose,
  },
  fine: {
    marginTop: spacing.sm,
  },
  links: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  link: {
    color: colors.accent,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
});
