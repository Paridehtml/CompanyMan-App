const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Inventory = require('../models/inventoryModel');
const Notification = require('../models/notificationModel');
const Menu = require('../models/MenuModel'); 
const auth = require('../middleware/auth'); 

const LOW_STOCK_THRESHOLD = 10;
const HIGH_STOCK_THRESHOLD = 50;
const CHECK_INTERVAL_MS = 3600000;
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;

// createNotification & callGeminiAPI functions
const createNotification = async (type, title, message, targetId = null) => {
  try {
    const notification = new Notification({ type, title, message, targetId, status: 'unread' });
    await notification.save();
    console.log(`Notification created: ${title}`);
  } catch (err) {
    console.error('Failed to save notification:', err);
  }
};

const callGeminiAPI = async (systemPrompt, userQuery) => {
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set.");
      return "Marketing AI service is unavailable: API Key missing.";
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
              if (response.status === 403) throw new Error("API status 403: Forbidden (Invalid API Key)");
              if (response.status === 429 || response.status >= 500) {
                  if (attempt < MAX_RETRIES - 1) {
                      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (2 ** attempt)));
                      continue; 
                  }
              }
              throw new Error(`API returned status ${response.status}`);
            }
            const result = await response.json();
            return result.candidates?.[0]?.content?.parts?.[0]?.text || "AI failed to generate a suggestion.";
        } catch (error) {
            console.error(`Gemini API attempt ${attempt + 1} failed:`, error.message);
            if (attempt === MAX_RETRIES - 1) return "Marketing AI service is unavailable.";
        }
    }
};


// Calculates food cost
const getMenuFoodCost = (dish) => {
  let totalCost = 0;
  let missingCostData = false;

  for (const item of dish.recipe) {
    const inventoryItem = item.inventoryItem;
    
    if (!inventoryItem) {
      missingCostData = true;
      continue;
    }

    const {
      purchasePrice, purchaseUnit, purchaseQuantity, unit: stockingUnit
    } = inventoryItem;

    if (purchasePrice === null || purchasePrice < 0 || !purchaseQuantity) {
      missingCostData = true;
      continue;
    }

    const pricePerPurchaseUnit = purchasePrice / purchaseQuantity;
    const getBaseUnit = (unit) => {
      if (unit === 'kg') return 1000;
      if (unit === 'g') return 1;
      if (unit === 'l') return 1000;
      if (unit === 'ml') return 1;
      if (unit === 'unit') return 1;
      return 1;
    };

    const massUnits = ['g', 'kg'];
    const volUnits = ['ml', 'l'];

    if (
      (massUnits.includes(purchaseUnit) && volUnits.includes(stockingUnit)) ||
      (volUnits.includes(purchaseUnit) && massUnits.includes(stockingUnit))
    ) {
      missingCostData = true;
      continue;
    }

    const purchaseUnitsInBase = getBaseUnit(purchaseUnit);
    const stockingUnitsInBase = getBaseUnit(stockingUnit);
    
    // Avoid division by zero if units are bad
    if (stockingUnitsInBase === 0) {
      missingCostData = true;
      continue;
    }
    
    const conversionRatio = purchaseUnitsInBase / stockingUnitsInBase;
    
    let pricePerStockUnit;
    if (purchaseUnit === 'unit' && stockingUnit === 'unit') {
      pricePerStockUnit = pricePerPurchaseUnit;
    } else {
      // Avoid division by zero if conversion is bad
      if (conversionRatio === 0) {
        missingCostData = true;
        continue;
      }
      pricePerStockUnit = pricePerPurchaseUnit / conversionRatio;
    }

    const recipeUnit = item.unit;
    const requiredQty = item.quantityRequired;
    
    if (
      (massUnits.includes(stockingUnit) && !massUnits.includes(recipeUnit)) ||
      (volUnits.includes(stockingUnit) && !volUnits.includes(recipeUnit)) ||
      (stockingUnit === 'unit' && recipeUnit !== 'unit')
    ) {
      missingCostData = true;
      continue;
    }

    const recipeUnitInBase = getBaseUnit(recipeUnit);
    const stockingUnitInBaseFinal = getBaseUnit(stockingUnit);
    
    // Avoid division by zero
    if (stockingUnitInBaseFinal === 0) {
      missingCostData = true;
      continue;
    }
    
    const finalConversion = recipeUnitInBase / stockingUnitInBaseFinal;
    const ingredientCost = pricePerStockUnit * (requiredQty * finalConversion);
    
    totalCost += ingredientCost;
  }

  const profit = dish.price - totalCost;
  const profitMargin = dish.price > 0 ? (profit / dish.price) * 100 : 0;

  return { foodCost: totalCost, profitMargin: profitMargin, missingCostData };
};


