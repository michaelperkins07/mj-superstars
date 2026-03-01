import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mjsuperstars.app',
  appName: "MJ's Superstars",
  webDir: 'build',
  server: {
    // In production, the app loads the built web assets.
    // Uncomment below to point at live server during development:
    // url: 'https://mj-superstars-frontend.onrender.com',
    // cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'mjsuperstars',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#6366f1',
    },
    Haptics: {},
  },
};

export default config;
