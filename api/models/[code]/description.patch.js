import { getDb } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return;

  const { code } = req.query;
  const { description } = req.body;

  const db = await getDb();
  await db.collection('baseModels').updateOne(
    { modelCode: code },
    {
      $set: { description, updatedAt: new Date() },
    },
    { upsert: true }
  );

  res.status(200).json({ success: true });
} 