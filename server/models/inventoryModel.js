const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Inventory item must have a name'],
    trim: true,
  },
  sku: { 
    type: String, 
    unique: true, 
    required: [true, 'SKU (Stock Keeping Unit) is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  unitPrice: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: 0,
  },
  supplier: {
    name: String,
    contact: String,
    email: String,
    address: String
  },
  lastRestocked: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Inventory', inventorySchema);
