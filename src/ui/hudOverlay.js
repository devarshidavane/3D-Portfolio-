// ==========================================
// HUD OVERLAYS, TELEMETRY & WEB AUDIO SYNTHESIZER
// ==========================================

export let audioEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export function playSound(type = 'chime') {
    if (!audioEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        if (type === 'repulsor') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(360, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.4);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.4);
        } else if (type === 'landing') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(25, now + 0.5);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.5);
        } else if (type === 'engine') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.16);
        } else if (type === 'chime') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(780, now);
            osc.frequency.setValueAtTime(1180, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.3);
        } else if (type === 'trainHorn') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.6);
        } else if (type === 'thunder') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(65, now);
            osc.frequency.exponentialRampToValueAtTime(18, now + 1.2);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 1.2);
        } else if (type === 'waypoint') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(1320, now + 0.08);
            osc.frequency.setValueAtTime(1760, now + 0.16);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.35);
        } else if (type === 'teleport') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.4);
        }
    } catch (e) {}
}

export function toggleAudio() {
    audioEnabled = !audioEnabled;
    const btn = document.getElementById('btn-toggle-audio');
    if (btn) {
        btn.textContent = audioEnabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
        btn.classList.toggle('active', audioEnabled);
    }
}

let flightAudioLoop = null;
let flightAudioGain = null;

export function startFlightAudio() {
    if (!audioEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    try {
        if (!flightAudioLoop) {
            flightAudioLoop = audioCtx.createOscillator();
            flightAudioGain = audioCtx.createGain();
            flightAudioLoop.type = 'sawtooth';
            flightAudioLoop.frequency.setValueAtTime(140, audioCtx.currentTime);
            flightAudioGain.gain.setValueAtTime(0.04, audioCtx.currentTime);
            flightAudioLoop.connect(flightAudioGain);
            flightAudioGain.connect(audioCtx.destination);
            flightAudioLoop.start();
        }
    } catch (e) {}
}

export function updateFlightAudio(speed, isBoosting) {
    if (!flightAudioLoop || !flightAudioGain) return;
    try {
        const now = audioCtx.currentTime;
        const targetFreq = isBoosting ? (420 + Math.random() * 25) : (140 + Math.abs(speed) * 4.2);
        const targetVol = audioEnabled ? (isBoosting ? 0.12 : 0.05) : 0;
        flightAudioLoop.frequency.setTargetAtTime(targetFreq, now, 0.06);
        flightAudioGain.gain.setTargetAtTime(targetVol, now, 0.06);
    } catch (e) {}
}

export function stopFlightAudio() {
    if (flightAudioLoop) {
        try {
            flightAudioGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.08);
            setTimeout(() => {
                if (flightAudioLoop) {
                    flightAudioLoop.stop();
                    flightAudioLoop.disconnect();
                    flightAudioLoop = null;
                    flightAudioGain = null;
                }
            }, 120);
        } catch (e) {}
    }
}

export function showPrompt(key, text) {
    const interactionKeyEl = document.getElementById('interaction-key');
    const interactionLabelEl = document.getElementById('interaction-label');
    const interactionPromptEl = document.getElementById('interaction-prompt');
    if (interactionKeyEl) interactionKeyEl.textContent = key;
    if (interactionLabelEl) interactionLabelEl.textContent = text;
    if (interactionPromptEl) interactionPromptEl.classList.add('show');
}

export function hidePrompt() {
    const interactionPromptEl = document.getElementById('interaction-prompt');
    if (interactionPromptEl) interactionPromptEl.classList.remove('show');
}

let lastTachoDisplay = null;
let lastKmh = -1;
let lastReversing = null;
let lastNeedleAngle = null;
let lastArcOffset = null;
let lastGearText = null;
let lastGearBadge = null;

