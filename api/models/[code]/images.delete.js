import { getDb } from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { findModelById, ensureModelIndexes } from '../../../lib/model-utils.js'
import cloudinary from '../../../lib/cloudinary.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return;

  const { code: id, publicId } = { ...req.query, ...req.params };
  if (!publicId) return res.status(400).json({ error: 'Missing publicId' });

  const db = await getDb();
  await ensureModelIndexes();
  const model = await findModelById(id);
  if (!model) return res.status(404).json({ error: 'Not found' });

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary destroy failed', err);
    // continue to remove from DB regardless
  }

  await db.collection('baseModels').updateOne(
    { _id: model._id },
    { $pull: { images: { publicId } }, $set: { updatedAt: new Date() } }
  );

  res.status(200).json({ success: true });
}

