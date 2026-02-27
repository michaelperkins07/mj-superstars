# 🎯 GETTING STARTED - Visual Guide

## Where to Find Your Google Credentials

### Step 1: Firebase Console
```
https://console.firebase.google.com
     ↓
[Select Your Project]
     ↓
⚙️ Settings (Gear Icon)
     ↓
"Project settings"
     ↓
Scroll to "Your apps"
     ↓
Click iOS app icon
     ↓
[Download GoogleService-Info.plist]
```

### Step 2: Find Your Values

Open `GoogleService-Info.plist` in a text editor:

```xml
<plist version="1.0">
<dict>
    ...
    <key>CLIENT_ID</key>
    <string>123456789-abc123def.apps.googleusercontent.com</string>
    ⬆️ COPY THIS VALUE
    
    ...
    <key>REVERSED_CLIENT_ID</key>
    <string>com.googleusercontent.apps.123456789-abc123def</string>
    ⬆️ COPY THIS VALUE TOO
    ...
</dict>
</plist>
```

---

## Where to Paste Your Values

### File 1: Info.plist

```xml
<!-- FIND THIS: -->
<key>GIDClientID</key>
<string>YOUR-CLIENT-ID.apps.googleusercontent.com</string>
        ⬆️ REPLACE THIS

<!-- REPLACE WITH: -->
<key>GIDClientID</key>
<string>123456789-abc123def.apps.googleusercontent.com</string>
        ⬆️ YOUR ACTUAL CLIENT_ID
```

```xml
<!-- FIND THIS: -->
<string>com.googleusercontent.apps.YOUR-REVERSED-CLIENT-ID</string>
         ⬆️ REPLACE THIS

<!-- REPLACE WITH: -->
<string>com.googleusercontent.apps.123456789-abc123def</string>
         ⬆️ YOUR ACTUAL REVERSED_CLIENT_ID
```

### File 2: Your App Code (TypeScript/JavaScript)

```typescript
// FIND THIS:
await GoogleSignIn.initialize({
  clientId: 'YOUR-CLIENT-ID.apps.googleusercontent.com'
             ⬆️ REPLACE THIS
});

// REPLACE WITH:
await GoogleSignIn.initialize({
  clientId: '123456789-abc123def.apps.googleusercontent.com'
             ⬆️ YOUR ACTUAL CLIENT_ID
});
```

---

## Installation Flow

```
┌─────────────────────────────────────┐
│  1. Download GoogleService-Info.plist │
│     from Firebase Console            │
└──────────────┬──────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  2. Copy CLIENT_ID and               │
│     REVERSED_CLIENT_ID values        │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  3. Update Info.plist with:          │
│     • CLIENT_ID                      │
│     • REVERSED_CLIENT_ID             │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  4. cd ios/App                       │
│     pod install                      │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  5. open App.xcworkspace             │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  6. Drag GoogleService-Info.plist    │
│     into Xcode project               │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  7. Target > Signing & Capabilities  │
│     Add "Sign in with Apple"         │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  8. Build and Run! (⌘R)              │
│     ✅ DONE!                          │
└──────────────────────────────────────┘
```

---

## Xcode Configuration Steps (Visual)

### Enable Sign in with Apple:

```
Xcode
  ↓
Open App.xcworkspace
  ↓
Click on your project (blue icon at top)
  ↓
Select "App" target (under TARGETS)
  ↓
Click "Signing & Capabilities" tab
  ↓
Click "+ Capability" button (top left)
  ↓
Scroll down and double-click:
"Sign in with Apple"
  ↓
You should see it appear in the list
✅ Done!
```

### Add GoogleService-Info.plist:

```
Finder: Open GoogleService-Info.plist
  ↓
Xcode: Show Project Navigator (⌘1)
  ↓
Drag GoogleService-Info.plist into Xcode
  ↓
Check ✅ "Copy items if needed"
Check ✅ "App" target
  ↓
Click "Finish"
✅ Done!
```

---

## Testing Flow

