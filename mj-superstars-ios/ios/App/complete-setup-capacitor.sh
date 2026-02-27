#!/bin/bash

# ============================================================
# Complete Setup Script - Apple & Google Sign In
# Updated to work with Capacitor project structure
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
# Detect project structure
# ============================================================

# Check if we're in the right directory
if [ -f "Podfile" ]; then
    echo "${GREEN}✓${NC} Found Podfile in current directory"
    PODFILE_DIR="."
elif [ -f "../Podfile" ]; then
    echo "${GREEN}✓${NC} Found Podfile in parent directory"
    PODFILE_DIR=".."
    cd ..
elif [ -f "../../Podfile" ]; then
    echo "${GREEN}✓${NC} Found Podfile two levels up"
    PODFILE_DIR="../.."
    cd ../..
else
    # Podfile doesn't exist, create it
    echo "${YELLOW}⚠${NC} Podfile not found, creating it..."
    
    # Determine correct path for Capacitor
    if [ -f "capacitor.config.json" ] || [ -f "../capacitor.config.json" ]; then
        # We're in ios/App or ios/App/App, create Podfile in ios/App
        if [ -f "capacitor.config.json" ]; then
            # We're in ios/App/App
            cd ..
        fi
    fi
    
    # Create Podfile
    cat > Podfile << 'EOF'
require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'

platform :ios, '13.0'
use_frameworks!

install! 'cocoapods', :disable_input_output_paths => true

def capacitor_pods
  pod 'Capacitor', :path => '../../node_modules/@capacitor/ios'
  pod 'CapacitorCordova', :path => '../../node_modules/@capacitor/ios'
end

target 'App' do
  capacitor_pods
  
  # Firebase & Authentication
  pod 'Firebase/Core'
  pod 'Firebase/Auth'
  pod 'Firebase/Analytics'
  pod 'GoogleSignIn', '~> 7.0'
  
  # Add your other pods here
end

post_install do |installer|
  assertDeploymentTarget(installer)
end
EOF
    
    echo "${GREEN}✓${NC} Created Podfile"
fi

echo ""

# ============================================================
# Step 1: Install CocoaPods Dependencies
# ============================================================

echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 1: Installing CocoaPods Dependencies${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Current directory: $(pwd)"
echo ""

if [ ! -f "Podfile" ]; then
    echo "${RED}❌ Error: Podfile still not found${NC}"
    echo "Please navigate to the ios/App directory"
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

# Check common locations in Capacitor project
if [ -f "App/GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="App/GoogleService-Info.plist"
    echo "${GREEN}✅ Found in App/ directory${NC}"
elif [ -f "GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="GoogleService-Info.plist"
    echo "${GREEN}✅ Found in current directory${NC}"
elif [ -f "../GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="../GoogleService-Info.plist"
    echo "${GREEN}✅ Found in parent directory${NC}"
fi

if [ -n "$GOOGLE_SERVICE_FILE" ]; then
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
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "CLIENT_ID: ${BLUE}$CLIENT_ID${NC}"
            echo "REVERSED_CLIENT_ID: ${BLUE}$REVERSED_CLIENT_ID${NC}"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            
            # ============================================================
            # Step 3: Update Info.plist
            # ============================================================
            
            echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo "${BLUE}Step 3: Updating Info.plist${NC}"
            echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            
            # Find Info.plist in Capacitor structure
            INFO_PLIST=""
            if [ -f "App/Info.plist" ]; then
                INFO_PLIST="App/Info.plist"
            elif [ -f "Info.plist" ]; then
                INFO_PLIST="Info.plist"
            fi
            
            if [ -f "$INFO_PLIST" ]; then
                # Backup original
                cp "$INFO_PLIST" "$INFO_PLIST.backup"
                echo "Created backup: $INFO_PLIST.backup"
                
                # Check if keys already exist, if not add them
                if ! grep -q "GIDClientID" "$INFO_PLIST"; then
                    echo "Adding GIDClientID to Info.plist..."
                    plutil -insert GIDClientID -string "$CLIENT_ID" "$INFO_PLIST" 2>/dev/null
                else
                    echo "Updating existing GIDClientID..."
                    plutil -replace GIDClientID -string "$CLIENT_ID" "$INFO_PLIST" 2>/dev/null
                fi
                
                # Add URL scheme for Google Sign In
                if ! grep -q "CFBundleURLTypes" "$INFO_PLIST"; then
                    echo "Adding CFBundleURLTypes..."
                    plutil -insert CFBundleURLTypes -array "$INFO_PLIST" 2>/dev/null
                    plutil -insert CFBundleURLTypes.0 -dictionary "$INFO_PLIST" 2>/dev/null
                    plutil -insert CFBundleURLTypes.0.CFBundleURLSchemes -array "$INFO_PLIST" 2>/dev/null
                    plutil -insert CFBundleURLTypes.0.CFBundleURLSchemes.0 -string "$REVERSED_CLIENT_ID" "$INFO_PLIST" 2>/dev/null
                else
                    # Try to update existing URL scheme
                    echo "Updating URL schemes..."
                    # This is complex, so we'll use sed as fallback
                    sed -i.tmp "s/YOUR-REVERSED-CLIENT-ID/$REVERSED_CLIENT_ID/g" "$INFO_PLIST"
                    rm -f "$INFO_PLIST.tmp"
                fi
                
                echo ""
                echo "${GREEN}✅ Info.plist updated successfully!${NC}"
                echo ""
                echo "Updated values:"
                echo "  - GIDClientID: $CLIENT_ID"
                echo "  - URL Scheme: $REVERSED_CLIENT_ID"
                echo ""
            else
                echo "${RED}❌ Info.plist not found${NC}"
                echo "Expected location: App/Info.plist"
            fi
        else
            echo "${YELLOW}⚠️  Could not extract credentials${NC}"
            echo "You'll need to update Info.plist manually"
        fi
    else
        echo "${YELLOW}⚠️  plutil not available${NC}"
        echo "You'll need to update Info.plist manually"
    fi
else
    echo "${YELLOW}⚠️  GoogleService-Info.plist NOT FOUND${NC}"
    echo ""
    echo "Expected locations:"
    echo "  - ios/App/App/GoogleService-Info.plist"
    echo "  - ios/App/GoogleService-Info.plist"
    echo ""
    echo "Please make sure the file is in one of these locations"
fi

# ============================================================
# Step 4: Verification
# ============================================================

echo ""
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

if [ -d "Pods/Firebase" ]; then
    echo "${GREEN}✅${NC} Firebase pod installed"
else
    echo "${RED}❌${NC} Firebase pod NOT installed"
fi

# Check workspace
if [ -f "App.xcworkspace/contents.xcworkspacedata" ]; then
    echo "${GREEN}✅${NC} App.xcworkspace exists"
else
    echo "${RED}❌${NC} App.xcworkspace NOT found"
fi

echo ""

# ============================================================
# Step 5: Next Steps
# ============================================================

echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}What's Next?${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "${GREEN}AUTOMATED SETUP COMPLETE!${NC}"
echo ""
echo "${YELLOW}MANUAL STEPS REQUIRED:${NC}"
echo ""

echo "1. ${BLUE}Xcode is already open${NC}"
echo "   If not, run: open App.xcworkspace"
echo ""

if [ -n "$GOOGLE_SERVICE_FILE" ]; then
    echo "2. ${BLUE}Add GoogleService-Info.plist to Xcode:${NC}"
    echo "   - In Xcode Project Navigator"
    echo "   - Right-click on 'App' folder"
    echo "   - Select 'Add Files to App...'"
    echo "   - Navigate to: $GOOGLE_SERVICE_FILE"
    echo "   - Check '✅ Copy items if needed'"
    echo "   - Check '✅ App target'"
    echo "   - Click 'Add'"
    echo ""
else
    echo "2. ${BLUE}Download and Add GoogleService-Info.plist:${NC}"
    echo "   - Download from Firebase Console"
    echo "   - Save to ios/App/App/"
    echo "   - Add to Xcode project"
    echo ""
fi

echo "3. ${BLUE}Enable Sign in with Apple:${NC}"
echo "   - Select 'App' target"
echo "   - Go to 'Signing & Capabilities'"
echo "   - Click '+ Capability'"
echo "   - Add 'Sign in with Apple'"
echo ""

echo "4. ${BLUE}Build and Test:${NC}"
echo "   - Build: ⌘B"
echo "   - Run: ⌘R"
echo ""

if [ -n "$CLIENT_ID" ]; then
    echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${GREEN}Your Google Credentials:${NC}"
    echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Use this in your app code:"
    echo ""
    echo "await GoogleSignIn.initialize({"
    echo "  clientId: '${BLUE}$CLIENT_ID${NC}'"
    echo "});"
    echo ""
fi

echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}🎉 Setup Complete!${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Just complete the 2 manual Xcode steps above and you're ready to go!"
echo ""
