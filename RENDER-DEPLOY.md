# 🚀 MJ's Superstars - Render Deployment Guide

## Quick Start (One-Click Deploy)

### Step 1: Prerequisites
Before deploying, you'll need:
- [ ] **Render account** (render.com)
- [ ] **Anthropic API key** (console.anthropic.com)
- [ ] **Sentry account** (sentry.io) - for error tracking
- [ ] **Apple Developer account** (for iOS app)
- [ ] **VAPID keys** for push notifications

### Step 2: Generate VAPID Keys
Run this locally to generate push notification keys:
```bash
npx web-push generate-vapid-keys
```
Save both the public and private keys.

### Step 3: Deploy to Render

#### Option A: Blueprint (Recommended)
1. Push code to GitHub/GitLab
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New Blueprint"**
4. Connect your repo
5. Render will detect `render.yaml` and create all services

#### Option B: Manual Setup
1. Create PostgreSQL database
2. Create Redis instance
3. Create Web Service for API
4. Create Static Site for frontend
5. Create Background Worker

### Step 4: Configure Environment Variables

After Blueprint deploys, set these in the Render dashboard:

#### API Service (`mj-superstars-api`)
| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Claude API key | ✅ |
| `CLIENT_URL` | Frontend URL (e.g., `https://mj-superstars-web.onrender.com`) | ✅ |
| `SENTRY_DSN` | Sentry project DSN | ⚠️ |
| `VAPID_PUBLIC_KEY` | Push notification public key | ⚠️ |
| `VAPID_PRIVATE_KEY` | Push notification private key | ⚠️ |

#### Frontend (`mj-superstars-web`)
| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_API_URL` | API URL (e.g., `https://mj-superstars-api.onrender.com`) | ✅ |
| `REACT_APP_SOCKET_URL` | Same as API URL | ✅ |
| `REACT_APP_SENTRY_DSN` | Frontend Sentry DSN | ⚠️ |
| `REACT_APP_MIXPANEL_TOKEN` | Analytics token | ⚠️ |

### Step 5: Run Database Migrations

After first deploy, run migrations:

```bash
# Connect to Render shell (from dashboard)
node src/database/migrate.js migrate

# Optionally seed demo data
node src/database/migrate.js seed
```

Or use the Render dashboard:
1. Go to API service → Shell
2. Run the migration commands

### Step 6: Verify Deployment

1. **Health Check**: Visit `https://your-api.onrender.com/health`
2. **Deep Health**: Visit `https://your-api.onrender.com/health/deep`
3. **Frontend**: Visit `https://your-web.onrender.com`

---

## Environment Variables Reference

### Required for Production

```env
# === REQUIRED ===
NODE_ENV=production
ANTHROPIC_API_KEY=sk-ant-...
CLIENT_URL=https://mj-superstars-web.onrender.com

# === AUTO-SET BY RENDER ===
DATABASE_URL=postgres://...
REDIS_URL=redis://...
JWT_SECRET=auto-generated
PORT=10000
```

### Optional but Recommended

```env
# Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx

# Push Notifications
VAPID_PUBLIC_KEY=BL...
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:support@yourapp.com

# Analytics
MIXPANEL_TOKEN=xxx

# Apple (for subscriptions)
APPLE_SHARED_SECRET=xxx

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Service Architecture on Render

```
┌─────────────────────────────────────────────────────────┐
│                    RENDER PLATFORM                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │   Static Site    │      │   Web Service    │         │
│  │  (React Frontend)│◄────►│  (Node.js API)   │         │
│  │   $7/month       │      │   $7/month       │         │
│  └──────────────────┘      └────────┬─────────┘         │
│                                     │                    │
│          ┌──────────────────────────┼──────────┐        │
│          │                          │          │        │
│          ▼                          ▼          ▼        │
│  ┌──────────────┐    ┌──────────────┐  ┌─────────────┐ │
│  │  PostgreSQL  │    │    Redis     │  │   Worker    │ │
│  │   Database   │    │    Cache     │  │ (Jobs/Queue)│ │
│  │   $7/month   │    │   $7/month   │  │  $7/month   │ │
│  └──────────────┘    └──────────────┘  └─────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘

Total: ~$28-35/month for starter tier
```

---

## Post-Deployment Checklist

### Immediate (Day 1)
- [ ] Verify health endpoints
- [ ] Test user registration
- [ ] Test login flow
- [ ] Test chat with MJ
- [ ] Verify database connections
- [ ] Check error tracking in Sentry

### Before Launch
- [ ] Set up custom domain
- [ ] Enable SSL (automatic on Render)
- [ ] Configure DNS
- [ ] Test push notifications
- [ ] Test subscription flow
- [ ] Run load test
- [ ] Set up monitoring alerts

### iOS App Store
- [ ] Update API URLs in Capacitor config
- [ ] Build iOS app: `npx cap build ios`
- [ ] Test on TestFlight
- [ ] Submit for App Store review

---

## Scaling Guide

### When to Upgrade

| Metric | Starter Limit | Upgrade To |
|--------|---------------|------------|
| API requests | ~10k/day | Standard ($25/mo) |
| Concurrent users | ~100 | Standard + autoscale |
| Database size | 1GB | Standard ($25/mo) |
| Job processing | Basic | Pro worker |

### Render Commands

```bash
# View logs
render logs mj-superstars-api

# SSH into service
render ssh mj-superstars-api

# Restart service
render restart mj-superstars-api

# Scale service
render scale mj-superstars-api --instances 2
```

---

## Troubleshooting

### Common Issues

**1. "Database connection failed"**
- Check DATABASE_URL is set
- Verify database is running in dashboard
- Check IP allowlist settings

**2. "Redis connection refused"**
- Check REDIS_URL is set correctly
- Redis may take 1-2 min to provision

**3. "Socket.IO not connecting"**
- Ensure CLIENT_URL matches frontend domain exactly
- Check CORS settings in server.js

**4. "Claude API errors"**
- Verify ANTHROPIC_API_KEY is correct
- Check API usage limits

### Support
- Render Docs: https://render.com/docs
- Render Status: https://status.render.com
- Community: https://community.render.com

---

## Security Checklist

- [ ] All secrets stored in Render environment variables
- [ ] JWT_SECRET is auto-generated (never committed)
- [ ] Database IP allowlist is empty (internal only)
- [ ] Redis IP allowlist is empty (internal only)
- [ ] HTTPS enforced (automatic on Render)
- [ ] Rate limiting enabled
- [ ] Sentry error tracking active
- [ ] No sensitive data in logs
