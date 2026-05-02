#!/bin/sh
set -e

echo "=== FSN Platform - Starting ==="

# Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration warning (may be first run)"

# Seed if DB is empty
echo "Checking seed..."
node -e "
const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
const adapter = new PrismaBetterSqlite3({ url: 'file:' + path.join(process.cwd(), 'prisma', 'dev.db') });
const prisma = new PrismaClient({ adapter });
prisma.user.count().then(c => {
  if (c === 0) {
    console.log('No users found, seeding...');
    const bcrypt = require('bcryptjs');
    bcrypt.hash('admin2026!', 10).then(hash => {
      prisma.user.create({ data: { email: 'admin@fsn.fr', password: hash, name: 'Administrateur FSN', role: 'ADMIN' }})
        .then(() => { console.log('Admin seeded'); process.exit(0); });
    });
  } else {
    console.log('DB has ' + c + ' users, skip seed');
    process.exit(0);
  }
}).catch(e => { console.error(e); process.exit(0); });
" 2>&1 || echo "Seed check done"

echo "Starting Next.js server..."
exec node server.js
