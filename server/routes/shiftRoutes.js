const express = require('express');
const router = express.Router();
const Shift = require('../models/Shifts');
const Notification = require('../models/notificationModel');
const auth = require('../middleware/auth');

router.use(auth);

const isManagerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ success: false, msg: 'Access Denied. Admin/Manager required.' });
  }
};

// Employee: Get Next Shift
router.get('/next-upcoming', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shifts = await Shift.find({ staffId: req.user.id, date: { $gte: today } }).sort({ date: 'asc' });
    let nextShift = null;
    const now = new Date();
    for (const shift of shifts) {
      if (!shift.endTime) continue; 
      const [hours, minutes] = shift.endTime.split(':').map(Number);
      const shiftEndDate = new Date(shift.date);
      shiftEndDate.setHours(hours, minutes, 0, 0);
      if (shiftEndDate > now) { nextShift = shift; break; }
    }
    res.json({ data: nextShift || null });
  } catch (err) { res.status(500).json({ error: 'Error fetching shift' }); }
});

// Main Scheduler Route
router.get('/', async (req, res) => {
  const { startDate, endDate, staffId } = req.query;
  try {
    let query = {};
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      if (staffId) query.staffId = staffId;
    } else {
      query.staffId = req.user.id;
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lt: end };
    } else {
      return res.json({ data: [] });
    }
    const shifts = await Shift.find(query).populate('staffId', 'name email');
    res.json({ data: shifts });
  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ error: 'Error fetching shifts' });
  }
});

// Create Shift
router.post('/', isManagerOrAdmin, async (req, res) => {
  try {
    const shift = new Shift(req.body);
    await shift.save();
    
    // Clean Date Formatting
    const shiftDate = new Date(shift.date).toISOString().split('T')[0];
    
    try {
        await Notification.create({
            type: 'shift_update',
            title: 'New Shift Assigned',
            message: `You have been assigned a ${shift.shiftType} shift on ${shiftDate}.`,
            targetId: shift.staffId,
            status: 'unread'
        });
    } catch (nErr) {
        console.error("Notification failed", nErr);
    }

    res.status(201).json({ data: shift });
  } catch (err) {
    console.error('Invalid shift data:', err);
    res.status(400).json({ error: 'Invalid shift data' });
  }
});

// Update Shift
router.put('/:id', isManagerOrAdmin, async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    
    // Clean Date Formatting
    const shiftDate = new Date(shift.date).toISOString().split('T')[0];

    try {
        await Notification.create({
            type: 'shift_update',
            title: 'Shift Updated',
            message: `Your ${shift.shiftType} shift on ${shiftDate} has been updated.`,
            targetId: shift.staffId,
            status: 'unread'
        });
    } catch (nErr) { console.error("Notification failed", nErr); }

    res.json({ data: shift });
  } catch (err) {
    console.error('Invalid shift data:', err);
    res.status(400).json({ error: 'Invalid shift data' });
  }
});

router.delete('/:id', isManagerOrAdmin, async (req, res) => {
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