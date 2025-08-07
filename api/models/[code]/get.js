import { getDb } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const auth = await requireAuth(req, res, false);
  if (!auth?.userId) return;

  const { code } = req.query;
  const db = await getDb();
  const model = await db.collection('baseModels').findOne({ modelCode: code });

  if (!model) return res.status(404).json({ error: 'Not found' });
  res.status(200).json(model);
} 