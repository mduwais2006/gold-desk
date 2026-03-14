const express = require('express');
const router = express.Router();
const { updateProfile, requestCredentialChange, verifyCredentialChange, requestRecoveryEmailOtp, verifyRecoveryEmail } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.put('/profile', protect, updateProfile);
router.post('/change-credentials/request', protect, requestCredentialChange);
router.post('/change-credentials/verify', protect, verifyCredentialChange);
router.post('/recovery-email/request', protect, requestRecoveryEmailOtp);
router.post('/recovery-email/verify', protect, verifyRecoveryEmail);

module.exports = router;
