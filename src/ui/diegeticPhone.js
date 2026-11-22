import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { applyVertexColor } from '../world/textures.js';
import { characterGroup, devChar } from '../character/playerCharacter.js';
import { activeVehicle } from '../vehicles/playerVehicles.js';
import { playSound } from './hudOverlay.js';
import { poiSchool } from '../landmarks/schoolBuilding.js';
import { poiCollege } from '../landmarks/collegeBuilding.js';
import { poiHome } from '../landmarks/homeSkyscraper.js';
import { poiGateway } from '../landmarks/iconicLandmarks.js';
import { poiAirport } from '../landmarks/airportDistrict.js';

// ============================================================================
// DIEGETIC GTA V-STYLE 3D SMARTPHONE (CYBERPHONE)
// High-performance diegetic 3D phone model with offscreen 512x1024 canvas UI,
// 2-bone arm/hand rig, over-the-shoulder camera, secondary camera selfie/rear,
// gallery with PNG export, contacts fast-travel, portfolio, and original vector icons.
// Strictly <= 3 draw calls: Phone Body Mesh + Screen Quad + Viewmodel Hand Mesh.
// ============================================================================

export let isPhoneOpen = false;
export let activeApp = 'home'; // 'home', 'map', 'camera', 'gallery', 'contacts', 'portfolio', 'messages', 'settings', 'weather'

// 3D Scene Objects (Total <= 3 Draw Calls)
export let phoneGroup = null;
export let phoneBodyMesh = null;
export let phoneScreenMesh = null;
export let viewmodelHandMesh = null;
let phoneScreenTexture = null;
let phoneGlowLight = null;

// Secondary Camera for Selfie / World Viewfinder
let cameraSelfie = null;
let renderTargetCamera = null;
let cameraModeType = 'selfie'; // 'selfie' or 'rear'
let activeCameraFilter = 'normal'; // 'normal', 'cyber', 'noir', 'gold', 'matrix'
let cameraZoom = 1.0;
let cameraFlashTimer = 0;

// Camera Framing State
let originalCamFov = 52;
let targetCamFov = 52;
let phoneBlendT = 0; // 0 = closed, 1 = fully open
let isAnimatingPhone = false;

// UI & Offscreen Canvas (512x1024)
let phoneCanvas = null;
let pCtx = null;
let isUiDirty = true;
let selectedGridIndex = 0; // 0 to 7 on home screen
let galleryPhotos = [];
let fullScreenPhoto = null;
let activePortfolioTab = 0; // 0: Bio, 1: Projects, 2: Stack, 3: Links

// Map App State
let mapPanX = 0;
let mapPanY = 0;
let mapZoom = 1.0;

// Dependencies passed from main loop
let mainScene = null;
let mainCamera = null;
let mainRenderer = null;
let onFastTravelCallback = null;

// Audio Synthesizer for Phone (Zero External Heavy Assets)
let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (AudioCtor) audioCtx = new AudioCtor();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

export function playPhoneSound(type) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'tap') {
        // High crisp tactile click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.022);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.025);
    } else if (type === 'back') {
        // Lower pitch back click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(820, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.035);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
    } else if (type === 'open') {
        // Rising dual-tone chime
        [640, 1180].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.12, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.09);
        });
    } else if (type === 'close') {
        // Soft descending chirp
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1050, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.085);
    } else if (type === 'shutter') {
        // Mechanical two-click camera shutter
        const bufferSize = ctx.sampleRate * 0.06;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1600;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);

        // Body resonant thump
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now + 0.015);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
        oscGain.gain.setValueAtTime(0.25, now + 0.015);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now + 0.015);
        osc.stop(now + 0.085);
    } else if (type === 'ring') {
        // Telecom outgoing ringing burst
        [440, 480].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    }
}

// ============================================================================
// 1. 3D PHONE MODEL & HAND RIG ARCHITECTURE (<= 3 Draw Calls)
// ============================================================================

export function buildDiegeticPhone(scene, camera, renderer, fastTravelFn) {
    mainScene = scene;
    mainCamera = camera;
    mainRenderer = renderer;
    onFastTravelCallback = fastTravelFn;

    // Create 512x1024 Offscreen Screen Canvas
    phoneCanvas = document.createElement('canvas');
    phoneCanvas.width = 512;
    phoneCanvas.height = 1024;
    pCtx = phoneCanvas.getContext('2d');

    phoneScreenTexture = new THREE.CanvasTexture(phoneCanvas);
    phoneScreenTexture.minFilter = THREE.LinearFilter;
    phoneScreenTexture.magFilter = THREE.LinearFilter;
    phoneScreenTexture.generateMipmaps = false;

    // 3D Phone Group
    phoneGroup = new THREE.Group();
    phoneGroup.name = "DiegeticCyberPhone";

    const phoneW = 0.076;
    const phoneH = 0.158;
    const phoneD = 0.0078;

    // --- MESH 1: CONSOLIDATED PHONE BODY (1 Draw Call) ---
    const bodyParts = [];

    // Main Chassis Box (Titanium Black)
    const bodyGeom = applyVertexColor(new THREE.BoxGeometry(phoneW, phoneH, phoneD), 0x111625);
    bodyParts.push(bodyGeom);

    // Bezel Rim Frame (Neon Cyan Accent)
    const bezelGeom = applyVertexColor(new THREE.BoxGeometry(phoneW + 0.0012, phoneH + 0.0012, 0.002), 0x0ea5e9);
    bezelGeom.translate(0, 0, 0.0028);
    bodyParts.push(bezelGeom);

    // Speaker Slit (Deep Black)
    const notchGeom = applyVertexColor(new THREE.BoxGeometry(0.016, 0.0022, 0.001), 0x020617);
    notchGeom.translate(0, phoneH * 0.5 - 0.005, phoneD * 0.5 + 0.0008);
    bodyParts.push(notchGeom);

    // Rear Dual Camera Housing Bump
    const camBumpGeom = applyVertexColor(new THREE.BoxGeometry(0.024, 0.038, 0.0035), 0x182033);
    camBumpGeom.translate(-phoneW * 0.5 + 0.018, phoneH * 0.5 - 0.026, -phoneD * 0.5 - 0.0018);
    bodyParts.push(camBumpGeom);

    // Dual Rear Camera Lenses
    [-0.019, -0.031].forEach(ly => {
        const lensGeom = applyVertexColor(new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 12), 0x020617);
        lensGeom.rotateX(Math.PI / 2);
        lensGeom.translate(-phoneW * 0.5 + 0.018, phoneH * 0.5 + ly, -phoneD * 0.5 - 0.0036);
        bodyParts.push(lensGeom);
    });

    const mergedBodyGeom = BufferGeometryUtils.mergeGeometries(bodyParts, false);
    const bodyMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.85,
        roughness: 0.22,
        envMapIntensity: 1.0
    });
    phoneBodyMesh = new THREE.Mesh(mergedBodyGeom, bodyMat);
    phoneBodyMesh.castShadow = true;
    phoneGroup.add(phoneBodyMesh);

    // --- MESH 2: FRONT SCREEN QUAD (1 Draw Call) ---
    const screenW = 0.071;
    const screenH = 0.151;
    const screenGeom = new THREE.PlaneGeometry(screenW, screenH);
    const screenMat = new THREE.MeshBasicMaterial({
        map: phoneScreenTexture,
        toneMapped: false
    });
    phoneScreenMesh = new THREE.Mesh(screenGeom, screenMat);
    phoneScreenMesh.position.set(0, 0, phoneD * 0.5 + 0.0006);
    phoneScreenMesh.name = "PhoneScreen";
    phoneGroup.add(phoneScreenMesh);

    // --- MESH 3: VIEWMODEL HAND RIG (1 Draw Call) ---
    viewmodelHandMesh = buildMergedViewmodelHand();
    phoneGroup.add(viewmodelHandMesh);

    // Screen Glow Point Light (Doesn't add mesh draw call)
    phoneGlowLight = new THREE.PointLight(0x38bdf8, 0.45, 0.45);
    phoneGlowLight.position.set(0, 0, 0.06);
    phoneGroup.add(phoneGlowLight);

    // Initially hide phone until opened
    phoneGroup.visible = false;
    scene.add(phoneGroup);

    // Secondary Camera for Live Viewfinder
    cameraSelfie = new THREE.PerspectiveCamera(65, 512 / 850, 0.1, 1000);

    // Initial Screen Draw
    renderPhoneScreen();

    // Setup Event Listeners (Mouse / Pointer Raycasting & Keyboard)
    initPhoneInputListeners();

    console.log("[DiegeticPhone] 3D phone model initialized with 3 consolidated draw calls.");
}

