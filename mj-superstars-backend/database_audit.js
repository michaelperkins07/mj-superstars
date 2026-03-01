import pkg from 'pg';
const { Client } = pkg;

// Database connection configuration
const dbConfig = {
  user: 'mj_superstars_user',
  password: 'gdObVYdtL5wsoRwYhgcqyUuPCYyHZZlw',
  host: 'dpg-d62libffte5s73b63mh0-a.virginia-postgres.render.com',
  port: 5432,
  database: 'mj_superstars',
  ssl: {
    rejectUnauthorized: false
  }
};

const client = new Client(dbConfig);

// Results storage
const auditResults = {
  timestamp: new Date().toISOString(),
  tables: [],
  foreignKeys: [],
  missingIndexes: [],
  orphanedRecords: [],
  rowCounts: {},
  unreferencedMigrationTables: [],
  redundantIndexes: [],
  indexDetails: {},
  summary: {}
};

async function runQuery(query, params = []) {
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error(`Query error: ${error.message}`);
    console.error(`Query: ${query}`);
    return null;
  }
}

async function auditTables() {
  console.log('\n[1] Listing all tables...');
  const tables = await runQuery(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
  );
  
  if (!tables) {
    console.error('Failed to fetch tables');
    return;
  }

  auditResults.tables = tables.map(t => t.tablename);
  console.log(`Found ${tables.length} tables:`);
  tables.forEach(t => console.log(`  - ${t.tablename}`));
}

