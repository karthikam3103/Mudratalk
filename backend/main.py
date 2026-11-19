
from __future__ import annotations

import io
import json
import uuid
from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError


# --------------------------------------------------
# 1. PATHS AND SETTINGS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
FRONTEND_DIST_DIR = PROJECT_DIR / "frontend" / "dist"

DATASET_DIR = PROJECT_DIR / "dataset"
SAMPLE_DIR = DATASET_DIR / "train"

MODEL_PATH = BASE_DIR / "mudra_cnn.keras"
CLASS_NAMES_PATH = BASE_DIR / "mudra_classes.json"

IMAGE_SIZE = (128, 128)
MAX_IMAGE_BYTES = 10 * 1024 * 1024
CONFIDENCE_THRESHOLD = 0.45


# --------------------------------------------------
# 2. MUDRA LABELS ALLOWED FOR COLLECTION
# --------------------------------------------------

ALLOWED_MUDRAS = {
    "Pataka", "Tripataka", "Ardhapataka", "Kartarimukha 1",
    "Kartarimukha 2", "Mayura", "Ardhacandra", "Arala", "Sukatunda",
    "Musti", "Sikhara", "Kapittha", "Katakamukha 1", "Katakamukha 2",
    "Katakamukha 3", "Suci", "Candrakala", "Padmakosa", "Sarpasiras",
    "Mrgasirsa", "Simhamukha", "Kangula 1", "Kangula 2", "Alapadma",
    "Catura", "Bhramara", "Hamsasya", "Hamsapaksa", "Samdamsa", "Mukula",
    "Tamracuda", "Trisula 1", "Trisula 2", "Vyaghra / Urnanabha",
    "Ardhasuci", "Bana", "Palli", "Pralambha", "Trilinga", "Ardha Kangula",
    "Anjali", "Kapota", "Karkata", "Svastika", "Dolahasta", "Puspaputa",
    "Utsanga 1", "Utsanga 2", "Sivalinga", "Katakavardhana",
    "Kartarisvastika", "Sakata", "Sankha", "Cakra", "Samputa", "Pasa",
    "Kilaka", "Matsya", "Kurma", "Varaha", "Garuda", "Nagabandha",
    "Khatva", "Bherunda", "Avahittha",
}


# --------------------------------------------------
# 3. FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="MUDRATALK: CNN-Based Mudra Recognition System",
    description="MUDRATALK API for Indian traditional dance mudra recognition.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# 4. LOAD CNN MODEL AND CLASS LABELS
# --------------------------------------------------

cnn_model = None
class_names = []


def load_cnn_model():
    global cnn_model, class_names

    if cnn_model is not None:
        return

    if not MODEL_PATH.exists():
        raise RuntimeError(f"CNN model not found: {MODEL_PATH}")

    if not CLASS_NAMES_PATH.exists():
        raise RuntimeError(
            f"Class labels not found: {CLASS_NAMES_PATH}"
        )

    cnn_model = tf.keras.models.load_model(MODEL_PATH)

    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as file:
        class_names = json.load(file)

    if len(class_names) != cnn_model.output_shape[-1]:
        raise RuntimeError(
            "Number of class labels does not match CNN output."
        )

    print("MUDRATALK CNN loaded successfully.")
    print(f"Number of classes: {len(class_names)}")


@app.on_event("startup")
def startup_event():
    try:
        load_cnn_model()
    except Exception as error:
        print(f"CNN loading error: {error}")


# --------------------------------------------------
# 5. IMAGE PROCESSING
# --------------------------------------------------

def decode_image(image_bytes: bytes) -> np.ndarray:
    try:
        source = io.BytesIO(image_bytes)
        Image.open(source).verify()

        source.seek(0)
        image = Image.open(source).convert("RGB")

    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image."
        )

    return cv2.cvtColor(
        np.asarray(image),
        cv2.COLOR_RGB2BGR
    )


async def read_image(file: UploadFile) -> np.ndarray:
    if file.content_type not in (
        "image/jpeg",
        "image/png",
        "image/webp",
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPEG, PNG, or WebP image."
        )

    image_bytes = await file.read()

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 10 MB."
        )

    return decode_image(image_bytes)


