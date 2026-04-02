const express = require('express');
const router = express.Router();
const { registerUser, loginUser, verifyOtp, forgotPasswordRequest, forgotPasswordReset, forgotPasswordVerifyOtp, forgotPasswordCancel } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password/request', forgotPasswordRequest);
router.post('/forgot-password/verify-otp', forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', forgotPasswordReset);
router.get('/forgot-password/cancel', forgotPasswordCancel);

module.exports = router;
