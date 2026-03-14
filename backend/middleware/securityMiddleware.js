const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Extremely Strict Rate Limiter (Anti-DDoS & Brute Force)
const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 200, // Stricter normal API limits
    message: 'Too many requests from this IP! Defense system has temporarily blocked access to prevent DDoS.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour completely locked out after failed bursts
    max: 15, // Max 15 login/signup guesses per hour
    message: 'High Risk Alert: Too many authentication attempts! IP blocked for 1 hour to prevent hacking.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Custom Anti-Injection & Deep Logic Sanitization (Pro-Level Defense)
const antiHackMiddleware = (req, res, next) => {
    // Advanced NoSQL & XSS Scrubbing
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                // Remove scripted payloads
                req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); 
                // Advanced NoSQL pattern blocking ($ operators, braces)
                req.body[key] = req.body[key].replace(/\$|\{|\}|\[|\]/g, ''); 
                // Block potential SQL injection fragments
                req.body[key] = req.body[key].replace(/SELECT|UPDATE|DELETE|INSERT|DROP|--|;/gi, ''); 
            }
        }
    }
    // Prevent Parameter Pollution
    if (req.query) {
        for (let key in req.query) {
             if (Array.isArray(req.query[key])) req.query[key] = req.query[key][0];
        }
    }
    next();
};

const securityMiddleware = (app) => {
    // Advanced Helmet configurations - Immutable Security Protocols
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
                connectSrc: ["'self'", "https://firestore.googleapis.com", "https://identitytoolkit.googleapis.com"],
                imgSrc: ["'self'", "data:", "https://*"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        dnsPrefetchControl: { allow: false },
        frameguard: { action: "deny" }
    }));

    app.use(antiHackMiddleware); 
    app.use('/api/', apiLimiter);
    app.use('/api/auth/', authLimiter);
    
    // Security Header Hardening
    app.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        next();
    });
};

module.exports = { securityMiddleware, authLimiter };
