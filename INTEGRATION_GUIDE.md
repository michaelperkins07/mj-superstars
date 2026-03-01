# StoreKit 2 Integration Guide

## Overview

This guide shows how the StoreKit 2 plugin integrates with your existing subscription system.

## Current Implementation Status

The plugin is fully implemented and integrated. Here's what's been created:

### 1. Native Swift Plugin (iOS)
- **File:** `mj-superstars-ios/ios/App/App/InAppPurchasePlugin.swift`
- **Status:** ✅ Complete and ready to use
- **Features:** Full StoreKit 2 API with async/await, transaction listeners, error handling

### 2. JavaScript Service Wrapper
- **File:** `mj-superstars-frontend/src/services/native.js`
- **Status:** ✅ Added InAppPurchaseService export
- **Features:** Safe plugin access with error handling

### 3. Configuration
- **File:** `mj-superstars-ios/ios/App/App/capacitor.config.json`
- **Status:** ✅ Updated with InAppPurchasePlugin

### 4. Documentation
- **File:** `mj-superstars-ios/ios/App/App/STOREKIT2_PLUGIN_README.md`
- **Status:** ✅ Comprehensive setup guide

## How subscription.js Uses the Plugin

The subscription service already has the correct implementation. Here's how it works:

### 1. Get the Plugin Reference
```javascript
function getStoreKit() {
  if (!isNative) return null;
  return window.Capacitor?.Plugins?.InAppPurchase;
}
```

### 2. Initialize (in `initSubscription()`)
```javascript
const storeKit = getStoreKit();
if (!storeKit) {
  // Web fallback
  await checkSubscriptionWithBackend();
  return;
}

// Initialize plugin
await storeKit.initialize();

// Load products
const products = await storeKit.getProducts({
  productIds: Object.values(PRODUCTS)
});

// Check current subscriptions
const entitlements = await storeKit.getCurrentEntitlements();
const activeSubscription = entitlements.find(e =>
  e.productId.includes('premium') && e.isActive
);

// Listen for transaction updates
storeKit.addListener('transactionUpdate', handleTransactionUpdate);
```

### 3. Handle Purchases
```javascript
export async function purchaseSubscription(productId) {
  const storeKit = getStoreKit();
  const result = await storeKit.purchase({ productId });
  
  if (result.transactionState === 'purchased') {
    return { success: true };
  }
  // ... handle other states
}
```

### 4. Handle Transaction Updates
```javascript
async function handleTransactionUpdate(transaction) {
  if (transaction.transactionState === 'purchased') {
    updateState({
      isPremium: true,
      subscription: {
        productId: transaction.productId,
        expirationDate: transaction.expirationDate,
        isTrialPeriod: transaction.isTrialPeriod,
        willAutoRenew: true
      }
    });
    
    // Sync with backend
    await syncSubscriptionWithBackend(transaction);
  }
}
```

### 5. Restore Purchases
```javascript
export async function restorePurchases() {
  const storeKit = getStoreKit();
  await storeKit.restorePurchases();
  
  // Re-check entitlements
  const entitlements = await storeKit.getCurrentEntitlements();
  // ... update state
}
```

## Data Flow

### Purchase Flow
```
User taps "Subscribe"
    ↓
purchaseSubscription(productId)
    ↓
InAppPurchaseService.purchase()
    ↓
InAppPurchasePlugin.purchase() (Swift)
    ↓
StoreKit 2: product.purchase()
    ↓
[System shows purchase dialog]
    ↓
Transaction is created
    ↓
transactionUpdate event fires
    ↓
handleTransactionUpdate()
    ↓
syncSubscriptionWithBackend(transaction)
    ↓
Update state: isPremium = true
```

### Subscription Check Flow
```
initSubscription()
    ↓
InAppPurchaseService.getCurrentEntitlements()
    ↓
InAppPurchasePlugin.getCurrentEntitlements() (Swift)
    ↓
StoreKit 2: Transaction.currentEntitlements
    ↓
Returns active subscriptions
    ↓
Check if any are premium + active
    ↓
Update state: isPremium = true/false
```

## Backend Integration Required

Your backend needs to handle these endpoints:

### 1. POST /api/subscription/sync
Called after successful purchase to validate receipt.

```javascript
// Called in syncSubscriptionWithBackend()
{
  productId: "com.mjsuperstars.premium.monthly",
  transactionId: "2000000123456789",
  originalTransactionId: "2000000100000001",
  receipt: "JWS string from Apple"
}
```

**Backend must:**
- Parse JWS receipt (JWT format)
- Verify signature against Apple's public key
- Check expiration date
- Check product matches one of:
  - `com.mjsuperstars.premium.monthly`
  - `com.mjsuperstars.premium.yearly`
- Check bundle ID is `com.mjsuperstars.app`
- Grant/update user's premium access
- Return success/error

### 2. GET /api/subscription/status
Called on web to check subscription status.

**Backend should:**
- Check user's subscription in database
- Return current status
- Include isPremium and subscription details

### 3. Handle App Store Notifications (Optional)
Apple can send webhook notifications for:
- Subscription renewals
- Subscription cancellations
- Price increase warnings
- Billing issues

