import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

// Subscriptions through RevenueCat over App Store billing (Google Play comes later).
// The app only BUYS here. Whether someone is Premium is decided by the database: the
// revenuecat-webhook edge function sets profiles.is_premium / premium_expires_at, and every
// rule reads get_my_tier(). Never treat a purchase on the phone as Premium by itself.

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY; // public SDK key (appl_...)
export const PREMIUM_ENTITLEMENT = 'premium';

// Not in Expo Go (RevenueCat only fakes purchases there) and not on Android yet.
export const purchasesAvailable =
  Platform.OS === 'ios' && !!IOS_KEY && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let currentUser: string | null = null;

// Called whenever the signed-in member changes. RevenueCat knows each member by their Supabase
// user id, which is how the webhook finds the right profile.
export async function setPurchasesUser(userId: string | null): Promise<void> {
  if (!purchasesAvailable || userId === currentUser) return;
  try {
    if (userId && currentUser === null && !(await Purchases.isConfigured())) {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
      Purchases.configure({ apiKey: IOS_KEY as string, appUserID: userId });
    } else if (userId) {
      await Purchases.logIn(userId);
    } else if (await Purchases.isConfigured()) {
      await Purchases.logOut();
    }
    currentUser = userId;
  } catch {
    // Purchases are a convenience on top of the app; never block sign in because of them.
  }
}

export type PlanId = '1m' | '3m' | '6m';
export type Plan = {
  id: PlanId;
  months: number;
  title: string;
  price: string; // full price for the period, in the member's own currency
  perMonth: string | null; // e.g. "$6.66" for longer plans
  pkg: PurchasesPackage;
};

const PLAN_BY_TYPE: Partial<Record<PACKAGE_TYPE, { id: PlanId; months: number; title: string }>> = {
  [PACKAGE_TYPE.MONTHLY]: { id: '1m', months: 1, title: '1 month' },
  [PACKAGE_TYPE.THREE_MONTH]: { id: '3m', months: 3, title: '3 months' },
  [PACKAGE_TYPE.SIX_MONTH]: { id: '6m', months: 6, title: '6 months' },
};

// The plans in the current offering, shortest first, with prices from the App Store.
export async function fetchPlans(): Promise<Plan[]> {
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  return packages
    .map((pkg): Plan | null => {
      const meta = PLAN_BY_TYPE[pkg.packageType];
      if (!meta) return null;
      return {
        ...meta,
        price: pkg.product.priceString,
        perMonth: meta.months > 1 ? pkg.product.pricePerMonthString : null,
        pkg,
      };
    })
    .filter((p): p is Plan => p !== null)
    .sort((a, b) => a.months - b.months);
}

const hasPremium = (info: CustomerInfo) => !!info.entitlements.active[PREMIUM_ENTITLEMENT];

// 'purchased' when the App Store took payment, 'cancelled' when the member backed out.
export async function buyPlan(plan: Plan): Promise<'purchased' | 'cancelled'> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    return hasPremium(customerInfo) ? 'purchased' : 'cancelled';
  } catch (e) {
    if (isCancelled(e)) return 'cancelled';
    throw e;
  }
}

// Restores purchases made with this Apple ID (App Store requirement). True if Premium is active.
export async function restorePurchases(): Promise<boolean> {
  return hasPremium(await Purchases.restorePurchases());
}

// Opens Apple's subscription settings (change plan, cancel).
export async function manageSubscription(): Promise<void> {
  await Purchases.showManageSubscriptions();
}

function isCancelled(e: unknown): boolean {
  const err = e as { code?: string; userCancelled?: boolean | null };
  return err.userCancelled === true || err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}
