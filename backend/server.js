const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const compression = require('compression');
const { securityMiddleware } = require('./middleware/securityMiddleware');

// Initialize Firebase
require('./config/firebase');

dotenv.config();

const app = express();

app.use(compression());
app.use(express.json());

// Strict Cross-Origin Resource Sharing (CORS) setup
const whitelist = ['http://localhost:5173']; // Add your production domain here when deployed
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by Ultra-Strict CORS Policy. Attack prevented.'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // Cache preflight response for 24 hours
}));

// Apply security middleware (helmet, rate limiting)
securityMiddleware(app);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/bills', require('./routes/billingRoutes'));
app.use('/api/data-entry', require('./routes/dataEntryRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

app.get('/', (req, res) => {
    res.send('Gold Desk API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
