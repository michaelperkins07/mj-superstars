#!/bin/bash

# ============================================================
# Setup Script - Works with Both CocoaPods and SPM
# ============================================================

echo "🔍 Detecting dependency manager..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect which dependency manager is in use
USING_COCOAPODS=false
USING_SPM=false

if [ -f "Podfile" ] && [ -d "Pods" ]; then
    USING_COCOAPODS=true
    echo "${GREEN}✓${NC} CocoaPods detected"
elif [ -f "Podfile" ]; then
    echo "${YELLOW}⚠${NC} Podfile found but Pods not installed"
    USING_COCOAPODS=true
fi

# Check for SPM (harder to detect, look for Package.resolved)
if [ -f "App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved" ]; then
    USING_SPM=true
    echo "${GREEN}✓${NC} Swift Package Manager detected"
fi

if [ "$USING_COCOAPODS" = false ] && [ "$USING_SPM" = false ]; then
    echo "${YELLOW}⚠${NC} No dependency manager detected"
    echo ""
    echo "Choose your dependency manager:"
    echo "1) CocoaPods (Recommended - Automated)"
    echo "2) Swift Package Manager (Manual setup required)"
    echo ""
    read -p "Enter choice (1 or 2): " choice
    
    if [ "$choice" = "1" ]; then
        USING_COCOAPODS=true
    else
        USING_SPM=true
    fi
fi

echo ""

# ============================================================
# CocoaPods Setup
# ============================================================

if [ "$USING_COCOAPODS" = true ]; then
    echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${BLUE}Setting up with CocoaPods${NC}"
    echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ ! -f "Podfile" ]; then
        echo "${RED}❌ Podfile not found${NC}"
        echo "Make sure you're in the ios/App directory"
        exit 1
    fi
    
    echo "Installing CocoaPods dependencies..."
    pod install --repo-update
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "${GREEN}✅ Pods installed successfully!${NC}"
        DEPS_INSTALLED=true
    else
        echo ""
        echo "${RED}❌ Pod installation failed${NC}"
        exit 1
    fi
fi

# ============================================================
# Swift Package Manager Setup
# ============================================================

if [ "$USING_SPM" = true ]; then
    echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${BLUE}Swift Package Manager Detected${NC}"
    echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo "${YELLOW}⚠️  SPM requires manual setup in Xcode${NC}"
    echo ""
    echo "You need to add these packages manually:"
    echo "1. Firebase iOS SDK:"
    echo "   URL: https://github.com/firebase/firebase-ios-sdk"
    echo "   Products: FirebaseAuth, FirebaseAnalytics"
    echo ""
    echo "2. Google Sign-In:"
    echo "   URL: https://github.com/google/GoogleSignIn-iOS"
    echo "   Products: GoogleSignIn"
    echo ""
    echo "See SPM_VS_COCOAPODS.md for detailed instructions"
    echo ""
    
    read -p "Have you added these packages in Xcode? (y/n): " added
    
    if [ "$added" = "y" ] || [ "$added" = "Y" ]; then
        DEPS_INSTALLED=true
    else
        echo ""
        echo "${YELLOW}Please add the packages in Xcode and run this script again${NC}"
        exit 0
    fi
fi

# ============================================================
# Common Setup (for both CocoaPods and SPM)
# ============================================================

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Configuring GoogleService-Info.plist${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Find GoogleService-Info.plist
GOOGLE_SERVICE_FILE=""

if [ -f "GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="GoogleService-Info.plist"
elif [ -f "App/GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="App/GoogleService-Info.plist"
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
            
            # Update Info.plist
            INFO_PLIST="Info.plist"
            if [ ! -f "$INFO_PLIST" ]; then
                INFO_PLIST="App/Info.plist"
            fi
            
            if [ -f "$INFO_PLIST" ]; then
                cp "$INFO_PLIST" "$INFO_PLIST.backup"
                echo "Created backup: $INFO_PLIST.backup"
                
                sed -i.tmp "s/YOUR-CLIENT-ID\.apps\.googleusercontent\.com/$CLIENT_ID/g" "$INFO_PLIST"
                sed -i.tmp "s/com\.googleusercontent\.apps\.YOUR-REVERSED-CLIENT-ID/$REVERSED_CLIENT_ID/g" "$INFO_PLIST"
                rm -f "$INFO_PLIST.tmp"
                
                echo "${GREEN}✅ Info.plist updated successfully!${NC}"
                echo ""
            fi
        fi
    fi
else
    echo "${YELLOW}⚠️  GoogleService-Info.plist NOT FOUND${NC}"
    echo ""
    echo "Download it from Firebase Console and place in ios/App/"
fi

# ============================================================
# Next Steps
# ============================================================

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Next Steps${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$USING_COCOAPODS" = true ]; then
    echo "1. Open workspace: ${BLUE}open App.xcworkspace${NC}"
else
    echo "1. Open project: ${BLUE}open App.xcodeproj${NC}"
fi

echo "2. Add GoogleService-Info.plist to Xcode project"
echo "3. Enable 'Sign in with Apple' capability"
echo "4. Build and run! (⌘R)"
echo ""

if [ -n "$CLIENT_ID" ]; then
    echo "Your Google Client ID: ${BLUE}$CLIENT_ID${NC}"
    echo "Use this in your app initialization code!"
fi

echo ""
echo "${GREEN}✅ Setup Complete!${NC}"