```
┌──────────────────────────────────────┐
│  Build in Xcode (⌘B)                 │
│  Should complete with no errors      │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  Run on Device (⌘R)                  │
│  iPhone or iPad (real device best)   │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  Test Apple Sign In:                 │
│  • Tap "Sign in with Apple"          │
│  • Apple sheet appears                │
│  • Sign in with Face ID/Touch ID     │
│  • Check console for user data       │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  Test Google Sign In:                │
│  • Tap "Sign in with Google"         │
│  • Google sheet appears               │
│  • Select account                     │
│  • Grant permissions                  │
│  • Check console for user data       │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  ✅ Both working!                     │
│  You're done!                        │
└──────────────────────────────────────┘
```

---

## Troubleshooting Decision Tree

```
Build Error?
├─ "No such module 'GoogleSignIn'"
│  └─ Run: pod install
│     └─ Clean Build Folder (⇧⌘K)
│
├─ "Undefined symbols"
│  └─ Make sure you opened App.xcworkspace
│     └─ NOT App.xcodeproj
│
└─ Other build errors
   └─ Check error message
      └─ See AUTH_SETUP_GUIDE.md

Runtime Error?
├─ Apple Sign In not working
│  ├─ Capability enabled in Xcode?
│  ├─ Testing on real device?
│  └─ Device signed in to iCloud?
│
├─ Google Sign In not working
│  ├─ Info.plist has correct CLIENT_ID?
│  ├─ Info.plist has correct REVERSED_CLIENT_ID?
│  ├─ GoogleService-Info.plist in Xcode?
│  └─ URL scheme matches REVERSED_CLIENT_ID?
│
└─ Other runtime errors
   └─ Check Xcode console
      └─ See AUTH_SETUP_GUIDE.md troubleshooting
```

---

## Quick Checklist

Copy this and check off as you go:

```
SETUP:
□ Downloaded GoogleService-Info.plist
□ Found CLIENT_ID value
□ Found REVERSED_CLIENT_ID value
□ Updated Info.plist with CLIENT_ID
□ Updated Info.plist with REVERSED_CLIENT_ID
□ Updated app code with CLIENT_ID

INSTALLATION:
□ Ran: cd ios/App
□ Ran: pod install
□ Opened: App.xcworkspace (NOT .xcodeproj)
□ Added GoogleService-Info.plist to Xcode

XCODE:
□ Enabled "Sign in with Apple" capability
□ Build succeeds (⌘B)
□ No errors in build log

TESTING:
□ Runs on device (⌘R)
□ Apple Sign In works
□ Google Sign In works
□ Console shows user data

✅ DONE!
```

---

## File Locations Quick Reference

```
Your Project/
│
├── ios/App/
│   │
│   ├── Podfile                          ← Already created
│   ├── [Run pod install here]
│   │
│   ├── App/
│   │   ├── Info.plist                   ← UPDATE THIS
│   │   ├── GoogleService-Info.plist     ← ADD THIS
│   │   ├── AppDelegate.swift            ← Already updated
│   │   │
│   │   └── Plugins/
│   │       ├── GoogleSignInPlugin.swift ← Already created
│   │       ├── GoogleSignInPlugin.m     ← Already created
│   │       ├── SignInWithApplePlugin.swift ← Already created
│   │       └── SignInWithApplePlugin.m  ← Already created
│   │
│   └── App.xcworkspace/                 ← OPEN THIS
│
└── src/ (or your app directory)
    └── [your-auth-file].ts              ← UPDATE THIS with CLIENT_ID
```

---

## Values Summary Card

**Print this or keep it handy:**

```
┌────────────────────────────────────────────────┐
│  MY GOOGLE CREDENTIALS                         │
├────────────────────────────────────────────────┤
│                                                │
│  CLIENT_ID:                                    │
│  _________________________________________     │
│  (from GoogleService-Info.plist)               │
│                                                │
│  REVERSED_CLIENT_ID:                           │
│  _________________________________________     │
│  (from GoogleService-Info.plist)               │
│                                                │
│  WHERE TO USE:                                 │
│  1. Info.plist → GIDClientID                   │
│  2. Info.plist → CFBundleURLSchemes            │
│  3. App code → GoogleSignIn.initialize()       │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Need More Help?

**Quick Links:**

- 📖 Full setup guide: `AUTH_SETUP_GUIDE.md`
- ✅ Step-by-step: `CONFIGURATION_CHECKLIST.md`
- 🚀 Quick reference: `QUICK_CONFIG_REFERENCE.md`
- 💻 Code examples: `sample-auth-component.ts`
- 🔍 Validation: Run `./validate-config.sh`

**You got this! 💪**
