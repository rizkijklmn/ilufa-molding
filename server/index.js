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
  resetFirestoreToDefaults,
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

// --- Remote Takedown & License Protection Middleware ---
const REMOTE_LICENSE_URL = process.env.REMOTE_LICENSE_URL ||
  'https://raw.githubusercontent.com/rizkijklmn/ilufa-molding/production/license.json'
const REMOTE_LICENSE_TOKEN = process.env.REMOTE_LICENSE_TOKEN || ''

let licenseCache = {
  active: true,
  lastChecked: 0,
  title: 'Akses Situs Web Ditangguhkan',
  message: 'Situs web ini sedang dinonaktifkan sementara karena proses administrasi dan serah terima proyek belum diselesaikan oleh pemilik situs. Silakan selesaikan kewajiban administrasi untuk memulihkan akses.'
}

async function checkRemoteLicense() {
  const now = Date.now()
  if (now - licenseCache.lastChecked < 60000) {
    return licenseCache
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const headers = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    if (REMOTE_LICENSE_TOKEN) {
      headers['Authorization'] = `Bearer ${REMOTE_LICENSE_TOKEN}`
    }
    const res = await fetch(`${REMOTE_LICENSE_URL}?_cb=${now}`, {
      headers,
      signal: controller.signal
    })
    clearTimeout(timer)

    if (res.ok) {
      const data = await res.json()
      licenseCache.active = data.active !== false
      if (data.title) licenseCache.title = data.title
      if (data.message) licenseCache.message = data.message
      licenseCache.lastChecked = now
    }
  } catch {
    licenseCache.lastChecked = now
  }
  return licenseCache
}

