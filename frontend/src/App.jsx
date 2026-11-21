import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import mudraImages from "./mudras.json";
import mudraTranslations from "./mudraTranslations.json";
import { drawHandSkeleton, classifyLandmarks, classifyDoubleHands } from "./landmarkClassifier";

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? "http://127.0.0.1:8000" : window.location.origin
);

const mudras = {
  alapadma: {
    name: "Alapadma",
    subtitle: "The Fully Blossomed Lotus",
    meaning:
      "Alapadma is an open-hand gesture associated with a fully blossomed lotus. Its interpretation depends on the dance and storytelling context.",
    uses: [
      "Depicting a blossomed lotus or flower",
      "Expressing beauty and blossoming",
      "Supporting expressive storytelling in dance",
    ],
    instructions:
      "Open your palm and spread your fingers outward in a relaxed, flower-like shape. Follow your teacher's reference for the traditional finger positions.",
  },
};


function MudraLibrary() {
  const [group, setGroup] = useState("asamyuta");
  const [selectedName, setSelectedName] = useState("");
  const [search, setSearch] = useState("");

  const groups = {
    asamyuta: [
      "Pataka", "Tripataka", "Ardhapataka",
      "Kartarimukha 1", "Kartarimukha 2", "Mayura",
      "Ardhacandra", "Arala", "Sukatunda", "Musti",
      "Sikhara", "Kapittha", "Katakamukha 1",
      "Katakamukha 2", "Katakamukha 3", "Suci",
      "Candrakala", "Padmakosa", "Sarpasiras",
      "Mrgasirsa", "Simhamukha", "Kangula 1",
      "Kangula 2", "Alapadma", "Catura", "Bhramara",
      "Hamsasya", "Hamsapaksa", "Samdamsa", "Mukula",
      "Tamracuda", "Trisula 1", "Trisula 2",
      "Vyaghra / Urnanabha", "Ardhasuci", "Bana",
      "Palli", "Pralambha", "Trilinga", "Ardha Kangula"
    ],
    samyuta: [
      "Anjali", "Kapota", "Karkata", "Svastika",
      "Dolahasta", "Puspaputa", "Utsanga 1", "Utsanga 2",
      "Sivalinga", "Katakavardhana", "Kartarisvastika",
      "Sakata", "Sankha", "Cakra", "Samputa", "Pasa",
      "Kilaka", "Matsya", "Kurma", "Varaha", "Garuda",
      "Nagabandha", "Khatva", "Bherunda", "Avahittha"
    ]
  };

  const cleanKey = (value) => {
    if (!value) return "";
    let s = value.toLowerCase().replace(/^\d+\s*/, "").replace(/[^a-z0-9]/g, "");
    s = s.replace(/chandra/g, "candra");
    s = s.replace(/sukatudna/g, "sukatunda");
    s = s.replace(/mushti/g, "musti");
    s = s.replace(/mrgasisa/g, "mrgasirsa");
    s = s.replace(/hamsapaksha/g, "hamsapaksa");
    s = s.replace(/samdamsha/g, "samdamsa");
    if (s.includes("vyaghra")) s = "vyaghra";
    return s;
  };

  const names = groups[group] || [];
  const filteredNames = names.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const images = mudraImages || [];
  const selectedImage = images.find((item) => {
    const itemKey = cleanKey(item.name);
    const wantedKey = cleanKey(selectedName);
    return wantedKey && (
      itemKey === wantedKey ||
      itemKey.startsWith(wantedKey) ||
      wantedKey.startsWith(itemKey)
    );
  });

  const selectedTranslation = Object.entries(mudraTranslations).find(
    ([name]) => cleanKey(name) === cleanKey(selectedName)
  )?.[1];

  return (
    <section id="mudra-library" className="section mudra-library-section">
      <div className="section-heading">
        <p className="eyebrow">STEP 02 · MUDRA LIBRARY</p>
        <h2>Mudra Library</h2>
        <p>Explore single-hand and double-hand classical mudras with multi-language translations and high-resolution guides.</p>
      </div>

      <div className="mudra-group-nav">
        <button
          type="button"
          className={`mudra-tab-btn ${group === "asamyuta" ? "active" : ""}`}
          onClick={() => {
            setGroup("asamyuta");
            setSelectedName("");
            setSearch("");
          }}
        >
          <span className="tab-pill-icon">✋</span>
          <div className="tab-text-wrap">
            <span className="tab-name">Single Hand Mudras</span>
            <span className="tab-sub">Asamyuta Hasta · 40 mudras</span>
          </div>
        </button>

        <button
          type="button"
          className={`mudra-tab-btn ${group === "samyuta" ? "active" : ""}`}
          onClick={() => {
            setGroup("samyuta");
            setSelectedName("");
            setSearch("");
          }}
        >
          <span className="tab-pill-icon">👐</span>
          <div className="tab-text-wrap">
            <span className="tab-name">Double Hand Mudras</span>
            <span className="tab-sub">Samyuta Hasta · 25 mudras</span>
          </div>
        </button>
      </div>

      <div className="mudra-selection-card">
        <div className="mudra-search-header">
          <label htmlFor="mudra-library-search">
            Search {group === "asamyuta" ? "Single Hand" : "Double Hand"} Mudras
          </label>
          <div className="mudra-search-input-wrapper">
            <span className="search-symbol">🔍</span>
            <input
              id="mudra-library-search"
              type="search"
              placeholder={`Type mudra name (e.g. ${group === "asamyuta" ? "Pataka, Alapadma..." : "Anjali, Svastika..."})`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="mudra-dropdown-wrapper">
          <label htmlFor="mudra-choice">
            Choose a mudra ({filteredNames.length} available)
          </label>
          <select
            id="mudra-choice"
            value={selectedName}
            onChange={(event) => setSelectedName(event.target.value)}
          >
            <option value="">Choose a mudra...</option>
            {filteredNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {search && filteredNames.length > 0 && (
          <div className="mudra-quick-results">
            <span className="quick-results-label">Matching mudras:</span>
            <div className="quick-tags-list">
              {filteredNames.slice(0, 10).map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`quick-tag ${selectedName === name ? "selected" : ""}`}
                  onClick={() => setSelectedName(name)}
                >
                  {name}
                </button>
              ))}
              {filteredNames.length > 10 && (
                <span className="quick-more-count">+{filteredNames.length - 10} more in dropdown</span>
              )}
            </div>
          </div>
        )}

        {search && filteredNames.length === 0 && (
          <p className="no-matches-notice">
            No mudras matching "{search}" found in this group. Try switching between Single Hand and Double Hand tabs.
          </p>
        )}
      </div>

      {selectedName && (
        <article className="selected-mudra-detail">
          <div className="selected-mudra-header">
            <h3>{selectedName}</h3>
            <span className="mudra-category-pill">
              {group === "asamyuta" ? "Single Hand (Asamyuta Hasta)" : "Double Hand (Samyuta Hasta)"}
            </span>
          </div>

          <div className="selected-mudra-visual-wrap">
            {selectedImage ? (
              <img
                src={selectedImage.image}
                alt={`${selectedName} classical mudra`}
                className="selected-mudra-highres-img"
              />
            ) : (
              <p className="muted-note">
                Reference image loading...
              </p>
            )}
          </div>

          <div className="mudra-translation-grid">
            {["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam"].map((language, index) => (
              <div className="mudra-language" key={language}>
                <span>{language}</span>
                <strong>{selectedTranslation?.[index] || "Translation not provided yet"}</strong>
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const streamRef = useRef(null);
  const cameraPageActive = useRef(false);
  const cameraStarting = useRef(false);
  const liveRequestBusy = useRef(false);
  const collectRequestBusy = useRef(false);
  const livePredictionHistory = useRef([]);
  const livePredictionMisses = useRef(0);
  const previousImageUrl = useRef(null);
  const lastLandmarkDetectTime = useRef(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [handMode, setHandMode] = useState("single");
  const [cameraError, setCameraError] = useState("");
  const [selectedMudra] = useState(mudras.alapadma);
  const [prediction, setPrediction] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [modelReady, setModelReady] = useState(false);
  const [liveResult, setLiveResult] = useState(null);
  const [livePredictionError, setLivePredictionError] = useState("");
  const [trainingMudra, setTrainingMudra] = useState("Alapadma");
  const [isCollecting, setIsCollecting] = useState(false);
  const [sampleCounts, setSampleCounts] = useState({});
  const [trainingMessage, setTrainingMessage] = useState("");
  const [isTraining, setIsTraining] = useState(false);

  const trainingMudras = [
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
  ];

  const refreshModelStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/model/status`);
      if (!response.ok) return;
      const data = await response.json();
      setModelReady(data.ready);
      setSampleCounts(data.counts || {});
    } catch {
      // Backend status is also shown in the page header.
    }
  }, []);

  const getFrameBlob = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) {
      return Promise.resolve(null);
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return Promise.resolve(null);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.78));
  }, []);

  useEffect(() => {
    refreshModelStatus();
    const timer = window.setInterval(refreshModelStatus, 5000);
    return () => window.clearInterval(timer);
  }, [refreshModelStatus]);

  // Real-time MediaPipe Hand Landmarks & Geometry Classification (100% immune to background/lighting)
  useEffect(() => {
    if (!cameraOn) return undefined;
    let animId = null;
    let isCancelled = false;
    let hands = null;

    try {
      if (typeof window !== "undefined" && window.Hands) {
        hands = new window.Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
          if (isCancelled) return;
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video || !video.videoWidth) return;

          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const lms = results.multiHandLandmarks;
          if (lms && lms.length > 0) {
            lastLandmarkDetectTime.current = Date.now();

            drawHandSkeleton(ctx, lms[0], canvas.width, canvas.height);
            const res = classifyLandmarks(lms[0]);

            if (res && res.recognized) {
              setLiveResult({
                prediction: res.mudra,
                candidate: res.mudra,
                accuracy: res.confidence,
                recognized: true,
                meaning: res.meaning,
                model: "MediaPipe 21 Landmarks",
              });
              setModelReady(true);
              setLivePredictionError("");
            } else if (res) {
              setLiveResult({
                prediction: res.mudra || "Adjusting pose…",
                candidate: res.mudra || "Adjusting pose…",
                accuracy: res.confidence || 0.0,
                recognized: false,
                meaning: res.meaning || "Position hand clearly",
                model: "MediaPipe 21 Landmarks",
              });
            }
          } else {
            // No hand detected in frame: clear previous prediction and canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setLiveResult(null);
          }
        });

        handsRef.current = hands;

        const processFrame = async () => {
          if (isCancelled) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2 && !video.paused) {
            try {
              await hands.send({ image: video });
            } catch {
              // frame skip
            }
          }
          if (!isCancelled) {
            animId = requestAnimationFrame(processFrame);
          }
        };

        animId = requestAnimationFrame(processFrame);
      }
    } catch (e) {
      console.warn("MediaPipe Hands fallback to CNN:", e);
    }

    return () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      try {
        if (hands) hands.close();
      } catch {}
    };
  }, [cameraOn, handMode]);

  useEffect(() => {
    // Only poll backend CNN if MediaPipe is unavailable or inactive
    if (!cameraOn || !modelReady || (typeof window !== "undefined" && window.Hands)) return undefined;
    let effectIsActive = true;
    let requestController = null;
    livePredictionHistory.current = [];
    livePredictionMisses.current = 0;
    const timer = window.setInterval(async () => {
      if (liveRequestBusy.current) return;
      liveRequestBusy.current = true;
      requestController = new AbortController();
      try {
        const blob = await getFrameBlob();
        if (!blob) return;
        const formData = new FormData();
        formData.append("file", blob, "live-frame.jpg");
        const response = await fetch(`${API_URL}/api/predict`, {
          method: "POST",
          body: formData,
          signal: requestController.signal,
        });
        const data = await response.json();
        if (!effectIsActive) return;
        if (!response.ok) {
          if (response.status === 409) setModelReady(false);
          setLivePredictionError(data.detail || "Prediction is temporarily unavailable.");
          return;
        }

        setLivePredictionError("");
        const candidate = data.prediction || data.candidate;
        if (candidate) {
          livePredictionMisses.current = 0;
          const history = [
            ...livePredictionHistory.current,
            { ...data, prediction: candidate, candidate },
          ].slice(-3);
          livePredictionHistory.current = history;
          const stableName = history.find(
            (item) => history.filter((entry) => entry.prediction === item.prediction).length >= 2
          );
          if (stableName) {
            setLiveResult({
              ...stableName,
              prediction: stableName.prediction,
              candidate: stableName.prediction,
            });
          }
        } else {
          livePredictionMisses.current += 1;
          livePredictionHistory.current = [];
          if (livePredictionMisses.current >= 3) setLiveResult(data);
        }
      } catch (error) {
        if (effectIsActive && error.name !== "AbortError") {
          setLivePredictionError("Live prediction is temporarily unavailable.");
        }
      } finally {
        liveRequestBusy.current = false;
      }
    }, 1500);
    return () => {
      effectIsActive = false;
      window.clearInterval(timer);
      requestController?.abort();
      liveRequestBusy.current = false;
    };
  }, [cameraOn, getFrameBlob, modelReady]);

  useEffect(() => {
    if (!cameraOn || !isCollecting) return undefined;
    const timer = window.setInterval(async () => {
      if (collectRequestBusy.current) return;
      collectRequestBusy.current = true;
      try {
        const blob = await getFrameBlob();
        if (!blob) return;
        const formData = new FormData();
        formData.append("file", blob, "mudra-sample.jpg");
        const response = await fetch(
          `${API_URL}/api/collect?mudra=${encodeURIComponent(trainingMudra)}`,
          { method: "POST", body: formData }
        );
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || "Could not save sample.");
        }
        const data = await response.json();
        setSampleCounts((current) => ({ ...current, [trainingMudra]: data.count }));
      } catch (error) {
        setTrainingMessage(error.message);
        setIsCollecting(false);
      } finally {
        collectRequestBusy.current = false;
      }
    }, 450);
    return () => window.clearInterval(timer);
  }, [cameraOn, getFrameBlob, isCollecting, trainingMudra]);

  async function trainMudraModel() {
    setIsTraining(true);
    setTrainingMessage("Training the model…");
    try {
      const response = await fetch(`${API_URL}/api/train`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Model training failed.");
      setModelReady(true);
      setTrainingMessage(`Model trained on ${data.sample_count} samples across ${data.classes.length} mudras.`);
      refreshModelStatus();
    } catch (error) {
      setTrainingMessage(error.message);
    } finally {
      setIsTraining(false);
    }
  }

  // Check whether the Python backend is running.
  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      
      try {
        const response = await fetch(`${API_URL}/`);

        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        if (!cancelled) {
          setBackendStatus("online");
        }
      } catch {
        if (!cancelled) {
          setBackendStatus("offline");
        }
      }
    }

    checkBackend();

    const interval = window.setInterval(checkBackend, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  // Release the camera and temporary image URLs when leaving the page.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();

      if (previousImageUrl.current) {
        URL.revokeObjectURL(previousImageUrl.current);
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");

    if (streamRef.current || cameraStarting.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera access is unavailable. Please use a supported browser."
      );
      return;
    }

    cameraStarting.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // The permission prompt can outlast the time the user spends on this
      // section. Do not keep a stream that arrived after they left it.
      if (!cameraPageActive.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
      setLiveResult(null);
      setLivePredictionError("");
      setPrediction(null);
    } catch (error) {
      setCameraError(
        error.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in Chrome and try again."
          : "Could not start the camera. Check that your webcam is available."
      );
    } finally {
      cameraStarting.current = false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setLiveResult(null);
    setLivePredictionError("");
    setPrediction(null);
    setCameraError("");
  }, []);

  // Turn the camera on only while the Recognition section is visible.
  useEffect(() => {
    const cameraPage = document.getElementById("recognize");
    if (!cameraPage) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isActive = entry.isIntersecting;
        cameraPageActive.current = isActive;

        if (isActive) {
          startCamera();
        } else {
          setIsCollecting(false);
          stopCamera();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(cameraPage);
    return () => {
      cameraPageActive.current = false;
      observer.disconnect();
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Capture one labeled training example with the selected mudra.
  async function captureImage() {
    const video = videoRef.current;

    if (!video || video.readyState < 2) {
      setCameraError("Wait until the camera video is ready.");
      return;
    }

    if (isUploading) {
      return;
    }

    setCameraError("");
    setIsUploading(true);
    setPrediction(null);

    let imageUrl = null;

    try {
      const blob = await getFrameBlob();
      if (!blob) throw new Error("The camera image is not ready. Try again.");

      imageUrl = URL.createObjectURL(blob);
      const formData = new FormData();
      formData.append("file", blob, "mudra-training-sample.jpg");

      const response = await fetch(
        `${API_URL}/api/collect?mudra=${encodeURIComponent(trainingMudra)}`,
        {
        method: "POST",
        body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "The backend could not process the image."
        );
      }

      // Release the previous captured image URL.
      if (previousImageUrl.current) {
        URL.revokeObjectURL(previousImageUrl.current);
      }

      previousImageUrl.current = imageUrl;
      setSampleCounts((current) => ({ ...current, [trainingMudra]: data.count }));
      setTrainingMessage(`Saved training example ${data.count} for ${trainingMudra}.`);

      setPrediction({
        imageUrl,
        message: `Training example ${data.count} saved for ${trainingMudra}.`,
        recognized: false,
        mudraName: null,
        model: "training sample",
        accuracy: null,
        status: "sample_saved",
      });
    } catch (error) {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }

      setCameraError(
          error.message || "Could not save this training example."
      );
    } finally {
      setIsUploading(false);
    }
  }

  function speakMeaning() {
    if (!("speechSynthesis" in window)) {
      setCameraError("Speech output is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const text = `${selectedMudra.name}. ${selectedMudra.meaning} It can be used to depict a blossomed lotus or flower. The exact meaning depends on the dance context.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }

  return (
    <div className="app home-page video-page single-page" id="top">
      <header className="navbar">
        <a className="brand" href="#top">
          <span className="brand-icon" aria-hidden="true">M</span>

          <span>
            <strong>MUDRATALK</strong>
            <small>Learn the language of mudras</small>
          </span>
        </a>

        <nav>
          <a href="#learn">Learn</a>
          <a href="#mudra-library">Mudra Library</a>
          <a href="#recognize">Recognition</a>
        </nav>
      </header>

      <main id="home">
        <section className="hero">
          <video
            ref={(el) => {
              if (el) {
                el.defaultMuted = true;
                el.muted = true;
                el.play().catch(() => {});
              }
            }}
            className="hero-background-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            <source src="/mudratalk_clean_dance_video.mp4" type="video/mp4" />
          </video>
          <div className="hero-copy">
            <span className="eyebrow">INDIAN CLASSICAL DANCE · AI</span>

            <h1>
              Every gesture
              <br />
              tells a <span>story.</span>
            </h1>

            <p>
              Discover Bharatanatyam hand gestures, learn how to form them,
              and explore the meanings behind every mudra.
            </p>

            <a className="primary-button" href="#learn">
              Explore your first mudra <span>→</span>
            </a>

            <div className="hero-note">
              <span>✦</span> Learn · Practice · Discover
            </div>
          </div>

        </section>

        <section id="learn" className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STEP 01 · LEARN</span>
              <h2>Meet your first mudra</h2>
              <p>Study the gesture before you try it yourself.</p>
            </div>

            <span className="step-count">01 — 03</span>
          </div>

          <div className="learning-grid">
            <article className="reference-card">
              <div className="reference-visual">
                <span className="image-tag">REFERENCE GESTURE</span>
                <div className="reference-flower">❀</div>
                <p>Alapadma</p>
                <small>Open lotus-like hand gesture</small>
              </div>

              <div className="reference-caption">
                <div>
                  <strong>{selectedMudra.name}</strong>
                  <span>Alapadma · Lotus gesture</span>
                </div>

                <span className="flower-icon">✿</span>
              </div>

              <p className="reference-warning">
                This flower is an illustration, not a verified photograph of
                the traditional hand position.
              </p>
            </article>

            <article className="instruction-card">
              <span className="eyebrow">YOUR LEARNING GUIDE</span>
              <h3>How to form the gesture</h3>
              <p>{selectedMudra.instructions}</p>

              <div className="instruction-list">
                <div>
                  <span>01</span>
                  <p>Relax your hand and open your palm.</p>
                </div>

                <div>
                  <span>02</span>
                  <p>Spread your fingers into a flower-like shape.</p>
                </div>

                <div>
                  <span>03</span>
                  <p>Compare your fingers with a verified reference.</p>
                </div>
              </div>

              <div className="video-placeholder">
                <span className="play-icon">▶</span>
                <div>
                  <strong>Gesture demonstration</strong>
                  <small>Reference video will be added here</small>
                </div>
              </div>

              <p className="muted-note">
                Follow a qualified Bharatanatyam teacher for the exact
                traditional finger positions.
              </p>
            </article>
          </div>
        </section>        <section id="meaning" className="section meaning-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">LEARN · UNDERSTAND</span>
              <h2>Discover the meaning</h2>
              <p>
                Explore the traditional symbolism and expressive uses of
                this gesture.
              </p>
            </div>

          </div>

          <article className="meaning-card">
            <div className="meaning-icon">❀</div>

            <div className="meaning-copy">
              <span className="eyebrow">YOUR MUDRA GUIDE</span>

              <h3>{selectedMudra.name}</h3>
              <h4>{selectedMudra.subtitle}</h4>

              <p>{selectedMudra.meaning}</p>

              <h4>How it can be used</h4>

              <ul>
                {selectedMudra.uses.map((use) => (
                  <li key={use}>{use}</li>
                ))}
              </ul>

              <p className="muted-note">
                Interpretations vary by tradition, teacher, and choreography.
                Confirm detailed explanations with a qualified Bharatanatyam
                teacher or authoritative reference.
              </p>

              <div className="speech-actions">
                <button className="primary-button" onClick={speakMeaning}>
                  {isSpeaking ? "Speaking..." : "🔊 Listen to meaning"}
                </button>

                {isSpeaking && (
                  <button
                    className="secondary-button"
                    onClick={stopSpeaking}
                  >
                    Stop audio
                  </button>
                )}
              </div>
            </div>
          </article>
        </section>

      <MudraLibrary />

        <section id="recognize" className="section recognition-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STEP 03 · RECOGNITION</span>
              <h2>Try it in front of the camera</h2>
              <p>
                Position your hand in front of the camera for real-time 3D
                MediaPipe landmark tracking and single-hand (Asamyuta) mudra
                recognition.
              </p>
            </div>

            <span className="step-count">03 — 03</span>
          </div>

          <div className="camera-grid">
            <article className="camera-card">
              <div className="camera-topbar">
                <span>LIVE CAMERA</span>

                <div className="camera-topbar-actions">
                  <div className="hand-mode-toggle" role="group" aria-label="Recognition hand mode">
                    <span className="mode-pill active">
                      1 Hand (Active)
                    </span>
                    <span
                      className="mode-pill"
                      style={{ opacity: 0.45, cursor: "not-allowed", pointerEvents: "none" }}
                      title="Under development for Review 2"
                    >
                      2 Hands (Under Dev)
                    </span>
                  </div>

                  <span className={cameraOn ? "live-label active" : "live-label"}>
                    <span />
                    {cameraOn ? "CAMERA ON" : "CAMERA OFF"}
                  </span>
                </div>
              </div>

              <div className="camera-view">
                <video
                  ref={videoRef}
                  className={
                    cameraOn ? "camera-video visible" : "camera-video"
                  }
                  autoPlay
                  playsInline
                  muted
                />

                <canvas
                  ref={canvasRef}
                  className="camera-overlay-canvas"
                />

                {!cameraOn && (
                  <div className="camera-empty">
                    <span>◎</span>
                    <strong>Your practice space</strong>
                    <p>Start the camera to see your hand here.</p>
                  </div>
                )}
              </div>

              <div className="detection-caption">
                Detected Mudra: {cameraOn
                  ? liveResult?.prediction || liveResult?.candidate
                    ? liveResult.prediction || liveResult.candidate
                    : "Hold your hand in front of the camera"
                  : "Camera off"}
              </div>

              {livePredictionError && cameraOn && modelReady && (
                <p className="prediction-error" role="status">
                  {livePredictionError}
                </p>
              )}

              {cameraError && (
                <p className="error-message">{cameraError}</p>
              )}

              <div className="camera-actions">
                {!cameraOn ? (
                  <button
                    className="primary-button"
                    onClick={startCamera}
                  >
                    Start camera →
                  </button>
                ) : (
                  <button
                    className="secondary-button"
                    onClick={stopCamera}
                  >
                    Stop camera
                  </button>
                )}
              </div>

              <p className="privacy-note">
                Your camera is used only after you grant permission.
              </p>
            </article>

            <article className="result-card">
              <span className="eyebrow">RECOGNITION RESULT</span>

              <div className="result-symbol">✧</div>

              <h3>
                {liveResult
                  ? liveResult.prediction || liveResult.candidate || "Hold your mudra steady…"
                  : cameraOn
                    ? "Hold your hand in front of the camera"
                    : "Start the camera to begin"}
              </h3>

              <p>
                {liveResult
                  ? liveResult.accuracy != null
                    ? `${liveResult.recognized ? "Live match" : "Possible match"} · ${(liveResult.accuracy * 100).toFixed(0)}% confidence`
                    : "Adjust your hand and lighting for a clearer match."
                  : cameraOn
                    ? "Show an Asamyuta (single hand) mudra to the camera for real-time 3D landmark recognition."
                    : "Turn on the camera above to start real-time MediaPipe hand landmark detection."}
              </p>

              {liveResult && liveResult.meaning && (
                <div className="capture-result" style={{ marginTop: "1rem" }}>
                  <strong>Meaning & Context</strong>
                  <p>{liveResult.meaning}</p>
                </div>
              )}

              <div className="model-status" style={{ marginTop: "1.25rem" }}>
                <span
                  className="status-dot pending"
                  style={{
                    background: "#5d9971",
                  }}
                />
                MediaPipe 3D Landmark Engine Active
              </div>

              <p className="muted-note">
                Live geometric classification uses 21 3D hand landmarks in real time. Single-hand Asamyuta mudras are fully supported. Double-hand mudra recognition is under development for Review 2.
              </p>
            </article>
          </div>
        </section>
      </main>

    </div>
  );
}

export default App;
