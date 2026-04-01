const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { db, admin } = require('../config/firebase');
const { getOtpEmailTemplate, getWelcomeEmailTemplate } = require('../utils/emailTemplates');

// BLAZING FAST: Initialize Transporter once at top level
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const isPlaceholderConfig = (user, pass) => {
    return !user || !pass || user.includes('your_email') || pass.includes('your_app_password');
};

const sendEmail = async (options) => {
    const mailOptions = {
        from: `Gold Desk Premium <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || null
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (e) {
        console.error('Failed to send real email:', e.message);
        return { success: false, error: e.message };
    }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    console.log(`\n\x1b[42m\x1b[30m 🆕 REGISTER REQUEST RECEIVED \x1b[0m`);
    console.log(`\x1b[36mTime: ${new Date().toLocaleTimeString()}\x1b[0m`);
    
    const { name, email, password, shopName, phone } = req.body;

    if (!name || !phone || !password) {
        console.log("Register 400 Error: Missing required fields");
        return res.status(400).json({ message: 'Please add all required fields (name, phone, password)' });
    }

    try {
        const usersRef = db.collection('users');
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        
        // BLAZING FAST: Parallel Registration Checks
        const [phoneSnap, emailSnap] = await Promise.all([
            usersRef.where('phone', '==', phone).get(),
            cleanEmail ? usersRef.where('email', '==', cleanEmail).get() : Promise.resolve({ empty: true })
        ]);

        if (!phoneSnap.empty) {
            console.log("Register 400 Error: Phone number already exists ->", phone);
            return res.status(400).json({ message: 'User with this phone number already exists' });
        }

        if (cleanEmail && !emailSnap.empty) {
            console.log("Register 400 Error: Email already exists ->", cleanEmail);
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUserRef = usersRef.doc();
        await newUserRef.set({
            name,
            email: cleanEmail,
            password: hashedPassword,
            shopName: shopName || '',
            phone: phone || '',
            createdAt: new Date().toISOString()
        });

        // Send Welcome Email
        if (cleanEmail) {
            console.log(`✉️ ATTEMPTING WELCOME EMAIL FOR: ${cleanEmail}`);
            const welcomeResult = await sendEmail({
                email: cleanEmail,
                subject: `👑 Welcome to ${shopName || 'Gold Desk Premium'}!`,
                message: `Hi ${name}, welcome to Gold Desk! We are excited to have you on board. Your account for ${shopName || 'your shop'} is ready.`,
                html: getWelcomeEmailTemplate(name, shopName)
            });
            if (welcomeResult.success) {
                console.log(`\x1b[42m\x1b[30m ✉️ WELCOME EMAIL SENT TO ${cleanEmail} \x1b[0m`);
            } else {
                console.log(`\x1b[41m\x1b[37m 🛑 WELCOME EMAIL FAILED FOR ${cleanEmail} \x1b[0m`, welcomeResult.error);
            }
        }

        res.status(201).json({
            _id: newUserRef.id,
            name,
            email,
            token: generateToken(newUserRef.id),
            message: 'Registration successful. Welcome email sent!'
        });
    } catch (error) {
        console.error("Firebase Registration Error:", error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Authenticate a user & send OTP via SMS or Email
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    console.log(`\n\x1b[44m\x1b[37m 🔑 LOGIN REQUEST RECEIVED \x1b[0m`);
    console.log(`\x1b[36mIdentifier: ${req.body.loginIdentifier}\x1b[0m`);
    console.log(`\x1b[36mTime: ${new Date().toLocaleTimeString()}\x1b[0m`);

    const { loginIdentifier, password, isUnlock } = req.body;
    // Strip all spaces for phone/email flexibility
    const cleanIdentifier = (loginIdentifier || '').replace(/\s/g, '').toLowerCase();

    try {
        const usersRef = db.collection('users');

        // BLAZING FAST: Parallel Database Discovery
        const [phoneSnap, phoneSnap91, emailSnap] = await Promise.all([
            usersRef.where('phone', '==', cleanIdentifier).get(),
            (cleanIdentifier.length === 10 && !isNaN(cleanIdentifier)) 
                ? usersRef.where('phone', '==', `+91${cleanIdentifier}`).get() 
                : Promise.resolve({ empty: true }),
            (cleanIdentifier.includes('@') || isNaN(cleanIdentifier))
                ? usersRef.where('email', '==', cleanIdentifier).get()
                : Promise.resolve({ empty: true })
        ]);

        let snapshot = phoneSnap;
        if (snapshot.empty) snapshot = phoneSnap91;
        if (snapshot.empty) snapshot = emailSnap;

        if (snapshot.empty) {
            return res.status(401).json({ message: 'username is wrong' });
        }

        const doc = snapshot.docs[0];
        const user = doc.data();

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'password is wrong' });
        }

        // If it's just an unlock request, bypass OTP
        if (isUnlock) {
            return res.json({
                _id: doc.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                shopName: user.shopName,
                shopAddress: user.shopAddress || '',
                recoveryEmail: user.recoveryEmail || '',
                gstEnabled: user.gstEnabled || false,
                gstPercentage: user.gstPercentage || 0,
                shopLogo: user.shopLogo || '',
                upiId: user.upiId || '',
                qrCodeUrl: user.qrCodeUrl || '',
                token: generateToken(doc.id),
                message: 'Unlocked successfully'
            });
        }

        const isEmail = cleanIdentifier.includes('@');

        if (isEmail) {
            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

            // ORGANIZED: Save OTP to user's private sub-collection
            const otpRef = db.collection('users').doc(doc.id).collection('otps').doc();
            await otpRef.set({
                otpCode: generatedOtp,
                phoneNumber: user.phone,
                loginIdentifier: cleanIdentifier,
                status: 'pending',
                createdAt: new Date().getTime(),
                expiresAt: new Date().getTime() + 90000 // 90 seconds
            });

            console.log(`✉️ EMAIL OTP FOR ${cleanIdentifier}: ${generatedOtp}`);

            const isDevMode = isPlaceholderConfig(process.env.EMAIL_USER, process.env.EMAIL_PASS);
            let emailSent = false;
            let emailError = null;

            if (!isDevMode) {
                const result = await sendEmail({
                    email: cleanIdentifier,
                    subject: `${user.shopName || 'Gold Desk'} - Your Login OTP`,
                    message: `Your login OTP is ${generatedOtp}. It is valid for 90 seconds.`,
                    html: getOtpEmailTemplate(generatedOtp, 'Login', user.shopName, user.shopLogo)
                });
                emailSent = result.success;
                emailError = result.error;
            } else {
                console.log(`\n\x1b[43m\x1b[30m  👑 GOLD DESK SMART DEV MODE  \x1b[0m`);
                console.log(`\x1b[1m\x1b[33m  OTP FOR ${cleanIdentifier} IS: \x1b[0m\x1b[1m\x1b[32m${generatedOtp}\x1b[0m`);
                console.log(`\x1b[43m\x1b[30m  USE THIS CODE TO LOG IN NOW  \x1b[0m\n`);
            }

            if (!isDevMode && !emailSent) {
                console.error(`[DEV ERROR] Email delivery failed: ${emailError}`);
                console.log(`\n\x1b[41m\x1b[37m[ ERROR ] EMAIL DELIVERY FAILED \x1b[0m`);
                console.log(`\x1b[33mLOGIN OTP FOR ${cleanIdentifier} IS:\x1b[0m \x1b[1m\x1b[32m${generatedOtp}\x1b[0m`);
                console.log(`\x1b[31mPlease check your Gmail App Password setup.\x1b[0m\n`);
                return res.status(500).json({ 
                    message: 'OTP delivery failed. Please ensure your email configuration is valid (App Passwords required for Gmail).' 
                });
            }

            return res.json({
                message: isDevMode ? 'Developer Mode: OTP sent to terminal' : 'OTP sent via Email',
                authMethod: 'email',
                loginIdentifier: cleanIdentifier,
                isDevMode
            });
        } else {
            let formattedPhone = cleanIdentifier;
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = `+91${formattedPhone}`;
            }

            return res.json({
                message: 'Proceed to Firebase Phone Auth',
                authMethod: 'firebase_phone',
                formattedPhone,
                loginIdentifier: cleanIdentifier
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP and issue JWT Token
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
    const { loginIdentifier, otp, firebaseToken } = req.body;
    // Strip all spaces for phone/email flexibility
    const cleanIdentifier = (loginIdentifier || '').replace(/\s/g, '').toLowerCase();

    try {
        const usersRef = db.collection('users');
        let userSnap = await usersRef.where('phone', '==', cleanIdentifier).get();
        
        if (userSnap.empty && cleanIdentifier.length === 10 && !isNaN(cleanIdentifier)) {
            userSnap = await usersRef.where('phone', '==', `+91${cleanIdentifier}`).get();
        }

        if (userSnap.empty && (cleanIdentifier.includes('@') || isNaN(cleanIdentifier))) {
            userSnap = await usersRef.where('email', '==', cleanIdentifier).get();
        }

        if (userSnap.empty) {
            return res.status(400).json({ message: 'User not found' });
        }

        const userDoc = userSnap.docs[0];
        const user = userDoc.data();

        if (firebaseToken) {
            await usersRef.doc(userDoc.id).update({ isVerified: true });
        } else {
            const otpRef = db.collection('users').doc(userDoc.id).collection('otps');
            const snapshot = await otpRef.where('otpCode', '==', otp).where('status', '==', 'pending').get();

            if (snapshot.empty) {
                return res.status(400).json({ message: 'otp is wrong' });
            }

            const otpDoc = snapshot.docs[0];
            const otpData = otpDoc.data();

            if (new Date().getTime() > otpData.expiresAt) {
                await otpRef.doc(otpDoc.id).update({ status: 'expired' });
                return res.status(400).json({ message: 'otp is wrong' });
            }

            await usersRef.doc(userDoc.id).update({ isVerified: true });
            await otpRef.doc(otpDoc.id).update({ status: 'verified' });
        }

        res.json({
            _id: userDoc.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            shopName: user.shopName,
            shopAddress: user.shopAddress || '',
            recoveryEmail: user.recoveryEmail || '',
            gstEnabled: user.gstEnabled || false,
            gstPercentage: user.gstPercentage || 0,
            shopLogo: user.shopLogo || '',
            upiId: user.upiId || '',
            qrCodeUrl: user.qrCodeUrl || '',
            token: generateToken(userDoc.id),
            message: 'Login successful'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Request Password Reset via Recovery Email OTP
// @route   POST /api/auth/forgot-password/request
// @access  Public
const forgotPasswordRequest = async (req, res) => {
    try {
        const { accountEmail } = req.body;
        if (!accountEmail) return res.status(400).json({ message: 'Recovery email is required' });

        const cleanEmail = accountEmail.trim().toLowerCase();
        const usersRef = db.collection('users');

        // PRIMARY: Search by the recovery email the user set in Settings
        let snapshot = await usersRef.where('recoveryEmail', '==', cleanEmail).get();

        // FALLBACK: If not found, try searching by their registered login email
        if (snapshot.empty) {
            snapshot = await usersRef.where('email', '==', cleanEmail).get();
        }

        // FALLBACK 2: Try case-insensitive match for recovery email
        // (Firestore doesn't support case-insensitive queries natively, so we do a broader fetch if still empty)
        if (snapshot.empty) {
            return res.status(404).json({ 
                message: 'No account found with this recovery email. Please ensure you have set a Recovery Email in Settings first.' 
            });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Determine which email to send OTP to
        const sendToEmail = userData.recoveryEmail || userData.email;
        if (!sendToEmail) {
            return res.status(400).json({ message: 'No recovery email linked to this account. Please set one in Settings.' });
        }

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

        const otpRef = usersRef.doc(userDoc.id).collection('otps').doc();
        await otpRef.set({
            otpCode: generatedOtp,
            type: 'forgot_password',
            status: 'pending',
            createdAt: new Date().getTime(),
            expiresAt: new Date().getTime() + 90000 // 90 seconds
        });

        console.log(`✉️ FORGOT PASSWORD OTP (Sent to ${sendToEmail}): ${generatedOtp}`);
        
        const isDevMode = isPlaceholderConfig(process.env.EMAIL_USER, process.env.EMAIL_PASS);
        let emailSent = false;
        let emailError = null;

        if (!isDevMode) {
            const result = await sendEmail({
                email: sendToEmail,
                subject: `${userData.shopName || 'Gold Desk'} - Password Reset OTP`,
                message: `Your OTP for resetting your Gold Desk password is ${generatedOtp}. It is valid for 90 seconds.`,
                html: getOtpEmailTemplate(generatedOtp, 'Password Reset', userData.shopName, userData.shopLogo)
            });
            emailSent = result.success;
            emailError = result.error;
        } else {
            console.log(`\n\x1b[43m\x1b[30m  👑 GOLD DESK RECOVERY MODE   \x1b[0m`);
            console.log(`\x1b[1m\x1b[33m  RECOVERY OTP FOR ${sendToEmail} IS: \x1b[0m\x1b[1m\x1b[32m${generatedOtp}\x1b[0m`);
            console.log(`\x1b[43m\x1b[30m  USE THIS CODE TO RESET NOW   \x1b[0m\n`);
        }

        if (!isDevMode && !emailSent) {
            console.error(`[DEV ERROR] Recovery email delivery failed: ${emailError}`);
            console.log(`\n\x1b[41m\x1b[37m[ ERROR ] RECOVERY EMAIL FAILED \x1b[0m`);
            console.log(`\x1b[33mRECOVERY OTP FOR ${sendToEmail} IS:\x1b[0m \x1b[1m\x1b[32m${generatedOtp}\x1b[0m`);
            console.log(`\n---------------------------------------------------------\n`);
            return res.status(500).json({ 
                message: 'Failed to send reset OTP to your recovery email.' 
            });
        }

        // Return masked recovery email hint (e.g. jo***@gmail.com)
        const [user, domain] = sendToEmail.split('@');
        const maskedEmail = user.slice(0, 2) + '***@' + domain;

        res.json({ 
            message: isDevMode ? 'Developer Mode: OTP sent to terminal' : 'OTP sent to your recovery email', 
            recoveryEmail: maskedEmail,
            userId: userDoc.id, // pass userId to use in reset step
            isDevMode
        });
    } catch (error) {
        console.error("Forgot password request error:", error);
        res.status(500).json({ message: 'Failed to send reset OTP' });
    }
};

// @desc    Verify OTP and Reset Password
// @route   POST /api/auth/forgot-password/reset
// @access  Public
const forgotPasswordReset = async (req, res) => {
    try {
        const { accountEmail, otp, newPassword } = req.body;
        if (!accountEmail || !otp || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const cleanEmail = accountEmail.trim().toLowerCase();
        const usersRef = db.collection('users');

        // Find user by recovery email or login email (same logic as request step)
        let snapshot = await usersRef.where('recoveryEmail', '==', cleanEmail).get();
        if (snapshot.empty) {
            snapshot = await usersRef.where('email', '==', cleanEmail).get();
        }

        if (snapshot.empty) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const userDoc = snapshot.docs[0];
        const userId = userDoc.id;

        const otpRef = usersRef.doc(userId).collection('otps');
        const otpSnap = await otpRef.where('otpCode', '==', otp)
                                    .where('type', '==', 'forgot_password')
                                    .where('status', '==', 'pending').get();

        if (otpSnap.empty) {
            return res.status(400).json({ message: 'otp is wrong' });
        }

        const otpDoc = otpSnap.docs[0];
        if (new Date().getTime() > otpDoc.data().expiresAt) {
            await otpRef.doc(otpDoc.id).update({ status: 'expired' });
            return res.status(400).json({ message: 'otp is wrong' });
        }

        // Hash and save the new password in Firestore
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await usersRef.doc(userId).update({ password: hashedPassword });

        // Clean up: delete the OTP after use
        await otpRef.doc(otpDoc.id).delete();

        res.json({ message: 'Password reset successfully. Please log in with your new password.' });
    } catch (error) {
        console.error("Forgot password verify error:", error);
        res.status(500).json({ message: error.message || 'Failed to reset password' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    verifyOtp,
    forgotPasswordRequest,
    forgotPasswordReset
};
