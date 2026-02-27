# Apple and Google Sign In - Setup Instructions

## Fixed Issues:
1. ✅ Added proper Google Sign In plugin implementation
2. ✅ Updated AppDelegate to handle Google Sign In URL callbacks
3. ✅ Removed timeout logic from Apple Sign In that could cause issues
4. ✅ Created proper Capacitor plugin registration files

## Configuration Required:

### 1. Info.plist Configuration

#### For Apple Sign In:
No additional Info.plist entries required, but ensure you have:
- Sign in with Apple capability enabled in your Xcode project
- App ID configured with Sign in with Apple on Apple Developer Portal

#### For Google Sign In:
Add the following to your Info.plist:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <!-- Replace with your REVERSED_CLIENT_ID from GoogleService-Info.plist -->
            <string>com.googleusercontent.apps.YOUR-CLIENT-ID</string>
        </array>
    </dict>
</array>

<key>GIDClientID</key>
<string>YOUR-CLIENT-ID.apps.googleusercontent.com</string>
```

### 2. Podfile Configuration

Add these pods to your Podfile:

```ruby
target 'App' do
  capacitor_pods
  
  # For Apple Sign In (already included in iOS SDK, but explicit if needed)
  # pod 'AuthenticationServices'
  
  # For Google Sign In
  pod 'GoogleSignIn', '~> 7.0'
end
```

Then run:
```bash
pod install
```

### 3. Xcode Project Configuration

#### Apple Sign In:
1. Select your project in Xcode
2. Go to "Signing & Capabilities"
3. Click "+ Capability"
4. Add "Sign in with Apple"

#### Google Sign In:
1. Download `GoogleService-Info.plist` from Firebase Console
2. Add it to your Xcode project
3. Get your CLIENT_ID from the file and add it to Info.plist

### 4. Usage from JavaScript/TypeScript

#### Apple Sign In:

```typescript
// Call the authorize method
const result = await SignInWithApple.authorize();

// Result contains:
// - identityToken: JWT token for backend verification
// - authorizationCode: For server-side auth
// - user: User identifier (unique to your app)
// - email: User's email (only on first sign-in)
// - fullName: User's name (only on first sign-in)
// - realUserStatus: "likelyReal", "unknown", or "unsupported"
```

#### Google Sign In:

```typescript
// 1. Initialize with your client ID
await GoogleSignIn.initialize({
  clientId: 'YOUR-CLIENT-ID.apps.googleusercontent.com'
});

// 2. Sign in
const result = await GoogleSignIn.signIn();

// Result contains:
// - idToken: JWT token for backend verification
// - accessToken: Access token
// - userId: User ID
// - profile: { email, name, givenName, familyName, imageUrl }

// 3. Restore previous sign in (on app launch)
try {
  const user = await GoogleSignIn.restorePreviousSignIn();
  // User is signed in
} catch (error) {
  // User needs to sign in
}

// 4. Sign out
await GoogleSignIn.signOut();

// 5. Refresh tokens
const tokens = await GoogleSignIn.refresh();
```

### 5. Common Issues and Solutions

#### Apple Sign In Issues:
1. **"Not Handled" error**: Make sure Sign in with Apple capability is enabled
2. **Missing email/name**: These are only provided on first sign-in, cache them
3. **iPad issues**: Fixed by proper window resolution in presentationAnchor

#### Google Sign In Issues:
1. **URL scheme mismatch**: Ensure CFBundleURLSchemes matches REVERSED_CLIENT_ID
2. **Client ID not found**: Make sure GIDClientID is in Info.plist
3. **Redirect URI mismatch**: Check Firebase Console configuration
4. **"No view controller" error**: Fixed by proper bridge view controller access

### 6. Testing

#### Apple Sign In:
- Test on a real device (Simulator requires additional setup)
- Ensure you're signed in to iCloud
- Test both first-time and returning user flows

#### Google Sign In:
- Test on both Simulator and device
- Test with users who have/haven't used the app before
- Test sign out and sign in again flow

### 7. Backend Verification

Always verify tokens on your backend:

#### Apple Sign In:
```
POST https://appleid.apple.com/auth/token
Verify the identityToken JWT
```

#### Google Sign In:
```
Use Google's token verification library
or verify against: https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={idToken}
```

## Support

If you encounter issues:
1. Check Xcode console logs for detailed error messages
2. Verify all configuration steps above
3. Ensure pods are properly installed
4. Check that URL schemes are correctly configured
5. Verify capabilities are enabled in Xcode
