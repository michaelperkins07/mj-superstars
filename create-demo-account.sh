#!/bin/bash
# ============================================================
# MJ's Superstars - Create Demo Account for App Store Review
# Apple requires a working demo account during review
# ============================================================

API_URL="https://mj-superstars.onrender.com/api"

echo "Creating demo account for App Store review..."

RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@mjsuperstars.com",
    "password": "MJDemo2026!",
    "display_name": "Demo User"
  }')

echo "Response: $RESPONSE"
echo ""
echo "Demo account credentials:"
echo "  Email: demo@mjsuperstars.com"
echo "  Password: MJDemo2026!"
echo ""
echo "Add these to the 'Notes for Review' in App Store Connect."
