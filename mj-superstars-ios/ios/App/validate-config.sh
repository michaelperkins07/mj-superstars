#!/bin/bash

# ============================================================
# Configuration Validation Script
# ============================================================

echo "🔍 Validating Apple & Google Sign In Configuration..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# ============================================================
# Check 1: File Existence
# ============================================================

echo "${BLUE}Checking file existence...${NC}"

if [ -f "GoogleSignInPlugin.swift" ]; then
    echo "  ${GREEN}✓${NC} GoogleSignInPlugin.swift found"
else
    echo "  ${RED}✗${NC} GoogleSignInPlugin.swift NOT FOUND"
    ((ERRORS++))
fi

if [ -f "GoogleSignInPlugin.m" ]; then
    echo "  ${GREEN}✓${NC} GoogleSignInPlugin.m found"
else
    echo "  ${RED}✗${NC} GoogleSignInPlugin.m NOT FOUND"
    ((ERRORS++))
fi

if [ -f "SignInWithApplePlugin.swift" ]; then
    echo "  ${GREEN}✓${NC} SignInWithApplePlugin.swift found"
else
    echo "  ${RED}✗${NC} SignInWithApplePlugin.swift NOT FOUND"
    ((ERRORS++))
fi

if [ -f "SignInWithApplePlugin.m" ]; then
    echo "  ${GREEN}✓${NC} SignInWithApplePlugin.m found"
else
    echo "  ${RED}✗${NC} SignInWithApplePlugin.m NOT FOUND"
    ((ERRORS++))
fi

if [ -f "AppDelegate.swift" ]; then
    echo "  ${GREEN}✓${NC} AppDelegate.swift found"
else
    echo "  ${RED}✗${NC} AppDelegate.swift NOT FOUND"
    ((ERRORS++))
fi

if [ -f "Podfile" ]; then
    echo "  ${GREEN}✓${NC} Podfile found"
else
    echo "  ${RED}✗${NC} Podfile NOT FOUND"
    ((ERRORS++))
fi

if [ -f "Info.plist" ]; then
    echo "  ${GREEN}✓${NC} Info.plist found"
else
    echo "  ${RED}✗${NC} Info.plist NOT FOUND"
    ((ERRORS++))
fi

echo ""

# ============================================================
# Check 2: Podfile Configuration
# ============================================================

echo "${BLUE}Checking Podfile...${NC}"

if [ -f "Podfile" ]; then
    if grep -q "GoogleSignIn" Podfile; then
        echo "  ${GREEN}✓${NC} GoogleSignIn pod configured"
    else
        echo "  ${RED}✗${NC} GoogleSignIn pod NOT configured in Podfile"
        ((ERRORS++))
    fi
    
    if [ -d "Pods" ]; then
        echo "  ${GREEN}✓${NC} Pods directory exists"
        
        if [ -d "Pods/GoogleSignIn" ]; then
            echo "  ${GREEN}✓${NC} GoogleSignIn pod installed"
        else
            echo "  ${YELLOW}⚠${NC} GoogleSignIn pod not installed - Run 'pod install'"
            ((WARNINGS++))
        fi
    else
        echo "  ${YELLOW}⚠${NC} Pods not installed - Run 'pod install'"
        ((WARNINGS++))
    fi
fi

echo ""

# ============================================================
# Check 3: Info.plist Configuration
# ============================================================

echo "${BLUE}Checking Info.plist configuration...${NC}"

if [ -f "Info.plist" ]; then
    # Check for GIDClientID
    if grep -q "GIDClientID" Info.plist; then
        echo "  ${GREEN}✓${NC} GIDClientID key found"
        
        # Check if still has placeholder
        if grep -q "YOUR-CLIENT-ID" Info.plist; then
            echo "  ${RED}✗${NC} GIDClientID still has placeholder value!"
            echo "      Update with your actual CLIENT_ID from GoogleService-Info.plist"
            ((ERRORS++))
        else
            echo "  ${GREEN}✓${NC} GIDClientID appears to be configured"
        fi
    else
        echo "  ${RED}✗${NC} GIDClientID key NOT FOUND in Info.plist"
        ((ERRORS++))
    fi
    
    # Check for CFBundleURLSchemes
    if grep -q "CFBundleURLSchemes" Info.plist; then
        echo "  ${GREEN}✓${NC} CFBundleURLSchemes found"
        
        # Check if still has placeholder
        if grep -q "YOUR-REVERSED-CLIENT-ID" Info.plist; then
            echo "  ${RED}✗${NC} CFBundleURLSchemes still has placeholder value!"
            echo "      Update with your actual REVERSED_CLIENT_ID from GoogleService-Info.plist"
            ((ERRORS++))
        else
            echo "  ${GREEN}✓${NC} CFBundleURLSchemes appears to be configured"
        fi
    else
        echo "  ${RED}✗${NC} CFBundleURLSchemes NOT FOUND in Info.plist"
        ((ERRORS++))
    fi
