// ============================================================
// MJ's Superstars - Subscription Service
// StoreKit 2 integration for iOS subscriptions
// ============================================================

import { isNative } from './native';
import {
  trackSubscriptionViewed,
  trackSubscriptionStarted,
  trackSubscriptionCanceled,
  trackTrialStarted,
  trackTrialConverted
} from './analytics';

// ============================================================
// PRODUCT IDS
// ============================================================

export const PRODUCTS = {
  MONTHLY: 'com.mjsuperstars.premium.monthly',
  YEARLY: 'com.mjsuperstars.premium.yearly'
};

export const PRODUCT_DETAILS = {
  [PRODUCTS.MONTHLY]: {
    id: PRODUCTS.MONTHLY,
    name: 'Premium Monthly',
    price: '$9.99',
    priceValue: 9.99,
    period: 'month',
    trialDays: 7,
    features: ['Unlimited AI conversations', 'Advanced insights', 'Priority support']
  },
  [PRODUCTS.YEARLY]: {
    id: PRODUCTS.YEARLY,
    name: 'Premium Yearly',
    price: '$79.99',
    priceValue: 79.99,
    period: 'year',
    trialDays: 14,
    savings: '33%',
    features: ['Everything in Monthly', '2 months free', 'Exclusive content']
  }
};

// ============================================================
// FREE TIER LIMITS
// ============================================================

export const FREE_LIMITS = {
  MESSAGES_PER_DAY: 10,
  MOOD_LOGS_PER_DAY: 3,
  JOURNAL_ENTRIES_PER_WEEK: 3,
  COPING_TOOLS: ['breathing'], // Only basic breathing in free tier
  INSIGHTS_DAYS: 7, // Only 7-day insights
  WATCH_APP: false,
  HEALTH_INTEGRATION: false,
  EXPORT_DATA: false,
  CUSTOM_REMINDERS: false
};

export const PREMIUM_FEATURES = {
  MESSAGES_PER_DAY: Infinity,
  MOOD_LOGS_PER_DAY: Infinity,
  JOURNAL_ENTRIES_PER_WEEK: Infinity,
  COPING_TOOLS: ['breathing', 'grounding', 'visualization', 'progressive_relaxation', 'affirmations'],
  INSIGHTS_DAYS: 365,
  WATCH_APP: true,
  HEALTH_INTEGRATION: true,
  EXPORT_DATA: true,
  CUSTOM_REMINDERS: true
};

// ============================================================
// SUBSCRIPTION STATE
// ============================================================

let subscriptionState = {
  isLoading: true,
  isPremium: false,
  subscription: null,
  products: [],
  error: null
};

let stateListeners = [];

function notifyListeners() {
  stateListeners.forEach(listener => listener(subscriptionState));
}

export function subscribeToState(listener) {
  stateListeners.push(listener);
  listener(subscriptionState);
  return () => {
    stateListeners = stateListeners.filter(l => l !== listener);
  };
}

function updateState(updates) {
  subscriptionState = { ...subscriptionState, ...updates };
  notifyListeners();

  // Persist to storage
  localStorage.setItem('mj_subscription_state', JSON.stringify({
    isPremium: subscriptionState.isPremium,
    subscription: subscriptionState.subscription
  }));
}

// ============================================================
// STOREKIT BRIDGE
// ============================================================

function getStoreKit() {
  if (!isNative) return null;
  return window.Capacitor?.Plugins?.InAppPurchase;
}

/**
 * Initialize the subscription system
 */