Implement Server-to-Server Notifications or use App Store Server API for production.

## Testing Locally

### 1. Sandbox Setup
```
1. Xcode project has StoreKit capability ✅ (you must do this)
2. Deployment target iOS 15.0+ ✅ (you must verify)
3. App Store Connect has products configured ✅ (you must set up)
4. Create Sandbox tester Apple ID ✅ (you must do this)
```

### 2. Test on Device
```bash
# Build and run on iOS device
cd mj-superstars-ios
npx cap sync ios
# Open in Xcode, build and run
```

### 3. Test Purchase Flow
```
1. Sign in with Sandbox Apple ID
2. Tap Subscribe button
3. System dialog appears
4. Confirm purchase (no real charge)
5. transactionUpdate event fires
6. State updates: isPremium = true
7. Receipt sent to backend
8. Backend validates and grants access
```

### 4. Test Restore
```
1. Tap "Restore Purchases"
2. App syncs with App Store
3. Previous purchases appear
4. State updates
```

## Troubleshooting

### Plugin Not Loading
```javascript
// Check if plugin loaded
console.log(window.Capacitor.Plugins.InAppPurchase);
// Should not be undefined
```

**Solutions:**
- Build iOS project in Xcode
- Verify capacitor.config.json includes InAppPurchasePlugin
- Check plugin file exists at correct path

### Products Not Loading
```javascript
// Products is empty array
const products = await storeKit.getProducts({
  productIds: ['com.mjsuperstars.premium.monthly', ...]
});
```

**Solutions:**
- Verify product IDs in App Store Connect match exactly
- Check subscription group is created
- Ensure StoreKit capability is added to target
- Try Clean Build Folder in Xcode

### Purchase Always Fails
```javascript
// result.transactionState === 'cancelled' always
```

**Solutions:**
- Check Sandbox Apple ID is signed in
- Verify App ID matches in Xcode
- Try different Sandbox tester
- Check internet connection

### Receipt Validation Fails on Backend
```
POST /api/subscription/sync returns error
```

**Solutions:**
- Verify you're parsing JWS (JWT) not binary receipt
- Check validation endpoint accepts sandbox environment
- Log raw JWS to see payload: `jwt.decode(receipt)`
- Verify Apple public key is correct
- Check bundle ID in receipt matches app

## Monitoring in Production

### Key Metrics to Track
1. Purchase success rate
2. Subscription churn rate
3. Trial conversion rate
4. Refund rate
5. Renewal success rate

### Recommended Monitoring
1. Server-side receipt validation logging
2. Failed purchase logging
3. Transaction state tracking
4. Revenue analytics (likely via analytics service)
5. User feedback on subscription issues

### App Store Server API
For production monitoring, use App Store Server API:
- Get transaction history for a user
- Get subscription renewal status
- Send price increase consent notification
- Check refund eligibility

## Common Issues & Solutions

### Issue: iOS Device Only Shows "Restore Purchases"
**Solution:** In sandbox, purchases don't appear in the UI. Restore functionality is the main way to test.

### Issue: Price Shows As "$0.00"
**Solution:** Product needs to be in "Ready to Submit" state in App Store Connect. Test products show $0.

### Issue: Different Prices Per Region
**Solution:** App Store can show localized prices. Make sure pricing is configured for all regions.

### Issue: Trial Period Not Recognized
**Solution:** Ensure trial period is set in the subscription product configuration in App Store Connect.

## Next Steps

1. **Xcode Configuration** (Manual steps required)
   - Add StoreKit capability to target
   - Verify iOS 15.0+ deployment target

2. **App Store Connect Setup** (Manual steps required)
   - Create subscription group
   - Add products with exact IDs
   - Set prices and trial periods
   - Create Sandbox testers

3. **Backend Receipt Validation** (Development required)
   - Implement `/api/subscription/sync` endpoint
   - Add JWS verification
   - Grant premium access on successful validation
   - Log all transactions for debugging

4. **Testing**
   - Build with Xcode
   - Test with Sandbox Apple ID
   - Test purchase flow
   - Test subscription status checking
   - Verify backend receipt validation

5. **Monitoring**
   - Set up logging for purchases
   - Track subscription metrics
   - Monitor refunds
   - Set up alerts for failures

## Code Files for Reference

### Plugin Implementation
- Swift: `/mj-superstars-ios/ios/App/App/InAppPurchasePlugin.swift`
- JavaScript Service: `/mj-superstars-frontend/src/services/native.js`
- Subscription Integration: `/mj-superstars-frontend/src/services/subscription.js`

### Configuration
- Capacitor: `/mj-superstars-ios/ios/App/App/capacitor.config.json`

### Documentation
- Plugin Readme: `/mj-superstars-ios/ios/App/App/STOREKIT2_PLUGIN_README.md`

## Support

For questions about:
- **StoreKit 2 API:** See Apple's official docs
- **Capacitor:** See Capacitor.js documentation
- **App Store Connect:** See Apple's App Store documentation
- **JWS Receipt Validation:** See App Store Server API docs

---

**Last Updated:** 2025-02-10
**Status:** Ready for Xcode configuration and testing
**Version:** 1.0.0