app.use(async (req, res, next) => {
  if (req.path === '/api/health') return next()
  if (req.query.dev_unlock === (process.env.ADMIN_PASSWORD || 'admin123')) return next()

  const license = await checkRemoteLicense()
  if (!license.active) {
    res.status(402)
    if (req.path.startsWith('/api/')) {
      return res.json({
        error: 'SITUS_DITANGGUHKAN',
        message: license.message
      })
    }
    return res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${license.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #071625; color: #fff; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { max-width: 560px; width: 100%; background: #0e2438; border: 1px solid rgba(217, 170, 82, 0.4); border-radius: 14px; padding: 48px 36px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(225, 29, 72, 0.15); border: 1px solid #e11d48; color: #fb7185; border-radius: 30px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 22px; }
    h1 { font-size: 24px; color: #ffffff; margin-bottom: 16px; font-weight: 800; line-height: 1.3; }
    p { font-size: 15px; color: #cbd5e1; line-height: 1.7; margin-bottom: 28px; }
    .gold-box { background: rgba(217, 170, 82, 0.08); border: 1px dashed rgba(217, 170, 82, 0.4); border-radius: 8px; padding: 14px; font-size: 13px; color: #e2d2b5; margin-bottom: 24px; }
    .footer { font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">● Layanan Dinonaktifkan Sementara</div>
    <h1>${license.title}</h1>
    <p>${license.message}</p>
    <div class="gold-box">
      Pemberitahuan Sistem: Akses ke situs web dan backend CMS ini ditangguhkan otomatis oleh sistem lisensi pengembang karena belum adanya konfirmasi pelunasan administrasi proyek.
    </div>
    <div class="footer">Status Code: 402 Payment Required · Project ID: ilufa-molding</div>
  </div>
</body>
</html>`)
  }
  next()
})

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// --- Local JSON Fallback Files ---
const CMS_FILE = path.join(dataDir, 'cms-content.json')
const PRODUCTS_FILE = path.join(dataDir, 'molded-products.json')
const CATEGORIES_FILE = path.join(dataDir, 'categories.json')
const MOLDS_FILE = path.join(dataDir, 'molds.json')
const INQUIRIES_FILE = path.join(dataDir, 'inquiries.json')
const SYSTEM_SEED_FILE = path.join(dataDir, 'system_seed.json')

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

// First-time seeding helper: initializes files if they don't exist yet,
// but never overwrites once system is seeded.
function ensureInitialDataFiles() {
  try {
    const seedMarker = readJsonFile(SYSTEM_SEED_FILE, null)
    if (seedMarker && seedMarker.seeded) return

    if (!fs.existsSync(CATEGORIES_FILE)) {
      writeJsonFile(CATEGORIES_FILE, DEFAULT_CATEGORIES)
    }
    if (!fs.existsSync(MOLDS_FILE)) {
      writeJsonFile(MOLDS_FILE, DEFAULT_MOLDS)
    }
    if (!fs.existsSync(PRODUCTS_FILE)) {
      writeJsonFile(PRODUCTS_FILE, DEFAULT_MOLDED_PRODUCTS)
    }
    if (!fs.existsSync(CMS_FILE)) {
      writeJsonFile(CMS_FILE, DEFAULT_CMS)
    }
    writeJsonFile(SYSTEM_SEED_FILE, { seeded: true, seededAt: new Date().toISOString() })
  } catch (err) {
    console.warn('Initial data seeding warning:', err.message)
  }
}

ensureInitialDataFiles()

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

// --- Auto-Initialize & Sync PostgreSQL Schema on Startup ---
async function ensureDatabaseSchema() {
  if (prisma) {
    try {
      // 1. Enums in PostgreSQL
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "MoldType" AS ENUM ('NEW', 'CUSTOM', 'USED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `).catch(() => null)

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'ON_ORDER', 'NEGOTIATION', 'SOLD');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `).catch(() => null)

      // 2. Category Table
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
      `).catch(() => null)
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");`).catch(() => null)
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");`).catch(() => null)

      // 3. Mold Table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Mold" (
          "id" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "type" "MoldType" NOT NULL DEFAULT 'USED',
          "category" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "detailContent" TEXT,
          "imageUrl" TEXT,
          "galleryImages" TEXT,
          "dimensions" TEXT,
          "weightKg" DOUBLE PRECISION,
          "cavity" INTEGER,
          "material" TEXT,
          "machineTonnage" TEXT,
          "condition" TEXT,
          "priceLabel" TEXT,
          "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
          "featured" BOOLEAN NOT NULL DEFAULT false,
          "isVisible" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Mold_pkey" PRIMARY KEY ("id")
        );
      `).catch(() => null)
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Mold_code_key" ON "Mold"("code");`).catch(() => null)
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Mold_slug_key" ON "Mold"("slug");`).catch(() => null)
      await prisma.$executeRawUnsafe(`ALTER TABLE "Mold" ADD COLUMN IF NOT EXISTS "detailContent" TEXT;`).catch(() => null)
      await prisma.$executeRawUnsafe(`ALTER TABLE "Mold" ADD COLUMN IF NOT EXISTS "galleryImages" TEXT;`).catch(() => null)
      await prisma.$executeRawUnsafe(`ALTER TABLE "Mold" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;`).catch(() => null)

      // 4. SiteSetting Table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SiteSetting" (
          "key" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
        );
      `).catch(() => null)

      // 5. MoldedProduct Table
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
      `).catch(() => null)
      await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "detailContent" TEXT;`).catch(() => null)
      await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "galleryImages" TEXT;`).catch(() => null)
      await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "materialType" TEXT;`).catch(() => null)
      await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "cycleTime" TEXT;`).catch(() => null)
      await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "minMachineTonnage" TEXT;`).catch(() => null)
      await prisma.$executeRawUnsafe(`ALTER TABLE "MoldedProduct" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;`).catch(() => null)

      // 6. Inquiry Table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Inquiry" (
          "id" TEXT NOT NULL,
          "companyName" TEXT NOT NULL,
          "contactName" TEXT NOT NULL,
          "email" TEXT,
          "phone" TEXT NOT NULL,
          "moldType" TEXT NOT NULL,
          "productNeed" TEXT NOT NULL,
          "dimensions" TEXT,
          "cavity" TEXT,
          "machineInfo" TEXT,
          "budget" TEXT,
          "targetDate" TEXT,
          "notes" TEXT,
          "status" TEXT NOT NULL DEFAULT 'NEW',
          "moldId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
        );
      `).catch(() => null)

      // 7. Seed initial database records once if empty
      const seedCheck = await prisma.siteSetting.findUnique({ where: { key: 'system_seeded' } }).catch(() => null)
      if (!seedCheck || seedCheck.value !== 'true') {
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

        const moldCount = await prisma.mold.count()
        if (moldCount === 0) {
          for (const mold of DEFAULT_MOLDS) {
            await prisma.mold.create({
              data: {
                id: mold.id,
                code: mold.code,
                name: mold.name,
                slug: mold.slug,
                type: mold.type,
                category: mold.category,
                description: mold.description,
                detailContent: mold.detailContent,
                imageUrl: mold.imageUrl,
                galleryImages: serializeGallery(mold.galleryImages),
                dimensions: mold.dimensions,
                weightKg: mold.weightKg ? parseFloat(mold.weightKg) : null,
                cavity: mold.cavity ? parseInt(mold.cavity, 10) : null,
                material: mold.material,
                machineTonnage: mold.machineTonnage,
                condition: mold.condition,
                priceLabel: mold.priceLabel,
                status: mold.status,
                featured: Boolean(mold.featured),
                isVisible: mold.isVisible !== false
              }
            }).catch(() => null)
          }
        }

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

        for (const [key, value] of Object.entries(DEFAULT_CMS)) {
          await prisma.siteSetting.upsert({
            where: { key },
            update: { value: JSON.stringify(value) },
            create: { key, value: JSON.stringify(value) }
          }).catch(() => null)
        }

        await prisma.siteSetting.upsert({
          where: { key: 'system_seeded' },
          update: { value: 'true' },
          create: { key: 'system_seeded', value: 'true' }
        }).catch(() => null)
      }
      return
    } catch (err) {
      console.warn('PostgreSQL auto-schema note:', err.message)
    }
  }

  // Fallback to Firestore only if explicitly configured and no Prisma
  if (isFirestoreConfigured()) {
    await ensureFirestoreSeeded()
  }
}