else
    echo "  ${RED}✗${NC} Info.plist not found"
    ((ERRORS++))
fi

echo ""

# ============================================================
# Check 4: AppDelegate Configuration
# ============================================================

echo "${BLUE}Checking AppDelegate.swift...${NC}"

if [ -f "AppDelegate.swift" ]; then
    if grep -q "import GoogleSignIn" AppDelegate.swift; then
        echo "  ${GREEN}✓${NC} GoogleSignIn import found"
    else
        echo "  ${RED}✗${NC} GoogleSignIn import NOT FOUND"
        ((ERRORS++))
    fi
    
    if grep -q "GIDSignIn.sharedInstance.handle" AppDelegate.swift; then
        echo "  ${GREEN}✓${NC} Google Sign In URL handling configured"
    else
        echo "  ${RED}✗${NC} Google Sign In URL handling NOT FOUND"
        ((ERRORS++))
    fi
fi

echo ""

# ============================================================
# Check 5: GoogleService-Info.plist
# ============================================================

echo "${BLUE}Checking for GoogleService-Info.plist...${NC}"

# Check in common locations
GOOGLE_SERVICE_FILE=""

if [ -f "GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="GoogleService-Info.plist"
elif [ -f "App/GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="App/GoogleService-Info.plist"
elif [ -f "../GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="../GoogleService-Info.plist"
fi

if [ -n "$GOOGLE_SERVICE_FILE" ]; then
    echo "  ${GREEN}✓${NC} GoogleService-Info.plist found at: $GOOGLE_SERVICE_FILE"
    
    # Extract CLIENT_ID for verification
    if command -v plutil &> /dev/null; then
        CLIENT_ID=$(plutil -extract CLIENT_ID raw "$GOOGLE_SERVICE_FILE" 2>/dev/null)
        REVERSED_CLIENT_ID=$(plutil -extract REVERSED_CLIENT_ID raw "$GOOGLE_SERVICE_FILE" 2>/dev/null)
        
        if [ -n "$CLIENT_ID" ]; then
            echo "  ${GREEN}✓${NC} CLIENT_ID found: $CLIENT_ID"
        fi
        
        if [ -n "$REVERSED_CLIENT_ID" ]; then
            echo "  ${GREEN}✓${NC} REVERSED_CLIENT_ID found: $REVERSED_CLIENT_ID"
        fi
    fi
else
    echo "  ${YELLOW}⚠${NC} GoogleService-Info.plist NOT FOUND"
    echo "      Download from Firebase Console and add to Xcode project"
    ((WARNINGS++))
fi

echo ""

# ============================================================
# Check 6: Workspace
# ============================================================

echo "${BLUE}Checking Xcode workspace...${NC}"

if [ -f "App.xcworkspace/contents.xcworkspacedata" ]; then
    echo "  ${GREEN}✓${NC} App.xcworkspace exists"
    echo "  ${GREEN}→${NC} Remember to open App.xcworkspace (not .xcodeproj)"
else
    if [ -d "Pods" ]; then
        echo "  ${YELLOW}⚠${NC} Workspace not found but Pods exist"
        echo "      Try running: pod install"
        ((WARNINGS++))
    else
        echo "  ${YELLOW}⚠${NC} Workspace not found"
        echo "      Run 'pod install' to create it"
        ((WARNINGS++))
    fi
fi

echo ""

# ============================================================
# Summary
# ============================================================

echo "${BLUE}════════════════════════════════════════${NC}"
echo "${BLUE}Summary:${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open App.xcworkspace in Xcode"
    echo "2. Enable 'Sign in with Apple' capability"
    echo "3. Build and test on a device"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo "${YELLOW}⚠️  Configuration mostly complete with $WARNINGS warning(s)${NC}"
    echo ""
    echo "You can proceed, but review warnings above"
    echo ""
else
    echo "${RED}❌ Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before proceeding"
    echo ""
    echo "Common fixes:"
    echo "1. Run: pod install"
    echo "2. Update Info.plist with your Google credentials"
    echo "3. Download GoogleService-Info.plist from Firebase"
    echo ""
fi

echo "${BLUE}════════════════════════════════════════${NC}"

# Exit with error code if there are errors
if [ $ERRORS -gt 0 ]; then
    exit 1
fi

exit 0
