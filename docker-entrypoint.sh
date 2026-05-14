#!/bin/sh
set -e

echo "=== FSN Platform - Starting ==="

# Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration warning (may be first run)"

# Provision required accounts (idempotent: upsert by email)
echo "Provisioning accounts..."
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = new Database('prisma/dev.db');

// Remove legacy demo accounts if they still exist
db.prepare(\"DELETE FROM User WHERE email IN ('admin@fsn.fr','membre@fsn.fr','lecteur@fsn.fr')\").run();

const accounts = [
  ['client@test.fsn', 'Client2026!', 'Client Démo', 'ADMIN'],
  ['mossab@fsn.fr', 'Mossab2026!', 'Mossab Mirande-Ney', 'ADMIN'],
];

const now = new Date().toISOString();
const select = db.prepare('SELECT id FROM User WHERE email = ?');
const insert = db.prepare('INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
const update = db.prepare('UPDATE User SET password = ?, name = ?, role = ?, updatedAt = ? WHERE email = ?');

for (const [email, pass, name, role] of accounts) {
  const hash = bcrypt.hashSync(pass, 10);
  const existing = select.get(email);
  if (existing) {
    update.run(hash, name, role, now, email);
    console.log('  Updated:', email, '(' + role + ')');
  } else {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 25);
    insert.run(id, email, hash, name, role, now, now);
    console.log('  Created:', email, '(' + role + ')');
  }
}
db.close();
" 2>&1 || echo "Account provisioning done"

# Run full seed (idempotent — skips if documents already exist)
echo "Running full seed (categories, folders, documents, versions, wiki, logs)..."
if [ -f scripts/seed-production.js ]; then
  node scripts/seed-production.js 2>&1 || echo "Full seed warning"
else
  echo "scripts/seed-production.js not found, skipping full seed"
fi

echo "Starting Next.js server..."
exec node server.js
