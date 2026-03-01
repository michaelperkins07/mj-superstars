// ============================================================
// MJ's Superstars - Uptime Monitoring & Alerting Service
// Self-monitoring with Sentry integration + admin status API
// ============================================================

import { query } from '../database/db.js';
import { logger } from '../utils/logger.js';
import { captureException, captureMessage } from './errorTracking.js';

// ── Configuration ──────────────────────────────────────────
const CHECK_INTERVAL_MS = 5 * 60 * 1000;    // 5 minutes
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://mj-superstars-app.onrender.com';
const MEMORY_THRESHOLD_MB = 450;              // Alert if RSS > 450MB (Render free = 512MB)
const DB_TIMEOUT_MS = 5000;                   // DB query timeout
const RESPONSE_TIME_THRESHOLD_MS = 3000;      // Slow response alert
const MAX_HISTORY = 288;                      // 24 hours of 5-min checks

// ── State ──────────────────────────────────────────────────
let monitoringInterval = null;
const checkHistory = [];
let consecutiveFailures = 0;
let lastAlertTime = null;
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;    // Don't spam — 15 min between alerts
const startTime = Date.now();

// ── Health Checks ──────────────────────────────────────────

async function checkDatabase() {
  const start = Date.now();
  try {
    const result = await Promise.race([
      query('SELECT 1 as ok, NOW() as server_time, pg_database_size(current_database()) as db_size'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), DB_TIMEOUT_MS))
    ]);
    const latency = Date.now() - start;
    const row = result.rows[0];
    return {
      status: 'healthy',
      latency,
      serverTime: row.server_time,
      dbSizeMB: Math.round(row.db_size / 1024 / 1024),
      slow: latency > RESPONSE_TIME_THRESHOLD_MS
    };
  } catch (err) {
    return { status: 'unhealthy', latency: Date.now() - start, error: err.message };
  }
}

function checkMemory() {
  const mem = process.memoryUsage();
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  return {
    status: rssMB > MEMORY_THRESHOLD_MB ? 'warning' : 'healthy',
    rssMB,
    heapUsedMB,
    heapTotalMB,
    heapPct,
    externalMB: Math.round(mem.external / 1024 / 1024),
    warning: rssMB > MEMORY_THRESHOLD_MB ? `RSS ${rssMB}MB exceeds ${MEMORY_THRESHOLD_MB}MB threshold` : null
  };
}

async function checkFrontend() {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(FRONTEND_URL, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Top-Performer-Monitor/1.0' }
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return {
      status: resp.ok ? 'healthy' : 'degraded',
      statusCode: resp.status,
      latency,
      slow: latency > RESPONSE_TIME_THRESHOLD_MS
    };
  } catch (err) {
    return { status: 'unhealthy', latency: Date.now() - start, error: err.message };
  }
}

async function checkActiveUsers() {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '15 minutes') as active_15m,
        COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '1 hour') as active_1h,
        COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '24 hours') as active_24h,
        COUNT(*) as total_users
      FROM users
    `);
    return result.rows[0];
  } catch {
    return { active_15m: 0, active_1h: 0, active_24h: 0, total_users: 0 };
  }
}

async function checkRecentErrors() {
  try {
    const result = await query(`
      SELECT COUNT(*) as error_count
      FROM gdpr_audit_log
      WHERE action = 'error' AND created_at > NOW() - INTERVAL '1 hour'
    `);
    return { recentErrors: parseInt(result.rows[0].error_count) };
  } catch {
    return { recentErrors: -1 };
  }
}

// ── Main Check Routine ─────────────────────────────────────

async function runHealthCheck() {
  const timestamp = new Date().toISOString();

  const [db, frontend, users] = await Promise.all([
    checkDatabase(),
    checkFrontend(),
    checkActiveUsers()
  ]);

  const memory = checkMemory();
  const uptime = Math.floor(process.uptime());

  // Determine overall status
  const statuses = [db.status, memory.status, frontend.status];
  let overall = 'healthy';
  if (statuses.includes('unhealthy')) overall = 'unhealthy';
  else if (statuses.includes('degraded') || statuses.includes('warning')) overall = 'degraded';

  const check = {
    timestamp,
    overall,
    uptime,
    checks: { database: db, memory, frontend },
    users,
    processUptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
  };

  // Store in ring buffer
  checkHistory.push(check);
  if (checkHistory.length > MAX_HISTORY) checkHistory.shift();

  // Handle alerting
  if (overall !== 'healthy') {
    consecutiveFailures++;
    await handleAlert(check);
  } else {
    if (consecutiveFailures > 0) {
      // Recovery — send recovery notice
      await handleRecovery(check);
    }
    consecutiveFailures = 0;
  }

  logger.info(`[Monitor] Health check: ${overall}`, {
    db: db.status,
    dbLatency: db.latency,
    memory: `${memory.rssMB}MB`,
    frontend: frontend.status,
    consecutiveFailures
  });

  return check;
}

// ── Alerting ───────────────────────────────────────────────

async function handleAlert(check) {
  const now = Date.now();

  // Respect cooldown to avoid spam
  if (lastAlertTime && (now - lastAlertTime) < ALERT_COOLDOWN_MS) {
    logger.warn(`[Monitor] Alert suppressed (cooldown). Consecutive failures: ${consecutiveFailures}`);
    return;
  }

  const issues = [];
  if (check.checks.database.status !== 'healthy') {
    issues.push(`Database: ${check.checks.database.error || check.checks.database.status}`);
  }
  if (check.checks.memory.status !== 'healthy') {
    issues.push(`Memory: ${check.checks.memory.warning}`);
  }
  if (check.checks.frontend.status !== 'healthy') {
    issues.push(`Frontend: ${check.checks.frontend.error || `HTTP ${check.checks.frontend.statusCode}`}`);
  }

  const alertMessage = `🚨 MJ's Superstars Health Alert\nStatus: ${check.overall}\nConsecutive failures: ${consecutiveFailures}\nIssues:\n${issues.map(i => `  - ${i}`).join('\n')}`;

  // Send to Sentry as a warning/error
  try {
    if (consecutiveFailures >= 3) {
      captureException(new Error(`[CRITICAL] Service degraded - ${consecutiveFailures} consecutive failures: ${issues.join(', ')}`));
    } else {
      captureMessage(alertMessage, consecutiveFailures >= 2 ? 'error' : 'warning');
    }
  } catch (err) {
    logger.error('[Monitor] Failed to send Sentry alert:', err.message);
  }

  lastAlertTime = now;
  logger.error(`[Monitor] ALERT: ${alertMessage}`);
}

