#!/bin/bash
# ============================================================
# MJ's Superstars - Setup & Deploy Script
# Run this after downloading the project folder
# ============================================================

set -e

echo "🌟 MJ's Superstars - Setup Script"
echo "=================================="

# Check prerequisites
command -v git >/dev/null 2>&1 || { echo "❌ Git is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }

# Get GitHub username
read -p "Enter your GitHub username: " GITHUB_USER
read -p "Enter repository name (default: mj-superstars): " REPO_NAME
REPO_NAME=${REPO_NAME:-mj-superstars}

echo ""
echo "📦 Step 1: Initializing Git repository..."
git init
git branch -M main

echo ""
echo "📝 Step 2: Creating initial commit..."
git add .
git commit -m "Initial commit: MJ's Superstars v1.0.0

- Full-stack mental health coaching app
- Node.js/Express backend with Claude AI integration
- React frontend with Capacitor for iOS
- PostgreSQL + Redis infrastructure
- Render deployment configuration
- Sentry error tracking
- Feature flags system
- Background job processing
- GDPR compliance & data export
- Webhook integrations"

echo ""
echo "🔗 Step 3: Setting up remote..."
echo ""
echo "⚠️  IMPORTANT: First create a new repository on GitHub:"
echo "   1. Go to: https://github.com/new"
echo "   2. Name: $REPO_NAME"
echo "   3. Make it PRIVATE (contains API configuration)"
echo "   4. Do NOT initialize with README"
echo "   5. Click 'Create repository'"
echo ""
read -p "Press Enter when you've created the repository..."

git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"

echo ""
echo "🚀 Step 4: Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Success! Your code is now on GitHub."
echo ""
echo "📋 Next Steps:"
echo "   1. Go to https://dashboard.render.com"
echo "   2. Click 'New' → 'Blueprint'"
echo "   3. Connect your GitHub account"
echo "   4. Select the '$REPO_NAME' repository"
echo "   5. Render will detect render.yaml and create all services"
echo ""
echo "🔑 After Render deploys, set these environment variables:"
echo "   - ANTHROPIC_API_KEY (your Claude API key)"
echo "   - CLIENT_URL (your frontend URL from Render)"
echo "   - SENTRY_DSN (optional, for error tracking)"
echo ""
echo "📚 See RENDER-DEPLOY.md for detailed instructions"
echo ""
echo "🌟 Happy launching!"
