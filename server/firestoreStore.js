import crypto from 'node:crypto'
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CMS,
  DEFAULT_MOLDED_PRODUCTS,
  DEFAULT_MOLDS
} from './cmsDefaults.js'

/**
 * Zero-dependency Google Cloud Firestore REST Client (Service Account JWT + Public Mode)
 * Works seamlessly on Vercel Serverless Functions & Node.js without native gRPC binaries.
 */

// Default Firebase Web Config for ilufa-molding
export const FIREBASE_CONFIG = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBlPo8laZRb9wA0wrkRsX1ist2pDF85UoE',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'ilufa-molding.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'ilufa-molding',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'ilufa-molding.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '727522465008',
  appId: process.env.FIREBASE_APP_ID || '1:727522465008:web:c444e24d298162b2af5e35'
}

function parseServiceAccountFromEnv() {
  if (process.env.DISABLE_FIRESTORE === 'true') return null

  // Option 1: Full JSON string or Base64 JSON in FIREBASE_SERVICE_ACCOUNT
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (rawJson) {
    try {
      const decoded = rawJson.trim().startsWith('{')
        ? rawJson
        : Buffer.from(rawJson, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      if (parsed.project_id) {
        return {
          projectId: parsed.project_id,
          apiKey: FIREBASE_CONFIG.apiKey,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key ? parsed.private_key.replace(/\\n/g, '\n') : null
        }
      }
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message)
    }
  }

  // Option 2: Individual env vars or built-in FIREBASE_CONFIG
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    FIREBASE_CONFIG.projectId
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || null
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : null

  if (projectId) {
    return { projectId, apiKey: FIREBASE_CONFIG.apiKey, clientEmail, privateKey }
  }
  return null
}

let cachedAccessToken = null
let tokenExpiresAt = 0
let firestoreTemporarilySuspendedUntil = 0
let permissionWarnedOnce = false

export function isFirestoreAvailable() {
  if (!parseServiceAccountFromEnv()?.projectId) return false
  if (Date.now() < firestoreTemporarilySuspendedUntil) return false
  return true
}

export function isFirestoreConfigured() {
  return isFirestoreAvailable()
}

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf-8')
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function getGoogleAccessToken(creds) {
  if (!creds?.clientEmail || !creds?.privateKey) {
    return null // Will use unauthenticated/API-key Firestore REST request (for test-mode rules)
  }

  const now = Math.floor(Date.now() / 1000)
  if (cachedAccessToken && tokenExpiresAt > now + 60) {
    return cachedAccessToken
  }

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: creds.clientEmail,
    sub: creds.clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore'
  }

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`

  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsignedJwt)
  signer.end()
  const signature = signer.sign(creds.privateKey)
  const signedJwt = `${unsignedJwt}.${base64UrlEncode(signature)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt
    })
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Firestore OAuth error (${res.status}): ${errText}`)
  }

  const data = await res.json()
  cachedAccessToken = data.access_token
  tokenExpiresAt = now + (data.expires_in || 3600)
  return cachedAccessToken
}

// Convert JS value to Firestore REST Value object
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
  }
  if (typeof val === 'string') return { stringValue: val }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } }
  }
  if (typeof val === 'object') {
    const fields = {}
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(val) }
}

// Convert Firestore REST Value object back to JS value
function fromFirestoreValue(vObj) {
  if (!vObj || typeof vObj !== 'object') return null
  if ('nullValue' in vObj) return null
  if ('booleanValue' in vObj) return Boolean(vObj.booleanValue)
  if ('integerValue' in vObj) return Number(vObj.integerValue)
  if ('doubleValue' in vObj) return Number(vObj.doubleValue)
  if ('stringValue' in vObj) return vObj.stringValue
  if ('timestampValue' in vObj) return vObj.timestampValue
  if ('arrayValue' in vObj) {
    const vals = vObj.arrayValue?.values || []
    return vals.map(fromFirestoreValue)
  }
  if ('mapValue' in vObj) {
    const fields = vObj.mapValue?.fields || {}
    const out = {}
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v)
    }
    return out
  }
  return null
}

function docToJs(doc) {
  if (!doc || !doc.fields) return null
  const parts = (doc.name || '').split('/')
  const docId = parts[parts.length - 1]
  const out = { id: docId }
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = fromFirestoreValue(v)
  }
  return out
}

function jsToDocFields(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v)
    }
  }
  return { fields }
}

async function firestoreRequest(pathSuffix, options = {}) {
  const creds = parseServiceAccountFromEnv()
  if (!creds?.projectId) {
    throw new Error('FIREBASE_PROJECT_ID belum dikonfigurasi.')
  }

  const databaseId = process.env.FIREBASE_DATABASE_ID || '(default)'
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${creds.projectId}/databases/${databaseId}/documents`
  const apiKey = creds.apiKey || process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY
  let url = `${baseUrl}${pathSuffix}`
  if (apiKey && !creds.privateKey) {
    url += (url.includes('?') ? '&' : '?') + `key=${encodeURIComponent(apiKey)}`
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  if (creds.clientEmail && creds.privateKey) {
    const token = await getGoogleAccessToken(creds)
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, {
    ...options,
    headers
  })

  if (res.status === 404) return null
  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 403) {
      // Suspend Firestore requests for 30s so we don't spam console or fail writes while user updates Firestore Rules
      firestoreTemporarilySuspendedUntil = Date.now() + 30000
      if (!permissionWarnedOnce) {
        permissionWarnedOnce = true
        console.warn(
          '\n⚠️  [Firestore 403 Permission Denied]: Firestore Rules pada project "ilufa-molding" masih terkunci.\n' +
          '   👉 Silakan buka Firebase Console -> Firestore Database -> tab Rules, lalu ubah menjadi:\n' +
          '      allow read, write: if true;\n' +
          '   (Sementara itu, aplikasi otomatis menggunakan PostgreSQL / Local JSON fallback tanpa error).\n'
        )
      }
    }
    throw new Error(`Firestore REST error (${res.status}): ${errText}`)
  }
  permissionWarnedOnce = false
  return res.json()
}

