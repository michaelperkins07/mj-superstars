import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mjsuperstars.app',
  appName: "MJ's Superstars",
  webDir: 'www',
  bundledWebRuntime: false,

  // Server configuration for development
  server: {
    // For development, point to your local dev server
    // url: 'http://localhost:3000',
    // cleartext: true,

    // For production, the app loads from the bundled www folder
    androidScheme: 'https',
    iosScheme: 'capacitor'
  },

  // iOS-specific configuration
  ios: {
    // Use WKWebView (default and recommended)
    contentInset: 'automatic',

    // Allow scroll bounce for native feel
    scrollEnabled: true,

    // Enable background modes
    backgroundColor: '#0f172a', // slate-900

    // Preferred content mode
    preferredContentMode: 'mobile',

    // Scheme for custom URL handling
    scheme: 'mjsuperstars',

    // Handle external links
    limitsNavigationsToAppBoundDomains: true
  },

  // Plugin configurations
  plugins: {
    // Splash Screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerStyle: 'small',
      spinnerColor: '#38bdf8', // sky-400
      splashFullScreen: true,
      splashImmersive: true
    },

    // Status Bar
    StatusBar: {
      style: 'DARK', // Light text for dark background
      backgroundColor: '#0f172a'
    },

    // Keyboard
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true
    },

    // Push Notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },

    // Local Notifications
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#38bdf8',
      sound: 'gentle_chime.wav'
    },

    // Haptics - no special config needed, just enable
    Haptics: {},

    // App preferences/storage
    Preferences: {
      // Group name for iOS shared preferences
      group: 'group.com.mjsuperstars.app'
    }
  }
};

export default config;
