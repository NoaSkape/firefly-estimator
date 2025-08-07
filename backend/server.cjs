const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectToDatabase, getCollection, testConnection, initializeDatabase, COLLECTIONS } = require('./db.cjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Initialize MongoDB connection
async function initializeServer() {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (isConnected) {
      // Initialize database with indexes
      await initializeDatabase();
      console.log('✅ Server initialized with MongoDB connection');
    } else {
      console.log('⚠️ Server running without MongoDB connection');
    }
  } catch (error) {
    console.error('❌ Error initializing server:', error);
  }
}

// Routes
app.get('/api/health', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({ 
      status: 'OK', 
      message: 'Firefly Estimator API is running',
      database: isConnected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      message: 'Firefly Estimator API is running',
      database: 'error'
    });
  }
});

// Save quote to database
app.post('/api/quotes', async (req, res) => {
  try {
    const { quoteData, userId } = req.body;
    
    const quotesCollection = await getCollection(COLLECTIONS.QUOTES);
    
    const quote = {
      ...quoteData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await quotesCollection.insertOne(quote);
    
    res.json({
      success: true,
      message: 'Quote saved successfully',
      quoteId: result.insertedId
    });
  } catch (error) {
    console.error('Save quote error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving quote',
      error: error.message
    });
  }
});

// Get quotes for a user
app.get('/api/quotes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const quotesCollection = await getCollection(COLLECTIONS.QUOTES);
    
    const quotes = await quotesCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json({
      success: true,
      quotes
    });
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving quotes',
      error: error.message
    });
  }
});

// Generate PDF quote
app.post('/api/quote/pdf', async (req, res) => {
  try {
    const { quoteData } = req.body;
    
    // TODO: Implement PDF generation logic
    // This will use html2canvas + jsPDF on the frontend
    // Backend can handle complex PDF generation if needed
    
    res.json({
      success: true,
      message: 'PDF generation endpoint ready',
      data: quoteData
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
});

// Calculate delivery fee
app.post('/api/calculate-delivery', async (req, res) => {
  try {
    const { zipCode, address } = req.body;
    
    // TODO: Implement delivery calculation logic
    // This will integrate with Google Maps API or similar
    // For now, return a placeholder calculation
    
    const baseDeliveryFee = 2500; // Base delivery fee
    const distanceMultiplier = Math.random() * 0.5 + 0.5; // Placeholder
    const calculatedFee = Math.round(baseDeliveryFee * distanceMultiplier);
    
    res.json({
      success: true,
      deliveryFee: calculatedFee,
      distance: Math.round(Math.random() * 500 + 50), // Placeholder distance
      estimatedDays: Math.round(Math.random() * 7 + 3) // Placeholder delivery time
    });
  } catch (error) {
    console.error('Delivery calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating delivery fee',
      error: error.message
    });
  }
});

// Serve static files from React build
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Firefly Estimator API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  
  // Initialize server with MongoDB
  initializeServer();
}); 