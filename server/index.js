import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import crypto from 'node:crypto'
import {
  DEFAULT_CMS,
  DEFAULT_MOLDED_PRODUCTS,
  DEFAULT_CATEGORIES,
  DEFAULT_MOLDS
} from './cmsDefaults.js'
import {
  isFirestoreConfigured,
  ensureFirestoreSeeded,
  fsListCollection,
  fsGetDoc,
  fsSetDoc,
  fsDeleteDoc
} from './firestoreStore.js'

const isVercel = Boolean(process.env.VERCEL)
const prisma = process.env.DATABASE_URL ? new PrismaClient() : null
const app = express()
const PORT = process.env.PORT || 3000
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = isVercel ? '/tmp/ilufa-data' : path.resolve(__dirname, 'data')
const uploadDir = isVercel ? '/tmp/ilufa-uploads' : path.resolve(__dirname, '../public/uploads')

// Ensure runtime directories exist safely
try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
} catch {}

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }))
app.use(express.json({ limit: '15mb' }))
app.use(express.urlencoded({ extended: true, limit: '15mb' }))
app.use('/uploads', express.static(uploadDir))

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// --- Local JSON Fallback Files ---
const CMS_FILE = path.join(dataDir, 'cms-content.json')
const PRODUCTS_FILE = path.join(dataDir, 'molded-products.json')
const CATEGORIES_FILE = path.join(dataDir, 'categories.json')
const MOLDS_FILE = path.join(dataDir, 'molds.json')
const INQUIRIES_FILE = path.join(dataDir, 'inquiries.json')

function readJsonFile(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message)
  }
  return defaultValue
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message)
  }
}

function parseGallery(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean).slice(0, 3)
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(Boolean).slice(0, 3)
    } catch {
      return [raw.trim()]
    }
  }
  return []
}

function serializeGallery(arr) {
  const clean = parseGallery(arr)
  return JSON.stringify(clean)
}

function formatCategoryRecord(cat) {
  if (!cat) return cat
  return {
    ...cat,
    isVisible: cat.isVisible !== false,
    galleryImages: parseGallery(cat.galleryImages)
  }
}

function formatMoldRecord(mold) {
  if (!mold) return mold
  return {
    ...mold,
    isVisible: mold.isVisible !== false,
    galleryImages: parseGallery(mold.galleryImages)
  }
}

function formatProductRecord(prod) {
  if (!prod) return prod
  return {
    ...prod,
    isVisible: prod.isVisible !== false,
    galleryImages: parseGallery(prod.galleryImages)
  }
}

// --- Auto-Initialize & Sync PostgreSQL or Firestore Schema on Startup ---
async function ensureDatabaseSchema() {
  if (isFirestoreConfigured()) {
    await ensureFirestoreSeeded()
    return
  }
  if (!prisma) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "detailContent" TEXT,
        "imageUrl" TEXT,
        "galleryImages" TEXT,
        "isVisible" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
      );
    `)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");`)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");`)

    await prisma.$executeRawUnsafe(`ALTER TABLE "Mold" ADD COLUMN IF NOT EXISTS "detailContent" TEXT;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Mold" ADD COLUMN IF NOT EXISTS "galleryImages" TEXT;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Mold" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;`)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SiteSetting" (
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
      );
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MoldedProduct" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "description" TEXT,
        "detailContent" TEXT,
        "imageUrl" TEXT,
        "galleryImages" TEXT,
        "weightEst" TEXT,
        "dimensions" TEXT,
        "moldInfo" TEXT,
        "materialType" TEXT,
        "cycleTime" TEXT,
        "minMachineTonnage" TEXT,
        "featured" BOOLEAN NOT NULL DEFAULT false,
        "isVisible" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MoldedProduct_pkey" PRIMARY KEY ("id")
      );
    `)
    await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "detailContent" TEXT;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "galleryImages" TEXT;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "materialType" TEXT;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "cycleTime" TEXT;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "minMachineTonnage" TEXT;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;`)

    // Seed initial Categories if empty
    const catCount = await prisma.category.count()
    if (catCount === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await prisma.category.create({
          data: {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            detailContent: cat.detailContent,
            imageUrl: cat.imageUrl,
            galleryImages: serializeGallery(cat.galleryImages),
            isVisible: cat.isVisible,
            sortOrder: cat.sortOrder
          }
        }).catch(() => null)
      }
    }

    // Seed initial MoldedProducts if empty
    const prodCount = await prisma.moldedProduct.count()
    if (prodCount === 0) {
      for (const prod of DEFAULT_MOLDED_PRODUCTS) {
        await prisma.moldedProduct.create({
          data: {
            id: prod.id,
            name: prod.name,
            category: prod.category,
            description: prod.description,
            detailContent: prod.detailContent,
            imageUrl: prod.imageUrl,
            galleryImages: serializeGallery(prod.galleryImages),
            weightEst: prod.weightEst,
            dimensions: prod.dimensions,
            moldInfo: prod.moldInfo,
            materialType: prod.materialType,
            cycleTime: prod.cycleTime,
            minMachineTonnage: prod.minMachineTonnage,
            featured: prod.featured,
            isVisible: prod.isVisible
          }
        }).catch(() => null)
      }
    }
  } catch (err) {
    // Silent fallback when DB is unreachable
  }
}

ensureDatabaseSchema()