function buildMergedViewmodelHand() {
    const skinColor = 0xc68652;
    const sleeveColor = 0x18181b;

    const handParts = [];

    // Forearm Sleeve Tube (Shirt Fabric)
    const sleeveGeom = applyVertexColor(new THREE.CylinderGeometry(0.042, 0.038, 0.16, 12), sleeveColor);
    sleeveGeom.translate(0.08, -0.16, -0.06);
    sleeveGeom.rotateZ(0.25);
    handParts.push(sleeveGeom);

    // Palm / Hand Base (Skin)
    const palmGeom = applyVertexColor(new THREE.BoxGeometry(0.055, 0.075, 0.032), skinColor);
    palmGeom.translate(0.035, -0.045, -0.024);
    handParts.push(palmGeom);

    // 4 Gripping Fingers on Left/Back Edge (Skin)
    [-0.04, -0.015, 0.01, 0.035].forEach(fy => {
        const fingerGeom = applyVertexColor(new THREE.BoxGeometry(0.016, 0.014, 0.048), skinColor);
        fingerGeom.translate(-0.044, fy - 0.02, 0.005);
        fingerGeom.rotateY(-0.25);
        handParts.push(fingerGeom);
    });

    // Thumb Base along Right Edge (Skin)
    const thumbGeom = applyVertexColor(new THREE.BoxGeometry(0.018, 0.036, 0.018), skinColor);
    thumbGeom.translate(0.048, -0.022, 0.010);
    handParts.push(thumbGeom);

    const mergedHandGeom = BufferGeometryUtils.mergeGeometries(handParts, false);
    const handMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.65
    });

    const handMesh = new THREE.Mesh(mergedHandGeom, handMat);
    handMesh.name = "ViewmodelHandMesh";
    return handMesh;
}

// ============================================================================
// 2. OPEN / CLOSE SEQUENCE & CAMERA FRAMING
// ============================================================================

export function toggleDiegeticPhone() {
    if (isPhoneOpen) closeDiegeticPhone();
    else openDiegeticPhone();
}

export function openDiegeticPhone() {
    if (isPhoneOpen) return;
    isPhoneOpen = true;
    phoneGroup.visible = true;
    playPhoneSound('open');

    // Fade out HUD (150ms transition)
    document.body.classList.add('phone-active');

    // Trigger opening animation
    phoneBlendT = 0;
    isAnimatingPhone = true;
    isUiDirty = true;
}

export function closeDiegeticPhone() {
    if (!isPhoneOpen) return;
    isPhoneOpen = false;
    playPhoneSound('close');

    // Restore HUD
    document.body.classList.remove('phone-active');

    // Clean up camera app and dispose render target
    if (activeApp === 'camera') {
        disposeCameraRenderTarget();
        activeApp = 'home';
    }

    isAnimatingPhone = true;
}

function ensureCameraRenderTarget() {
    if (!renderTargetCamera && mainRenderer) {
        renderTargetCamera = new THREE.WebGLRenderTarget(512, 850, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat
        });
    }
}

function disposeCameraRenderTarget() {
    if (renderTargetCamera) {
        renderTargetCamera.dispose();
        renderTargetCamera = null;
        console.log("[Camera] RenderTarget cleanly disposed.");
    }
}

