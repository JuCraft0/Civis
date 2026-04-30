import io
import logging
import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from insightface.app import FaceAnalysis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Civis Face AI Service (InsightFace)", version="2.0.0")

# Initialize InsightFace
# 'buffalo_l' includes detection, recognition, and genderage modules.
try:
    face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    face_app.prepare(ctx_id=0, det_size=(640, 640))
    logger.info("InsightFace initialized with buffalo_l")
except Exception as e:
    logger.error(f"Failed to initialize InsightFace: {e}")
    # We'll try to re-init on first request if this fails due to download issues etc.
    face_app = None

def bytes_to_cv2(file_bytes: bytes):
    """Convert bytes to a BGR image array for InsightFace/OpenCV."""
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

@app.get("/health")
def health():
    return {
        "status": "ok" if face_app else "initializing",
        "model": "buffalo_l",
        "library": "insightface"
    }

@app.post("/analyze")
async def analyze(photo: UploadFile = File(...)):
    """
    Receives a single image and returns estimated age and gender.
    Note: Race and Emotion are not supported by standard InsightFace models.
    """
    if not face_app:
        raise HTTPException(status_code=503, detail="AI Service is still initializing")
        
    try:
        file_bytes = await photo.read()
        img = bytes_to_cv2(file_bytes)
        
        if img is None:
            raise HTTPException(status_code=422, detail="Invalid image format")

        faces = face_app.get(img)
        
        if not faces:
            # Return empty structure if no face detected
            return {
                "age": None,
                "gender": None,
                "confidence": 0,
                "note": "No face detected"
            }

        # Pick the largest face or first detected
        face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]

        # gender: 0=Female, 1=Male
        gender_str = "Woman" if face.gender == 0 else "Man"

        return {
            "age": int(face.age),
            "gender": gender_str,
            "confidence": float(face.det_score),
            "bbox": face.bbox.tolist(), # [x1, y1, x2, y2]
            "width": img.shape[1],
            "height": img.shape[0],
            "race": None, # Not supported
            "emotion": None, # Not supported
            "gender_scores": {"Man": 1.0 if face.gender == 1 else 0.0, "Woman": 1.0 if face.gender == 0 else 0.0},
        }
    except Exception as e:
        logger.error(f"/analyze error: {e}")
        raise HTTPException(status_code=422, detail=f"Analysis failed: {str(e)}")

@app.post("/represent")
async def represent(photo: UploadFile = File(...)):
    """
    Receives a single image and returns the face embedding vector.
    Used for fast approximate similarity search (Stage 1).
    """
    if not face_app:
        raise HTTPException(status_code=503, detail="AI Service is still initializing")

    try:
        file_bytes = await photo.read()
        img = bytes_to_cv2(file_bytes)
        
        if img is None:
            raise HTTPException(status_code=422, detail="Invalid image format")

        faces = face_app.get(img)
        
        if not faces:
            raise HTTPException(status_code=422, detail="No face detected in image")

        # Pick the largest face
        face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
        
        # InsightFace embeddings are usually 512-dim and normalized
        embedding = face.normed_embedding.tolist()
        
        logger.info(f"Generated embedding for face (length: {len(embedding)})")
        return {
            "embedding": embedding,
            "bbox": face.bbox.tolist(),
            "width": img.shape[1],
            "height": img.shape[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/represent error: {e}")
        raise HTTPException(status_code=422, detail=f"Embedding failed: {str(e)}")

@app.post("/verify")
async def verify(
    photo1: UploadFile = File(...),
    photo2: UploadFile = File(...),
):
    """
    Receives two images and performs a precise 1:1 face comparison.
    Returns: verified (bool), distance (float), threshold (float).
    """
    if not face_app:
        raise HTTPException(status_code=503, detail="AI Service is still initializing")

    try:
        bytes1 = await photo1.read()
        bytes2 = await photo2.read()

        img1 = bytes_to_cv2(bytes1)
        img2 = bytes_to_cv2(bytes2)

        faces1 = face_app.get(img1)
        faces2 = face_app.get(img2)

        if not faces1 or not faces2:
            raise HTTPException(status_code=422, detail="Face not detected in one or both images")

        f1 = sorted(faces1, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
        f2 = sorted(faces2, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]

        # Calculate cosine distance
        # Since they are normed embeddings, cosine similarity is just the dot product.
        # Cosine distance = 1 - cosine similarity
        sim = np.dot(f1.normed_embedding, f2.normed_embedding)
        distance = 1.0 - float(sim)
        
        # Standard threshold for ArcFace (InsightFace) is around 0.4 - 0.6 for cosine distance.
        # We use 0.4 as a strict threshold for high accuracy.
        THRESHOLD = 0.40
        verified = distance < THRESHOLD

        logger.info(f"Verification result: {verified} (distance: {distance:.4f}, threshold: {THRESHOLD})")

        return {
            "verified": verified,
            "distance": distance,
            "threshold": THRESHOLD,
            "model": "ArcFace (buffalo_l)",
            "metric": "cosine",
            "bbox1": f1.bbox.tolist(),
            "bbox2": f2.bbox.tolist()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/verify error: {e}")
        raise HTTPException(status_code=422, detail=f"Verification failed: {str(e)}")

@app.post("/process")
async def process(photo: UploadFile = File(...)):
    """
    Combines analyze and represent in a single call to save processing time.
    Returns embedding, age, and gender.
    """
    if not face_app:
        raise HTTPException(status_code=503, detail="AI Service is still initializing")

    try:
        file_bytes = await photo.read()
        img = bytes_to_cv2(file_bytes)
        
        if img is None:
            raise HTTPException(status_code=422, detail="Invalid image format")

        faces = face_app.get(img)
        
        if not faces:
            return {
                "embedding": None,
                "age": None,
                "gender": None,
                "confidence": 0,
                "bbox": None
            }

        # Pick largest face
        face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
        
        return {
            "embedding": face.normed_embedding.tolist(),
            "age": int(face.age),
            "gender": "Woman" if face.gender == 0 else "Man",
            "confidence": float(face.det_score),
            "bbox": face.bbox.tolist(),
            "width": img.shape[1],
            "height": img.shape[0]
        }
    except Exception as e:
        logger.error(f"/process error: {e}")
        raise HTTPException(status_code=422, detail=f"Processing failed: {str(e)}")
