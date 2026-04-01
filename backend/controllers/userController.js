const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { db } = require('../config/firebase');
const { getOtpEmailTemplate } = require('../utils/emailTemplates');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `Gold Desk <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || null
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (e) {
        console.error('Failed to send real email');
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, shopName, shopAddress, shopLogo, upiId, qrCodeUrl, gstEnabled, gstPercentage } = req.body;

        const userRef = db.collection('users').doc(userId);

        await userRef.update({
            name: name || undefined,
            shopName: shopName || undefined,
            shopAddress: shopAddress || undefined,
            shopLogo: shopLogo !== undefined ? shopLogo : undefined,
            upiId: upiId !== undefined ? upiId : undefined,
            qrCodeUrl: qrCodeUrl !== undefined ? qrCodeUrl : undefined,
            gstEnabled: gstEnabled !== undefined ? gstEnabled : undefined,
            gstPercentage: gstPercentage !== undefined ? Number(gstPercentage) : undefined
        });

        const userDoc = await userRef.get();
        const updatedUser = userDoc.data();

        res.json({
            _id: userDoc.id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            shopName: updatedUser.shopName,
            shopAddress: updatedUser.shopAddress || '',
            recoveryEmail: updatedUser.recoveryEmail || '',
            shopLogo: updatedUser.shopLogo || '',
            upiId: updatedUser.upiId || '',
            qrCodeUrl: updatedUser.qrCodeUrl || '',
            gstEnabled: updatedUser.gstEnabled || false,
            gstPercentage: updatedUser.gstPercentage || 0,
            token: req.headers.authorization.split(' ')[1]
        });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
};

// @desc    Send OTP to change credentials (username / password)
// @route   POST /api/users/change-credentials/request
// @access  Private
const requestCredentialChange = async (req, res) => {
    try {
        const userId = req.user.id;
        const userDoc = await db.collection('users').doc(userId).get();
        const user = userDoc.data();

        const loginIdentifier = user.email || user.phone;
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // ORGANIZED: Save security OTP to user's private sub-collection as per new schema
        const otpRef = db.collection('users').doc(userId).collection('otps').doc();
        await otpRef.set({
            loginIdentifier: loginIdentifier,
            otpCode: generatedOtp,
            type: 'credential_change',
            status: 'pending',
            createdAt: new Date().getTime(),
            expiresAt: new Date().getTime() + 300000
        });

        const isEmail = loginIdentifier.includes('@');

        if (isEmail) {
            console.log(`✉️ EMAIL OTP FOR CREDENTIAL CHANGE (${loginIdentifier}): ${generatedOtp}`);
            await sendEmail({
                email: loginIdentifier,
                subject: 'Gold Desk - Security OTP',
                message: `Your OTP to change account credentials is ${generatedOtp}. It is valid for 5 minutes.`,
                html: getOtpEmailTemplate(generatedOtp, 'Security Update')
            });
            return res.json({ message: 'OTP sent via Email', loginIdentifier, authMethod: 'email' });
        } else {
            let formattedPhone = loginIdentifier;
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = `+91${formattedPhone}`; 
            }
            return res.json({ 
                message: 'Proceed to Firebase Phone Auth', 
                authMethod: 'firebase_phone', 
                formattedPhone, 
                loginIdentifier 
            });
        }
    } catch (error) {
        console.error("OTP request error:", error);
        res.status(500).json({ message: 'Failed to request credential change' });
    }
};

// @desc    Verify OTP and change credentials
// @route   POST /api/users/change-credentials/verify
// @access  Private
const verifyCredentialChange = async (req, res) => {
    const { otp, newLoginIdentifier, newPassword, firebaseToken } = req.body;
    const userId = req.user.id;

    if (!newLoginIdentifier && !newPassword) {
        return res.status(400).json({ message: 'You must provide a new username or new password to update.' });
    }

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const user = userDoc.data();
        const currentLoginIdentifier = user.email || user.phone;

        if (!firebaseToken) {
            const otpRef = db.collection('users').doc(userId).collection('otps');
            const snapshot = await otpRef.where('otpCode', '==', otp)
                                        .where('type', '==', 'credential_change')
                                        .where('status', '==', 'pending').get();

            if (snapshot.empty) {
                return res.status(400).json({ message: 'otp is wrong' });
            }

            const otpDoc = snapshot.docs[0];
            if (new Date().getTime() > otpDoc.data().expiresAt) {
                await otpRef.doc(otpDoc.id).update({ status: 'expired' });
                return res.status(400).json({ message: 'otp is wrong' });
            }
            
            await otpRef.doc(otpDoc.id).update({ status: 'verified' });
        }

        const updateData = {};

        if (newPassword && newPassword.length >= 6) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(newPassword, salt);
        }

        if (newLoginIdentifier && newLoginIdentifier !== currentLoginIdentifier) {
            const checkPhone = await db.collection('users').where('phone', '==', newLoginIdentifier).get();
            const checkEmail = await db.collection('users').where('email', '==', newLoginIdentifier).get();
            
            if (!checkPhone.empty || !checkEmail.empty) {
                return res.status(400).json({ message: 'This Username/Email/Phone is already registered to another user' });
            }

            if (newLoginIdentifier.includes('@')) {
                updateData.email = newLoginIdentifier;
                updateData.phone = '';
            } else {
                updateData.phone = newLoginIdentifier;
                updateData.email = '';
            }
        }

        if (Object.keys(updateData).length > 0) {
            await db.collection('users').doc(userId).update(updateData);
        }

        const finalDoc = await db.collection('users').doc(userId).get();
        const finalUser = finalDoc.data();

        res.json({ 
            message: 'Credentials updated successfully',
            user: {
                 _id: finalDoc.id,
                name: finalUser.name,
                email: finalUser.email,
                phone: finalUser.phone,
                shopName: finalUser.shopName,
                shopAddress: finalUser.shopAddress || '',
                recoveryEmail: finalUser.recoveryEmail || '',
                gstEnabled: finalUser.gstEnabled || false,
                gstPercentage: finalUser.gstPercentage || 0,
                shopLogo: finalUser.shopLogo || '',
                upiId: finalUser.upiId || '',
                qrCodeUrl: finalUser.qrCodeUrl || '',
                token: req.headers.authorization.split(' ')[1] 
            }
        });
    } catch (error) {
        console.error("Verify change error", error);
        res.status(500).json({ message: 'Failed to update credentials' });
    }
};

// @desc    Request OTP for Recovery Email
// @route   POST /api/users/recovery-email/request
// @access  Private
const requestRecoveryEmailOtp = async (req, res) => {
    try {
        const { recoveryEmail } = req.body;
        if (!recoveryEmail) return res.status(400).json({ message: 'Recovery email is required' });

        const cleanRecoveryEmail = recoveryEmail.trim().toLowerCase();
        if (!cleanRecoveryEmail.includes('@') || !cleanRecoveryEmail.includes('.')) {
            return res.status(400).json({ message: 'Invalid recovery email format' });
        }

        const userId = req.user.id;
        const usersRef = db.collection('users');
        
        // 1. Check if it matches current user's recovery email (Fast check using req.user)
        if (req.user.recoveryEmail?.toLowerCase() === cleanRecoveryEmail) {
            return res.status(400).json({ message: 'already entered' });
        }

        // 2. Check if ANOTHER user already has this as their primary email or recovery email
        const emailCheck = await usersRef.where('email', '==', cleanRecoveryEmail).limit(2).get();
        const recoveryCheck = await usersRef.where('recoveryEmail', '==', cleanRecoveryEmail).limit(2).get();

        const isUsedByOther = emailCheck.docs.some(doc => doc.id !== userId) || 
                              recoveryCheck.docs.some(doc => doc.id !== userId);

        if (isUsedByOther) {
            return res.status(400).json({ message: 'already register' });
        }

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

        const otpRef = db.collection('users').doc(userId).collection('otps').doc();
        await otpRef.set({
            recoveryEmail: cleanRecoveryEmail,
            otpCode: generatedOtp,
            type: 'recovery_email_setup',
            status: 'pending',
            createdAt: new Date().getTime(),
            expiresAt: new Date().getTime() + 120000 // 2 minutes
        });

        console.log(`✉️ RECOVERY EMAIL OTP FOR ${cleanRecoveryEmail}: ${generatedOtp}`);
        await sendEmail({
            email: cleanRecoveryEmail,
            subject: 'Gold Desk - Recovery Email Verification',
            message: `Your OTP to verify this recovery email is ${generatedOtp}. It is valid for 2 minutes.`,
            html: getOtpEmailTemplate(generatedOtp, 'Recovery Email Verification')
        });

        res.json({ message: 'OTP sent to your recovery email' });
    } catch (error) {
        console.error("Recovery OTP error:", error);
        res.status(500).json({ message: 'Failed to send recovery OTP' });
    }
};

// @desc    Verify Recovery Email OTP
// @route   POST /api/users/recovery-email/verify
// @access  Private
const verifyRecoveryEmail = async (req, res) => {
    try {
        const { otp, recoveryEmail } = req.body;
        const userId = req.user.id;
        const cleanRecoveryEmail = (recoveryEmail || '').trim().toLowerCase();

        const otpRef = db.collection('users').doc(userId).collection('otps');
        const snapshot = await otpRef.where('otpCode', '==', otp)
                                    .where('recoveryEmail', '==', cleanRecoveryEmail)
                                    .where('type', '==', 'recovery_email_setup')
                                    .where('status', '==', 'pending').get();

        if (snapshot.empty) {
            return res.status(400).json({ message: 'otp is wrong' });
        }

        const otpDoc = snapshot.docs[0];
        if (new Date().getTime() > otpDoc.data().expiresAt) {
            await otpRef.doc(otpDoc.id).update({ status: 'expired' });
            return res.status(400).json({ message: 'otp is wrong' });
        }

        // Update Recovery Email in User Profile (save as lowercase for consistent querying)
        await db.collection('users').doc(userId).update({ recoveryEmail: cleanRecoveryEmail });
        await otpRef.doc(otpDoc.id).delete(); // Delete after use

        res.json({ message: 'Recovery email updated successfully', recoveryEmail: cleanRecoveryEmail });
    } catch (error) {
        console.error("Recovery Verify error:", error);
        res.status(500).json({ message: 'Failed to verify recovery email' });
    }
};

module.exports = {
    updateProfile,
    requestCredentialChange,
    verifyCredentialChange,
    requestRecoveryEmailOtp,
    verifyRecoveryEmail
};
