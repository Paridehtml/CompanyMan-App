const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import all route modules and middleware
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/auth');
const shiftRoutes = require('./routes/Shifts');
const auth = require('./middleware/auth');

const app = express();

// Enable CORS for all origins (adjust as needed)
app.use(cors());

// Middleware to automatically parse incoming JSON
app.use(express.json());

// Connect to MongoDB database using credentials from .env
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1); // Stop the server if DB connection fails
  }
};

connectDB();

// Application API Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);

// Simple root route for health check
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to CompanyMan API' });
});

// Start listening on chosen port (default 5001)
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export the app for testing or further integration
module.exports = app;
