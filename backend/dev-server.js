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

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

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
});