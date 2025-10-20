// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

// Route: /api/users/
router.route('/')
  .get(getAllUsers)
  .post(createUser);

// Route: /api/users/:id
router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
