// src/ui/mobilePerformance.js
// Mobile Performance, Dynamic Resolution Scaling, Touch Detection & Quality Tier Benchmark

// ==========================================
// 1. TOUCH DETECTION (Device & Pointer Type)
// NOT by screen width, so desktop UI is unchanged
// ==========================================
let touchDetected = (typeof navigator !== 'undefined' && ((navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0))) || false;
const touchListeners = new Set();

export function isTouchDevice() {
    return touchDetected;
}

export function onTouchDetected(callback) {
    if (touchDetected) {
        callback();
    } else {
        touchListeners.add(callback);
    }
}

function handleTouchInteraction(e) {
    if (e.pointerType === 'touch' || e.type === 'touchstart') {
        if (!touchDetected) {
            touchDetected = true;
            touchListeners.forEach(cb => {
                try { cb(); } catch (err) { console.error('Touch listener error:', err); }
            });
            touchListeners.clear();
        }
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', handleTouchInteraction, { passive: true, capture: true });
    window.addEventListener('touchstart', handleTouchInteraction, { passive: true, capture: true });
}

// ==========================================
// 2. FIRST-TAP FULLSCREEN REQUEST
// ==========================================
let fullscreenRequested = false;

export function setupFirstTapFullscreen() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const requestFullscreenOnFirstTouch = (e) => {
        if (fullscreenRequested) return;
        if (e.pointerType && e.pointerType !== 'touch') return;

        fullscreenRequested = true;
        const docEl = document.documentElement;
        const rfs = docEl.requestFullscreen ||
                    docEl.webkitRequestFullscreen ||
                    docEl.mozRequestFullScreen ||
                    docEl.msRequestFullscreen;
        if (rfs) {
            try {
                const res = rfs.call(docEl);
                if (res && typeof res.catch === 'function') {
                    res.catch(() => {
                        // User or browser security policy rejected fullscreen; silently ignore
                    });
                }
            } catch (err) {}
        }

        window.removeEventListener('pointerdown', requestFullscreenOnFirstTouch, { capture: true });
        window.removeEventListener('touchstart', requestFullscreenOnFirstTouch, { capture: true });
    };

    window.addEventListener('pointerdown', requestFullscreenOnFirstTouch, { passive: true, capture: true });
    window.addEventListener('touchstart', requestFullscreenOnFirstTouch, { passive: true, capture: true });
}

// ==========================================
// 3. TAB SLEEP
// ==========================================
let isTabHidden = (typeof document !== 'undefined' && document.hidden) || false;

if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        isTabHidden = document.hidden;
    });
}

export function isTabSleep() {
    return isTabHidden;
}

// ==========================================
// 4. QUALITY TIERS & APPLICATION
// Low: DPR 1.0, shadows disabled, view distance 400m, traffic/pedestrian counts -60%, simplified sky.
// Medium: DPR 1.25, shadow map 1024, view distance 700m.
// High: DPR 1.5 max, shadow map 2048, view distance 1400m.
// ==========================================
const STORAGE_KEY = 'mumbai_quality_tier';
let currentQualityTier = 'medium';
let baseDPR = 1.25;
let currentRenderScale = 1.0; // Dynamic Resolution Scale multiplier (0.75 - 1.0)

let boundRenderer = null;
let boundScene = null;
let boundCamera = null;

export function getQualityTier() {
    return currentQualityTier;
}

export function getResolutionScale() {
    return currentRenderScale;
}

function applyEntityDensity(ratio) {
    // 1. Traffic Vehicles
    if (typeof window !== 'undefined' && window.__trafficVehicles && Array.isArray(window.__trafficVehicles)) {
        const vehicles = window.__trafficVehicles;
        const keepCount = Math.floor(vehicles.length * ratio);
        for (let i = 0; i < vehicles.length; i++) {
            const v = vehicles[i];
            const active = (i < keepCount);
            if (v.mesh) v.mesh.visible = active;
            v._disabledByPerf = !active;
        }
    }

    // 2. Pedestrians
    if (typeof window !== 'undefined' && window.__allPedestrians && Array.isArray(window.__allPedestrians)) {
        const peds = window.__allPedestrians;
        const keepCount = Math.floor(peds.length * ratio);
        for (let i = 0; i < peds.length; i++) {
            const p = peds[i];
            const active = (i < keepCount);
            if (p.mesh) p.mesh.visible = active;
            p._disabledByPerf = !active;
        }
    }
}