async function auditForeignKeys() {
  console.log('\n[2] Checking foreign keys and their indexes...');
  
  const fkQuery = `
    SELECT tc.table_name, kcu.column_name, tc.constraint_name, 
           ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name 
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name 
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `;
  
  const foreignKeys = await runQuery(fkQuery);
  
  if (!foreignKeys) {
    console.error('Failed to fetch foreign keys');
    return;
  }

  console.log(`Found ${foreignKeys.length} foreign key constraints`);
  
  for (const fk of foreignKeys) {
    console.log(`  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    
    // Check if index exists on the FK column
    const indexCheck = await runQuery(
      `SELECT indexname FROM pg_indexes WHERE tablename = $1 AND indexdef LIKE $2;`,
      [fk.table_name, `%${fk.column_name}%`]
    );
    
    if (!indexCheck || indexCheck.length === 0) {
      auditResults.missingIndexes.push({
        table: fk.table_name,
        column: fk.column_name,
        constraint: fk.constraint_name,
        foreignTable: fk.foreign_table_name,
        foreignColumn: fk.foreign_column_name,
        issue: 'No index found on foreign key column'
      });
      console.log(`    ⚠️  Missing index on FK column`);
    } else {
      console.log(`    ✓ Index exists: ${indexCheck[0].indexname}`);
    }
    
    auditResults.foreignKeys.push({
      table: fk.table_name,
      column: fk.column_name,
      constraint: fk.constraint_name,
      referencesTable: fk.foreign_table_name,
      referencesColumn: fk.foreign_column_name,
      hasIndex: indexCheck && indexCheck.length > 0
    });
  }
}

async function auditOrphanedRecords() {
  console.log('\n[3] Checking for orphaned records...');
  
  const orphanQuery = `
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name 
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name 
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name;
  `;
  
  const foreignKeys = await runQuery(orphanQuery);
  
  if (!foreignKeys) {
    console.error('Failed to fetch foreign keys for orphan check');
    return;
  }

  for (const fk of foreignKeys) {
    const orphanCheckQuery = `
      SELECT COUNT(*) as orphan_count
      FROM ${fk.table_name} child
      LEFT JOIN ${fk.foreign_table_name} parent 
        ON child.${fk.column_name} = parent.${fk.foreign_column_name}
      WHERE child.${fk.column_name} IS NOT NULL
        AND parent.${fk.foreign_column_name} IS NULL;
    `;
    
    const result = await runQuery(orphanCheckQuery);
    
    if (result && result[0].orphan_count > 0) {
      auditResults.orphanedRecords.push({
        table: fk.table_name,
        column: fk.column_name,
        referencesTable: fk.foreign_table_name,
        orphanCount: parseInt(result[0].orphan_count),
        severity: 'HIGH'
      });
      console.log(`  ⚠️  ${fk.table_name}.${fk.column_name}: ${result[0].orphan_count} orphaned records found`);
    } else if (result) {
      console.log(`  ✓ ${fk.table_name}.${fk.column_name}: No orphaned records`);
    }
  }
}

async function auditRowCounts() {
  console.log('\n[4] Counting rows in each table...');
  
  const tables = await runQuery(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
  );
  
  if (!tables) {
    console.error('Failed to fetch tables');
    return;
  }

  for (const table of tables) {
    const countResult = await runQuery(`SELECT COUNT(*) as count FROM ${table.tablename};`);
    if (countResult) {
      const count = parseInt(countResult[0].count);
      auditResults.rowCounts[table.tablename] = count;
      console.log(`  ${table.tablename}: ${count} rows`);
    }
  }
}

async function checkMigrationTables() {
  console.log('\n[5] Checking migration files for referenced tables...');
  
  // Read migration files
  const fs = await import('fs');
  const path = await import('path');
  
  const migrationDir = '/sessions/dazzling-ecstatic-lovelace/mnt/Project MJ/mj-superstars-backend/src/database/migrations';
  const migrationFiles = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
  
  console.log(`Found ${migrationFiles.length} migration files`);
  
  // Extract table names from migration files
  const referencedTables = new Set();
  const createTablePattern = /CREATE TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(/gi;
  
  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
    let match;
    while ((match = createTablePattern.exec(content)) !== null) {
      referencedTables.add(match[1].toLowerCase());
    }
  }
  
  console.log(`Tables referenced in migrations: ${Array.from(referencedTables).sort().join(', ')}`);
  
  const existingTables = auditResults.tables.map(t => t.toLowerCase());
  
  for (const table of referencedTables) {
    if (!existingTables.includes(table)) {
      auditResults.unreferencedMigrationTables.push({
        table: table,
        status: 'MISSING',
        reason: 'Referenced in migration but does not exist in database'
      });
      console.log(`  ⚠️  Missing: ${table}`);
    }
  }
  
  if (auditResults.unreferencedMigrationTables.length === 0) {
    console.log('  ✓ All migration tables exist in database');
  }
}

async function auditIndexes() {
  console.log('\n[6] Analyzing indexes for redundancy and efficiency...');
  
  const indexQuery = `
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `;
  
  const indexes = await runQuery(indexQuery);
  
  if (!indexes) {
    console.error('Failed to fetch indexes');
    return;
  }

  console.log(`Found ${indexes.length} indexes`);
  
  // Store index details grouped by table
  const indexesByTable = {};
  for (const idx of indexes) {
    if (!indexesByTable[idx.tablename]) {
      indexesByTable[idx.tablename] = [];
    }
    indexesByTable[idx.tablename].push({
      name: idx.indexname,
      definition: idx.indexdef
    });
  }
  
  // Check for duplicate or redundant indexes
  for (const table in indexesByTable) {
    auditResults.indexDetails[table] = indexesByTable[table];
    const tableIndexes = indexesByTable[table];
    
    for (let i = 0; i < tableIndexes.length; i++) {
      for (let j = i + 1; j < tableIndexes.length; j++) {
        const idx1 = tableIndexes[i];
        const idx2 = tableIndexes[j];
        
        // Check if one index is a subset of another (very basic check)
        const def1 = idx1.definition.toLowerCase();
        const def2 = idx2.definition.toLowerCase();
        
        // Extract column names from definitions
        const cols1 = def1.match(/on\s+\w+\s*\((.*?)\)/)?.[1]?.split(',')?.map(c => c.trim().split(/\s+/)[0]) || [];
        const cols2 = def2.match(/on\s+\w+\s*\((.*?)\)/)?.[1]?.split(',')?.map(c => c.trim().split(/\s+/)[0]) || [];
        
        // Check if one is a prefix of the other (composite index redundancy)
        if (cols1.length > 0 && cols2.length > 0) {
          const minLen = Math.min(cols1.length, cols2.length);
          const arePrefix = cols1.slice(0, minLen).every((col, idx) => col === cols2[idx]);
          
          if (arePrefix && cols1.length !== cols2.length) {
            auditResults.redundantIndexes.push({
              table: table,
              index1: idx1.name,
              index2: idx2.name,
              issue: cols1.length < cols2.length ? 
                `${idx1.name} may be redundant (prefix of ${idx2.name})` :
                `${idx2.name} may be redundant (prefix of ${idx1.name})`
            });
          }
        }
      }
    }
    
    console.log(`  ${table}: ${tableIndexes.length} indexes`);
  }
  
  if (auditResults.redundantIndexes.length > 0) {
    console.log(`  ⚠️  Found ${auditResults.redundantIndexes.length} potentially redundant indexes`);
  }
}

async function generateSummary() {
  console.log('\n[7] Generating Summary...');
  
  const summary = {
    totalTables: auditResults.tables.length,
    totalForeignKeys: auditResults.foreignKeys.length,
    missingIndexCount: auditResults.missingIndexes.length,
    orphanedRecordsFound: auditResults.orphanedRecords.length,
    orphanedRecordsTotalCount: auditResults.orphanedRecords.reduce((sum, r) => sum + r.orphanCount, 0),
    missingMigrationTables: auditResults.unreferencedMigrationTables.length,
    redundantIndexesFound: auditResults.redundantIndexes.length,
    totalRowsAcrossAllTables: Object.values(auditResults.rowCounts).reduce((sum, count) => sum + count, 0)
  };
  
  auditResults.summary = summary;
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('DATABASE AUDIT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tables: ${summary.totalTables}`);
  console.log(`Total Foreign Keys: ${summary.totalForeignKeys}`);
  console.log(`Missing Indexes on FK Columns: ${summary.missingIndexCount}`);
  console.log(`Orphaned Records Found: ${summary.orphanedRecordsFound} (Total: ${summary.orphanedRecordsTotalCount})`);
  console.log(`Missing Migration Tables: ${summary.missingMigrationTables}`);
  console.log(`Potentially Redundant Indexes: ${summary.redundantIndexesFound}`);
  console.log(`Total Rows Across All Tables: ${summary.totalRowsAcrossAllTables}`);
  console.log('═══════════════════════════════════════════════════════════');
}

async function main() {
  try {
    console.log('Starting Database Integrity Audit...');
    console.log(`Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    await client.connect();
    console.log('✓ Connected successfully');
    
    await auditTables();
    await auditForeignKeys();
    await auditOrphanedRecords();
    await auditRowCounts();
    await checkMigrationTables();
    await auditIndexes();
    await generateSummary();
    
    // Output results to JSON file
    const fs = await import('fs');
    const outputPath = '/tmp/database_audit_results.json';
    fs.writeFileSync(outputPath, JSON.stringify(auditResults, null, 2));
    console.log(`\n✓ Full audit results saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await client.end();
  }
}

main();
