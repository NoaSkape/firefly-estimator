import { MongoClient } from 'mongodb';

let client;
let db;

export async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db();
  }
  return db;
}

export async function getCollection(collectionName) {
  const db = await getDb();
  return db.collection(collectionName);
}

export async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
} 