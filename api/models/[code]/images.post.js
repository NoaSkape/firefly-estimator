import { getCollection } from '../../../../lib/db.js';
import { requireAuth } from '../../../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require authentication
    const user = await requireAuth(req, res);
    if (res.statusCode === 401) {
      return; // Auth failed, response already sent
    }

    const { code } = req.query;
    const { imageUrls } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Model code is required' });
    }

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ error: 'Valid image URLs array is required' });
    }

    // Validate that all URLs are strings and valid
    for (const url of imageUrls) {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid image URL provided' });
      }
    }

    const modelsCollection = await getCollection('models');
    
    // Check if model exists
    const existingModel = await modelsCollection.findOne({ code });
    if (!existingModel) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Add new image URLs to the existing images array
    const result = await modelsCollection.updateOne(
      { code },
      { 
        $push: { 
          images: { $each: imageUrls }
        },
        $set: {
          updatedAt: new Date(),
          updatedBy: user.id
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Return the updated model
    const updatedModel = await modelsCollection.findOne({ code });
    
    res.status(200).json({
      success: true,
      message: 'Model images updated successfully',
      data: {
        code: updatedModel.code,
        description: updatedModel.description,
        images: updatedModel.images || [],
        name: updatedModel.name,
        basePrice: updatedModel.basePrice,
        specs: updatedModel.specs,
      }
    });
  } catch (error) {
    console.error('POST model images error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update model images' 
    });
  }
} 