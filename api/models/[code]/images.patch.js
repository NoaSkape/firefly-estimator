import { getDb } from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { findModelById, ensureModelIndexes } from '../../../lib/model-utils.js'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return;

  const { code: id } = req.query;
  const { add, setPrimary, order } = req.body || {};

  const db = await getDb();
  await ensureModelIndexes();
  const model = await findModelById(id);
  if (!model) return res.status(404).json({ error: 'Not found' });

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

