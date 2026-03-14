const express = require('express');
const router = express.Router();
const { getBills, createBill, getAnalytics } = require('../controllers/billingController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getBills)
    .post(protect, createBill);

router.route('/analytics')
    .get(protect, getAnalytics);

module.exports = router;
