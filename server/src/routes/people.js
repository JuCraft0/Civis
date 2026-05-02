const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { get, all, run, db, pool } = require('../database');
const { authenticateToken, requireEditor, requireAdmin } = require('../middlewares/auth');
const { buildGroupPathAsync, syncRelationships, updateAllNeighbors, updatePersonTextField } = require('../utils/helpers');
const { processImage, calculateSimilarity, verifyFaces, getEmbedding } = require('../services/faceRecognition');
const fetch = require('node-fetch');

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
        const { name, age, siblings, partners, family, social, additional_info, group_id, birth_date, gender, aliases, location, photo_url, photo_urls, online_profiles, immich_person_id } = req.body;

        const current = await get("SELECT * FROM people WHERE id = ?", [personId]);
        if (!current) return res.status(404).json({ error: "Person not found" });

        let updatedGroupId = (group_id !== undefined) ? group_id : current.group_id;
        if (updatedGroupId === '') updatedGroupId = null;

        // Safety: If the photo_url is cleared, we should also clear the face identification data
        let finalFaceDescriptor = req.body.face_descriptor !== undefined ? req.body.face_descriptor : current.face_descriptor;
        let finalAiMetadata = req.body.ai_metadata !== undefined ? req.body.ai_metadata : current.ai_metadata;
        let finalImmichPersonId = immich_person_id !== undefined ? immich_person_id : current.immich_person_id;

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
                immich_person_id = ?,
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
            finalImmichPersonId,
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
                        confidence: faceData.confidence,
                        bbox: faceData.bbox || null,
                        width: faceData.width || 800,
                        height: faceData.height || 800
                    });
                }

                // Handle multi-descriptor storage (max 50 per user request)
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
                if (allDescriptors.length > 50) {
                    allDescriptors = allDescriptors.slice(allDescriptors.length - 50);
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

        // ── Stage 1: Fast approximate search via stored embeddings ─────────────
        const queryData = await processImage(req.file.buffer);
        if (!queryData || !queryData.descriptor) return res.status(400).json({ error: "No face detected in the image" });
        
        const { 
            descriptor: queryEmbedding, 
            estimatedAge, 
            estimatedGender, 
            confidence, 
            bbox, 
            width, 
            height 
        } = queryData;

        const peopleRows = await all("SELECT id, name, face_descriptor FROM people WHERE face_descriptor IS NOT NULL");

        let candidates = [];
        for (const p of peopleRows) {
            try {
                const descData = JSON.parse(p.face_descriptor);
                let descriptorsToTest = [];

                if (Array.isArray(descData) && descData.length > 0) {
                    if (Array.isArray(descData[0])) {
                        descriptorsToTest = descData;
                    } else {
                        descriptorsToTest = [descData];
                    }
                }

                let bestDistance = Infinity;
                for (const storedDesc of descriptorsToTest) {
                    const dist = calculateSimilarity(queryEmbedding, storedDesc);
                    if (dist < bestDistance) bestDistance = dist;
                }

                console.log(`[Stage 1] ${p.name} (ID: ${p.id}) - Distance: ${bestDistance.toFixed(4)}`);
                candidates.push({ id: p.id, name: p.name, stage1Distance: bestDistance });
            } catch (e) {
                console.error("Error parsing descriptor for person", p.id);
            }
        }

        // Sort by distance and take top 15 candidates
        candidates.sort((a, b) => a.stage1Distance - b.stage1Distance);
        const topCandidates = candidates.slice(0, 15);

        // ── Stage 2: Precise verification against multiple photos ──────────────
        const matches = [];
        for (const candidate of topCandidates) {
            try {
                // Load up to 3 local photos and 5 Immich faces to increase detection robustness
                const { rows: localPhotos } = await pool.query(
                    'SELECT photo_data FROM person_photos WHERE person_id = $1 ORDER BY id ASC LIMIT 3',
                    [candidate.id]
                );

                const { rows: immichPhotos } = await pool.query(
                    'SELECT photo_data FROM immich_faces WHERE person_id = $1 ORDER BY id ASC LIMIT 5',
                    [candidate.id]
                );

                const photos = [...localPhotos, ...immichPhotos];

                if (photos.length === 0) {
                    continue;
                }

                let bestVerifyResult = null;
                let minDistance = Infinity;

                // Test against multiple photos and pick the best match
                for (const photo of photos) {
                    try {
                        const verifyResult = await verifyFaces(req.file.buffer, photo.photo_data);
                        if (verifyResult && verifyResult.distance < minDistance) {
                            minDistance = verifyResult.distance;
                            bestVerifyResult = verifyResult;
                        }
                    } catch (innerErr) {
                        // Ignore individual photo processing errors
                    }
                }

                if (bestVerifyResult) {
                    console.log(`[Stage 2] ${candidate.name} (ID: ${candidate.id}) - Best Distance: ${minDistance.toFixed(4)}`);
                }

                // Thresholds:
                // < 0.40: Very likely match (Verified)
                // 0.40 - 0.55: Potential match (Show in UI)
                if (bestVerifyResult && minDistance < 0.55) {
                    const fullPerson = await getFullPerson(candidate.id);
                    matches.push({
                        person: fullPerson,
                        distance: minDistance,
                        stage1Distance: candidate.stage1Distance,
                        verified: minDistance < 0.40,
                        is_near_match: minDistance >= 0.40 && minDistance < 0.55
                    });
                }
            } catch (e) {
                console.error(`[Stage 2] Error verifying candidate ${candidate.id}:`, e.message);
            }
        }

        matches.sort((a, b) => a.distance - b.distance);

        res.json({ 
            message: "success", 
            matches, 
            queryEmbedding,
            queryMetadata: {
                age: estimatedAge,
                gender: estimatedGender,
                confidence,
                bbox,
                width,
                height
            }
        });
    } catch (err) {
        console.error("Search by face error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/photo/:photoId', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT photo_data, mime_type FROM person_photos WHERE id = $1',
            [parseInt(req.params.photoId)]
        );
        if (!rows || rows.length === 0) return res.status(404).send('Not Found');

        const photo = rows[0];
        res.setHeader('Content-Type', photo.mime_type || 'image/webp');
        res.send(photo.photo_data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REINDEX ALL PEOPLE (Admin only)
router.post('/reindex', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('[Reindex] Starting full database re-index...');
        // Get all people who have photos
        const peopleList = await all("SELECT id, name FROM people");
        let processedCount = 0;
        let failedCount = 0;

        for (const person of peopleList) {
            try {
                // Get all photos for this person
                const { rows: photos } = await pool.query(
                    'SELECT photo_data FROM person_photos WHERE person_id = $1 ORDER BY id ASC',
                    [person.id]
                );

                if (photos.length === 0) continue;

                let allDescriptors = [];
                let ai_metadata = null;

                for (let i = 0; i < photos.length; i++) {
                    const faceData = await processImage(photos[i].photo_data);
                    if (faceData && faceData.descriptor) {
                        allDescriptors.push(faceData.descriptor);
                        
                        // Use first valid face for primary metadata
                        if (!ai_metadata) {
                            ai_metadata = JSON.stringify({
                                estimated_age: faceData.estimatedAge,
                                estimated_gender: faceData.estimatedGender,
                                confidence: faceData.confidence,
                                bbox: faceData.bbox || null,
                                width: faceData.width || 800,
                                height: faceData.height || 800
                            });
                        }
                    }
                }

                if (allDescriptors.length > 0) {
                    await run(
                        'UPDATE people SET face_descriptor = ?, ai_metadata = ? WHERE id = ?',
                        [JSON.stringify(allDescriptors), ai_metadata, person.id]
                    );
                    processedCount++;
                }
            } catch (err) {
                console.error(`[Reindex] Failed to process person ${person.id} (${person.name}):`, err.message);
                failedCount++;
            }
        }

        console.log(`[Reindex] Completed. Processed: ${processedCount}, Failed: ${failedCount}`);
        res.json({ message: "Re-index completed", processed: processedCount, failed: failedCount });
    } catch (err) {
        console.error("[Reindex] Fatal error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * FEEDBACK ENDPOINT (Reinforcement)
 * Adds a confirmed embedding to a person's profile.
 */
router.post('/:id/feedback', authenticateToken, async (req, res) => {
    try {
        const personId = req.params.id;
        const { embedding, isCorrect } = req.body;

        if (!isCorrect) {
            // Future: Log incorrect matches to a separate table for model fine-tuning
            return res.json({ message: "Feedback received (negative)" });
        }

        if (!embedding || !Array.isArray(embedding)) {
            return res.status(400).json({ error: "No valid embedding provided" });
        }

        const person = await get("SELECT face_descriptor FROM people WHERE id = ?", [personId]);
        if (!person) return res.status(404).json({ error: "Person not found" });

        let allDescriptors = [];
        if (person.face_descriptor) {
            try {
                const parsed = JSON.parse(person.face_descriptor);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    if (Array.isArray(parsed[0])) {
                        allDescriptors = parsed;
                    } else {
                        allDescriptors = [parsed];
                    }
                }
            } catch (e) {
                console.error("Error parsing descriptor during feedback:", e);
            }
        }

        // Add the new embedding and limit to 50
        allDescriptors.push(embedding);
        if (allDescriptors.length > 50) {
            allDescriptors = allDescriptors.slice(allDescriptors.length - 50);
        }

        await run(
            'UPDATE people SET face_descriptor = ? WHERE id = ?',
            [JSON.stringify(allDescriptors), personId]
        );

        console.log(`[Reinforcement] Added new embedding to person ${personId}. Total now: ${allDescriptors.length}`);
        res.json({ message: "Success", total_descriptors: allDescriptors.length });
    } catch (err) {
        console.error("Feedback error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Helper function to sync a single person with Immich
 */
async function syncImmichForPerson(personId) {
    const person = await get('SELECT id, immich_person_id, face_descriptor, photo_url FROM people WHERE id = ?', [personId]);
    if (!person || !person.immich_person_id) {
        throw new Error("Person not found or not linked to Immich");
    }

    const immichPersonId = person.immich_person_id;
    const baseUrl = (process.env.IMMICH_URL || '').replace(/\/api\/?$/, '');
    const apiKey = process.env.IMMICH_API_KEY;

    if (!baseUrl || !apiKey) {
        throw new Error("Immich configuration missing");
    }

    const headers = { 'x-api-key': apiKey, 'Accept': 'application/json' };

    // Fetch assets for this person from Immich using search/metadata
    const response = await fetch(`${baseUrl}/api/search/metadata`, { 
        method: 'POST',
        headers: { 
            'x-api-key': apiKey, 
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ personIds: [immichPersonId] })
    });

    if (!response.ok) {
        throw new Error(`Immich API error: ${response.status}`);
    }

    const searchResult = await response.json();
    const assets = searchResult.assets?.items || [];
    console.log(`[Immich Sync] Found ${assets.length} assets for person ${personId} (Immich ID: ${immichPersonId})`);

    // Scan up to 500 assets to find the best possible profile picture
    const assetsToProcess = assets.slice(0, 500);

    let allDescriptors = [];
    if (person.face_descriptor) {
        try {
            const parsed = JSON.parse(person.face_descriptor);
            if (Array.isArray(parsed)) {
                if (Array.isArray(parsed[0])) {
                    allDescriptors = parsed;
                } else {
                    allDescriptors = [parsed];
                }
            }
        } catch (e) {}
    }

    let processedCount = 0;
    let skippedCount = 0;
    let bestFaceData = null;
    let bestFaceBuffer = null;
    let bestFaceScore = -1;

    // Clear existing faces for this person
    await run('DELETE FROM immich_faces WHERE person_id = ?', [personId]);

    for (const asset of assetsToProcess) {
        try {
            // Fetch the thumbnail of the asset - use 'preview' for better quality/accuracy
            const imageRes = await fetch(`${baseUrl}/api/assets/${asset.id}/thumbnail?size=preview`, { headers });
            if (!imageRes.ok) continue;
            
            const arrayBuffer = await imageRes.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);

            // Fetch asset details to check if we can get the face bounding box and check person count
            let faceInfo = null;
            let totalPeopleInPhoto = 0;
            try {
                const assetDetailsRes = await fetch(`${baseUrl}/api/assets/${asset.id}`, { headers });
                if (assetDetailsRes.ok) {
                    const assetDetails = await assetDetailsRes.json();
                    if (assetDetails.people) {
                        totalPeopleInPhoto = assetDetails.people.length;
                        const personData = assetDetails.people.find(p => p.id === immichPersonId);
                        if (personData && personData.faces && personData.faces.length > 0) {
                            faceInfo = personData.faces[0];
                        }
                    }
                }
            } catch (e) {}

            let finalBuffer = imageBuffer;

            if (faceInfo && faceInfo.boundingBoxX1 !== undefined) {
                // We have bounding box! Let's crop it using sharp
                const metadata = await sharp(imageBuffer).metadata();
                
                const originalWidth = faceInfo.imageWidth || metadata.width;
                const originalHeight = faceInfo.imageHeight || metadata.height;
                
                const widthRatio = metadata.width / originalWidth;
                const heightRatio = metadata.height / originalHeight;

                const left = Math.max(0, Math.round(faceInfo.boundingBoxX1 * widthRatio));
                const top = Math.max(0, Math.round(faceInfo.boundingBoxY1 * heightRatio));
                const width = Math.round((faceInfo.boundingBoxX2 - faceInfo.boundingBoxX1) * widthRatio);
                const height = Math.round((faceInfo.boundingBoxY2 - faceInfo.boundingBoxY1) * heightRatio);
                
                // Add 50% padding (more context helps AI detection)
                const padX = Math.round(width * 0.5);
                const padY = Math.round(height * 0.5);
                
                const cropLeft = Math.max(0, left - padX);
                const cropTop = Math.max(0, top - padY);
                const cropWidth = Math.min(metadata.width - cropLeft, width + padX * 2);
                const cropHeight = Math.min(metadata.height - cropTop, height + padY * 2);

                if (cropWidth > 0 && cropHeight > 0) {
                    finalBuffer = await sharp(imageBuffer)
                        .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
                        .toBuffer();
                }
            }

            const faceData = await processImage(finalBuffer);
            if (faceData && faceData.descriptor) {
                // Avoid adding extremely similar faces (burst shots)
                let isRedundant = false;
                for (const existing of allDescriptors) {
                    // Increased threshold to 0.2 to be more aggressive against burst shots
                    if (calculateSimilarity(faceData.descriptor, existing) < 0.2) {
                        isRedundant = true;
                        break;
                    }
                }

                if (isRedundant) {
                    skippedCount++;
                    continue;
                }

                // Track the face with the highest score to use as primary profile picture
                // We combine:
                // - detection confidence (det_score)
                // - person count (portraits with 1 person are better)
                // - face size (larger faces are usually better, but with low weight to avoid blurry close-ups)
                const faceArea = faceData.bbox ? (faceData.bbox[2] - faceData.bbox[0]) * (faceData.bbox[3] - faceData.bbox[1]) : 0;
                const faceAreaRatio = faceData.width ? faceArea / (faceData.width * faceData.height) : 0;
                
                let qualityScore = faceData.confidence;
                
                // Reward portraits (only 1 person in photo)
                if (totalPeopleInPhoto === 1) qualityScore += 0.15;
                
                // Minor reward for larger faces, but cap it to avoid extreme close-ups dominating
                qualityScore += Math.min(0.1, faceAreaRatio * 0.5);
                
                if (!bestFaceData || qualityScore > bestFaceScore) {
                    bestFaceData = faceData;
                    bestFaceBuffer = finalBuffer;
                    bestFaceScore = qualityScore;
                }

                allDescriptors.push(faceData.descriptor);
                
                // Save the cropped face for UI display
                await run(
                    'INSERT INTO immich_faces (person_id, asset_id, photo_data) VALUES (?, ?, ?)',
                    [personId, asset.id, finalBuffer]
                );

                // Also save to main gallery (person_photos) if we have less than 10 photos from Immich
                const galleryCount = await get('SELECT COUNT(*) as count FROM person_photos WHERE person_id = ?', [personId]);
                if (galleryCount.count < 10) {
                    await run(
                        'INSERT INTO person_photos (person_id, photo_data, mime_type) VALUES (?, ?, ?)',
                        [personId, finalBuffer, 'image/webp']
                    );
                }

                processedCount++;
                
                // If we have found enough faces for the gallery (50), we stop adding to DB 
                // but we continue scanning the rest of the 500 assets ONLY to find a potentially better "best face"
                // To save time, we only do AI processing for the "best face" check if the asset looks promising 
                // (e.g. it has a large face according to Immich metadata)
                if (processedCount >= 50 && bestFaceScore > 0.95) break;
            } else {
                skippedCount++;
            }

        } catch (err) {
            console.error(`[Immich Sync] Error processing asset ${asset.id}:`, err.message);
            skippedCount++;
        }
    }

    // Keep at most 100 descriptors to save space
    if (allDescriptors.length > 100) {
        allDescriptors = allDescriptors.slice(allDescriptors.length - 100);
    }

    // Update descriptors
    await run(
        'UPDATE people SET face_descriptor = ? WHERE id = ?',
        [JSON.stringify(allDescriptors), personId]
    );

    // Primary Identification
    if (bestFaceData && bestFaceBuffer) {
        const shouldUpdateProfile = !person.photo_url || bestFaceData.confidence > 0.9;
        
        if (shouldUpdateProfile) {
            const result = await run(
                'INSERT INTO person_photos (person_id, photo_data, mime_type) VALUES (?, ?, ?)',
                [personId, bestFaceBuffer, 'image/webp']
            );
            const photoId = result.lastID;
            
            const ai_metadata = JSON.stringify({
                estimated_age: bestFaceData.estimatedAge,
                estimated_gender: bestFaceData.estimatedGender,
                confidence: bestFaceData.confidence,
                bbox: bestFaceData.bbox || null,
                width: bestFaceData.width || 800,
                height: bestFaceData.height || 800
            });

            await run(
                'UPDATE people SET photo_url = ?, ai_metadata = ? WHERE id = ?', 
                [`/api/people/photo/${photoId}`, ai_metadata, personId]
            );
        }
    }

    return { processedCount, skippedCount, totalDescriptors: allDescriptors.length, bestConfidence: bestFaceData?.confidence || 0 };
}

/**
 * POST /api/people/:id/sync-immich
 * Synchronizes faces for a specific person from Immich
 */
router.post('/:id/sync-immich', authenticateToken, requireEditor, async (req, res) => {
    try {
        const result = await syncImmichForPerson(req.params.id);
        res.json({ message: "Immich sync completed", ...result });
    } catch (err) {
        console.error("Immich Sync error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/people/sync-all-immich
 * Synchronizes all people who have an Immich ID
 */
router.post('/sync-all-immich', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const people = await all('SELECT id FROM people WHERE immich_person_id IS NOT NULL');
        console.log(`[Immich Sync All] Starting sync for ${people.length} people`);
        
        let totalProcessed = 0;
        let totalSkipped = 0;
        let successful = 0;
        let failed = 0;

        for (const person of people) {
            try {
                const result = await syncImmichForPerson(person.id);
                totalProcessed += result.processedCount;
                totalSkipped += result.skippedCount;
                successful++;
            } catch (err) {
                console.error(`[Immich Sync All] Failed to sync person ${person.id}:`, err.message);
                failed++;
            }
        }

        res.json({ 
            message: "Bulk Immich sync completed", 
            successful, 
            failed, 
            totalProcessed, 
            totalSkipped 
        });
    } catch (err) {
        console.error("Bulk Immich Sync error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/people/delete-all-immich-faces
 * Deletes all stored Immich face images and clears related metadata for testing
 */
router.post('/delete-all-immich-faces', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Delete all records from immich_faces
        await run('DELETE FROM immich_faces');
        
        // Clear face descriptors and AI metadata for people linked to Immich
        // This allows a clean re-test of the sync logic
        await run(`
            UPDATE people 
            SET face_descriptor = NULL, ai_metadata = NULL 
            WHERE immich_person_id IS NOT NULL
        `);

        res.json({ message: "All Immich-related face data cleared successfully" });
    } catch (err) {
        console.error("Delete Immich Faces error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET Immich People List
 * Fetches the list of identified people from the Immich server
 */
router.get('/immich/people', authenticateToken, async (req, res) => {
    try {
        const baseUrl = (process.env.IMMICH_URL || '').replace(/\/api\/?$/, '');
        const apiKey = process.env.IMMICH_API_KEY;

        if (!baseUrl || !apiKey) {
            return res.status(400).json({ error: "Immich configuration missing" });
        }

        const headers = { 'x-api-key': apiKey, 'Accept': 'application/json' };
        const response = await fetch(`${baseUrl}/api/people`, { headers });
        
        if (!response.ok) {
            throw new Error(`Immich API error: ${response.status}`);
        }

        const data = await response.json();
        // Immich returns an array directly in recent versions, or an object with 'people' key.
        const people = Array.isArray(data) ? data : (data.people || []);

        res.json({ 
            people: people.map(p => {
                let thumbUrl = null;
                if (p.thumbnailPath) {
                    // Extract asset ID from thumbnail path if possible, or use the person's thumbnail logic
                    // In Immich, the thumbnail for a person is often accessible via /api/assets/{id}/thumbnail
                    // But person.thumbnailPath is a server path. 
                    // Actually, let's just use the person ID for the thumbnail if we can't get it easily.
                    // For now, we'll just send the name and ID, and let the frontend handle it if it can.
                    thumbUrl = `/api/people/immich/people/${p.id}/thumbnail`;
                }
                return { 
                    id: p.id, 
                    name: p.name, 
                    thumbnail: thumbUrl 
                };
            }) 
        });
    } catch (err) {
        console.error("GET /immich/people error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET Immich Person Thumbnail Proxy
 */
router.get('/immich/people/:personId/thumbnail', authenticateToken, async (req, res) => {
    try {
        const baseUrl = (process.env.IMMICH_URL || '').replace(/\/api\/?$/, '');
        const apiKey = process.env.IMMICH_API_KEY;

        if (!baseUrl || !apiKey) {
            return res.status(400).json({ error: "Immich configuration missing" });
        }

        const headers = { 'x-api-key': apiKey };
        const response = await fetch(`${baseUrl}/api/people/${req.params.personId}/thumbnail?size=preview`, { headers });
        
        if (!response.ok) {
            return res.status(response.status).send('Failed to fetch thumbnail');
        }

        const buffer = await response.buffer();
        res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET Immich Faces
 * Returns a list of asset IDs for the cropped faces of this person
 */
router.get('/:id/immich-faces', authenticateToken, async (req, res) => {
    try {
        const personId = req.params.id;
        const faces = await all("SELECT asset_id FROM immich_faces WHERE person_id = ?", [personId]);
        res.json({ faces: faces.map(f => f.asset_id) });
    } catch (err) {
        console.error("GET immich-faces error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET Immich Face Image
 * Returns the cropped photo data for a specific asset
 */
router.get('/:id/immich-face/:assetId', authenticateToken, async (req, res) => {
    try {
        const personId = req.params.id;
        const assetId = req.params.assetId;
        const face = await get("SELECT photo_data FROM immich_faces WHERE person_id = ? AND asset_id = ?", [personId, assetId]);
        
        if (!face || !face.photo_data) {
            return res.status(404).json({ error: "Face not found" });
        }

        res.set('Content-Type', 'image/webp'); // sharp defaults to webp or jpeg depending on source, but sharp(buffer).toBuffer() outputs what sharp defaults to (often webp or jpeg, browsers handle both)
        res.send(face.photo_data);
    } catch (err) {
        console.error("GET immich-face error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
