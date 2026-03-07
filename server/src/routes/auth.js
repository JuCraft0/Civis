const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get } = require('../database');
const { SECRET_KEY } = require('../middlewares/auth');

const router = express.Router();

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
