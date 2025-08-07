import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { MODELS } from '../src/data/models.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable');
  process.exit(1);
}

async function migrateData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('baseModels');
    
    // Convert existing models to new schema
    const baseModels = MODELS.map(model => ({
      modelCode: model.id,
      name: model.name,
      subtitle: model.subtitle,
      width: model.specs.width,
      squareFeet: 0, // Will need to be calculated or added
      basePrice: model.basePrice,
      description: model.description,
      images: [], // Empty array for now
      updatedAt: new Date(),
      // Additional fields from specs
      length: model.specs.length,
      height: model.specs.height,
      weight: model.specs.weight,
      bedrooms: model.specs.bedrooms,
      bathrooms: model.specs.bathrooms
    }));
    
    // Clear existing data
    await collection.deleteMany({});
    console.log('Cleared existing baseModels collection');
    
    // Insert new data
    const result = await collection.insertMany(baseModels);
    console.log(`Successfully migrated ${result.insertedCount} models`);
    
    // Verify migration
    const count = await collection.countDocuments();
    console.log(`Total models in database: ${count}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

migrateData(); 