const runMenuAnalysisJob = async () => {
  console.log('Running background job: Analyzing menu, inventory, and profit...');
  try {
    // 1. Get all dishes, FULLY populated with their inventory items
    const allDishes = await Menu.find().populate({
      path: 'recipe.inventoryItem',
      model: 'Inventory',
    });
    
    // 2. Get all inventory items
    const allInventory = await Inventory.find();
    
    const inventoryMap = new Map(allInventory.map(item => [item._id.toString(), { quantity: item.quantity, unit: item.unit }]));
    
    // --- This analysis is from your old job (dish-first) ---
    const analysis = {
      lowStock: [],
      cannotMake: []
    };

    for (const dish of allDishes) {
      let dishStatus = 'canMake';
      let lowestStockIngredient = null;
      let minPossibleDishes = Infinity;
      let reason = 'low stock'; 

      if (!dish.recipe || dish.recipe.length === 0) continue;

      for (const ingredient of dish.recipe) {
        const inventoryItem = ingredient.inventoryItem; 
        if (!inventoryItem) {
          dishStatus = 'cannotMake';
          reason = `${ingredient.name} not in inventory DB`;
          break;
        }

        const stockData = inventoryMap.get(inventoryItem._id.toString());
        if (!stockData) {
            dishStatus = 'cannotMake';
            reason = `${ingredient.name} not in stock map`;
            break;
        }
        
        // It compares recipe unit (e.g., 'g') to inventory STOCKING unit (e.g., 'g')
        const massUnits = ['g', 'kg'];
        const volUnits = ['ml', 'l'];
        
        if (
          (massUnits.includes(inventoryItem.unit) && !massUnits.includes(ingredient.unit)) ||
          (volUnits.includes(inventoryItem.unit) && !volUnits.includes(ingredient.unit)) ||
          (inventoryItem.unit === 'unit' && ingredient.unit !== 'unit')
        ) {
          dishStatus = 'cannotMake';
          reason = `Unit mismatch for ${ingredient.name} (Recipe needs ${ingredient.unit}, stock is ${inventoryItem.unit})`;
          break;
        }

        // Convert stock to recipe units for comparison
        let stockInRecipeUnits = stockData.quantity;
        if (inventoryItem.unit === 'kg' && ingredient.unit === 'g') {
          stockInRecipeUnits *= 1000;
        } else if (inventoryItem.unit === 'l' && ingredient.unit === 'ml') {
          stockInRecipeUnits *= 1000;
        }
        // Add other conversions if needed (g to kg, ml to l)

        const possibleDishes = Math.floor(stockInRecipeUnits / ingredient.quantityRequired);

        if (possibleDishes < 1) {
          dishStatus = 'cannotMake';
          reason = `Out of ${ingredient.name}`;
          break;
        }
        
        if (possibleDishes < LOW_STOCK_THRESHOLD) {
          dishStatus = 'lowStock';
          if (possibleDishes < minPossibleDishes) {
            minPossibleDishes = possibleDishes;
            lowestStockIngredient = ingredient.name;
          }
        }
      }

      if (dishStatus === 'lowStock') {
        analysis.lowStock.push(`${dish.name} (only ${minPossibleDishes} left due to ${lowestStockIngredient})`);
      } else if (dishStatus === 'cannotMake') {
        analysis.cannotMake.push(`${dish.name} (Reason: ${reason})`);
      }
    }
    
    // Inventory-first analysis
    const expiringSoonItems = [];
    const highStockItems = [];
    const today = new Date();

    for (const item of allInventory) {
      // 1. Check for expiry
      if (item.expiresInDays && item.dateReceived) {
        const expiryDate = new Date(item.dateReceived);
        expiryDate.setDate(expiryDate.getDate() + item.expiresInDays);
        const daysRemaining = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysRemaining > 0 && daysRemaining <= 7) {
          expiringSoonItems.push({ name: item.name, id: item._id.toString(), daysRemaining: Math.ceil(daysRemaining) });
        }
      }
      // 2. Check for high stock
      if (item.quantity > HIGH_STOCK_THRESHOLD) {
        highStockItems.push({ name: item.name, id: item._id.toString(), quantity: item.quantity, unit: item.unit });
      }
    }

    // Find dishes to push
    const expiringDishSuggestions = [];
    const highStockDishSuggestions = [];
    const expiringItemIds = new Set(expiringSoonItems.map(i => i.id));
    const highStockItemIds = new Set(highStockItems.map(i => i.id));

    for (const dish of allDishes) {
      if (!dish.recipe || dish.recipe.length === 0) continue;
      
      let usesExpiringItem = false;
      let usesHighStockItem = false;
      
      for (const ingredient of dish.recipe) {
        if (ingredient.inventoryItem) {
          const ingredientId = ingredient.inventoryItem._id.toString();
          if (expiringItemIds.has(ingredientId)) usesExpiringItem = true;
          if (highStockItemIds.has(ingredientId)) usesHighStockItem = true;
        }
      }
      
      // If this dish uses a problem item, calculate its profit
      if (usesExpiringItem || usesHighStockItem) {
        const { profitMargin, missingCostData } = getMenuFoodCost(dish);
        
        if (missingCostData) continue;
        
        const suggestion = { name: dish.name, profitMargin: profitMargin.toFixed(0) };
        if (usesExpiringItem) expiringDishSuggestions.push(suggestion);
        if (usesHighStockItem) highStockDishSuggestions.push(suggestion);
      }
    }

    // Sort suggestions by most profitable first
    expiringDishSuggestions.sort((a, b) => b.profitMargin - a.profitMargin);
    highStockDishSuggestions.sort((a, b) => b.profitMargin - a.profitMargin);

    // Check if there's anything to report
    if (analysis.lowStock.length === 0 && analysis.cannotMake.length === 0 && expiringSoonItems.length === 0 && highStockItems.length === 0) {
      console.log('Menu analysis complete. All stock levels are healthy.');
      return;
    }
    
    // Check if alert was already sent
    const alertTitle = "Daily Operations & Profit Brief";
    const existing = await Notification.findOne({
      title: alertTitle,
      createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
    });

    if (existing) {
      console.log('Analysis complete. Alert already sent today.');
      return;
    }

    const systemPrompt = `You are an expert restaurant manager AI. Your goal is to write a concise daily brief for the restaurant owner. I will provide you with data.
Your brief must be actionable.
1. Start with the MOST URGENT "CANNOT MAKE" items.
2. List the "LOW ON STOCK" dishes.
3. For "EXPIRING SOON" items, strongly recommend pushing the suggested high-profit dishes to avoid waste.
4. For "SURPLUS" items, suggest promoting the related high-profit dishes.
Keep the entire brief under 100 words. Be professional and clear.
IMPORTANT: Do not use any markdown (like ** or *). Start with a capitalized title.`;
    
    // Prepare text snippets for the query
    const expiringItemsText = expiringSoonItems.map(i => `${i.name} (expires in ${i.daysRemaining} days)`).join(', ') || 'None';
    const expiringDishesText = expiringDishSuggestions.map(d => `${d.name} (${d.profitMargin}% margin)`).slice(0, 2).join(', ') || 'None';
    const highStockItemsText = highStockItems.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ') || 'None';
    const highStockDishesText = highStockDishSuggestions.map(d => `${d.name} (${d.profitMargin}% margin)`).slice(0, 2).join(', ') || 'None';

    const userQuery = `Here is my daily report:
- DISHES WE CANNOT MAKE: ${analysis.cannotMake.join(', ') || 'None'}
- DISHES LOW ON STOCK: ${analysis.lowStock.join(', ') || 'None'}
- INVENTORY EXPIRING SOON: ${expiringItemsText}
- SUGGESTIONS FOR EXPIRING ITEMS: ${expiringDishesText}
- INVENTORY IN SURPLUS: ${highStockItemsText}
- SUGGESTIONS FOR SURPLUS ITEMS: ${highStockDishesText}`;
    
    const suggestion = await callGeminiAPI(systemPrompt, userQuery);

    await createNotification('marketing_suggestion', alertTitle, suggestion);

  } catch (err) {
    console.error('Error in background menu analysis job:', err);
  }
};

