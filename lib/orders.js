import { getDb } from './db.js'

export const ORDERS_COLLECTION = process.env.ORDERS_COLLECTION || 'Orders'

export async function ensureOrderIndexes() {
  const db = await getDb()
  const col = db.collection(ORDERS_COLLECTION)
  await Promise.all([
    col.createIndex({ userId: 1, createdAt: -1 }),
    col.createIndex({ status: 1, createdAt: -1 }),
    col.createIndex({ createdAt: -1 }),
  ])
}

export async function createOrderDraft({ userId, model, selections, pricing }) {
  const db = await getDb()
  const col = db.collection(ORDERS_COLLECTION)
  const now = new Date()
  const doc = {
    userId,
    status: 'draft',
    model,
    selections: Array.isArray(selections) ? selections : [],
    pricing: pricing || { base: 0, options: 0, delivery: 0, total: 0, deposit: 0 },
    buyer: {},
    delivery: {},
    payment: {},
    documents: [],
    timeline: [{ event: 'created', at: now }],
    createdAt: now,
    updatedAt: now,
  }
  const result = await col.insertOne(doc)
  return { ...doc, _id: result.insertedId }
}

export async function getOrderById(orderId) {
  const db = await getDb()
  const col = db.collection(ORDERS_COLLECTION)
  const { ObjectId } = await import('mongodb')
  return col.findOne({ _id: new ObjectId(String(orderId)) })
}

export async function updateOrder(orderId, patch) {
  const db = await getDb()
  const col = db.collection(ORDERS_COLLECTION)
  const { ObjectId } = await import('mongodb')
  const _id = new ObjectId(String(orderId))
  const $set = { ...patch, updatedAt: new Date() }
  await col.updateOne({ _id }, { $set })
  return col.findOne({ _id })
}

export async function listOrdersForUser(userId) {
  const db = await getDb()
  const col = db.collection(ORDERS_COLLECTION)
  return col.find({ userId }).sort({ createdAt: -1 }).toArray()
}

export async function listOrdersAdmin(filters = {}) {
  const db = await getDb()
  const col = db.collection(ORDERS_COLLECTION)
  const query = {}
  if (filters.status) query.status = String(filters.status)
  return col.find(query).sort({ createdAt: -1 }).limit(200).toArray()
}