export function updateTachometerHUD(speed, isReversing, isVehicle = false) {
    const tachometerCard = document.getElementById('tachometer-card');
    if (tachometerCard) {
        if (!isVehicle) {
            if (lastTachoDisplay !== 'none') {
                tachometerCard.style.display = 'none';
                lastTachoDisplay = 'none';
            }
            return;
        }
        if (lastTachoDisplay !== 'flex') {
            tachometerCard.style.display = 'flex';
            lastTachoDisplay = 'flex';
        }
    } else if (!isVehicle) {
        return;
    }

    const kmh = Math.round(Math.abs(speed) * 3.6);

    if (kmh !== lastKmh) {
        lastKmh = kmh;
        const tachoSpeedVal = document.getElementById('tacho-speed-value');
        if (tachoSpeedVal) {
            tachoSpeedVal.textContent = kmh;
        }
        const speedoVal = document.getElementById('speedo-val');
        if (speedoVal) {
            speedoVal.textContent = kmh;
        }
    }

    if (isReversing !== lastReversing) {
        lastReversing = isReversing;
        const speedoUnit = document.getElementById('speedo-unit');
        if (speedoUnit) {
            speedoUnit.textContent = isReversing ? 'REV' : 'KM/H';
        }
        const tachoModeLabel = document.getElementById('tacho-mode-label');
        if (tachoModeLabel) {
            tachoModeLabel.textContent = isReversing ? 'SPEED | REVERSE' : 'SPEED | SPORT MODE';
        }
    }

    // Needle rotation angle for #tacho-needle-pivot (-125deg to +125deg, 0 to 180 km/h)
    const maxDialSpeed = 180;
    const clampedSpeed = Math.min(Math.max(kmh, 0), maxDialSpeed);
    const needleAngle = (-125 + (clampedSpeed / maxDialSpeed) * 250).toFixed(1);
    if (needleAngle !== lastNeedleAngle) {
        lastNeedleAngle = needleAngle;
        const needlePivot = document.getElementById('tacho-needle-pivot');
        if (needlePivot) {
            needlePivot.style.transform = `rotate(${needleAngle}deg)`;
        }
    }

    const arcOffset = (356 - (clampedSpeed / maxDialSpeed) * 356).toFixed(1);
    if (arcOffset !== lastArcOffset) {
        lastArcOffset = arcOffset;
        const tachoActiveArc = document.getElementById('tacho-active-arc');
        if (tachoActiveArc) {
            tachoActiveArc.style.strokeDashoffset = arcOffset;
        }
    }

    // Gear indicator logic
    let gearText = 'N';
    let gearBadge = 'NEUTRAL';
    if (isReversing) {
        gearText = 'R';
        gearBadge = 'REVERSE';
    } else if (kmh < 1) {
        gearText = 'N';
        gearBadge = 'NEUTRAL';
    } else if (kmh < 25) {
        gearText = '1';
        gearBadge = '1ST GEAR';
    } else if (kmh < 50) {
        gearText = '2';
        gearBadge = '2ND GEAR';
    } else if (kmh < 80) {
        gearText = '3';
        gearBadge = '3RD GEAR';
    } else if (kmh < 115) {
        gearText = '4';
        gearBadge = '4TH GEAR';
    } else {
        gearText = '5';
        gearBadge = '5TH GEAR';
    }

    if (gearText !== lastGearText) {
        lastGearText = gearText;
        let hudGear = document.getElementById('hud-gear');
        if (!hudGear && tachometerCard) {
            hudGear = document.createElement('span');
            hudGear.id = 'hud-gear';
            hudGear.style.display = 'none';
            tachometerCard.appendChild(hudGear);
        }
        if (hudGear) {
            hudGear.textContent = gearText;
        }
    }

    if (gearBadge !== lastGearBadge) {
        lastGearBadge = gearBadge;
        const tachoGearBadge = document.getElementById('tacho-gear-badge');
        if (tachoGearBadge) {
            tachoGearBadge.textContent = gearBadge;
        }
    }
}

// ==========================================
// REAL-TIME PERFORMANCE TELEMETRY (FPS, CALLS, TRIS)
// ==========================================
let fpsTimer = null;
let frameCounter = 0;
let lastFpsTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
let activeRenderer = null;

export function recordFrame() {
    frameCounter++;
}

export function updatePerformanceHUD() {
    const badge = document.getElementById('fps-badge');
    if (!badge) return;

    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const elapsed = (now - lastFpsTime) / 1000;
    const fps = (elapsed > 0 && frameCounter > 0) ? Math.round(frameCounter / elapsed) : 60;
    frameCounter = 0;
    lastFpsTime = now;

    const rend = activeRenderer || (typeof window !== 'undefined' ? window.__renderer : null);
    const calls = rend?.info?.render?.calls ?? 0;
    const tris = rend?.info?.render?.triangles ?? 0;
    const trisK = Number((tris / 1000).toFixed(1));

    badge.textContent = `${fps} FPS | Calls: ${calls} | Tris: ${trisK}k`;
}

export function initPerformanceHUD(renderer) {
    if (renderer) activeRenderer = renderer;
    const badge = document.getElementById('fps-badge');
    if (badge) {
        badge.style.display = 'inline-flex';
    }

    lastFpsTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    frameCounter = 0;

    // Initial immediate snapshot
    updatePerformanceHUD();

    if (fpsTimer) clearInterval(fpsTimer);
    fpsTimer = setInterval(updatePerformanceHUD, 500);
}

if (typeof window !== 'undefined') {
    window.updateTachometerHUD = updateTachometerHUD;
    window.__updateTachometerHUD = updateTachometerHUD;
    window.initPerformanceHUD = initPerformanceHUD;
    window.__initPerformanceHUD = initPerformanceHUD;
    window.recordFrame = recordFrame;
    window.__recordFrame = recordFrame;
    window.updatePerformanceHUD = updatePerformanceHUD;
}
