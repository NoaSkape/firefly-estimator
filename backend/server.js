import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Firefly Estimator API is running' });
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
}); 