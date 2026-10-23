import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { DEFAULT_CMS, DEFAULT_MOLDED_PRODUCTS } from './cmsDefaults.js'

const prisma = new PrismaClient()
const app = express()
const PORT = process.env.PORT || 3000
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataDir = path.resolve(__dirname, 'data')
const uploadDir = path.resolve(__dirname, '../public/uploads')

// Ensure runtime directories exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }))
app.use(express.json({ limit: '15mb' }))
app.use(express.urlencoded({ extended: true, limit: '15mb' }))
app.use('/uploads', express.static(uploadDir))

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// --- Helper Functions for CMS Storage & Fallback ---
const CMS_FILE = path.join(dataDir, 'cms-content.json')
const PRODUCTS_FILE = path.join(dataDir, 'molded-products.json')

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

async function getMergedCMS() {
  const result = JSON.parse(JSON.stringify(DEFAULT_CMS))
  // Try DB first
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
  } catch (err) {
    // Table might not exist yet; fall back to file
  }

  // Fallback to JSON file if DB empty
  const fileData = readJsonFile(CMS_FILE, null)
  if (fileData) {
    return { ...result, ...fileData }
  }
  return result
}

// --- Admin Auth Token Simulation & Check ---
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const activeTokens = new Set(['dev-admin-token'])

function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-admin-key']
  if (!token || (!activeTokens.has(token) && token !== process.env.ADMIN_KEY && token !== ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Akses ditolak. Silakan login sebagai admin.' })
  }
  next()
}

// --- Public Endpoints ---

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'ilufa-molding-api' }))

// Get CMS Content
app.get('/api/cms', asyncHandler(async (_req, res) => {
  const content = await getMergedCMS()
  res.json({ ok: true, data: content })
}))

// Get Molds Catalog
app.get('/api/molds', asyncHandler(async (req, res) => {
  const { type, q, status, featured } = req.query
  const where = {}
  if (type && ['NEW', 'CUSTOM', 'USED'].includes(String(type).toUpperCase())) where.type = String(type).toUpperCase()
  if (status && ['AVAILABLE', 'ON_ORDER', 'NEGOTIATION', 'SOLD'].includes(String(status).toUpperCase())) where.status = String(status).toUpperCase()
  if (featured === 'true') where.featured = true
  if (q) where.OR = [
    { name: { contains: String(q), mode: 'insensitive' } },
    { code: { contains: String(q), mode: 'insensitive' } },
    { category: { contains: String(q), mode: 'insensitive' } }
  ]
  const molds = await prisma.mold.findMany({ where, orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }] })
  res.json({ data: molds })
}))

// Get Single Mold
app.get('/api/molds/:idOrSlug', asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params
  const mold = await prisma.mold.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }, { code: idOrSlug }]
    }
  })
  if (!mold) return res.status(404).json({ error: 'Molding tidak ditemukan.' })
  res.json({ data: mold })
}))

// Submit RFQ Inquiry
app.post('/api/inquiries', asyncHandler(async (req, res) => {
  const body = req.body || {}
  const required = ['companyName', 'contactName', 'phone', 'moldType', 'productNeed']
  const missing = required.filter((key) => !String(body[key] ?? '').trim())
  if (missing.length) return res.status(400).json({ error: `Kolom wajib belum diisi: ${missing.join(', ')}` })
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return res.status(400).json({ error: 'Format email tidak valid.' })
  }
  if (body.moldId) {
    const mold = await prisma.mold.findUnique({ where: { id: body.moldId } }).catch(() => null)
    if (!mold) body.moldId = null
  }
  const inquiry = await prisma.inquiry.create({
    data: {
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
      moldId: body.moldId || null
    }
  })
  res.status(201).json({ message: 'Permintaan penawaran berhasil dikirim.', data: { id: inquiry.id } })
}))

// Get Molded Products (Katalog Hasil Cetakan Plastik)
app.get('/api/molded-products', asyncHandler(async (_req, res) => {
  try {
    const products = await prisma.moldedProduct.findMany({ orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }] })
    if (products.length > 0) return res.json({ data: products })
  } catch (err) {
    // Database table might not exist yet
  }
  const fileProducts = readJsonFile(PRODUCTS_FILE, null)
  if (fileProducts && fileProducts.length > 0) return res.json({ data: fileProducts })
  res.json({ data: DEFAULT_MOLDED_PRODUCTS })
}))

// --- Admin Endpoints ---

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {}
  const validPass = process.env.ADMIN_PASSWORD || 'admin123'
  if (!password || password !== validPass) {
    return res.status(401).json({ error: 'Password admin salah. Default: admin123' })
  }
  const token = 'adm_' + crypto.randomBytes(24).toString('hex')
  activeTokens.add(token)
  res.json({ ok: true, message: 'Login berhasil.', token })
})

// Admin Verify Token
app.get('/api/admin/verify', (req, res) => {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (token && (activeTokens.has(token) || token === ADMIN_PASSWORD)) {
    return res.json({ ok: true, user: 'admin' })
  }
  res.status(401).json({ ok: false, error: 'Token tidak valid.' })
})