export async function initSubscription() {
  // Load cached state first
  try {
    const cached = localStorage.getItem('mj_subscription_state');
    if (cached) {
      const { isPremium, subscription } = JSON.parse(cached);
      updateState({ isPremium, subscription });
    }
  } catch (e) {
    // Ignore parse errors
  }

  const storeKit = getStoreKit();

  if (!storeKit) {
    // Web fallback - check with backend
    await checkSubscriptionWithBackend();
    updateState({ isLoading: false });
    return;
  }

  try {
    // Initialize StoreKit
    await storeKit.initialize();

    // Load products
    const products = await storeKit.getProducts({
      productIds: Object.values(PRODUCTS)
    });

    // Check current entitlements
    const entitlements = await storeKit.getCurrentEntitlements();
    const activeSubscription = entitlements.find(e =>
      e.productId.includes('premium') && e.isActive
    );

    updateState({
      isLoading: false,
      isPremium: !!activeSubscription,
      subscription: activeSubscription ? {
        productId: activeSubscription.productId,
        expirationDate: activeSubscription.expirationDate,
        isTrialPeriod: activeSubscription.isTrialPeriod,
        willAutoRenew: activeSubscription.willAutoRenew
      } : null,
      products: products.map(p => ({
        ...PRODUCT_DETAILS[p.productId],
        localizedPrice: p.localizedPrice,
        priceValue: p.price
      }))
    });

    // Listen for transaction updates
    storeKit.addListener('transactionUpdate', handleTransactionUpdate);

  } catch (err) {
    console.error('[Subscription] Init error:', err);
    updateState({ isLoading: false, error: err.message });
  }
}

/**
 * Handle StoreKit transaction updates
 */
async function handleTransactionUpdate(transaction) {
  console.log('[Subscription] Transaction update:', transaction);

  if (transaction.transactionState === 'purchased' || transaction.transactionState === 'restored') {
    updateState({
      isPremium: true,
      subscription: {
        productId: transaction.productId,
        expirationDate: transaction.expirationDate,
        isTrialPeriod: transaction.isTrialPeriod,
        willAutoRenew: true
      }
    });

    // Track the event
    if (transaction.isTrialPeriod) {
      trackTrialStarted(transaction.productId.includes('yearly') ? 'yearly' : 'monthly');
    } else {
      trackSubscriptionStarted({
        plan: transaction.productId.includes('yearly') ? 'yearly' : 'monthly',
        price: transaction.price,
        isTrial: false
      });
    }

    // Sync with backend
    await syncSubscriptionWithBackend(transaction);
  }
}

/**
 * Check subscription status with backend (for web)
 */
async function checkSubscriptionWithBackend() {
  try {
    const token = localStorage.getItem('mj_auth_token');
    if (!token) return;

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/subscription/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      updateState({
        isPremium: data.isPremium,
        subscription: data.subscription
      });
    }
  } catch (err) {
    console.error('[Subscription] Backend check error:', err);
  }
}

/**
 * Sync subscription with backend after purchase
 */
