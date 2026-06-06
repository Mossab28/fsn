#!/bin/sh
set -e

echo "=== FSN Platform - Starting ==="

# Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration warning (may be first run)"

# Schema self-heal: ensure recent columns exist even if Prisma migrate failed
# (volume-bound dev.db can be out of sync after manual ops). Idempotent.
echo "Schema self-heal check..."
node -e "
const Database = require('better-sqlite3');
const db = new Database('prisma/dev.db');
function hasColumn(table, col) {
  const cols = db.prepare(\`PRAGMA table_info(\${table})\`).all();
  return cols.some((c) => c.name === col);
}
function ensureColumn(table, col, ddl) {
  if (!hasColumn(table, col)) {
    console.log(\`  + Adding \${table}.\${col}\`);
    db.exec(\`ALTER TABLE \\\"\${table}\\\" ADD COLUMN \${ddl}\`);
  } else {
    console.log(\`  ✓ \${table}.\${col} already present\`);
  }
}
try {
  ensureColumn('Folder', 'isArchived', '\"isArchived\" BOOLEAN NOT NULL DEFAULT false');
  // Ensure index too (no error if already exists)
  try { db.exec('CREATE INDEX IF NOT EXISTS \"Folder_isArchived_idx\" ON \"Folder\"(\"isArchived\")'); } catch (e) {}
} catch (e) {
  console.error('Schema self-heal error:', e.message);
}
db.close();
" 2>&1 || echo "Schema self-heal skipped (db not ready yet)"

# Provision required accounts (idempotent: upsert by email, reassign FKs first)
echo "Provisioning accounts..."
if [ -f scripts/provision-accounts.js ]; then
  node scripts/provision-accounts.js || echo "Account provisioning FAILED (boot continues)"
else
  echo "scripts/provision-accounts.js missing — skipping"
fi

# Run full seed (idempotent — skips if documents already exist)
echo "Running full seed (categories, folders, documents, versions, wiki, logs)..."
if [ -f scripts/seed-production.js ]; then
  node scripts/seed-production.js 2>&1 || echo "Full seed warning"
else
  echo "scripts/seed-production.js not found, skipping full seed"
fi

echo "Starting Next.js server..."
exec node server.js
