import { MongoClient } from 'mongodb';

let client = null;
let db = null;
let isConnecting = false;

export async function getDb() {
  // Return cached connection if healthy
  if (db && client) {
    try {
      // Quick health check - ping the database
      await db.admin().ping();
      return db;
    } catch (pingError) {
      console.log('Database connection unhealthy, reconnecting...', pingError.message);
      // Clear the stale connection
      client = null;
      db = null;
    }
  }

  // Prevent multiple concurrent connection attempts
  if (isConnecting) {
    // Wait for existing connection attempt
    let attempts = 0;
    while (isConnecting && attempts < 50) { // 5 second max wait
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (db) return db;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  // Create a fresh client and connect. Only assign globals after success.
  let localClient = null;
  isConnecting = true;
  const debug = process.env.DEBUG_ADMIN === 'true'
  
  try {
    if (debug) console.log('[DEBUG_ADMIN] Mongo: connecting', { hasUri: !!uri, db: process.env.MONGODB_DB })
    
    // Enhanced Atlas-specific configuration for Vercel with improved TLS/SSL handling
    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000, // Increased from 5000
      socketTimeoutMS: 60000, // Increased from 45000
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      readPreference: 'primary',
      authSource: 'admin',
      // Compression
      compressors: ['snappy', 'zlib'],
      // Connection management
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 5000
    };
    
    // Add TLS settings for Atlas (modern configuration)
    if (uri.includes('mongodb+srv') || uri.includes('mongodb.net')) {
      // For Atlas, use simplified TLS configuration
      options.tls = true;
      options.tlsAllowInvalidHostnames = false;
      // Note: Don't use tlsInsecure and tlsAllowInvalidCertificates together
    }
    
    localClient = new MongoClient(uri, options);
    
    // Connect with retry logic
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await localClient.connect();
        break;
      } catch (connectError) {
        lastError = connectError;
        console.warn(`MongoDB connection attempt ${attempt} failed:`, connectError.message);
        
        if (attempt < 3) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          // Clean up failed client
          try { await localClient.close(); } catch {}
          localClient = new MongoClient(uri, options);
        }
      }
    }
    
    if (lastError && !localClient.topology?.isConnected()) {
      throw lastError;
    }
    
    const databaseName = process.env.MONGODB_DB || undefined;
    const connectedDb = localClient.db(databaseName);
    if (!connectedDb) {
      throw new Error('Failed to resolve MongoDB database');
    }
    
    // Test the connection with a simple operation
    await connectedDb.admin().ping();
    
    // Promote to globals after everything is successful
    client = localClient;
    db = connectedDb;
    
    if (debug) console.log('[DEBUG_ADMIN] MongoDB connection successful');
    return db;
  } catch (err) {
    // Ensure we do not cache a half-open client
    try { await localClient?.close(); } catch {}
    client = null;
    db = null;
    
    console.error('MongoDB connection error:', {
      message: err?.message || err,
      code: err?.code,
      name: err?.name,
      stack: debug ? err?.stack : undefined
    });
    
    // Provide more specific error messages for common issues
    if (err?.message?.includes('tlsv1 alert internal error')) {
      throw new Error('MongoDB TLS/SSL connection failed. This may be due to network issues, certificate problems, or TLS version incompatibility. Please check your connection string and network connectivity.');
    } else if (err?.message?.includes('authentication failed')) {
      throw new Error('MongoDB authentication failed. Please verify your username, password, and database permissions.');
    } else if (err?.message?.includes('ENOTFOUND') || err?.message?.includes('ECONNREFUSED')) {
      throw new Error('MongoDB server unreachable. Please check your connection string and network connectivity.');
    }
    
    throw err;
  } finally {
    isConnecting = false;
  }
}

export async function getCollection(collectionName) {
  const database = await getDb();
  return database.collection(collectionName);
}

export async function closeConnection() {
  if (client) {
    try { 
      await client.close(true); // Force close
    } catch (closeError) {
      console.warn('Error closing MongoDB connection:', closeError.message);
    }
    client = null;
    db = null;
  }
  isConnecting = false;
}

// Export for graceful shutdown handling
export async function healthCheck() {
  try {
    if (!db) return false;
    await db.admin().ping();
    return true;
  } catch {
    return false;
  }
}