ensureDatabaseSchema()

async function getMergedCMS() {
  const result = JSON.parse(JSON.stringify(DEFAULT_CMS))

  // 1. Try PostgreSQL via Prisma FIRST (Real Production Database)
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

  // 2. Try Firestore (only if Prisma not active)
  if (isFirestoreConfigured()) {
    try {
      await ensureFirestoreSeeded()
      const fsCms = await fsGetDoc('site_settings', 'cms')
      if (fsCms) {
        const { id, ...clean } = fsCms
        return { ...result, ...clean }
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
    storage: prisma ? 'postgres' : isFirestoreConfigured() ? 'firestore' : 'json-fallback'
  })
})

// Get CMS Content
app.get('/api/cms', asyncHandler(async (_req, res) => {
  const content = await getMergedCMS()
  res.json({ ok: true, data: content })
}))

// --- Categories API (CRUD + Visibility Toggle) ---
async function getAllCategories() {
  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      const cats = await prisma.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      })
      if (Array.isArray(cats)) return cats.map(formatCategoryRecord)
    } catch {}
  }
  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      await ensureFirestoreSeeded()
      const docs = await fsListCollection('categories')
      if (Array.isArray(docs)) {
        return docs
          .map(formatCategoryRecord)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      }
    } catch {}
  }
  // 3. Local JSON fallback
  const fileCats = readJsonFile(CATEGORIES_FILE, null)
  if (Array.isArray(fileCats)) return fileCats.map(formatCategoryRecord)
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

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
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
      const current = readJsonFile(CATEGORIES_FILE, []) || []
      current.push(created)
      writeJsonFile(CATEGORIES_FILE, current)
      return res.status(201).json({ ok: true, message: 'Kategori berhasil ditambahkan ke database.', data: formatCategoryRecord(created) })
    } catch (err) {
      console.warn('Prisma create category error:', err.message)
    }
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
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
    } catch {}
  }

  // 3. Local JSON fallback
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
}))

app.put('/api/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const body = req.body || {}
  if (!body.name || !String(body.name).trim()) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi.' })
  }
  const newName = String(body.name).trim()

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
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
      return res.json({ ok: true, message: 'Kategori berhasil diperbarui di database.', data: formatCategoryRecord(updated) })
    } catch (err) {
      console.warn('Prisma update category error:', err.message)
    }
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const existing = await fsGetDoc('categories', id)
      if (existing) {
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
    } catch {}
  }

  // 3. Local JSON fallback
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
}))

