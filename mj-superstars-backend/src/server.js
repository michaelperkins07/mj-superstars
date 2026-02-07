// ============================================================
// MJ's Superstars - Main Server (Render Production Ready)
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Import error tracking (initialize early to catch startup errors)
import errorTracking from './services/errorTracking.js';

// Initialize Sentry before anything else (async, non-blocking)
errorTracking.init().catch(() => console.log('⚠️  Sentry init skipped'));

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import moodRoutes from './routes/moods.js';
import taskRoutes from './routes/tasks.js';
import ritualRoutes from './routes/rituals.js';
import journalRoutes from './routes/journal.js';
import progressRoutes from './routes/progress.js';
import copingRoutes from './routes/coping.js';
import contentRoutes from './routes/content.js';
import notificationRoutes from './routes/notifications.js';
import insightsRoutes from './routes/insights.js';
import adminRoutes from './routes/admin.js';
import guestRoutes from './routes/guest.js';
import guestMigrateRoutes from './routes/guest-migrate.js';
import socialAuthRoutes from './routes/social-auth.js';
import featureFlagRoutes from './routes/featureFlags.js';
import gdprRoutes from './routes/gdpr.js';
import webhookRoutes from './routes/webhooks.js';
import subscriptionRoutes from './routes/subscriptions.js';

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authenticateSocket } from './middleware/auth.js';
import { sentryRequestHandler, sentryErrorHandler } from './services/errorTracking.js';

// Import services
import { initializeDatabase, checkDatabaseHealth, closePool } from './database/db.js';
import { setupSocketHandlers } from './services/socket.js';
import { initScheduler } from './services/scheduler.js';
import { logger } from './utils/logger.js';

// ============================================================
// APP CONFIGURATION
// ============================================================

const app = express();
const httpServer = createServer(app);

// Trust Render's proxy (required for rate limiting, IP detection)
app.set('trust proxy', 1);

// Parse allowed origins from env (comma-separated for multiple frontends)
const getAllowedOrigins = () => {
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) return '*';

  // Support comma-separated origins
  const origins = clientUrl.split(',').map(o => o.trim());
  return origins.length === 1 ? origins[0] : origins;
};

// Socket.IO setup with Render-compatible config
const io = new SocketIO(httpServer, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  // Render handles WebSocket upgrades natively
  transports: ['websocket', 'polling'],
  // Allow WebSocket upgrade
  allowUpgrades: true
});

// ============================================================
// MIDDLEWARE
// ============================================================

// Sentry request handler - MUST be first middleware
app.use(sentryRequestHandler());

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  // Allow WebSocket connections
  crossOriginOpenerPolicy: false
}));

// CORS
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging - structured for Render's log aggregation
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :response-time ms - :res[content-length]', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Rate limiting (trust proxy for correct IP behind Render's load balancer)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use forwarded IP from Render's proxy
  keyGenerator: (req) => req.ip
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' }
});

// Claude API rate limiter (separate, more generous)
const claudeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute per user
  message: { error: 'Message rate limit reached. Take a breath and try again in a moment.' }
});

// Heavy computation limiter for expensive analytics endpoints
const heavyComputationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { error: 'Too many requests to this endpoint. Please wait a moment.' },
  keyGenerator: (req) => req.user?.id || req.ip
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/social-auth', authLimiter);
app.use('/api/conversations/send', claudeLimiter);
app.use('/api/insights', heavyComputationLimiter);
app.use('/api/progress/weekly-story', heavyComputationLimiter);

// ============================================================
// HEALTH CHECKS (Render monitors these)
// ============================================================

// Simple health check - Render pings this
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()) + 's'
  });
});

// Deep health check - includes database & dependencies
app.get('/health/deep', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const memUsage = process.memoryUsage();

    const health = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: dbHealth,
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        },
        sockets: {
          connected: io.engine?.clientsCount || 0
        }
      },
      uptime: Math.floor(process.uptime()) + 's'
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================
// API ROUTES
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/rituals', ritualRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/coping', copingRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/guest', guestMigrateRoutes);
app.use('/api/social-auth', socialAuthRoutes);
app.use('/api/flags', featureFlagRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// ============================================================
// ERROR HANDLING
// ============================================================

// Sentry error handler - MUST be before other error handlers
app.use(sentryErrorHandler());

app.use(notFound);
app.use(errorHandler);

// ============================================================
// SOCKET.IO
// ============================================================

io.use(authenticateSocket);
setupSocketHandlers(io);
app.set('io', io);

// ============================================================
// START SERVER
// ============================================================

// Render assigns the port via env var
const PORT = process.env.PORT || 10000;

const startServer = async () => {
  try {
    await initializeDatabase();
    logger.info('Database connected successfully');

    // Start notification scheduler (streak reminders, check-ins, nudges)
    initScheduler();

    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 MJ's Superstars API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://0.0.0.0:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ============================================================
// GRACEFUL SHUTDOWN (Render sends SIGTERM on deploys)
// ============================================================

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    // Close Socket.IO connections
    io.close(() => {
      logger.info('Socket.IO connections closed');
    });

    // Close database pool
    await closePool();

    // Flush any pending error reports
    await errorTracking.flush(3000).catch(() => {});

    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  errorTracking.captureException(error, { tags: { fatal: true } });
  // Give Sentry time to send the error before exiting
  setTimeout(() => process.exit(1), 2000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason instanceof Error) {
    errorTracking.captureException(reason);
  } else {
    errorTracking.captureMessage(`Unhandled rejection: ${reason}`, 'error');
  }
});

startServer();

export { app, io };
