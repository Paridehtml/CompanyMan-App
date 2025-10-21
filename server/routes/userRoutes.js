console.log('userRoutes.js LOADED by server/app.js');

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const User = require('../models/userModel');

// Apply auth middleware to all routes
router.use(auth);

// Route: /api/users/
router.route('/')
  .get(getAllUsers)
  .post(createUser);


// Get the current logged-in user's profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.role === 'admin',
      phone: user.phone,
      position: user.position,
      avatar: user.avatar
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ msg: 'Error fetching profile', error: err.message });
  }
});

// Route: /api/users/profile
// Update profile of currently logged-in user
router.put('/profile', async (req, res) => {
  console.log('[ROUTE CALLED] Profile update req.body:', req.body); // Debug route entry
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Defensive defaults for required fields
    user.name = req.body.name !== undefined ? req.body.name : user.name;
    user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
    user.position = req.body.position !== undefined ? req.body.position : user.position;
    user.avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;
    // Add other fields as needed

    await user.save();
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.role === 'admin',
      phone: user.phone,
      position: user.position,
      avatar: user.avatar
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ msg: 'Profile update error', error: err.message });
  }
});

// Route: /api/users/:id
router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

// Debug catch-all for unmatched routes
router.use((req, res) => {
  console.log('UNMATCHED ROUTE:', req.method, req.originalUrl, req.body);
  res.status(404).json({ msg: 'Unmatched route', method: req.method, url: req.originalUrl, body: req.body });
});

module.exports = router;
