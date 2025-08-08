import { ObjectId } from 'mongodb'
import { getDb } from './db.js'

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
  const db = await getDb()
  const collection = db.collection('baseModels')

  const raw = String(id).trim()

  // Primary attempts
  if (isModelCode(raw)) {
    const code = raw.toUpperCase()
    const byCode = await collection.findOne({ modelCode: code })
    if (byCode) return byCode
  }

  if (isSlug(raw)) {
    const slug = raw.toLowerCase()
    const bySlug = await collection.findOne({ slug })
    if (bySlug) return bySlug
  }

  // Last-chance: try both fields regardless
  const byCodeLast = await collection.findOne({ modelCode: raw.toUpperCase() })
  if (byCodeLast) return byCodeLast
  const bySlugLast = await collection.findOne({ slug: raw.toLowerCase() })
  if (bySlugLast) return bySlugLast

  return null
}

/** Ensure indexes exist (safe to call frequently) */
export async function ensureModelIndexes() {
  const db = await getDb()
  const collection = db.collection('baseModels')
  await collection.createIndex({ modelCode: 1 }, { unique: true })
  await collection.createIndex({ slug: 1 }, { unique: true, sparse: true })
}

