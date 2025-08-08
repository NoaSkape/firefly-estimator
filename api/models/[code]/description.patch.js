import { getDb } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';
import { findModelById, ensureModelIndexes } from '../../../lib/model-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return;

  const { code: id } = req.query;
  const { description } = req.body;

  const db = await getDb();
  await ensureModelIndexes();
  const model = await findModelById(id);
  if (!model) return res.status(404).json({ error: 'Not found' });

  const collectionName = process.env.MODELS_COLLECTION || 'Models'
  await db.collection(collectionName).updateOne(
    { _id: model._id },
    { $set: { description, updatedAt: new Date() } }
  );

  res.status(200).json({ success: true });
} 