export function updateDiegeticPhone(delta, camera, isDriving) {
    if (!phoneGroup) return;

    // Smooth open / close transition (over ~350ms)
    const animSpeed = delta * 3.2; // ~350ms full blend
    if (isPhoneOpen) {
        if (phoneBlendT < 1.0) {
            phoneBlendT = Math.min(1.0, phoneBlendT + animSpeed);
        } else {
            isAnimatingPhone = false;
        }
    } else {
        if (phoneBlendT > 0.0) {
            phoneBlendT = Math.max(0.0, phoneBlendT - animSpeed);
        } else {
            phoneGroup.visible = false;
            isAnimatingPhone = false;
        }
    }

    if (phoneBlendT <= 0.001 && !isPhoneOpen) {
        if (phoneGroup.parent) phoneGroup.parent.remove(phoneGroup);
        return;
    }

    // Attach phone to camera viewmodel for crisp, zero-clipping GTA V diegetic framing
    if (phoneGroup.parent !== camera) {
        camera.add(phoneGroup);
    }
    phoneGroup.visible = true;

    // Ease-out cubic curve
    const ease = 1 - Math.pow(1 - phoneBlendT, 3);

    // Natural idle sway and breathing while held
    const time = performance.now() * 0.002;
    const breathSway = Math.sin(time * 1.8) * 0.002;
    const swayH = Math.cos(time * 1.2) * 0.0018;

    // Detect mobile landscape
    const isMobileLandscape = (window.innerWidth <= 900 && window.innerWidth > window.innerHeight);

    // Target Viewmodel Position & Rotation (GTA V Right-Hand Hold)
    const targetX = isMobileLandscape ? 0.22 + swayH : (isDriving ? 0.19 + swayH : 0.16 + swayH);
    const targetY = isMobileLandscape ? -0.02 + breathSway : (isDriving ? -0.14 + breathSway : -0.05 + breathSway);
    const targetZ = isMobileLandscape ? -0.32 : (isDriving ? -0.38 : -0.35);

    // Rise animation from bottom-right (y: -0.65 -> targetY)
    const currentY = THREE.MathUtils.lerp(-0.65, targetY, ease);
    const currentRotX = THREE.MathUtils.lerp(0.45, -0.08, ease);
    const currentRotY = THREE.MathUtils.lerp(0.35, -0.14, ease);
    const currentRotZ = THREE.MathUtils.lerp(0.20, 0.02, ease);

    phoneGroup.position.set(targetX, currentY, targetZ);
    phoneGroup.rotation.set(currentRotX, currentRotY, currentRotZ);

    // In 3rd person on-foot: Animate character's right arm raising to chest height
    if (devChar && devChar.armR && !isDriving) {
        const restRx = 0;
        const targetRx = -1.25;
        const targetRy = -0.38;
        const targetRz = -0.42;

        devChar.armR.rotation.x = THREE.MathUtils.lerp(restRx, targetRx, ease);
        devChar.armR.rotation.y = THREE.MathUtils.lerp(0, targetRy, ease);
        devChar.armR.rotation.z = THREE.MathUtils.lerp(0, targetRz, ease);
    }

    // Camera FOV Narrows 10 Degrees (52 -> 42)
    if (phoneBlendT > 0.01) {
        targetCamFov = THREE.MathUtils.lerp(52, 42, ease);
        if (Math.abs(camera.fov - targetCamFov) > 0.05) {
            camera.fov = targetCamFov;
            camera.updateProjectionMatrix();
        }
    } else {
        if (camera.fov !== 52) {
            camera.fov = 52;
            camera.updateProjectionMatrix();
        }
    }

    // Camera App Real-time Render
    if (activeApp === 'camera' && cameraSelfie && mainRenderer) {
        ensureCameraRenderTarget();
        updateCameraAppRender();
        isUiDirty = true;
    }

    // Update 2D Canvas Texture if dirty
    if (isUiDirty) {
        renderPhoneScreen();
        phoneScreenTexture.needsUpdate = true;
        isUiDirty = false;
    }
}

// ============================================================================
// 3. OFFSCREEN CANVAS 2D UI RENDERING (GTA V STYLE)
// ============================================================================

function renderPhoneScreen() {
    if (!pCtx) return;
    pCtx.save();

    // Background Wallpaper
    pCtx.fillStyle = '#0a0e1a';
    pCtx.fillRect(0, 0, 512, 1024);

    // Subtle Hexagonal / Cyber Grid Accent on Wallpaper
    drawCyberWallpaper(pCtx);

    // Status Bar (Signal, 5G, Clock, Battery)
    drawPhoneStatusBar(pCtx);

    // Active App Screen Router
    if (activeApp === 'home') {
        drawHomeScreen(pCtx);
    } else if (activeApp === 'map') {
        drawMapApp(pCtx);
    } else if (activeApp === 'camera') {
        drawCameraApp(pCtx);
    } else if (activeApp === 'gallery') {
        drawGalleryApp(pCtx);
    } else if (activeApp === 'contacts') {
        drawContactsApp(pCtx);
    } else if (activeApp === 'portfolio') {
        drawPortfolioApp(pCtx);
    } else if (activeApp === 'messages') {
        drawMessagesApp(pCtx);
    } else if (activeApp === 'settings') {
        drawSettingsApp(pCtx);
    } else if (activeApp === 'weather') {
        drawWeatherApp(pCtx);
    }

    // Bottom Navigation Softkeys Bar
    drawPhoneSoftkeys(pCtx);

    pCtx.restore();
}

function drawCyberWallpaper(ctx) {
    // Ambient gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, '#0c1427');
    grad.addColorStop(0.4, '#0f172a');
    grad.addColorStop(1, '#050914');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 1024);

    // Thin cyber grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 80; y < 960; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
    }
    for (let x = 32; x < 512; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 80);
        ctx.lineTo(x, 960);
        ctx.stroke();
    }
}

function drawPhoneStatusBar(ctx) {
    ctx.fillStyle = 'rgba(11, 17, 33, 0.85)';
    ctx.fillRect(0, 0, 512, 44);

    // 4 Signal Bars
    const barX = 24;
    const barY = 28;
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(barX + i * 5, barY - (i + 1) * 3, 3, (i + 1) * 3);
    }

    // 5G Network Tag
    ctx.font = 'bold 12px "Oswald", "JetBrains Mono", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('5G', 52, 26);

    // Centered Digital Clock
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    ctx.font = 'bold 16px "Oswald", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(timeStr, 256, 28);
    ctx.textAlign = 'left';

    // Battery Icon (Pill with Charge level)
    const batX = 444;
    const batY = 16;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(batX, batY, 28, 14);
    ctx.fillRect(batX + 28, batY + 3.5, 2.5, 7);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(batX + 2, batY + 2, 22, 10);

    // Divider Line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, 44);
    ctx.lineTo(512, 44);
    ctx.stroke();
}

function drawPhoneSoftkeys(ctx) {
    ctx.fillStyle = 'rgba(9, 14, 28, 0.95)';
    ctx.fillRect(0, 968, 512, 56);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 968);
    ctx.lineTo(512, 968);
    ctx.stroke();

    // 3 Clean Touch Buttons: Back, Home, Task
    // Back (triangle)
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(110, 996);
    ctx.lineTo(124, 986);
    ctx.lineTo(124, 1006);
    ctx.closePath();
    ctx.fill();

    // Home (circle)
    ctx.beginPath();
    ctx.arc(256, 996, 9, 0, Math.PI * 2);
    ctx.fill();

    // Task (square)
    ctx.strokeRect(386, 988, 16, 16);
}

// ============================================================================
// 4. APP SCREENS (HOME, MAP, CAMERA, GALLERY, CONTACTS, PORTFOLIO, ETC)
// ============================================================================

const APPS_LIST = [
    { id: 'map', name: 'MAP & GPS', color: '#0284c7', icon: 'map' },
    { id: 'camera', name: 'CAMERA', color: '#475569', icon: 'camera' },
    { id: 'gallery', name: 'GALLERY', color: '#8b5cf6', icon: 'gallery' },
    { id: 'contacts', name: 'CONTACTS', color: '#10b981', icon: 'contacts' },
    { id: 'portfolio', name: 'PORTFOLIO', color: '#06b6d4', icon: 'portfolio' },
    { id: 'messages', name: 'MESSAGES', color: '#f59e0b', icon: 'messages' },
    { id: 'settings', name: 'SETTINGS', color: '#64748b', icon: 'settings' },
    { id: 'weather', name: 'ATMOSPHERE', color: '#ea580c', icon: 'weather' }
];

