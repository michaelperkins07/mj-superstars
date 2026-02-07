// ============================================================
// Admin Routes - Database migration & management
// Protected by admin secret key
// ============================================================

import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query } from '../database/db.js';
import { logger } from '../utils/logger.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Admin auth middleware - requires dedicated ADMIN_SECRET
const adminAuth = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];

  if (!process.env.ADMIN_SECRET) {
    return res.status(503).json({ error: 'Admin authentication not configured' });
  }

  if (!adminKey || adminKey !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
};

// Run database schema migration
router.post('/migrate', adminAuth, async (req, res) => {
  try {
    logger.info('Starting database migration...');

    // Read schema.sql
    const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    logger.info(`Schema file loaded: ${schema.length} characters`);

    // Execute schema
    await query(schema);

    // Verify tables were created
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames = tables.rows.map(r => r.table_name);

    // Check seed data
    let seedInfo = {};
    try {
      const copingCount = await query('SELECT COUNT(*) FROM coping_tools');
      const contentCount = await query('SELECT COUNT(*) FROM content_items');
      seedInfo = {
        coping_tools: parseInt(copingCount.rows[0].count),
        content_items: parseInt(contentCount.rows[0].count)
      };
    } catch (e) {
      seedInfo = { error: e.message };
    }

    logger.info(`Migration complete! ${tableNames.length} tables created.`);

    res.json({
      success: true,
      message: `Migration completed successfully`,
      tables_count: tableNames.length,
      tables: tableNames,
      seed_data: seedInfo
    });

  } catch (error) {
    logger.error('Migration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      position: error.position || null
    });
  }
});

// Check migration status
router.get('/db-status', adminAuth, async (req, res) => {
  try {
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const counts = {};
    for (const row of tables.rows) {
      try {
        const safeName = row.table_name.replace(/"/g, '""');
        const countResult = await query(`SELECT COUNT(*) FROM "${safeName}"`);
        counts[row.table_name] = parseInt(countResult.rows[0].count);
      } catch {
        counts[row.table_name] = 'error';
      }
    }

    res.json({
      tables_count: tables.rows.length,
      tables: counts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
