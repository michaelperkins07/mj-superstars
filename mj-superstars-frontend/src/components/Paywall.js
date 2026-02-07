// ============================================================
// MJ's Superstars - Paywall / Subscription Screen
// Beautiful paywall with plan selection and purchase flow
// TODO: Wire up payment processor (RevenueCat/StoreKit2) before enabling
// TODO: Not currently in navigation — add when IAP is fully integrated
// ============================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useSubscription,
  PRODUCTS,
  PRODUCT_DETAILS,
  PREMIUM_FEATURES,
  FREE_LIMITS
} from '../services/subscription';
import { trackSubscriptionViewed } from '../services/analytics';
import { useHapticsHook } from '../services/haptics';

// ============================================================
// FEATURE COMPARISON DATA
// ============================================================

const FEATURE_COMPARISON = [
  {
    name: 'AI Conversations',
    free: '10/day',
    premium: 'Unlimited',
    icon: '💬'
  },
  {
    name: 'Mood Tracking',
    free: '3/day',
    premium: 'Unlimited',
    icon: '📊'
  },
  {
    name: 'Journal Entries',
    free: '3/week',
    premium: 'Unlimited',
    icon: '📝'
  },
  {
    name: 'Coping Tools',
    free: 'Breathing only',
    premium: 'All 5 tools',
    icon: '🧘'
  },
  {
    name: 'Insights History',
    free: '7 days',
    premium: 'Full year',
    icon: '📈'
  },
  {
    name: 'Apple Watch',
    free: false,
    premium: true,
    icon: '⌚'
  },
  {
    name: 'HealthKit Integration',
    free: false,
    premium: true,
    icon: '❤️'
  },
  {
    name: 'Export Your Data',
    free: false,
    premium: true,
    icon: '📤'
  },
  {
    name: 'Custom Reminders',
    free: false,
    premium: true,
    icon: '🔔'
  },
  {
    name: 'Priority Support',
    free: false,
    premium: true,
    icon: '⭐'
  }
];

// ============================================================
// PLAN CARD COMPONENT
// ============================================================

