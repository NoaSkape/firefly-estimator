import { ObjectId } from 'mongodb'
import { getDb } from './db.js'

export const COLLECTION = process.env.MODELS_COLLECTION || 'Models'

export function normalizeCode(raw) {
  if (!raw) return { upper: null, lower: null }
  const code = String(raw).trim()
  return { upper: code.toUpperCase(), lower: code.toLowerCase() }
}

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
  const collection = db.collection(COLLECTION)

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
  const collection = db.collection(COLLECTION)
  await collection.createIndex({ modelCode: 1 }, { unique: true })
  await collection.createIndex({ slug: 1 }, { unique: true, sparse: true })
}

/**
 * Find by id/code/slug with case-insensitive fallbacks; auto-create minimal doc if not found.
 */
export async function findOrCreateModel({ modelId, modelCode }) {
  const db = await getDb()
  const collection = db.collection(COLLECTION)

  if (modelId) {
    try {
      const byId = await collection.findOne({ _id: new ObjectId(String(modelId)) })
      if (byId) return byId
    } catch {}
  }

  if (modelCode) {
    const { upper, lower } = normalizeCode(modelCode)
    const existing = await (async () => {
      let doc = await collection.findOne({ modelCode: upper })
      if (doc) return doc
      doc = await collection.findOne({ slug: lower })
      if (doc) return doc
      doc = await collection.findOne({ modelCode: { $regex: `^${escapeRegExp(upper)}$`, $options: 'i' } })
      if (doc) return doc
      return null
    })()
    if (existing) return existing

    // Safety net: create minimal document
    const minimal = {
      modelCode: upper,
      slug: lower,
      name: upper,
      images: [],
      specs: {},
      features: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const ins = await collection.insertOne(minimal)
    return { _id: ins.insertedId, ...minimal }
  }

  return null
}

export async function updateModelFields(_id, fields) {
  const db = await getDb()
  const collection = db.collection(COLLECTION)
  const toSet = { ...fields, updatedAt: new Date() }
  return collection.updateOne({ _id }, { $set: toSet })
}

