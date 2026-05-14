#!/bin/sh
set -e

echo "=== FSN Platform - Starting ==="

# Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration warning (may be first run)"

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
