const express = require('express');
const router = express.Router();
const Inventory = require('../models/inventoryModel');
const auth = require('../middleware/auth');


router.get('/', auth, async (req, res) => {
  const items = await Inventory.find({});
  res.json(items);
});

router.post('/', auth, async (req, res) => {
  try {
    const item = new Inventory(req.body);

    console.log('Trying to add inventory item:', req.body);

    await item.save();
    res.status(201).json(item);
  } catch (err) {

    console.error('Failed to add item:', err);
    res.status(400).json({
      msg: 'Failed to add item',
      error: err.message,
      errors: err.errors || null
    });
  }
});

router.get('/:id', auth, async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ msg: 'Item not found' });
  res.json(item);
});
// Update item
router.put('/:id', auth, async (req, res) => {
  const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) return res.status(404).json({ msg: 'Item not found' });
  res.json(item);
});

router.delete('/:id', auth, async (req, res) => {
  const item = await Inventory.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ msg: 'Item not found' });
  res.json({ msg: 'Deleted' });
});

module.exports = router;
