import { requireAdmin } from '../../../lib/auth.js';
import { generateUploadSignature } from '../../../lib/cloudinary.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin authentication
    const user = await requireAdmin(req, res);
    if (res.statusCode === 401 || res.statusCode === 403) {
      return; // Auth failed, response already sent
    }

    const { folder } = req.body;
    
    // Generate signed upload parameters
    const uploadParams = generateUploadSignature(folder);
    
    res.status(200).json({
      success: true,
      data: uploadParams
    });
  } catch (error) {
    console.error('Cloudinary sign error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate upload parameters' 
    });
  }
} 