function setSimplifiedSky(scene, simplified) {
    if (!scene) return;
    scene.traverse((obj) => {
        // Star points field
        if (obj.isPoints && obj.material && obj.material.opacity !== undefined) {
            obj.visible = !simplified;
        }
    });
}

export function applyQualityTier(tier, context = {}) {
    currentQualityTier = tier;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, tier);
        }
    } catch (e) {}

    const renderer = context.renderer || boundRenderer || (typeof window !== 'undefined' ? window.__renderer : null);
    const camera = context.camera || boundCamera || (typeof window !== 'undefined' ? window.__camera : null);
    const scene = context.scene || boundScene || (typeof window !== 'undefined' ? window.__scene : null);

    if (tier === 'low') {
        baseDPR = 1.0;
        if (renderer) {
            renderer.setPixelRatio(baseDPR * currentRenderScale);
            renderer.shadowMap.enabled = false;
        }
        if (camera) {
            camera.far = 400;
            camera.updateProjectionMatrix();
        }
        if (scene && scene.fog) {
            scene.fog.density = 0.0035;
        }
        applyEntityDensity(0.4); // -60% traffic & pedestrians
        setSimplifiedSky(scene, true);
    } else if (tier === 'medium') {
        baseDPR = 1.25;
        if (renderer) {
            renderer.setPixelRatio(baseDPR * currentRenderScale);
            renderer.shadowMap.enabled = true;
            if (renderer.shadowMap.type !== undefined) {
                renderer.shadowMap.type = 1; // THREE.PCFShadowMap
            }
        }
        if (camera) {
            camera.far = 700;
            camera.updateProjectionMatrix();
        }
        if (scene && scene.fog) {
            scene.fog.density = 0.0022;
        }
        applyEntityDensity(0.8);
        setSimplifiedSky(scene, false);
    } else { // 'high'
        const maxDPR = (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.min(window.devicePixelRatio, 1.5) : 1.5;
        baseDPR = maxDPR;
        if (renderer) {
            renderer.setPixelRatio(baseDPR * currentRenderScale);
            renderer.shadowMap.enabled = true;
            if (renderer.shadowMap.type !== undefined) {
                renderer.shadowMap.type = 2; // THREE.PCFSoftShadowMap
            }
        }
        if (camera) {
            camera.far = 1400;
            camera.updateProjectionMatrix();
        }
        if (scene && scene.fog) {
            scene.fog.density = 0.0016;
        }
        applyEntityDensity(1.0);
        setSimplifiedSky(scene, false);
    }

    console.log(`[MobilePerf] Quality tier applied: ${tier} (baseDPR: ${baseDPR}, scale: ${currentRenderScale.toFixed(2)})`);
}

export function setQualityTier(tier) {
    applyQualityTier(tier);
}

// ==========================================
// 5. STARTUP 3-SECOND BENCHMARK
// ==========================================
let benchmarkActive = true;
let benchmarkElapsed = 0.0;
let benchmarkFrames = 0;
let benchmarkCompleted = false;

function finishBenchmark() {
    benchmarkActive = false;
    benchmarkCompleted = true;

    const avgFps = benchmarkElapsed > 0 ? (benchmarkFrames / benchmarkElapsed) : 60;
    console.log(`[MobilePerf] Startup 3s benchmark complete: ${benchmarkFrames} frames in ${benchmarkElapsed.toFixed(2)}s (${avgFps.toFixed(1)} avg FPS)`);

    // Check if user already set manual preference
    let savedTier = null;
    try {
        savedTier = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}

    let assignedTier = savedTier;
    if (!assignedTier) {
        if (avgFps < 32) {
            assignedTier = 'low';
        } else if (avgFps < 52) {
            assignedTier = 'medium';
        } else {
            assignedTier = 'high';
        }
    }

    applyQualityTier(assignedTier);
}