// Admin Dashboard Stats
app.get('/api/admin/stats', requireAdmin, asyncHandler(async (_req, res) => {
  let moldsCount = 0
  let newMoldsCount = 0
  let customMoldsCount = 0
  let usedMoldsCount = 0
  let inquiriesCount = 0
  let newInquiriesCount = 0
  let moldedProductsCount = 0

  try {
    moldsCount = await prisma.mold.count()
    newMoldsCount = await prisma.mold.count({ where: { type: 'NEW' } })
    customMoldsCount = await prisma.mold.count({ where: { type: 'CUSTOM' } })
    usedMoldsCount = await prisma.mold.count({ where: { type: 'USED' } })
    inquiriesCount = await prisma.inquiry.count()
    newInquiriesCount = await prisma.inquiry.count({ where: { status: 'NEW' } })
    moldedProductsCount = await prisma.moldedProduct.count().catch(() => DEFAULT_MOLDED_PRODUCTS.length)
  } catch (err) {
    console.error('Stats query error:', err.message)
  }

  res.json({
    data: {
      totalMolds: moldsCount,
      newMolds: newMoldsCount,
      customMolds: customMoldsCount,
      usedMolds: usedMoldsCount,
      totalInquiries: inquiriesCount,
      newInquiries: newInquiriesCount,
      moldedProducts: moldedProductsCount
    }
  })
}))

// Update CMS Content
app.put('/api/cms', requireAdmin, asyncHandler(async (req, res) => {
  const newContent = req.body || {}
  const current = await getMergedCMS()
  const merged = { ...current, ...newContent }

  // 1. Save to DB SiteSetting if available
  try {
    for (const [key, value] of Object.entries(merged)) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) }
      })
    }
  } catch (err) {
    console.warn('Could not write to SiteSetting table, using file fallback:', err.message)
  }

  // 2. Save to local fallback file
  writeJsonFile(CMS_FILE, merged)

  res.json({ ok: true, message: 'Konten website berhasil disimpan.', data: merged })
}))

// Reset CMS Content
app.post('/api/cms/reset', requireAdmin, asyncHandler(async (_req, res) => {
  try {
    for (const [key, value] of Object.entries(DEFAULT_CMS)) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) }
      }).catch(() => null)
    }
  } catch {}
  writeJsonFile(CMS_FILE, DEFAULT_CMS)
  res.json({ ok: true, message: 'Konten website berhasil direset ke standar.', data: DEFAULT_CMS })
}))

// --- Molds Management (CRUD) ---