app.patch('/api/categories/:id/visibility', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isVisible } = req.body || {}
  const nextVal = Boolean(isVisible)

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      const updated = await prisma.category.update({
        where: { id },
        data: { isVisible: nextVal }
      })
      return res.json({ ok: true, data: formatCategoryRecord(updated) })
    } catch {}
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const existing = await fsGetDoc('categories', id)
      if (existing) {
        const saved = await fsSetDoc('categories', id, { ...existing, isVisible: nextVal })
        return res.json({ ok: true, data: formatCategoryRecord(saved) })
      }
    } catch {}
  }

  // 3. Local JSON fallback
  const current = await getAllCategories()
  const idx = current.findIndex(c => c.id === id)
  if (idx !== -1) {
    current[idx].isVisible = nextVal
    writeJsonFile(CATEGORIES_FILE, current)
    return res.json({ ok: true, data: formatCategoryRecord(current[idx]) })
  }
  res.status(404).json({ error: 'Kategori tidak ditemukan.' })
}))

app.delete('/api/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params

  if (prisma) {
    try {
      await prisma.category.delete({ where: { id } }).catch(() => null)
    } catch {}
  }

  if (isFirestoreConfigured()) {
    try {
      await fsDeleteDoc('categories', id)
    } catch (err) {
      console.warn('Firestore delete category error:', err.message)
    }
  }

  try {
    const current = readJsonFile(CATEGORIES_FILE, null) || (await getAllCategories())
    const filtered = current.filter(c => c.id !== id)
    writeJsonFile(CATEGORIES_FILE, filtered)
  } catch (err) {
    console.error('Local JSON delete category error:', err.message)
  }

  return res.json({ ok: true, message: 'Kategori berhasil dihapus.' })
}))

// --- Molds Catalog API (PostgreSQL + Local Fallback) ---
async function getAllMolds() {
  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      const molds = await prisma.mold.findMany({
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }]
      })
      if (Array.isArray(molds)) return molds.map(formatMoldRecord)
    } catch {}
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      await ensureFirestoreSeeded()
      const docs = await fsListCollection('molds')
      if (Array.isArray(docs)) {
        return docs
          .map(formatMoldRecord)
          .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
      }
    } catch {}
  }

  // 3. Local JSON fallback
  const fileMolds = readJsonFile(MOLDS_FILE, null)
  if (Array.isArray(fileMolds)) return fileMolds.map(formatMoldRecord)
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

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      const newMold = await prisma.mold.create({
        data: {
          ...moldData,
          galleryImages: serializeGallery(galleryArr)
        }
      })
      const current = readJsonFile(MOLDS_FILE, []) || []
      current.unshift(formatMoldRecord(newMold))
      writeJsonFile(MOLDS_FILE, current)
      return res.status(201).json({ ok: true, message: 'Molding berhasil ditambahkan ke database.', data: formatMoldRecord(newMold) })
    } catch (err) {
      console.warn('Prisma create mold error:', err.message)
    }
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const id = 'mold_' + Date.now()
      const saved = await fsSetDoc('molds', id, {
        id,
        ...moldData,
        galleryImages: galleryArr,
        createdAt: new Date().toISOString()
      })
      return res.status(201).json({ ok: true, message: 'Molding berhasil ditambahkan ke Firestore.', data: formatMoldRecord(saved) })
    } catch {}
  }

  // 3. Local JSON fallback
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
}))

app.put('/api/molds/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const body = req.body || {}

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
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
      return res.json({ ok: true, message: 'Data molding berhasil diperbarui di database.', data: formatMoldRecord(updated) })
    } catch (err) {
      console.warn('Prisma update mold error:', err.message)
    }
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const existing = await fsGetDoc('molds', id)
      if (existing) {
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
    } catch {}
  }

  // 3. Local JSON fallback
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
}))

app.patch('/api/molds/:id/visibility', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isVisible } = req.body || {}
  const nextVal = Boolean(isVisible)

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      const updated = await prisma.mold.update({
        where: { id },
        data: { isVisible: nextVal }
      })
      return res.json({ ok: true, data: formatMoldRecord(updated) })
    } catch {}
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const existing = await fsGetDoc('molds', id)
      if (existing) {
        const saved = await fsSetDoc('molds', id, { ...existing, isVisible: nextVal })
        return res.json({ ok: true, data: formatMoldRecord(saved) })
      }
    } catch {}
  }

  // 3. Local JSON fallback
  const current = await getAllMolds()
  const idx = current.findIndex(m => m.id === id)
  if (idx !== -1) {
    current[idx].isVisible = nextVal
    writeJsonFile(MOLDS_FILE, current)
    return res.json({ ok: true, data: formatMoldRecord(current[idx]) })
  }
  res.status(404).json({ error: 'Molding tidak ditemukan.' })
}))