export async function fsListCollection(collectionName) {
  const data = await firestoreRequest(`/${collectionName}?pageSize=300`)
  if (!data || !Array.isArray(data.documents)) return []
  return data.documents.map(docToJs).filter(Boolean)
}

export async function fsGetDoc(collectionName, docId) {
  const doc = await firestoreRequest(`/${collectionName}/${encodeURIComponent(docId)}`)
  if (!doc) return null
  return docToJs(doc)
}

export async function fsSetDoc(collectionName, docId, payload) {
  const body = jsToDocFields({ ...payload, id: docId })
  const doc = await firestoreRequest(`/${collectionName}/${encodeURIComponent(docId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
  return docToJs(doc)
}

export async function fsDeleteDoc(collectionName, docId) {
  await firestoreRequest(`/${collectionName}/${encodeURIComponent(docId)}`, {
    method: 'DELETE'
  })
  return true
}

// Auto-seed initial collections in Firestore if empty
let seededOnce = false
export async function ensureFirestoreSeeded() {
  if (seededOnce || !isFirestoreConfigured()) return
  try {
    const [cats, molds, prods] = await Promise.all([
      fsListCollection('categories'),
      fsListCollection('molds'),
      fsListCollection('molded_products')
    ])

    if (cats.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await fsSetDoc('categories', cat.id, {
          ...cat,
          createdAt: new Date().toISOString()
        })
      }
    }

    if (molds.length === 0) {
      for (const mold of DEFAULT_MOLDS) {
        await fsSetDoc('molds', mold.id, {
          ...mold,
          createdAt: new Date().toISOString()
        })
      }
    }

    if (prods.length === 0) {
      for (const prod of DEFAULT_MOLDED_PRODUCTS) {
        await fsSetDoc('molded_products', prod.id, {
          ...prod,
          createdAt: new Date().toISOString()
        })
      }
    }

    const cmsDoc = await fsGetDoc('site_settings', 'cms')
    if (!cmsDoc) {
      await fsSetDoc('site_settings', 'cms', DEFAULT_CMS)
    }

    seededOnce = true
  } catch (err) {
    if (!String(err.message).includes('403')) {
      console.warn('Firestore auto-seed warning:', err.message)
    }
  }
}

