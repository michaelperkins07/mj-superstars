// ============================================================
// Database Connection & Pool - Render Compatible
// ============================================================

import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import * as mockDb from './mock-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Check if we should use mock database
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true' || process.env.ANTHROPIC_API_KEY === 'demo-mode';
console.log('🗄️  Mock DB Mode:', USE_MOCK_DB, '| USE_MOCK_DB env:', process.env.USE_MOCK_DB);

// ============================================================
// CONNECTION CONFIGURATION
// ============================================================
// Render provides DATABASE_URL as a connection string.
// This config supports both DATABASE_URL (production) and
// individual env vars (local development).
// ============================================================

const getDbConfig = () => {
  // Production: Use DATABASE_URL from Render
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false  // Render's managed Postgres uses self-signed certs
      } : false,
      max: parseInt(process.env.DB_POOL_SIZE) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  // Local development: Use individual env vars
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'mj_superstars',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_SIZE) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
};

// Create pool only if not using mock
let pool = null;
if (!USE_MOCK_DB) {
  pool = new Pool(getDbConfig());

  // Pool error handler
  pool.on('error', (err) => {
    logger.error('Unexpected database pool error:', err);
  });

  // Pool connect handler
  pool.on('connect', () => {
    logger.debug('New database client connected');
  });
}

// ============================================================
// AUTO-MIGRATION
// ============================================================

const autoRunMigrations = async (client) => {
  try {
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const appliedResult = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const applied = new Set(appliedResult.rows.map(r => r.version));

    // If DB was created from schema.sql (tables exist but no migration records),
    // mark baseline migrations as applied so we don't try to re-run them
    if (applied.size === 0) {
      const tablesExist = await client.query(`
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
      `);
      if (tablesExist.rows[0].exists) {
        logger.info('Database exists but no migrations recorded — marking baseline migrations as applied');
        const baselineMigrations = ['001_initial_schema', '002_sync_schema'];
        for (const version of baselineMigrations) {
          await client.query(
            'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
            [version]
          );
          applied.add(version);
        }
      }
    }

    // Find migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.info('No migrations directory found, skipping auto-migration');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const pending = files.filter(f => !applied.has(f.replace('.sql', '')));

    if (pending.length === 0) {
      logger.info('All migrations are up to date');
      return;
    }

    for (const file of pending) {
      logger.info(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        logger.info(`✅ Migration applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`❌ Migration failed: ${file} - ${err.message}`);
        // Don't throw — let the server start even if a migration fails
        // Continue to try subsequent migrations (they may be independent)
        continue;
      }
    }
  } catch (err) {
    logger.error('Auto-migration error:', err.message);
  }
};

// ============================================================
// INITIALIZATION
// ============================================================

export const initializeDatabase = async () => {
  // Use mock database for demo mode
  if (USE_MOCK_DB) {
    logger.info('🗄️  Using mock database (demo mode)');
    return mockDb.initializeDatabase();
  }

  const client = await pool.connect();
  try {
    // Test connection
    const timeResult = await client.query('SELECT NOW() as now, current_database() as db');
    logger.info(`Database connected: ${timeResult.rows[0].db} at ${timeResult.rows[0].now}`);

    // Check if tables exist
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);

    if (!result.rows[0].exists) {
      logger.info('Database tables not found. Auto-running migrations...');
      await autoRunMigrations(client);
    } else {
      // Count tables for health info
      const tableCount = await client.query(`
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
      `);
      logger.info(`Database schema: ${tableCount.rows[0].count} tables found`);

      // Check for pending migrations and run them
      await autoRunMigrations(client);
    }

    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// QUERY HELPERS
// ============================================================

// Query helper with logging and error context
export const query = async (text, params = []) => {
  // Use mock database for demo mode
  if (USE_MOCK_DB) {
    return mockDb.query(text, params);
  }

  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.LOG_QUERIES === 'true') {
      logger.debug('Query executed', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
    }

    // Warn on slow queries
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        text: text.substring(0, 200),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Database query error:', {
      text: text.substring(0, 200),
      duration: `${duration}ms`,
      error: error.message,
      code: error.code
    });
    throw error;
  }
};

// Transaction helper
export const transaction = async (callback) => {
  // Use mock database for demo mode
  if (USE_MOCK_DB) {
    return mockDb.transaction(callback);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get client for manual transaction management
export const getClient = () => pool.connect();

// ============================================================
// HEALTH CHECK
// ============================================================

export const checkDatabaseHealth = async () => {
  try {
    const start = Date.now();
    const result = await pool.query('SELECT 1 as healthy');
    const latency = Date.now() - start;

    return {
      status: 'healthy',
      latency: `${latency}ms`,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

export const closePool = async () => {
  logger.info('Closing database pool...');
  await pool.end();
  logger.info('Database pool closed');
};

// Handle process signals
process.on('SIGTERM', async () => {
  await closePool();
});

process.on('SIGINT', async () => {
  await closePool();
});

export default pool;
