const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { db } = require('../config/firebase');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, async (req, res) => {
    try {
        const { name, email, description } = req.body;
        const userId = req.user.id;

        if (!name || !email || !description) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // SAVE TO FIREBASE properly under the specific user
        const feedbackRef = db.collection('users').doc(userId).collection('feedback').doc();
        await feedbackRef.set({
            name,
            email,
            description,
            createdAt: new Date().toISOString(),
            status: 'received'
        });

        // SEND EMAIL in background (non-blocking for speed)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `Gold Desk Support <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: 'golddesk.help@gmail.com',
            subject: `New User Feedback from ${name}`,
            text: `Gold Desk Enquiry.\n\nUser ID: ${userId}\nName: ${name}\nEmail: ${email}\n\nDescription:\n${description}\n\nThis has already been saved to the user record in Firebase.`
        };

        // Don't await email so response is instant (BLAZING FAST)
        transporter.sendMail(mailOptions).catch(e => console.error('Enquiry Email Error:', e));
        
        res.status(200).json({ message: 'Sent successfully' });
    } catch (error) {
        console.error('Contact error:', error);
        res.status(500).json({ message: 'Failed to save enquiry. Please try again later.' });
    }
});

module.exports = router;
