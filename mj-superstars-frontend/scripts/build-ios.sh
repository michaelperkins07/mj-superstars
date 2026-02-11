#!/bin/bash
# ============================================================
# Top Performer — iOS TestFlight Build Script
# Run this on your Mac from the mj-superstars-frontend/ directory
# ============================================================

set -e

echo "🚀 Top Performer iOS Build"
echo "=========================="
echo ""

# Step 1: Pull latest code
echo "📥 Step 1/5: Pulling latest code..."
cd "$(dirname "$0")/.."
git pull origin main
echo "✅ Code updated"
echo ""

# Step 2: Install dependencies
echo "📦 Step 2/5: Installing dependencies..."
npm install --legacy-peer-deps
echo "✅ Dependencies installed"
echo ""

# Step 3: Build web assets
echo "🔨 Step 3/5: Building web assets..."
npm run build
echo "✅ Web build complete"
echo ""

# Step 4: Sync to iOS
echo "📱 Step 4/5: Syncing to iOS..."
npx cap sync ios
echo "✅ iOS project synced"
echo ""

# Step 5: Open Xcode
echo "🍎 Step 5/5: Opening Xcode..."
npx cap open ios
echo ""
echo "============================================================"
echo "✅ READY! Now in Xcode:"
echo ""
echo "   1. Select your Team: FAAWCBHB9C (Mike Perkins)"
echo "   2. Bundle ID should be: com.topperformer.app"
echo "   3. Set Version: 1.0.0 and Build: 1"
echo "   4. Select 'Any iOS Device' as build target"
echo "   5. Product → Archive"
echo "   6. When archive completes → Distribute App → App Store Connect"
echo "   7. Wait ~15 min for TestFlight processing"
echo ""
echo "   App Store ID: 6743862814"
echo "============================================================"
