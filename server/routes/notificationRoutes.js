const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/notificationModel');

router.use(auth);

// @route   GET /api/notifications/my
// @desc    Get notifications for the logged-in user
// @access  Private (All users)
router.get('/my', async (req, res) => {
  try {
    // Find notifications where:
    // 1. targetId matches the user's ID (Personal)
    // 2. OR targetId is null (Global/System broadcasts)
    const notifications = await Notification.find({
      $or: [
        { targetId: req.user.id },
        { targetId: null } 
      ]
    }).sort({ createdAt: -1 }).limit(20); // Newest first

    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    // Ensure user owns this notification
    if (notification.targetId && notification.targetId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    notification.status = 'read';
    await notification.save();
    
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

module.exports = router;