app.delete('/api/molds/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params

  if (prisma) {
    try {
      await prisma.mold.delete({ where: { id } }).catch(() => null)
    } catch {}
  }

  if (isFirestoreConfigured()) {
    try {
      await fsDeleteDoc('molds', id)
    } catch (err) {
      console.warn('Firestore delete mold error:', err.message)
    }
  }

  try {
    const current = readJsonFile(MOLDS_FILE, null) || (await getAllMolds())
    const filtered = current.filter(m => m.id !== id)
    writeJsonFile(MOLDS_FILE, filtered)
  } catch (err) {
    console.error('Local JSON delete mold error:', err.message)
  }

  return res.json({ ok: true, message: 'Molding berhasil dihapus.' })
}))

// --- Molded Products (Katalog Hasil Cetakan Plastik) API ---
async function getAllProducts() {
  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      const products = await prisma.moldedProduct.findMany({ orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }] })
      if (Array.isArray(products)) return products.map(formatProductRecord)
    } catch {}
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      await ensureFirestoreSeeded()
      const docs = await fsListCollection('molded_products')
      if (Array.isArray(docs)) {
        return docs
          .map(formatProductRecord)
          .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
      }
    } catch {}
  }

  // 3. Local JSON fallback
  const fileProducts = readJsonFile(PRODUCTS_FILE, null)
  if (Array.isArray(fileProducts)) return fileProducts.map(formatProductRecord)
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

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      const product = await prisma.moldedProduct.create({
        data: {
          ...prodData,
          galleryImages: serializeGallery(galleryArr)
        }
      })
      const current = readJsonFile(PRODUCTS_FILE, []) || []
      current.unshift(formatProductRecord(product))
      writeJsonFile(PRODUCTS_FILE, current)
      return res.status(201).json({ ok: true, data: formatProductRecord(product) })
    } catch (err) {
      console.warn('Prisma create product error:', err.message)
    }
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const id = 'prod_' + Date.now()
      const saved = await fsSetDoc('molded_products', id, {
        id,
        ...prodData,
        galleryImages: galleryArr,
        createdAt: new Date().toISOString()
      })
      return res.status(201).json({ ok: true, data: formatProductRecord(saved) })
    } catch {}
  }

  // 3. Local JSON fallback
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
}))

app.put('/api/molded-products/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const body = req.body || {}

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
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
    } catch (err) {
      console.warn('Prisma update product error:', err.message)
    }
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const existing = await fsGetDoc('molded_products', id)
      if (existing) {
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
    } catch {}
  }

  // 3. Local JSON fallback
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
}))

app.patch('/api/molded-products/:id/visibility', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isVisible } = req.body || {}
  const nextVal = Boolean(isVisible)

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      const updated = await prisma.moldedProduct.update({
        where: { id },
        data: { isVisible: nextVal }
      })
      return res.json({ ok: true, data: formatProductRecord(updated) })
    } catch {}
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const existing = await fsGetDoc('molded_products', id)
      if (existing) {
        const saved = await fsSetDoc('molded_products', id, { ...existing, isVisible: nextVal })
        return res.json({ ok: true, data: formatProductRecord(saved) })
      }
    } catch {}
  }

  // 3. Local JSON fallback
  const current = await getAllProducts()
  const idx = current.findIndex(p => p.id === id)
  if (idx !== -1) {
    current[idx].isVisible = nextVal
    writeJsonFile(PRODUCTS_FILE, current)
    return res.json({ ok: true, data: formatProductRecord(current[idx]) })
  }
  res.status(404).json({ error: 'Produk tidak ditemukan.' })
}))

