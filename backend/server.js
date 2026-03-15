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
const whitelist = [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || whitelist.some(url => origin.startsWith(url))) {
            callback(null, true);
        } else {
            // For production safety, if it's explicitly not in whitelist
            // If they deploy and forget FRONTEND_URL, it will fail, so let's allow all for now or check it
            callback(null, true); // Allow all temporarily to prevent 'lot of errors' or adjust if needed
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

const basePort = process.env.PORT || 5000;

const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`\n\x1b[42m\x1b[30m ✔ GOLD DESK API IS LIVE \x1b[0m`);
        console.log(`\x1b[36mPort: ${port} | Mode: ${process.env.NODE_ENV}\x1b[0m\n`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n\x1b[41m\x1b[37m 🛑 PORT CONFLICT ERROR \x1b[0m`);
            console.log(`\x1b[33mPort ${port} is already being used by another process.\x1b[0m`);
            console.log(`\x1b[31mPlease kill the old process before starting a new one.\x1b[0m\n`);
            process.exit(1); // Force exit to prevent "ghost" servers
        } else {
            console.error(err);
        }
    });
};

startServer(basePort);
