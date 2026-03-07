const jwt = require('jsonwebtoken');
const SECRET_KEY = 'super_secret_key_change_this_later';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: "Admin rights required" });
    }
};

// Middleware to check editor or admin role
const requireEditor = (req, res, next) => {
    if (req.user && (req.user.role === 'editor' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: "Editor or Admin rights required" });
    }
};

module.exports = {
    SECRET_KEY,
    authenticateToken,
    requireAdmin,
    requireEditor
};
