# StoreKit 2 Capacitor Plugin Setup Guide

This guide explains the StoreKit 2 in-app purchase plugin implementation for the iOS app.

## Overview

The `InAppPurchasePlugin` provides a Capacitor bridge to Apple's modern StoreKit 2 API (async/await based), enabling iOS 15+ devices to handle subscriptions for:
- `com.mjsuperstars.premium.monthly`
- `com.mjsuperstars.premium.yearly`

## Plugin Architecture

### Swift Implementation
**File:** `/sessions/dazzling-ecstatic-lovelace/mnt/Project MJ/mj-superstars-ios/ios/App/App/InAppPurchasePlugin.swift`

The Swift plugin provides these core capabilities:

#### Methods
- `initialize()` - Validates StoreKit availability and syncs with App Store
- `getProducts(productIds)` - Fetches product details (price, display name, description)
- `getCurrentEntitlements()` - Returns active subscriptions with expiration dates
- `purchase(productId)` - Initiates purchase flow and returns transaction details
- `restorePurchases()` - Syncs with App Store to restore previous purchases
- `manageSubscriptions()` - Opens iOS Settings for subscription management

#### Event Listeners
- `transactionUpdate` - Fires when transactions change (purchase, revocation, upgrade)

### JavaScript Bridge
**File:** `/sessions/dazzling-ecstatic-lovelace/mnt/Project MJ/mj-superstars-frontend/src/services/native.js`

The `InAppPurchaseService` wrapper provides safe access to the plugin with error handling:

```javascript
import { InAppPurchaseService } from './services/native';

// Initialize
await InAppPurchaseService.initialize();

// Fetch products
const products = await InAppPurchaseService.getProducts([
  'com.mjsuperstars.premium.monthly',
  'com.mjsuperstars.premium.yearly'
]);

// Check subscriptions
const entitlements = await InAppPurchaseService.getCurrentEntitlements();

// Purchase
const result = await InAppPurchaseService.purchase('com.mjsuperstars.premium.monthly');

// Listen for updates
const listener = InAppPurchaseService.addTransactionListener((transaction) => {
  console.log('Transaction:', transaction);
});
```

## Required Xcode Configuration

### 1. StoreKit Entitlements

The app must have the **StoreKit** capability enabled in Xcode:

1. Open `mj-superstars-ios/ios/App/App.xcodeproj` in Xcode
2. Select the **App** target
3. Go to **Signing & Capabilities**
4. Click **+ Capability**
5. Search for and add **StoreKit** (or **In-App Purchase** in older Xcode versions)

### 2. Minimum Deployment Target

Ensure the deployment target is **iOS 15.0 or later**:

1. In Xcode: Select **App** target
2. Go to **Build Settings**
3. Search for "Deployment Target"
4. Set to **15.0** or later

The plugin automatically rejects calls on iOS < 15.0 with an error message.

### 3. App Store Configuration

Products must be configured in **App Store Connect**:

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **MJ Superstars app**
3. Go to **Subscriptions** → **Subscription Groups**
4. Create/verify a subscription group for Premium
5. Add the two subscription products with these IDs:
   - `com.mjsuperstars.premium.monthly`
   - `com.mjsuperstars.premium.yearly`

#### Sandbox Testing
Use Sandbox Apple IDs to test purchases without real transactions:
1. Go to **Users and Access** → **Sandbox Testers**
2. Create test accounts
3. Sign in on test device using these credentials

## Usage in Frontend

The subscription service (`/sessions/dazzling-ecstatic-lovelace/mnt/Project MJ/mj-superstars-frontend/src/services/subscription.js`) integrates the plugin:

```javascript
// Initialize on app startup
await initSubscription();

// Perform purchase
const result = await purchaseSubscription('com.mjsuperstars.premium.monthly');
if (result.success) {
  console.log('Subscription activated!');
}

// Check if user is premium
if (isPremium()) {
  console.log('User has active subscription');
}

// Open subscription management
await manageSubscription();
```

## Transaction Flow

### Purchase Flow
1. User initiates purchase
2. StoreKit shows system dialog
3. Transaction is created and verified
4. `transactionUpdate` event fires
5. Transaction is finished (removed from queue)
6. Receipt is sent to backend for validation

### Restoration Flow
1. User taps "Restore Purchases"
2. App syncs with App Store
3. Previous transactions are retrieved
4. `transactionUpdate` events fire for each
5. `getCurrentEntitlements()` reflects restored subscriptions

### Transaction States
- `purchased` - New valid transaction
- `restored` - Previously purchased subscription
- `revoked` - Subscription was cancelled (refund or family sharing removal)
- `upgraded` - User upgraded to a better plan
- `pending` - Awaiting server-side validation
- `cancelled` - User cancelled the purchase dialog

