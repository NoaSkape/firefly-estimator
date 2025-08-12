import { getDb } from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { findModelById, ensureModelIndexes } from '../../lib/model-utils.js'

export default async function handler(req, res) {
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) {
    console.log('[DEBUG_ADMIN] === models/images called ===')
    console.log('[DEBUG_ADMIN] Method:', req.method)
    console.log('[DEBUG_ADMIN] URL:', req.url)
    console.log('[DEBUG_ADMIN] Query:', req.query)
  }
  
  // Set CORS headers first (restrict to configured origin if provided)
  const allowed = process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS || ''
  const origin = allowed || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : '')
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, PATCH, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return;

  // Extract model code from query or URL
  const { modelCode } = req.query;
  if (debug) console.log('[DEBUG_ADMIN] modelCode', modelCode);
  
  if (!modelCode) {
    console.log('No model code provided');
    return res.status(400).json({ error: 'No model code provided' });
  }
  
  const db = await getDb();
  try {
    await ensureModelIndexes();
  } catch (err) {
    console.error('ensureModelIndexes error:', err?.message || err);
  }
  const model = await findModelById(modelCode);
  if (!model) return res.status(404).json({ error: 'Model not found' });

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
  const { add, setPrimary, order } = req.body || {};
  // Basic validation and sanitization
  const toStringSafe = (v) => (v == null ? '' : String(v)).slice(0, 500)
  const updates = { $set: { updatedAt: new Date() } };

  if (Array.isArray(add) && add.length) {
    const clean = add.map(img => ({
      publicId: toStringSafe(img.publicId),
      url: toStringSafe(img.url),
      alt: toStringSafe(img.alt),
      isPrimary: false,
    }));
    updates.$push = { images: { $each: clean } };
  }

  if (typeof setPrimary === 'string' && Array.isArray(model.images) && model.images.length) {
    const primaryId = String(setPrimary)
    const next = model.images.map(img => ({ ...img, isPrimary: img.publicId === primaryId }));
    updates.$set.images = next;
  }

  if (Array.isArray(order) && Array.isArray(model.images) && model.images.length) {
    const map = new Map(model.images.map(img => [img.publicId, img]));
    const next = order
      .map(id => map.get(String(id)))
      .filter(Boolean)
      .map((img) => ({ ...img }));
    if (next.length) {
      updates.$set = { ...(updates.$set || {}), images: next };
    }
  }

  const collectionName = process.env.MODELS_COLLECTION || 'Models';
  const result = await db.collection(collectionName).updateOne({ _id: model._id }, updates);
  if (debug) {
    console.log('[DEBUG_ADMIN] images PATCH update result', { matchedCount: result?.matchedCount, modifiedCount: result?.modifiedCount })
  }
  const updated = await db.collection(collectionName).findOne({ _id: model._id });
  res.status(200).json(updated);
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
