import { ObjectId } from 'mongodb'
import { getDb } from './db.js'

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function isModelCode(id) {
  if (!id || typeof id !== 'string') return false
  // Examples: APS-630, APS-527B, APX-118SL
  return /^[A-Za-z]{2,3}-\d{2,3}[A-Za-z]*$/i.test(id.trim())
}

export function isSlug(id) {
  if (!id || typeof id !== 'string') return false
  return /^[a-z0-9-]+$/.test(id.trim())
}

export function slugifyName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Resolve a model document by either slug or modelCode. Returns null if not found.
 * Always normalizes search values appropriately.
 */
export async function findModelById(id) {
  if (!id) return null
  const debug = process.env.DEBUG_ADMIN === 'true'
  const db = await getDb()
  const collection = db.collection(process.env.MODELS_COLLECTION || 'Models')

  const raw = String(id).trim()

  // Primary attempts
  if (isModelCode(raw)) {
    const code = raw.toUpperCase()
    if (debug) console.log('[DEBUG_ADMIN] findModelById: treating as modelCode', { input: raw, normalized: code })
    // Exact uppercase match
    let byCode = await collection.findOne({ modelCode: code })
    if (byCode) return byCode
    // Case-insensitive match on modelCode (handles lowercase inserts)
    byCode = await collection.findOne({ modelCode: { $regex: `^${escapeRegExp(raw)}$`, $options: 'i' } })
    if (byCode) return byCode
    // Fallback: some datasets stored the uppercase in `subtitle`
    byCode = await collection.findOne({ subtitle: code })
    if (byCode) return byCode
  }

  if (isSlug(raw)) {
    const slug = raw.toLowerCase()
    if (debug) console.log('[DEBUG_ADMIN] findModelById: treating as slug', { input: raw, normalized: slug })
    let bySlug = await collection.findOne({ slug })
    if (bySlug) return bySlug
    // Case-insensitive slug match (in case of inconsistent casing)
    bySlug = await collection.findOne({ slug: { $regex: `^${escapeRegExp(raw)}$`, $options: 'i' } })
    if (bySlug) return bySlug
  }

  // Last-chance: try both fields regardless
  if (debug) console.log('[DEBUG_ADMIN] findModelById: last-chance search', { upper: raw.toUpperCase(), lower: raw.toLowerCase() })
  let byCodeLast = await collection.findOne({ modelCode: raw.toUpperCase() })
  if (byCodeLast) return byCodeLast
  byCodeLast = await collection.findOne({ modelCode: { $regex: `^${escapeRegExp(raw)}$`, $options: 'i' } })
  if (byCodeLast) return byCodeLast
  let bySlugLast = await collection.findOne({ slug: raw.toLowerCase() })
  if (bySlugLast) return bySlugLast
  bySlugLast = await collection.findOne({ slug: { $regex: `^${escapeRegExp(raw)}$`, $options: 'i' } })
  if (bySlugLast) return bySlugLast

  return null
}

/** Ensure indexes exist (safe to call frequently) */
export async function ensureModelIndexes() {
  const db = await getDb()
  const collection = db.collection(process.env.MODELS_COLLECTION || 'Models')
  await collection.createIndex({ modelCode: 1 }, { unique: true })
  await collection.createIndex({ slug: 1 }, { unique: true, sparse: true })
}

