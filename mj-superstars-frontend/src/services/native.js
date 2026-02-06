// ============================================================
// MJ's Superstars - Native Platform Detection & Services
// Detects Capacitor native environment and provides
// platform-specific APIs with web fallbacks
// ============================================================

// ============================================================
// PLATFORM DETECTION
// ============================================================

/**
 * Check if running in a Capacitor native app (iOS/Android)
 */
export const isNative = !!(
  typeof window !== 'undefined' &&
  window.Capacitor &&
  window.Capacitor.isNativePlatform &&
  window.Capacitor.isNativePlatform()
);

/**
 * Get the current platform
 */
export const platform = (() => {
  if (!isNative) return 'web';
  if (window.Capacitor?.getPlatform) {
    return window.Capacitor.getPlatform(); // 'ios', 'android', or 'web'
  }
  return 'web';
})();

export const isIOS = platform === 'ios';
export const isAndroid = platform === 'android';
export const isWeb = platform === 'web';

// ============================================================
// CAPACITOR PLUGIN LOADER
// ============================================================

/**
 * Safely load a Capacitor plugin
 * Returns null if not available (web environment or plugin not installed)
 */
function getCapPlugin(pluginName) {
  try {
    if (window.Capacitor?.Plugins?.[pluginName]) {
      return window.Capacitor.Plugins[pluginName];
    }
  } catch (e) {
    // Plugin not available
  }
  return null;
}

// ============================================================
// HAPTICS SERVICE
// ============================================================

const HapticsPlugin = getCapPlugin('Haptics');

export const HapticsService = {
  /**
   * Light impact feedback - for selections, toggles
   */
  async light() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.impact({ style: 'LIGHT' });
      } catch (e) {
        console.warn('Haptics light failed:', e);
      }
    }
  },

  /**
   * Medium impact feedback - for confirmations
   */
  async medium() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.impact({ style: 'MEDIUM' });
      } catch (e) {
        console.warn('Haptics medium failed:', e);
      }
    }
  },

  /**
   * Heavy impact feedback - for important actions
   */
  async heavy() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.impact({ style: 'HEAVY' });
      } catch (e) {
        console.warn('Haptics heavy failed:', e);
      }
    }
  },

  /**
   * Success notification feedback
   */
  async success() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.notification({ type: 'SUCCESS' });
      } catch (e) {
        console.warn('Haptics success failed:', e);
      }
    }
  },

  /**
   * Warning notification feedback
   */
  async warning() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.notification({ type: 'WARNING' });
      } catch (e) {
        console.warn('Haptics warning failed:', e);
      }
    }
  },

  /**
   * Error notification feedback
   */
  async error() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.notification({ type: 'ERROR' });
      } catch (e) {
        console.warn('Haptics error failed:', e);
      }
    }
  },

  /**
   * Selection changed feedback - for pickers, sliders
   */
  async selection() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.selectionStart();
        await HapticsPlugin.selectionChanged();
        await HapticsPlugin.selectionEnd();
      } catch (e) {
        console.warn('Haptics selection failed:', e);
      }
    }
  }
};

// ============================================================
// STATUS BAR SERVICE
// ============================================================

const StatusBarPlugin = getCapPlugin('StatusBar');

export const StatusBarService = {
  async setStyle(style = 'DARK') {
    if (StatusBarPlugin) {
      try {
        await StatusBarPlugin.setStyle({ style });
      } catch (e) { /* not available */ }
    }
  },

  async hide() {
    if (StatusBarPlugin) {
      try {
        await StatusBarPlugin.hide();
      } catch (e) { /* not available */ }
    }
  },

  async show() {
    if (StatusBarPlugin) {
      try {
        await StatusBarPlugin.show();
      } catch (e) { /* not available */ }
    }
  }
};

// ============================================================
// KEYBOARD SERVICE
// ============================================================

const KeyboardPlugin = getCapPlugin('Keyboard');

export const KeyboardService = {
  async hide() {
    if (KeyboardPlugin) {
      try {
        await KeyboardPlugin.hide();
      } catch (e) { /* not available */ }
    }
  },

  onShow(callback) {
    if (KeyboardPlugin) {
      try {
        KeyboardPlugin.addListener('keyboardWillShow', callback);
      } catch (e) { /* not available */ }
    }
  },

  onHide(callback) {
    if (KeyboardPlugin) {
      try {
        KeyboardPlugin.addListener('keyboardWillHide', callback);
      } catch (e) { /* not available */ }
    }
  }
};

// ============================================================
// SAFE AREA
// ============================================================

/**
 * Get device safe area insets (for notch, home indicator, etc.)
 */
export function getSafeAreaInsets() {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--sat') || style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
  };
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  isNative,
  platform,
  isIOS,
  isAndroid,
  isWeb,
  HapticsService,
  StatusBarService,
  KeyboardService,
  getSafeAreaInsets,
};
