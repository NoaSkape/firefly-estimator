import { MongoClient } from 'mongodb';

let client = null;
let db = null;

export async function getDb() {
  // Return cached connection if healthy
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  // Create a fresh client and connect. Only assign globals after success.
  let localClient = null;
  try {
    const debug = process.env.DEBUG_ADMIN === 'true'
    if (debug) console.log('[DEBUG_ADMIN] Mongo: connecting', { hasUri: !!uri, db: process.env.MONGODB_DB })
    localClient = new MongoClient(uri, { 
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      sslValidate: true,
      retryWrites: true,
      w: 'majority'
    });
    await localClient.connect();
    const databaseName = process.env.MONGODB_DB || undefined;
    const connectedDb = localClient.db(databaseName);
    if (!connectedDb) {
      throw new Error('Failed to resolve MongoDB database');
    }
    // Promote to globals after everything is successful
    client = localClient;
    db = connectedDb;
    return db;
  } catch (err) {
    // Ensure we do not cache a half-open client
    try { await localClient?.close(); } catch {}
    client = null;
    db = null;
    console.error('MongoDB connection error:', err?.message || err);
    throw err;
  }
}

export async function getCollection(collectionName) {
  const database = await getDb();
  return database.collection(collectionName);
}

export async function closeConnection() {
  if (client) {
    try { await client.close(); } catch {}
    client = null;
    db = null;
  }
}