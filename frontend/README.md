# MUDRATALK frontend

The React and Vite frontend for **MUDRATALK: An AI-Based Mudra Recognition System for Indian Traditional Dance Styles Using CNN.**

## Run

```sh
npm install
npm run dev
```

The application has four routes: Home, Learn, Recognition, and Mudra Library. Recognition connects to the FastAPI backend at `http://127.0.0.1:8000` and requests camera access only on the Recognition route.

## Hero footage

Add the licensed Bharatanatyam video as `public/videos/bharatanatyam-hero.mp4`. The Home page video element is configured to autoplay muted and loop. Until that asset is present, the existing rose background remains visible.
