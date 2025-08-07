import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'firefly-estimator';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongo;

if (!cached) {
  cached = global.mongo = { conn: null, promise: null };
}

export async function getDb() {
  if (cached.conn) {
    return cached.conn.db(DB_NAME);
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = MongoClient.connect(MONGODB_URI, opts).then((client) => {
      return client;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn.db(DB_NAME);
}

export async function getCollection(collectionName) {
  const db = await getDb();
  return db.collection(collectionName);
}

export async function closeConnection() {
  if (cached.conn) {
    await cached.conn.close();
    cached.conn = null;
    cached.promise = null;
  }
} 