#!/bin/sh
set -e

echo "=== FSN Platform - Starting ==="

# Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration warning (may be first run)"

# Seed if DB is empty (using better-sqlite3 directly, works in standalone)
echo "Checking seed..."
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = new Database('prisma/dev.db');
const count = db.prepare('SELECT COUNT(*) as c FROM User').get().c;
if (count === 0) {
  console.log('No users, seeding...');
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
  console.log('Seed done!');
} else {
  console.log('DB has ' + count + ' users, skip seed');
}
db.close();
" 2>&1 || echo "Seed check done"

echo "Starting Next.js server..."
exec node server.js
