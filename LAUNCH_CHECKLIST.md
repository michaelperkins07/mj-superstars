# Perkins — Launch Checklist

Everything you need to do to go live. Run these commands from your Mac terminal in the project directory.

---

## Step 1: Push Latest Code

```bash
cd ~/Desktop/"Project MJ"
git push origin main
```

This pushes the security fix (removed API key from git tracking) and the Fastfile update.

---

## Step 2: Set Render Environment Variables

Go to your Render dashboard: https://dashboard.render.com

### Backend Service (mj-superstars / mj-superstars-api)

Navigate to **Environment** tab and add these variables:

| Variable | Value |
|----------|-------|
| `ADMIN_EMAILS` | `michaelperkins07@gmail.com` |
| `IAP_ISSUER_ID` | `7e6f7a23-b6f4-45ba-a169-32cb4d378fc2` |
| `IAP_KEY_ID` | `TS9A6TPWWR` |
| `IAP_KEY_CONTENT` | *(paste the full contents of your .p8 key file — see below)* |
| `APP_APPLE_ID` | `6758818206` |
| `APPLE_CLIENT_ID` | `com.mjsuperstars.app` |
| `FROM_EMAIL` | `michaelperkins07@gmail.com` |
| `ENCRYPTION_KEY` | *(generate: `openssl rand -hex 32`)* |

**To get IAP_KEY_CONTENT:**
```bash
cat ~/Downloads/AuthKey_TS9A6TPWWR.p8
```
Copy the ENTIRE output (including the BEGIN/END lines) and paste as the value.

**To generate ENCRYPTION_KEY:**
```bash
openssl rand -hex 32
```

### Frontend Service (mj-superstars-app / mj-superstars-web)

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | `https://mj-superstars.onrender.com` |
| `REACT_APP_SOCKET_URL` | `https://mj-superstars.onrender.com` |

---

## Step 3: Google Sign-In (Optional — can do after launch)

1. Go to https://console.cloud.google.com
2. Create a project or select existing
3. Enable "Google Sign-In" API
4. Create OAuth 2.0 Client ID (Web application type)
5. Add authorized redirect URI: `https://mj-superstars-app.onrender.com`
6. Copy the Client ID and set on Render backend: `GOOGLE_CLIENT_ID`

---

## Step 4: Sentry Error Tracking (Optional — can do after launch)

1. Go to https://sentry.io and create a free account
2. Create a new project (Node.js for backend)
3. Copy the DSN
4. Set on Render:
   - Backend: `SENTRY_DSN` = your DSN
   - Frontend: `REACT_APP_SENTRY_DSN` = your DSN

---

## Step 5: Upload Metadata to App Store Connect

Make sure fastlane is installed:
```bash
# If not installed:
brew install fastlane

# Or via gem:
sudo gem install fastlane
```

Then upload:
```bash
cd ~/Desktop/"Project MJ"
fastlane ios upload_metadata
```

This uploads the "Perkins" name, description, screenshots, and all metadata to App Store Connect. It won't submit for review yet.

**Verify in App Store Connect:**
1. Go to https://appstoreconnect.apple.com
2. Open "Perkins" (was "MJ's Superstars")
3. Check that all metadata, screenshots, and descriptions look correct
4. Verify the name shows "Perkins"

---

## Step 6: Submit for App Store Review

Once you've verified everything looks good in App Store Connect:

```bash
cd ~/Desktop/"Project MJ"
fastlane ios submit_for_review
```

**Important:** This requires that you've already uploaded a build (IPA) to App Store Connect. If you haven't done that yet, you'll need to:

1. Archive the app in Xcode
2. Upload to App Store Connect via Xcode Organizer
3. Then run the submit command

---

## Quick Reference

| Service | URL |
|---------|-----|
| Frontend | https://mj-superstars-app.onrender.com |
| Backend | https://mj-superstars.onrender.com |
| App Store Connect | https://appstoreconnect.apple.com |
| Render Dashboard | https://dashboard.render.com |
| GitHub Repo | https://github.com/michaelperkins07/mj-superstars |

| Identifier | Value |
|------------|-------|
| Bundle ID | `com.mjsuperstars.app` |
| Team ID | `FAAWCBHB9C` |
| App Apple ID | `6758818206` |
| API Key ID | `TS9A6TPWWR` |
| Issuer ID | `7e6f7a23-b6f4-45ba-a169-32cb4d378fc2` |