async function syncSubscriptionWithBackend(transaction) {
  try {
    const token = localStorage.getItem('mj_auth_token');
    if (!token) return;

    await fetch(`${process.env.REACT_APP_API_URL}/api/subscription/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: transaction.productId,
        transactionId: transaction.transactionId,
        originalTransactionId: transaction.originalTransactionId,
        receipt: transaction.receipt
      })
    });
  } catch (err) {
    console.error('[Subscription] Sync error:', err);
  }
}

// ============================================================
// PURCHASE FUNCTIONS
// ============================================================

/**
 * Purchase a subscription
 */
export async function purchaseSubscription(productId) {
  const storeKit = getStoreKit();

  if (!storeKit) {
    throw new Error('In-app purchases are only available in the iOS app');
  }

  try {
    const result = await storeKit.purchase({ productId });

    if (result.transactionState === 'purchased') {
      return { success: true };
    } else if (result.transactionState === 'cancelled') {
      return { success: false, cancelled: true };
    } else {
      throw new Error('Purchase failed');
    }
  } catch (err) {
    console.error('[Subscription] Purchase error:', err);
    throw err;
  }
}

/**
 * Restore purchases
 */
export async function restorePurchases() {
  const storeKit = getStoreKit();

  if (!storeKit) {
    // Web: Check with backend
    await checkSubscriptionWithBackend();
    return { restored: subscriptionState.isPremium };
  }

  try {
    await storeKit.restorePurchases();

    // Re-check entitlements
    const entitlements = await storeKit.getCurrentEntitlements();
    const activeSubscription = entitlements.find(e =>
      e.productId.includes('premium') && e.isActive
    );

    updateState({
      isPremium: !!activeSubscription,
      subscription: activeSubscription ? {
        productId: activeSubscription.productId,
        expirationDate: activeSubscription.expirationDate,
        isTrialPeriod: activeSubscription.isTrialPeriod,
        willAutoRenew: activeSubscription.willAutoRenew
      } : null
    });

    return { restored: !!activeSubscription };
  } catch (err) {
    console.error('[Subscription] Restore error:', err);
    throw err;
  }
}

/**
 * Manage subscription (opens App Store subscriptions)
 */
export async function manageSubscription() {
  const storeKit = getStoreKit();

  if (storeKit) {
    await storeKit.manageSubscriptions();
  } else {
    // Web: Open App Store subscriptions page
    window.open('https://apps.apple.com/account/subscriptions', '_blank');
  }
}

// ============================================================
// FEATURE ACCESS
// ============================================================

/**
 * Check if a feature is available
 */
export function hasFeatureAccess(featureName) {
  if (subscriptionState.isPremium) {
    return PREMIUM_FEATURES[featureName] !== undefined
      ? PREMIUM_FEATURES[featureName]
      : true;
  }
  return FREE_LIMITS[featureName] !== undefined
    ? FREE_LIMITS[featureName]
    : false;
}

/**
 * Get limit for a feature
 */
export function getFeatureLimit(featureName) {
  if (subscriptionState.isPremium) {
    return PREMIUM_FEATURES[featureName];
  }
  return FREE_LIMITS[featureName];
}

/**
 * Check if user has used up their free limit
 */
export function checkUsageLimit(featureName, currentUsage) {
  const limit = getFeatureLimit(featureName);

  if (limit === Infinity || limit === true) {
    return { allowed: true, remaining: Infinity };
  }

  if (typeof limit === 'number') {
    return {
      allowed: currentUsage < limit,
      remaining: Math.max(0, limit - currentUsage),
      limit
    };
  }

  if (Array.isArray(limit)) {
    return {
      allowed: limit.length > 0,
      items: limit
    };
  }

  return { allowed: !!limit };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get current subscription state
 */
export function getSubscriptionState() {
  return subscriptionState;
}

/**
 * Check if user is premium
 */
export function isPremium() {
  return subscriptionState.isPremium;
}

/**
 * Check if user is on trial
 */
export function isOnTrial() {
  return subscriptionState.subscription?.isTrialPeriod || false;
}

/**
 * Get subscription expiration date
 */
export function getExpirationDate() {
  if (!subscriptionState.subscription?.expirationDate) return null;
  return new Date(subscriptionState.subscription.expirationDate);
}

/**
 * Get days remaining in subscription
 */
export function getDaysRemaining() {
  const expiration = getExpirationDate();
  if (!expiration) return null;

  const now = new Date();
  const diffTime = expiration.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format price with period
 */
export function formatPrice(productId) {
  const product = subscriptionState.products.find(p => p.id === productId) ||
    PRODUCT_DETAILS[productId];

  if (!product) return '';

  const price = product.localizedPrice || product.price;
  return `${price}/${product.period === 'year' ? 'year' : 'mo'}`;
}

// ============================================================
// REACT HOOK
// ============================================================

export function useSubscription() {
  const [state, setState] = React.useState(subscriptionState);

  React.useEffect(() => {
    return subscribeToState(setState);
  }, []);

  return {
    ...state,
    isPremium: state.isPremium,
    isOnTrial: isOnTrial(),
    daysRemaining: getDaysRemaining(),
    purchase: purchaseSubscription,
    restore: restorePurchases,
    manage: manageSubscription,
    hasFeature: hasFeatureAccess,
    checkLimit: checkUsageLimit
  };
}

// Need to import React for the hook
import React from 'react';

export default {
  init: initSubscription,
  purchase: purchaseSubscription,
  restore: restorePurchases,
  manage: manageSubscription,
  isPremium,
  isOnTrial,
  hasFeature: hasFeatureAccess,
  checkLimit: checkUsageLimit,
  getState: getSubscriptionState,
  subscribe: subscribeToState,
  useSubscription,
  PRODUCTS,
  PRODUCT_DETAILS,
  FREE_LIMITS,
  PREMIUM_FEATURES
};