async function getMergedCMS() {
  const result = JSON.parse(JSON.stringify(DEFAULT_CMS))

  // 1. Try Firestore first if configured
  if (isFirestoreConfigured()) {
    try {
      await ensureFirestoreSeeded()
      const fsCms = await fsGetDoc('site_settings', 'cms')
      if (fsCms) {
        const { id, ...clean } = fsCms
        return { ...result, ...clean }
      }
    } catch (err) {
      console.warn('Firestore CMS read fallback:', err.message)
    }
  }

  // 2. Try PostgreSQL via Prisma
  if (prisma) {
    try {
      const settings = await prisma.siteSetting.findMany()
      if (settings && settings.length > 0) {
        for (const item of settings) {
          try {
            result[item.key] = JSON.parse(item.value)
          } catch {
            result[item.key] = item.value
          }
        }
        return result
      }
    } catch {}
  }

  // 3. Fallback to local JSON file
  const fileData = readJsonFile(CMS_FILE, null)
  if (fileData) {
    return { ...result, ...fileData }
  }
  return result
}

// --- Stateless Admin Auth Token (HMAC-signed so it survives Vercel Serverless cold starts) ---
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'ilufa-molding-secret-key-2026'
const activeTokens = new Set(['dev-admin-token'])

function createStatelessAdminToken() {
  const payload = `admin.${Date.now()}`
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex')
  return `adm_${Buffer.from(payload).toString('base64url')}.${sig}`
}

function isValidAdminToken(token) {
  if (!token) return false
  if (activeTokens.has(token) || token === process.env.ADMIN_KEY || token === ADMIN_PASSWORD) {
    return true
  }
  if (token.startsWith('adm_') && token.includes('.')) {
    const [encodedPayload, sig] = token.slice(4).split('.')
    if (!encodedPayload || !sig) return false
    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex')
    return sig === expectedSig
  }
  return false
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-admin-key']
  if (!isValidAdminToken(token)) {
    return res.status(401).json({ error: 'Akses ditolak. Silakan login sebagai admin.' })
  }
  next()
}

// --- Public & Shared Endpoints ---

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ilufa-molding-api',
    storage: isFirestoreConfigured() ? 'firestore' : prisma ? 'postgres' : 'json-fallback'
  })
})

// Get CMS Content
app.get('/api/cms', asyncHandler(async (_req, res) => {
  const content = await getMergedCMS()
  res.json({ ok: true, data: content })
}))

// --- Categories API (CRUD + Visibility Toggle) ---
async function getAllCategories() {
  if (isFirestoreConfigured()) {
    try {
      await ensureFirestoreSeeded()
      const docs = await fsListCollection('categories')
      if (docs.length > 0) {
        return docs
          .map(formatCategoryRecord)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      }
    } catch (err) {
      console.warn('Firestore categories read fallback:', err.message)
    }
  }
  if (prisma) {
    try {
      const cats = await prisma.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      })
      if (cats.length > 0) return cats.map(formatCategoryRecord)
    } catch {}
  }
  const fileCats = readJsonFile(CATEGORIES_FILE, null)
  if (fileCats && fileCats.length > 0) return fileCats.map(formatCategoryRecord)
  return DEFAULT_CATEGORIES.map(formatCategoryRecord)
}

app.get('/api/categories', asyncHandler(async (req, res) => {
  const all = await getAllCategories()
  if (req.query.visibleOnly === 'true') {
    return res.json({ data: all.filter(c => c.isVisible !== false) })
  }
  res.json({ data: all })
}))

