#!/bin/bash
# Post-sync script: Adds custom native plugins to capacitor.config.json packageClassList
# Run this after 'npx cap sync' to ensure SignInWithApplePlugin and InAppPurchasePlugin are registered

CONFIG_FILE="ios/App/App/capacitor.config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "⚠️  capacitor.config.json not found at $CONFIG_FILE"
  exit 1
fi

# Check if SignInWithApplePlugin is already in the list
if grep -q "SignInWithApplePlugin" "$CONFIG_FILE"; then
  echo "✅ Custom plugins already registered in packageClassList"
  exit 0
fi

# Use node to safely modify the JSON
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
if (config.packageClassList && Array.isArray(config.packageClassList)) {
  if (!config.packageClassList.includes('SignInWithApplePlugin')) {
    config.packageClassList.push('SignInWithApplePlugin');
  }
  if (!config.packageClassList.includes('InAppPurchasePlugin')) {
    config.packageClassList.push('InAppPurchasePlugin');
  }
  fs.writeFileSync('$CONFIG_FILE', JSON.stringify(config, null, '\t') + '\n');
  console.log('✅ Added SignInWithApplePlugin and InAppPurchasePlugin to packageClassList');
} else {
  console.log('⚠️  No packageClassList found in config');
}
"
