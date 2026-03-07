const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { get, all, run, db } = require('../database');
const { authenticateToken, requireEditor, requireAdmin } = require('../middlewares/auth');
const { buildGroupPathAsync, syncRelationships, updateAllNeighbors, updatePersonTextField } = require('../utils/helpers');
const { processImage, calculateSimilarity } = require('../services/faceRecognition');

const router = express.Router();

const upload = multer({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

async function getFullPerson(personId) {
    const person = await get(`
        SELECT p.*, g.name as group_name 
        FROM people p 
        LEFT JOIN groups g ON p.group_id = g.id 
        WHERE p.id = ?
    `, [personId]);

    if (!person) return null;

    const relations = await all(`
        SELECT p.id, p.name, p.gender, sl.type, sl.status
        FROM people p
        JOIN relationships sl ON sl.person_id_2 = p.id
        WHERE sl.person_id_1 = ?
    `, [personId]);

    person.family = relations.filter(r => r.type === 'Familie' || r.type === 'sibling').map(r => ({ id: r.id, name: r.name, gender: r.gender, status: r.status }));
    person.partners = relations.filter(r => r.type === 'Beziehung/Partner' || r.type === 'partner').map(r => ({ id: r.id, name: r.name, gender: r.gender, status: r.status }));
    person.social = relations.filter(r => r.type === 'Soziales Umfeld').map(r => ({ id: r.id, name: r.name, gender: r.gender, status: r.status }));

    try {
        person.online_profiles = person.online_profiles ? JSON.parse(person.online_profiles) : [];
    } catch (e) {
        person.online_profiles = [];
    }

    try {
        person.photo_urls = person.photo_urls ? JSON.parse(person.photo_urls) : [];
    } catch (e) {
        // Fallback: if photo_urls is empty but photo_url exists, put it in the array
        person.photo_urls = person.photo_url ? [person.photo_url] : [];
    }

    person.group_path = await buildGroupPathAsync(person.group_id);
    return person;
}

router.get('/', authenticateToken, async (req, res) => {
    try {
        const rows = await all(`
            SELECT p.*, g.name as group_name 
            FROM people p 
            LEFT JOIN groups g ON p.group_id = g.id
        `);

        if (rows.length === 0) return res.json({ message: "success", data: [] });

        const relationships = await all("SELECT * FROM relationships");
        const groups = await all("SELECT id, name, parent_id FROM groups");

        const groupMap = {};
        groups.forEach(g => groupMap[g.id] = g);

        const peopleMap = {};
        rows.forEach(p => peopleMap[p.id] = p);

        const familyRelations = {};
        const partnerRelations = {};
        const socialRelations = {};

        relationships.forEach(r => {
            const target = peopleMap[r.person_id_2];
            if (!target) return;
            const relEntry = { id: target.id, name: target.name, gender: target.gender, status: r.status };
            if (r.type === 'Familie' || r.type === 'sibling') {
                if (!familyRelations[r.person_id_1]) familyRelations[r.person_id_1] = [];
                familyRelations[r.person_id_1].push(relEntry);
            } else if (r.type === 'Beziehung/Partner' || r.type === 'partner') {
                if (!partnerRelations[r.person_id_1]) partnerRelations[r.person_id_1] = [];
                partnerRelations[r.person_id_1].push(relEntry);
            } else if (r.type === 'Soziales Umfeld') {
                if (!socialRelations[r.person_id_1]) socialRelations[r.person_id_1] = [];
                socialRelations[r.person_id_1].push(relEntry);
            }
        });

        const getPath = (groupId) => {
            const path = [];
            let current = groupMap[groupId];
            while (current) {
                path.unshift(current.name);
                current = groupMap[current.parent_id];
            }
            return path;
        };

        rows.forEach(p => {
            p.family = familyRelations[p.id] || [];
            p.partners = partnerRelations[p.id] || [];
            p.social = socialRelations[p.id] || [];
            p.relationship_count = p.family.length + p.partners.length + p.social.length;
            try { p.online_profiles = p.online_profiles ? JSON.parse(p.online_profiles) : []; } catch (e) { p.online_profiles = []; }
            try { p.photo_urls = p.photo_urls ? JSON.parse(p.photo_urls) : (p.photo_url ? [p.photo_url] : []); } catch (e) { p.photo_urls = []; }

            if (p.group_id) p.group_path = getPath(p.group_id);
        });

        res.json({ message: "success", data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const person = await getFullPerson(req.params.id);
        if (!person) return res.status(404).json({ error: "Person not found" });
        res.json({ message: "success", data: person });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', authenticateToken, requireEditor, async (req, res) => {
    try {
        const { name, age, siblings, partners, family, social, additional_info, group_id, birth_date, gender, aliases, location, photo_url, photo_urls, online_profiles } = req.body;
        if (!name) return res.status(400).json({ error: "Name is required" });

        const result = await run(
            'INSERT INTO people (name, age, siblings, partners, additional_info, group_id, birth_date, gender, aliases, location, photo_url, photo_urls, online_profiles) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [name, age || 0, '[]', '[]', additional_info || '', group_id || null, birth_date || '', gender || '', aliases || '', location || '', photo_url || '', JSON.stringify(photo_urls || []), JSON.stringify(online_profiles || [])]
        );

        const newId = result.lastID;
        // `family`, `partners`, and `social` should be JSON arrays from the frontend now
        await syncRelationships(newId, family, 'Familie');
        await syncRelationships(newId, partners, 'Beziehung/Partner');
        await syncRelationships(newId, social, 'Soziales Umfeld');

        const row = await getFullPerson(newId);
        res.status(201).json({ message: "success", data: row });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/:id', authenticateToken, requireEditor, async (req, res) => {
    try {
        const personId = req.params.id;
        const { name, age, siblings, partners, family, social, additional_info, group_id, birth_date, gender, aliases, location, photo_url, photo_urls, online_profiles } = req.body;

        const current = await get("SELECT * FROM people WHERE id = ?", [personId]);
        if (!current) return res.status(404).json({ error: "Person not found" });

        const updatedGroupId = (group_id !== undefined) ? group_id : current.group_id;

        await run(`
            UPDATE people SET 
                name = COALESCE(?, name), 
                age = COALESCE(?, age), 
                additional_info = COALESCE(?, additional_info),
                group_id = ?,
                birth_date = COALESCE(?, birth_date),
                gender = COALESCE(?, gender),
                aliases = COALESCE(?, aliases),
                location = COALESCE(?, location),
                photo_url = COALESCE(?, photo_url),
                photo_urls = COALESCE(?, photo_urls),
                online_profiles = COALESCE(?, online_profiles),
                face_descriptor = ?,
                ai_metadata = ?
            WHERE id = ?
        `, [
            name !== undefined ? name : null,
            age !== undefined ? age : null,
            additional_info !== undefined ? additional_info : null,
            updatedGroupId,
            birth_date !== undefined ? birth_date : null,
            gender !== undefined ? gender : null,
            aliases !== undefined ? aliases : null,
            location !== undefined ? location : null,
            photo_url !== undefined ? photo_url : null,
            photo_urls !== undefined ? JSON.stringify(photo_urls) : null,
            online_profiles !== undefined ? JSON.stringify(online_profiles) : null,
            req.body.face_descriptor !== undefined ? req.body.face_descriptor : current.face_descriptor,
            req.body.ai_metadata !== undefined ? req.body.ai_metadata : current.ai_metadata,
            personId
        ]);

        // Support both old inputs (siblings) and new ones (family) for backward compatibility temporarily
        await syncRelationships(personId, family || siblings, 'Familie');
        await syncRelationships(personId, partners, 'Beziehung/Partner');
        await syncRelationships(personId, social, 'Soziales Umfeld');

        if (name !== undefined && name !== current.name) {
            await updateAllNeighbors(personId);
        }

        const row = await getFullPerson(personId);
        res.json({ message: "success", data: row });
    } catch (err) {
        console.error("PUT /api/people error:", err);
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const personId = req.params.id;

        const neighbors = await all("SELECT person_id_2 as id, type FROM relationships WHERE person_id_1 = ?", [personId]);

        await run('DELETE FROM relationships WHERE person_id_1 = ? OR person_id_2 = ?', [personId, personId]);

        // Delete associated photos if exist
        const person = await get("SELECT photo_url, photo_urls FROM people WHERE id = ?", [personId]);
        if (person) {
            const filesToDelete = [];
            if (person.photo_url) filesToDelete.push(person.photo_url);
            if (person.photo_urls) {
                try {
                    const urls = JSON.parse(person.photo_urls);
                    urls.forEach(u => {
                        if (u && !filesToDelete.includes(u)) filesToDelete.push(u);
                    });
                } catch (e) { }
            }

            filesToDelete.forEach(p => {
                const filepath = path.join(__dirname, '..', '..', p);
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
            });
        }

        const result = await run('DELETE FROM people WHERE id = ?', [personId]);

        for (const n of neighbors) {
            await updatePersonTextField(n.id, n.type);
        }

        res.json({ message: "deleted", changes: result.changes });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete a specific photo by index
router.delete('/:id/photo/:index', authenticateToken, requireEditor, async (req, res) => {
    try {
        const personId = req.params.id;
        const index = parseInt(req.params.index);

        const current = await get("SELECT * FROM people WHERE id = ?", [personId]);
        if (!current) return res.status(404).json({ error: "Person not found" });

        let photo_urls = [];
        try {
            photo_urls = current.photo_urls ? JSON.parse(current.photo_urls) : [];
        } catch (e) { }

        if (index < 0 || index >= photo_urls.length || !photo_urls[index]) {
            return res.status(400).json({ error: "Photo not found at this index" });
        }

        // Delete the file
        const photoPath = photo_urls[index];
        const filepath = path.join(__dirname, '..', '..', photoPath);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        // Remove from photo_urls array
        photo_urls[index] = '';

        // Reset primary photo_url if index 0 was deleted
        const newPrimaryPhoto = (index === 0) ? '' : current.photo_url;

        // Also handle face_descriptors (we should remove the one corresponding to this image if possible)
        // Since we don't store 1:1 mapping perfectly, we'll clear all descriptors if it was the primary photo,
        // or just keep the first 5 remains. 
        // Better: Clear face descriptors and AI metadata if the MAIN photo is deleted.
        let updateQuery = 'UPDATE people SET photo_urls = ?, photo_url = ?';
        let params = [JSON.stringify(photo_urls), newPrimaryPhoto];

        if (index === 0) {
            updateQuery += ', face_descriptor = NULL, ai_metadata = NULL';
        }

        updateQuery += ' WHERE id = ?';
        params.push(personId);

        await run(updateQuery, params);

        res.json({ message: "Photo deleted", photo_urls });
    } catch (err) {
        console.error("Delete photo error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/photo', authenticateToken, requireEditor, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file provided" });
        const personId = req.params.id;
        const index = parseInt(req.body.index) || 0; // default to 0 if not provided

        const current = await get("SELECT * FROM people WHERE id = ?", [personId]);
        if (!current) return res.status(404).json({ error: "Person not found" });

        const filename = `person_${personId}_${index}_${Date.now()}.webp`;
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const filepath = path.join(uploadsDir, filename);

        console.log(`Processing upload for Person ${personId}, Index ${index}. File: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`);

        try {
            await sharp(req.file.buffer)
                .rotate() // Automatic rotation based on EXIF
                .resize(800, 800, { fit: 'cover' })
                .webp({ quality: 80 })
                .toFile(filepath);
        } catch (sharpErr) {
            console.error("Sharp Processing Error:", sharpErr);
            return res.status(422).json({ error: "Das Bild konnte nicht verarbeitet werden. Eventuell ist die Datei beschädigt oder hat ein ungültiges Format." });
        }

        // Process image with face recognition
        let ai_metadata = null;
        let face_descriptor = null;

        // Try to get face data for any photo
        try {
            const faceData = await processImage(req.file.buffer);
            if (faceData) {
                // Update AI metadata if it's the primary photo or if none exists yet
                if (index === 0 || !current.ai_metadata) {
                    ai_metadata = JSON.stringify({
                        estimated_age: faceData.estimatedAge,
                        estimated_gender: faceData.estimatedGender,
                        confidence: faceData.confidence
                    });
                }

                // Handle multi-descriptor storage (max 5)
                let allDescriptors = [];
                if (current.face_descriptor) {
                    try {
                        const parsed = JSON.parse(current.face_descriptor);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            if (Array.isArray(parsed[0])) {
                                allDescriptors = parsed; // Already array of arrays
                            } else {
                                allDescriptors = [parsed]; // Legacy single flat array format
                            }
                        }
                    } catch (e) {
                        console.error("Error parsing existing descriptor:", e);
                    }
                }

                allDescriptors.push(faceData.descriptor);
                if (allDescriptors.length > 5) {
                    allDescriptors = allDescriptors.slice(allDescriptors.length - 5);
                }

                face_descriptor = JSON.stringify(allDescriptors);
            }
        } catch (err) {
            console.error("Face processing error:", err);
        }

        let photo_urls = [];
        try {
            photo_urls = current.photo_urls ? JSON.parse(current.photo_urls) : [];
        } catch (e) { }

        // Ensure array has enough slots
        while (photo_urls.length <= index) photo_urls.push('');

        // delete old photo at this index if exists
        const oldPhoto = photo_urls[index];
        if (oldPhoto) {
            const oldFilepath = path.join(__dirname, '..', '..', oldPhoto);
            if (fs.existsSync(oldFilepath)) fs.unlinkSync(oldFilepath);
        }

        const newPhotoUrl = `uploads/${filename}`;
        photo_urls[index] = newPhotoUrl;

        // Update photo list
        let updateQuery = 'UPDATE people SET photo_urls = ?';
        let params = [JSON.stringify(photo_urls)];

        if (index === 0) {
            updateQuery += ', photo_url = ?';
            params.push(newPhotoUrl);
        }

        if (ai_metadata) {
            updateQuery += ', ai_metadata = ?';
            params.push(ai_metadata);
        }

        if (face_descriptor) {
            updateQuery += ', face_descriptor = ?';
            params.push(face_descriptor);
        }

        updateQuery += ' WHERE id = ?';
        params.push(personId);

        await run(updateQuery, params);

        res.json({ message: "success", photo_url: newPhotoUrl, photo_urls });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/search-by-face', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No photo provided" });

        const faceData = await processImage(req.file.buffer);
        if (!faceData) return res.status(400).json({ error: "No face detected in the image" });

        const peopleRows = await all("SELECT * FROM people WHERE face_descriptor IS NOT NULL");

        let matches = [];
        for (const p of peopleRows) {
            try {
                const descData = JSON.parse(p.face_descriptor);
                let descriptorsToTest = [];

                if (Array.isArray(descData) && descData.length > 0) {
                    if (Array.isArray(descData[0])) {
                        descriptorsToTest = descData; // Array of arrays
                    } else {
                        descriptorsToTest = [descData]; // Single flat array
                    }
                }

                let bestDistance = 1.0;
                for (const storedDesc of descriptorsToTest) {
                    const dist = calculateSimilarity(faceData.descriptor, storedDesc);
                    if (dist < bestDistance) {
                        bestDistance = dist;
                    }
                }

                // Log distances for debugging
                console.log(`Comparing with ${p.name} (ID: ${p.id}) - Best Distance: ${bestDistance.toFixed(4)}`);

                // Typically: < 0.4 very strong match, 0.4-0.6 likely same person, > 0.6 different person
                if (bestDistance < 0.65) {
                    const fullPerson = await getFullPerson(p.id);
                    matches.push({ person: fullPerson, distance: bestDistance });
                }
            } catch (e) {
                console.error("Error parsing descriptor for person", p.id);
            }
        }

        matches.sort((a, b) => a.distance - b.distance);

        res.json({ message: "success", matches });
    } catch (err) {
        console.error("Search by face error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/analyze', authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No photo provided" });
        const faceData = await processImage(req.file.buffer);
        if (!faceData) return res.status(400).json({ error: "No face detected" });
        res.json({ message: "success", data: faceData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
