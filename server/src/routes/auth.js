const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get } = require('../database');
const { SECRET_KEY } = require('../middlewares/auth');

const router = express.Router();

router.get('/status', async (req, res) => {
    try {
        const userCount = await get("SELECT COUNT(*) as count FROM users");
        res.json({ isSetup: parseInt(userCount.count) > 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/setup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userCount = await get("SELECT COUNT(*) as count FROM users");
        if (parseInt(userCount.count) > 0) {
            return res.status(403).json({ error: "Setup already completed" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await run(`INSERT INTO users(username, password, role) VALUES(?, ?, ?)`, [username, hashedPassword, 'admin']);

        console.log(`Initial admin account created: ${username}`);
        res.json({ message: "Setup successful" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for: ${username}`);

    try {
        const user = await get("SELECT * FROM users WHERE username = ?", [username]);
        if (!user) {
            console.log("User not found");
            return res.status(400).json({ error: "User not found" });
        }

        console.log("User found, checking password...");
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log("Invalid password");
            return res.status(400).json({ error: "Invalid password" });
        }

        console.log("Login successful");
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: user.role, username: user.username });
    } catch (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