runMenuAnalysisJob();
setInterval(runMenuAnalysisJob, CHECK_INTERVAL_MS);

const isManagerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ success: false, msg: 'Access Denied.' });
  }
};
router.use(auth, isManagerOrAdmin);

router.get('/low-stock', async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ["$quantity", "$lowStockThreshold"] }
    }).sort({ name: 'asc' });
    res.status(200).json({ success: true, data: lowStockItems });
  } catch (err) {
    console.error('Error fetching low stock items:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

router.get('/notifications/unread', async (req, res) => {
  try {
    const notifications = await Notification.find({ status: 'unread' }).sort({ createdAt: 'desc' });
    res.status(200).json({ success: true, data: notifications });
  } catch (err) { res.status(500).json({ success: false, msg: 'Server error' }); }
});
router.post('/notifications/mark-read', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, msg: 'Invalid request' });
  }
  try {
    await Notification.updateMany({ _id: { $in: ids } }, { $set: { status: 'read' } });
    res.status(200).json({ success: true, msg: 'Marked as read' });
  } catch (err) { res.status(500).json({ success: false, msg: 'Server error' }); }
});
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({}).sort({ createdAt: 'desc' });
    res.status(200).json({ success: true, data: notifications });
  } catch (err) { res.status(500).json({ success: false, msg: 'Server error' }); }
});
router.delete('/notifications/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ success: false, msg: 'Notification not found' });
    res.status(200).json({ success: true, msg: 'Notification deleted' });
  } catch (err) { res.status(400).json({ success: false, msg: 'Invalid ID' }); }
});

module.exports = router;