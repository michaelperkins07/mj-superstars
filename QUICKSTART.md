# StoreKit 2 Plugin - Quick Start

## Files Created

### 1. Native Plugin (Swift)
```
/sessions/dazzling-ecstatic-lovelace/mnt/Project MJ/mj-superstars-ios/ios/App/App/InAppPurchasePlugin.swift
```
**Complete StoreKit 2 implementation - ready to use**

### 2. JavaScript Service Wrapper  
```
/sessions/dazzling-ecstatic-lovelace/mnt/Project MJ/mj-superstars-frontend/src/services/native.js
```
**Added InAppPurchaseService export**

### 3. Configuration Updated
```
/sessions/dazzling-ecstatic-lovelace/mnt/Project MJ/mj-superstars-ios/ios/App/App/capacitor.config.json
```
**Added InAppPurchasePlugin to packageClassList**

### 4. Documentation
- **STOREKIT2_PLUGIN_README.md** - Complete setup guide
- **STOREKIT2_IMPLEMENTATION_SUMMARY.md** - High-level overview
- **INTEGRATION_GUIDE.md** - How it integrates with subscription.js
- **STOREKIT2_FILES_SUMMARY.txt** - Inventory of all files

## What Works Already

✅ **subscription.js** - Already integrated with plugin
✅ **Native plugin** - Fully implemented and ready
✅ **Configuration** - Updated in capacitor.config.json
✅ **JavaScript bridge** - InAppPurchaseService available

## What You Need To Do

### Step 1: Xcode Configuration (Required)
```
1. Open: mj-superstars-ios/ios/App/App.xcodeproj
2. Select App target
3. Signing & Capabilities
4. + Capability → Add "StoreKit"
5. Verify Deployment Target is iOS 15.0+
```

### Step 2: App Store Connect (Required)
```
1. Sign in to App Store Connect
2. MJ Superstars app
3. Subscriptions → Create subscription group
4. Add products:
   - com.mjsuperstars.premium.monthly (7 day trial)
   - com.mjsuperstars.premium.yearly (14 day trial)
5. Set prices for each region
```

### Step 3: Sandbox Testing (Required)
```
1. App Store Connect
2. Users and Access → Sandbox Testers
3. Create test Apple ID accounts
4. Use these for testing purchases
```

### Step 4: Backend Integration (Required)
```
Implement endpoint: POST /api/subscription/sync
- Receive JWS receipt from plugin
- Verify signature against Apple's public key
- Check expiration date
- Grant premium access
```

## How It Works

### Purchase Flow
```
User taps "Subscribe"
    ↓
subscription.js calls storeKit.purchase()
    ↓
InAppPurchasePlugin.purchase() (Swift)
    ↓
StoreKit 2 shows system dialog
    ↓
User confirms payment
    ↓
transactionUpdate event fires
    ↓
subscription.js receives update
    ↓
Receipt sent to backend for validation
    ↓
Access granted after verification
```

### Code Usage Example

**In subscription.js (already done):**
```javascript
const storeKit = window.Capacitor?.Plugins?.InAppPurchase;

// Get products
const products = await storeKit.getProducts({
  productIds: ['com.mjsuperstars.premium.monthly', ...]
});

// Purchase
const result = await storeKit.purchase({ 
  productId: 'com.mjsuperstars.premium.monthly' 
});

// Listen for updates
storeKit.addListener('transactionUpdate', (transaction) => {
  console.log('Subscription updated:', transaction);
});
```

**In your code:**
```javascript
import { InAppPurchaseService } from './services/native';

// Or use the subscription service
import subscription from './services/subscription';

// All already integrated!
```

## Testing Locally

```bash
# 1. Build
cd mj-superstars-ios
npx cap sync ios

# 2. Open in Xcode
open ios/App/App.xcodeproj

# 3. Add StoreKit capability
# (in Xcode: Signing & Capabilities → + Capability → StoreKit)

# 4. Build and run
# (⌘R in Xcode)

# 5. Sign in with Sandbox Apple ID
# (Settings → Apple ID → Use Sandbox account)

# 6. Test purchase flow
# (Tap Subscribe, confirm, no real charge)
```

## Product IDs

These are the exact product IDs you need in App Store Connect:

```
com.mjsuperstars.premium.monthly
com.mjsuperstars.premium.yearly
```

Bundle ID:
```
com.mjsuperstars.app
```

## Data Returned

### Purchase Result
```javascript
{
  transactionState: "purchased",
  productId: "com.mjsuperstars.premium.monthly",
  transactionId: "2000000123456789",
  originalTransactionId: "2000000100000001",
  expirationDate: "2025-03-10T18:30:00Z",
  isTrialPeriod: false,
  price: 9.99,
  receipt: "JWS string for backend validation"
}
```

### Current Entitlements
```javascript
{
  productId: "com.mjsuperstars.premium.monthly",
  isActive: true,
  expirationDate: "2025-03-10T18:30:00Z",
  isTrialPeriod: false,
  willAutoRenew: true,
  transactionId: "2000000123456789",
  originalTransactionId: "2000000100000001"
}
```

## Common Issues

### Products won't load
- Check product IDs match exactly in App Store Connect
- Verify subscription group is created
- Ensure StoreKit capability is added

### Plugin not loading
- Rebuild: `npx cap sync ios`
- Check capacitor.config.json has InAppPurchasePlugin
- Verify plugin file exists at correct path

### Purchases fail
- Verify Sandbox Apple ID is signed in
- Check internet connection
- Try different Sandbox tester account

### Receipt validation fails
- Check backend is parsing JWS (JWT format)
- Verify signature verification
- Use sandbox validation endpoint for testing

## Key Files to Review

1. **InAppPurchasePlugin.swift** - The native implementation
2. **subscription.js** - The integration (already done)
3. **STOREKIT2_PLUGIN_README.md** - Complete reference

## Next Steps

1. ✅ Read this file (you're here!)
2. 📖 Read STOREKIT2_PLUGIN_README.md for detailed setup
3. 🔧 Add StoreKit capability in Xcode
4. 🍎 Set up products in App Store Connect
5. 🧪 Create Sandbox testers
6. 💻 Build and test locally
7. ✔️ Implement backend receipt validation
8. 🚀 Deploy to production

## Support Resources

- [Apple StoreKit 2 Documentation](https://developer.apple.com/documentation/storekit)
- [Capacitor iOS Plugin Development](https://capacitorjs.com/docs/plugins/ios)
- [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)

---

**Status:** Ready to use - just add StoreKit capability in Xcode!
**Version:** 1.0.0
**Created:** 2025-02-10
