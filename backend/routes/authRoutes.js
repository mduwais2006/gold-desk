const express = require('express');
const router = express.Router();
const { registerUser, loginUser, verifyOtp, forgotPasswordRequest, forgotPasswordReset } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password/request', forgotPasswordRequest);
router.post('/forgot-password/reset', forgotPasswordReset);

module.exports = router;
