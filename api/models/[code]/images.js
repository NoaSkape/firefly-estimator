import { getDb } from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { findModelById, ensureModelIndexes } from '../../../lib/model-utils.js'

export default async function handler(req, res) {
  console.log('images.js called with method:', req.method);
  
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return;

  const { code: id } = req.query;
  const db = await getDb();
  await ensureModelIndexes();
  const model = await findModelById(id);
  if (!model) return res.status(404).json({ error: 'Not found' });

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
}

async function handlePatch(req, res, model, db) {
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

  if (typeof setPrimary === 'string' && model.images && model.images.length) {
    const next = (model.images || []).map(img => ({ ...img, isPrimary: img.publicId === setPrimary }));
    updates.$set.images = next;
  }

  if (Array.isArray(order) && model.images && model.images.length) {
    const map = new Map((model.images || []).map(img => [img.publicId, img]));
    const next = order
      .map(id => map.get(id))
      .filter(Boolean)
      .map((img, idx) => ({ ...img }));
    if (next.length) {
      updates.$set = { ...(updates.$set || {}), images: next };
    }
  }

  await db.collection('baseModels').updateOne({ _id: model._id }, updates);
  const updated = await db.collection('baseModels').findOne({ _id: model._id });
  res.status(200).json(updated);
}

async function handleDelete(req, res, model, db) {
  const { publicId } = req.query;
  if (!publicId) return res.status(400).json({ error: 'Missing publicId' });

  // Remove from Cloudinary first
  try {
    const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_id: publicId,
        api_key: process.env.CLOUDINARY_API_KEY,
        signature: process.env.CLOUDINARY_API_SECRET, // This should be signed properly in production
      })
    });
    console.log('Cloudinary delete response:', cloudinaryRes.status);
  } catch (e) {
    console.error('Cloudinary delete error:', e);
  }

  // Remove from database
  const next = (model.images || []).filter(img => img.publicId !== publicId);
  await db.collection('baseModels').updateOne(
    { _id: model._id },
    { $set: { images: next, updatedAt: new Date() } }
  );

  res.status(200).json({ success: true });
}

async function handlePost(req, res, model, db) {
  const { url, publicId, tag } = req.body;
  if (!url || !publicId || !tag) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  await db.collection('baseModels').updateOne(
    { _id: model._id },
    {
      $push: { images: { url, publicId, tag } },
      $set: { updatedAt: new Date() },
    }
  );

  res.status(200).json({ success: true });
}