function drawHomeScreen(ctx) {
    // Large Hero Clock & Location
    ctx.textAlign = 'center';
    ctx.font = '700 62px "Oswald", sans-serif';
    ctx.fillStyle = '#f8fafc';
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    ctx.fillText(timeStr, 256, 142);

    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('MUMBAI DIGITAL TWIN • 60 FPS', 256, 172);

    // Notification Banner Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    roundRect(ctx, 36, 198, 440, 64, 12, true, false);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    roundRect(ctx, 36, 198, 440, 64, 12, false, true);

    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Oswald", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('⚡ HOME HQ TERMINAL', 54, 224);
    ctx.font = '12px "JetBrains Mono", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('All 68 building sectors and collision hashes active.', 54, 246);

    // 3x3 App Tiles Grid
    const startX = 46;
    const startY = 300;
    const tileW = 104;
    const tileH = 104;
    const gapX = 40;
    const gapY = 48;

    APPS_LIST.forEach((app, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = startX + col * (tileW + gapX);
        const y = startY + row * (tileH + gapY);

        const isSelected = (selectedGridIndex === idx);

        // Selection Highlight Ring
        if (isSelected) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 14;
            roundRect(ctx, x - 5, y - 5, tileW + 10, tileH + 10, 22, false, true);
            ctx.shadowBlur = 0;
        }

        // App Tile Background
        const grad = ctx.createLinearGradient(x, y, x, y + tileH);
        grad.addColorStop(0, app.color);
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, tileW, tileH, 18, true, false);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        roundRect(ctx, x, y, tileW, tileH, 18, false, true);

        // Vector App Icon
        drawVectorAppIcon(ctx, app.icon, x + tileW * 0.5, y + tileH * 0.44);

        // App Label Underneath
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px "Oswald", sans-serif';
        ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';
        ctx.fillText(app.name, x + tileW * 0.5, y + tileH + 22);
    });

    ctx.textAlign = 'left';
}

