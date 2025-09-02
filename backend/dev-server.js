import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = 3001;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://fireflyestimator.com',
      'https://www.fireflyestimator.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Preflight handling
app.options('*', cors(corsOptions));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Firefly Estimator API is running',
    environment: 'development'
  });
});

// Simple model endpoint for testing
app.get('/api/models/:code', (req, res) => {
  const { code } = req.params;
  res.json({
    modelCode: code,
    name: `Test Model ${code}`,
    description: 'This is a test model',
    images: [],
    basePrice: 50000,
    width: '8\'6"',
    squareFeet: 200
  });
});

// AI endpoints for local development
app.post('/ai/generate-content', async (req, res) => {
  try {
    console.log('[LOCAL_DEV] AI endpoint hit:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });

    const { topic, template, sections, type } = req.body;

    if (!topic || !template) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: topic and template'
      });
    }

    // Simulate AI response for local development
    const mockResponse = {
      success: true,
      content: `This is a mock AI-generated response for the topic: "${topic}" using the ${template} template.`,
      sections: sections ? sections.map(section => ({
        name: section,
        content: `Mock content for ${section} section about ${topic}.`
      })) : [],
      message: 'Local development mode - using mock AI response'
    };

    res.json(mockResponse);
  } catch (error) {
    console.error('[LOCAL_DEV] AI endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Diagnostic endpoint for AI route debugging
app.all('/ai/test', (req, res) => {
  res.json({
    method: req.method,
    path: req.path,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString(),
    message: 'AI route test endpoint working (local dev)'
  });
});

// Catch-all for unmatched API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'API endpoint not found' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Development API server running on port ${PORT}`);
  console.log(`📊 API Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 AI endpoint: http://localhost:${PORT}/ai/generate-content`);
  console.log(`🧪 AI test endpoint: http://localhost:${PORT}/ai/test`);
});