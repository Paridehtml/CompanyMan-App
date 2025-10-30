const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Inventory = require('../models/inventoryModel');
const Notification = require('../models/notificationModel');
const auth = require('../middleware/auth'); 

// --- Configuration and Internal Models ---

const saleSchema = new mongoose.Schema({
  transaction_id: Number,
  date: Date,
  amount: Number,
  product_sku: String,
  quantity_sold: { type: Number, default: 1 },
});
const Sale = mongoose.model('Sale', saleSchema);

// Thresholds for alerts
const LOW_STOCK_THRESHOLD = 10;
const HIGH_SALES_WINDOW_DAYS = 7; 
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

// --- Utility Functions ---

/**
 * Creates a generic notification in the database.
 */
const createNotification = async (type, title, message, targetId = null) => {
  try {
    const notification = new Notification({ type, title, message, targetId });
    await notification.save();
    console.log(`Notification created: ${title}`);
  } catch (err) {
    console.error('Failed to save notification:', err);
  }
};

/**
 * Makes the Gemini API call with exponential backoff.
 */
const callGeminiAPI = async (systemPrompt, userQuery) => {
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables.");
      return "Marketing AI service is currently unavailable: API Key missing.";
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error("API returned status 403: Forbidden (Invalid API Key)");
                }
                
                if (response.status === 429 || response.status >= 500) {
                    if (attempt < MAX_RETRIES - 1) {
                        const delay = RETRY_DELAY_MS * (2 ** attempt);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                throw new Error(`API returned status ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            return text || "AI failed to generate a suggestion.";

        } catch (error) {
            console.error(`Gemini API attempt ${attempt + 1} failed:`, error.message);
            if (attempt === MAX_RETRIES - 1) {
                return "Marketing AI service is currently unavailable or failed to process the request.";
            }
        }
    }
};

/**
 * Generates low stock notifications and saves them.
 */
const checkLowStockAlerts = async () => {
  try {
    const lowStockItems = await Inventory.find({ quantity: { $lte: LOW_STOCK_THRESHOLD } });

    for (const item of lowStockItems) {
      const title = `🚨 LOW STOCK ALERT: ${item.name}`;
      const message = `Quantity for SKU ${item.sku} is only ${item.quantity}. Reorder immediately.`;
      
      const existingAlert = await Notification.findOne({
          type: 'stock_alert',
          targetId: item.sku,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (!existingAlert) {
        await createNotification('stock_alert', title, message, item.sku);
      }
    }
  } catch (err) {
    console.error('Error running low stock check:', err);
  }
};

// --- API Endpoints and Middleware ---

// Middleware to ensure user is Admin or Manager
const isManagerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ success: false, msg: 'Access Denied. Admin/Manager required.' });
  }
};


// @route   GET /api/predict/notifications
// @desc    Fetches all notifications (alerts, suggestions)
// @access  Private (Admin/Manager)
router.get('/notifications', auth, isManagerOrAdmin, async (req, res) => {
  try {
    await checkLowStockAlerts();

    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: notifications.length, data: notifications });

  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ success: false, msg: 'Server error fetching notifications.' });
  }
});

// @route   DELETE /api/predict/notifications/:id
// @desc    Deletes a specific notification
// @access  Private (Admin/Manager)
router.delete('/notifications/:id', auth, isManagerOrAdmin, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, msg: 'Notification not found' });
    }

    res.status(200).json({ success: true, msg: 'Notification deleted' });

  } catch (err) {
    console.error('Error deleting notification:', err);
    // Respond with 400 if the ID is malformed (Mongoose CastError)
    res.status(400).json({ success: false, msg: 'Invalid notification ID format.' });
  }
});


// @route   GET /api/predict/marketing-suggestion/:sku
// @desc    Generates an AI marketing suggestion for a high-stock item
// @access  Private (Admin/Manager)
router.get('/marketing-suggestion/:sku', auth, isManagerOrAdmin, async (req, res) => {
  const { sku } = req.params;
  
  try {
    const item = await Inventory.findOne({ sku });
    if (!item) {
      return res.status(404).json({ success: false, msg: 'Inventory item not found.' });
    }

    // 1. Get recent sales data for context
    const recentSales = await Sale.find({ 
        product_sku: sku, 
        date: { $gte: new Date(Date.now() - HIGH_SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000) } 
    }).sort({ date: -1 }).limit(10).lean();

    const salesSummary = recentSales.length > 0 
        ? `Total sales in the last ${HIGH_SALES_WINDOW_DAYS} days: ${recentSales.reduce((sum, sale) => sum + sale.quantity_sold, 0)} units.` 
        : `No sales recorded in the last ${HIGH_SALES_WINDOW_DAYS} days.`;

    // 2. Build the AI system prompt and user query
    const systemPrompt = `You are a creative e-commerce marketing analyst. Your goal is to provide a concise, high-impact marketing strategy based on the product and stock details provided. Suggest a promotional angle, a target audience, and a social media platform. Keep the response professional and short, under 100 words.`;

    const userQuery = `Inventory Item: ${item.name}. SKU: ${item.sku}. Description: ${item.description}. Current Stock: ${item.quantity} units. Stock is considered high. Recent Sales Context: ${salesSummary}. What is the best marketing strategy to move this product?`;

    // 3. Call the Gemini API
    const suggestionText = await callGeminiAPI(systemPrompt, userQuery);

    // 4. Create a notification to store the suggestion
    const title = `💡 Marketing Suggestion for: ${item.name}`;
    await createNotification('marketing_suggestion', title, suggestionText, item.sku);

    res.status(200).json({ 
        success: true, 
        title: title,
        suggestion: suggestionText 
    });

  } catch (err) {
    console.error('Error generating marketing suggestion:', err);
    res.status(500).json({ success: false, msg: 'Error generating suggestion.' });
  }
});


module.exports = router;