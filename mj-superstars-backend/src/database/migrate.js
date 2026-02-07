#!/usr/bin/env node
// ============================================================
// MJ's Superstars - Database Migration Runner
// ============================================================

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(config);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================
// MIGRATION FUNCTIONS
// ============================================================

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(50) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  return result.rows.map(row => row.version);
}

async function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return [];
  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

async function runMigration(filename) {
  const filepath = path.join(__dirname, 'migrations', filename);
  const sql = fs.readFileSync(filepath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    log(`  ✓ ${filename}`, 'green');
  } catch (error) {
    await client.query('ROLLBACK');
    log(`  ✗ ${filename}: ${error.message}`, 'red');
    throw error;
  } finally {
    client.release();
  }
}

async function runSeed(seedName) {
  const seedPath = path.join(__dirname, 'seeds', `${seedName}.sql`);
  if (!fs.existsSync(seedPath)) {
    log(`Seed file not found: ${seedName}.sql`, 'red');
    return;
  }
  const sql = fs.readFileSync(seedPath, 'utf8');
  await pool.query(sql);
  log(`  ✓ Seed: ${seedName}`, 'green');
}

async function migrate() {
  log('\n🚀 Running migrations...\n', 'cyan');
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();
  const pending = files.filter(file => !applied.includes(file.replace('.sql', '')));
  if (pending.length === 0) {
    log('No pending migrations.', 'green');
    return;
  }
  for (const file of pending) await runMigration(file);
  log('\n✅ Migrations complete!\n', 'green');
}

async function reset() {
  log('\n🔄 Resetting database...\n', 'cyan');
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ DECLARE r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    log('  ✓ All tables dropped', 'green');
  } finally {
    client.release();
  }
  await migrate();
}

async function status() {
  log('\n📊 Migration Status\n', 'cyan');
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = await getMigrationFiles();
  log('Applied:', 'blue');
  applied.forEach(v => log(`  ✓ ${v}`, 'green'));
  const pending = files.filter(f => !applied.includes(f.replace('.sql', '')));
  log('\nPending:', 'blue');
  pending.forEach(f => log(`  ○ ${f}`, 'yellow'));
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  try {
    switch (command) {
      case 'migrate': case 'up': await migrate(); break;
      case 'seed': await runSeed(arg || 'development'); break;
      case 'reset': await reset(); break;
      case 'fresh': await reset(); await runSeed('development'); break;
      case 'status': await status(); break;
      default:
        log('\nUsage: node migrate.js <command>\n', 'cyan');
        log('Commands: migrate, seed [name], reset, fresh, status\n');
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}\n`, 'red');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
