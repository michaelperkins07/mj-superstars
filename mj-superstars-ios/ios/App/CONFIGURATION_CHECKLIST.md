# Authentication Setup Checklist

Use this checklist to ensure everything is configured correctly.

## ✅ Installation Checklist

### 1. CocoaPods Installation
- [ ] Podfile exists in ios/App directory
- [ ] GoogleSignIn pod is added to Podfile
- [ ] Run `pod install` successfully
- [ ] Open App.xcworkspace (not .xcodeproj)

### 2. Plugin Files
- [ ] GoogleSignInPlugin.swift exists
- [ ] GoogleSignInPlugin.m exists
- [ ] SignInWithApplePlugin.swift exists
- [ ] SignInWithApplePlugin.m exists
- [ ] AppDelegate.swift updated with Google Sign In handling

## ✅ Google Sign In Configuration

### 3. Firebase Setup
- [ ] Create/open project in Firebase Console
- [ ] Add iOS app to Firebase project
- [ ] Bundle ID matches your Xcode project
- [ ] Download GoogleService-Info.plist
- [ ] Add GoogleService-Info.plist to Xcode project

### 4. Get Configuration Values
From GoogleService-Info.plist, find and copy:
- [ ] CLIENT_ID (example: 123456789-abc.apps.googleusercontent.com)
- [ ] REVERSED_CLIENT_ID (example: com.googleusercontent.apps.123456789-abc)

### 5. Update Info.plist
- [ ] Open Info.plist in Xcode
- [ ] Find `GIDClientID` key
- [ ] Replace `YOUR-CLIENT-ID.apps.googleusercontent.com` with your CLIENT_ID
- [ ] Find `CFBundleURLSchemes` array
- [ ] Replace `com.googleusercontent.apps.YOUR-REVERSED-CLIENT-ID` with your REVERSED_CLIENT_ID

### 6. Enable Google Sign In in Firebase
- [ ] In Firebase Console, go to Authentication > Sign-in method
- [ ] Enable Google as a sign-in provider
- [ ] Save changes

## ✅ Apple Sign In Configuration

### 7. Xcode Capabilities
- [ ] Open App.xcworkspace in Xcode
- [ ] Select your app target
- [ ] Go to "Signing & Capabilities" tab
- [ ] Click "+ Capability"
- [ ] Add "Sign in with Apple"
- [ ] Ensure capability shows no errors

### 8. Apple Developer Portal
- [ ] Go to https://developer.apple.com
- [ ] Navigate to Certificates, Identifiers & Profiles
- [ ] Select your App ID
- [ ] Enable "Sign in with Apple" capability
- [ ] Configure as needed (Primary App ID, etc.)
- [ ] Save changes

### 9. Provisioning Profiles
- [ ] If using manual signing, regenerate provisioning profiles
- [ ] Download and install updated profiles
- [ ] Or let Xcode manage automatically

## ✅ Code Integration

### 10. Frontend/JavaScript Setup
- [ ] Copy auth-plugins.ts to your project
- [ ] Import the plugins: `import { SignInWithApple, GoogleSignIn } from './auth-plugins'`
- [ ] Initialize Google Sign In with your CLIENT_ID
- [ ] Implement sign-in buttons/flows

### 11. Update Configuration in Code
In your app initialization code:
- [ ] Replace 'YOUR-CLIENT-ID.apps.googleusercontent.com' with actual CLIENT_ID

Example:
```typescript
await GoogleSignIn.initialize({
  clientId: 'YOUR-ACTUAL-CLIENT-ID.apps.googleusercontent.com'
});
```

## ✅ Testing

### 12. Build and Run
- [ ] Clean build folder (Product > Clean Build Folder)
- [ ] Build project (⌘B)
- [ ] No build errors
- [ ] Run on iOS Simulator for Google Sign In
- [ ] Run on real device for Apple Sign In (required)