function drawVectorAppIcon(ctx, iconType, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    if (iconType === 'map') {
        // Folded Map with Location Pin
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-18, -12);
        ctx.lineTo(-6, -18);
        ctx.lineTo(6, -12);
        ctx.lineTo(18, -18);
        ctx.lineTo(18, 14);
        ctx.lineTo(6, 20);
        ctx.lineTo(-6, 14);
        ctx.lineTo(-18, 20);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
    } else if (iconType === 'camera') {
        // Camera Aperture Lens
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-20, -12, 40, 28);
        ctx.fillRect(-8, -17, 16, 5);

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 2, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(12, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
    } else if (iconType === 'gallery') {
        // Picture Frame with Mountain
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-18, -14, 36, 28);

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(8, -4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-14, 10);
        ctx.lineTo(-4, -2);
        ctx.lineTo(4, 6);
        ctx.lineTo(10, 0);
        ctx.lineTo(14, 10);
        ctx.closePath();
        ctx.fill();
    } else if (iconType === 'contacts') {
        // User Silhouette & Phone
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -6, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, 12, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (iconType === 'portfolio') {
        // Code Brackets & Briefcase
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-16, -10, 32, 24);
        ctx.strokeRect(-7, -16, 14, 6);

        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText('< / >', 0, 7);
    } else if (iconType === 'messages') {
        // Speech Bubble with Dots
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, -18, -14, 36, 26, 6, true, false);
        ctx.beginPath();
        ctx.moveTo(-6, 12);
        ctx.lineTo(-12, 20);
        ctx.lineTo(0, 12);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        [-8, 0, 8].forEach(dx => {
            ctx.beginPath();
            ctx.arc(dx, -1, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    } else if (iconType === 'settings') {
        // Gear Cog
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            ctx.fillRect(Math.cos(ang) * 12 - 2.5, Math.sin(ang) * 12 - 2.5, 5, 5);
        }
    } else if (iconType === 'weather') {
        // Sun behind Cloud
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(-4, -4, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(6, 6, 8, 0, Math.PI * 2);
        ctx.arc(-4, 8, 7, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawAppHeader(ctx, title) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(0, 44, 512, 54);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 98);
    ctx.lineTo(512, 98);
    ctx.stroke();

    // Back Touch Button
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px "Oswald", sans-serif';
    ctx.fillText('‹ HOME', 24, 78);

    // App Title
    ctx.font = 'bold 20px "Oswald", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(title, 256, 78);
    ctx.textAlign = 'left';
}

// ----------------------------------------------------------------------------
// APP 1: MAP APP
// ----------------------------------------------------------------------------
function drawMapApp(ctx) {
    drawAppHeader(ctx, 'MUMBAI SATELLITE ATLAS');

    // Map Viewport (clip area)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 98, 512, 870);
    ctx.clip();

    // Map Ocean Background
    ctx.fillStyle = '#061325';
    ctx.fillRect(0, 98, 512, 870);

    const cx = 256 + mapPanX;
    const cy = 530 + mapPanY;
    const scale = 0.16 * mapZoom;

    // Landmass Silhouette
    ctx.fillStyle = '#0f1d33';
    ctx.beginPath();
    ctx.moveTo(cx - 240 * scale, cy - 2500 * scale);
    ctx.lineTo(cx + 600 * scale, cy - 2500 * scale);
    ctx.lineTo(cx + 800 * scale, cy + 2500 * scale);
    ctx.lineTo(cx - 500 * scale, cy + 2500 * scale);
    ctx.closePath();
    ctx.fill();

    // Road Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2.5 * mapZoom;
    ctx.beginPath();
    // Midtown Expressway
    ctx.moveTo(cx, cy - 1800 * scale);
    ctx.lineTo(cx, cy + 1800 * scale);
    // Coastal Highway
    ctx.moveTo(cx - 280 * scale, cy - 1200 * scale);
    ctx.lineTo(cx + 250 * scale, cy + 600 * scale);
    ctx.stroke();

    // Landmarks Blips
    const landmarks = [
        { name: 'HOME HQ', x: poiHome.x, z: poiHome.z, color: '#38bdf8' },
        { name: 'DMCE', x: poiCollege.x, z: poiCollege.z, color: '#10b981' },
        { name: 'FR. AGNEL', x: poiSchool.x, z: poiSchool.z, color: '#f59e0b' },
        { name: 'GATEWAY', x: poiGateway.x, z: poiGateway.z, color: '#ec4899' },
        { name: 'AIRPORT', x: poiAirport.x, z: poiAirport.z, color: '#a855f7' }
    ];

    landmarks.forEach(lm => {
        const lx = cx + lm.x * scale;
        const ly = cy + lm.z * scale;
        ctx.fillStyle = lm.color;
        ctx.beginPath();
        ctx.arc(lx, ly, 7 * mapZoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 11px "Oswald", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(lm.name, lx + 10, ly + 4);
    });

    // Player Location Arrow
    const px = cx + characterGroup.position.x * scale;
    const py = cy + characterGroup.position.z * scale;
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Map Zoom / Fast Travel Floating Buttons
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    roundRect(ctx, 420, 810, 64, 120, 10, true, false);
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('+', 452, 852);
    ctx.fillText('−', 452, 910);
    ctx.textAlign = 'left';
}

// ----------------------------------------------------------------------------
// APP 2: CAMERA APP (SELFIE & REAR VIEWFINDER)
// ----------------------------------------------------------------------------
function updateCameraAppRender() {
    if (!cameraSelfie || !renderTargetCamera || !mainRenderer || !mainScene) return;

    const charQuat = characterGroup.quaternion;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(charQuat);

    if (cameraModeType === 'selfie') {
        // Place camera in front of character's face, looking back at them
        cameraSelfie.position.copy(characterGroup.position)
            .addScaledVector(forward, 1.25)
            .add(new THREE.Vector3(0, 1.62, 0));
        cameraSelfie.lookAt(characterGroup.position.x, 1.58, characterGroup.position.z);
    } else {
        // Rear world camera (eye level looking forward)
        cameraSelfie.position.copy(characterGroup.position).add(new THREE.Vector3(0, 1.68, 0));
        cameraSelfie.quaternion.copy(mainCamera.quaternion);
    }

    cameraSelfie.zoom = cameraZoom;
    cameraSelfie.updateProjectionMatrix();

    // Render secondary camera to WebGLRenderTarget
    mainRenderer.setRenderTarget(renderTargetCamera);
    mainRenderer.render(mainScene, cameraSelfie);
    mainRenderer.setRenderTarget(null);
}

function drawCameraApp(ctx) {
    drawAppHeader(ctx, `CAMERA • ${cameraModeType.toUpperCase()}`);

    const viewY = 98;
    const viewH = 750;

    // Read RenderTarget pixels and draw to 2D canvas
    if (mainRenderer && renderTargetCamera) {
        const buf = new Uint8Array(512 * viewH * 4);
        mainRenderer.readRenderTargetPixels(renderTargetCamera, 0, 0, 512, viewH, buf);
        const imgData = ctx.createImageData(512, viewH);

        for (let i = 0; i < buf.length; i += 4) {
            let r = buf[i];
            let g = buf[i + 1];
            let b = buf[i + 2];
            const a = buf[i + 3];

            if (activeCameraFilter === 'cyber') {
                r = Math.min(255, r * 0.4);
                g = Math.min(255, g * 1.2 + 20);
                b = Math.min(255, b * 1.4 + 40);
            } else if (activeCameraFilter === 'noir') {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = gray; g = gray; b = gray;
            } else if (activeCameraFilter === 'gold') {
                r = Math.min(255, r * 1.3 + 30);
                g = Math.min(255, g * 1.1 + 10);
                b = Math.min(255, b * 0.7);
            } else if (activeCameraFilter === 'matrix') {
                r = 0;
                g = Math.min(255, g * 1.4 + 40);
                b = Math.min(255, b * 0.4);
            }

            // Flip vertically because WebGL pixels are bottom-up
            const pixelIndex = i / 4;
            const x = pixelIndex % 512;
            const y = Math.floor(pixelIndex / 512);
            const targetIndex = ((viewH - 1 - y) * 512 + x) * 4;

            imgData.data[targetIndex] = r;
            imgData.data[targetIndex + 1] = g;
            imgData.data[targetIndex + 2] = b;
            imgData.data[targetIndex + 3] = a;
        }
        ctx.putImageData(imgData, 0, viewY);
    } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, viewY, 512, viewH);
    }

    // Viewfinder 3x3 Rule-of-Thirds Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(170, viewY); ctx.lineTo(170, viewY + viewH);
    ctx.moveTo(342, viewY); ctx.lineTo(342, viewY + viewH);
    ctx.moveTo(0, viewY + 250); ctx.lineTo(512, viewY + 250);
    ctx.moveTo(0, viewY + 500); ctx.lineTo(512, viewY + 500);
    ctx.stroke();

    // Center Focus Reticle
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(236, viewY + viewH * 0.5 - 20, 40, 40);

    // Shutter Flash Animation
    if (cameraFlashTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${cameraFlashTimer})`;
        ctx.fillRect(0, viewY, 512, viewH);
        cameraFlashTimer = Math.max(0, cameraFlashTimer - 0.2);
    }

    // Camera Controls Bar (Bottom)
    ctx.fillStyle = 'rgba(11, 17, 33, 0.94)';
    ctx.fillRect(0, 848, 512, 120);

    // Shutter Button (White Circle)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 908, 36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(256, 908, 28, 0, Math.PI * 2);
    ctx.fill();

    // Flip Camera Button
    ctx.font = 'bold 15px "Oswald", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('↻ FLIP', 84, 914);

    // Filter Cycle Button
    ctx.fillText(`🎨 ${activeCameraFilter.toUpperCase()}`, 380, 914);
}

function takeCameraPhoto() {
    playPhoneSound('shutter');
    cameraFlashTimer = 1.0;

    // Snapshot Canvas
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = 512;
    snapCanvas.height = 750;
    const sCtx = snapCanvas.getContext('2d');
    sCtx.drawImage(phoneCanvas, 0, 98, 512, 750, 0, 0, 512, 750);

    const dataUrl = snapCanvas.toDataURL('image/png');
    const photo = {
        id: Date.now(),
        dataUrl,
        timestamp: new Date().toLocaleTimeString(),
        filter: activeCameraFilter
    };
    galleryPhotos.unshift(photo);

    try {
        localStorage.setItem('mumbai_gallery_count', galleryPhotos.length);
    } catch (e) {}

    console.log(`[Camera] Captured photo #${photo.id} (${activeCameraFilter})`);
}

// ----------------------------------------------------------------------------
// APP 3: GALLERY APP
// ----------------------------------------------------------------------------
function drawGalleryApp(ctx) {
    drawAppHeader(ctx, 'PHOTO GALLERY');

    if (fullScreenPhoto) {
        // Full Photo Viewer
        ctx.drawImage(fullScreenPhoto.img, 0, 98, 512, 750);

        // Photo Footer Details
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(0, 848, 512, 120);

        ctx.font = 'bold 16px "Oswald", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`CAPTURED: ${fullScreenPhoto.timestamp}`, 32, 888);

        // Download Action Button
        ctx.fillStyle = '#10b981';
        roundRect(ctx, 32, 904, 130, 42, 8, true, false);
        ctx.font = 'bold 14px "Oswald", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('⬇ DOWNLOAD', 48, 930);

        // Delete Button
        ctx.fillStyle = '#ef4444';
        roundRect(ctx, 180, 904, 110, 42, 8, true, false);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('✕ DELETE', 204, 930);

        // Back to Grid
        ctx.fillStyle = '#64748b';
        roundRect(ctx, 310, 904, 110, 42, 8, true, false);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('‹ GRID', 342, 930);
        return;
    }

    if (galleryPhotos.length === 0) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px "Oswald", sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('NO PHOTOS SAVED YET', 256, 420);
        ctx.font = '14px "JetBrains Mono", sans-serif';
        ctx.fillText('Open Camera app to capture selfies & views', 256, 455);
        ctx.textAlign = 'left';
        return;
    }

    // 2-Column Grid
    const thumbW = 220;
    const thumbH = 160;
    const padX = 24;
    const padY = 120;

    galleryPhotos.slice(0, 8).forEach((photo, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = padX + col * (thumbW + 24);
        const y = padY + row * (thumbH + 24);

        if (!photo.img) {
            photo.img = new Image();
            photo.img.src = photo.dataUrl;
        }

        ctx.fillStyle = '#0f172a';
        roundRect(ctx, x, y, thumbW, thumbH, 10, true, false);

        if (photo.img.complete) {
            ctx.drawImage(photo.img, x, y, thumbW, thumbH);
        }

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, x, y, thumbW, thumbH, 10, false, true);

        // Timestamp tag
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(x, y + thumbH - 24, thumbW, 24);
        ctx.font = 'bold 11px "Oswald", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(photo.timestamp, x + 8, y + thumbH - 8);
    });
}

