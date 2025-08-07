import { getCollection } from '../../../../lib/db.js';
import { requireAuth } from '../../../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require authentication
    const user = await requireAuth(req, res);
    if (res.statusCode === 401) {
      return; // Auth failed, response already sent
    }

    const { code } = req.query;
    const { description } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Model code is required' });
    }

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Valid description is required' });
    }

    const modelsCollection = await getCollection('models');
    
    // Check if model exists
    const existingModel = await modelsCollection.findOne({ code });
    if (!existingModel) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Update the model description
    const result = await modelsCollection.updateOne(
      { code },
      { 
        $set: { 
          description,
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
      message: 'Model description updated successfully',
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
    console.error('PATCH model description error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update model description' 
    });
  }
} 