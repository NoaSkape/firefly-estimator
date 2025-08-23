import { getDb } from './db.js'

export const SETTINGS_COLLECTION = process.env.SETTINGS_COLLECTION || 'Settings'
const SETTINGS_KEY = 'org'

export async function getOrgSettings() {
  const db = await getDb()
  const col = db.collection(SETTINGS_COLLECTION)
  const doc = await col.findOne({ key: SETTINGS_KEY })
  if (doc) return doc
  const now = new Date()
  const fallback = {
    key: SETTINGS_KEY,
    factory: {
      name: 'Champion Homes of Mansfield, TX',
      address: '606 S 2nd Ave, Mansfield, TX 76063',
    },
    pricing: {
      deposit_percent: 25,
      tax_rate_percent: 6.25,
      delivery_rate_per_mile: 12.5,
      delivery_minimum: 1500,
      title_fee_default: 500,
      setup_fee_default: 3000,
    },
    createdAt: now,
    updatedAt: now,
    updatedBy: null,
  }
  await col.insertOne(fallback)
  return fallback
}

export async function updateOrgSettings(patch, updatedBy) {
  const db = await getDb()
  const col = db.collection(SETTINGS_COLLECTION)
  const now = new Date()

  const next = {}
  if (patch?.factory && typeof patch.factory === 'object') {
    next.factory = {
      name: String(patch.factory.name || '').slice(0, 200) || undefined,
      address: String(patch.factory.address || '').slice(0, 500) || undefined,
    }
  }
  if (patch?.pricing && typeof patch.pricing === 'object') {
    const p = patch.pricing
    next.pricing = {
      deposit_percent: numOrUndefined(p.deposit_percent),
      tax_rate_percent: numOrUndefined(p.tax_rate_percent),
      delivery_rate_per_mile: numOrUndefined(p.delivery_rate_per_mile),
      delivery_minimum: numOrUndefined(p.delivery_minimum),
      title_fee_default: numOrUndefined(p.title_fee_default),
      setup_fee_default: numOrUndefined(p.setup_fee_default),
    }
  }

  const update = {
    $set: {
      ...(next.factory ? { factory: next.factory } : {}),
      ...(next.pricing ? { pricing: next.pricing } : {}),
      updatedAt: now,
      updatedBy: updatedBy || null,
    },
    $setOnInsert: { key: SETTINGS_KEY, createdAt: now },
  }

  await col.updateOne({ key: SETTINGS_KEY }, update, { upsert: true })
  return col.findOne({ key: SETTINGS_KEY })
}

function numOrUndefined(v) {
  if (v == null || v === '') return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return n
}


