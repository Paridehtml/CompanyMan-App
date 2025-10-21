const express = require('express');
const router = express.Router();
const Shift = require('../models/Shifts');
const auth = require('../middleware/auth'); // import del middleware

router.use(auth);

// GET /shifts?month=YYYY-MM&staffId=...
router.get('/', async (req, res) => {
  const { month, staffId } = req.query;

  try {
    let query = {};

    
    if (req.user.isAdmin) {
      if (staffId) query.staffId = staffId;
    } else {
    
      query.staffId = req.user.id;
    }

    if (month) {
      const start = new Date(month + '-01');
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      query.date = { $gte: start, $lt: end };
    }

    const shifts = await Shift.find(query).populate('staffId', 'name email');
    res.json({ data: shifts });
  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ error: 'Error fetching shifts' });
  }
});

// POST /shifts
router.post('/', async (req, res) => {
  try {
    const shift = new Shift(req.body);
    await shift.save();
    res.status(201).json({ data: shift });
  } catch (err) {
    console.error('Invalid shift data:', err);
    res.status(400).json({ error: 'Invalid shift data' });
  }
});

// PUT /shifts/:id
router.put('/:id', async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    res.json({ data: shift });
  } catch (err) {
    console.error('Invalid shift data:', err);
    res.status(400).json({ error: 'Invalid shift data' });
  }
});

// DELETE /shifts/:id
router.delete('/:id', async (req, res) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    res.json({ message: 'Shift deleted' });
  } catch (err) {
    console.error('Error deleting shift:', err);
    res.status(500).json({ error: 'Error deleting shift' });
  }
});

module.exports = router;
