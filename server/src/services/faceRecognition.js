const tf = require('@tensorflow/tfjs-node');
const { Human } = require('@vladmandic/human');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Path to downloaded Human models included in the package
const modelsDir = path.join(__dirname, '..', '..', 'node_modules', '@vladmandic', 'human', 'models');

const humanConfig = {
    backend: 'tensorflow',
    modelBasePath: `file://${modelsDir}`,
    debug: false,
    face: {
        enabled: true,
        detector: { return: true, rotation: true, maxDetected: 1, minConfidence: 0.2 },
        mesh: { enabled: true },
        iris: { enabled: false },
        description: { enabled: true }, // Extracts 1024-dim embedding
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false }
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: false },
    segmentation: { enabled: false }
};

const human = new Human(humanConfig);

let modelsLoaded = false;

async function loadModels() {
    if (modelsLoaded) return;
    console.log('Loading Human AI models...');
    await human.load();
    await human.warmup();
    console.log('Human models loaded and warmed up.');
    modelsLoaded = true;
}

// Convert buffer to tensor
function bufferToTensor(buffer) {
    return tf.node.decodeImage(buffer, 3);
}

/**
 * Process an image buffer and extract face descriptor, age, and gender
 * @param {Buffer} imageBuffer 
 * @returns {Promise<{descriptor: number[], estimatedAge: number, estimatedGender: string, confidence: number} | null>}
 */
async function processImage(imageBuffer) {
    await loadModels();

    try {
        // Normalize image using sharp to ensure it's upright (fix EXIF rotation) and has good contrast
        const normalizedBuffer = await sharp(imageBuffer)
            .rotate()
            .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
            .normalize()
            .toBuffer();

        const tensor = bufferToTensor(normalizedBuffer);

        try {
            // Run Human detection
            const result = await human.detect(tensor);

            if (!result || !result.face || result.face.length === 0) {
                console.log('Human AI: No face detected.');
                return null;
            }

            const primaryFace = result.face[0];

            console.log(`Human Detected: Age ~${Math.round(primaryFace.age)}, Gender ${primaryFace.gender}, Score ${primaryFace.boxScore.toFixed(2)}`);

            return {
                descriptor: Array.from(primaryFace.embedding), // Human uses 'embedding' (length depends on model, default is 1024 for faceres)
                estimatedAge: Math.round(primaryFace.age),
                estimatedGender: primaryFace.gender, // returns 'male' or 'female'
                confidence: primaryFace.boxScore
            };
        } finally {
            tensor.dispose();
        }
    } catch (err) {
        console.error("Image processing error with Human AI:", err);
        return null;
    }
}

/**
 * Calculate Euclidean Distance between two descriptors
 * Lower is better. Typically < 0.6 is considered a match.
 * @param {number[]} desc1 
 * @param {number[]} desc2 
 * @returns {number}
 */
function calculateSimilarity(desc1, desc2) {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;

    // Use Human's built-in similarity function which handles their 1024-dim embeddings properly
    // It returns a value between 0 (no match) and 1 (exact match).
    const similarity = human.match.similarity(desc1, desc2);

    // Our existing logic expects a "distance" where lower is better. 
    // We invert it: distance = 1.0 - similarity.
    // So identical = 0.0, very similar = 0.1-0.3, different > 0.4
    return 1.0 - similarity;
}

module.exports = {
    loadModels,
    processImage,
    calculateSimilarity
};