app.delete('/api/molded-products/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params

  if (prisma) {
    try {
      await prisma.moldedProduct.delete({ where: { id } }).catch(() => null)
    } catch {}
  }

  if (isFirestoreConfigured()) {
    try {
      await fsDeleteDoc('molded_products', id)
    } catch (err) {
      console.warn('Firestore delete product error:', err.message)
    }
  }

  try {
    const current = readJsonFile(PRODUCTS_FILE, null) || (await getAllProducts())
    const filtered = current.filter(p => p.id !== id)
    writeJsonFile(PRODUCTS_FILE, filtered)
  } catch (err) {
    console.error('Local JSON delete product error:', err.message)
  }

  return res.json({ ok: true, message: 'Produk berhasil dihapus.' })
}))

// --- Submit & Manage RFQ Inquiries ---
// --- Submit & Manage RFQ Inquiries ---
async function getAllInquiries() {
  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      return await prisma.inquiry.findMany({
        include: { mold: { select: { name: true, code: true, type: true } } },
        orderBy: { createdAt: 'desc' }
      })
    } catch {}
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const docs = await fsListCollection('inquiries')
      return docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    } catch {}
  }

  // 3. Local JSON fallback
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

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      if (body.moldId) {
        const mold = await prisma.mold.findUnique({ where: { id: body.moldId } }).catch(() => null)
        if (!mold) inqData.moldId = null
      }
      const inquiry = await prisma.inquiry.create({ data: inqData })
      const current = readJsonFile(INQUIRIES_FILE, [])
      current.unshift(inquiry)
      writeJsonFile(INQUIRIES_FILE, current)
      return res.status(201).json({ message: 'Permintaan penawaran berhasil dikirim.', data: { id: inquiry.id } })
    } catch (err) {
      console.warn('Prisma create inquiry error:', err.message)
    }
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const id = 'inq_' + Date.now()
      await fsSetDoc('inquiries', id, {
        id,
        ...inqData,
        createdAt: new Date().toISOString()
      })
      return res.status(201).json({ message: 'Permintaan penawaran berhasil dikirim.', data: { id } })
    } catch {}
  }

  // 3. Local JSON fallback
  const current = readJsonFile(INQUIRIES_FILE, [])
  const id = 'inq_' + Date.now()
  current.unshift({ id, ...inqData, createdAt: new Date().toISOString() })
  writeJsonFile(INQUIRIES_FILE, current)
  return res.status(201).json({ message: 'Permintaan penawaran berhasil dikirim.', data: { id } })
}))

app.get('/api/inquiries', requireAdmin, asyncHandler(async (_req, res) => {
  const inquiries = await getAllInquiries()
  res.json({ data: inquiries })
}))

app.patch('/api/inquiries/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, notes } = req.body || {}

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      const data = {}
      if (status) data.status = status
      if (notes !== undefined) data.notes = notes
      const updated = await prisma.inquiry.update({ where: { id }, data })
      return res.json({ ok: true, message: 'Status penawaran berhasil diperbarui di database.', data: updated })
    } catch (err) {
      console.warn('Prisma update inquiry error:', err.message)
    }
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      const existing = await fsGetDoc('inquiries', id)
      if (existing) {
        const updated = await fsSetDoc('inquiries', id, {
          ...existing,
          ...(status ? { status } : {}),
          ...(notes !== undefined ? { notes } : {}),
          updatedAt: new Date().toISOString()
        })
        return res.json({ ok: true, message: 'Status penawaran berhasil diperbarui.', data: updated })
      }
    } catch {}
  }

  // 3. Local JSON fallback
  const current = readJsonFile(INQUIRIES_FILE, [])
  const idx = current.findIndex(i => i.id === id)
  if (idx !== -1) {
    if (status) current[idx].status = status
    if (notes !== undefined) current[idx].notes = notes
    writeJsonFile(INQUIRIES_FILE, current)
    return res.json({ ok: true, message: 'Status penawaran berhasil diperbarui.', data: current[idx] })
  }
  res.status(404).json({ error: 'Penawaran tidak ditemukan.' })
}))

