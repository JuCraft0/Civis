const express = require('express');
const bcrypt = require('bcryptjs');
const { run, all } = require('../database');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// GET all users (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const rows = await all("SELECT id, username, role FROM users");
        res.json({ message: "success", data: rows });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// CREATE USER Endpoint (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    console.log("Creating user:", username, role);
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            [username, hashedPassword, role || 'view_only']
        );
        res.json({ message: "User created", id: result.lastID });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// UPDATE USER Endpoint (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    try {
        let sql, params;
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            sql = "UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?";
            params = [username, hashedPassword, role, req.params.id];
        } else {
            sql = "UPDATE users SET username = ?, role = ? WHERE id = ?";
            params = [username, role, req.params.id];
        }

        const result = await run(sql, params);
        res.json({ message: "User updated", changes: result.changes });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE user (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await run("DELETE FROM users WHERE id = ?", [req.params.id]);
        res.json({ message: "deleted", changes: result.changes });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
