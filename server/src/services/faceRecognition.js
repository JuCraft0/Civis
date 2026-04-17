/**
 * faceRecognition.js
 * 
 * HTTP client that delegates all face AI work to the Python DeepFace microservice
 * running at http://face-ai:8000 (Docker internal network).
 * 
 * Public API (kept compatible with the old Human.js-based module):
 *   processImage(imageBuffer)  → { descriptor, estimatedAge, estimatedGender, confidence }
 *   calculateSimilarity(d1, d2) → euclidean_l2 distance (lower = more similar)
 *   analyzeImage(imageBuffer)  → { age, gender, race, emotion, ... }
 *   verifyFaces(buf1, buf2)    → { verified, distance, threshold }
 */

const FormData = require('form-data');
const fetch = require('node-fetch');

const FACE_AI_URL = process.env.FACE_AI_URL || 'http://face-ai:8000';

/**
 * Call the /represent endpoint to get a 512-dim face embedding.
 * @param {Buffer} imageBuffer
 * @returns {Promise<number[] | null>}
 */
async function getEmbedding(imageBuffer) {
    const form = new FormData();
    form.append('photo', imageBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    const response = await fetch(`${FACE_AI_URL}/represent`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error(`[face-ai] /represent failed (${response.status}): ${err}`);
        return null;
    }

    const data = await response.json();
    return {
        embedding: data.embedding || null,
        bbox: data.bbox || null,
        width: data.width || null,
        height: data.height || null
    };
}

/**
 * Call the /analyze endpoint to get age, gender, race, emotion.
 * @param {Buffer} imageBuffer
 * @returns {Promise<object | null>}
 */
async function analyzeImage(imageBuffer) {
    const form = new FormData();
    form.append('photo', imageBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    const response = await fetch(`${FACE_AI_URL}/analyze`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error(`[face-ai] /analyze failed (${response.status}): ${err}`);
        return null;
    }

    return response.json();
}

/**
 * Call the /verify endpoint for precise 1:1 comparison.
 * @param {Buffer} buf1
 * @param {Buffer} buf2
 * @returns {Promise<{ verified: boolean, distance: number, threshold: number, bbox1: number[], bbox2: number[] } | null>}
 */
async function verifyFaces(buf1, buf2) {
    const form = new FormData();
    form.append('photo1', buf1, { filename: 'photo1.jpg', contentType: 'image/jpeg' });
    form.append('photo2', buf2, { filename: 'photo2.jpg', contentType: 'image/jpeg' });

    const response = await fetch(`${FACE_AI_URL}/verify`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error(`[face-ai] /verify failed (${response.status}): ${err}`);
        return null;
    }

    return response.json();
}

/**
 * Calculates Euclidean L2 distance between two embedding vectors.
 * Lower is better (0 = identical, ≥ 1.0 = very different).
 * This is used for Stage 1 rough approximation in the DB.
 * @param {number[]} d1
 * @param {number[]} d2
 * @returns {number}
 */
function calculateSimilarity(d1, d2) {
    if (!d1 || !d2 || d1.length !== d2.length) return 1.0;

    let dot = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < d1.length; i++) {
        dot += d1[i] * d2[i];
        norm1 += d1[i] ** 2;
        norm2 += d2[i] ** 2;
    }
    const similarity = dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return 1.0 - similarity; 
}

/**
 * High-level wrapper: get both the embedding and the AI analysis in one call.
 * Drop-in compatible with the old Human.js processImage() function.
 * @param {Buffer} imageBuffer
 * @returns {Promise<{ descriptor: number[], estimatedAge: number, estimatedGender: string, confidence: number, bbox: number[] } | null>}
 */
async function processImage(imageBuffer) {
    try {
        const form = new FormData();
        form.append('photo', imageBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });

        const response = await fetch(`${FACE_AI_URL}/process`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`[face-ai] /process failed (${response.status}): ${err}`);
            return null;
        }

        const data = await response.json();

        if (!data.embedding) {
            console.log('[face-ai] No face embedding returned — face likely not detected.');
            return null;
        }

        const estimatedAge = data.age ?? null;
        const estimatedGender = data.gender?.toLowerCase() ?? null;

        console.log(`[face-ai] Detected: Age ~${estimatedAge}, Gender ${estimatedGender} (Confidence: ${data.confidence?.toFixed(2)})`);

        return {
            descriptor: data.embedding,
            estimatedAge,
            estimatedGender,
            confidence: data.confidence || 1.0,
            bbox: data.bbox || null,
            width: data.width || null,
            height: data.height || null,
            race: null, // InsightFace does not support race
            emotion: null, // InsightFace does not support emotion
        };
    } catch (err) {
        console.error('[face-ai] processImage error:', err.message);
        return null;
    }
}

// Legacy stub — models are loaded on-demand by the Python service
async function loadModels() {
    console.log('[face-ai] Model loading is handled by the Python microservice.');
}

module.exports = {
    loadModels,
    processImage,
    calculateSimilarity,
    analyzeImage,
    getEmbedding,
    verifyFaces,
};
