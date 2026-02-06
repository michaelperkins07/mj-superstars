# MJ's Superstars - Deployment Guide

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/mj-superstars.git
cd mj-superstars

# 2. Copy environment files
cp mj-superstars-backend/.env.example mj-superstars-backend/.env
cp mj-superstars-frontend/.env.example mj-superstars-frontend/.env.local

# 3. Add your API keys to .env files
# - ANTHROPIC_API_KEY (required)
# - ENCRYPTION_KEY (generate with: openssl rand -hex 32)

# 4. Start with Docker Compose
docker-compose up -d

# 5. Run database migrations
docker-compose exec api npm run db:migrate
docker-compose exec api npm run db:seed

# 6. Access the app
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# Adminer:  http://localhost:8080
```

---

## Environment Overview

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local development | localhost:3000 |
| Staging | Pre-production testing | staging.mjsuperstars.com |
| Production | Live users | app.mjsuperstars.com |

---

## Backend Deployment

### Option 1: Railway (Recommended for MVP)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add -d postgresql

# Add Redis
railway add -d redis

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set ENCRYPTION_KEY=$(openssl rand -hex 32)
railway variables set ANTHROPIC_API_KEY=sk-ant-xxx

# Deploy
railway up
```

### Option 2: Render

1. Create a new Web Service
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `node src/index.js`
5. Add environment variables
6. Create PostgreSQL database
7. Create Redis instance

### Option 3: AWS (Production Scale)

```yaml
# AWS Architecture
- ECS Fargate (API containers)
- RDS PostgreSQL (database)
- ElastiCache Redis (caching)
- ALB (load balancer)
- CloudFront (CDN)
- S3 (static assets)
- CloudWatch (monitoring)
```

### Option 4: Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## Frontend Deployment

### iOS App (App Store)

```bash
# 1. Build the React app
cd mj-superstars-frontend
npm run build

# 2. Sync with Capacitor
npx cap sync ios

# 3. Open in Xcode
npx cap open ios

# 4. In Xcode:
# - Set version/build number
# - Select "Any iOS Device"
# - Product → Archive
# - Distribute App → App Store Connect
```

### Web (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd mj-superstars-frontend
vercel --prod
```

### Web (Netlify)

```bash
# Build settings:
# - Build command: npm run build
# - Publish directory: build
# - Node version: 20
```

---

## Database Migrations

```bash
# Run migrations
npm run db:migrate

# Check status
npm run db:status

# Seed development data
npm run db:seed

# Reset database (DANGER!)
npm run db:reset

# Create new migration
npm run db:create my_migration_name
```

---

## Environment Variables Reference

### Backend (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `JWT_SECRET` | JWT signing key | Random 32+ chars |
| `ENCRYPTION_KEY` | AES-256 key (64 hex) | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-...` |

### Backend (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection | None |
| `APNS_KEY_ID` | Apple push key ID | None |
| `APNS_TEAM_ID` | Apple team ID | None |
| `MIXPANEL_TOKEN` | Analytics | None |
| `SENTRY_DSN` | Error tracking | None |

### Frontend

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend API URL |
| `REACT_APP_WS_URL` | WebSocket URL |
| `REACT_APP_MIXPANEL_TOKEN` | Analytics token |

---

## Health Checks

### Backend Health Endpoint

```bash
curl https://api.mjsuperstars.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-02-05T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "claude": "available"
  }
}
```

---

## Monitoring & Alerts

### Recommended Setup

1. **Uptime Monitoring**: Pingdom, UptimeRobot
2. **Error Tracking**: Sentry
3. **APM**: New Relic, Datadog
4. **Logs**: LogDNA, Papertrail
5. **Analytics**: Mixpanel (built-in)

### Key Metrics to Monitor

- API response time (p95 < 500ms)
- Error rate (< 1%)
- Database connections
- Memory usage
- AI API latency

---

## SSL/TLS Certificates

### Let's Encrypt (Free)

```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d api.mjsuperstars.com
```

### AWS Certificate Manager

- Free SSL for AWS resources
- Auto-renewal
- Works with CloudFront, ALB

---

## Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Automated (cron)
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/mj_$(date +\%Y\%m\%d).sql.gz
```

### Recommended Schedule

- **Daily**: Full database backup
- **Weekly**: Backup to separate region
- **Monthly**: Archive to cold storage

---

## Scaling Guidelines

### When to Scale

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU > 70% | Sustained 5min | Add containers |
| Memory > 80% | Sustained 5min | Increase RAM |
| DB connections > 80% | Any | Add read replicas |
| Response time > 1s | p95 | Optimize or scale |

### Horizontal Scaling

```bash
# Kubernetes
kubectl scale deployment mj-api --replicas=3

# Docker Swarm
docker service scale mj-api=3

# Railway
# Adjust in dashboard
```

---

## Troubleshooting

### Common Issues

**Database connection failed**
```bash
# Check DATABASE_URL format
# Ensure SSL mode if required
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

**JWT errors**
```bash
# Ensure JWT_SECRET is set and consistent across instances
```

**Claude API errors**
```bash
# Check ANTHROPIC_API_KEY is valid
# Verify rate limits not exceeded
```

**Push notifications not working**
```bash
# Verify APNS certificates
# Check bundle ID matches
```

---

## Security Checklist

- [ ] All secrets in environment variables (not code)
- [ ] HTTPS enabled everywhere
- [ ] Database not publicly accessible
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (content sanitization)
- [ ] Regular dependency updates
- [ ] Security headers (Helmet.js)

---

## Support

- **Documentation**: https://docs.mjsuperstars.com
- **Status Page**: https://status.mjsuperstars.com
- **Email**: support@mjsuperstars.com
