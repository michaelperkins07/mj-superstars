#!/bin/bash

# ============================================================
# Generate Configuration File from GoogleService-Info.plist
# ============================================================

echo "🔧 Generating configuration file..."
echo ""

GOOGLE_SERVICE_FILE=""

# Find GoogleService-Info.plist
if [ -f "GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="GoogleService-Info.plist"
elif [ -f "App/GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="App/GoogleService-Info.plist"
elif [ -f "ios/App/GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="ios/App/GoogleService-Info.plist"
elif [ -f "../../GoogleService-Info.plist" ]; then
    GOOGLE_SERVICE_FILE="../../GoogleService-Info.plist"
fi

if [ -z "$GOOGLE_SERVICE_FILE" ]; then
    echo "❌ GoogleService-Info.plist not found"
    echo ""
    echo "Please download it from Firebase Console:"
    echo "1. Go to https://console.firebase.google.com"
    echo "2. Select your project"
    echo "3. Project Settings > Your iOS App"
    echo "4. Download GoogleService-Info.plist"
    echo "5. Place it in ios/App directory"
    echo "6. Run this script again"
    exit 1
fi

echo "✅ Found: $GOOGLE_SERVICE_FILE"

# Extract values
if command -v plutil &> /dev/null; then
    CLIENT_ID=$(plutil -extract CLIENT_ID raw "$GOOGLE_SERVICE_FILE" 2>/dev/null)
    REVERSED_CLIENT_ID=$(plutil -extract REVERSED_CLIENT_ID raw "$GOOGLE_SERVICE_FILE" 2>/dev/null)
    BUNDLE_ID=$(plutil -extract BUNDLE_ID raw "$GOOGLE_SERVICE_FILE" 2>/dev/null)
    PROJECT_ID=$(plutil -extract PROJECT_ID raw "$GOOGLE_SERVICE_FILE" 2>/dev/null)
    
    echo "✅ Extracted credentials"
    echo ""
    
    # Create TypeScript config file
    cat > auth-config.ts << EOF
/**
 * Authentication Configuration
 * Auto-generated from GoogleService-Info.plist
 * 
 * DO NOT commit this file to version control!
 * Add auth-config.ts to your .gitignore
 */

export const AUTH_CONFIG = {
  google: {
    clientId: '$CLIENT_ID',
    reversedClientId: '$REVERSED_CLIENT_ID',
  },
  firebase: {
    projectId: '$PROJECT_ID',
    bundleId: '$BUNDLE_ID',
  },
};

// For use in your app:
// import { AUTH_CONFIG } from './auth-config';
// await GoogleSignIn.initialize({ clientId: AUTH_CONFIG.google.clientId });
EOF
    
    echo "✅ Created: auth-config.ts"
    echo ""
    echo "Your credentials:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "CLIENT_ID: $CLIENT_ID"
    echo "REVERSED_CLIENT_ID: $REVERSED_CLIENT_ID"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Create .env file
    cat > .env.auth << EOF
# Authentication Environment Variables
# Auto-generated from GoogleService-Info.plist

GOOGLE_CLIENT_ID=$CLIENT_ID
GOOGLE_REVERSED_CLIENT_ID=$REVERSED_CLIENT_ID
FIREBASE_PROJECT_ID=$PROJECT_ID
BUNDLE_ID=$BUNDLE_ID
EOF
    
    echo "✅ Created: .env.auth"
    echo ""
    
    # Add to .gitignore
    if [ -f ".gitignore" ]; then
        if ! grep -q "auth-config.ts" .gitignore; then
            echo "" >> .gitignore
            echo "# Auth credentials (auto-generated)" >> .gitignore
            echo "auth-config.ts" >> .gitignore
            echo ".env.auth" >> .gitignore
            echo "✅ Added to .gitignore"
        fi
    fi
    
    echo ""
    echo "📝 Next steps:"
    echo "1. Use these values in your app code"
    echo "2. Import: import { AUTH_CONFIG } from './auth-config';"
    echo "3. Use: GoogleSignIn.initialize({ clientId: AUTH_CONFIG.google.clientId })"
    echo ""
    
else
    echo "❌ plutil not available"
    echo "Please extract values manually from GoogleService-Info.plist"
    exit 1
fi
