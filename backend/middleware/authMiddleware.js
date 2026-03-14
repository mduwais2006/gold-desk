const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const userRef = db.collection('users').doc(decoded.id);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                return res.status(401).json({ message: 'Not authorized, user not found in Firebase' });
            }

            req.user = { id: userDoc.id, ...userDoc.data() };
            // Remove password from req.user
            delete req.user.password;

            next();
        } catch (error) {
            console.error("Auth Middleware Error:", error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
