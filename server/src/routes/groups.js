const express = require('express');
const { run, all } = require('../database');
const { authenticateToken, requireEditor, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const rows = await all(`
            SELECT g1.*, g2.name as parent_name 
            FROM groups g1 
            LEFT JOIN groups g2 ON g1.parent_id = g2.id
        `);

        const groupMap = {};
        rows.forEach(g => groupMap[g.id] = g);

        const getPath = (group) => {
            const path = [];
            let current = group;
            while (current) {
                path.unshift(current.name);
                current = groupMap[current.parent_id];
            }
            return path;
        };

        const rowsWithPath = rows.map(g => ({
            ...g,
            full_path: getPath(g)
        }));

        res.json({ message: "success", data: rowsWithPath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', authenticateToken, requireEditor, async (req, res) => {
    try {
        const { name, description, parent_id } = req.body;
        if (!name) return res.status(400).json({ error: "Group name is required" });

        const result = await run(
            'INSERT INTO groups (name, description, parent_id) VALUES (?,?,?)',
            [name, description || '', parent_id || null]
        );
        res.status(201).json({
            message: "success",
            data: { id: result.lastID, name, description, parent_id }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
        const { name, description, parent_id } = req.body;
        const result = await run(`
            UPDATE groups SET 
                name = COALESCE(?, name), 
                description = COALESCE(?, description), 
                parent_id = ? 
            WHERE id = ?
        `, [name, description, parent_id, req.params.id]);
        res.json({ message: "success", changes: result.changes });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const groupId = req.params.id;
        // 1. Move children to root
        await run('UPDATE groups SET parent_id = NULL WHERE parent_id = ?', [groupId]);
        // 2. Remove group from people
        await run('UPDATE people SET group_id = NULL WHERE group_id = ?', [groupId]);
        // 3. Delete group
        const result = await run('DELETE FROM groups WHERE id = ?', [groupId]);
        res.json({ message: "deleted", changes: result.changes });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