// ----------------------------------------------------------------------------
// APP 4: CONTACTS APP (FAST TRAVEL DIRECTORY)
// ----------------------------------------------------------------------------
const CONTACTS_LIST = [
    { name: 'HOME HQ TOWER', role: 'Cyber Skyscraper Plaza', x: poiHome.x, z: poiHome.z, y: 0, tag: 'HQ' },
    { name: 'DMCE COLLEGE', role: 'Airoli Academic Campus', x: poiCollege.x, z: poiCollege.z, y: 12, tag: 'DMCE' },
    { name: 'FR. AGNEL SCHOOL', role: 'Bandra West Technical', x: poiSchool.x, z: poiSchool.z, y: 32, tag: 'FATS' },
    { name: 'GATEWAY OF INDIA', role: 'Colaba Historic Arch', x: poiGateway.x, z: poiGateway.z, y: 2.5, tag: 'GATE' },
    { name: 'CSMIA AIRPORT', role: 'Santacruz T2 Runway', x: poiAirport.x, z: poiAirport.z, y: 4, tag: 'BOM' },
    { name: 'CENTRAL TERMINUS', role: 'CSMT Railway Heritage', x: -280, z: -1800, y: 3, tag: 'CSMT' }
];

function drawContactsApp(ctx) {
    drawAppHeader(ctx, 'FAST TRAVEL DIRECTORY');

    const cardY = 114;
    const cardH = 88;
    const gap = 16;

    CONTACTS_LIST.forEach((c, idx) => {
        const y = cardY + idx * (cardH + gap);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        roundRect(ctx, 24, y, 464, cardH, 12, true, false);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1;
        roundRect(ctx, 24, y, 464, cardH, 12, false, true);

        // Avatar Letter
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(68, y + cardH * 0.5, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.font = 'bold 15px "Oswald", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(c.tag, 68, y + cardH * 0.5 + 5);
        ctx.textAlign = 'left';

        // Title and Subtitle
        ctx.font = 'bold 18px "Oswald", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(c.name, 108, y + 36);

        ctx.font = '12px "JetBrains Mono", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(c.role, 108, y + 58);

        // Call / Travel Action Button
        ctx.fillStyle = '#10b981';
        roundRect(ctx, 360, y + 24, 112, 40, 8, true, false);
        ctx.textAlign = 'center';
        ctx.font = 'bold 13px "Oswald", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('TRAVEL', 416, y + 49);
        ctx.textAlign = 'left';
    });
}

// ----------------------------------------------------------------------------
// APP 5: PORTFOLIO APP (DEVARSHI DAVANE)
// ----------------------------------------------------------------------------
function drawPortfolioApp(ctx) {
    drawAppHeader(ctx, 'DEVARSHI DAVANE • PORTFOLIO');

    // 4 Portfolio Tabs
    const tabs = ['BIO', 'PROJECTS', 'STACK', 'LINKS'];
    const tabW = 464 / 4;
    tabs.forEach((t, i) => {
        const tx = 24 + i * tabW;
        const isActive = (activePortfolioTab === i);
        ctx.fillStyle = isActive ? '#0284c7' : 'rgba(15, 23, 42, 0.7)';
        roundRect(ctx, tx, 106, tabW - 4, 38, 6, true, false);

        ctx.textAlign = 'center';
        ctx.font = 'bold 13px "Oswald", sans-serif';
        ctx.fillStyle = isActive ? '#ffffff' : '#94a3b8';
        ctx.fillText(t, tx + tabW * 0.5 - 2, 130);
        ctx.textAlign = 'left';
    });

    const contentY = 160;

    if (activePortfolioTab === 0) {
        // BIO TAB
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        roundRect(ctx, 24, contentY, 464, 460, 12, true, false);

        ctx.font = 'bold 24px "Oswald", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('DEVARSHI DAVANE', 48, contentY + 48);

        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#10b981';
        ctx.fillText('Full-Stack 3D, Systems & Cybersecurity Engineer', 48, contentY + 76);

        ctx.font = '14px "JetBrains Mono", sans-serif';
        ctx.fillStyle = '#e2e8f0';
        const bioLines = [
            '• Education: B.E. Computer Engineering (DMCE Airoli)',
            '• Foundation: Technical Vocational (Fr. Agnel Bandra)',
            '• Focus: High-performance 3D WebGL digital twins,',
            '  distributed network security, autonomous navigation,',
            '  and memory-safe systems engineering.',
            '',
            '• Achievements:',
            '  - Zero-dependency Three.js r160 Mumbai open world',
            '  - 60 FPS capped loop with <150 draw calls',
            '  - P1 32-bit integer spatial hash grid engine'
        ];
        bioLines.forEach((line, idx) => {
            ctx.fillText(line, 48, contentY + 120 + idx * 24);
        });
    } else if (activePortfolioTab === 1) {
        // PROJECTS TAB
        const projs = [
            {
                title: 'MUMBAI 3D OPEN WORLD',
                desc: '5km x 5km Three.js digital twin with spatial hash collision & InstancedMesh crowd simulation.'
            },
            {
                title: 'DISTRIBUTED THREAT MATRIX',
                desc: 'Packet inspection and autonomous anomaly detection engine for high-throughput networks.'
            },
            {
                title: 'TRAVERSAL GRAPH ENGINE',
                desc: 'Topological directed graph G=(V,E) for multi-lane vehicles and traffic signal automata.'
            }
        ];

        projs.forEach((p, idx) => {
            const y = contentY + idx * 130;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            roundRect(ctx, 24, y, 464, 116, 10, true, false);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
            roundRect(ctx, 24, y, 464, 116, 10, false, true);

            ctx.font = 'bold 17px "Oswald", sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(p.title, 42, y + 36);

            ctx.font = '13px "JetBrains Mono", sans-serif';
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(p.desc, 42, y + 64, 420);
        });
    } else if (activePortfolioTab === 2) {
        // STACK TAB
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        roundRect(ctx, 24, contentY, 464, 460, 12, true, false);

        ctx.font = 'bold 20px "Oswald", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('PRODUCTION TECH STACK', 48, contentY + 44);

        const stacks = [
            { cat: '3D Graphics & Shaders', items: 'Three.js r160, WebGL 2.0, GLSL Shaders, PBR, Blender' },
            { cat: 'Systems & Languages', items: 'TypeScript, JavaScript (ESM), Python, C++, Docker' },
            { cat: 'Architecture & Engine', items: 'Spatial Partitioning, InstancedMesh, BufferGeometry' },
            { cat: 'Cybersecurity & OS', items: 'Linux Kernel, Network Packet Forensics, Cryptography' }
        ];

        stacks.forEach((s, idx) => {
            const y = contentY + 85 + idx * 85;
            ctx.font = 'bold 15px "Oswald", sans-serif';
            ctx.fillStyle = '#10b981';
            ctx.fillText(s.cat, 48, y);
            ctx.font = '13px "JetBrains Mono", monospace';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(s.items, 48, y + 24);
        });
    } else if (activePortfolioTab === 3) {
        // LINKS TAB
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        roundRect(ctx, 24, contentY, 464, 340, 12, true, false);

        const links = [
            { label: 'GITHUB PROFILE', url: 'https://github.com/Devarshi08', color: '#0284c7' },
            { label: 'LINKEDIN PROFILE', url: 'https://linkedin.com/in/devarshi-davane', color: '#0ea5e9' },
            { label: 'DOWNLOAD CURRICULUM VITAE', url: '#resume', color: '#10b981' }
        ];

        links.forEach((l, idx) => {
            const y = contentY + 40 + idx * 80;
            ctx.fillStyle = l.color;
            roundRect(ctx, 48, y, 416, 52, 8, true, false);
            ctx.textAlign = 'center';
            ctx.font = 'bold 16px "Oswald", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(l.label, 256, y + 33);
            ctx.textAlign = 'left';
        });
    }
}

// ----------------------------------------------------------------------------
// APP 6, 7, 8: MESSAGES, SETTINGS, WEATHER
// ----------------------------------------------------------------------------
function drawMessagesApp(ctx) {
    drawAppHeader(ctx, 'SYSTEM TRANSMISSIONS');
    const msgs = [
        { sender: 'HOME HQ DISPATCH', text: '500m world chunk manager online. Memory budget within limits.' },
        { sender: 'DMCE LAB', text: 'Distributed systems research active at Airoli campus.' },
        { sender: 'MUMBAI POLICE', text: 'Marine Drive and Haji Ali Causeway open to high-speed traversal.' }
    ];

    msgs.forEach((m, idx) => {
        const y = 114 + idx * 110;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        roundRect(ctx, 24, y, 464, 96, 10, true, false);
        ctx.font = 'bold 15px "Oswald", sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(m.sender, 42, y + 32);
        ctx.font = '13px "JetBrains Mono", sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(m.text, 42, y + 60, 420);
    });
}

function drawSettingsApp(ctx) {
    drawAppHeader(ctx, 'PHONE & SYSTEM CONFIG');
    ctx.font = 'bold 16px "Oswald", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('AUDIO SETTINGS: WEB AUDIO SFX ACTIVE', 48, 140);
    ctx.fillText('GRAPHICS TIER: ULTRA (60 FPS INSTANCED)', 48, 190);
    ctx.fillText('CAMERA CONTROLS: CHASE / CINEMATIC', 48, 240);
}

function drawWeatherApp(ctx) {
    drawAppHeader(ctx, 'ATMOSPHERIC CONTROLS');
    ctx.font = 'bold 18px "Oswald", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('TIME OF DAY: SUNSET / GOLDEN HOUR', 48, 150);
    ctx.fillText('WEATHER CYCLE: CLEAR SKY', 48, 210);
}

// ============================================================================
// 5. INTERACTION & RAYCASTING POINTER ENGINE
// ============================================================================

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

function initPhoneInputListeners() {
    window.addEventListener('pointerdown', onScreenPointerDown);
    window.addEventListener('keydown', onPhoneKeyDown);
}

function onScreenPointerDown(event) {
    if (!isPhoneOpen || !phoneScreenMesh || !mainCamera) return;

    pointerNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, mainCamera);
    const intersects = raycaster.intersectObject(phoneScreenMesh, false);

    if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.uv) {
            const cx = hit.uv.x * 512;
            const cy = (1 - hit.uv.y) * 1024;
            handleScreenClick(cx, cy);
            event.stopPropagation();
        }
    }
}

