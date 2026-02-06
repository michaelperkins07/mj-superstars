// ============================================================
// MJ's Superstars - Haptic Feedback Service
// Provides consistent haptic patterns throughout the app
// ============================================================

import { HapticsService, isNative } from './native';

// Check if haptics are available
const isHapticsAvailable = () => {
  // Native app
  if (isNative) return true;

  // Web Vibration API fallback
  return 'vibrate' in navigator;
};

// Store user preference
let hapticsEnabled = true;

/**
 * Enable or disable haptic feedback
 */
export function setHapticsEnabled(enabled) {
  hapticsEnabled = enabled;
  localStorage.setItem('mj_haptics_enabled', JSON.stringify(enabled));
}

/**
 * Check if haptics are enabled
 */
export function getHapticsEnabled() {
  const stored = localStorage.getItem('mj_haptics_enabled');
  if (stored !== null) {
    hapticsEnabled = JSON.parse(stored);
  }
  return hapticsEnabled;
}

/**
 * Trigger haptic feedback with fallback
 */
async function trigger(pattern) {
  if (!hapticsEnabled || !isHapticsAvailable()) return;

  try {
    if (isNative) {
      await pattern.native();
    } else {
      // Web fallback using Vibration API
      if (pattern.web) {
        navigator.vibrate(pattern.web);
      }
    }
  } catch (err) {
    console.warn('Haptic feedback failed:', err);
  }
}

// ============================================================
// HAPTIC PATTERNS
// ============================================================

/**
 * Light tap - for selections, toggles
 */
export async function light() {
  await trigger({
    native: () => HapticsService.light(),
    web: 10
  });
}

/**
 * Medium tap - for confirmations
 */
export async function medium() {
  await trigger({
    native: () => HapticsService.medium(),
    web: 20
  });
}

/**
 * Heavy tap - for important actions
 */
export async function heavy() {
  await trigger({
    native: () => HapticsService.heavy(),
    web: 40
  });
}

/**
 * Success feedback - for completed actions
 */
export async function success() {
  await trigger({
    native: () => HapticsService.success(),
    web: [10, 50, 10]
  });
}

/**
 * Warning feedback - for caution states
 */
export async function warning() {
  await trigger({
    native: () => HapticsService.warning(),
    web: [20, 30, 20]
  });
}

/**
 * Error feedback - for failures
 */
export async function error() {
  await trigger({
    native: () => HapticsService.error(),
    web: [50, 100, 50, 100, 50]
  });
}

/**
 * Selection changed - for pickers, sliders
 */
export async function selection() {
  await trigger({
    native: () => HapticsService.selection(),
    web: 5
  });
}

// ============================================================
// COMPOUND PATTERNS
// ============================================================

/**
 * Mood logged pattern - gentle pulse
 */
export async function moodLogged() {
  await success();
}

/**
 * Achievement unlocked - celebration pattern
 */
export async function achievementUnlocked() {
  if (!hapticsEnabled || !isHapticsAvailable()) return;

  if (isNative) {
    // Triple success pattern
    await HapticsService.success();
    await new Promise(r => setTimeout(r, 150));
    await HapticsService.success();
    await new Promise(r => setTimeout(r, 150));
    await HapticsService.heavy();
  } else {
    navigator.vibrate([20, 80, 20, 80, 40]);
  }
}

/**
 * Streak milestone - building intensity
 */
export async function streakMilestone() {
  if (!hapticsEnabled || !isHapticsAvailable()) return;

  if (isNative) {
    await HapticsService.light();
    await new Promise(r => setTimeout(r, 100));
    await HapticsService.medium();
    await new Promise(r => setTimeout(r, 100));
    await HapticsService.heavy();
  } else {
    navigator.vibrate([10, 50, 20, 50, 40]);
  }
}

/**
 * Task completed - satisfying tick
 */
export async function taskCompleted() {
  await trigger({
    native: () => HapticsService.success(),
    web: [15, 30, 15]
  });
}

/**
 * Message sent - subtle confirmation
 */
export async function messageSent() {
  await light();
}

/**
 * Notification received - attention getter
 */
export async function notificationReceived() {
  await trigger({
    native: () => HapticsService.warning(),
    web: [20, 50, 20]
  });
}