app.post('/api/molds', requireAdmin, asyncHandler(async (req, res) => {
  const body = req.body || {}
  if (!body.name || !body.type || !body.category) {
    return res.status(400).json({ error: 'Nama mold, tipe, dan kategori wajib diisi.' })
  }

  // Generate unique code & slug if not provided
  const prefix = { NEW: 'ILF-NEW', CUSTOM: 'ILF-CUS', USED: 'ILF-USD' }[body.type] || 'ILF-MOLD'
  const code = (body.code || `${prefix}-${Date.now().toString().slice(-4)}`).trim()
  const baseSlug = (body.slug || body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`

  const newMold = await prisma.mold.create({
    data: {
      code,
      name: String(body.name).trim(),
      slug: body.slug ? String(body.slug).trim() : slug,
      type: body.type,
      category: String(body.category).trim(),
      description: String(body.description || '').trim(),
      imageUrl: body.imageUrl || null,
      dimensions: body.dimensions || null,
      weightKg: body.weightKg ? parseFloat(body.weightKg) : null,
      cavity: body.cavity ? parseInt(body.cavity, 10) : null,
      material: body.material || null,
      machineTonnage: body.machineTonnage || null,
      condition: body.condition || null,
      priceLabel: body.priceLabel || 'Minta penawaran',
      status: body.status || 'AVAILABLE',
      featured: Boolean(body.featured)
    }
  })

  res.status(201).json({ ok: true, message: 'Molding berhasil ditambahkan.', data: newMold })
}))

app.put('/api/molds/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const body = req.body || {}

  const updated = await prisma.mold.update({
    where: { id },
    data: {
      name: body.name ? String(body.name).trim() : undefined,
      code: body.code ? String(body.code).trim() : undefined,
      slug: body.slug ? String(body.slug).trim() : undefined,
      type: body.type || undefined,
      category: body.category ? String(body.category).trim() : undefined,
      description: body.description !== undefined ? String(body.description).trim() : undefined,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
      dimensions: body.dimensions !== undefined ? body.dimensions : undefined,
      weightKg: body.weightKg !== undefined ? (body.weightKg ? parseFloat(body.weightKg) : null) : undefined,
      cavity: body.cavity !== undefined ? (body.cavity ? parseInt(body.cavity, 10) : null) : undefined,
      material: body.material !== undefined ? body.material : undefined,
      machineTonnage: body.machineTonnage !== undefined ? body.machineTonnage : undefined,
      condition: body.condition !== undefined ? body.condition : undefined,
      priceLabel: body.priceLabel !== undefined ? body.priceLabel : undefined,
      status: body.status || undefined,
      featured: body.featured !== undefined ? Boolean(body.featured) : undefined
    }
  })

  res.json({ ok: true, message: 'Data molding berhasil diperbarui.', data: updated })
}))

app.delete('/api/molds/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  await prisma.mold.delete({ where: { id } })
  res.json({ ok: true, message: 'Molding berhasil dihapus.' })
}))

// --- Molded Products CRUD ---

app.post('/api/molded-products', requireAdmin, asyncHandler(async (req, res) => {
  const body = req.body || {}
  if (!body.name || !body.category) {
    return res.status(400).json({ error: 'Nama produk dan kategori wajib diisi.' })
  }

  try {
    const product = await prisma.moldedProduct.create({
      data: {
        name: String(body.name).trim(),
        category: String(body.category).trim(),
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        weightEst: body.weightEst || null,
        dimensions: body.dimensions || null,
        moldInfo: body.moldInfo || null,
        featured: Boolean(body.featured)
      }
    })
    return res.status(201).json({ ok: true, data: product })
  } catch (err) {
    const current = readJsonFile(PRODUCTS_FILE, DEFAULT_MOLDED_PRODUCTS)
    const newProd = {
      id: 'prod_' + Date.now(),
      name: String(body.name).trim(),
      category: String(body.category).trim(),
      description: body.description || null,
      imageUrl: body.imageUrl || null,
      weightEst: body.weightEst || null,
      dimensions: body.dimensions || null,
      moldInfo: body.moldInfo || null,
      featured: Boolean(body.featured),
      createdAt: new Date().toISOString()
    }
    current.unshift(newProd)
    writeJsonFile(PRODUCTS_FILE, current)
    return res.status(201).json({ ok: true, data: newProd })
  }
}))

app.put('/api/molded-products/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const body = req.body || {}

  try {
    const updated = await prisma.moldedProduct.update({
      where: { id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        category: body.category ? String(body.category).trim() : undefined,
        description: body.description !== undefined ? body.description : undefined,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
        weightEst: body.weightEst !== undefined ? body.weightEst : undefined,
        dimensions: body.dimensions !== undefined ? body.dimensions : undefined,
        moldInfo: body.moldInfo !== undefined ? body.moldInfo : undefined,
        featured: body.featured !== undefined ? Boolean(body.featured) : undefined
      }
    })
    return res.json({ ok: true, data: updated })
  } catch (err) {
    const current = readJsonFile(PRODUCTS_FILE, DEFAULT_MOLDED_PRODUCTS)
    const idx = current.findIndex(p => p.id === id)
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...body }
      writeJsonFile(PRODUCTS_FILE, current)
      return res.json({ ok: true, data: current[idx] })
    }
    res.status(404).json({ error: 'Produk tidak ditemukan.' })
  }
}))

app.delete('/api/molded-products/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  try {
    await prisma.moldedProduct.delete({ where: { id } })
    return res.json({ ok: true, message: 'Produk berhasil dihapus.' })
  } catch (err) {
    const current = readJsonFile(PRODUCTS_FILE, DEFAULT_MOLDED_PRODUCTS)
    const filtered = current.filter(p => p.id !== id)
    writeJsonFile(PRODUCTS_FILE, filtered)
    return res.json({ ok: true, message: 'Produk berhasil dihapus.' })
  }
}))

// --- Inquiries (RFQ) Management ---

app.get('/api/inquiries', requireAdmin, asyncHandler(async (_req, res) => {
  const inquiries = await prisma.inquiry.findMany({
    include: { mold: { select: { name: true, code: true, type: true } } },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ data: inquiries })
}))

app.patch('/api/inquiries/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, notes } = req.body || {}
  const data = {}
  if (status) data.status = status
  if (notes !== undefined) data.notes = notes

  const updated = await prisma.inquiry.update({
    where: { id },
    data
  })
  res.json({ ok: true, message: 'Status penawaran berhasil diperbarui.', data: updated })
}))

app.delete('/api/inquiries/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params
  await prisma.inquiry.delete({ where: { id } })
  res.json({ ok: true, message: 'Penawaran berhasil dihapus.' })
}))

// --- Image Upload ---
app.post('/api/upload', requireAdmin, (req, res) => {
  const { dataUrl } = req.body || {}
  if (!dataUrl || !dataUrl.includes(';base64,')) {
    return res.status(400).json({ error: 'Data gambar base64 tidak valid.' })
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
      console.error('File save error:', err)
      return res.status(500).json({ error: 'Gagal menyimpan file gambar.' })
    }
    res.json({ ok: true, url: `/uploads/${randomName}` })
  })
})

// Serve built Vue frontend in production.
const distPath = path.resolve(__dirname, '../dist')
app.use(express.static(distPath))
app.get('{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(distPath, 'index.html'), (err) => err && next(err))
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server.' })
})

app.listen(PORT, () => console.log(`iLUFA Molding API & CMS berjalan di http://localhost:${PORT}`))
process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0) })