## Data Returned by Plugin

### Product Object
```javascript
{
  productId: "com.mjsuperstars.premium.monthly",
  localizedPrice: "$9.99",
  price: 9.99,
  displayName: "Premium Monthly",
  description: "Unlimited access to premium features"
}
```

### Entitlement Object
```javascript
{
  productId: "com.mjsuperstars.premium.monthly",
  isActive: true,
  expirationDate: "2025-03-10T18:30:00Z",
  isTrialPeriod: false,
  willAutoRenew: true,
  transactionId: "2000000123456789",
  originalTransactionId: "2000000100000001",
  purchaseDate: "2025-02-10T18:30:00Z"
}
```

### Purchase Result Object
```javascript
{
  transactionState: "purchased",
  productId: "com.mjsuperstars.premium.monthly",
  transactionId: "2000000123456789",
  originalTransactionId: "2000000100000001",
  expirationDate: "2025-03-10T18:30:00Z",
  isTrialPeriod: false,
  price: 9.99,
  receipt: "JWS representation for backend validation"
}
```

## Error Handling

The plugin handles common errors:

- **"StoreKit 2 requires iOS 15.0 or later"** - Device running iOS < 15.0
- **"Network error during purchase"** - No internet connection
- **"This product is not available in your region"** - Geographic restriction
- **"Product not found"** - Product ID doesn't exist in App Store Connect
- **"In-app purchases not available"** - Plugin not loaded (web environment)

The subscription service catches and logs these errors, allowing graceful fallback to web-based subscriptions.

## Debugging

### Enable Logging
The plugin logs to console with `[InAppPurchase]` prefix:
- `[InAppPurchase] Initialize failed: ...`
- `[InAppPurchase] Get products failed: ...`
- `[InAppPurchase] Purchase failed: ...`

### Test Sandbox Purchases
1. Build and run on test device
2. Install with Sandbox Apple ID credentials
3. Purchases will be marked as sandbox transactions
4. Backend should accept these for testing

### Transaction Verification
The plugin verifies JWS (JSON Web Signature) receipts from StoreKit 2:
- Raw receipt is automatically verified against Apple's key
- Failed verification logs error but continues (graceful degradation)
- Backend should perform additional server-side validation

## Integration Checklist

- [ ] Xcode project has StoreKit capability enabled
- [ ] Minimum deployment target is iOS 15.0+
- [ ] App Store Connect has products configured
- [ ] Sandbox testers created for testing
- [ ] `InAppPurchasePlugin.swift` file in iOS project
- [ ] `capacitor.config.json` includes InAppPurchasePlugin
- [ ] `InAppPurchaseService` added to `native.js`
- [ ] `subscription.js` uses InAppPurchaseService
- [ ] App calls `initSubscription()` on startup
- [ ] Transaction listener is attached for `transactionUpdate` events
- [ ] Backend validates receipts before granting access
- [ ] Testing done with sandbox Apple IDs

## Security Considerations

1. **Always validate receipts on backend** - Never trust client-side purchase verification
2. **Use JWS receipts** - These are signed and verifiable by Apple
3. **Check expiration dates** - Verify subscriptions haven't expired
4. **Monitor revocations** - Handle `transactionUpdate` events with `revoked` state
5. **Secure API endpoints** - Protect receipt validation endpoints with authentication

## iOS 17+ Enhancements

On iOS 17+, the plugin automatically calls `AppStore.sync()` during initialization for:
- Automatic renewal status updates
- Price increase notifications
- Offer code redemptions

This is transparent to the frontend and requires no additional configuration.

## Troubleshooting

### Products Won't Load
- Verify product IDs match exactly in App Store Connect
- Check that subscription group is set up
- Ensure StoreKit capability is added to project
- Try deleting derived data and rebuilding

### Purchases Always Cancelled
- Check internet connection on device
- Verify Apple ID hasn't changed
- Clear cache: Settings → [App] → Offload App, then reinstall
- Test with Sandbox tester account

### Transaction Updates Not Firing
- Ensure `addListener('transactionUpdate', callback)` is called
- Check browser console for listener registration errors
- Verify plugin is loaded: `window.Capacitor.Plugins.InAppPurchase`

### Backend Receipt Validation Fails
- Verify you're using the JWS representation (`receipt` field)
- Check you're validating against correct Apple endpoint (sandbox vs production)
- Ensure backend is parsing JWT payload correctly
- Log raw receipt to debug: `console.log(result.receipt)`

## Further Reading

- [Apple StoreKit 2 Documentation](https://developer.apple.com/documentation/storekit)
- [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [Capacitor Plugin Development](https://capacitorjs.com/docs/plugins/ios)
