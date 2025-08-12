// scripts/seed-models.js  (COMMONJS VERSION)
require('dotenv/config');                 // loads .env automatically
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'firefly-estimator';
const COLLECTION = process.env.MODELS_COLLECTION || 'Models';

const template = (m) => ({
  modelCode: m.code,
  slug: m.code.toLowerCase(),
  name: m.name,
  price: m.price ?? null,
  description: m.description ?? '',
  specs: {
    length: m.length ?? '',
    width: m.width ?? '',
    height: m.height ?? '',
    weight: m.weight ?? '',
    bedrooms: m.bedrooms ?? null,
    bathrooms: m.bathrooms ?? null,
    squareFeet: m.squareFeet ?? null
  },
  features: m.features ?? []
});

const MODELS = [
  { code: 'APS-630',  name: 'The Magnolia',  price: 71475, description: '1 BR / 1 Bath W/ 6ft Porch', length: "30'", width: "8'6\"", height: "13'6\"", weight: '16,000 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APS-601',  name: 'The Bluebonnet',price: 70415, description: '1 BR / 1 Bath W/ 6ft Porch', length: "20'", width: "8'6\"", height: "13'6\"", weight: '12,000 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APS-520MS',name: 'The Nest',      price: 69780, description: '1 BR / 1 Bath W/ Side Porch & Monoslope Roof', length: "20'", width: "8'6\"", height: "13'6\"", weight: '12,000 lbs', bedrooms: 1, bathrooms: 1,
    features: ['Side porch with monoslope roof','Full kitchen with appliances','Bathroom with shower','Loft sleeping area','Storage solutions']
  },
  { code: 'APS-523',  name: 'The Azul',      price: 69385, description: '1 BR / 1 Bath', length: "23'", width: "8'6\"", height: "13'6\"", weight: '13,500 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APS-528',  name: 'The Meadow',    price: 67325, description: '1 BR / 1 Bath', length: "28'", width: "8'6\"", height: "13'6\"", weight: '15,000 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APS-527B', name: 'The Lookout',   price: 67075, description: '1 BR / 1 Bath W/ Box Bay', length: "27'", width: "8'6\"", height: "13'6\"", weight: '14,500 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APS-532',  name: 'The Canyon',    price: 66505, description: '1 BR / 1 Bath', length: "32'", width: "8'6\"", height: "13'6\"", weight: '16,500 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APX-118SL',name: 'The Falcon',    price: 66471, description: '1 BR / 1 Bath W/ Bay Window & Std Loft', length: "18'", width: "8'6\"", height: "13'6\"", weight: '11,500 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APS-544',  name: 'The Hilltop',   price: 62995, description: '2 BR / 1 Bath w/ 6 Foot Porch', length: "44'", width: "8'6\"", height: "13'6\"", weight: '18,000 lbs', bedrooms: 2, bathrooms: 1 },
  { code: 'APX-150',  name: 'The Juniper XL',price: 62971, description: '1 BR / 1 Bath W/ 6ft Porch', length: "50'", width: "8'6\"", height: "13'6\"", weight: '19,000 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APS-550',  name: 'The Sage',      price: 62505, description: '1 BR / 1 Bath', length: "50'", width: "8'6\"", height: "13'6\"", weight: '19,000 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APS-531',  name: 'The Homestead', price: 61860, description: '2 BR / 1 Bath', length: "31'", width: "8'6\"", height: "13'6\"", weight: '16,000 lbs', bedrooms: 2, bathrooms: 1 },
  { code: 'APX-118',  name: 'The Willow',    price: 60971, description: '1 BR / 1 Bath W/ Bay Window', length: "18'", width: "8'6\"", height: "13'6\"", weight: '11,000 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APX-122',  name: 'The Ranch',     price: 57243, description: '1 BR / 1 Bath W/ 6ft Porch', length: "22'", width: "8'6\"", height: "13'6\"", weight: '13,000 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APS-522A', name: 'The Juniper',   price: 55985, description: '1 BR / 1 Bath', length: "22'", width: "8'6\"", height: "13'6\"", weight: '13,000 lbs', bedrooms: 1, bathrooms: 1 },
  { code: 'APS-590',  name: 'The Pecan',     price: 54785, description: 'Open kitchen with 6 Foot Porch', length: "20'", width: "8'6\"", height: "13'6\"", weight: '12,000 lbs', bedrooms: 1, bathrooms: 1 }
];

(async () => {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection(COLLECTION);

    const ops = MODELS.map((m) => ({
      updateOne: {
        filter: { $or: [{ modelCode: m.code }, { slug: m.code.toLowerCase() }] },
        update: { $set: template(m), $setOnInsert: { images: [] } },
        upsert: true
      }
    }));

    const res = await col.bulkWrite(ops, { ordered: false });
    console.log('Upserted:', res.upsertedCount, 'Modified:', res.modifiedCount);
    console.log('Seed complete for collection:', COLLECTION);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
