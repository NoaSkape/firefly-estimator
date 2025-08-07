import { getDb } from '../../../lib/db.js';
import { requireAuth } from '../../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return;

  const { code } = req.query;
  const { url, publicId, tag } = req.body;

  if (!url || !publicId || !tag) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const db = await getDb();
  await db.collection('baseModels').updateOne(
    { modelCode: code },
    {
      $push: { images: { url, publicId, tag } },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );

  res.status(200).json({ success: true });
} 