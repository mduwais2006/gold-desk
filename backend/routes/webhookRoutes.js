const express = require('express');
const router = express.Router();
const { handleUpiWebhook } = require('../controllers/webhookController');

router.post('/upi', handleUpiWebhook);

module.exports = router;
