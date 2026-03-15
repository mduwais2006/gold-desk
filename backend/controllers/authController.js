const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { db, admin } = require('../config/firebase');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const isPlaceholderConfig = (user, pass) => {
    return !user || !pass || user.includes('your_email') || pass.includes('your_app_password');
};

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

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
    const { name, email, password, shopName, phone } = req.body;

    if (!name || !phone || !password) {
        console.log("Register 400 Error: Missing required fields");
        return res.status(400).json({ message: 'Please add all required fields (name, phone, password)' });
    }

    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('phone', '==', phone).get();

        if (!snapshot.empty) {
            console.log("Register 400 Error: Phone number already exists ->", phone);
            return res.status(400).json({ message: 'User with this phone number already exists' });
        }

        const cleanEmail = email ? email.trim().toLowerCase() : '';

        if (cleanEmail) {
            const emailSnap = await usersRef.where('email', '==', cleanEmail).get();
            if (!emailSnap.empty) {
                console.log("Register 400 Error: Email already exists ->", cleanEmail);
                return res.status(400).json({ message: 'User with this email already exists' });
            }
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
        if (email) {
            sendEmail({
                email: email,
                subject: '👑 Welcome to Gold Desk Premium!',
                message: `Hi ${name}, welcome to Gold Desk! We are excited to have you on board. Your account is ready to manage your jewelry shop analytics and billing.`,
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eab308; border-radius: 15px; background: #fff;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h1 style="color: #eab308; font-weight: 900; letter-spacing: 2px;">GOLD DESK</h1>
                            <p style="color: #64748b; letter-spacing: 0.3em; font-size: 0.8rem;">PREMIUM MANAGEMENT</p>
                        </div>
                        <h2 style="color: #0f172a;">Welcome, ${name}!</h2>
                        <p style="color: #334155; line-height: 1.6;">We're thrilled to have you join our premium jewelry shop management platform. Your account for <b>${shopName || 'your shop'}</b> has been successfully created.</p>
                        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin: 20px 0;">
                            <p style="margin: 0; color: #64748b;"><b>Your Dashboard is ready:</b></p>
                            <ul style="color: #334155; padding-left: 20px;">
                                <li>Real-time Sales Analytics</li>
                                <li>Secure Data Entry & Storage</li>
                                <li>Premium PDF Billing & Exporting</li>
                                <li>Global Time & Format Control</li>
                            </ul>
                        </div>
                        <p style="color: #334155;">Ready to get started?</p>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="http://localhost:5173" style="background: #eab308; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Login to your Dashboard</a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #f1f5f9; margin-top: 40px;" />
                        <p style="color: #94a3b8; font-size: 0.8rem; text-align: center;">This is an automated message from your Gold Desk Premium Instance.</p>
                    </div>
                `
            });
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
    const { loginIdentifier, password, isUnlock } = req.body;
    // Strip all spaces for phone/email flexibility
    const cleanIdentifier = (loginIdentifier || '').replace(/\s/g, '').toLowerCase();

    try {
        let snapshot = await db.collection('users').where('phone', '==', cleanIdentifier).get();

        if (snapshot.empty && cleanIdentifier.length === 10 && !isNaN(cleanIdentifier)) {
            snapshot = await db.collection('users').where('phone', '==', `+91${cleanIdentifier}`).get();
        }

        if (snapshot.empty && (cleanIdentifier.includes('@') || isNaN(cleanIdentifier))) {
            snapshot = await db.collection('users').where('email', '==', cleanIdentifier).get();
        }

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

            const hasEmailPass = !isPlaceholderConfig(process.env.EMAIL_USER, process.env.EMAIL_PASS);
            let emailSent = false;
            
            if (hasEmailPass) {
                const result = await sendEmail({
                    email: cleanIdentifier,
                    subject: 'Gold Desk - Your Login OTP',
                    message: `Your login OTP is ${generatedOtp}. It is valid for 90 seconds.`
                });
                emailSent = result.success;
            }

            return res.json({
                message: emailSent ? 'OTP sent via Email' : (hasEmailPass ? 'Email delivery failed. Using fallback.' : 'Email not configured. Using Demo Mode.'),
                authMethod: 'email',
                loginIdentifier: cleanIdentifier,
                devOtp: emailSent ? null : generatedOtp,
                showOtpLocally: !emailSent
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
        
        const hasEmailPass = !isPlaceholderConfig(process.env.EMAIL_USER, process.env.EMAIL_PASS);
        let emailSent = false;

        if (hasEmailPass) {
            const result = await sendEmail({
                email: sendToEmail,
                subject: 'Gold Desk - Password Reset OTP',
                message: `Your OTP for resetting your Gold Desk password is ${generatedOtp}. It is valid for 90 seconds.`
            });
            emailSent = result.success;
        }

        // Return masked recovery email hint (e.g. jo***@gmail.com)
        const [user, domain] = sendToEmail.split('@');
        const maskedEmail = user.slice(0, 2) + '***@' + domain;

        res.json({ 
            message: emailSent ? 'OTP sent to your recovery email' : (hasEmailPass ? 'Email delivery failed. Using fallback.' : 'Email not configured. Using Demo Mode.'), 
            recoveryEmail: maskedEmail,
            userId: userDoc.id, // pass userId to use in reset step
            devOtp: emailSent ? null : generatedOtp,
            showOtpLocally: !emailSent
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
