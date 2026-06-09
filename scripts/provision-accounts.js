// scripts/provision-accounts.js
// Runs on every container start. Idempotent.
// Removes legacy demo accounts and provisions the production ones.

const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const DB_PATH = 'prisma/dev.db'

const LEGACY_EMAILS = ['admin@fsn.fr', 'membre@fsn.fr', 'lecteur@fsn.fr']

const ACCOUNTS = [
  { email: 'robert.picard@fsn.fr', password: 'Robert2026!', name: 'Robert Picard', role: 'ADMIN' },
  { email: 'client@test.fsn', password: 'Client2026!', name: 'Client Démo', role: 'ADMIN' },
  { email: 'mossab@fsn.fr', password: 'Mossab2026!', name: 'Mossab Mirande-Ney', role: 'ADMIN' },
]

function uid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 25)
}

function main() {
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const now = new Date().toISOString()

  // Reassign any documents/logs owned by legacy users to the first new ADMIN
  // (we keep referential integrity before deleting them)
  const placeholders = LEGACY_EMAILS.map(() => '?').join(',')
  const legacyUsers = db
    .prepare(`SELECT id, email FROM User WHERE email IN (${placeholders})`)
    .all(...LEGACY_EMAILS)

  // Ensure target admin exists before reassigning
  let primaryAdminId = db.prepare('SELECT id FROM User WHERE email = ?').get(ACCOUNTS[0].email)?.id
  if (!primaryAdminId) {
    primaryAdminId = uid()
    const hash = bcrypt.hashSync(ACCOUNTS[0].password, 10)
    db.prepare(
      'INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(primaryAdminId, ACCOUNTS[0].email, hash, ACCOUNTS[0].name, ACCOUNTS[0].role, now, now)
    console.log('  Created:', ACCOUNTS[0].email)
  }

  // Reassign FK references before deleting legacy users
  const reassigns = [
    'UPDATE Document SET uploadedBy = ? WHERE uploadedBy = ?',
    'UPDATE DocumentVersion SET uploadedBy = ? WHERE uploadedBy = ?',
    'UPDATE ActivityLog SET userId = ? WHERE userId = ?',
    'UPDATE WikiContribution SET userId = ? WHERE userId = ?',
  ]
  for (const legacy of legacyUsers) {
    for (const sql of reassigns) {
      try {
        db.prepare(sql).run(primaryAdminId, legacy.id)
      } catch (e) {
        console.log('  (skip)', sql.split(' ')[1], e.message)
      }
    }
  }

  const deleted = db.prepare(`DELETE FROM User WHERE email IN (${placeholders})`).run(...LEGACY_EMAILS)
  if (deleted.changes > 0) console.log('  Removed legacy accounts:', deleted.changes)

  // Upsert target accounts
  const select = db.prepare('SELECT id FROM User WHERE email = ?')
  const insert = db.prepare(
    'INSERT INTO User (id, email, password, name, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const update = db.prepare('UPDATE User SET password = ?, name = ?, role = ?, updatedAt = ? WHERE email = ?')

  for (const a of ACCOUNTS) {
    const hash = bcrypt.hashSync(a.password, 10)
    const existing = select.get(a.email)
    if (existing) {
      update.run(hash, a.name, a.role, now, a.email)
      console.log('  Updated:', a.email, '(' + a.role + ')')
    } else {
      insert.run(uid(), a.email, hash, a.name, a.role, now, now)
      console.log('  Created:', a.email, '(' + a.role + ')')
    }
  }

  db.close()
}

try {
  main()
  console.log('Account provisioning OK')
} catch (err) {
  console.error('Account provisioning FAILED:', err.message)
  console.error(err.stack)
  process.exit(1)
}
