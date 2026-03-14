const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

router.post('/', async (req, res) => {
    try {
        const { name, email, description } = req.body;

        if (!name || !email || !description) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: 'golddesk.help@gmail.com',
            subject: `New Enquiry from ${name}`,
            text: `You have received a new enquiry from the Gold Desk Contact Form.\n\nName: ${name}\nEmail: ${email}\n\nDescription:\n${description}`
        };

        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ message: 'Sent successfully' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ message: 'Failed to send enquiry. Please try again later.' });
    }
});

module.exports = router;