def extract_hand_crop(image: np.ndarray) -> tuple[np.ndarray, bool]:
    # Center-crop to the guide area to isolate the hand and exclude side borders
    h, w = image.shape[:2]
    min_dim = min(h, w)
    start_x = max(0, (w - min_dim) // 2)
    start_y = max(0, (h - min_dim) // 2)
    crop = image[start_y:start_y + min_dim, start_x:start_x + min_dim]
    return crop, True


def prepare_cnn_input(image: np.ndarray) -> np.ndarray:
    # Convert OpenCV BGR image to RGB.
    rgb_image = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2RGB
    )

    # Resize to the CNN training image size.
    resized = cv2.resize(
        rgb_image,
        IMAGE_SIZE
    )

    # CNN expects a batch of images.
    batch = np.expand_dims(resized, axis=0)

    return batch.astype(np.float32)


# --------------------------------------------------
# 6. HOME ROUTE
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "project": "MUDRATALK",
        "status": "Backend running",
        "model": "CNN",
    }


# --------------------------------------------------
# 7. MODEL STATUS
# --------------------------------------------------

@app.get("/api/model/status")
def model_status():
    ready = cnn_model is not None

    counts = {}

    for mudra in class_names:
        folder = SAMPLE_DIR / mudra

        if folder.exists():
            counts[mudra] = sum(
                1
                for file in folder.glob("*")
                if file.suffix.lower() in {
                    ".jpg", ".jpeg", ".png"
                }
            )
        else:
            counts[mudra] = 0

    return {
        "ready": ready,
        "classes": class_names if ready else [],
        "counts": counts,
        "total": sum(counts.values()),
        "model": "MUDRATALK CNN",
    }


# --------------------------------------------------
# 8. COLLECT TRAINING SAMPLE
# --------------------------------------------------

@app.post("/api/collect")
async def collect_sample(
    file: UploadFile = File(...),
    mudra: str = Query(...)
):
    if mudra not in ALLOWED_MUDRAS:
        raise HTTPException(
            status_code=400,
            detail="Choose a valid mudra label."
        )

    image = await read_image(file)

    target = SAMPLE_DIR / mudra
    target.mkdir(parents=True, exist_ok=True)

    filename = target / f"{uuid.uuid4().hex}.jpg"

    if not cv2.imwrite(str(filename), image):
        raise HTTPException(
            status_code=500,
            detail="Could not save this training sample."
        )

    count = sum(1 for f in target.glob("*.jpg"))

    return {
        "saved": True,
        "mudra": mudra,
        "count": count,
    }


# --------------------------------------------------
# 9. TRAINING ROUTE
# --------------------------------------------------

@app.post("/api/train")
def train_model():
    raise HTTPException(
        status_code=409,
        detail=(
            "CNN training is performed using "
            "backend/train_cnn.py. Run that script "
            "and restart the backend to load the new model."
        )
    )


# --------------------------------------------------
# 10. CNN PREDICTION
# --------------------------------------------------

@app.post("/api/predict")
async def predict_mudra(file: UploadFile = File(...)):

    if cnn_model is None:
        raise HTTPException(
            status_code=503,
            detail="CNN model is not loaded. Check model files and restart the backend."
        )

    image = await read_image(file)

    hand_crop, hand_detected = extract_hand_crop(image)
    if not hand_detected:
        return {
            "status": "prediction",
            "recognized": False,
            "prediction": None,
            "candidate": None,
            "accuracy": 0.0,
            "message": "No hand detected. Please hold your hand clearly in front of the camera.",
            "model": "MUDRATALK CNN",
        }

    model_input = prepare_cnn_input(hand_crop)

    probabilities = cnn_model.predict(
        model_input,
        verbose=0
    )[0]

    index = int(np.argmax(probabilities))
    score = float(probabilities[index])

    recognized = score >= CONFIDENCE_THRESHOLD

    name = class_names[index]

    return {
        "status": "prediction",
        "recognized": recognized,
        "prediction": name if recognized else None,
        "candidate": name,
        "accuracy": score,
        "message": (
            f"Detected {name}."
            if recognized
            else "Gesture unclear. Hold your hand steady and try again."
        ),
        "model": "MUDRATALK CNN",
    }


if FRONTEND_DIST_DIR.exists():
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIST_DIR, html=True),
        name="frontend",
    )
