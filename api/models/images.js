import { getDb } from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { findModelById, ensureModelIndexes } from '../../lib/model-utils.js'

export default async function handler(req, res) {
  console.log('=== MODELS/IMAGES.JS CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('Headers:', req.headers);
  console.log('============================');
  
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return;

  // Extract model code from query or URL
  const { modelCode } = req.query;
  console.log('Model code from query:', modelCode);
  
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
    console.error('route models/images error', err?.message || err);
    return res.status(500).json({ error: 'server_error' });
  }
}

async function handlePatch(req, res, model, db) {
  console.log('Handling PATCH request');
  const { add, setPrimary, order } = req.body || {};
  const updates = { $set: { updatedAt: new Date() } };

  if (Array.isArray(add) && add.length) {
    const clean = add.map(img => ({
      publicId: String(img.publicId),
      url: String(img.url),
      alt: img.alt ? String(img.alt) : '',
      isPrimary: false,
    }));
    updates.$push = { images: { $each: clean } };
  }

  if (typeof setPrimary === 'string' && Array.isArray(model.images) && model.images.length) {
    const next = model.images.map(img => ({ ...img, isPrimary: img.publicId === setPrimary }));
    updates.$set.images = next;
  }

  if (Array.isArray(order) && Array.isArray(model.images) && model.images.length) {
    const map = new Map(model.images.map(img => [img.publicId, img]));
    const next = order
      .map(id => map.get(id))
      .filter(Boolean)
      .map((img, idx) => ({ ...img }));
    if (next.length) {
      updates.$set = { ...(updates.$set || {}), images: next };
    }
  }

  const collectionName = process.env.MODELS_COLLECTION || 'Models';
  await db.collection(collectionName).updateOne({ _id: model._id }, updates);
  const updated = await db.collection(collectionName).findOne({ _id: model._id });
  res.status(200).json(updated);
}

async function handleDelete(req, res, model, db) {
  const { publicId } = req.query;
  if (!publicId) return res.status(400).json({ error: 'Missing publicId' });

  const next = (Array.isArray(model.images) ? model.images : []).filter(img => img.publicId !== publicId);
  const collectionName = process.env.MODELS_COLLECTION || 'Models';
  await db.collection(collectionName).updateOne(
    { _id: model._id },
    { $set: { images: next, updatedAt: new Date() } }
  );

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
