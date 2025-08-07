const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI || "mongodb+srv://diggjosh:<db_password>@cluster0.tob3b2q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Database and collection names
const DB_NAME = 'firefly-estimator';
const COLLECTIONS = {
  QUOTES: 'quotes',
  USERS: 'users',
  MODELS: 'models',
  OPTIONS: 'options'
};

// Connection state
let isConnected = false;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    if (!isConnected) {
      await client.connect();
      isConnected = true;
      console.log("✅ Successfully connected to MongoDB!");
      
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
    }
    return client;
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    throw error;
  }
}

// Get database instance
async function getDatabase() {
  const client = await connectToDatabase();
  return client.db(DB_NAME);
}

// Get collection instance
async function getCollection(collectionName) {
  const db = await getDatabase();
  return db.collection(collectionName);
}

// Close database connection
async function closeConnection() {
  try {
    if (isConnected) {
      await client.close();
      isConnected = false;
      console.log("✅ MongoDB connection closed successfully!");
    }
  } catch (error) {
    console.error("❌ Error closing MongoDB connection:", error);
    throw error;
  }
}

// Test database connection
async function testConnection() {
  try {
    await connectToDatabase();
    const db = await getDatabase();
    const collections = await db.listCollections().toArray();
    console.log("📊 Available collections:", collections.map(c => c.name));
    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    return false;
  }
}

// Initialize database with sample data
async function initializeDatabase() {
  try {
    const db = await getDatabase();
    
    // Create indexes for better performance
    const quotesCollection = await getCollection(COLLECTIONS.QUOTES);
    await quotesCollection.createIndex({ createdAt: -1 });
    await quotesCollection.createIndex({ userId: 1 });
    
    const usersCollection = await getCollection(COLLECTIONS.USERS);
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    
    console.log("✅ Database initialized successfully!");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    throw error;
  }
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Closing MongoDB connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Closing MongoDB connection...');
  await closeConnection();
  process.exit(0);
});

module.exports = {
  connectToDatabase,
  getDatabase,
  getCollection,
  closeConnection,
  testConnection,
  initializeDatabase,
  COLLECTIONS,
  client
}; 