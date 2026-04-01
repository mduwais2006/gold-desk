const { db } = require('../config/firebase');

// @desc    Receive UPI Webhook from payment gateway (e.g. PhonePe/Razorpay)
// @route   POST /api/webhook/upi
// @access  Public (Requires signature verification in production)
const handleUpiWebhook = async (req, res) => {
    try {
        // Log the incoming webhook for debugging
        console.log("UPI Webhook Received:", req.body);
        
        // In a real scenario, you would:
        // 1. Verify the signature headers from the gateway.
        // 2. Extract transaction ID, amount, and status.
        // 3. Match against pending orders in your DB.

        const { transactionId, amount, status, shopId } = req.body;

        // If payment is successful, notify the specific shop's frontend via Socket.io
        if (status === 'SUCCESS' || status === 'COMPLETED' || req.body.status) {
            
            // Broadcast event. We send the data so frontend can match amount or just print.
            if (req.io) {
                req.io.emit('payment-received', {
                    message: 'Payment Successful',
                    amount: amount || req.body.amount || 0,
                    transactionId: transactionId || req.body.txtId || 'N/A',
                    timestamp: new Date().toISOString()
                });
                console.log(`Socket event 'payment-received' emitted for amount: ${amount}`);
            } else {
                console.warn('Socket.io instance not found on req object.');
            }

            return res.status(200).json({ success: true, message: 'Webhook processed' });
        } else {
            return res.status(400).json({ success: false, message: 'Payment failed or invalid status' });
        }
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

module.exports = {
    handleUpiWebhook
};
