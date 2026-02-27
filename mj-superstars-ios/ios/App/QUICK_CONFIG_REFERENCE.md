# Quick Configuration Reference

## 🔑 Values You Need to Update

### From GoogleService-Info.plist:

Download from: Firebase Console > Project Settings > Your iOS App

```
1. CLIENT_ID
   Format: xxxxx-xxxxx.apps.googleusercontent.com
   Example: 123456789-abc123def456.apps.googleusercontent.com

2. REVERSED_CLIENT_ID
   Format: com.googleusercontent.apps.xxxxx-xxxxx
   Example: com.googleusercontent.apps.123456789-abc123def456
```

---

## 📝 Files to Update

### 1. Info.plist (ios/App/App/Info.plist)

Find and replace these two values:

```xml
<!-- Find this line: -->
<key>GIDClientID</key>
<string>YOUR-CLIENT-ID.apps.googleusercontent.com</string>

<!-- Replace with: -->
<key>GIDClientID</key>
<string>123456789-abc123def456.apps.googleusercontent.com</string>
<!-- ☝️ Use your actual CLIENT_ID from GoogleService-Info.plist -->


<!-- Find this line: -->
<string>com.googleusercontent.apps.YOUR-REVERSED-CLIENT-ID</string>

<!-- Replace with: -->
<string>com.googleusercontent.apps.123456789-abc123def456</string>
<!-- ☝️ Use your actual REVERSED_CLIENT_ID from GoogleService-Info.plist -->
```

### 2. Your JavaScript/TypeScript Code

Find where you initialize Google Sign In:

```typescript
// Find this line in your code:
await GoogleSignIn.initialize({
  clientId: 'YOUR-CLIENT-ID.apps.googleusercontent.com'
});

// Replace with:
await GoogleSignIn.initialize({
  clientId: '123456789-abc123def456.apps.googleusercontent.com'
});
// ☝️ Use your actual CLIENT_ID from GoogleService-Info.plist
```

---

## 🚀 Quick Setup Steps (5 minutes)

```bash
# Step 1: Go to Firebase Console
open https://console.firebase.google.com

# Step 2: Download GoogleService-Info.plist
# Project Settings > Your iOS App > Download GoogleService-Info.plist

# Step 3: Add file to Xcode
# Drag GoogleService-Info.plist into Xcode project

# Step 4: Get your values
# Open GoogleService-Info.plist and find:
#   - CLIENT_ID
#   - REVERSED_CLIENT_ID

# Step 5: Update Info.plist in Xcode
# Replace the placeholder values with your actual values

# Step 6: Install pods
cd ios/App
pod install

# Step 7: Open in Xcode
open App.xcworkspace

# Step 8: Enable Sign in with Apple
# Select target > Signing & Capabilities > + Capability > Sign in with Apple

# Step 9: Build and Run!
# ⌘R
```

---

## 🎯 Example Values (DO NOT USE THESE - Use Your Own!)

These are EXAMPLES only. Replace with your actual values from Firebase:

```
❌ EXAMPLE (don't use):
CLIENT_ID: 123456789-abc123def456.apps.googleusercontent.com
REVERSED_CLIENT_ID: com.googleusercontent.apps.123456789-abc123def456

✅ YOUR VALUES (from GoogleService-Info.plist):
CLIENT_ID: ___________________________________________
REVERSED_CLIENT_ID: ___________________________________________
```

---

## ✅ Verification

After updating, verify:

1. **Info.plist**
   - [ ] GIDClientID has your CLIENT_ID
   - [ ] CFBundleURLSchemes has your REVERSED_CLIENT_ID
   - [ ] No "YOUR-CLIENT-ID" or "YOUR-REVERSED-CLIENT-ID" placeholders remain

2. **Your Code**
   - [ ] GoogleSignIn.initialize() uses your actual CLIENT_ID
   - [ ] No placeholder values remain

3. **Xcode**
   - [ ] GoogleService-Info.plist is in your project
   - [ ] Sign in with Apple capability is enabled
   - [ ] Project builds without errors

4. **Test**
   - [ ] Google Sign In works
   - [ ] Apple Sign In works

---

## 🆘 Still Need Help?

### Can't find CLIENT_ID?

1. Open GoogleService-Info.plist in a text editor
2. Search for `<key>CLIENT_ID</key>`
3. The value is on the next line: `<string>YOUR-VALUE-HERE</string>`

### Can't find REVERSED_CLIENT_ID?

1. Open GoogleService-Info.plist in a text editor
2. Search for `<key>REVERSED_CLIENT_ID</key>`
3. The value is on the next line: `<string>YOUR-VALUE-HERE</string>`

### Don't have GoogleService-Info.plist?

1. Go to https://console.firebase.google.com
2. Select your project (or create new)
3. Click the gear icon > Project settings
4. Scroll to "Your apps"
5. Click on your iOS app (or add one if none exists)
6. Click "Download GoogleService-Info.plist"

### Firebase Project Doesn't Exist?

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Enter project name
4. Follow the wizard
5. Add iOS app with your bundle ID
6. Download GoogleService-Info.plist

---

## 📋 Checklist Before Building

- [ ] Downloaded GoogleService-Info.plist from Firebase
- [ ] Added GoogleService-Info.plist to Xcode project
- [ ] Updated Info.plist with CLIENT_ID
- [ ] Updated Info.plist with REVERSED_CLIENT_ID
- [ ] Updated app code with CLIENT_ID
- [ ] Ran `pod install`
- [ ] Opened App.xcworkspace (not .xcodeproj)
- [ ] Enabled Sign in with Apple capability
- [ ] Ready to build!

---

**Pro Tip:** Keep GoogleService-Info.plist handy. You'll need it for other Firebase features too!
