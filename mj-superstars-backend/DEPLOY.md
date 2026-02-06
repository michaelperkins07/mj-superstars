# 🚀 MJ's Superstars - Render Deployment Guide

## Overview

This guide walks you through deploying MJ's Superstars backend to Render with:
- **Web Service** (Node.js API + Socket.IO)
- **Managed PostgreSQL** (automatic backups, encryption)
- **Redis** (sessions, caching, real-time)

Estimated monthly cost: **~$21/mo** (Starter) or **~$39/mo** (Standard)

---

## Prerequisites

- [ ] GitHub account with the backend repo pushed
- [ ] Render account (https://render.com)
- [ ] Anthropic API key (https://console.anthropic.com)

---

## Step 1: Push to GitHub

```bash
cd mj-superstars-backend

# Initialize git if needed
git init
git add .
git commit -m "Initial commit - MJ's Superstars Backend"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/mj-superstars-backend.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create Services on Render

### Option A: Blueprint (Automated - Recommended)

1. Go to https://dashboard.render.com
2. Click **New** → **Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` and creates everything automatically
5. Fill in the manual env vars when prompted

### Option B: Manual Setup

#### 2a. Create PostgreSQL Database
1. **New** → **PostgreSQL**
2. Settings:
   - Name: `mj-superstars-db`
   - Database: `mj_superstars`
   - User: `mj_admin`
   - Region: `Ohio (US East)`
   - Plan: `Starter ($7/mo)` → upgrade to `Standard ($20/mo)` for HA
3. Click **Create Database**
4. Copy the **Internal Database URL** (starts with `postgres://`)

#### 2b. Create Redis
1. **New** → **Redis**
2. Settings:
   - Name: `mj-superstars-cache`
   - Region: `Ohio (US East)`
   - Plan: `Starter ($7/mo)`
   - Max Memory Policy: `allkeys-lru`
3. Click **Create Redis**
4. Copy the **Internal Redis URL**

#### 2c. Create Web Service
1. **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - Name: `mj-superstars-api`
   - Region: `Ohio (US East)`
   - Runtime: `Node`
   - Build Command: `npm ci --production=false`
   - Start Command: `node src/server.js`
   - Plan: `Starter ($7/mo)` → upgrade to `Standard ($25/mo)` for autoscaling
4. Click **Advanced** and add environment variables (see Step 3)
5. Click **Create Web Service**

---

## Step 3: Environment Variables

Set these in the Render dashboard under your web service → **Environment**:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render's default |
| `DATABASE_URL` | *(auto from Blueprint)* | Or paste Internal Database URL |
| `REDIS_URL` | *(auto from Blueprint)* | Or paste Internal Redis URL |
| `CLIENT_URL` | `https://your-frontend-url.com` | Frontend URL for CORS |
| `JWT_SECRET` | *(generate)* | `openssl rand -base64 64` |
| `JWT_EXPIRES_IN` | `15m` | |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Your Anthropic key |
| `CLAUDE_MODEL` | `claude-sonnet-4-20250514` | |
| `MAX_TOKENS` | `1024` | |
| `LOG_LEVEL` | `info` | |

### Generate VAPID Keys (for push notifications)
```bash
npx web-push generate-vapid-keys --json
```
Then set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.

---

## Step 4: Run Database Migrations

After the web service is running:

### Option A: Render Shell
1. Go to your web service on Render
2. Click **Shell** tab
3. Run: `node src/database/migrate.js`

### Option B: One-off Job
1. **New** → **Job**
2. Connect same repo
3. Command: `node src/database/migrate.js`
4. Add `DATABASE_URL` env var
5. Run once

---

## Step 5: Verify Deployment

### Health Check
```bash
curl https://mj-superstars-api.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-04T...",
  "version": "1.0.0",
  "environment": "production",
  "uptime": "42s"
}
```

### Deep Health Check
```bash
curl https://mj-superstars-api.onrender.com/health/deep
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy", "latency": "3ms" },
    "memory": { "rss": "45MB", "heapUsed": "22MB" },
    "sockets": { "connected": 0 }
  }
}
```

---

## Step 6: Connect Frontend

Update your React app's API base URL:

```javascript
// In your frontend config
const API_BASE_URL = 'https://mj-superstars-api.onrender.com';
const WS_URL = 'wss://mj-superstars-api.onrender.com';
```

Then set `CLIENT_URL` on Render to your frontend's URL for CORS.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                   RENDER                     │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │       Web Service (Node.js)           │   │
│  │  Express + Socket.IO + Claude API     │   │
│  │  Port: 10000 | Region: Ohio           │   │
│  └──────────┬──────────────┬─────────────┘   │
│             │              │                  │
│  ┌──────────▼──────┐  ┌───▼──────────────┐  │
│  │  PostgreSQL 16   │  │   Redis Cache     │  │
│  │  Managed + SSL   │  │   Sessions/RT     │  │
│  │  Auto-backup     │  │   allkeys-lru     │  │
│  └─────────────────┘  └──────────────────┘  │
│                                              │
│  Private Network (internal only)             │
└─────────────────────────────────────────────┘
           │
           │ HTTPS / WSS
           ▼
┌─────────────────────┐
│   iOS App / Web UI  │
│   React Frontend    │
└─────────────────────┘
```

---

## Security Checklist

- [x] `DATABASE_URL` uses internal connection (not public)
- [x] Redis uses internal connection (not public)
- [x] `JWT_SECRET` is randomly generated (64+ chars)
- [x] CORS locked to specific frontend URL
- [x] Rate limiting on auth and API routes
- [x] Helmet security headers enabled
- [x] Non-root Docker user
- [x] Health checks for zero-downtime deploys
- [x] Graceful shutdown handles SIGTERM
- [x] SSL/TLS enforced by Render
- [ ] Set up Render IP allowlist for database (optional)
- [ ] Enable Render 2FA on your account
- [ ] Generate and store VAPID keys securely

---

## Monitoring

### Render Built-in
- **Logs**: Real-time log streaming in Render dashboard
- **Metrics**: CPU, Memory, Network in dashboard
- **Alerts**: Set up in Render → Settings → Notifications

### Custom Health Monitoring
Set up an uptime monitor (e.g., UptimeRobot, free tier) to ping:
```
https://mj-superstars-api.onrender.com/health
```

---

## Scaling

### When to Upgrade

| Metric | Starter Limit | Action |
|--------|--------------|--------|
| Concurrent users > 50 | 512MB RAM | → Standard ($25/mo) |
| Database > 1GB | 1GB storage | → Standard ($20/mo) |
| Need HA/failover | Single instance | → Standard + HA |
| HIPAA needed | Not included | → Org plan + HIPAA workspace |

### Future: HIPAA Upgrade
When you're ready for healthcare partnerships:
1. Upgrade to Render Org plan
2. Go to dashboard → Compliance → Sign BAA
3. Enable HIPAA workspace (20% surcharge on usage)
4. No code changes needed - same infrastructure

---

## Troubleshooting

### "Application failed to respond"
- Check logs for startup errors
- Verify `DATABASE_URL` is set correctly
- Ensure migrations have been run

### "WebSocket connection failed"
- Verify `CLIENT_URL` includes protocol (`https://`)
- Check browser console for CORS errors
- Render supports WebSockets natively on all plans

### Database connection timeouts
- Use internal URL, not external
- Check pool size isn't too high for plan (Starter = 20 max connections)
- Verify SSL config in `db.js`

### Slow cold starts
- Starter plan may have cold starts after inactivity
- Standard plan stays warm
- Add a health check ping every 5 minutes via external monitor
