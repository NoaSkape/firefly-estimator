import { createHash } from 'node:crypto'
import { requireAuth } from '../../lib/auth.js';
import { applyCors } from '../../lib/cors.js'

export const runtime = 'nodejs'

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end();
  const auth = await requireAuth(req, res, true);
  if (!auth?.userId) return; // auth already sent error

  const { subfolder = '', tags = [] } = req.body || {};
  const timestamp = Math.round(Date.now() / 1000);
  const root = process.env.CLOUDINARY_ROOT_FOLDER || 'firefly-estimator/models';
  const safeSub = String(subfolder).replace(/[^a-zA-Z0-9_\/-]/g, '');
  const folder = safeSub ? `${root}/${safeSub}` : root;
  const debug = process.env.DEBUG_ADMIN === 'true'
  if (debug) console.log('[DEBUG_ADMIN] cloudinary/sign', { folder, tags, cloudName: process.env.CLOUDINARY_CLOUD_NAME })
  try {
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    if (!apiKey || !apiSecret || !cloudName) {
      return res.status(500).json({ error: 'missing_env', message: 'Cloudinary env vars are not configured' })
    }

    const paramsToSign = {
      folder,
      tags: Array.isArray(tags) ? tags.join(',') : '',
      timestamp,
    }
    const toSign = Object.keys(paramsToSign)
      .sort()
      .map(k => `${k}=${paramsToSign[k]}`)
      .join('&')
    const signature = createHash('sha1')
      .update(`${toSign}${apiSecret}`)
      .digest('hex')

    res.status(200).json({
      timestamp,
      signature,
      apiKey,
      cloudName,
      folder,
    });
  } catch (err) {
    console.error('Cloudinary sign error', err);
    res.status(500).json({ error: 'sign_error', message: String(err?.message || err) });
  }
} 