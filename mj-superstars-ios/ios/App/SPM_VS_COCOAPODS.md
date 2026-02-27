# Swift Package Manager Setup for Apple & Google Sign In

## ⚠️ Important: SPM vs CocoaPods

You have two options for dependency management:

### Option A: CocoaPods (Automated - Recommended)
- ✅ Fully automated with scripts
- ✅ Run `./complete-setup.sh` and it's done
- ✅ No manual steps needed
- 📁 Uses: Podfile

### Option B: Swift Package Manager (Manual)
- ⚠️ Requires manual Xcode GUI interaction
- ⚠️ Cannot be fully automated
- ⚠️ You must follow steps below
- 📁 Uses: Package.swift dependencies

---

## 📋 Swift Package Manager - Manual Steps

### 1. Open Xcode
```bash
cd ios/App
open App.xcworkspace
```

### 2. Add Firebase iOS SDK

**Steps:**
1. File → Add Package Dependencies...
2. Enter URL: `https://github.com/firebase/firebase-ios-sdk`
3. Dependency Rule: "Up to Next Major Version"
4. Click "Add Package"
5. Select these products:
   - ✅ FirebaseAuth
   - ✅ FirebaseAnalytics (or FirebaseAnalyticsWithoutAdId)
6. Click "Add Package"
7. Wait for download to complete

### 3. Add Google Sign-In SDK

**Steps:**
1. File → Add Package Dependencies...
2. Enter URL: `https://github.com/google/GoogleSignIn-iOS`
3. Dependency Rule: "Up to Next Major Version" (7.0.0+)
4. Click "Add Package"
5. Select product:
   - ✅ GoogleSignIn
6. Click "Add Package"
7. Wait for download to complete

### 4. Verify Installation

In Xcode's Project Navigator:
- Look for "Package Dependencies" folder
- Should see:
  - firebase-ios-sdk
  - GoogleSignIn-iOS

### 5. Update Info.plist

Still need to configure Info.plist with your Google credentials!

```xml
<key>GIDClientID</key>
<string>YOUR-CLIENT-ID.apps.googleusercontent.com</string>

<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.YOUR-REVERSED-CLIENT-ID</string>
        </array>
    </dict>
</array>
```

### 6. Enable Sign in with Apple Capability

1. Select App target
2. Signing & Capabilities tab
3. Click "+ Capability"
4. Add "Sign in with Apple"

### 7. Build and Run

```
⌘B to build
⌘R to run
```

---

## 🔄 If You Want to Switch FROM CocoaPods TO SPM

### Remove CocoaPods:

```bash
cd ios/App

# Remove CocoaPods files
rm -rf Pods
rm Podfile.lock
rm -rf App.xcworkspace

# Close Xcode if open
# Then reopen the .xcodeproj file
open App.xcodeproj
```

Then follow the SPM steps above.

---

## 🔄 If You Want to Stay WITH CocoaPods (Easier)

Just ignore the SPM steps and use our automated scripts:

```bash
cd ios/App
./complete-setup.sh
```

Done! Everything is automated.

---

## ⚖️ Comparison

| Feature | CocoaPods | Swift Package Manager |
|---------|-----------|----------------------|
| Automation | ✅ Fully automated | ❌ Manual GUI steps |
| Our Scripts | ✅ Supported | ⚠️ Partially supported |
| Installation | `pod install` | Xcode GUI |
| Updates | `pod update` | Xcode GUI |
| Community | ✅ Mature | ✅ Modern |
| Apple Preferred | ⚠️ No | ✅ Yes |

---

## 💡 Recommendation

**For this project, I recommend CocoaPods** because:
1. ✅ Our scripts fully automate it
2. ✅ No manual Xcode interaction needed
3. ✅ Faster setup
4. ✅ You just run `./complete-setup.sh`

**Choose SPM if:**
- You prefer Apple's official dependency manager
- You want to manage dependencies through Xcode
- You don't mind manual setup

---

## 🎯 Quick Decision Guide

**Want the fastest setup?**
→ Use CocoaPods (run `./complete-setup.sh`)

**Want Apple's recommended approach?**
→ Use SPM (follow manual steps above)

**Already started with CocoaPods?**
→ Keep using it, it works great!

**Already started with SPM?**
→ Continue with it, just follow the manual steps

---

## 📝 What You Need Either Way

Regardless of CocoaPods or SPM, you still need:

1. ✅ GoogleService-Info.plist from Firebase
2. ✅ Update Info.plist with credentials
3. ✅ Enable Sign in with Apple capability
4. ✅ All the plugin files (already created)

---

## 🚀 Recommended Next Steps

### If using CocoaPods (automated):
```bash
cd ios/App
./complete-setup.sh
```

### If using SPM (manual):
1. Follow the manual steps above
2. Manually configure Info.plist with values from GoogleService-Info.plist
3. Run `./generate-config.sh` to create auth-config.ts

---

**My recommendation:** Stick with CocoaPods for this project since I've already automated everything for you! 🎉
