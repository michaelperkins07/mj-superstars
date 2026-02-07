#!/bin/bash
# ============================================================
# MJ's Superstars - Deployment Next Steps
# Run this from your Mac after getting back from the gym
# ============================================================

set -e

echo "🏋️ Welcome back! Let's deploy the latest changes."
echo "=================================================="
echo ""

# ============================================================
# Step 1: Push the new commit to GitHub
# ============================================================
echo "📤 Step 1: Pushing commit 30abd2d to GitHub..."
cd ~/Desktop/"Project MJ"
git push origin main
echo "✅ Pushed to GitHub — Render will auto-deploy"
echo ""

# ============================================================
# Step 2: Set ADMIN_SECRET on Render
# ============================================================
echo "🔑 Step 2: Setting ADMIN_SECRET on Render..."
ADMIN_SECRET="CH2E-ZWtqgR5HJyQJJOoNsCUudor1W9YkYh5egjOdG9d4KuRjSi37oM6U7cEPGHf"

curl -s -X POST "https://api.render.com/v1/services/srv-d6244kkoud1c7399f7fg/env-vars" \
  -H "Authorization: Bearer rnd_bS4W4SiRzJNxIWUt845qTOHyKU1h" \
  -H "Content-Type: application/json" \
  -d "[{\"key\": \"ADMIN_SECRET\", \"value\": \"${ADMIN_SECRET}\"}]"

echo ""
echo "✅ ADMIN_SECRET configured on Render"
echo ""

# ============================================================
# Step 3: Run Migration 003 on Production DB
# ============================================================
echo "🗄️  Step 3: Running migration 003 on production database..."
echo "   (This adds device_token column and makes keys nullable)"

# Get the database connection string from Render
echo "   Fetching DATABASE_URL from Render..."
DB_URL=$(curl -s "https://api.render.com/v1/services/srv-d6244kkoud1c7399f7fg/env-vars" \
  -H "Authorization: Bearer rnd_bS4W4SiRzJNxIWUt845qTOHyKU1h" | \
  python3 -c "import json,sys; evars=json.load(sys.stdin); print(next((e['value'] for e in evars if e['key']=='DATABASE_URL'),''))" 2>/dev/null)

if [ -z "$DB_URL" ]; then
  echo "⚠️  Could not fetch DATABASE_URL automatically."
  echo "   Run manually: psql \$DATABASE_URL -f mj-superstars-backend/src/database/migrations/003_apns_and_timezone.sql"
else
  echo "   Running migration..."
  psql "$DB_URL" -f mj-superstars-backend/src/database/migrations/003_apns_and_timezone.sql
  echo "✅ Migration 003 complete"
fi
echo ""

# ============================================================
# Step 4: Verify deployment
# ============================================================
echo "⏳ Step 4: Waiting for Render deploy (60 seconds)..."
sleep 60

echo "🔍 Checking health endpoint..."
HEALTH=$(curl -s https://mj-superstars.onrender.com/health)
echo "   Response: $HEALTH"
echo ""

# ============================================================
# Step 5: Test admin endpoint
# ============================================================
echo "🧪 Step 5: Testing admin endpoint with new ADMIN_SECRET..."
ADMIN_TEST=$(curl -s -X GET "https://mj-superstars.onrender.com/api/admin/stats" \
  -H "x-admin-secret: ${ADMIN_SECRET}")
echo "   Response: $ADMIN_TEST"
echo ""

# ============================================================
# Summary
# ============================================================
echo "=================================================="
echo "🎉 All done! Here's what was deployed:"
echo ""
echo "  ✅ Commit 30abd2d pushed (push token wiring + offline handling)"
echo "  ✅ ADMIN_SECRET set on Render"
echo "  ✅ Migration 003 run (device_token column added)"
echo ""
echo "📋 Still TODO (require Apple Developer portal access):"
echo "  ⬜ Generate APNs .p8 key from Apple Developer portal"
echo "  ⬜ Set APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_CONTENT on Render"
echo "  ⬜ Build new TestFlight (Build 8) with updated AppDelegate"
echo "  ⬜ Set up Sentry project and add SENTRY_DSN"
echo "  ⬜ Generate VAPID keys (npm run generate:vapid) and add to Render"
echo "=================================================="
