import { getDb } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';
import { findModelById, ensureModelIndexes } from '../../../lib/model-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  // Allow unauthenticated reads; admin gating is handled elsewhere
  await requireAuth(req, res, false);

  const { code: id } = req.query;
  await ensureModelIndexes();
  const model = await findModelById(id);

  if (!model) return res.status(404).json({ error: 'Not found', images: [], features: [] });
  const normalized = {
    ...model,
    features: Array.isArray(model.features) ? model.features : [],
    images: Array.isArray(model.images) ? model.images : [],
  };
  res.status(200).json(normalized);
} 