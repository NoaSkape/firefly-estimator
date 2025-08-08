import cloudinary from '../../lib/cloudinary.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return; // auth already sent error

  const { subfolder = '', tags = [] } = req.body;
  const timestamp = Math.round(Date.now() / 1000);
  const root = process.env.CLOUDINARY_ROOT_FOLDER || 'firefly-estimator/models';
  const safeSub = String(subfolder).replace(/[^a-zA-Z0-9_\/-]/g, '');
  const folder = safeSub ? `${root}/${safeSub}` : root;
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, tags: tags.join(',') },
    process.env.CLOUDINARY_API_SECRET
  );

  res.status(200).json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  });
} 