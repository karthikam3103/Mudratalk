/**
 * Classical Indian Dance (Bharatanatyam) Mudra Landmark Classifier
 * Classifies mudras using 21 3D hand joints from MediaPipe Hands.
 *
 * Fully scale-invariant: Normalizes distances by each finger's own phalanx
 * length so distance from the camera (near vs far) never alters recognition.
 */

function dist2d(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Compute angle (in degrees) between three points with vertex at p2
function angleBetween(p1, p2, p3) {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm base
  [5, 9], [9, 13], [13, 17],
];

export function drawHandSkeleton(ctx, landmarks, width, height, color = "rgba(255, 255, 255, 0.9)") {
  if (!landmarks || landmarks.length < 21) return;

  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255, 77, 121, 0.4)";
  ctx.shadowBlur = 6;

  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const p1 = landmarks[startIdx];
    const p2 = landmarks[endIdx];
    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }

  // Draw knuckles
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    const x = pt.x * width;
    const y = pt.y * height;

    ctx.beginPath();
    if ([4, 8, 12, 16, 20].includes(i)) {
      // Fingertip points: larger glowing rose accent
      ctx.arc(x, y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = "#ff4d79";
    } else {
      ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
    }
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#1b1115";
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Classify a Single Hand (Asamyuta Hasta)
 */
export function classifyLandmarks(lm) {
  if (!lm || lm.length < 21) {
    return { mudra: null, confidence: 0, recognized: false };
  }

  const wrist = lm[0];
  const thumbTip = lm[4];
  const thumbIP = lm[3];
  const thumbMCP = lm[2];

  const indexTip = lm[8];
  const indexPIP = lm[6];
  const indexMCP = lm[5];

  const middleTip = lm[12];
  const middlePIP = lm[10];
  const middleMCP = lm[9];

  const ringTip = lm[16];
  const ringPIP = lm[14];
  const ringMCP = lm[13];

  const pinkyTip = lm[20];
  const pinkyPIP = lm[18];
  const pinkyMCP = lm[17];

  // Palm reference scale (wrist to middle MCP)
  const palmScale = Math.max(0.001, dist2d(wrist, middleMCP));

  // Scale-invariant finger extension: checks ratio of Tip-to-MCP vs PIP-to-MCP
  // Straight finger has tip-to-mcp distance roughly 1.4x to 2.6x the proximal phalanx.
  // Curled finger has tip curled down toward palm, dropping below 1.25x.
  const testFinger = (tip, pip, mcp) => {
    const phalanx = Math.max(0.0001, dist2d(pip, mcp));
    const tipMcp = dist2d(tip, mcp);
    const tipWrist = dist2d(tip, wrist);
    const pipWrist = dist2d(pip, wrist);

    const isExtended = tipMcp / phalanx > 1.28 && tipWrist > pipWrist * 0.98;
    const isCurled = tipMcp / phalanx <= 1.25 || tipWrist < pipWrist * 0.95;
    return { isExtended, isCurled };
  };

  const index = testFinger(indexTip, indexPIP, indexMCP);
  const middle = testFinger(middleTip, middlePIP, middleMCP);
  const ring = testFinger(ringTip, ringPIP, ringMCP);
  const pinky = testFinger(pinkyTip, pinkyPIP, pinkyMCP);

  // Thumb analysis
  // Angle between thumb axis and index MCP axis from wrist
  const thumbAngle = angleBetween(thumbTip, wrist, indexMCP);
  const thumbToIndexMCP = dist2d(thumbTip, indexMCP) / palmScale;
  const thumbExtendedWide = thumbAngle > 28 || thumbToIndexMCP > 0.48;

  // Inter-finger pinches (normalized by palmScale)
  const thumbIndexDist = dist2d(thumbTip, indexTip) / palmScale;
  const thumbMiddleDist = dist2d(thumbTip, middleTip) / palmScale;
  const thumbRingDist = dist2d(thumbTip, ringTip) / palmScale;
  const thumbPinkyDist = dist2d(thumbTip, pinkyTip) / palmScale;

  // Inter-finger spreads
  const indexMiddleSpread = dist2d(indexTip, middleTip) / palmScale;
  const middleRingSpread = dist2d(middleTip, ringTip) / palmScale;
  const ringPinkySpread = dist2d(ringTip, pinkyTip) / palmScale;

  // ----------------------------------------------------
  // GESTURE MATCHING RULES (Prioritized Order)
  // ----------------------------------------------------

  // 1. Mukula (Flower Bud): ALL 5 fingertips meet and touch together at one point
  const allTipsClose =
    thumbIndexDist < 0.38 &&
    thumbMiddleDist < 0.40 &&
    thumbRingDist < 0.40 &&
    thumbPinkyDist < 0.46;

  if (allTipsClose && dist2d(middleTip, wrist) > palmScale * 0.70) {
    return {
      mudra: "Mukulam",
      confidence: 0.99,
      recognized: true,
      meaning: "Flower bud — blooming lotus, eating, prayer, or offering.",
    };
  }

  // 2. Hamsasya (Swan Beak): Thumb & Index tips touch, Middle/Ring/Pinky extended
  if (thumbIndexDist < 0.32 && middle.isExtended && ring.isExtended && pinky.isExtended) {
    return {
      mudra: "Hamsasyam",
      confidence: 0.98,
      recognized: true,
      meaning: "Swan's beak — pearls, drawing, or delicate touch.",
    };
  }

  // 3. Mayura (Peacock): Thumb & Ring tips touch, Index/Middle/Pinky extended
  if (thumbRingDist < 0.35 && index.isExtended && middle.isExtended && pinky.isExtended) {
    return {
      mudra: "Mayura",
      confidence: 0.98,
      recognized: true,
      meaning: "Peacock — elegance, applying sacred tilak, or peacock feathers.",
    };
  }

  // 4. Simhamukha (Lion Face): Thumb touches Middle & Ring tips; Index & Pinky extended
  if (thumbMiddleDist < 0.42 && thumbRingDist < 0.42 && index.isExtended && pinky.isExtended && !middle.isExtended && !ring.isExtended) {
    return {
      mudra: "Simhamukham",
      confidence: 0.97,
      recognized: true,
      meaning: "Lion's face — strength, courage, or offering.",
    };
  }

  // 5. Kapittha: Index finger curled tightly over thumb tip; middle, ring, pinky curled
  if (index.isCurled && middle.isCurled && ring.isCurled && pinky.isCurled) {
    const thumbPointingUp = thumbTip.y < thumbMCP.y && dist2d(thumbTip, wrist) > palmScale * 0.88;
    if (thumbPointingUp) {
      return {
        mudra: "Sikharam",
        confidence: 0.98,
        recognized: true,
        meaning: "Peak / Spire — pillar, bow, or Lord Shiva.",
      };
    }
    // Mushti: Full tight fist
    return {
      mudra: "Mushti",
      confidence: 0.97,
      recognized: true,
      meaning: "Fist — firmness, strength, or holding weapons.",
    };
  }

  // 6. Index Finger Only: Suchi vs Chandrakala
  if (index.isExtended && middle.isCurled && ring.isCurled && pinky.isCurled) {
    if (thumbExtendedWide) {
      return {
        mudra: "Chandrakala",
        confidence: 0.98,
        recognized: true,
        meaning: "Crescent moon — denotes the moon in Shiva's crown.",
      };
    }
    return {
      mudra: "Suchi",
      confidence: 0.98,
      recognized: true,
      meaning: "Needle — pointing, showing one, or the supreme truth.",
    };
  }

  // 7. Two Fingers Extended: Kartarimukha (Scissors) vs Ardhapataka
  if (index.isExtended && middle.isExtended && ring.isCurled && pinky.isCurled) {
    // If index and middle fingers are spread open in a distinct "V" -> Kartarimukha
    if (indexMiddleSpread > 0.32) {
      return {
        mudra: "Katrimukha",
        confidence: 0.98,
        recognized: true,
        meaning: "Scissors — separation, lightning, or opposition.",
      };
    }
    // If index and middle fingers are held straight together -> Ardhapataka
    return {
      mudra: "Ardhapathaka",
      confidence: 0.97,
      recognized: true,
      meaning: "Half-flag — flag, knife, or two entities.",
    };
  }

  // 8. Trishulam: Index, Middle, Ring extended; Pinky and Thumb folded
  if (index.isExtended && middle.isExtended && ring.isExtended && pinky.isCurled) {
    return {
      mudra: "Trishulam",
      confidence: 0.96,
      recognized: true,
      meaning: "Trident — weapon of Lord Shiva, trinity.",
    };
  }

  // 9. Tripataka: Index, Middle, Pinky extended; Ring finger bent down
  if (index.isExtended && middle.isExtended && ring.isCurled && pinky.isExtended) {
    return {
      mudra: "Tripathaka",
      confidence: 0.98,
      recognized: true,
      meaning: "Three-part flag — crown, thunderbolt, or tree.",
    };
  }

  // 10. All 4 Fingers Extended: Alapadma, Ardhachandra, Pataka
  if (index.isExtended && middle.isExtended && ring.isExtended && pinky.isExtended) {
    const isSpreadWide = indexMiddleSpread > 0.30 || middleRingSpread > 0.30 || ringPinkySpread > 0.30;

    // Alapadma: All fingers are open and spread apart widely like an open flower
    if (isSpreadWide) {
      return {
        mudra: "Alapadmam",
        confidence: 0.98,
        recognized: true,
        meaning: "Full-bloomed lotus — beauty, blossoming, circular motion.",
      };
    }

    // Ardhachandra: Fingers together, Thumb stretched OUTWARD at wide angle forming half-moon
    if (thumbExtendedWide) {
      return {
        mudra: "Ardhachandran",
        confidence: 0.98,
        recognized: true,
        meaning: "Half-moon — meditation, waist, consecration.",
      };
    }

    // Pataka: Fingers together, Thumb bent/folded against palm
    return {
      mudra: "Pathaka",
      confidence: 0.99,
      recognized: true,
      meaning: "Flag — beginning of dance, clouds, forest, or open door.",
    };
  }

  // 11. Mrigasirsha: Pinky & Thumb extended wide, middle three curled
  if (pinky.isExtended && !middle.isExtended && !ring.isExtended && thumbExtendedWide) {
    return {
      mudra: "Mrigasirsha",
      confidence: 0.97,
      recognized: true,
      meaning: "Deer's head — deer, gentle touch, or playing the flute.",
    };
  }

  // If no well-known mudra pattern matches, return unrecognized (avoids false positives)
  return {
    mudra: "Unknown Pose",
    confidence: 0.0,
    recognized: false,
    meaning: "Position your hand into one of the classical mudras.",
  };
}

/**
 * Classify Double Hands (Samyuta Hasta)
 */
export function classifyDoubleHands(leftLm, rightLm) {
  if (!leftLm || !rightLm || leftLm.length < 21 || rightLm.length < 21) {
    return null;
  }

  const leftWrist = leftLm[0];
  const rightWrist = rightLm[0];
  const leftMidTip = leftLm[12];
  const rightMidTip = rightLm[12];

  const wristDist = dist2d(leftWrist, rightWrist);
  const tipDist = dist2d(leftMidTip, rightMidTip);

  const leftClass = classifyLandmarks(leftLm);
  const rightClass = classifyLandmarks(rightLm);

  // 1. Anjali (Namaste / Prayer): Both palms flat (Pataka) touching palms & fingertips
  if (
    (leftClass.mudra === "Pathaka" || leftClass.mudra === "Ardhachandran") &&
    (rightClass.mudra === "Pathaka" || rightClass.mudra === "Ardhachandran") &&
    tipDist < 0.20
  ) {
    return {
      mudra: "Anjali",
      confidence: 0.99,
      recognized: true,
      meaning: "Salutation — prayer, greeting, showing reverence to the deity or teacher.",
    };
  }

  // 2. Shivalinga: One hand in Shikhara (fist with thumb up) resting on top of flat palm
  const leftIsShik = leftClass.mudra === "Sikharam";
  const rightIsShik = rightClass.mudra === "Sikharam";
  const leftIsFlat = leftClass.mudra === "Pathaka" || leftClass.mudra === "Ardhachandran";
  const rightIsFlat = rightClass.mudra === "Pathaka" || rightClass.mudra === "Ardhachandran";

  if ((leftIsShik && rightIsFlat) || (rightIsShik && leftIsFlat)) {
    return {
      mudra: "Shivalinga",
      confidence: 0.98,
      recognized: true,
      meaning: "Lord Shiva — divine representation of Lord Shiva.",
    };
  }

  // 3. Svastika: Both hands in Pataka crossed at wrists
  if (leftClass.mudra === "Pathaka" && rightClass.mudra === "Pathaka" && wristDist < 0.18) {
    return {
      mudra: "Swastikam",
      confidence: 0.97,
      recognized: true,
      meaning: "Auspicious cross — clouds, sky, or praise.",
    };
  }

  // Fallback: Combine single hand results
  if (leftClass.recognized && rightClass.recognized) {
    return {
      mudra: `${leftClass.mudra} + ${rightClass.mudra}`,
      confidence: Math.min(leftClass.confidence, rightClass.confidence),
      recognized: true,
      meaning: `Left: ${leftClass.meaning} | Right: ${rightClass.meaning}`,
    };
  }

  return leftClass.recognized ? leftClass : rightClass;
}
