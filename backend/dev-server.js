import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root, not backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Debug: Check if environment variables are loaded
console.log('🔑 DOCUSEAL_API_KEY loaded:', process.env.DOCUSEAL_API_KEY ? 'YES (length: ' + process.env.DOCUSEAL_API_KEY.length + ')' : 'NO');
console.log('📁 .env path:', path.join(__dirname, '..', '.env'));

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

// DocuSeal template creation endpoints for development
app.post('/api/admin/docuseal/init-templates/agreement', async (req, res) => {
  try {
    console.log('[DEV_SERVER] Creating DocuSeal agreement template...');
    
    // Import the template builder
    const { buildAgreementTemplate } = await import('../lib/docuseal/builders/agreement.js');
    const templateId = await buildAgreementTemplate();
    
    console.log('[DEV_SERVER] Agreement template created:', templateId);
    
    res.json({
      success: true,
      templateId,
      message: 'Agreement template created successfully via DocuSeal HTML endpoint',
      envVariable: 'DOCUSEAL_TEMPLATE_ID_AGREEMENT',
      instructions: `Add this to your .env file: DOCUSEAL_TEMPLATE_ID_AGREEMENT=${templateId}`
    });
  } catch (error) {
    console.error('[DEV_SERVER] Template creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
      details: error.message
    });
  }
});

app.post('/api/admin/docuseal/init-templates/delivery', async (req, res) => {
  try {
    console.log('[DEV_SERVER] Creating DocuSeal delivery template...');
    
    // Import the template builder
    const { buildDeliveryTemplate } = await import('../lib/docuseal/builders/pack3_delivery.js');
    const templateId = await buildDeliveryTemplate();
    
    console.log('[DEV_SERVER] Delivery template created:', templateId);
    
    res.json({
      success: true,
      templateId,
      message: 'Delivery template created successfully via DocuSeal HTML endpoint',
      envVariable: 'DOCUSEAL_TEMPLATE_ID_DELIVERY',
      instructions: `Add this to your .env file: DOCUSEAL_TEMPLATE_ID_DELIVERY=${templateId}`
    });
  } catch (error) {
    console.error('[DEV_SERVER] Template creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
      details: error.message
    });
  }
});

// Test minimal template endpoint
app.post('/api/admin/docuseal/init-templates/minimal-test', async (req, res) => {
  try {
    console.log('[DEV_SERVER] Creating minimal test template...');
    
    const { buildMinimalTestTemplate } = await import('../lib/docuseal/builders/test-minimal.js');
    const templateId = await buildMinimalTestTemplate();
    
    console.log('[DEV_SERVER] Minimal test template created:', templateId);
    
    res.json({
      success: true,
      templateId,
      message: 'Minimal test template created successfully',
      envVariable: 'DOCUSEAL_TEMPLATE_ID_MINIMAL_TEST',
      instructions: `Add this to your .env file: DOCUSEAL_TEMPLATE_ID_MINIMAL_TEST=${templateId}`
    });
  } catch (error) {
    console.error('[DEV_SERVER] Minimal test template creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create minimal test template',
      details: error.message
    });
  }
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