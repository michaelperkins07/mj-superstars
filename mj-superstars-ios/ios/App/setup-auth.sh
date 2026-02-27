#!/bin/bash

# ============================================================
# Apple & Google Sign In - Complete Setup Script
# ============================================================

echo "🚀 Starting Apple & Google Sign In Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# Step 1: Install CocoaPods Dependencies
# ============================================================

echo "${BLUE}Step 1: Installing CocoaPods dependencies...${NC}"
echo ""

# Check if we're in the iOS directory
if [ ! -f "Podfile" ]; then
    echo "${RED}Error: Podfile not found. Make sure you're in the ios/App directory${NC}"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Install pods
echo "Running: pod install"
pod install

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ Pods installed successfully${NC}"
else
    echo "${RED}❌ Failed to install pods${NC}"
    echo "Try running: pod repo update && pod install"
    exit 1
fi

echo ""

# ============================================================
# Step 2: Configuration Instructions
# ============================================================

echo "${BLUE}Step 2: Configuration Instructions${NC}"
echo ""

echo "${YELLOW}⚠️  MANUAL STEPS REQUIRED:${NC}"
echo ""

echo "1. ${YELLOW}Google Sign In Configuration:${NC}"
echo "   a. Go to Firebase Console (https://console.firebase.google.com)"
echo "   b. Select your project (or create one)"
echo "   c. Go to Project Settings > Your apps > iOS"
echo "   d. Download GoogleService-Info.plist"
echo "   e. Add GoogleService-Info.plist to your Xcode project"
echo "   f. Open GoogleService-Info.plist and find:"
echo "      - CLIENT_ID (looks like: xxxxx.apps.googleusercontent.com)"
echo "      - REVERSED_CLIENT_ID (looks like: com.googleusercontent.apps.xxxxx)"
echo "   g. Update Info.plist with these values:"
echo "      - Replace 'YOUR-CLIENT-ID.apps.googleusercontent.com' with CLIENT_ID"
echo "      - Replace 'com.googleusercontent.apps.YOUR-REVERSED-CLIENT-ID' with REVERSED_CLIENT_ID"
echo ""

echo "2. ${YELLOW}Apple Sign In Configuration:${NC}"
echo "   a. Open your project in Xcode (App.xcworkspace)"
echo "   b. Select your project target"
echo "   c. Go to 'Signing & Capabilities' tab"
echo "   d. Click '+ Capability'"
echo "   e. Add 'Sign in with Apple'"
echo "   f. On Apple Developer Portal (https://developer.apple.com):"
echo "      - Go to your App ID"
echo "      - Enable 'Sign in with Apple'"
echo "      - Save and regenerate provisioning profiles if needed"
echo ""

echo "3. ${YELLOW}Update Info.plist in Xcode:${NC}"
echo "   a. Open Info.plist in Xcode"
echo "   b. Find GIDClientID and update with your CLIENT_ID"
echo "   c. Find CFBundleURLSchemes and update with your REVERSED_CLIENT_ID"
echo "   d. Update CFBundleDisplayName with your app name"
echo ""

echo "4. ${YELLOW}Test the Integration:${NC}"
echo "   a. Build and run on a real device (recommended for Apple Sign In)"
echo "   b. Try signing in with both Apple and Google"
echo "   c. Check Xcode console for any error messages"
echo ""

# ============================================================
# Step 3: Verification
# ============================================================

echo "${BLUE}Step 3: Verification${NC}"
echo ""

# Check if GoogleSignIn pod is installed
if [ -f "Pods/GoogleSignIn/README.md" ]; then
    echo "${GREEN}✅ GoogleSignIn pod installed${NC}"
else
    echo "${RED}❌ GoogleSignIn pod not found${NC}"
fi

# Check if plugin files exist
if [ -f "GoogleSignInPlugin.swift" ]; then
    echo "${GREEN}✅ GoogleSignInPlugin.swift exists${NC}"
else
    echo "${RED}❌ GoogleSignInPlugin.swift not found${NC}"
fi

if [ -f "SignInWithApplePlugin.swift" ]; then
    echo "${GREEN}✅ SignInWithApplePlugin.swift exists${NC}"
else
    echo "${RED}❌ SignInWithApplePlugin.swift not found${NC}"
fi

if [ -f "AppDelegate.swift" ]; then
    echo "${GREEN}✅ AppDelegate.swift exists${NC}"
else
    echo "${RED}❌ AppDelegate.swift not found${NC}"
fi

echo ""

# ============================================================
# Step 4: Next Steps
# ============================================================

echo "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "1. Open App.xcworkspace in Xcode (NOT App.xcodeproj)"
echo "2. Complete the manual configuration steps above"
echo "3. Build and test on a device"
echo "4. Check AUTH_SETUP_GUIDE.md for usage examples"
echo ""

echo "${GREEN}🎉 Setup script complete!${NC}"
echo ""
echo "If you encounter any issues, check:"
echo "- Xcode console logs"
echo "- AUTH_SETUP_GUIDE.md for troubleshooting"
echo "- Ensure all configuration values are correct"
echo ""
