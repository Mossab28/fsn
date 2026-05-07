#!/bin/sh
set -e

echo "=== FSN Platform - Starting ==="

# Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration warning (may be first run)"

# Always create users if missing (idempotent)
echo "Checking users..."
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = new Database('prisma/dev.db');
const count = db.prepare('SELECT COUNT(*) as c FROM User').get().c;
if (count === 0) {
  console.log('No users, seeding default accounts...');
  const now = new Date().toISOString();
  const users = [
    ['admin@fsn.fr', 'Admin2026!', 'Administrateur FSN', 'ADMIN'],
    ['membre@fsn.fr', 'Membre2026!', 'Marie Membre', 'MEMBER'],
    ['lecteur@fsn.fr', 'Lecteur2026!', 'Leo Lecteur', 'READER'],
  ];
  const stmt = db.prepare('INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const [email, pass, name, role] of users) {
    const hash = bcrypt.hashSync(pass, 10);
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 25);
    stmt.run(id, email, hash, name, role, now, now);
    console.log('  Created:', email, '(' + role + ')');
  }
}
db.close();
" 2>&1 || echo "Users check done"

# Run full seed (idempotent — skips if documents already exist)
echo "Running full seed (categories, folders, documents, versions, wiki, logs)..."
if [ -f scripts/seed-production.js ]; then
  node scripts/seed-production.js 2>&1 || echo "Full seed warning"
else
  echo "scripts/seed-production.js not found, skipping full seed"
fi

echo "Starting Next.js server..."
exec node server.js
