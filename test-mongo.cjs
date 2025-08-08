const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
console.log('Testing URI:', !!uri); // quick proof it ran
if (!uri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    process.exit(0);
  } catch (e) {
    console.error('❌ MongoDB connection error:', e.name, e.message);
    process.exit(1);
  }
})();
