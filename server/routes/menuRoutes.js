const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Menu = require('../models/MenuModel');
const Inventory = require('../models/inventoryModel');

const isManagerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ success: false, msg: 'Access Denied. Admin/Manager required.' });
  }
};

router.get('/', auth, async (req, res) => {
  try {
    const dishes = await Menu.find().sort({ category: 1, name: 1 });
    const ingredients = await Inventory.find().select('name sku unit');
    res.json({ success: true, data: { dishes, ingredients } });
  } catch (err) {
    console.error('Error fetching menu data:', err);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

router.post('/', auth, isManagerOrAdmin, async (req, res) => {
  try {
    const newDish = new Menu(req.body);
    await newDish.save();
    res.status(201).json({ success: true, data: newDish });
  } catch (err) {
    console.error('Error creating menu item:', err);
    res.status(400).json({ success: false, msg: 'Invalid data. Dish name may be taken.' });
  }
});

router.put('/:id', auth, isManagerOrAdmin, async (req, res) => {
  try {
    const updatedDish = await Menu.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedDish) {
      return res.status(440).json({ success: false, msg: 'Dish not found' });
    }
    res.json({ success: true, data: updatedDish });
  } catch (err) {
    console.error('Error updating menu item:', err);
    res.status(400).json({ success: false, msg: 'Invalid data.' });
  }
});

router.delete('/:id', auth, isManagerOrAdmin, async (req, res) => {
  try {
    const deletedDish = await Menu.findByIdAndDelete(req.params.id);
    if (!deletedDish) {
      return res.status(404).json({ success: false, msg: 'Dish not found' });
    }
    res.json({ success: true, data: {} });
  } catch (err) {
    console.error('Error deleting menu item:', err);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});


// ------------------------------------------------------------------
// @route   GET /api/menu/:id/cost
// @desc    Get the calculated food cost for a menu item
// @access  Private (Admin/Manager)
// ------------------------------------------------------------------
router.get('/:id/cost', auth, isManagerOrAdmin, async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      return res.status(404).json({ success: false, msg: 'Menu item not found' });
    }

    let totalCost = 0;
    let costBreakdown = [];
    let missingCostData = false;

    for (const item of menu.recipe) {
      const inventoryItem = await Inventory.findById(item.inventoryItem);
      
      if (!inventoryItem) {
        throw new Error(`Ingredient ${item.name} not found in inventory.`);
      }

      const {
        purchasePrice, // e.g., 1.10
        purchaseUnit,  // e.g., 'l'
        purchaseQuantity, // e.g., 1
        unit: stockingUnit // e.g., 'ml'
      } = inventoryItem;

      if (purchasePrice === null || purchasePrice < 0 || !purchaseQuantity) {
        missingCostData = true;
        costBreakdown.push({ name: item.name, cost: 0, msg: `Missing price for ${inventoryItem.name}` });
        continue;
      }

      // --- THIS IS THE NEW, CORRECTED LOGIC ---

      // 1. Calculate the price per single 'purchaseUnit'
      // e.g., $4.50 / 5 = $0.90 per 'kg' for a 5kg bag
      const pricePerPurchaseUnit = purchasePrice / purchaseQuantity;

      // 2. Define conversion factors to base units (g or ml)
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

      // 3. Check for incompatible units
      if (
        (massUnits.includes(purchaseUnit) && volUnits.includes(stockingUnit)) ||
        (volUnits.includes(purchaseUnit) && massUnits.includes(stockingUnit))
      ) {
        // e.g., You buy in 'kg' (mass) but stock in 'ml' (volume). This is not allowed.
        throw new Error(`Incompatible units for ${inventoryItem.name}: Cannot convert purchase unit (${purchaseUnit}) to stocking unit (${stockingUnit}).`);
      }

      // 4. Calculate the cost per single 'stockingUnit'
      // e.g., ( $1.10 / 1 (liter) ) / ( 1000 (ml) / 1 (liter) ) = $0.0011 per ml
      const purchaseUnitsInBase = getBaseUnit(purchaseUnit); // e.g., 1 'l' = 1000
      const stockingUnitsInBase = getBaseUnit(stockingUnit); // e.g., 1 'ml' = 1
      
      const conversionRatio = purchaseUnitsInBase / stockingUnitsInBase; // e.g., 1000 / 1 = 1000
      
      // pricePerStockUnit is the final, accurate cost per 'g' or 'ml'
      let pricePerStockUnit;
      
      if (purchaseUnit === 'unit' && stockingUnit === 'unit') {
         // Special case: 12 eggs for $3.00 (price 3.00, qty 12, unit 'unit')
         // pricePerPurchaseUnit = 3.00 / 12 = 0.25
         // A recipe needs 1 'unit' (egg). Cost is 0.25 * 1 = 0.25
         pricePerStockUnit = pricePerPurchaseUnit;
      } else {
         // e.g., $0.90 (per kg) / 1000 (g in a kg) = $0.0009 per g
         pricePerStockUnit = pricePerPurchaseUnit / conversionRatio;
      }

      // 5. Check compatibility between recipe and inventory stocking units
      const recipeUnit = item.unit;
      const requiredQty = item.quantityRequired;
      
      if (
        (massUnits.includes(stockingUnit) && !massUnits.includes(recipeUnit)) ||
        (volUnits.includes(stockingUnit) && !volUnits.includes(recipeUnit)) ||
        (stockingUnit === 'unit' && recipeUnit !== 'unit')
      ) {
         throw new Error(`Incompatible recipe unit for ${item.name}: Stock is in ${stockingUnit}, but recipe asks for ${recipeUnit}.`);
      }

      // 6. Calculate cost for the recipe
      const recipeUnitInBase = getBaseUnit(recipeUnit);
      const stockingUnitInBaseFinal = getBaseUnit(stockingUnit);

      const finalConversion = recipeUnitInBase / stockingUnitInBaseFinal;
      
      const ingredientCost = pricePerStockUnit * (requiredQty * finalConversion);
      totalCost += ingredientCost;
      costBreakdown.push({ name: item.name, cost: ingredientCost });
    }

    const profit = menu.price - totalCost;
    const profitMargin = menu.price > 0 ? (profit / menu.price) * 100 : 0;

    res.json({
      success: true,
      data: {
        menuId: menu._id,
        name: menu.name,
        price: menu.price,
        foodCost: parseFloat(totalCost.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        missingCostData: missingCostData,
        breakdown: costBreakdown,
      }
    });

  } catch (err) {
    console.error('Error calculating food cost:', err.message);
    res.status(500).json({ success: false, msg: err.message });
  }
});


module.exports = router;