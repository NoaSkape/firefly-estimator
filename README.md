# Firefly Estimator

A fullstack Vite + React + Node.js application for Firefly Tiny Homes sales agents to rapidly quote and close deals.

## 🚀 Features

- **Quote Builder**: Interactive interface to select models, options, and input client information
- **Real-time Pricing**: Live price calculation with tax and delivery fees
- **PDF Generation**: Professional quote PDFs with branding and line items
- **Delivery Calculator**: Estimate delivery fees based on ZIP code
- **Excel Import**: Parse option lists from Excel files
- **Responsive Design**: Modern UI with TailwindCSS

## 📁 Project Structure

```
firefly-estimator/
├── src/
│   ├── pages/
│   │   ├── QuoteBuilder.jsx      # Main quote building interface
│   │   └── QuotePDFPreview.jsx   # PDF preview and generation
│   ├── components/
│   │   ├── ModelSelector.jsx     # Base model selection
│   │   ├── OptionSelector.jsx    # Add-ons and upgrades
│   │   ├── PriceBreakdown.jsx    # Live price summary
│   │   └── ClientInfoForm.jsx    # Client information form
│   ├── utils/
│   │   ├── generatePDF.js        # PDF generation with jsPDF
│   │   └── parseOptionsExcel.js  # Excel file parsing
│   └── assets/
│       └── firefly-logo.svg      # Company logo
├── backend/
│   └── server.js                 # Express API server
├── data/
│   ├── models.json               # Base model specifications
│   └── options.json              # Categorized options and upgrades
└── public/
    └── vite.svg
```

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Hook Form** - Form handling and validation
- **jsPDF + html2canvas** - PDF generation
- **xlsx** - Excel file parsing

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd firefly-estimator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev:full
   
   # Or start them separately
   npm run dev        # Frontend (Vite)
   npm run server     # Backend (Express)
   ```

5. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📋 Usage

### Quote Building Flow

1. **Select Base Model**: Choose from Firefly 20, 24, or 28 models
2. **Customize Options**: Add upgrades from categories like:
   - Exterior Options (metal roof, siding, etc.)
   - Interior Upgrades (hardwood floors, granite countertops)
   - Appliances & Technology (washer/dryer, smart home)
   - Comfort & Climate (HVAC, insulation)
   - Storage Solutions (closets, exterior storage)
3. **Enter Client Information**: Name, contact details, delivery address
4. **Review Pricing**: Real-time calculation with tax and delivery
5. **Generate PDF**: Download professional quote document

### API Endpoints

- `GET /api/health` - Health check
- `POST /api/quote/pdf` - Generate PDF quote
- `POST /api/calculate-delivery` - Calculate delivery fee

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# API Keys (Add your actual keys)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
DELIVERY_API_KEY=your_delivery_api_key_here

# Database (Future use)
DATABASE_URL=your_database_url_here

# Authentication (Future use with Clerk)
CLERK_SECRET_KEY=your_clerk_secret_key_here
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
```

### Data Files

The application uses JSON files for models and options:

- `data/models.json` - Base model specifications
- `data/options.json` - Categorized options and upgrades

You can update these files or import from Excel using the utility functions.

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
# Deploy dist/ folder to Vercel
```

### Backend (Railway/Heroku)
```bash
# Set environment variables
# Deploy backend/ folder
```

## 🔮 Future Enhancements

- **Authentication**: Clerk integration for user management
- **Database**: Quote storage and retrieval
- **Client Portal**: Customer access to quotes and updates
- **Tax Rules**: Dynamic tax calculation based on location
- **Delivery Integration**: Real Google Maps API integration
- **Quote Management**: Save, edit, and track quotes
- **Email Integration**: Send quotes directly to clients

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email info@fireflytinyhomes.com or create an issue in the repository.
