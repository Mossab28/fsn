import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'node:path'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

const FOLDER_COLORS: Record<string, string> = {
  'Réglementation': '#EF4444',
  'Études & Rapports': '#3B82F6',
  'Fiches Pratiques': '#22C55E',
  'Veille Technologique': '#8B5CF6',
  'Formations': '#F59E0B',
  'Compte-Rendus': '#EC4899',
}

const SUB_FOLDERS = [
  { name: '2024', parentName: 'Compte-Rendus', color: '#EC4899' },
  { name: '2025', parentName: 'Compte-Rendus', color: '#EC4899' },
  { name: '2026', parentName: 'Compte-Rendus', color: '#EC4899' },
  { name: 'RGPD', parentName: 'Réglementation', color: '#EF4444' },
  { name: 'Certification', parentName: 'Réglementation', color: '#EF4444' },
  { name: 'IA & Santé', parentName: 'Veille Technologique', color: '#8B5CF6' },
  { name: 'Cybersécurité', parentName: 'Veille Technologique', color: '#8B5CF6' },
]

async function main() {
  const categories = await prisma.category.findMany()
  console.log('Found categories:', categories.map(c => c.name).join(', '))

  // Create root folders matching categories
  const folderMap: Record<string, string> = {}
  for (const cat of categories) {
    const existing = await prisma.folder.findFirst({ where: { name: cat.name, parentId: null } })
    if (existing) {
      folderMap[cat.id] = existing.id
      console.log(`  [skip] ${cat.name} already exists`)
      continue
    }
    const folder = await prisma.folder.create({
      data: {
        name: cat.name,
        color: FOLDER_COLORS[cat.name] || '#00A88E',
        parentId: null,
      },
    })
    folderMap[cat.id] = folder.id
    console.log(`  [created] ${cat.name}`)
  }

  // Create sub-folders
  for (const sf of SUB_FOLDERS) {
    const parentFolder = await prisma.folder.findFirst({ where: { name: sf.parentName, parentId: null } })
    if (!parentFolder) continue
    const existing = await prisma.folder.findFirst({ where: { name: sf.name, parentId: parentFolder.id } })
    if (existing) continue
    await prisma.folder.create({
      data: { name: sf.name, color: sf.color, parentId: parentFolder.id },
    })
    console.log(`  [created] ${sf.parentName}/${sf.name}`)
  }

  // Assign documents to their category folder
  const docs = await prisma.document.findMany({
    where: { folderId: null },
    select: { id: true, categoryId: true },
  })
  let updated = 0
  for (const doc of docs) {
    if (doc.categoryId && folderMap[doc.categoryId]) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { folderId: folderMap[doc.categoryId] },
      })
      updated++
    }
  }
  console.log(`\nAssigned ${updated} documents to folders`)
  console.log('Done!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
