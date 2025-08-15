import { getDb } from './db.js'

const IDEMPOTENCY_COLLECTION = process.env.IDEMPOTENCY_COLLECTION || 'IdempotencyKeys'

export async function ensureIdempotencyIndexes() {
  const db = await getDb()
  const col = db.collection(IDEMPOTENCY_COLLECTION)
  await Promise.all([
    col.createIndex({ key: 1 }, { unique: true }),
    col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 }),
  ])
}

export async function withIdempotency(key, handler) {
  const db = await getDb()
  const col = db.collection(IDEMPOTENCY_COLLECTION)
  if (!key) return handler()
  await ensureIdempotencyIndexes()
  try {
    await col.insertOne({ key, createdAt: new Date() })
  } catch {
    // Duplicate => treat as success already processed
    return { idempotent: true }
  }
  const result = await handler()
  return result
}