function PlanCard({ plan, isSelected, onSelect, isPopular }) {
  const haptics = useHapticsHook();

  const handleSelect = () => {
    haptics.selection();
    onSelect(plan.id);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={handleSelect}
      className={`relative w-full p-4 rounded-2xl border-2 transition-all text-left ${
        isSelected
          ? 'bg-sky-500/20 border-sky-500'
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          MOST POPULAR
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-white font-semibold">{plan.name}</h3>
          {plan.savings && (
            <span className="text-emerald-400 text-sm font-medium">Save {plan.savings}</span>
          )}
        </div>

        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
          isSelected ? 'border-sky-500 bg-sky-500' : 'border-slate-500'
        }`}>
          {isSelected && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{plan.localizedPrice || plan.price}</span>
        <span className="text-slate-400">/{plan.period}</span>
      </div>

      {plan.trialDays > 0 && (
        <div className="mt-2 text-sm text-sky-300">
          {plan.trialDays}-day free trial
        </div>
      )}
    </motion.button>
  );
}

// ============================================================
// FEATURE ROW COMPONENT
// ============================================================

function FeatureRow({ feature }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-xl">{feature.icon}</span>
        <span className="text-slate-300">{feature.name}</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Free column */}
        <div className="w-20 text-center">
          {typeof feature.free === 'boolean' ? (
            feature.free ? (
              <span className="text-emerald-400">✓</span>
            ) : (
              <span className="text-slate-600">—</span>
            )
          ) : (
            <span className="text-slate-400 text-sm">{feature.free}</span>
          )}
        </div>

        {/* Premium column */}
        <div className="w-20 text-center">
          {typeof feature.premium === 'boolean' ? (
            feature.premium ? (
              <span className="text-emerald-400 text-lg">✓</span>
            ) : (
              <span className="text-slate-600">—</span>
            )
          ) : (
            <span className="text-white text-sm font-medium">{feature.premium}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAYWALL COMPONENT
// ============================================================

export function Paywall({ onClose, onSuccess, trigger = 'general' }) {
  const { products, isPremium, purchase, restore, isLoading } = useSubscription();
  const haptics = useHapticsHook();

  const [selectedPlan, setSelectedPlan] = useState(PRODUCTS.YEARLY);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);

  // Track view
  useEffect(() => {
    trackSubscriptionViewed();
  }, []);

  // Get plan details
  const plans = products.length > 0 ? products : Object.values(PRODUCT_DETAILS);
  const monthlyPlan = plans.find(p => p.id === PRODUCTS.MONTHLY);
  const yearlyPlan = plans.find(p => p.id === PRODUCTS.YEARLY);

  // Handle purchase
  const handlePurchase = async () => {
    setError(null);
    setPurchasing(true);
    haptics.buttonPress();

    try {
      const result = await purchase(selectedPlan);
      if (result.success) {
        haptics.success();
        onSuccess?.();
      } else if (result.cancelled) {
        // User cancelled, do nothing
      }
    } catch (err) {
      haptics.error();
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  // Handle restore
  const handleRestore = async () => {
    setError(null);
    setRestoring(true);

    try {
      const result = await restore();
      if (result.restored) {
        haptics.success();
        onSuccess?.();
      } else {
        setError('No previous purchases found.');
      }
    } catch (err) {
      setError('Restore failed. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  // Already premium
  if (isPremium) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-6xl mb-4"
        >
          ⭐
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">You're Premium!</h2>
        <p className="text-slate-400 mb-6">Enjoy all the features.</p>
        <button
          onClick={onClose}
          className="bg-sky-500 text-white font-semibold py-3 px-6 rounded-xl"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-lg p-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="text-sky-400 text-sm font-medium"
        >
          {restoring ? 'Restoring...' : 'Restore'}
        </button>
      </div>

      {/* Hero */}
      <div className="px-6 pt-4 pb-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 bg-gradient-to-br from-sky-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/30"
        >
          <span className="text-4xl">✨</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Unlock Your Full Potential
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-slate-400"
        >
          Get unlimited access to all premium features
        </motion.p>
      </div>

      {/* Plan Selection */}
      <div className="px-6 mb-6">
        <div className="space-y-3">
          {yearlyPlan && (
            <PlanCard
              plan={yearlyPlan}
              isSelected={selectedPlan === PRODUCTS.YEARLY}
              onSelect={setSelectedPlan}
              isPopular={true}
            />
          )}
          {monthlyPlan && (
            <PlanCard
              plan={monthlyPlan}
              isSelected={selectedPlan === PRODUCTS.MONTHLY}
              onSelect={setSelectedPlan}
            />
          )}
        </div>
      </div>

      {/* Premium Benefits Preview */}
      <div className="px-6 mb-6">
        <div className="bg-slate-800/50 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Premium includes:</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '💬', text: 'Unlimited conversations' },
              { icon: '📊', text: 'Full mood history' },
              { icon: '🧘', text: 'All coping tools' },
              { icon: '⌚', text: 'Apple Watch app' },
              { icon: '❤️', text: 'Health integration' },
              { icon: '⭐', text: 'Priority support' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-slate-300 text-sm">{item.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowFeatures(!showFeatures)}
            className="w-full mt-4 text-sky-400 text-sm font-medium flex items-center justify-center gap-1"
          >
            {showFeatures ? 'Hide' : 'See all'} features
            <svg
              className={`w-4 h-4 transition-transform ${showFeatures ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Feature Comparison */}
      <AnimatePresence>
        {showFeatures && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 mb-6 overflow-hidden"
          >
            <div className="bg-slate-800/50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Compare Plans</h3>
                <div className="flex gap-6 text-sm">
                  <span className="w-20 text-center text-slate-400">Free</span>
                  <span className="w-20 text-center text-sky-400 font-medium">Premium</span>
                </div>
              </div>

              <div className="space-y-1">
                {FEATURE_COMPARISON.map((feature, i) => (
                  <FeatureRow key={i} feature={feature} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-6 mb-4"
          >
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-300 text-center">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchase Button */}
      <div className="sticky bottom-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent p-6 pt-8">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handlePurchase}
          disabled={purchasing || isLoading}
          className="w-full bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-400 hover:to-purple-400 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl text-lg shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2"
        >
          {purchasing ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              Start Free Trial
            </>
          )}
        </motion.button>

        <p className="text-center text-slate-500 text-xs mt-3">
          {selectedPlan === PRODUCTS.YEARLY
            ? '14-day free trial, then $79.99/year. Cancel anytime.'
            : '7-day free trial, then $9.99/month. Cancel anytime.'
          }
        </p>

        <div className="flex justify-center gap-4 mt-4">
          <a href="#" className="text-slate-500 text-xs hover:text-slate-400">Terms</a>
          <a href="#" className="text-slate-500 text-xs hover:text-slate-400">Privacy</a>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// UPGRADE PROMPT COMPONENT
// ============================================================

export function UpgradePrompt({ feature, onUpgrade, onClose }) {
  const haptics = useHapticsHook();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-slate-800 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md mx-4 sm:mb-4"
      >
        <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-6 sm:hidden" />

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            Unlock {feature}
          </h3>

          <p className="text-slate-400">
            This feature is available with Premium. Upgrade to get unlimited access.
          </p>
        </div>

        <button
          onClick={() => {
            haptics.buttonPress();
            onUpgrade();
          }}
          className="w-full bg-gradient-to-r from-sky-500 to-purple-500 text-white font-semibold py-4 rounded-xl mb-3"
        >
          Upgrade to Premium
        </button>

        <button
          onClick={onClose}
          className="w-full text-slate-400 py-2"
        >
          Maybe Later
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// USAGE LIMIT BANNER
// ============================================================

export function UsageLimitBanner({ feature, used, limit, onUpgrade }) {
  const remaining = limit - used;
  const percentage = (used / limit) * 100;

  if (remaining > limit * 0.3) return null; // Only show when < 30% remaining

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 mb-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-amber-200 font-medium">
          {remaining === 0 ? 'Limit reached' : `${remaining} ${feature} remaining`}
        </span>
        <button
          onClick={onUpgrade}
          className="text-amber-400 text-sm font-medium"
        >
          Upgrade
        </button>
      </div>

      <div className="h-2 bg-amber-900/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            remaining === 0 ? 'bg-red-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </motion.div>
  );
}

export default Paywall;