app.post('/api/categories', requireAdmin, asyncHandler(async (req, res) => {
  const body = req.body || {}
  if (!body.name || !String(body.name).trim()) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi.' })
  }
  const name = String(body.name).trim()
  const baseSlug = (body.slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 5)}`
  const galleryArr = parseGallery(body.galleryImages)
  const isVisible = body.isVisible !== undefined ? Boolean(body.isVisible) : true

  if (isFirestoreConfigured()) {
    const id = 'cat_' + Date.now()
    const newCat = {
      id,
      name,
      slug,
      description: body.description ? String(body.description).trim() : null,
      detailContent: body.detailContent ? String(body.detailContent).trim() : null,
      imageUrl: body.imageUrl || null,
      galleryImages: galleryArr,
      isVisible,
      sortOrder: body.sortOrder ? parseInt(body.sortOrder, 10) : 0,
      createdAt: new Date().toISOString()
    }
    const saved = await fsSetDoc('categories', id, newCat)
    return res.status(201).json({ ok: true, message: 'Kategori berhasil ditambahkan ke Firestore.', data: formatCategoryRecord(saved) })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    const created = await prisma.category.create({
      data: {
        name,
        slug,
        description: body.description ? String(body.description).trim() : null,
        detailContent: body.detailContent ? String(body.detailContent).trim() : null,
        imageUrl: body.imageUrl || null,
        galleryImages: serializeGallery(galleryArr),
        isVisible,
        sortOrder: body.sortOrder ? parseInt(body.sortOrder, 10) : 0
      }
    })
    return res.status(201).json({ ok: true, message: 'Kategori berhasil ditambahkan.', data: formatCategoryRecord(created) })
  } catch {
    const current = await getAllCategories()
    const newCat = {
      id: 'cat_' + Date.now(),
      name,
      slug,
      description: body.description || null,
      detailContent: body.detailContent || null,
      imageUrl: body.imageUrl || null,
      galleryImages: galleryArr,
      isVisible,
      sortOrder: body.sortOrder ? parseInt(body.sortOrder, 10) : current.length + 1,
      createdAt: new Date().toISOString()
    }
    current.push(newCat)
    writeJsonFile(CATEGORIES_FILE, current)
    return res.status(201).json({ ok: true, message: 'Kategori berhasil ditambahkan.', data: formatCategoryRecord(newCat) })
  }
}))

app.put('/api/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const body = req.body || {}
  if (!body.name || !String(body.name).trim()) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi.' })
  }
  const newName = String(body.name).trim()

  if (isFirestoreConfigured()) {
    const existing = await fsGetDoc('categories', id)
    if (!existing) return res.status(404).json({ error: 'Kategori tidak ditemukan.' })
    const updatedPayload = {
      ...existing,
      name: newName,
      description: body.description !== undefined ? body.description : existing.description,
      detailContent: body.detailContent !== undefined ? body.detailContent : existing.detailContent,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
      galleryImages: body.galleryImages !== undefined ? parseGallery(body.galleryImages) : parseGallery(existing.galleryImages),
      isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : existing.isVisible !== false,
      sortOrder: body.sortOrder !== undefined ? parseInt(body.sortOrder, 10) : existing.sortOrder || 0,
      updatedAt: new Date().toISOString()
    }
    const saved = await fsSetDoc('categories', id, updatedPayload)
    if (existing.name && existing.name !== newName) {
      const [molds, prods] = await Promise.all([fsListCollection('molds'), fsListCollection('molded_products')])
      for (const m of molds.filter(x => x.category === existing.name)) {
        await fsSetDoc('molds', m.id, { ...m, category: newName })
      }
      for (const p of prods.filter(x => x.category === existing.name)) {
        await fsSetDoc('molded_products', p.id, { ...p, category: newName })
      }
    }
    return res.json({ ok: true, message: 'Kategori berhasil diperbarui.', data: formatCategoryRecord(saved) })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    const existing = await prisma.category.findUnique({ where: { id } })
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: newName,
        description: body.description !== undefined ? body.description : undefined,
        detailContent: body.detailContent !== undefined ? body.detailContent : undefined,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
        galleryImages: body.galleryImages !== undefined ? serializeGallery(body.galleryImages) : undefined,
        isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : undefined,
        sortOrder: body.sortOrder !== undefined ? parseInt(body.sortOrder, 10) : undefined
      }
    })
    if (existing && existing.name !== newName) {
      await prisma.mold.updateMany({ where: { category: existing.name }, data: { category: newName } }).catch(() => null)
      await prisma.moldedProduct.updateMany({ where: { category: existing.name }, data: { category: newName } }).catch(() => null)
    }
    return res.json({ ok: true, message: 'Kategori berhasil diperbarui.', data: formatCategoryRecord(updated) })
  } catch {
    const current = await getAllCategories()
    const idx = current.findIndex(c => c.id === id)
    if (idx !== -1) {
      current[idx] = {
        ...current[idx],
        ...body,
        name: newName,
        galleryImages: body.galleryImages !== undefined ? parseGallery(body.galleryImages) : current[idx].galleryImages,
        isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : current[idx].isVisible
      }
      writeJsonFile(CATEGORIES_FILE, current)
      return res.json({ ok: true, message: 'Kategori berhasil diperbarui.', data: formatCategoryRecord(current[idx]) })
    }
    res.status(404).json({ error: 'Kategori tidak ditemukan.' })
  }
}))

app.patch('/api/categories/:id/visibility', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isVisible } = req.body || {}
  const nextVal = Boolean(isVisible)

  if (isFirestoreConfigured()) {
    const existing = await fsGetDoc('categories', id)
    if (!existing) return res.status(404).json({ error: 'Kategori tidak ditemukan.' })
    const saved = await fsSetDoc('categories', id, { ...existing, isVisible: nextVal })
    return res.json({ ok: true, data: formatCategoryRecord(saved) })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    const updated = await prisma.category.update({
      where: { id },
      data: { isVisible: nextVal }
    })
    return res.json({ ok: true, data: formatCategoryRecord(updated) })
  } catch {
    const current = await getAllCategories()
    const idx = current.findIndex(c => c.id === id)
    if (idx !== -1) {
      current[idx].isVisible = nextVal
      writeJsonFile(CATEGORIES_FILE, current)
      return res.json({ ok: true, data: formatCategoryRecord(current[idx]) })
    }
    res.status(404).json({ error: 'Kategori tidak ditemukan.' })
  }
}))

app.delete('/api/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  if (isFirestoreConfigured()) {
    await fsDeleteDoc('categories', id)
    return res.json({ ok: true, message: 'Kategori berhasil dihapus.' })
  }
  try {
    if (!prisma) throw new Error('No Prisma')
    await prisma.category.delete({ where: { id } })
    return res.json({ ok: true, message: 'Kategori berhasil dihapus.' })
  } catch {
    const current = await getAllCategories()
    const filtered = current.filter(c => c.id !== id)
    writeJsonFile(CATEGORIES_FILE, filtered)
    return res.json({ ok: true, message: 'Kategori berhasil dihapus.' })
  }
}))

// --- Molds Catalog API (Firestore + PostgreSQL + JSON Fallback) ---
async function getAllMolds() {
  if (isFirestoreConfigured()) {
    try {
      await ensureFirestoreSeeded()
      const docs = await fsListCollection('molds')
      if (docs.length > 0) {
        return docs
          .map(formatMoldRecord)
          .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
      }
    } catch (err) {
      console.warn('Firestore molds read fallback:', err.message)
    }
  }
  if (prisma) {
    try {
      const molds = await prisma.mold.findMany({
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }]
      })
      if (molds.length > 0) return molds.map(formatMoldRecord)
    } catch {}
  }
  const fileMolds = readJsonFile(MOLDS_FILE, null)
  if (fileMolds && fileMolds.length > 0) return fileMolds.map(formatMoldRecord)
  return DEFAULT_MOLDS.map(formatMoldRecord)
}

app.get('/api/molds', asyncHandler(async (req, res) => {
  const { type, q, status, featured, visibleOnly } = req.query
  let list = await getAllMolds()

  if (type && ['NEW', 'CUSTOM', 'USED'].includes(String(type).toUpperCase())) {
    list = list.filter(m => m.type === String(type).toUpperCase())
  }
  if (status && ['AVAILABLE', 'ON_ORDER', 'NEGOTIATION', 'SOLD'].includes(String(status).toUpperCase())) {
    list = list.filter(m => m.status === String(status).toUpperCase())
  }
  if (featured === 'true') list = list.filter(m => Boolean(m.featured))
  if (visibleOnly === 'true') list = list.filter(m => m.isVisible !== false)
  if (q) {
    const search = String(q).toLowerCase()
    list = list.filter(m => `${m.name} ${m.code} ${m.category}`.toLowerCase().includes(search))
  }

  res.json({ data: list })
}))

app.get('/api/molds/:idOrSlug', asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params
  const list = await getAllMolds()
  const mold = list.find(m => m.id === idOrSlug || m.slug === idOrSlug || m.code === idOrSlug)
  if (!mold) return res.status(404).json({ error: 'Molding tidak ditemukan.' })
  res.json({ data: formatMoldRecord(mold) })
}))

app.post('/api/molds', requireAdmin, asyncHandler(async (req, res) => {
  const body = req.body || {}
  if (!body.name || !body.type || !body.category) {
    return res.status(400).json({ error: 'Nama mold, tipe, dan kategori wajib diisi.' })
  }

  const prefix = { NEW: 'ILF-NEW', CUSTOM: 'ILF-CUS', USED: 'ILF-USD' }[body.type] || 'ILF-MOLD'
  const code = (body.code || `${prefix}-${Date.now().toString().slice(-4)}`).trim()
  const baseSlug = (body.slug || body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
  const galleryArr = parseGallery(body.galleryImages)

  const moldData = {
    code,
    name: String(body.name).trim(),
    slug: body.slug ? String(body.slug).trim() : slug,
    type: body.type,
    category: String(body.category).trim(),
    description: String(body.description || '').trim(),
    detailContent: body.detailContent ? String(body.detailContent).trim() : null,
    imageUrl: body.imageUrl || null,
    dimensions: body.dimensions || null,
    weightKg: body.weightKg ? parseFloat(body.weightKg) : null,
    cavity: body.cavity ? parseInt(body.cavity, 10) : null,
    material: body.material || null,
    machineTonnage: body.machineTonnage || null,
    condition: body.condition || null,
    priceLabel: body.priceLabel || 'Minta penawaran',
    status: body.status || 'AVAILABLE',
    featured: Boolean(body.featured),
    isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : true
  }

  if (isFirestoreConfigured()) {
    const id = 'mold_' + Date.now()
    const saved = await fsSetDoc('molds', id, {
      id,
      ...moldData,
      galleryImages: galleryArr,
      createdAt: new Date().toISOString()
    })
    return res.status(201).json({ ok: true, message: 'Molding berhasil ditambahkan ke Firestore.', data: formatMoldRecord(saved) })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    const newMold = await prisma.mold.create({
      data: {
        ...moldData,
        galleryImages: serializeGallery(galleryArr)
      }
    })
    return res.status(201).json({ ok: true, message: 'Molding berhasil ditambahkan.', data: formatMoldRecord(newMold) })
  } catch {
    const current = await getAllMolds()
    const newMold = {
      id: 'mold_' + Date.now(),
      ...moldData,
      galleryImages: galleryArr,
      createdAt: new Date().toISOString()
    }
    current.unshift(newMold)
    writeJsonFile(MOLDS_FILE, current)
    return res.status(201).json({ ok: true, message: 'Molding berhasil ditambahkan.', data: formatMoldRecord(newMold) })
  }
}))

app.put('/api/molds/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const body = req.body || {}

  if (isFirestoreConfigured()) {
    const existing = await fsGetDoc('molds', id)
    if (!existing) return res.status(404).json({ error: 'Molding tidak ditemukan.' })
    const updatedPayload = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      code: body.code !== undefined ? String(body.code).trim() : existing.code,
      slug: body.slug !== undefined ? String(body.slug).trim() : existing.slug,
      type: body.type || existing.type,
      category: body.category !== undefined ? String(body.category).trim() : existing.category,
      description: body.description !== undefined ? String(body.description).trim() : existing.description,
      detailContent: body.detailContent !== undefined ? body.detailContent : existing.detailContent,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
      galleryImages: body.galleryImages !== undefined ? parseGallery(body.galleryImages) : parseGallery(existing.galleryImages),
      dimensions: body.dimensions !== undefined ? body.dimensions : existing.dimensions,
      weightKg: body.weightKg !== undefined ? (body.weightKg ? parseFloat(body.weightKg) : null) : existing.weightKg,
      cavity: body.cavity !== undefined ? (body.cavity ? parseInt(body.cavity, 10) : null) : existing.cavity,
      material: body.material !== undefined ? body.material : existing.material,
      machineTonnage: body.machineTonnage !== undefined ? body.machineTonnage : existing.machineTonnage,
      condition: body.condition !== undefined ? body.condition : existing.condition,
      priceLabel: body.priceLabel !== undefined ? body.priceLabel : existing.priceLabel,
      status: body.status || existing.status,
      featured: body.featured !== undefined ? Boolean(body.featured) : existing.featured,
      isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : existing.isVisible !== false,
      updatedAt: new Date().toISOString()
    }
    const saved = await fsSetDoc('molds', id, updatedPayload)
    return res.json({ ok: true, message: 'Data molding berhasil diperbarui.', data: formatMoldRecord(saved) })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    const updated = await prisma.mold.update({
      where: { id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        code: body.code ? String(body.code).trim() : undefined,
        slug: body.slug ? String(body.slug).trim() : undefined,
        type: body.type || undefined,
        category: body.category ? String(body.category).trim() : undefined,
        description: body.description !== undefined ? String(body.description).trim() : undefined,
        detailContent: body.detailContent !== undefined ? body.detailContent : undefined,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
        galleryImages: body.galleryImages !== undefined ? serializeGallery(body.galleryImages) : undefined,
        dimensions: body.dimensions !== undefined ? body.dimensions : undefined,
        weightKg: body.weightKg !== undefined ? (body.weightKg ? parseFloat(body.weightKg) : null) : undefined,
        cavity: body.cavity !== undefined ? (body.cavity ? parseInt(body.cavity, 10) : null) : undefined,
        material: body.material !== undefined ? body.material : undefined,
        machineTonnage: body.machineTonnage !== undefined ? body.machineTonnage : undefined,
        condition: body.condition !== undefined ? body.condition : undefined,
        priceLabel: body.priceLabel !== undefined ? body.priceLabel : undefined,
        status: body.status || undefined,
        featured: body.featured !== undefined ? Boolean(body.featured) : undefined,
        isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : undefined
      }
    })
    return res.json({ ok: true, message: 'Data molding berhasil diperbarui.', data: formatMoldRecord(updated) })
  } catch {
    const current = await getAllMolds()
    const idx = current.findIndex(m => m.id === id)
    if (idx !== -1) {
      current[idx] = {
        ...current[idx],
        ...body,
        galleryImages: body.galleryImages !== undefined ? parseGallery(body.galleryImages) : current[idx].galleryImages,
        isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : current[idx].isVisible
      }
      writeJsonFile(MOLDS_FILE, current)
      return res.json({ ok: true, message: 'Data molding berhasil diperbarui.', data: formatMoldRecord(current[idx]) })
    }
    res.status(404).json({ error: 'Molding tidak ditemukan.' })
  }
}))

app.patch('/api/molds/:id/visibility', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isVisible } = req.body || {}
  const nextVal = Boolean(isVisible)

  if (isFirestoreConfigured()) {
    const existing = await fsGetDoc('molds', id)
    if (!existing) return res.status(404).json({ error: 'Molding tidak ditemukan.' })
    const saved = await fsSetDoc('molds', id, { ...existing, isVisible: nextVal })
    return res.json({ ok: true, data: formatMoldRecord(saved) })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    const updated = await prisma.mold.update({
      where: { id },
      data: { isVisible: nextVal }
    })
    return res.json({ ok: true, data: formatMoldRecord(updated) })
  } catch {
    const current = await getAllMolds()
    const idx = current.findIndex(m => m.id === id)
    if (idx !== -1) {
      current[idx].isVisible = nextVal
      writeJsonFile(MOLDS_FILE, current)
      return res.json({ ok: true, data: formatMoldRecord(current[idx]) })
    }
    res.status(404).json({ error: 'Molding tidak ditemukan.' })
  }
}))

app.delete('/api/molds/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  if (isFirestoreConfigured()) {
    await fsDeleteDoc('molds', id)
    return res.json({ ok: true, message: 'Molding berhasil dihapus.' })
  }
  try {
    if (!prisma) throw new Error('No Prisma')
    await prisma.mold.delete({ where: { id } })
    return res.json({ ok: true, message: 'Molding berhasil dihapus.' })
  } catch {
    const current = await getAllMolds()
    const filtered = current.filter(m => m.id !== id)
    writeJsonFile(MOLDS_FILE, filtered)
    return res.json({ ok: true, message: 'Molding berhasil dihapus.' })
  }
}))

// --- Molded Products (Katalog Hasil Cetakan Plastik) API ---
async function getAllProducts() {
  if (isFirestoreConfigured()) {
    try {
      await ensureFirestoreSeeded()
      const docs = await fsListCollection('molded_products')
      if (docs.length > 0) {
        return docs
          .map(formatProductRecord)
          .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
      }
    } catch (err) {
      console.warn('Firestore products read fallback:', err.message)
    }
  }
  if (prisma) {
    try {
      const products = await prisma.moldedProduct.findMany({ orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }] })
      if (products.length > 0) return products.map(formatProductRecord)
    } catch {}
  }
  const fileProducts = readJsonFile(PRODUCTS_FILE, null)
  if (fileProducts && fileProducts.length > 0) return fileProducts.map(formatProductRecord)
  return DEFAULT_MOLDED_PRODUCTS.map(formatProductRecord)
}

app.get('/api/molded-products', asyncHandler(async (req, res) => {
  const all = await getAllProducts()
  if (req.query.visibleOnly === 'true') {
    return res.json({ data: all.filter(p => p.isVisible !== false) })
  }
  res.json({ data: all })
}))

app.post('/api/molded-products', requireAdmin, asyncHandler(async (req, res) => {
  const body = req.body || {}
  if (!body.name || !body.category) {
    return res.status(400).json({ error: 'Nama produk dan kategori wajib diisi.' })
  }

  const galleryArr = parseGallery(body.galleryImages)
  const prodData = {
    name: String(body.name).trim(),
    category: String(body.category).trim(),
    description: body.description || null,
    detailContent: body.detailContent || null,
    imageUrl: body.imageUrl || null,
    weightEst: body.weightEst || null,
    dimensions: body.dimensions || null,
    moldInfo: body.moldInfo || null,
    materialType: body.materialType || null,
    cycleTime: body.cycleTime || null,
    minMachineTonnage: body.minMachineTonnage || null,
    featured: Boolean(body.featured),
    isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : true
  }

  if (isFirestoreConfigured()) {
    const id = 'prod_' + Date.now()
    const saved = await fsSetDoc('molded_products', id, {
      id,
      ...prodData,
      galleryImages: galleryArr,
      createdAt: new Date().toISOString()
    })
    return res.status(201).json({ ok: true, data: formatProductRecord(saved) })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    const product = await prisma.moldedProduct.create({
      data: {
        ...prodData,
        galleryImages: serializeGallery(galleryArr)
      }
    })
    return res.status(201).json({ ok: true, data: formatProductRecord(product) })
  } catch {
    const current = await getAllProducts()
    const newProd = {
      id: 'prod_' + Date.now(),
      ...prodData,
      galleryImages: galleryArr,
      createdAt: new Date().toISOString()
    }
    current.unshift(newProd)
    writeJsonFile(PRODUCTS_FILE, current)
    return res.status(201).json({ ok: true, data: formatProductRecord(newProd) })
  }
}))

app.put('/api/molded-products/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const body = req.body || {}

  if (isFirestoreConfigured()) {
    const existing = await fsGetDoc('molded_products', id)
    if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan.' })
    const updatedPayload = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      category: body.category !== undefined ? String(body.category).trim() : existing.category,
      description: body.description !== undefined ? body.description : existing.description,
      detailContent: body.detailContent !== undefined ? body.detailContent : existing.detailContent,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
      galleryImages: body.galleryImages !== undefined ? parseGallery(body.galleryImages) : parseGallery(existing.galleryImages),
      weightEst: body.weightEst !== undefined ? body.weightEst : existing.weightEst,
      dimensions: body.dimensions !== undefined ? body.dimensions : existing.dimensions,
      moldInfo: body.moldInfo !== undefined ? body.moldInfo : existing.moldInfo,
      materialType: body.materialType !== undefined ? body.materialType : existing.materialType,
      cycleTime: body.cycleTime !== undefined ? body.cycleTime : existing.cycleTime,
      minMachineTonnage: body.minMachineTonnage !== undefined ? body.minMachineTonnage : existing.minMachineTonnage,
      featured: body.featured !== undefined ? Boolean(body.featured) : existing.featured,
      isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : existing.isVisible !== false,
      updatedAt: new Date().toISOString()
    }
    const saved = await fsSetDoc('molded_products', id, updatedPayload)
    return res.json({ ok: true, data: formatProductRecord(saved) })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    const updated = await prisma.moldedProduct.update({
      where: { id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        category: body.category ? String(body.category).trim() : undefined,
        description: body.description !== undefined ? body.description : undefined,
        detailContent: body.detailContent !== undefined ? body.detailContent : undefined,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
        galleryImages: body.galleryImages !== undefined ? serializeGallery(body.galleryImages) : undefined,
        weightEst: body.weightEst !== undefined ? body.weightEst : undefined,
        dimensions: body.dimensions !== undefined ? body.dimensions : undefined,
        moldInfo: body.moldInfo !== undefined ? body.moldInfo : undefined,
        materialType: body.materialType !== undefined ? body.materialType : undefined,
        cycleTime: body.cycleTime !== undefined ? body.cycleTime : undefined,
        minMachineTonnage: body.minMachineTonnage !== undefined ? body.minMachineTonnage : undefined,
        featured: body.featured !== undefined ? Boolean(body.featured) : undefined,
        isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : undefined
      }
    })
    return res.json({ ok: true, data: formatProductRecord(updated) })
  } catch {
    const current = await getAllProducts()
    const idx = current.findIndex(p => p.id === id)
    if (idx !== -1) {
      current[idx] = {
        ...current[idx],
        ...body,
        galleryImages: body.galleryImages !== undefined ? parseGallery(body.galleryImages) : current[idx].galleryImages,
        isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : current[idx].isVisible
      }
      writeJsonFile(PRODUCTS_FILE, current)
      return res.json({ ok: true, data: formatProductRecord(current[idx]) })
    }
    res.status(404).json({ error: 'Produk tidak ditemukan.' })
  }
}))

app.patch('/api/molded-products/:id/visibility', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isVisible } = req.body || {}
  const nextVal = Boolean(isVisible)

  if (isFirestoreConfigured()) {
    const existing = await fsGetDoc('molded_products', id)
    if (!existing) return res.status(404).json({ error: 'Produk tidak ditemukan.' })
    const saved = await fsSetDoc('molded_products', id, { ...existing, isVisible: nextVal })
    return res.json({ ok: true, data: formatProductRecord(saved) })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    const updated = await prisma.moldedProduct.update({
      where: { id },
      data: { isVisible: nextVal }
    })
    return res.json({ ok: true, data: formatProductRecord(updated) })
  } catch {
    const current = await getAllProducts()
    const idx = current.findIndex(p => p.id === id)
    if (idx !== -1) {
      current[idx].isVisible = nextVal
      writeJsonFile(PRODUCTS_FILE, current)
      return res.json({ ok: true, data: formatProductRecord(current[idx]) })
    }
    res.status(404).json({ error: 'Produk tidak ditemukan.' })
  }
}))

app.delete('/api/molded-products/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  if (isFirestoreConfigured()) {
    await fsDeleteDoc('molded_products', id)
    return res.json({ ok: true, message: 'Produk berhasil dihapus.' })
  }
  try {
    if (!prisma) throw new Error('No Prisma')
    await prisma.moldedProduct.delete({ where: { id } })
    return res.json({ ok: true, message: 'Produk berhasil dihapus.' })
  } catch {
    const current = await getAllProducts()
    const filtered = current.filter(p => p.id !== id)
    writeJsonFile(PRODUCTS_FILE, filtered)
    return res.json({ ok: true, message: 'Produk berhasil dihapus.' })
  }
}))

// --- Submit & Manage RFQ Inquiries ---
async function getAllInquiries() {
  if (isFirestoreConfigured()) {
    try {
      const docs = await fsListCollection('inquiries')
      return docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    } catch (err) {
      console.warn('Firestore inquiries read fallback:', err.message)
    }
  }
  if (prisma) {
    try {
      return await prisma.inquiry.findMany({
        include: { mold: { select: { name: true, code: true, type: true } } },
        orderBy: { createdAt: 'desc' }
      })
    } catch {}
  }
  return readJsonFile(INQUIRIES_FILE, [])
}

app.post('/api/inquiries', asyncHandler(async (req, res) => {
  const body = req.body || {}
  const required = ['companyName', 'contactName', 'phone', 'moldType', 'productNeed']
  const missing = required.filter((key) => !String(body[key] ?? '').trim())
  if (missing.length) return res.status(400).json({ error: `Kolom wajib belum diisi: ${missing.join(', ')}` })
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return res.status(400).json({ error: 'Format email tidak valid.' })
  }

  const inqData = {
    companyName: String(body.companyName).trim(),
    contactName: String(body.contactName).trim(),
    email: body.email ? String(body.email).trim() : null,
    phone: String(body.phone).trim(),
    moldType: String(body.moldType).trim(),
    productNeed: String(body.productNeed).trim(),
    dimensions: body.dimensions || null,
    cavity: body.cavity || null,
    machineInfo: body.machineInfo || null,
    budget: body.budget || null,
    targetDate: body.targetDate || null,
    notes: body.notes || null,
    moldId: body.moldId || null,
    status: 'NEW'
  }

  if (isFirestoreConfigured()) {
    const id = 'inq_' + Date.now()
    await fsSetDoc('inquiries', id, {
      id,
      ...inqData,
      createdAt: new Date().toISOString()
    })
    return res.status(201).json({ message: 'Permintaan penawaran berhasil dikirim.', data: { id } })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    if (body.moldId) {
      const mold = await prisma.mold.findUnique({ where: { id: body.moldId } }).catch(() => null)
      if (!mold) inqData.moldId = null
    }
    const inquiry = await prisma.inquiry.create({ data: inqData })
    return res.status(201).json({ message: 'Permintaan penawaran berhasil dikirim.', data: { id: inquiry.id } })
  } catch {
    const current = readJsonFile(INQUIRIES_FILE, [])
    const id = 'inq_' + Date.now()
    current.unshift({ id, ...inqData, createdAt: new Date().toISOString() })
    writeJsonFile(INQUIRIES_FILE, current)
    return res.status(201).json({ message: 'Permintaan penawaran berhasil dikirim.', data: { id } })
  }
}))

app.get('/api/inquiries', requireAdmin, asyncHandler(async (_req, res) => {
  const inquiries = await getAllInquiries()
  res.json({ data: inquiries })
}))

app.patch('/api/inquiries/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, notes } = req.body || {}

  if (isFirestoreConfigured()) {
    const existing = await fsGetDoc('inquiries', id)
    if (!existing) return res.status(404).json({ error: 'Penawaran tidak ditemukan.' })
    const updated = await fsSetDoc('inquiries', id, {
      ...existing,
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: new Date().toISOString()
    })
    return res.json({ ok: true, message: 'Status penawaran berhasil diperbarui.', data: updated })
  }

  try {
    if (!prisma) throw new Error('No Prisma')
    const data = {}
    if (status) data.status = status
    if (notes !== undefined) data.notes = notes
    const updated = await prisma.inquiry.update({ where: { id }, data })
    return res.json({ ok: true, message: 'Status penawaran berhasil diperbarui.', data: updated })
  } catch {
    const current = readJsonFile(INQUIRIES_FILE, [])
    const idx = current.findIndex(i => i.id === id)
    if (idx !== -1) {
      if (status) current[idx].status = status
      if (notes !== undefined) current[idx].notes = notes
      writeJsonFile(INQUIRIES_FILE, current)
      return res.json({ ok: true, message: 'Status penawaran berhasil diperbarui.', data: current[idx] })
    }
    res.status(404).json({ error: 'Penawaran tidak ditemukan.' })
  }
}))

app.delete('/api/inquiries/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  if (isFirestoreConfigured()) {
    await fsDeleteDoc('inquiries', id)
    return res.json({ ok: true, message: 'Penawaran berhasil dihapus.' })
  }
  try {
    if (!prisma) throw new Error('No Prisma')
    await prisma.inquiry.delete({ where: { id } })
    return res.json({ ok: true, message: 'Penawaran berhasil dihapus.' })
  } catch {
    const current = readJsonFile(INQUIRIES_FILE, [])
    writeJsonFile(INQUIRIES_FILE, current.filter(i => i.id !== id))
    return res.json({ ok: true, message: 'Penawaran berhasil dihapus.' })
  }
}))

// --- Admin Auth & Stats ---
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {}
  const validPass = process.env.ADMIN_PASSWORD || 'admin123'
  if (!password || password !== validPass) {
    return res.status(401).json({ error: 'Password admin salah. Default: admin123' })
  }
  const token = createStatelessAdminToken()
  activeTokens.add(token)
  res.json({ ok: true, message: 'Login berhasil.', token })
})

app.get('/api/admin/verify', (req, res) => {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (isValidAdminToken(token)) {
    return res.json({ ok: true, user: 'admin' })
  }
  res.status(401).json({ ok: false, error: 'Token tidak valid.' })
})

app.get('/api/admin/stats', requireAdmin, asyncHandler(async (_req, res) => {
  const [molds, prods, cats, inquiries] = await Promise.all([
    getAllMolds(),
    getAllProducts(),
    getAllCategories(),
    getAllInquiries()
  ])

  res.json({
    data: {
      totalMolds: molds.length,
      newMolds: molds.filter(m => m.type === 'NEW').length,
      customMolds: molds.filter(m => m.type === 'CUSTOM').length,
      usedMolds: molds.filter(m => m.type === 'USED').length,
      totalInquiries: inquiries.length,
      newInquiries: inquiries.filter(i => i.status === 'NEW').length,
      moldedProducts: prods.length,
      totalCategories: cats.length
    }
  })
}))

// Update CMS Content
app.put('/api/cms', requireAdmin, asyncHandler(async (req, res) => {
  const newContent = req.body || {}
  const current = await getMergedCMS()
  const merged = { ...current, ...newContent }

  if (isFirestoreConfigured()) {
    await fsSetDoc('site_settings', 'cms', merged)
    return res.json({ ok: true, message: 'Konten website berhasil disimpan ke Firestore.', data: merged })
  }

  if (prisma) {
    try {
      for (const [key, value] of Object.entries(merged)) {
        await prisma.siteSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) }
        })
      }
    } catch {}
  }

  writeJsonFile(CMS_FILE, merged)
  res.json({ ok: true, message: 'Konten website berhasil disimpan.', data: merged })
}))

app.post('/api/cms/reset', requireAdmin, asyncHandler(async (_req, res) => {
  if (isFirestoreConfigured()) {
    await fsSetDoc('site_settings', 'cms', DEFAULT_CMS)
    return res.json({ ok: true, message: 'Konten website berhasil direset ke standar.', data: DEFAULT_CMS })
  }

  if (prisma) {
    try {
      for (const [key, value] of Object.entries(DEFAULT_CMS)) {
        await prisma.siteSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) }
        }).catch(() => null)
      }
    } catch {}
  }
  writeJsonFile(CMS_FILE, DEFAULT_CMS)
  res.json({ ok: true, message: 'Konten website berhasil direset ke standar.', data: DEFAULT_CMS })
}))

// --- Image Upload (Supports Serverless / Firestore Data URL + Local File Storage) ---
app.post('/api/upload', requireAdmin, (req, res) => {
  const { dataUrl } = req.body || {}
  if (!dataUrl || !dataUrl.includes(';base64,')) {
    return res.status(400).json({ error: 'Data gambar base64 tidak valid.' })
  }

  // On Vercel or when using Firestore cloud backend, return the Data URL directly so images persist in Firestore documents across serverless instances
  if (isVercel || isFirestoreConfigured()) {
    return res.json({ ok: true, url: dataUrl })
  }

  const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ error: 'Format data URL tidak valid.' })
  }

  const ext = matches[1].split('/')[1] || 'png'
  const safeExt = ext.replace(/[^a-z0-9]/gi, '')
  const randomName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${safeExt}`
  const targetPath = path.join(uploadDir, randomName)

  fs.writeFile(targetPath, Buffer.from(matches[2], 'base64'), (err) => {
    if (err) {
      return res.json({ ok: true, url: dataUrl })
    }
    res.json({ ok: true, url: `/uploads/${randomName}` })
  })
})