// ==========================================
// 6. DYNAMIC RESOLUTION SCALING (DRS)
// If FPS < 45 for 2s, step down render scale by 0.1 (min 0.75), recover when stable > 55 FPS.
// ==========================================
let lowFpsTimer = 0.0;
let highFpsTimer = 0.0;
let fpsSampleAccumTime = 0.0;
let fpsSampleFrames = 0;
let currentSmoothedFPS = 60.0;

export function updateMobilePerformance(delta) {
    if (delta <= 0 || delta > 0.5) return;

    // 1. Startup benchmark accumulation (first 3.0 seconds)
    if (benchmarkActive) {
        benchmarkElapsed += delta;
        benchmarkFrames++;
        if (benchmarkElapsed >= 3.0) {
            finishBenchmark();
        }
    }

    // 2. Rolling FPS calculation
    fpsSampleAccumTime += delta;
    fpsSampleFrames++;
    if (fpsSampleAccumTime >= 0.5) {
        currentSmoothedFPS = (fpsSampleFrames / fpsSampleAccumTime);
        fpsSampleFrames = 0;
        fpsSampleAccumTime = 0;

        // Dynamic Resolution Scaling logic
        if (currentSmoothedFPS < 45.0) {
            lowFpsTimer += 0.5;
            highFpsTimer = 0.0;
            if (lowFpsTimer >= 2.0) {
                // Step down render scale by 0.1 (minimum 0.75)
                const nextScale = Math.max(0.75, Math.round((currentRenderScale - 0.1) * 100) / 100);
                if (nextScale < currentRenderScale) {
                    currentRenderScale = nextScale;
                    if (boundRenderer) {
                        boundRenderer.setPixelRatio(baseDPR * currentRenderScale);
                    }
                    console.log(`[MobilePerf DRS] Stepped down render scale to ${currentRenderScale} (FPS: ${currentSmoothedFPS.toFixed(1)})`);
                }
                lowFpsTimer = 0.0;
            }
        } else if (currentSmoothedFPS > 55.0) {
            highFpsTimer += 0.5;
            lowFpsTimer = 0.0;
            if (highFpsTimer >= 2.0 && currentRenderScale < 1.0) {
                // Recover render scale by 0.1 (up to 1.0)
                const nextScale = Math.min(1.0, Math.round((currentRenderScale + 0.1) * 100) / 100);
                if (nextScale > currentRenderScale) {
                    currentRenderScale = nextScale;
                    if (boundRenderer) {
                        boundRenderer.setPixelRatio(baseDPR * currentRenderScale);
                    }
                    console.log(`[MobilePerf DRS] Recovered render scale to ${currentRenderScale} (FPS: ${currentSmoothedFPS.toFixed(1)})`);
                }
                highFpsTimer = 0.0;
            }
        } else {
            lowFpsTimer = Math.max(0, lowFpsTimer - 0.25);
            highFpsTimer = Math.max(0, highFpsTimer - 0.25);
        }
    }
}

// ==========================================
// 7. INITIALIZATION
// ==========================================
export function initMobilePerformance(options = {}) {
    boundRenderer = options.renderer || (typeof window !== 'undefined' ? window.__renderer : null);
    boundScene = options.scene || (typeof window !== 'undefined' ? window.__scene : null);
    boundCamera = options.camera || (typeof window !== 'undefined' ? window.__camera : null);

    setupFirstTapFullscreen();

    // Check existing stored tier
    let savedTier = 'medium';
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && ['low', 'medium', 'high'].includes(stored)) {
            savedTier = stored;
        }
    } catch (e) {}

    // Initial tier application
    applyQualityTier(savedTier, { renderer: boundRenderer, scene: boundScene, camera: boundCamera });

    console.log('[MobilePerf] Mobile Performance System Initialized');
}

// Expose on window for debugging & automated tests
if (typeof window !== 'undefined') {
    window.__mobilePerformance = {
        isTouchDevice,
        isTabSleep,
        getQualityTier,
        setQualityTier,
        applyQualityTier,
        getResolutionScale,
        updateMobilePerformance
    };
}
