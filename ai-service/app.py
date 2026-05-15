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

def bytes_to_cv2(file_bytes: bytes, max_size=1024):
    """Convert bytes to a BGR image array for InsightFace/OpenCV, downscaling if too large."""
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is not None:
        h, w = img.shape[:2]
        if max(h, w) > max_size:
            scale = max_size / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            
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

def calculate_quality(face, img):
    """
    Calculates a quality score based on detection confidence, sharpness (blur), 
    frontality (pose symmetry), and face size.
    """
    # 1. Blur Detection using Laplacian on the face region
    x1, y1, x2, y2 = [int(v) for v in face.bbox]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(img.shape[1], x2), min(img.shape[0], y2)
    
    blur_score = 0
    if x2 > x1 and y2 > y1:
        try:
            face_img = img[y1:y2, x1:x2]
            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        except:
            pass
        
    # 2. Pose Estimation (Frontality) via landmark symmetry
    pose_score = 0.5
    if hasattr(face, 'kps') and face.kps is not None and len(face.kps) == 5:
        kps = face.kps
        lx = abs(kps[0][0] - kps[2][0])
        rx = abs(kps[1][0] - kps[2][0])
        dy = abs(kps[0][1] - kps[1][1])
        
        horiz_sym = 1.0 - min(1.0, abs(lx - rx) / max(1.0, lx + rx))
        vert_sym = 1.0 - min(1.0, dy / max(1.0, abs(kps[0][0] - kps[1][0])))
        pose_score = (horiz_sym * 0.7) + (vert_sym * 0.3)

    # 3. Size Score (Prefer larger faces)
    face_w = x2 - x1
    face_h = y2 - y1
    # Target size is 160x160 for a "good" quality crop
    size_score = min(1.0, (face_w * face_h) / (160 * 160))
        
    # Normalize blur score (typical "good" values are > 100, "excellent" > 300)
    norm_blur = min(1.0, blur_score / 350.0)
    
    # Composite Quality Score (0.0 to 1.0)
    # 30% Detection, 20% Blur, 30% Pose, 20% Size
    quality = (float(face.det_score) * 0.3) + (norm_blur * 0.2) + (pose_score * 0.3) + (size_score * 0.2)
    
    return {
        "score": float(quality),
        "blur": float(blur_score),
        "pose": float(pose_score),
        "size": float(size_score)
    }

@app.post("/process")
async def process(photo: UploadFile = File(...)):
    """
    Combines analyze and represent in a single call to save processing time.
    Returns embedding, age, gender, and a quality score.
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
                "quality": 0,
                "bbox": None
            }

        # Pick largest face
        face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
        
        quality_data = calculate_quality(face, img)
        
        return {
            "embedding": face.normed_embedding.tolist(),
            "age": int(face.age),
            "gender": "Woman" if face.gender == 0 else "Man",
            "confidence": float(face.det_score),
            "quality": quality_data["score"],
            "quality_details": quality_data,
            "bbox": face.bbox.tolist(),
            "width": img.shape[1],
            "height": img.shape[0]
        }
    except Exception as e:
        logger.error(f"/process error: {e}")
        raise HTTPException(status_code=422, detail=f"Processing failed: {str(e)}")
