import { getDb } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';
import { findModelById, ensureModelIndexes } from '../../../lib/model-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return;

  const { code: id } = req.query;
  const { url, publicId, tag } = req.body;

  if (!url || !publicId || !tag) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const db = await getDb();
  await ensureModelIndexes();
  const model = await findModelById(id);
  if (!model) return res.status(404).json({ error: 'Not found' });

  await db.collection('baseModels').updateOne(
    { _id: model._id },
    {
      $push: { images: { url, publicId, tag } },
      $set: { updatedAt: new Date() },
    }
  );

  res.status(200).json({ success: true });
} 