export function handleScreenClick(x, y) {
    playPhoneSound('tap');

    // Check Bottom Softkeys (y >= 968)
    if (y >= 968) {
        if (x < 180) {
            // Back
            if (activeApp !== 'home') {
                if (activeApp === 'camera') disposeCameraRenderTarget();
                activeApp = 'home';
                isUiDirty = true;
            } else {
                closeDiegeticPhone();
            }
        } else if (x >= 180 && x <= 340) {
            // Home
            if (activeApp === 'camera') disposeCameraRenderTarget();
            activeApp = 'home';
            isUiDirty = true;
        }
        return;
    }

    // Check Header Back button (y <= 98)
    if (y <= 98 && y >= 44 && activeApp !== 'home') {
        if (activeApp === 'camera') disposeCameraRenderTarget();
        activeApp = 'home';
        fullScreenPhoto = null;
        isUiDirty = true;
        return;
    }

    // HOME SCREEN TILE CLICKS
    if (activeApp === 'home') {
        const startX = 46;
        const startY = 300;
        const tileW = 104;
        const tileH = 104;
        const gapX = 40;
        const gapY = 48;

        APPS_LIST.forEach((app, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const tx = startX + col * (tileW + gapX);
            const ty = startY + row * (tileH + gapY);

            if (x >= tx && x <= tx + tileW && y >= ty && y <= ty + tileH) {
                selectedGridIndex = idx;
                activeApp = app.id;
                if (activeApp === 'camera') ensureCameraRenderTarget();
                isUiDirty = true;
                playPhoneSound('open');
            }
        });
        return;
    }

    // CAMERA APP CLICKS
    if (activeApp === 'camera') {
        // Shutter Button (around x: 256, y: 908)
        if (Math.hypot(x - 256, y - 908) < 42) {
            takeCameraPhoto();
            isUiDirty = true;
            return;
        }
        // Flip Camera (x: 84, y: 914)
        if (x >= 60 && x <= 160 && y >= 880 && y <= 940) {
            cameraModeType = (cameraModeType === 'selfie' ? 'rear' : 'selfie');
            isUiDirty = true;
            return;
        }
        // Filter Cycle (x: 380, y: 914)
        if (x >= 340 && x <= 480 && y >= 880 && y <= 940) {
            const filters = ['normal', 'cyber', 'noir', 'gold', 'matrix'];
            const curIdx = filters.indexOf(activeCameraFilter);
            activeCameraFilter = filters[(curIdx + 1) % filters.length];
            isUiDirty = true;
            return;
        }
        return;
    }

    // GALLERY APP CLICKS
    if (activeApp === 'gallery') {
        if (fullScreenPhoto) {
            // Download (32, 904, 130, 42)
            if (x >= 32 && x <= 162 && y >= 904 && y <= 946) {
                const link = document.createElement('a');
                link.download = `mumbai_photo_${fullScreenPhoto.id}.png`;
                link.href = fullScreenPhoto.dataUrl;
                link.click();
                return;
            }
            // Delete (180, 904, 110, 42)
            if (x >= 180 && x <= 290 && y >= 904 && y <= 946) {
                galleryPhotos = galleryPhotos.filter(p => p.id !== fullScreenPhoto.id);
                fullScreenPhoto = null;
                isUiDirty = true;
                return;
            }
            // Back to Grid (310, 904, 110, 42)
            if (x >= 310 && x <= 420 && y >= 904 && y <= 946) {
                fullScreenPhoto = null;
                isUiDirty = true;
                return;
            }
            return;
        }

        // Tap thumbnail in grid
        const thumbW = 220;
        const thumbH = 160;
        const padX = 24;
        const padY = 120;
        galleryPhotos.slice(0, 8).forEach((p, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const tx = padX + col * (thumbW + 24);
            const ty = padY + row * (thumbH + 24);
            if (x >= tx && x <= tx + thumbW && y >= ty && y <= ty + thumbH) {
                fullScreenPhoto = p;
                isUiDirty = true;
            }
        });
        return;
    }

    // CONTACTS APP CLICKS (TRAVEL BUTTON)
    if (activeApp === 'contacts') {
        const cardY = 114;
        const cardH = 88;
        const gap = 16;
        CONTACTS_LIST.forEach((c, idx) => {
            const ty = cardY + idx * (cardH + gap);
            // Travel button (360, ty + 24, 112, 40)
            if (x >= 350 && x <= 475 && y >= ty + 15 && y <= ty + 70) {
                console.log(`[DIEGETIC PHONE] Contact Travel Clicked: ${c.name} (${c.x}, ${c.z})`);
                playPhoneSound('ring');
                closeDiegeticPhone();
                if (onFastTravelCallback) {
                    onFastTravelCallback(c.x, c.z, c.name, c.y);
                } else if (typeof window !== 'undefined' && window.__startFastTravel) {
                    window.__startFastTravel(c.x, c.z, c.name, c.y);
                } else if (typeof window !== 'undefined' && window.__characterGroup) {
                    window.__characterGroup.position.set(c.x, (c.y || 0) + 0.5, c.z);
                }
            }
        });
        return;
    }

    // PORTFOLIO TABS
    if (activeApp === 'portfolio') {
        if (y >= 106 && y <= 146) {
            const tabW = 464 / 4;
            const tabIdx = Math.floor((x - 24) / tabW);
            if (tabIdx >= 0 && tabIdx <= 3) {
                activePortfolioTab = tabIdx;
                isUiDirty = true;
            }
        }
    }
}

