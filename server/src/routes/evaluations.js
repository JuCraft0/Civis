const express = require('express');
const { run, all } = require('../database');
const { authenticateToken, requireEditor } = require('../middlewares/auth');
const { calculateEvaluation, questions } = require('../services/evaluationService');

const router = express.Router();

// Get the list of 100 questions
router.get('/questions', authenticateToken, (req, res) => {
    res.json({ message: "success", data: questions });
});

// Get evaluations for a person
router.get('/person/:personId', authenticateToken, async (req, res) => {
    try {
        const personId = req.params.personId;
        const rows = await all(`
            SELECT id, person_id, answers_json, results_json, created_at
            FROM evaluations
            WHERE person_id = $1
            ORDER BY created_at DESC
        `, [personId]);

        res.json({ message: "success", data: rows.map(r => ({
            ...r,
            answers: JSON.parse(r.answers_json),
            results: JSON.parse(r.results_json)
        }))});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit a new evaluation
router.post('/person/:personId', authenticateToken, requireEditor, async (req, res) => {
    try {
        const personId = req.params.personId;
        const { answers } = req.body; // Expects { "1": 4, "2": 5, ... }

        if (!answers || Object.keys(answers).length === 0) {
            return res.status(400).json({ error: "Answers are required" });
        }

        // Calculate dimensions and archetypes
        const results = calculateEvaluation(answers);

        // Save to database
        const result = await run(`
            INSERT INTO evaluations (person_id, answers_json, results_json)
            VALUES ($1, $2, $3)
        `, [personId, JSON.stringify(answers), JSON.stringify(results)]);

        res.status(201).json({ 
            message: "Evaluation saved successfully", 
            id: result.lastID,
            results
        });

    } catch (err) {
        console.error("POST /api/evaluations error:", err);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