/**
 * Button press - standard interaction
 */
export async function buttonPress() {
  await light();
}

/**
 * Long press activated
 */
export async function longPress() {
  await medium();
}

/**
 * Slider tick - for each step
 */
export async function sliderTick() {
  await selection();
}

/**
 * Pull to refresh activated
 */
export async function pullToRefresh() {
  await medium();
}

/**
 * Swipe action completed
 */
export async function swipeAction() {
  await trigger({
    native: () => HapticsService.medium(),
    web: 15
  });
}

/**
 * Error shake - pairs with visual shake
 */
export async function errorShake() {
  await error();
}

/**
 * Breathing exercise tick - gentle rhythm
 */
export async function breathingTick() {
  await trigger({
    native: () => HapticsService.light(),
    web: 8
  });
}

/**
 * Breathing phase change
 */
export async function breathingPhaseChange() {
  await trigger({
    native: () => HapticsService.medium(),
    web: 15
  });
}

/**
 * Timer complete
 */
export async function timerComplete() {
  if (!hapticsEnabled || !isHapticsAvailable()) return;

  if (isNative) {
    await HapticsService.heavy();
    await new Promise(r => setTimeout(r, 200));
    await HapticsService.heavy();
  } else {
    navigator.vibrate([40, 100, 40]);
  }
}

/**
 * Page transition - subtle feedback
 */
export async function pageTransition() {
  // Very subtle - only on native
  if (isNative && hapticsEnabled) {
    await HapticsService.selection();
  }
}

/**
 * Modal opened
 */
export async function modalOpen() {
  await light();
}

/**
 * Modal closed
 */
export async function modalClose() {
  await selection();
}

/**
 * Positive mood logged (4-5)
 */
export async function positiveMood() {
  await success();
}

/**
 * Neutral mood logged (3)
 */
export async function neutralMood() {
  await medium();
}

/**
 * Low mood logged (1-2) - gentler feedback
 */
export async function lowMood() {
  await light();
}

/**
 * Journal entry saved
 */
export async function journalSaved() {
  await trigger({
    native: () => HapticsService.success(),
    web: [10, 40, 10]
  });
}

/**
 * Coping tool started
 */
export async function copingToolStart() {
  await medium();
}

/**
 * Coping tool completed
 */
export async function copingToolComplete() {
  await success();
}

// ============================================================
// HAPTIC HOOK FOR REACT
// ============================================================

/**
 * React hook for haptic feedback
 * Usage: const haptics = useHaptics();
 *        haptics.success();
 */
export function useHapticsHook() {
  return {
    // Basic patterns
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,

    // Compound patterns
    moodLogged,
    achievementUnlocked,
    streakMilestone,
    taskCompleted,
    messageSent,
    notificationReceived,
    buttonPress,
    longPress,
    sliderTick,
    pullToRefresh,
    swipeAction,
    errorShake,
    breathingTick,
    breathingPhaseChange,
    timerComplete,
    pageTransition,
    modalOpen,
    modalClose,
    positiveMood,
    neutralMood,
    lowMood,
    journalSaved,
    copingToolStart,
    copingToolComplete,

    // Settings
    isEnabled: getHapticsEnabled,
    setEnabled: setHapticsEnabled,
    isAvailable: isHapticsAvailable
  };
}

// Default export with all patterns
export default {
  // Settings
  setEnabled: setHapticsEnabled,
  isEnabled: getHapticsEnabled,
  isAvailable: isHapticsAvailable,

  // Basic patterns
  light,
  medium,
  heavy,
  success,
  warning,
  error,
  selection,

  // Compound patterns
  moodLogged,
  achievementUnlocked,
  streakMilestone,
  taskCompleted,
  messageSent,
  notificationReceived,
  buttonPress,
  longPress,
  sliderTick,
  pullToRefresh,
  swipeAction,
  errorShake,
  breathingTick,
  breathingPhaseChange,
  timerComplete,
  pageTransition,
  modalOpen,
  modalClose,
  positiveMood,
  neutralMood,
  lowMood,
  journalSaved,
  copingToolStart,
  copingToolComplete,

  // Hook
  useHaptics: useHapticsHook
};
