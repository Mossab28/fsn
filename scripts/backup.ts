import fs from 'node:fs'
import path from 'node:path'

const ROOT_DIR = path.resolve(__dirname, '..')
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups')
const DB_PATH = path.join(ROOT_DIR, 'prisma', 'dev.db')
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads')

function timestamp(): string {
  const now = new Date()
  return now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
}

function copyDirRecursive(src: string, dest: string): number {
  if (!fs.existsSync(src)) return 0

  fs.mkdirSync(dest, { recursive: true })
  let count = 0

  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      count += copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
      count++
    }
  }

  return count
}

function getDirectorySize(dir: string): number {
  if (!fs.existsSync(dir)) return 0
  let size = 0

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      size += getDirectorySize(entryPath)
    } else {
      size += fs.statSync(entryPath).size
    }
  }

  return size
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 o'
  const units = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

async function main() {
  const ts = timestamp()
  const backupName = `backup-${ts}`
  const backupDir = path.join(BACKUPS_DIR, backupName)

  console.log(`[Backup] Demarrage de la sauvegarde: ${backupName}`)
  console.log(`[Backup] Repertoire: ${backupDir}`)

  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true })

  // 1. Copy database
  let dbSize = 0
  const dbBackupDir = path.join(backupDir, 'prisma')
  fs.mkdirSync(dbBackupDir, { recursive: true })

  if (fs.existsSync(DB_PATH)) {
    const dbDest = path.join(dbBackupDir, 'dev.db')
    fs.copyFileSync(DB_PATH, dbDest)
    dbSize = fs.statSync(DB_PATH).size
    console.log(`[Backup] Base de donnees copiee (${formatSize(dbSize)})`)

    // Also copy WAL and SHM files if they exist
    const walPath = DB_PATH + '-wal'
    const shmPath = DB_PATH + '-shm'
    if (fs.existsSync(walPath)) {
      fs.copyFileSync(walPath, path.join(dbBackupDir, 'dev.db-wal'))
    }
    if (fs.existsSync(shmPath)) {
      fs.copyFileSync(shmPath, path.join(dbBackupDir, 'dev.db-shm'))
    }
  } else {
    console.warn('[Backup] Base de donnees introuvable:', DB_PATH)
  }

  // 2. Copy uploads directory
  let uploadFileCount = 0
  let uploadsSize = 0
  const uploadsBackupDir = path.join(backupDir, 'uploads')

  if (fs.existsSync(UPLOADS_DIR)) {
    uploadFileCount = copyDirRecursive(UPLOADS_DIR, uploadsBackupDir)
    uploadsSize = getDirectorySize(uploadsBackupDir)
    console.log(`[Backup] Fichiers uploades copies: ${uploadFileCount} fichiers (${formatSize(uploadsSize)})`)
  } else {
    console.warn('[Backup] Repertoire uploads introuvable:', UPLOADS_DIR)
    fs.mkdirSync(uploadsBackupDir, { recursive: true })
  }

  // 3. Create manifest
  const manifest = {
    name: backupName,
    createdAt: new Date().toISOString(),
    version: '1.0',
    contents: {
      database: {
        path: 'prisma/dev.db',
        size: dbSize,
        sizeFormatted: formatSize(dbSize),
        exists: fs.existsSync(DB_PATH),
      },
      uploads: {
        path: 'uploads/',
        fileCount: uploadFileCount,
        size: uploadsSize,
        sizeFormatted: formatSize(uploadsSize),
      },
    },
    totalSize: dbSize + uploadsSize,
    totalSizeFormatted: formatSize(dbSize + uploadsSize),
  }

  const manifestPath = path.join(backupDir, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  console.log(`[Backup] Manifeste cree: manifest.json`)

  console.log(`\n[Backup] Sauvegarde terminee avec succes`)
  console.log(`[Backup] Taille totale: ${manifest.totalSizeFormatted}`)
  console.log(`[Backup] Emplacement: ${backupDir}`)
}

main().catch((err) => {
  console.error('[Backup] Erreur:', err)
  process.exit(1)
})