### 13. Test Apple Sign In
- [ ] Ensure device is signed in to iCloud
- [ ] Tap Apple Sign In button
- [ ] Apple Sign In sheet appears
- [ ] Complete sign in flow
- [ ] Verify you receive user data (check console logs)
- [ ] Test return user flow (sign in again)

### 14. Test Google Sign In
- [ ] Tap Google Sign In button
- [ ] Google Sign In sheet appears (or Safari view)
- [ ] Select/sign in with Google account
- [ ] Grant permissions
- [ ] Verify you receive user data (check console logs)
- [ ] Test sign out
- [ ] Test sign in again

## ✅ Backend Integration

### 15. Token Verification
- [ ] Set up backend endpoint for token verification
- [ ] Verify Apple ID tokens: https://appleid.apple.com/auth/token
- [ ] Verify Google ID tokens: Use Google's token verification library
- [ ] Handle user creation/authentication in your backend
- [ ] Return session tokens to your app

### 16. Error Handling
- [ ] Handle "User cancelled" errors gracefully
- [ ] Handle network errors
- [ ] Handle invalid token errors
- [ ] Display appropriate error messages to users

## ✅ Production Readiness

### 17. Apple Sign In Production
- [ ] Test with distribution provisioning profile
- [ ] Test on multiple devices
- [ ] Handle missing email/name (only provided first time)
- [ ] Implement proper error messages

### 18. Google Sign In Production
- [ ] Add SHA-1 fingerprint to Firebase (for Android if needed)
- [ ] Test with release build
- [ ] Verify redirect URIs are correct
- [ ] Test on multiple devices

### 19. App Store Submission
- [ ] If you use Apple Sign In, it must be the FIRST option or equally prominent
- [ ] Privacy policy updated with third-party sign-in information
- [ ] App Review Information includes test accounts if needed

## 🔧 Troubleshooting

Common Issues and Solutions:

### Google Sign In Issues
- **"No view controller"** - Ensure bridge?.viewController is accessible
- **"Invalid client ID"** - Check GIDClientID in Info.plist matches Firebase
- **"Redirect URI mismatch"** - Check CFBundleURLSchemes matches REVERSED_CLIENT_ID
- **Sign in sheet doesn't appear** - Check URL scheme is registered

### Apple Sign In Issues
- **"Not handled"** - Ensure capability is enabled in Xcode
- **No email/name on second sign in** - This is expected, cache on first sign in
- **"No key window"** - Fixed in our implementation with proper window resolution
- **Doesn't work on Simulator** - Use a real device or configure Simulator's Apple ID

### General Issues
- **Build errors** - Run `pod install` again, clean build folder
- **Plugins not found** - Verify .m files exist and plugins are registered
- **Crash on startup** - Check Xcode console for error messages

## 📝 Configuration Files Summary

Files you need to modify:
1. ✅ Podfile - Already created with GoogleSignIn pod
2. ✅ Info.plist - Update with your CLIENT_ID and REVERSED_CLIENT_ID
3. ✅ AppDelegate.swift - Already updated
4. ⚠️ Your app code - Initialize and use the plugins

## 🎯 Quick Start Commands

```bash
# 1. Navigate to iOS app directory
cd ios/App

# 2. Install dependencies
pod install

# 3. Open in Xcode
open App.xcworkspace

# 4. Update Info.plist with your Google credentials
# 5. Enable Sign in with Apple capability
# 6. Build and run!
```

## 📚 Additional Resources

- AUTH_SETUP_GUIDE.md - Detailed setup guide
- auth-plugins.ts - TypeScript interfaces and usage examples
- GoogleService-Info.plist - From Firebase (you need to download this)
- Apple Developer Documentation: https://developer.apple.com/sign-in-with-apple/
- Google Sign In Documentation: https://developers.google.com/identity/sign-in/ios

---

**Need Help?**
- Check Xcode console logs for detailed error messages
- Review AUTH_SETUP_GUIDE.md for troubleshooting section
- Ensure all checkbox items above are completed