function onPhoneKeyDown(e) {
    if (!isPhoneOpen) {
        if (e.key === 'ArrowUp' || e.key === 'p' || e.key === 'P') {
            openDiegeticPhone();
        }
        return;
    }

    if (e.key === 'Escape' || e.key === 'Backspace') {
        if (activeApp !== 'home') {
            if (activeApp === 'camera') disposeCameraRenderTarget();
            activeApp = 'home';
            fullScreenPhoto = null;
            isUiDirty = true;
            playPhoneSound('back');
        } else {
            closeDiegeticPhone();
        }
        return;
    }

    if (activeApp === 'home') {
        if (e.key === 'ArrowRight') {
            selectedGridIndex = (selectedGridIndex + 1) % APPS_LIST.length;
            isUiDirty = true;
            playPhoneSound('tap');
        } else if (e.key === 'ArrowLeft') {
            selectedGridIndex = (selectedGridIndex - 1 + APPS_LIST.length) % APPS_LIST.length;
            isUiDirty = true;
            playPhoneSound('tap');
        } else if (e.key === 'ArrowDown') {
            if (selectedGridIndex + 3 < APPS_LIST.length) {
                selectedGridIndex += 3;
                isUiDirty = true;
                playPhoneSound('tap');
            }
        } else if (e.key === 'ArrowUp') {
            if (selectedGridIndex - 3 >= 0) {
                selectedGridIndex -= 3;
                isUiDirty = true;
                playPhoneSound('tap');
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            activeApp = APPS_LIST[selectedGridIndex].id;
            if (activeApp === 'camera') ensureCameraRenderTarget();
            isUiDirty = true;
            playPhoneSound('open');
        }
    }
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

// Window Hooks for Test Automation
window.__diegeticPhone = {
    open: openDiegeticPhone,
    close: closeDiegeticPhone,
    toggle: toggleDiegeticPhone,
    isOpen: () => isPhoneOpen,
    getActiveApp: () => activeApp,
    setActiveApp: (app) => {
        activeApp = app;
        if (app === 'camera') ensureCameraRenderTarget();
        else disposeCameraRenderTarget();
        isUiDirty = true;
    },
    takePhoto: takeCameraPhoto,
    getGallery: () => galleryPhotos,
    clickScreen: handleScreenClick,
    getPhoneGroup: () => phoneGroup,
    getRenderTarget: () => renderTargetCamera
};
