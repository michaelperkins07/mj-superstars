# MJ's Superstars - iOS App

Native iOS wrapper using Capacitor for the MJ's Superstars mental wellness app.

## Prerequisites

- **Node.js** 18+ and npm
- **Xcode** 15+ (for iOS development)
- **CocoaPods** (`sudo gem install cocoapods`)
- Apple Developer account (for TestFlight/App Store)

## Project Structure

```
mj-superstars-ios/
├── capacitor.config.ts    # Capacitor configuration
├── package.json           # Dependencies & scripts
├── www/                   # Web assets (built React app goes here)
│   └── index.html         # Entry point
├── src/
│   └── native/            # Native plugin wrappers
│       ├── index.ts       # All Capacitor plugins
│       └── hooks.ts       # React hooks for native features
├── ios/                   # iOS native project (generated)
│   └── App/               # Xcode project files
└── ios-config/            # iOS configuration templates
    └── Info.plist.template
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the React Web App

First, build the React frontend and copy to `www/`:

```bash
# From the frontend directory
cd ../mj-superstars-frontend
npm run build

# Copy build output to iOS project
cp -r build/* ../mj-superstars-ios/www/
```

### 3. Add iOS Platform

```bash
npx cap add ios
```

### 4. Sync Web Assets

```bash
npx cap sync ios
```

### 5. Open in Xcode

```bash
npx cap open ios
```

### 6. Run on Simulator or Device

In Xcode:
1. Select your target device/simulator
2. Press ⌘R to build and run

Or via CLI:
```bash
npx cap run ios
```

## Native Features

### Haptics

```typescript
import { useHaptics } from './native/hooks';

function MyComponent() {
  const haptics = useHaptics();

  return (
    <button onClick={() => haptics.success()}>
      Complete Task
    </button>
  );
}
```

### Push Notifications

```typescript
import { usePushNotifications } from './native/hooks';

function Settings() {
  const { hasPermission, requestPermission, token } = usePushNotifications();

  return (
    <button onClick={requestPermission}>
      Enable Notifications
    </button>
  );
}
```

### Local Notifications (Check-in Reminders)

```typescript
import { useLocalNotifications } from './native/hooks';

function ReminderSettings() {
  const { scheduleCheckIn, cancelAll } = useLocalNotifications();

  // Schedule daily check-in at 9 AM
  const enableReminders = () => scheduleCheckIn(9, 0);

  return (
    <button onClick={enableReminders}>
      Set Morning Check-in
    </button>
  );
}
```

### Keyboard Handling

```typescript
import { useKeyboard } from './native/hooks';

function ChatInput() {
  const { isVisible, keyboardHeight, hide } = useKeyboard();

  return (
    <div style={{ paddingBottom: isVisible ? keyboardHeight : 0 }}>
      <input type="text" />
      <button onClick={hide}>Done</button>
    </div>
  );
}
```

### App State (Background/Foreground)

```typescript
import { useAppState } from './native/hooks';

function DataSync() {
  const { isActive } = useAppState();

  useEffect(() => {
    if (isActive) {
      // App came to foreground - refresh data
      refreshData();
    }
  }, [isActive]);
}
```

### Native Storage

```typescript
import { useNativeStorage } from './native/hooks';

function UserPrefs() {
  const { value, set, loading } = useNativeStorage('user_prefs', {
    notifications: true,
    darkMode: true
  });

  if (loading) return <Loading />;

  return (
    <Toggle
      checked={value.notifications}
      onChange={(checked) => set({ ...value, notifications: checked })}
    />
  );
}
```

### Share

```typescript
import { useShare } from './native/hooks';

function ProgressCard({ streakDays }) {
  const { shareProgress, canShare } = useShare();

  return (
    <button
      onClick={() => shareProgress(streakDays)}
      disabled={!canShare}
    >
      Share My Progress 🎉
    </button>
  );
}
```

## Configuration

### App Identity

Edit `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.mjsuperstars.app',  // Your bundle ID
  appName: "MJ's Superstars",
  // ...
};
```

### Push Notifications

1. Create APNs key in Apple Developer Portal
2. Configure in your backend
3. Update `capacitor.config.ts` push settings

### Health Kit (Future)

Add to `Info.plist`:
```xml
<key>NSHealthShareUsageDescription</key>
<string>MJ's Superstars reads your health data...</string>
```

## Build for TestFlight

### 1. Configure Signing

In Xcode:
1. Select the project in navigator
2. Go to "Signing & Capabilities"
3. Select your team
4. Set bundle identifier

### 2. Archive

```bash
# Build for release
npx cap build ios --release

# Or in Xcode: Product → Archive
```

### 3. Upload to App Store Connect

1. Open Organizer (Window → Organizer)
2. Select archive
3. Click "Distribute App"
4. Follow the upload wizard

## Troubleshooting

### Pods not installing

```bash
cd ios/App
pod repo update
pod install --repo-update
```

### Signing issues

- Ensure your Apple Developer account is added to Xcode
- Check bundle identifier matches your provisioning profile

### Web assets not updating

```bash
npx cap sync ios --force
```

### Simulator issues

```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

## Environment Variables

Create `.env` for development:

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000
```

For production builds:

```env
REACT_APP_API_URL=https://api.mjsuperstars.app
REACT_APP_SOCKET_URL=https://api.mjsuperstars.app
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run ios` | Open iOS project in Xcode |
| `npm run ios:run` | Build and run on connected device/simulator |
| `npm run ios:sync` | Sync web assets to iOS project |
| `npm run sync` | Sync all platforms |
| `npm run build` | Build web and sync all platforms |

## App Store Checklist

Before submitting:

- [ ] App icons (all sizes)
- [ ] Launch screen configured
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Screenshots for all device sizes
- [ ] App description and keywords
- [ ] Age rating questionnaire completed
- [ ] Export compliance documentation
- [ ] HealthKit entitlements (if using)
- [ ] Push notification entitlements

---

**Next Steps:**
1. Set up Apple Developer account
2. Create App ID and provisioning profiles
3. Configure push notification certificates
4. Build and test on real device
5. Submit to TestFlight for beta testing
