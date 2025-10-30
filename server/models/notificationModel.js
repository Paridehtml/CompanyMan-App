const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['stock_alert', 'sales_record', 'marketing_suggestion'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  targetId: { // E.g., Inventory ID or Product SKU
    type: String,
    required: false,
  },
  readBy: [{ // Track which user IDs have read the notification
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
