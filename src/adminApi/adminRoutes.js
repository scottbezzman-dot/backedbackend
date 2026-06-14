const express = require('express');
const router = express.Router();
const adminController = require('./adminController');

// All admin routes require admin authentication
router.use(adminController.isAdmin);

router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUserDetail);
router.get('/users/:userId/coins', adminController.getUserCoins);
router.post('/users/:userId/balance', adminController.updateUserBalance);

module.exports = router;