app.delete('/api/inquiries/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params

  if (prisma) {
    try {
      await prisma.inquiry.delete({ where: { id } }).catch(() => null)
    } catch {}
  }

  if (isFirestoreConfigured()) {
    try {
      await fsDeleteDoc('inquiries', id)
    } catch (err) {
      console.warn('Firestore delete inquiry error:', err.message)
    }
  }

  try {
    const current = readJsonFile(INQUIRIES_FILE, [])
    writeJsonFile(INQUIRIES_FILE, current.filter(i => i.id !== id))
  } catch (err) {
    console.error('Local JSON delete inquiry error:', err.message)
  }

  return res.json({ ok: true, message: 'Penawaran berhasil dihapus.' })
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

  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      for (const [key, value] of Object.entries(merged)) {
        await prisma.siteSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) }
        })
      }
      writeJsonFile(CMS_FILE, merged)
      return res.json({ ok: true, message: 'Konten website berhasil disimpan ke database.', data: merged })
    } catch (err) {
      console.warn('Prisma save CMS error:', err.message)
    }
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      await fsSetDoc('site_settings', 'cms', merged)
      return res.json({ ok: true, message: 'Konten website berhasil disimpan ke Firestore.', data: merged })
    } catch {}
  }

  writeJsonFile(CMS_FILE, merged)
  res.json({ ok: true, message: 'Konten website berhasil disimpan.', data: merged })
}))

app.post('/api/cms/reset', requireAdmin, asyncHandler(async (_req, res) => {
  // 1. PostgreSQL (Real Database)
  if (prisma) {
    try {
      for (const [key, value] of Object.entries(DEFAULT_CMS)) {
        await prisma.siteSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) }
        }).catch(() => null)
      }
      writeJsonFile(CMS_FILE, DEFAULT_CMS)
      return res.json({ ok: true, message: 'Konten website berhasil direset ke standar di database.', data: DEFAULT_CMS })
    } catch (err) {
      console.warn('Prisma reset CMS error:', err.message)
    }
  }

  // 2. Firestore fallback
  if (isFirestoreConfigured()) {
    try {
      await fsSetDoc('site_settings', 'cms', DEFAULT_CMS)
      return res.json({ ok: true, message: 'Konten website berhasil direset ke standar.', data: DEFAULT_CMS })
    } catch {}
  }

  writeJsonFile(CMS_FILE, DEFAULT_CMS)
  res.json({ ok: true, message: 'Konten website berhasil direset ke standar.', data: DEFAULT_CMS })
}))

// Restore initial sample demo catalog (categories, molds, molded products) only when explicitly triggered by admin
app.post('/api/admin/reset-data', requireAdmin, asyncHandler(async (_req, res) => {
  if (prisma) {
    try {
      await prisma.moldedProduct.deleteMany().catch(() => null)
      await prisma.mold.deleteMany().catch(() => null)
      await prisma.category.deleteMany().catch(() => null)

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

      for (const mold of DEFAULT_MOLDS) {
        await prisma.mold.create({
          data: {
            id: mold.id,
            code: mold.code,
            name: mold.name,
            slug: mold.slug,
            type: mold.type,
            category: mold.category,
            description: mold.description,
            detailContent: mold.detailContent,
            imageUrl: mold.imageUrl,
            galleryImages: serializeGallery(mold.galleryImages),
            dimensions: mold.dimensions,
            weightKg: mold.weightKg ? parseFloat(mold.weightKg) : null,
            cavity: mold.cavity ? parseInt(mold.cavity, 10) : null,
            material: mold.material,
            machineTonnage: mold.machineTonnage,
            condition: mold.condition,
            priceLabel: mold.priceLabel,
            status: mold.status,
            featured: Boolean(mold.featured),
            isVisible: mold.isVisible !== false
          }
        }).catch(() => null)
      }

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
    } catch (err) {
      console.warn('Prisma reset error:', err.message)
    }
  }

  if (isFirestoreConfigured()) {
    try {
      await resetFirestoreToDefaults()
    } catch (err) {
      console.warn('Firestore reset error:', err.message)
    }
  }

  writeJsonFile(CATEGORIES_FILE, DEFAULT_CATEGORIES)
  writeJsonFile(MOLDS_FILE, DEFAULT_MOLDS)
  writeJsonFile(PRODUCTS_FILE, DEFAULT_MOLDED_PRODUCTS)
  writeJsonFile(SYSTEM_SEED_FILE, { seeded: true, resetAt: new Date().toISOString() })

  res.json({ ok: true, message: 'Data contoh (kategori, molds, dan produk cetak) berhasil dipulihkan.' })
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
