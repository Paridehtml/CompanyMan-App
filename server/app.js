const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- Import Routes and Middleware ---
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/auth');
const shiftRoutes = require('./routes/shiftRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const predictRoutes = require('./routes/predictRoutes');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Register Routes ---
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/predict', predictRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to CompanyMan API' });
});

// --- Database Connection ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

connectDB();

// --- Start Server ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
