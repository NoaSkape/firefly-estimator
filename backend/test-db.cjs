const { testConnection, initializeDatabase, closeConnection } = require('./db');

async function testDatabaseConnection() {
  console.log('🧪 Testing MongoDB connection...');
  
  try {
    // Test connection
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ MongoDB connection successful!');
      
      // Initialize database
      await initializeDatabase();
      console.log('✅ Database initialized successfully!');
      
    } else {
      console.log('❌ MongoDB connection failed!');
    }
  } catch (error) {
    console.error('❌ Error testing database:', error);
  } finally {
    // Close connection
    await closeConnection();
    console.log('✅ Test completed');
    process.exit(0);
  }
}

// Run the test
testDatabaseConnection(); 