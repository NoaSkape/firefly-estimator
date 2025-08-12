export const runtime = 'nodejs'

import { getDb } from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { applyCors } from '../../lib/cors.js'
import { findOrCreateModel, ensureModelIndexes, updateModelFields } from '../../lib/model-utils.js'

export default async function handler(req, res) {
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) {
    console.log('[DEBUG_ADMIN] === models/images called ===')
    console.log('[DEBUG_ADMIN] Method:', req.method)
    console.log('[DEBUG_ADMIN] URL:', req.url)
    console.log('[DEBUG_ADMIN] Query:', req.query)
  }
  
  // CORS
  applyCors(req, res, 'DELETE, PATCH, POST, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return;

  // Extract model id/code from query
  const { modelCode, modelId } = req.query || {};
  if (debug) console.log('[DEBUG_ADMIN] model identifiers', { modelCode, modelId });
  if (!modelCode && !modelId) {
    return res.status(400).json({ error: 'modelCode or modelId is required' });
  }

  const db = await getDb();
  try {
    await ensureModelIndexes();
  } catch (err) {
    console.error('ensureModelIndexes error:', err?.message || err);
  }
  const model = await findOrCreateModel({ modelId, modelCode });
  if (!model?._id) return res.status(404).json({ error: 'Model not found' });

  try {
    switch (req.method) {
    case 'PATCH':
      return handlePatch(req, res, model, db);
    case 'DELETE':
      return handleDelete(req, res, model, db);
    case 'POST':
      return handlePost(req, res, model, db);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('[DEBUG_ADMIN] route models/images error', err?.message || err);
    return res.status(500).json({ error: 'server_error' });
  }
}

async function handlePatch(req, res, model, db) {
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) console.log('[DEBUG_ADMIN] Handling PATCH request images');
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const { add, setPrimary, order, images, tag } = body
  const toStringSafe = (v) => (v == null ? '' : String(v)).slice(0, 500)

  const collectionName = process.env.MODELS_COLLECTION || 'Models';
  const current = Array.isArray(model.images) ? model.images.slice() : []
  let nextImages = current

  if (Array.isArray(images)) {
    const now = new Date()
    nextImages = images
      .map((img, idx) => ({
        publicId: toStringSafe(img.public_id || img.publicId),
        url: toStringSafe(img.secure_url || img.url),
        isPrimary: !!img.isPrimary,
        order: typeof img.order === 'number' ? img.order : idx,
        tag: toStringSafe(tag || img.tag || 'gallery'),
        uploadedAt: img.uploadedAt ? new Date(img.uploadedAt) : now,
      }))
      .filter(i => i.url)
  } else {
    // Start from current and apply granular ops
    nextImages = current.map(img => ({ ...img }))
    if (Array.isArray(add) && add.length) {
      const cleanAdds = add.map((img, idx) => ({
        publicId: toStringSafe(img.publicId),
        url: toStringSafe(img.url),
        alt: toStringSafe(img.alt),
        isPrimary: false,
        order: typeof img.order === 'number' ? img.order : current.length + idx,
        tag: toStringSafe(tag || img.tag || 'gallery'),
        uploadedAt: new Date(),
      })).filter(i => i.url)
      nextImages.push(...cleanAdds)
    }
    if (typeof setPrimary === 'string' && nextImages.length) {
      const primaryId = String(setPrimary)
      nextImages = nextImages.map(img => ({ ...img, isPrimary: img.publicId === primaryId }))
    }
    if (Array.isArray(order) && nextImages.length) {
      const byId = new Map(nextImages.map(img => [img.publicId, img]))
      const reordered = order.map(id => byId.get(String(id))).filter(Boolean)
      if (reordered.length) {
        nextImages = reordered.map((img, idx) => ({ ...img, order: idx }))
      }
    }
  }

  const updates = { $set: { images: nextImages, updatedAt: new Date() } }
  const result = await db.collection(collectionName).updateOne({ _id: model._id }, updates)
  if (debug) {
    console.log('[DEBUG_ADMIN] images PATCH update result', { matchedCount: result?.matchedCount, modifiedCount: result?.modifiedCount })
  }
  const updated = await db.collection(collectionName).findOne({ _id: model._id })
  res.status(200).json(updated)
}

async function handleDelete(req, res, model, db) {
  const { publicId } = req.query;
  if (!publicId) return res.status(400).json({ error: 'Missing publicId' });

  const next = (Array.isArray(model.images) ? model.images : []).filter(img => img.publicId !== publicId);
  const collectionName = process.env.MODELS_COLLECTION || 'Models';
  const result = await db.collection(collectionName).updateOne(
    { _id: model._id },
    { $set: { images: next, updatedAt: new Date() } }
  );
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) console.log('[DEBUG_ADMIN] images DELETE update result', { matchedCount: result?.matchedCount, modifiedCount: result?.modifiedCount })

  res.status(200).json({ success: true });
}

async function handlePost(req, res, model, db) {
  const { url, publicId, tag } = req.body || {};
  if (!url || !publicId) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const collectionName = process.env.MODELS_COLLECTION || 'Models';
  await db.collection(collectionName).updateOne(
    { _id: model._id },
    {
      $push: { images: { url, publicId, tag: tag || 'gallery' } },
      $set: { updatedAt: new Date() },
    }
  );

  res.status(200).json({ success: true });
}
