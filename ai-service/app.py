import io
import base64
import logging
from typing import Optional

import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from deepface import DeepFace

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Civis Face AI Service", version="1.0.0")

# Model configuration - using Facenet512 for best accuracy/speed balance
MODEL_NAME = "Facenet512"
DETECTOR_BACKEND = "retinaface"
DISTANCE_METRIC = "cosine"


def decode_image(file_bytes: bytes) -> str:
    """Convert bytes to a base64 data URI that DeepFace can consume."""
    encoded = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def bytes_to_pil(file_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(file_bytes)).convert("RGB")


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/analyze")
async def analyze(photo: UploadFile = File(...)):
    """
    Receives a single image and returns estimated age, gender, race, and emotion.
    """
    try:
        file_bytes = await photo.read()
        img_array = np.array(bytes_to_pil(file_bytes))

        results = DeepFace.analyze(
            img_path=img_array,
            actions=["age", "gender", "race", "emotion"],
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False,
            silent=True,
        )

        # DeepFace.analyze returns a list when multiple faces are detected
        face = results[0] if isinstance(results, list) else results

        return {
            "age": face.get("age"),
            "gender": face.get("dominant_gender"),
            "race": face.get("dominant_race"),
            "emotion": face.get("dominant_emotion"),
            "gender_scores": face.get("gender", {}),
            "race_scores": face.get("race", {}),
            "emotion_scores": face.get("emotion", {}),
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
    try:
        file_bytes = await photo.read()
        img_array = np.array(bytes_to_pil(file_bytes))

        embeddings = DeepFace.represent(
            img_path=img_array,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False,
            align=True,
            normalization="Facenet",
        )

        if not embeddings:
            raise HTTPException(status_code=422, detail="No face detected in image")

        # Return the embedding of the first detected face
        logger.info(f"Generated embedding for face (length: {len(embeddings[0]['embedding'])})")
        return {"embedding": embeddings[0]["embedding"]}
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
    Receives two images and performs a precise 1:1 face comparison using DeepFace.verify.
    Returns: verified (bool), distance (float), threshold (float).
    Used as Stage 2 precise verification for top candidates.
    """
    try:
        bytes1 = await photo1.read()
        bytes2 = await photo2.read()

        img1_array = np.array(bytes_to_pil(bytes1))
        img2_array = np.array(bytes_to_pil(bytes2))

        result = DeepFace.verify(
            img1_path=img1_array,
            img2_path=img2_array,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR_BACKEND,
            distance_metric=DISTANCE_METRIC,
            enforce_detection=False,
            align=True,
            normalization="Facenet",
        )

        logger.info(f"Verification result: {result.get('verified')} (distance: {result.get('distance'):.4f}, threshold: {result.get('threshold')})")

        return {
            "verified": result.get("verified", False),
            "distance": result.get("distance"),
            "threshold": result.get("threshold"),
            "model": MODEL_NAME,
            "metric": DISTANCE_METRIC,
        }
    except Exception as e:
        logger.error(f"/verify error: {e}")
        raise HTTPException(status_code=422, detail=f"Verification failed: {str(e)}")
