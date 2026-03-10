const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { get, all, run, db, pool } = require('../database');
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

    const { rows: photos } = await pool.query('SELECT id, mime_type FROM person_photos WHERE person_id = $1 ORDER BY id ASC', [personId]);
    person.photo_urls = photos.map(ph => `/api/people/photo/${ph.id}`);
    person.photo_url = person.photo_urls[0] || '';

    try {
        person.online_profiles = person.online_profiles ? JSON.parse(person.online_profiles) : [];
    } catch (e) {
        person.online_profiles = [];
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

        for (const p of rows) {
            const { rows: photos } = await pool.query('SELECT id FROM person_photos WHERE person_id = $1 ORDER BY id ASC', [p.id]);
            p.photo_urls = photos.map(ph => `/api/people/photo/${ph.id}`);
            p.photo_url = p.photo_urls[0] || '';

            p.family = familyRelations[p.id] || [];
            p.partners = partnerRelations[p.id] || [];
            p.social = socialRelations[p.id] || [];
            p.relationship_count = p.family.length + p.partners.length + p.social.length;
            try { p.online_profiles = p.online_profiles ? JSON.parse(p.online_profiles) : []; } catch (e) { p.online_profiles = []; }

            if (p.group_id) p.group_path = getPath(p.group_id);
        }

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

        // Safety: If the photo_url is cleared, we should also clear the face identification data
        let finalFaceDescriptor = req.body.face_descriptor !== undefined ? req.body.face_descriptor : current.face_descriptor;
        let finalAiMetadata = req.body.ai_metadata !== undefined ? req.body.ai_metadata : current.ai_metadata;

        if (photo_url === '' || photo_url === null) {
            console.log(`[Safety] Clearing AI data and photos for person ${personId} because photo_url is empty`);
            finalFaceDescriptor = null;
            finalAiMetadata = null;

            // Also delete ALL physical photos in DB for this person
            try {
                await pool.query('DELETE FROM person_photos WHERE person_id = $1', [personId]);
            } catch (e) { console.error("Error deleting photos in DB on module clear", e); }
        }

        console.log(`[Update] Person ${personId}: photo_url="${photo_url}", face_descriptor is ${finalFaceDescriptor ? 'SET' : 'NULL'}`);

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
            finalFaceDescriptor,
            finalAiMetadata,
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

        // Associated photos will be deleted automatically due to ON DELETE CASCADE
        // but we'll log it for clarity.
        console.log(`Deleting person ${personId} and all associated database photos.`);

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

        // We'll identify the photo by its position in the array.
        // Get all photos for this person.
        const { rows: photos } = await pool.query('SELECT id FROM person_photos WHERE person_id = $1 ORDER BY id ASC', [personId]);

        if (index < 0 || index >= photos.length) {
            return res.status(400).json({ error: "Photo not found at this index" });
        }

        const photoId = photos[index].id;
        await pool.query('DELETE FROM person_photos WHERE id = $1', [photoId]);

        // Re-fetch remaining photos
        const { rows: remainingPhotos } = await pool.query('SELECT id FROM person_photos WHERE person_id = $1 ORDER BY id ASC', [personId]);
        const photo_urls = remainingPhotos.map(ph => `/api/people/photo/${ph.id}`);
        const newPrimaryPhoto = photo_urls.length > 0 ? photo_urls[0] : '';

        let updateQuery = 'UPDATE people SET photo_url = ?';
        let params = [newPrimaryPhoto];

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

        let WebpBuffer;
        try {
            WebpBuffer = await sharp(req.file.buffer)
                .rotate()
                .resize(800, 800, { fit: 'cover' })
                .webp({ quality: 80 })
                .toBuffer();
        } catch (sharpErr) {
            console.error("Sharp Processing Error:", sharpErr);
            return res.status(422).json({ error: "Das Bild konnte nicht verarbeitet werden." });
        }

        // Save to Database
        // Note: If index is specified, we might want to replace an existing photo.
        // For simplicity, we'll just check if we need to replace or append.
        const { rows: existingPhotos } = await pool.query('SELECT id FROM person_photos WHERE person_id = $1 ORDER BY id ASC', [personId]);

        if (index < existingPhotos.length) {
            // Update existing
            await pool.query('UPDATE person_photos SET photo_data = $1 WHERE id = $2', [WebpBuffer, existingPhotos[index].id]);
        } else {
            // Add new
            await pool.query('INSERT INTO person_photos (person_id, photo_data) VALUES ($1, $2)', [personId, WebpBuffer]);
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

        // Update photo references in memory for return
        const { rows: updatedPhotos } = await pool.query('SELECT id FROM person_photos WHERE person_id = $1 ORDER BY id ASC', [personId]);
        const photo_urls = updatedPhotos.map(ph => `/api/people/photo/${ph.id}`);
        const newPhotoUrl = photo_urls[index] || photo_urls[0] || '';

        let updateQuery = 'UPDATE people SET photo_url = ?';
        let params = [newPhotoUrl];

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

router.get('/photo/:photoId', async (req, res) => {
    try {
        const photo = await get('SELECT photo_data, mime_type FROM person_photos WHERE id = ?', [req.params.photoId]);
        if (!photo) return res.status(404).send('Not Found');

        res.setHeader('Content-Type', photo.mime_type);
        res.send(photo.photo_data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
