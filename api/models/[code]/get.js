import { getDb } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';
import { findModelById, ensureModelIndexes } from '../../../lib/model-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const auth = await requireAuth(req, res, false);
  if (!auth?.userId) return;

  const { code: id } = req.query;
  await ensureModelIndexes();
  const model = await findModelById(id);

  if (!model) return res.status(404).json({ error: 'Not found' });
  res.status(200).json(model);
} 