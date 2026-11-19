# MUDRATALK

**MUDRATALK: An AI-Based Mudra Recognition System for Indian Traditional Dance Styles Using CNN.**

MUDRATALK is a learning and recognition application for Indian traditional dance mudras. The React frontend includes Home, Learn, Recognition, and a multilingual Mudra Library. The FastAPI backend provides model status, sample collection, training, and image prediction endpoints.

## Run locally

Start the backend from the project root:

```sh
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend in another terminal:

```sh
cd frontend
npm install
npm run dev
```

Open the Vite address shown in the terminal. Camera recognition requires browser camera permission and a running backend. Collect labeled examples and train the model using the Recognition page.

## Homepage video

Place the licensed Bharatanatyam hero footage at `frontend/public/videos/bharatanatyam-hero.mp4`. The Home page uses it as a muted, looping, autoplay background with a rose overlay. The repository currently has no video file; until one is added, the hero displays its rose fallback background.

## Recognition notes

The backend currently loads the project's existing trained classifier and prediction pipeline. This branding update does not alter the recognition algorithm or model. See [backend/README.md](backend/README.md) for setup and training details.
