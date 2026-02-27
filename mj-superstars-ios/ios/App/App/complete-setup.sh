#!/bin/bash

# ============================================================
# Complete Setup Script - Automates Everything Possible
# ============================================================

echo "🚀 Starting Complete Setup for Apple & Google Sign In..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================
# Step 1: Install CocoaPods Dependencies
# ============================================================

echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 1: Installing CocoaPods Dependencies${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if Podfile exists
if [ ! -f "Podfile" ]; then
    echo "${RED}❌ Error: Podfile not found${NC}"
    echo "Make sure you're in the ios/App directory"
    exit 1
fi

echo "Installing pods..."
pod install --repo-update

if [ $? -eq 0 ]; then
    echo ""
    echo "${GREEN}✅ Pods installed successfully!${NC}"
    echo ""
else
    echo ""
    echo "${RED}❌ Pod installation failed${NC}"
    echo "Try running: pod repo update && pod install"
    exit 1
fi

# ============================================================
# Step 2: Check for GoogleService-Info.plist
# ============================================================

echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 2: Checking for GoogleService-Info.plist${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

GOOGLE_SERVICE_FILE=""

# Check common locations
if [ -f "GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="GoogleService-Info.plist"
elif [ -f "App/GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="App/GoogleService-Info.plist"
elif [ -f "../../GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="../../GoogleService-Info.plist"
fi

if [ -n "$GOOGLE_SERVICE_FILE" ]; then
    echo "${GREEN}✅ GoogleService-Info.plist found!${NC}"
    echo "Location: $GOOGLE_SERVICE_FILE"
    echo ""
    
    # Extract values if plutil is available
    if command -v plutil &> /dev/null; then
        echo "Extracting credentials..."
        CLIENT_ID=$(plutil -extract CLIENT_ID raw "$GOOGLE_SERVICE_FILE" 2>/dev/null)
        REVERSED_CLIENT_ID=$(plutil -extract REVERSED_CLIENT_ID raw "$GOOGLE_SERVICE_FILE" 2>/dev/null)
        
        if [ -n "$CLIENT_ID" ] && [ -n "$REVERSED_CLIENT_ID" ]; then
            echo ""
            echo "${GREEN}✅ Credentials extracted!${NC}"
            echo ""
            echo "CLIENT_ID: ${BLUE}$CLIENT_ID${NC}"
            echo "REVERSED_CLIENT_ID: ${BLUE}$REVERSED_CLIENT_ID${NC}"
            echo ""
            
            # ============================================================
            # Step 3: Update Info.plist Automatically
            # ============================================================
            
            echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo "${BLUE}Step 3: Updating Info.plist${NC}"
            echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            
            INFO_PLIST="Info.plist"
            if [ ! -f "$INFO_PLIST" ]; then
                INFO_PLIST="App/Info.plist"
            fi
            
            if [ -f "$INFO_PLIST" ]; then
                # Backup original
                cp "$INFO_PLIST" "$INFO_PLIST.backup"
                echo "Created backup: $INFO_PLIST.backup"
                
                # Update GIDClientID
                plutil -replace GIDClientID -string "$CLIENT_ID" "$INFO_PLIST" 2>/dev/null
                
                # Update CFBundleURLSchemes (this is trickier)
                # We need to find the right URL scheme entry
                sed -i.tmp "s/YOUR-CLIENT-ID\.apps\.googleusercontent\.com/$CLIENT_ID/g" "$INFO_PLIST"
                sed -i.tmp "s/com\.googleusercontent\.apps\.YOUR-REVERSED-CLIENT-ID/$REVERSED_CLIENT_ID/g" "$INFO_PLIST"
                rm -f "$INFO_PLIST.tmp"
                
                echo "${GREEN}✅ Info.plist updated successfully!${NC}"
                echo ""
                echo "Updated values:"
                echo "  - GIDClientID: $CLIENT_ID"
                echo "  - URL Scheme: $REVERSED_CLIENT_ID"
                echo ""
            else
                echo "${RED}❌ Info.plist not found${NC}"
            fi
        else
            echo "${YELLOW}⚠️  Could not extract credentials from GoogleService-Info.plist${NC}"
            echo "You'll need to update Info.plist manually"
        fi
    else
        echo "${YELLOW}⚠️  plutil not available, cannot auto-extract credentials${NC}"
        echo "You'll need to update Info.plist manually"
    fi
else
    echo "${YELLOW}⚠️  GoogleService-Info.plist NOT FOUND${NC}"
    echo ""
    echo "You need to:"
    echo "1. Go to https://console.firebase.google.com"
    echo "2. Download GoogleService-Info.plist"
    echo "3. Place it in the ios/App directory"
    echo "4. Run this script again"
    echo ""
fi

# ============================================================
# Step 4: Verify Installation
# ============================================================

echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 4: Verification${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check pods
if [ -d "Pods/GoogleSignIn" ]; then
    echo "${GREEN}✅${NC} GoogleSignIn pod installed"
else
    echo "${RED}❌${NC} GoogleSignIn pod NOT installed"
fi

# Check workspace
if [ -f "App.xcworkspace/contents.xcworkspacedata" ]; then
    echo "${GREEN}✅${NC} App.xcworkspace created"
else
    echo "${RED}❌${NC} App.xcworkspace NOT found"
fi

# Check plugin files
if [ -f "GoogleSignInPlugin.swift" ]; then
    echo "${GREEN}✅${NC} GoogleSignInPlugin.swift exists"
else
    echo "${RED}❌${NC} GoogleSignInPlugin.swift NOT found"
fi

if [ -f "SignInWithApplePlugin.swift" ]; then
    echo "${GREEN}✅${NC} SignInWithApplePlugin.swift exists"
else
    echo "${RED}❌${NC} SignInWithApplePlugin.swift NOT found"
fi

echo ""

# ============================================================
# Step 5: Next Steps
# ============================================================

echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}What's Next?${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "${YELLOW}MANUAL STEPS REQUIRED:${NC}"
echo ""
echo "1. ${BLUE}Open in Xcode:${NC}"
echo "   open App.xcworkspace"
echo ""

if [ -n "$GOOGLE_SERVICE_FILE" ]; then
    echo "2. ${BLUE}Add GoogleService-Info.plist to Xcode:${NC}"
    echo "   - Drag $GOOGLE_SERVICE_FILE into Xcode"
    echo "   - Check '✅ Copy items if needed'"
    echo "   - Check '✅ App target'"
    echo ""
else
    echo "2. ${BLUE}Download and Add GoogleService-Info.plist:${NC}"
    echo "   - Download from Firebase Console"
    echo "   - Drag into Xcode project"
    echo "   - Re-run this script to auto-configure"
    echo ""
fi

echo "3. ${BLUE}Enable Sign in with Apple:${NC}"
echo "   - Select App target"
echo "   - Go to 'Signing & Capabilities'"
echo "   - Click '+ Capability'"
echo "   - Add 'Sign in with Apple'"
echo ""

echo "4. ${BLUE}Update your app code:${NC}"
echo "   - Find: clientId: 'YOUR-CLIENT-ID.apps.googleusercontent.com'"
if [ -n "$CLIENT_ID" ]; then
    echo "   - Replace with: clientId: '$CLIENT_ID'"
else
    echo "   - Replace with your actual CLIENT_ID"
fi
echo ""

echo "5. ${BLUE}Build and Test:${NC}"
echo "   - Build: ⌘B"
echo "   - Run: ⌘R"
echo "   - Test both sign-in methods"
echo ""

echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}🎉 Automated Setup Complete!${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -n "$CLIENT_ID" ]; then
    echo "Your credentials have been automatically configured in Info.plist!"
    echo "Just complete the manual Xcode steps above and you're ready to go!"
else
    echo "Add GoogleService-Info.plist and run this script again for automatic configuration."
fi

echo ""
echo "Need help? Check VISUAL_GUIDE.md for step-by-step instructions"
echo ""