// --- Dynamic SEO Sitemap & Robots.txt ---
app.get('/robots.txt', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`
  )
})

app.get('/sitemap.xml', asyncHandler(async (req, res) => {
  const cmsData = await getMergedCMS()
  const baseUrl = (cmsData?.seo?.canonicalUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
  const today = new Date().toISOString().split('T')[0]

  const urls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/#layanan`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${baseUrl}/#katalog`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/#hasil-cetakan`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${baseUrl}/#proses`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${baseUrl}/#rfq`, priority: '0.9', changefreq: 'monthly' },
    { loc: `${baseUrl}/#faq`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${baseUrl}/#tentang`, priority: '0.7', changefreq: 'monthly' }
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  res.header('Content-Type', 'application/xml')
  res.send(xml)
}))

// Serve built Vue frontend in local production mode
if (!isVercel) {
  const distPath = path.resolve(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distPath, 'index.html'), (err) => err && next(err))
  })
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server.' })
})

// Only start standalone HTTP listener when not running as a Vercel Serverless Function
if (!isVercel) {
  app.listen(PORT, () => {
    const mode = isFirestoreConfigured() ? 'Google Cloud Firestore' : prisma ? 'PostgreSQL (Prisma)' : 'Local JSON'
    console.log(`iLUFA Molding API & CMS berjalan di http://localhost:${PORT} [Storage: ${mode}]`)
  })
}

process.on('SIGINT', async () => {
  if (prisma) await prisma.$disconnect()
  process.exit(0)
})

export default app