async function handleRecovery(check) {
  const downtime = consecutiveFailures * (CHECK_INTERVAL_MS / 1000 / 60);
  const message = `✅ MJ's Superstars Recovered\nService healthy after ${consecutiveFailures} failed checks (~${downtime} min estimated downtime)`;

  try {
    captureMessage(message, 'info');
  } catch (err) {
    logger.error('[Monitor] Failed to send recovery notice:', err.message);
  }

  logger.info(`[Monitor] RECOVERY: ${message}`);
}

// ── Public API ─────────────────────────────────────────────

export function startMonitoring() {
  if (monitoringInterval) {
    logger.warn('[Monitor] Already running');
    return;
  }

  logger.info(`[Monitor] Starting uptime monitoring (interval: ${CHECK_INTERVAL_MS / 1000}s)`);

  // Run first check after 30s (let server fully boot)
  setTimeout(() => {
    runHealthCheck().catch(err => logger.error('[Monitor] Initial check failed:', err.message));

    // Then schedule recurring
    monitoringInterval = setInterval(() => {
      runHealthCheck().catch(err => logger.error('[Monitor] Check failed:', err.message));
    }, CHECK_INTERVAL_MS);
  }, 30000);
}

export function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info('[Monitor] Stopped');
  }
}

export function getStatus() {
  const latest = checkHistory[checkHistory.length - 1] || null;
  const healthyChecks = checkHistory.filter(c => c.overall === 'healthy').length;
  const totalChecks = checkHistory.length;
  const uptimePct = totalChecks > 0 ? ((healthyChecks / totalChecks) * 100).toFixed(2) : '100.00';

  // Calculate average latencies
  const dbLatencies = checkHistory
    .filter(c => c.checks.database.latency)
    .map(c => c.checks.database.latency);
  const avgDbLatency = dbLatencies.length > 0
    ? Math.round(dbLatencies.reduce((a, b) => a + b, 0) / dbLatencies.length)
    : 0;

  return {
    monitoring: {
      active: !!monitoringInterval,
      interval: `${CHECK_INTERVAL_MS / 1000}s`,
      checksRecorded: totalChecks,
      monitorUptime: `${Math.floor((Date.now() - startTime) / 1000 / 60)} minutes`
    },
    current: latest,
    uptime: {
      percentage: `${uptimePct}%`,
      healthyChecks,
      totalChecks,
      consecutiveFailures
    },
    performance: {
      avgDbLatencyMs: avgDbLatency,
      lastAlertTime: lastAlertTime ? new Date(lastAlertTime).toISOString() : null
    }
  };
}

export function getHistory(limit = 50) {
  return checkHistory.slice(-limit).reverse();
}

export async function runManualCheck() {
  return runHealthCheck();
}

export default { startMonitoring, stopMonitoring, getStatus, getHistory, runManualCheck };
