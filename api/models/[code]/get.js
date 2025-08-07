import { getCollection } from '../../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Model code is required' });
    }

    const modelsCollection = await getCollection('models');
    
    const model = await modelsCollection.findOne({ code });
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Return only the necessary fields
    const { _id, ...modelData } = model;
    
    res.status(200).json({
      success: true,
      data: {
        code: modelData.code,
        description: modelData.description,
        images: modelData.images || [],
        name: modelData.name,
        basePrice: modelData.basePrice,
        specs: modelData.specs,
      }
    });
  } catch (error) {
    console.error('GET model error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch model' 
    });
  }
} 