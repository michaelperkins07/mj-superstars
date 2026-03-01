#!/bin/bash
# === LAUNCH DAY SCRIPT ===
# Run this when the app goes live on the App Store
# It will:
# 1. Update all 24 sites from "Join Waitlist" → "Download Now"
# 2. Trigger email blast to all waitlist subscribers
# 3. Trigger SMS blast to all opt-in subscribers
# 4. Update countdown timers to "AVAILABLE NOW"

set -e

DEPLOY_DIR="/sessions/serene-peaceful-hamilton/deploy"
CF_TOKEN="VrVKGpZLe3TwbcyRepKDCv0_A_E4vJOnFtUPegit"
SUPABASE_URL="https://ioxidarwheoohkaglbkw.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveGlkYXJ3aGVvb2hrYWdsYmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDUzMTIsImV4cCI6MjA4NjU4MTMxMn0.jmSG_LmVZj0fVpxsvBYpHUKc9iT_YXz__-GDMHAA4HA"

PROJECTS=("topperformer" "belikebrady" "belikegoggins" "belikejocko" "belikelebron" "belikemessi" "belikeshohei" "beliketyson" "belikeperk" "belikekim" "belikeselena" "beliketaylor" "belikebeyonce" "belikebarack" "belikemichelle" "belikeoprah" "belikepatrick" "belikeronaldo" "belikesabrina" "belikeserena" "belikesteph" "beliketravis" "beliketrevor" "belikevirgil")
TOTAL_PROJECTS=${#PROJECTS[@]}

echo "🚀 =========================================="
echo "🚀 TOP PERFORMER COACH — LAUNCH DAY SCRIPT"
echo "🚀 =========================================="
echo ""

# Step 1: Update all websites
echo "📱 Step 1: Updating all $TOTAL_PROJECTS websites..."
for proj in "${PROJECTS[@]}"; do
  INDEX="$DEPLOY_DIR/$proj/index.html"
  if [ -f "$INDEX" ]; then
    # Replace waitlist CTA with download CTA
    sed -i 's/Join the Waitlist/Download Now — Free/gi' "$INDEX"
    sed -i 's/Join Waitlist/Download Now/gi' "$INDEX"
    sed -i 's/Get Early Access/Download Free/gi' "$INDEX"
    sed -i 's/Reserve Your Spot/Get It Now/gi' "$INDEX"
    sed -i 's/Start Your Journey/Download Now — Free/gi' "$INDEX"
    sed -i 's/Get notified/Download Now/gi' "$INDEX"
    sed -i 's/Early Access/Download Free/gi' "$INDEX"

    # Replace countdown section with "AVAILABLE NOW"
    sed -i 's/Launching Soon/Available Now/gi' "$INDEX"
    sed -i 's/Coming Soon/Available Now/gi' "$INDEX"

    # Update JS waitlist logic to redirect to App Store
    sed -i "s|joined the waitlist|downloading now|gi" "$INDEX"
    
    echo "  ✓ $proj updated"
  fi
done

# Step 2: Deploy all sites
echo ""
echo "☁️  Step 2: Deploying all sites to Cloudflare..."
FAIL=0
for proj in "${PROJECTS[@]}"; do
  cd "$DEPLOY_DIR/$proj"
  RESULT=$(CLOUDFLARE_API_TOKEN="$CF_TOKEN" npx wrangler pages deploy . --project-name=$proj 2>&1)
  if echo "$RESULT" | grep -q "Deployment complete"; then
    echo "  ✓ $proj deployed"
  else
    echo "  ✗ $proj FAILED"
    FAIL=$((FAIL + 1))
  fi
done
echo "  Deployed: $(($TOTAL_PROJECTS - FAIL))/$TOTAL_PROJECTS | Failed: $FAIL"

# Step 3: Trigger email blast (launch announcement)
echo ""
echo "📧 Step 3: Triggering launch email blast..."
curl -s "$SUPABASE_URL/functions/v1/email-drip" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"launch_mode": true}'
echo ""

# Step 4: Trigger SMS blast
echo ""
echo "📱 Step 4: Triggering SMS blast..."
SMS_RESULT=$(curl -s "$SUPABASE_URL/functions/v1/sms-blast" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "🚀 Top Performer Coach just launched! Download now for FREE: https://apps.apple.com/app/id6759122798"}')
echo "  SMS Result: $SMS_RESULT"

echo ""
echo "🎉 =========================================="
echo "🎉 LAUNCH COMPLETE!"
echo "🎉 =========================================="
echo ""
echo "Next steps:"
echo "  1. Monitor App Store Connect for downloads"
echo "  2. Watch analytics: https://topperformer.ai/analytics"
echo "  3. Check A/B results: ab-results Edge Function"
echo "  4. Respond to any reviews within 24 hours"
