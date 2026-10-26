import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// ==========================================
// RENDERER, SCENE & CAMERA SETUP
// ==========================================
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1427);
scene.fog = new THREE.FogExp2(0x0c1427, 0.0022);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1200);
// Initial position behind the character landing spot, looking forward into the open world city
camera.position.set(0, 7.5, -18);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
window.__renderer = renderer;
window.THREE = THREE;
window.__scene = scene;

// Camera view mode: 'chase', 'cinematic', 'orbit'
let cameraMode = 'chase';
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.05;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.minDistance = 3;
orbitControls.maxDistance = 120;
orbitControls.enabled = false;

// ==========================================
// WEB AUDIO SYNTHESIZER
// ==========================================
let audioEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type = 'chime') {
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
        }
    } catch (e) {}
}

document.getElementById('btn-toggle-audio').addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    const btn = document.getElementById('btn-toggle-audio');
    btn.textContent = audioEnabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
    btn.classList.toggle('active', audioEnabled);
});

// Continuous Flight Audio Synthesizer (Iron Man Dual Repulsor Drone)
let flightAudioLoop = null;
let flightAudioGain = null;

function startFlightAudio() {
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

function updateFlightAudio(speed, isBoosting) {
    if (!flightAudioLoop || !flightAudioGain) return;
    try {
        const now = audioCtx.currentTime;
        const targetFreq = isBoosting ? (420 + Math.random() * 25) : (140 + Math.abs(speed) * 4.2);
        const targetVol = audioEnabled ? (isBoosting ? 0.12 : 0.05) : 0;
        flightAudioLoop.frequency.setTargetAtTime(targetFreq, now, 0.06);
        flightAudioGain.gain.setTargetAtTime(targetVol, now, 0.06);
    } catch (e) {}
}

function stopFlightAudio() {
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

// ==========================================
// PROCEDURAL CANVAS TEXTURES FACTORY
// ==========================================
function createCobblestoneTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 256, 256);

    const stoneSize = 32;
    for (let y = 0; y < 256; y += stoneSize) {
        const offset = (y / stoneSize) % 2 === 0 ? 0 : stoneSize / 2;
        for (let x = -stoneSize; x < 256 + stoneSize; x += stoneSize) {
            const shade = 100 + Math.floor(Math.random() * 40);
            ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 10})`;
            ctx.beginPath();
            ctx.roundRect(x + offset + 2, y + 2, stoneSize - 4, stoneSize - 4, 4);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createAsphaltTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle grain
    for (let i = 0; i < 4000; i++) {
        const gx = Math.random() * 512;
        const gy = Math.random() * 512;
        const alpha = Math.random() * 0.12;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(gx, gy, 2, 2);
    }

    // Yellow center double dashed lines
    ctx.fillStyle = '#f59e0b';
    for (let y = 16; y < 512; y += 64) {
        ctx.fillRect(250, y, 5, 40);
        ctx.fillRect(258, y, 5, 40);
    }

    // White outer shoulder lines
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(20, 0, 8, 512);
    ctx.fillRect(484, 0, 8, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createGrassTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 3500; i++) {
        const gx = Math.random() * 256;
        const gy = Math.random() * 256;
        const g = 110 + Math.floor(Math.random() * 60);
        ctx.fillStyle = `rgb(22, ${g}, 45)`;
        ctx.fillRect(gx, gy, 2, 4);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createBrickTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e2e8f0'; // Mortar
    ctx.fillRect(0, 0, 256, 256);

    const bh = 16;
    const bw = 32;
    for (let y = 0; y < 256; y += bh) {
        const off = (y / bh) % 2 === 0 ? 0 : bw / 2;
        for (let x = -bw; x < 256 + bw; x += bw) {
            const r = 160 + Math.floor(Math.random() * 35);
            ctx.fillStyle = `rgb(${r}, 45, 38)`;
            ctx.fillRect(x + off + 1.5, y + 1.5, bw - 3, bh - 3);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createModernFacadeTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 256, 256);

    // Glowing architectural grid windows
    for (let y = 12; y < 256; y += 40) {
        for (let x = 12; x < 256; x += 40) {
            ctx.fillStyle = Math.random() > 0.3 ? '#38bdf8' : '#1e293b';
            ctx.fillRect(x, y, 26, 24);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, 26, 24);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createRailwayTrackTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const ctx = c.getContext('2d');
    // Ballast gravel
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 128, 256);

    // Wooden sleepers
    ctx.fillStyle = '#3b2518';
    for (let y = 10; y < 256; y += 32) {
        ctx.fillRect(10, y, 108, 14);
    }

    // Steel rails
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(28, 0, 8, 256);
    ctx.fillRect(92, 0, 8, 256);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(30, 0, 3, 256);
    ctx.fillRect(94, 0, 3, 256);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

const cobblestoneTex = createCobblestoneTexture();
cobblestoneTex.repeat.set(12, 6);

const asphaltTex = createAsphaltTexture();
asphaltTex.repeat.set(1, 14);

const asphaltCrossTex = createAsphaltTexture();
asphaltCrossTex.repeat.set(12, 1);

const grassTex = createGrassTexture();
grassTex.repeat.set(24, 24);

const brickTex = createBrickTexture();
brickTex.repeat.set(6, 4);

const modernFacadeTex = createModernFacadeTexture();
modernFacadeTex.repeat.set(4, 2);

const railTrackTex = createRailwayTrackTexture();
railTrackTex.repeat.set(1, 18);

function createSidewalkTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 256, 256);

    const tileSize = 32;
    for (let y = 0; y < 256; y += tileSize) {
        for (let x = 0; x < 256; x += tileSize) {
            const shade = 180 + Math.floor(Math.random() * 28);
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 4})`;
            ctx.fillRect(x + 1.5, y + 1.5, tileSize - 3, tileSize - 3);
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1.5, y + 1.5, tileSize - 3, tileSize - 3);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createChawlFacadeTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 8) {
        const alpha = 0.04 + Math.random() * 0.12;
        ctx.fillStyle = `rgba(69, 26, 3, ${alpha})`;
        ctx.fillRect(0, y, 256, 4);
    }
    for (let i = 0; i < 2000; i++) {
        const gx = Math.random() * 256;
        const gy = Math.random() * 256;
        const shade = 140 + Math.floor(Math.random() * 50);
        ctx.fillStyle = `rgba(${shade}, ${Math.floor(shade * 0.55)}, 20, 0.22)`;
        ctx.fillRect(gx, gy, 3, 3);
    }
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 85); ctx.lineTo(256, 85);
    ctx.moveTo(0, 170); ctx.lineTo(256, 170);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createApartmentFacadeTexture(baseColor = '#fef3c7') {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 2500; i++) {
        const gx = Math.random() * 256;
        const gy = Math.random() * 256;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(gx, gy, 2, 2);
    }
    for (let y = 14; y < 256; y += 64) {
        for (let x = 14; x < 256; x += 64) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x, y, 34, 38);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(x + 3, y + 3, 28, 32);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(x - 2, y + 38, 38, 4);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createCorporateGlassTexture(glassHue = '#0284c7') {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 4; y < 256; y += 32) {
        for (let x = 4; x < 256; x += 32) {
            const grad = ctx.createLinearGradient(x, y, x + 28, y + 28);
            grad.addColorStop(0, glassHue);
            grad.addColorStop(0.5, '#38bdf8');
            grad.addColorStop(1, '#0369a1');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, 28, 28);
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, 28, 28);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createBilingualSignboardTexture(mrText, enText, bgColor = '#0f172a', textColor = '#f8fafc') {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mrText, 256, 48);

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(enText, 256, 92);

    const tex = new THREE.CanvasTexture(c);
    return tex;
}

const sidewalkTex = createSidewalkTexture();
sidewalkTex.repeat.set(4, 30);

const chawlTex = createChawlFacadeTexture();
chawlTex.repeat.set(3, 2);

const aptPeachTex = createApartmentFacadeTexture('#fde2e4');
aptPeachTex.repeat.set(2, 2);
const aptMintTex = createApartmentFacadeTexture('#d1fae5');
aptMintTex.repeat.set(2, 2);
const aptCreamTex = createApartmentFacadeTexture('#fef3c7');
aptCreamTex.repeat.set(2, 2);
const aptSkyTex = createApartmentFacadeTexture('#e0f2fe');
aptSkyTex.repeat.set(2, 2);

const corporateGlassTex = createCorporateGlassTexture('#0284c7');
corporateGlassTex.repeat.set(2, 4);

// Shared Architectural Materials for Draw-Call Optimization
const chawlPlasterMat = new THREE.MeshStandardMaterial({ map: chawlTex, roughness: 0.85 });
const concreteTrimMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
const metalRailingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 });
const metalGrillMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.5 });
const woodDoorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
const corrugatedRoofMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.9, metalness: 0.3 });
const pipeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
const aptMatPeach = new THREE.MeshStandardMaterial({ map: aptPeachTex, roughness: 0.8 });
const aptMatMint = new THREE.MeshStandardMaterial({ map: aptMintTex, roughness: 0.8 });
const aptMatCream = new THREE.MeshStandardMaterial({ map: aptCreamTex, roughness: 0.8 });
const aptMatSky = new THREE.MeshStandardMaterial({ map: aptSkyTex, roughness: 0.8 });
const acUnitMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4, metalness: 0.3 });
const sintexTankMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6, metalness: 0.2 });
const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
const darkGraniteMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.5 });
const sidewalkMat = new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.85 });
// ENVIRONMENT: SKY, SUN, MOON, STARS & LIGHTS
// ==========================================
let timeOfDay = 'sunset'; // 'sunset', 'night', 'sunrise', 'day'
const streetLamps = [];

const sunLight = new THREE.DirectionalLight(0xff7733, 2.4);
sunLight.position.set(40, 50, -40);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 300;
sunLight.shadow.camera.left = -110;
sunLight.shadow.camera.right = 110;
sunLight.shadow.camera.top = 110;
sunLight.shadow.camera.bottom = -110;
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffa07a, 0.9);
scene.add(ambientLight);

// Skybox Dome with dynamic procedural canvas gradient
const skyGeom = new THREE.SphereGeometry(1100, 32, 16);
const canvasSky = document.createElement('canvas');
canvasSky.width = 16; canvasSky.height = 256;
const skyCtx = canvasSky.getContext('2d');
const skyTex = new THREE.CanvasTexture(canvasSky);
const skyDome = new THREE.Mesh(skyGeom, new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide }));
scene.add(skyDome);

// Stars Particle Field
const starCount = 900;
const starGeom = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 1800;
    starPositions[i + 1] = 20 + Math.random() * 450;
    starPositions[i + 2] = (Math.random() - 0.5) * 1800;
}
starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, transparent: true, opacity: 0.1 });
const starsMesh = new THREE.Points(starGeom, starMat);
scene.add(starsMesh);

// Glowing Sun / Moon Mesh
const sunGeom = new THREE.CircleGeometry(16, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffeedd, side: THREE.DoubleSide });
const celestialMesh = new THREE.Mesh(sunGeom, sunMat);
celestialMesh.position.set(60, 40, -140);
scene.add(celestialMesh);

function updateTimeOfDay(mode) {
    timeOfDay = mode;
    const timeLabel = document.getElementById('time-label');
    const timeIcon = document.getElementById('time-icon');
    const grad = skyCtx.createLinearGradient(0, 0, 0, 256);

    if (mode === 'sunset') {
        timeIcon.textContent = '🌇';
        timeLabel.textContent = '18:30 Sunset';
        grad.addColorStop(0, '#160f29');
        grad.addColorStop(0.35, '#6b21a8');
        grad.addColorStop(0.65, '#ea580c');
        grad.addColorStop(0.85, '#f59e0b');
        grad.addColorStop(1.0, '#fef08a');
        sunLight.color.setHex(0xff7733);
        sunLight.intensity = 2.4;
        sunLight.position.set(40, 45, -50);
        ambientLight.color.setHex(0xffa07a);
        ambientLight.intensity = 0.9;
        scene.fog.color.setHex(0x1e152d);
        starMat.opacity = 0.1;
        celestialMesh.material.color.setHex(0xffeedd);
        streetLamps.forEach(l => l.light.intensity = 2.2);
    } else if (mode === 'night') {
        timeIcon.textContent = '🌙';
        timeLabel.textContent = '22:00 Cyber Night';
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.4, '#0b132b');
        grad.addColorStop(1.0, '#1c2541');
        sunLight.color.setHex(0x38bdf8);
        sunLight.intensity = 0.6;
        sunLight.position.set(-30, 65, -30);
        ambientLight.color.setHex(0x1e293b);
        ambientLight.intensity = 0.5;
        scene.fog.color.setHex(0x060913);
        starMat.opacity = 0.95;
        celestialMesh.material.color.setHex(0x93c5fd);
        streetLamps.forEach(l => l.light.intensity = 4.2);
    } else if (mode === 'sunrise') {
        timeIcon.textContent = '🌅';
        timeLabel.textContent = '06:15 Sunrise';
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.4, '#db2777');
        grad.addColorStop(0.7, '#fb923c');
        grad.addColorStop(1.0, '#fed7aa');
        sunLight.color.setHex(0xfb923c);
        sunLight.intensity = 2.0;
        sunLight.position.set(-60, 30, -50);
        ambientLight.color.setHex(0xf472b6);
        ambientLight.intensity = 0.8;
        scene.fog.color.setHex(0x2e1065);
        starMat.opacity = 0.12;
        celestialMesh.material.color.setHex(0xffedd5);
        streetLamps.forEach(l => l.light.intensity = 1.0);
    } else if (mode === 'day') {
        timeIcon.textContent = '☀️';
        timeLabel.textContent = '12:00 Clear Noon';
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(0.5, '#38bdf8');
        grad.addColorStop(1.0, '#bae6fd');
        sunLight.color.setHex(0xffffff);
        sunLight.intensity = 2.8;
        sunLight.position.set(0, 85, -20);
        ambientLight.color.setHex(0xffffff);
        ambientLight.intensity = 1.0;
        scene.fog.color.setHex(0xbae6fd);
        starMat.opacity = 0.0;
        celestialMesh.material.color.setHex(0xfffae6);
        streetLamps.forEach(l => l.light.intensity = 0.2);
    }

    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 16, 256);
    skyTex.needsUpdate = true;
}

function cycleTimeOfDay() {
    const modes = ['sunset', 'night', 'sunrise', 'day'];
    const next = modes[(modes.indexOf(timeOfDay) + 1) % modes.length];
    updateTimeOfDay(next);
}
document.getElementById('btn-toggle-time').addEventListener('click', cycleTimeOfDay);

// Weather: Dynamic Rain & Thunderstorm
let weatherMode = 'clear'; // 'clear', 'rain', 'storm'
const rainCount = 4500;
const rainGeom = new THREE.BufferGeometry();
const rainPositions = new Float32Array(rainCount * 3);
for (let i = 0; i < rainCount * 3; i += 3) {
    rainPositions[i] = (Math.random() - 0.5) * 850;
    rainPositions[i + 1] = Math.random() * 85;
    rainPositions[i + 2] = (Math.random() - 0.5) * 850 + 160;
}
rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rainMat = new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.38, transparent: true, opacity: 0 });
const rainParticles = new THREE.Points(rainGeom, rainMat);
scene.add(rainParticles);

function setWeatherMode(mode) {
    weatherMode = mode;
    const btn = document.getElementById('btn-toggle-weather');

    if (weatherMode === 'clear') {
        if (btn) {
            btn.textContent = '☀️ Clear';
            btn.classList.remove('active');
        }
        rainMat.opacity = 0;
    } else if (weatherMode === 'rain') {
        if (btn) {
            btn.textContent = '🌧️ Rain: ON';
            btn.classList.add('active');
        }
        rainMat.opacity = 0.65;
    } else if (weatherMode === 'storm') {
        if (btn) {
            btn.textContent = '⚡ Thunderstorm';
            btn.classList.add('active');
        }
        rainMat.opacity = 0.9;
        playSound('thunder');
    }
}
window.__setWeatherMode = setWeatherMode;

function cycleWeather() {
    const modes = ['clear', 'rain', 'storm'];
    const next = modes[(modes.indexOf(weatherMode) + 1) % modes.length];
    setWeatherMode(next);
}
document.getElementById('btn-toggle-weather').addEventListener('click', cycleWeather);

// ==========================================
// SINGLE SOURCE OF TRUTH: WORLD ARCHITECTURE (Phase B: 800m x 800m Footprint)
// ==========================================
const WORLD_CONFIG = {
    bounds: {
        minX: -400,
        maxX: 400,
        minZ: -450,
        maxZ: 540
    },
    playableLimits: {
        minX: -395,
        maxX: 395,
        minZ: -380,
        maxZ: 530
    },
    width: 800,
    depth: 800,
    districts: {
        waterfront: { minX: -400, maxX: 400, minZ: -450, maxZ: 10, name: "Gateway Waterfront & Arabian Sea" },
        historicResidential: { minX: -380, maxX: -110, minZ: 10, maxZ: 240, name: "Girgaon & Lalbaug Residential" },
        modernDowntown: { minX: -100, maxX: 100, minZ: 10, maxZ: 240, name: "Modern Downtown & Stark Tower Site" },
        commercialMarkets: { minX: 110, maxX: 380, minZ: 10, maxZ: 240, name: "Crawford Commercial & Markets" },
        techAcademia: { minX: -360, maxX: 360, minZ: 240, maxZ: 530, name: "Tech Academia & DMCE Campus" }
    },
    starkTowerSite: {
        x: 0,
        z: 140,
        radius: 36
    }
};
window.__WORLD_CONFIG = WORLD_CONFIG;

// ==========================================
// WORLD COLLISION PROXY ENGINE (Phase 2, Phase B & Phase C)
// ==========================================
let currentFloorElevation = 0;
window.__currentFloorElevation = currentFloorElevation;

function getSurfaceElevationAt(x, z) {
    let topY = 0;
    // Stark Tower Helipad (X: 0, Z: 140, radius: 22, height: 120)
    if (Math.hypot(x - 0, z - 140) < 22) {
        return 120;
    }
    // Check all building and platform colliders
    for (let i = 0; i < worldColliders.length; i++) {
        const c = worldColliders[i];
        if (c.type === 'box') {
            const rY = (c.roofY !== undefined) ? c.roofY : ((c.maxY !== undefined && c.maxY >= 2.0) ? c.maxY : 0);
            if (rY >= 0.5 && !c.label?.includes('Balustrade') && !c.label?.includes('Boundary') && !c.label?.includes('Pier')) {
                if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
                    if (rY > topY) topY = rY;
                }
            }
        }
    }
    return topY;
}
window.__getSurfaceElevationAt = getSurfaceElevationAt;

const worldColliders = [];

function registerBoxCollider(minX, maxX, minZ, maxZ, label = 'obstacle', minY = -5, maxY = 4.5, roofY = undefined) {
    if (roofY === undefined && maxY > 4.5) {
        roofY = maxY;
    }
    worldColliders.push({ type: 'box', minX, maxX, minZ, maxZ, minY, maxY, roofY, label });
}

function registerCylinderCollider(x, z, radius, label = 'pole', minY = -5, maxY = 7.5) {
    worldColliders.push({ type: 'cylinder', x, z, radius, minY, maxY, label });
}

function resolveCollision(pos, radius = 0.5) {
    // 1. World Boundaries Clamp (Updated for 800m vast footprint)
    pos.x = THREE.MathUtils.clamp(pos.x, WORLD_CONFIG.playableLimits.minX, WORLD_CONFIG.playableLimits.maxX);
    pos.z = THREE.MathUtils.clamp(pos.z, WORLD_CONFIG.playableLimits.minZ, WORLD_CONFIG.playableLimits.maxZ);

    // 2. Spatial Obstacle Colliders with Vertical 3D Support
    for (let i = 0; i < worldColliders.length; i++) {
        const col = worldColliders[i];
        if (col.minY !== undefined && col.maxY !== undefined) {
            const topElevation = (col.roofY !== undefined) ? col.roofY : col.maxY;
            if (pos.y < col.minY || pos.y >= topElevation - 0.25) continue;
        }

        if (col.type === 'box') {
            if (pos.x >= col.minX - radius && pos.x <= col.maxX + radius &&
                pos.z >= col.minZ - radius && pos.z <= col.maxZ + radius) {
                const left = pos.x - (col.minX - radius);
                const right = (col.maxX + radius) - pos.x;
                const bottom = pos.z - (col.minZ - radius);
                const top = (col.maxZ + radius) - pos.z;
                const minOverlap = Math.min(left, right, bottom, top);

                if (minOverlap === left) pos.x = col.minX - radius;
                else if (minOverlap === right) pos.x = col.maxX + radius;
                else if (minOverlap === bottom) pos.z = col.minZ - radius;
                else pos.z = col.maxZ + radius;
            }
        } else if (col.type === 'cylinder') {
            const dx = pos.x - col.x;
            const dz = pos.z - col.z;
            const dist = Math.hypot(dx, dz);
            const minDist = col.radius + radius;
            if (dist < minDist && dist > 0.0001) {
                const overlap = minDist - dist;
                pos.x += (dx / dist) * overlap;
                pos.z += (dz / dist) * overlap;
            }
        }
    }
}

// Batched Vegetation & Streetlamp Geometries
const batchedLampPoles = [];
const batchedLampBulbs = [];
const batchedPalmTrunks = [];
const batchedPalmLeaves = [];
const batchedCityTrunks = [];
const batchedCityFoliage = [];

// Streetlamp Helper
function addStreetLamp(x, z) {
    const pole = new THREE.CylinderGeometry(0.18, 0.26, 6.2, 8);
    pole.translate(x, 3.1, z);
    batchedLampPoles.push(pole);

    const bulb = new THREE.BoxGeometry(0.8, 1.2, 0.8);
    bulb.translate(x, 6.4, z);
    batchedLampBulbs.push(bulb);

    const pl = new THREE.PointLight(0xffa834, 2.2, 22, 1.5);
    pl.position.set(x, 6.4, z);
    pl.castShadow = false;
    scene.add(pl);

    streetLamps.push({ light: pl });
    registerCylinderCollider(x, z, 0.45, 'streetlamp');
}

// Low-poly City Trees
function addTree(x, z, type = 'palm') {
    if (type === 'palm') {
        const trunk = new THREE.CylinderGeometry(0.3, 0.45, 6, 8);
        trunk.translate(x, 3, z);
        batchedPalmTrunks.push(trunk);

        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
            const leaf = new THREE.ConeGeometry(1.2, 3.8, 4);
            leaf.rotateZ(Math.PI / 3);
            leaf.rotateY(a);
            leaf.translate(x, 6.2, z);
            batchedPalmLeaves.push(leaf);
        }
    } else {
        const trunk = new THREE.CylinderGeometry(0.4, 0.55, 4.5, 8);
        trunk.translate(x, 2.25, z);
        batchedCityTrunks.push(trunk);

        const leaves = new THREE.DodecahedronGeometry(2.8);
        leaves.translate(x, 5.5, z);
        batchedCityFoliage.push(leaves);
    }
    registerCylinderCollider(x, z, 0.65, 'tree');
}

// ==========================================
// OPEN WORLD TERRAIN & DISTRICT GEOMETRY
// ==========================================

// 1. Arabian Sea (Z = -10 to -630, X = -600 to +600)
const waterGeom = new THREE.PlaneGeometry(1200, 620, 48, 24);
const waterMat = new THREE.MeshStandardMaterial({ color: 0x123c69, roughness: 0.12, metalness: 0.75, flatShading: true });
const seaMesh = new THREE.Mesh(waterGeom, waterMat);
seaMesh.rotation.x = -Math.PI / 2;
seaMesh.position.set(0, -0.6, -320);
seaMesh.receiveShadow = false;
scene.add(seaMesh);

// 2. Main Ground Turf (Lush Green Grass spanning north of Marine Drive waterfront: Z = -20 to 560)
const mainGround = new THREE.Mesh(
    new THREE.PlaneGeometry(860, 580),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
);
mainGround.rotation.x = -Math.PI / 2;
mainGround.position.set(0, -0.4, 270);
mainGround.receiveShadow = true;
scene.add(mainGround);

// 3. Gateway Waterfront Promenade (Marine Drive Seawalk: Z = -22 to +10, X = -380 to +380)
const walkMat = new THREE.MeshStandardMaterial({ map: cobblestoneTex, roughness: 0.75 });
const promenade = new THREE.Mesh(new THREE.BoxGeometry(760, 0.8, 32), walkMat);
promenade.position.set(0, -0.4, -6);
promenade.receiveShadow = true;
scene.add(promenade);

// Sea Steps & Balustrade Railing at Z = -22 (Spanning Marine Drive with portals for Gateway & Haji Ali Causeway)
const railMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
const barGeoms = [];
const postGeoms = [];

// Section 1: Far West (-380 to -186)
const barWest = new THREE.BoxGeometry(194, 0.4, 0.6);
barWest.translate(-283, 1.2, -22);
barGeoms.push(barWest);

// Section 2: West-Mid (-174 to -22)
const barMid = new THREE.BoxGeometry(152, 0.4, 0.6);
barMid.translate(-98, 1.2, -22);
barGeoms.push(barMid);

// Section 3: East (+22 to +380)
const barEast = new THREE.BoxGeometry(358, 0.4, 0.6);
barEast.translate(201, 1.2, -22);
barGeoms.push(barEast);

const topBar = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(barGeoms), railMat);
topBar.castShadow = false;
scene.add(topBar);

for (let rx = -380; rx <= 380; rx += 3.5) {
    if (rx >= -22 && rx <= 22) continue; // Clear opening for Gateway & Jetty
    if (rx >= -186 && rx <= -174) continue; // Clear opening for Haji Ali Causeway
    const post = new THREE.CylinderGeometry(0.16, 0.2, 1.2, 8);
    post.translate(rx, 0.6, -22);
    postGeoms.push(post);
}
if (postGeoms.length > 0) {
    const mergedPosts = BufferGeometryUtils.mergeGeometries(postGeoms);
    const postsMesh = new THREE.Mesh(mergedPosts, railMat);
    postsMesh.castShadow = false;
    scene.add(postsMesh);
}

// Colliders allowing unobstructed walking out to Gateway jetty and Haji Ali causeway
registerBoxCollider(-390, -186, -23.0, -21.0, 'SeaBalustradeWest');
registerBoxCollider(-174, -22, -23.0, -21.0, 'SeaBalustradeMid');
registerBoxCollider(22, 390, -23.0, -21.0, 'SeaBalustradeEast');

// Promenade Street Lamps
[-40, -20, 0, 20, 40].forEach(lx => {
    addStreetLamp(lx, -21.5);
    if (lx !== 0) addTree(lx, 8, 'palm');
});

// Cute Golden Cat on Railing
const cat = new THREE.Group();
const catMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
const catBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), catMat);
catBody.scale.set(1, 0.8, 1.4);
catBody.position.y = 1.48;
cat.add(catBody);
const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), catMat);
catHead.position.set(0, 1.76, 0.32);
cat.add(catHead);
cat.position.set(14, 0, -22);
scene.add(cat);

// Gateway of India Basalt Monument (Detailed Indo-Saracenic Architecture at Z = -32)
function buildGatewayArch() {
    registerBoxCollider(-17, -5.5, -38, -26, 'GatewayArchLeftPier', -5, 28);
    registerBoxCollider(5.5, 17, -38, -26, 'GatewayArchRightPier', -5, 28);
    registerBoxCollider(-5.5, 5.5, -38, -26, 'GatewayArchRoof', 14, 28);

    const monument = new THREE.Group();
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.85, metalness: 0.08 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0xb58452, roughness: 0.9 });

    const basaltGeoms = [];
    const darkStoneGeoms = [];

    // Two Main Gateway Piers (left & right) leaving a clear central archway opening
    const pierLeft = new THREE.BoxGeometry(10.5, 20, 12);
    pierLeft.translate(-10.75, 10, -32);
    basaltGeoms.push(pierLeft);

    const pierRight = new THREE.BoxGeometry(10.5, 20, 12);
    pierRight.translate(10.75, 10, -32);
    basaltGeoms.push(pierRight);

    // Archway Top Span (Y: 14 to 20 over the central opening)
    const archTopSpan = new THREE.BoxGeometry(11, 6, 12);
    archTopSpan.translate(0, 17, -32);
    basaltGeoms.push(archTopSpan);

    // Side Archways Cut-Ins / Details
    [-10.75, 10.75].forEach(ax => {
        const sideArchTrim = new THREE.BoxGeometry(4.2, 8.5, 12.2);
        sideArchTrim.translate(ax, 4.25, -32);
        darkStoneGeoms.push(sideArchTrim);
    });

    // Attic & Parapet Cornice
    const cornice = new THREE.BoxGeometry(34, 2.5, 13);
    cornice.translate(0, 21.2, -32);
    darkStoneGeoms.push(cornice);

    const upperAttic = new THREE.BoxGeometry(24, 4, 9);
    upperAttic.translate(0, 24, -32);
    basaltGeoms.push(upperAttic);

    // 4 Corner Turrets with Mini Domes
    [[-15, -5], [15, -5], [-15, 5], [15, 5]].forEach(([tx, tz]) => {
        const turret = new THREE.CylinderGeometry(1.5, 1.7, 14, 16);
        turret.translate(tx, 25, -32 + tz);
        darkStoneGeoms.push(turret);

        const dome = new THREE.SphereGeometry(1.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        dome.translate(tx, 32, -32 + tz);
        basaltGeoms.push(dome);

        const spire = new THREE.ConeGeometry(0.4, 3, 8);
        spire.translate(tx, 34.5, -32 + tz);
        darkStoneGeoms.push(spire);
    });

    if (basaltGeoms.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(basaltGeoms), basaltMat);
        m.castShadow = true; m.receiveShadow = true;
        monument.add(m);
    }
    if (darkStoneGeoms.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(darkStoneGeoms), darkStoneMat);
        m.castShadow = false;
        monument.add(m);
    }

    // Indian National Flag
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 }));
    mast.position.set(0, 30, -32);
    monument.add(mast);

    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 64; flagCanvas.height = 36;
    const fCtx = flagCanvas.getContext('2d');
    fCtx.fillStyle = '#ff9933'; fCtx.fillRect(0, 0, 64, 12);
    fCtx.fillStyle = '#ffffff'; fCtx.fillRect(0, 12, 64, 12);
    fCtx.fillStyle = '#138808'; fCtx.fillRect(0, 24, 64, 12);
    fCtx.fillStyle = '#000080'; fCtx.beginPath(); fCtx.arc(32, 18, 4, 0, Math.PI * 2); fCtx.fill();
    const flagMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(flagCanvas), side: THREE.DoubleSide }));
    flagMesh.position.set(1.8, 33, -32);
    monument.add(flagMesh);

    scene.add(monument);
}
buildGatewayArch();

// ==========================================
// MARITIME & TOURIST FERRY BOATS (Gateway Harbor)
// Styled per Gateway Maritime Architecture Sheet
// ==========================================
const maritimeFerryBoats = [];

function buildGatewayMaritime() {
    // 1. Basalt Stone Jetty Pier & Steps descending into Arabian Sea (Z = -22 down to Z = -44)
    const jettyMat = new THREE.MeshStandardMaterial({ color: 0xb58452, roughness: 0.85 });
    const jettyGeoms = [];
    // Main Jetty Pier Platform (14m W x 22m L, flush with promenade at Y = -0.1)
    const pier = new THREE.BoxGeometry(14, 0.6, 22);
    pier.translate(0, -0.3, -33);
    jettyGeoms.push(pier);

    // 6 Wide Jetty Steps stepping down into the water (from Y = 0 to Y = -0.6 at Z = -41 to -45)
    for (let st = 0; st < 6; st++) {
        const step = new THREE.BoxGeometry(14, 0.15, 0.6);
        step.translate(0, -st * 0.1 - 0.05, -41.5 - st * 0.6);
        jettyGeoms.push(step);
    }

    // Mooring Bollards along jetty
    [-6.5, 6.5].forEach(bx => {
        [-26, -32, -38, -43].forEach(bz => {
            const bollard = new THREE.CylinderGeometry(0.18, 0.22, 0.7, 8);
            bollard.translate(bx, 0.35, bz);
            jettyGeoms.push(bollard);
        });
    });

    const mergedJetty = BufferGeometryUtils.mergeGeometries(jettyGeoms);
    const jettyMesh = new THREE.Mesh(mergedJetty, jettyMat);
    jettyMesh.receiveShadow = true;
    scene.add(jettyMesh);

    // 2. Iconic Mumbai Wooden Tourist Ferry Boats
    const boatHullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const boatBlueMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.5 });
    const boatTeakMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7 });
    const boatCanopyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
    const buoyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });

    function createTouristFerryBoat(x, z, rotY, phase) {
        const boat = new THREE.Group();

        // Hull (White base + Blue waterline band)
        const hullGeoms = [];
        // Merge entire ferry boat into a single batched mesh with vertex colors
        const boatParts = [];
        const baseHull = applyVertexColor(new THREE.BoxGeometry(3.6, 1.4, 7.5), 0xf8fafc);
        baseHull.translate(0, 0.7, 0);
        boatParts.push(baseHull);

        const bow = applyVertexColor(new THREE.CylinderGeometry(0.1, 1.8, 2.2, 4), 0xf8fafc);
        bow.rotateY(Math.PI / 4);
        bow.scale(1.0, 0.65, 1.4);
        bow.translate(0, 0.7, 4.6);
        boatParts.push(bow);

        // Waterline Blue Stripe
        const stripe = applyVertexColor(new THREE.BoxGeometry(3.7, 0.28, 9.0), 0x0284c7);
        stripe.translate(0, 0.5, 0);
        boatParts.push(stripe);

        // Teak Main Passenger Deck
        const deck = applyVertexColor(new THREE.BoxGeometry(3.8, 0.15, 8.6), 0x78350f);
        deck.translate(0, 1.45, 0);
        boatParts.push(deck);

        // Lower Cabin with Windows
        const cabin = applyVertexColor(new THREE.BoxGeometry(2.8, 1.2, 5.8), 0xf8fafc);
        cabin.translate(0, 2.1, -0.4);
        boatParts.push(cabin);

        // Upper Observation Deck Canopy Roof
        const canopy = applyVertexColor(new THREE.BoxGeometry(3.2, 0.1, 6.2), 0x059669);
        canopy.translate(0, 3.2, -0.4);
        boatParts.push(canopy);

        // Canopy Support Pillars
        [-1.4, 1.4].forEach(px => {
            [-2.8, -0.4, 2.0].forEach(pz => {
                const p = applyVertexColor(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), 0x64748b);
                p.translate(px, 2.4, pz);
                boatParts.push(p);
            });
        });

        // Orange Lifebuoy Rings
        [-1.45, 1.45].forEach(bx => {
            [-1.2, 0.8].forEach(bz => {
                const ring = applyVertexColor(new THREE.TorusGeometry(0.22, 0.06, 6, 12), 0xf97316);
                ring.rotateY(Math.PI / 2);
                ring.translate(bx, 2.1, bz);
                boatParts.push(ring);
            });
        });

        // Stern Indian Flag
        const flag = applyVertexColor(new THREE.BoxGeometry(1.0, 0.6, 0.04), 0xff9933);
        flag.translate(0, 3.6, -3.4);
        boatParts.push(flag);

        const singleBoatMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(boatParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
        singleBoatMesh.castShadow = false;
        boat.add(singleBoatMesh);

        boat.position.set(x, -0.4, z);
        boat.rotation.y = rotY;
        scene.add(boat);

        maritimeFerryBoats.push({ group: boat, baseX: x, baseZ: z, phase });
    }

    createTouristFerryBoat(-16, -46, 0.25, 0.0);
    createTouristFerryBoat(16, -50, -0.35, 1.8);
}
buildGatewayMaritime();

// ==========================================
// HAJI ALI DARGAH COASTAL SHRINE & CAUSEWAY
// (Stitch Architectural Reference Sheet 5)
// Arabian Sea Islet: X = -180, Z = -160, Minaret Y = 26m
// ==========================================
function buildHajiAliDargah() {
    const hajiAliGroup = new THREE.Group();
    const hajiAliGeoms = [];

    // 1. 140m Elevated Stone Causeway Walkway into Arabian Sea (Z = -22 to -142)
    // Causeway deck platform (6.4m wide, flush at Y = 0.5)
    const deck = applyVertexColor(new THREE.BoxGeometry(6.4, 0.8, 120), 0xb58452);
    deck.translate(-180, 0.4, -82);
    hajiAliGeoms.push(deck);

    // Left & Right Causeway Parapet Balustrades
    [-183.1, -176.9].forEach(px => {
        const wall = applyVertexColor(new THREE.BoxGeometry(0.35, 0.9, 120), 0xb58452);
        wall.translate(px, 0.95, -82);
        hajiAliGeoms.push(wall);
    });

    // Causeway Mooring Bollards & Lantern Posts
    for (let lz = -26; lz >= -138; lz -= 14) {
        [-183.1, -176.9].forEach(lx => {
            const post = applyVertexColor(new THREE.CylinderGeometry(0.12, 0.15, 1.6, 6), 0x94a3b8);
            post.translate(lx, 1.4, lz);
            hajiAliGeoms.push(post);
        });
    }

    // Islet Bedrock Foundation (X: -180, Z: -160)
    const isletRock = applyVertexColor(new THREE.CylinderGeometry(24, 26, 2.2, 16), 0x78350f);
    isletRock.translate(-180, 0.1, -160);
    hajiAliGeoms.push(isletRock);

    // 2. Whitewashed Marble Dargah Sanctuary, Courtyard, Dome & Minaret
    // Courtyard Terrace Slabs
    const courtyard = applyVertexColor(new THREE.BoxGeometry(42, 0.4, 36), 0xf8fafc);
    courtyard.translate(-180, 1.0, -160);
    hajiAliGeoms.push(courtyard);

    // Courtyard Perimeter Jali Screen Parapets
    const jaliN = applyVertexColor(new THREE.BoxGeometry(42, 1.2, 0.4), 0xf8fafc);
    jaliN.translate(-180, 1.8, -178);
    hajiAliGeoms.push(jaliN);
    const jaliS = applyVertexColor(new THREE.BoxGeometry(42, 1.2, 0.4), 0xf8fafc);
    jaliS.translate(-180, 1.8, -142);
    hajiAliGeoms.push(jaliS);
    const jaliW = applyVertexColor(new THREE.BoxGeometry(0.4, 1.2, 36), 0xf8fafc);
    jaliW.translate(-201, 1.8, -160);
    hajiAliGeoms.push(jaliW);

    // Main Sanctuary Prayer Hall (22m W x 7.5m H x 18m D)
    const hall = applyVertexColor(new THREE.BoxGeometry(22, 7.5, 18), 0xf8fafc);
    hall.translate(-180, 4.95, -162);
    hajiAliGeoms.push(hall);

    // Arched Entrance Portico / Vestibule (South Facing)
    const portico = applyVertexColor(new THREE.BoxGeometry(9, 6.2, 4.5), 0xf8fafc);
    portico.translate(-180, 4.3, -151);
    hajiAliGeoms.push(portico);

    // Central Indo-Islamic Marble Dome
    const drum = applyVertexColor(new THREE.CylinderGeometry(5.2, 5.2, 1.8, 16), 0xf8fafc);
    drum.translate(-180, 9.4, -162);
    hajiAliGeoms.push(drum);

    const dome = applyVertexColor(new THREE.SphereGeometry(5.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7), 0xf8fafc);
    dome.translate(-180, 10.8, -162);
    hajiAliGeoms.push(dome);

    const domeFinial = applyVertexColor(new THREE.ConeGeometry(0.35, 3.2, 8), 0xf59e0b);
    domeFinial.translate(-180, 16.2, -162);
    hajiAliGeoms.push(domeFinial);

    // 4 Corner Chattris with miniature domes
    [-8.8, 8.8].forEach(cx => {
        [-7.2, 7.2].forEach(cz => {
            const chPillar = applyVertexColor(new THREE.BoxGeometry(1.2, 3.0, 1.2), 0xf8fafc);
            chPillar.translate(-180 + cx, 10.0, -162 + cz);
            hajiAliGeoms.push(chPillar);
            const chDome = applyVertexColor(new THREE.SphereGeometry(1.1, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), 0xf8fafc);
            chDome.translate(-180 + cx, 12.0, -162 + cz);
            hajiAliGeoms.push(chDome);
        });
    });

    // 3. 26-meter White Marble Minaret (NE Courtyard: X = -168, Z = -148)
    const minaretBase = applyVertexColor(new THREE.BoxGeometry(4.4, 4.0, 4.4), 0xf8fafc);
    minaretBase.translate(-168, 3.0, -148);
    hajiAliGeoms.push(minaretBase);

    const minaretShaft = applyVertexColor(new THREE.CylinderGeometry(1.6, 2.0, 18, 10), 0xf8fafc);
    minaretShaft.translate(-168, 13.0, -148);
    hajiAliGeoms.push(minaretShaft);

    // Minaret Balconies
    [10.5, 17.5].forEach(by => {
        const bRing = applyVertexColor(new THREE.CylinderGeometry(2.4, 1.8, 0.8, 10), 0xf8fafc);
        bRing.translate(-168, by, -148);
        hajiAliGeoms.push(bRing);
    });

    // Minaret Lantern & Dome Spire
    const minLantern = applyVertexColor(new THREE.CylinderGeometry(1.4, 1.4, 3.0, 8), 0xf8fafc);
    minLantern.translate(-168, 22.0, -148);
    hajiAliGeoms.push(minLantern);

    const minDome = applyVertexColor(new THREE.SphereGeometry(1.5, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), 0xf8fafc);
    minDome.translate(-168, 24.2, -148);
    hajiAliGeoms.push(minDome);

    const minSpire = applyVertexColor(new THREE.ConeGeometry(0.25, 2.6, 8), 0xf59e0b);
    minSpire.translate(-168, 26.2, -148);
    hajiAliGeoms.push(minSpire);

    // Flagpole with Islamic Green Pennant at Entrance
    const mast = applyVertexColor(new THREE.CylinderGeometry(0.08, 0.08, 8, 6), 0xffffff);
    mast.translate(-180, 5.0, -148);
    hajiAliGeoms.push(mast);

    const flag = applyVertexColor(new THREE.BoxGeometry(1.8, 1.0, 0.04), 0x15803d);
    flag.translate(-179, 8.4, -148);
    hajiAliGeoms.push(flag);

    // Assemble unified single-draw-call mesh
    const hajiAliMesh = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(hajiAliGeoms, false),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.08 })
    );
    hajiAliMesh.receiveShadow = true;
    hajiAliGroup.add(hajiAliMesh);

    scene.add(hajiAliGroup);

    // Register Box Colliders for Walking & Rooftop Superhero Landing
    registerBoxCollider(-183.5, -176.5, -142, -22, 'HajiAliCauseway', -2, 1.4, 0.6);
    registerBoxCollider(-201, -159, -179, -141, 'HajiAliIslet', -2, 2.0, 0.9);
    registerBoxCollider(-192, -168, -172, -152, 'HajiAliSanctuary', -2, 17.0, 8.7);
    registerBoxCollider(-170.5, -165.5, -150.5, -145.5, 'HajiAliMinaret', -2, 28.0, 26.0);
}
buildHajiAliDargah();

// Vada Pav Food Cart
let poiVadaPav = { x: -14, z: -4, radius: 4.5 };
function buildVadaPavCart() {
    registerBoxCollider(poiVadaPav.x - 2.5, poiVadaPav.x + 2.5, poiVadaPav.z - 1.6, poiVadaPav.z + 1.6, 'VadaPavCart');
    const cart = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.8, 2.5), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    body.position.y = 1.6; body.castShadow = true;
    cart.add(body);

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const wheelGeoms = [];
    [-1.7, 1.7].forEach(wx => {
        [-1.2, 1.2].forEach(wz => {
            const wheel = new THREE.CylinderGeometry(0.7, 0.7, 0.2, 16);
            wheel.rotateZ(Math.PI / 2);
            wheel.translate(wx, 0.7, wz);
            wheelGeoms.push(wheel);
        });
    });
    cart.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(wheelGeoms), wheelMat));

    // Showcase with Vada Pavs
    const showcase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
    showcase.position.set(-0.8, 3.1, 0);
    cart.add(showcase);

    const pavMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.8 });
    const bunGeoms = [];
    for (let px = -1.6; px <= 0; px += 0.5) {
        for (let pz = -0.5; pz <= 0.5; pz += 0.5) {
            const bun = new THREE.SphereGeometry(0.18, 8, 8);
            bun.scale(1.2, 0.7, 1.2);
            bun.translate(px, 2.7, pz);
            bunGeoms.push(bun);
        }
    }
    cart.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(bunGeoms), pavMat));

    // Striped Canopy
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.5, 4), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    canopy.rotation.y = Math.PI / 4;
    canopy.position.set(0, 5.0, 0);
    cart.add(canopy);

    // Sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256; signCanvas.height = 64;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#f59e0b'; sCtx.fillRect(0, 0, 256, 64);
    sCtx.fillStyle = '#b91c1c'; sCtx.font = 'bold 26px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText("DEV'S VADA PAV", 128, 42);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) }));
    sign.position.set(0, 2.1, 1.3);
    cart.add(sign);

    // Vendor Chibi
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    v.position.set(0, 2.4, -0.6);
    cart.add(v);
    const vHead = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 12), new THREE.MeshStandardMaterial({ color: 0xd9a066 }));
    vHead.position.set(0, 3.6, -0.6);
    cart.add(vHead);

    cart.position.set(poiVadaPav.x, 0, poiVadaPav.z);
    scene.add(cart);
}
buildVadaPavCart();

// ==========================================
// PHASE 5: CROWD & WORLD LIFE (Diverse Pedestrians & Authentic Street Props)
// ==========================================
function applyVertexColor(geom, hexColor) {
    const count = geom.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color(hexColor);
    for (let i = 0; i < count; i++) {
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
}

// 5 Fitzpatrick Indian Skin Tones
const skinColors = [
    0xf5cba7, // Fair warm brown
    0xe0ac69, // Medium golden brown
    0xc68642, // Rich warm brown
    0x8d5524, // Deep bronze brown
    0x5c3317  // Rich dark brown
];

const shirtColors = [
    0xf8fafc, // Formal White
    0x38bdf8, // Sky Blue
    0xf97316, // Saffron / Orange Kurta
    0x10b981, // Emerald Green Kurta / Saree
    0x1e3a8a, // Navy Blue
    0xb91c1c, // Crimson Red
    0xeab308, // Mustard Yellow
    0x8b5cf6  // Violet / Purple
];

const pantsColors = [
    0x2563eb, // Denim Blue
    0x334155, // Charcoal Grey
    0x0f172a, // Formal Black / Dark Navy
    0xf1f5f9, // White Pajama / Churidars
    0xd97706  // Khaki
];

const hairColors = [
    0x09090b, // Black
    0x271911  // Dark Brown
];

const umbrellaColors = [0x0f172a, 0x0284c7, 0xdc2626, 0xeab308, 0x166534];

const sharedNpcMat = new THREE.MeshStandardMaterial({ roughness: 0.8, vertexColors: true });
const sharedUmbrellaMat = new THREE.MeshStandardMaterial({ roughness: 0.5, vertexColors: true, side: THREE.DoubleSide });

function createArticulatedPedestrian(config) {
    const group = new THREE.Group();

    const skinColor = skinColors[config.skinIdx % skinColors.length];
    const shirtColor = shirtColors[config.shirtIdx % shirtColors.length];
    const pantsColor = pantsColors[config.pantsIdx % pantsColors.length];
    const hairColor = hairColors[config.hairIdx % hairColors.length];
    const umbrellaColor = umbrellaColors[config.umbrellaIdx % umbrellaColors.length];

    // 1. Merged Body (Torso + Head + Hair + Backpack/Cap)
    const bodyGeoms = [];
    const torso = applyVertexColor(new THREE.BoxGeometry(0.44, 0.62, 0.26), shirtColor);
    torso.translate(0, 1.25, 0);
    bodyGeoms.push(torso);

    if (config.type === 'student') {
        const backpack = applyVertexColor(new THREE.BoxGeometry(0.32, 0.42, 0.16), 0x1e293b);
        backpack.translate(0, 1.25, -0.2);
        bodyGeoms.push(backpack);
    } else if (config.type === 'student_headphones') {
        // Cyan Headband across top of head
        const band = applyVertexColor(new THREE.TorusGeometry(0.23, 0.025, 6, 12, Math.PI), 0x06b6d4);
        band.translate(0, 1.76, 0);
        bodyGeoms.push(band);
        // Dual Earcups
        [-0.22, 0.22].forEach(hx => {
            const cup = applyVertexColor(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 8), 0x06b6d4);
            cup.rotateZ(Math.PI / 2);
            cup.translate(hx, 1.74, 0);
            bodyGeoms.push(cup);
        });
        // College Sling Bag
        const bag = applyVertexColor(new THREE.BoxGeometry(0.28, 0.36, 0.12), 0x0f172a);
        bag.translate(0.1, 1.15, -0.16);
        bodyGeoms.push(bag);
    } else if (config.type === 'chaiwala') {
        // Saffron Gamcha (towel) draped over shoulder
        const gamcha = applyVertexColor(new THREE.BoxGeometry(0.14, 0.48, 0.28), 0xea580c);
        gamcha.translate(-0.18, 1.35, 0);
        bodyGeoms.push(gamcha);
    } else if (config.type === 'poncho') {
        // Translucent Yellow Monsoon Poncho Cloak
        const poncho = applyVertexColor(new THREE.ConeGeometry(0.52, 0.75, 8, 1, true), 0xfacc15);
        poncho.translate(0, 1.25, 0);
        bodyGeoms.push(poncho);
        // Poncho Hood
        const hood = applyVertexColor(new THREE.SphereGeometry(0.24, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.65), 0xfacc15);
        hood.translate(0, 1.76, -0.04);
        bodyGeoms.push(hood);
    } else if (config.type === 'commuter') {
        // Formal Necktie
        const tie = applyVertexColor(new THREE.BoxGeometry(0.06, 0.35, 0.02), 0xb91c1c);
        tie.translate(0, 1.35, 0.14);
        bodyGeoms.push(tie);
    } else if (config.type === 'police') {
        // Khaki Police Peaked Cap
        const cap = applyVertexColor(new THREE.CylinderGeometry(0.24, 0.22, 0.12, 10), 0x78350f);
        cap.translate(0, 1.95, 0.04);
        bodyGeoms.push(cap);
        const visor = applyVertexColor(new THREE.BoxGeometry(0.22, 0.02, 0.12), 0x0f172a);
        visor.translate(0, 1.90, 0.16);
        bodyGeoms.push(visor);
    } else if (config.type === 'tourist') {
        // Camera slung around chest
        const camBody = applyVertexColor(new THREE.BoxGeometry(0.18, 0.12, 0.10), 0x0f172a);
        camBody.translate(0, 1.30, 0.18);
        bodyGeoms.push(camBody);
    } else if (config.type === 'scholar') {
        // Leatherbound book under arm
        const book = applyVertexColor(new THREE.BoxGeometry(0.12, 0.28, 0.22), 0x1e3a8a);
        book.translate(-0.16, 1.25, 0.12);
        bodyGeoms.push(book);
    }

    const head = applyVertexColor(new THREE.SphereGeometry(0.20, 10, 10), skinColor);
    head.translate(0, 1.74, 0);
    bodyGeoms.push(head);

    const hair = applyVertexColor(new THREE.SphereGeometry(0.21, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairColor);
    hair.rotateX(-0.2);
    hair.translate(0, 1.76, 0);
    bodyGeoms.push(hair);

    if (config.type === 'dabbawala') {
        const cap = applyVertexColor(new THREE.BoxGeometry(0.18, 0.1, 0.28), 0xf8fafc);
        cap.translate(0, 1.94, 0);
        bodyGeoms.push(cap);
    }

    const mergedBody = BufferGeometryUtils.mergeGeometries(bodyGeoms, false);
    const bodyMesh = new THREE.Mesh(mergedBody, sharedNpcMat);
    bodyMesh.castShadow = false;
    group.add(bodyMesh);

    // 2. Articulated Left Arm (Sleeve + Forearm + Item)
    const armL = new THREE.Group();
    armL.position.set(-0.28, 1.50, 0);
    const sleeveL = applyVertexColor(new THREE.CylinderGeometry(0.065, 0.06, 0.35, 8), shirtColor);
    sleeveL.translate(0, -0.175, 0);
    const forearmL = applyVertexColor(new THREE.CylinderGeometry(0.055, 0.05, 0.28, 8), skinColor);
    forearmL.translate(0, -0.45, 0);
    const armLGeoms = [sleeveL, forearmL];

    if (config.type === 'chaiwala') {
        // Stainless-Steel Cutting Chai Kettle in hand
        const kBody = applyVertexColor(new THREE.CylinderGeometry(0.08, 0.1, 0.18, 8), 0xe2e8f0);
        kBody.translate(0, -0.68, 0.06);
        armLGeoms.push(kBody);
        const kSpout = applyVertexColor(new THREE.ConeGeometry(0.03, 0.08, 6), 0xe2e8f0);
        kSpout.rotateX(-Math.PI / 3);
        kSpout.translate(0, -0.62, 0.15);
        armLGeoms.push(kSpout);
    } else if (config.type === 'commuter') {
        // Executive Laptop Briefcase
        const bCase = applyVertexColor(new THREE.BoxGeometry(0.08, 0.28, 0.36), 0x451a03);
        bCase.translate(0, -0.65, 0.05);
        armLGeoms.push(bCase);
    } else if (config.type === 'traveler') {
        // Rolling Trolley Suitcase beside left hand
        const tCase = applyVertexColor(new THREE.BoxGeometry(0.24, 0.44, 0.34), 0x1e293b);
        tCase.translate(-0.12, -0.62, 0.05);
        armLGeoms.push(tCase);
    }
    const mergedArmL = BufferGeometryUtils.mergeGeometries(armLGeoms, false);
    const armLMesh = new THREE.Mesh(mergedArmL, sharedNpcMat);
    armL.add(armLMesh);
    group.add(armL);

    // 3. Articulated Right Arm & Weather-Reactive Umbrella
    const armR = new THREE.Group();
    armR.position.set(0.28, 1.50, 0);
    const sleeveR = applyVertexColor(new THREE.CylinderGeometry(0.065, 0.06, 0.35, 8), shirtColor);
    sleeveR.translate(0, -0.175, 0);
    const forearmR = applyVertexColor(new THREE.CylinderGeometry(0.055, 0.05, 0.28, 8), skinColor);
    forearmR.translate(0, -0.45, 0);
    const mergedArmR = BufferGeometryUtils.mergeGeometries([sleeveR, forearmR], false);
    const armRMesh = new THREE.Mesh(mergedArmR, sharedNpcMat);
    armR.add(armRMesh);

    const umbrellaGroup = new THREE.Group();
    umbrellaGroup.position.set(0, -0.55, 0);
    const shaft = applyVertexColor(new THREE.CylinderGeometry(0.015, 0.015, 0.95, 6), 0x94a3b8);
    shaft.translate(0, 0.45, 0);
    const dome = applyVertexColor(new THREE.ConeGeometry(0.68, 0.32, 10, 1, true), umbrellaColor);
    dome.translate(0, 0.95, 0);
    const mergedUmbrella = BufferGeometryUtils.mergeGeometries([shaft, dome], false);
    const umbrellaMesh = new THREE.Mesh(mergedUmbrella, sharedUmbrellaMat);
    umbrellaGroup.add(umbrellaMesh);
    umbrellaGroup.visible = false;
    armR.add(umbrellaGroup);
    group.add(armR);

    // 4. Articulated Left Leg (Pants + Shoe)
    const legL = new THREE.Group();
    legL.position.set(-0.13, 0.90, 0);
    const pantsL = applyVertexColor(new THREE.BoxGeometry(0.16, 0.76, 0.18), pantsColor);
    pantsL.translate(0, -0.38, 0);
    const shoeL = applyVertexColor(new THREE.BoxGeometry(0.14, 0.1, 0.24), 0x0f172a);
    shoeL.translate(0, -0.78, 0.03);
    const mergedLegL = BufferGeometryUtils.mergeGeometries([pantsL, shoeL], false);
    const legLMesh = new THREE.Mesh(mergedLegL, sharedNpcMat);
    legLMesh.castShadow = false;
    legL.add(legLMesh);
    group.add(legL);

    // 5. Articulated Right Leg (Pants + Shoe)
    const legR = new THREE.Group();
    legR.position.set(0.13, 0.90, 0);
    const pantsR = applyVertexColor(new THREE.BoxGeometry(0.16, 0.76, 0.18), pantsColor);
    pantsR.translate(0, -0.38, 0);
    const shoeR = applyVertexColor(new THREE.BoxGeometry(0.14, 0.1, 0.24), 0x0f172a);
    shoeR.translate(0, -0.78, 0.03);
    const mergedLegR = BufferGeometryUtils.mergeGeometries([pantsR, shoeR], false);
    const legRMesh = new THREE.Mesh(mergedLegR, sharedNpcMat);
    legRMesh.castShadow = false;
    legR.add(legRMesh);
    group.add(legR);

    return {
        group,
        type: config.type,
        armL,
        armR,
        legL,
        legR,
        umbrellaGroup,
        walkCycle: Math.random() * Math.PI * 2
    };
}

const npcs = [];

function buildMumbaiCrowd() {
    // 8 Diverse Articulated Walking Pedestrians + 28 Batched Ambient Citizens across Mumbai
    const crowdConfig = [
        // --- ZONE 1: ARABIAN SEA WATERFRONT PROMENADE ---
        { skin: 3, shirt: 0, pants: 0, hair: 0, type: 'chaiwala', wps: [{x: -8, z: -3}, {x: 12, z: -3}] },
        { skin: 2, shirt: 0, pants: 3, hair: 0, type: 'dabbawala', wps: [{x: -28, z: 2}, {x: 6, z: 2}] },
        { skin: 2, shirt: 3, pants: 3, hair: 0, type: 'saree', wps: [{x: 10, z: -4}, {x: 28, z: -4}] },

        // --- ZONE 2: NORTH AVENUE SIDEWALKS ---
        { skin: 1, shirt: 0, pants: 2, hair: 0, type: 'commuter', wps: [{x: -5.0, z: 18}, {x: -5.0, z: 42}] },
        { skin: 2, shirt: 4, pants: 0, hair: 1, type: 'student_headphones', wps: [{x: 5.0, z: 30}, {x: 5.0, z: 70}] },

        // --- ZONE 3: MARKET STREET CROSS AVENUE ---
        { skin: 1, shirt: 1, pants: 0, hair: 0, type: 'poncho', wps: [{x: -28, z: 45.0}, {x: 14, z: 45.0}] },

        // --- ZONE 4: RAILWAY STATION PLATFORMS ---
        { skin: 2, shirt: 2, pants: 4, hair: 0, type: 'kurta', wps: [{x: -28.6, z: 12}, {x: -28.6, z: 36}] },

        // --- ZONE 5: EAST CAMPUS & ACADEMIA ---
        { skin: 2, shirt: 0, pants: 0, hair: 0, type: 'student', wps: [{x: 50, z: 74}, {x: 68, z: 74}] }
    ];

    crowdConfig.forEach((cfg, idx) => {
        const p = createArticulatedPedestrian({
            skinIdx: cfg.skin,
            shirtIdx: cfg.shirt,
            pantsIdx: cfg.pants,
            hairIdx: cfg.hair,
            type: cfg.type,
            umbrellaIdx: idx % umbrellaColors.length
        });

        const startWp = cfg.wps[0];
        p.group.position.set(startWp.x, 0, startWp.z);
        scene.add(p.group);

        npcs.push({
            group: p.group,
            type: cfg.type,
            armL: p.armL,
            armR: p.armR,
            legL: p.legL,
            legR: p.legR,
            umbrellaGroup: p.umbrellaGroup,
            walkCycle: p.walkCycle,
            waypoints: cfg.wps,
            wpIdx: 1,
            speed: 1.1 + Math.random() * 0.7
        });
    });
}
buildMumbaiCrowd();
window.__npcs = npcs;

// ==========================================
// AMBIENT MUMBAI CITIZENS (BATHED IN 1 DRAW CALL)
// Seated on Promenade Sea Wall, Chai Addas, Bus Stops,
// Railway Platforms & Asiatic Library Steps
// ==========================================
function buildAmbientCitizens() {
    const ambientGeoms = [];

    // Helper: Add a seated citizen
    function addSeatedCitizen(x, y, z, rotY, skinHex, shirtHex, pantsHex, hairHex) {
        // Torso
        const torso = applyVertexColor(new THREE.BoxGeometry(0.42, 0.58, 0.24), shirtHex);
        torso.rotateY(rotY);
        torso.translate(x, y + 0.65, z);
        ambientGeoms.push(torso);

        // Head & Hair
        const head = applyVertexColor(new THREE.SphereGeometry(0.18, 8, 8), skinHex);
        head.translate(x, y + 1.1, z);
        ambientGeoms.push(head);
        const hair = applyVertexColor(new THREE.SphereGeometry(0.19, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairHex);
        hair.translate(x, y + 1.12, z);
        ambientGeoms.push(hair);

        // Seated Thighs (projecting forward)
        const forwardX = Math.sin(rotY);
        const forwardZ = Math.cos(rotY);
        const thighs = applyVertexColor(new THREE.BoxGeometry(0.38, 0.16, 0.44), pantsHex);
        thighs.rotateY(rotY);
        thighs.translate(x + forwardX * 0.15, y + 0.36, z + forwardZ * 0.15);
        ambientGeoms.push(thighs);

        // Hanging Shins
        const shins = applyVertexColor(new THREE.BoxGeometry(0.36, 0.42, 0.16), pantsHex);
        shins.rotateY(rotY);
        shins.translate(x + forwardX * 0.32, y + 0.16, z + forwardZ * 0.32);
        ambientGeoms.push(shins);
    }

    // Helper: Add a standing ambient citizen
    function addStandingCitizen(x, y, z, rotY, skinHex, shirtHex, pantsHex, hairHex) {
        // Torso
        const torso = applyVertexColor(new THREE.BoxGeometry(0.42, 0.60, 0.24), shirtHex);
        torso.rotateY(rotY);
        torso.translate(x, y + 1.25, z);
        ambientGeoms.push(torso);

        // Head & Hair
        const head = applyVertexColor(new THREE.SphereGeometry(0.19, 8, 8), skinHex);
        head.translate(x, y + 1.72, z);
        ambientGeoms.push(head);
        const hair = applyVertexColor(new THREE.SphereGeometry(0.20, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairHex);
        hair.translate(x, y + 1.74, z);
        ambientGeoms.push(hair);

        // Legs
        const legs = applyVertexColor(new THREE.BoxGeometry(0.36, 0.85, 0.20), pantsHex);
        legs.rotateY(rotY);
        legs.translate(x, y + 0.45, z);
        ambientGeoms.push(legs);
    }

    // 1. Citizens sitting on Marine Promenade Sea Wall (facing Arabian Sea)
    [-60, -42, -18, 16, 38, 55].forEach((px, i) => {
        const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d];
        const shirts = [0xffffff, 0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];
        addSeatedCitizen(px, 0.6, -21.4, Math.PI, skins[i % skins.length], shirts[i % shirts.length], 0x1e293b, 0x0f172a);
    });

    // 2. Citizens chatting at Chai Stalls (X = -20, Z = -2 and X = 20, Z = -2)
    [[-19, 0, -2.5, 0.8], [-21, 0, -2.5, -0.6], [19, 0, -2.5, 0.5], [21, 0, -2.5, -0.7]].forEach(p => {
        addStandingCitizen(p[0], p[1], p[2], p[3], 0xc68642, 0xf8fafc, 0x334155, 0x0f172a);
    });

    // 3. Commuters waiting at BEST Bus Stops (X = -10, Z = 25 and X = 10, Z = 25)
    [[-10.2, 0, 24.5, 0], [-9.8, 0, 25.5, 0], [9.8, 0, 24.5, Math.PI], [10.2, 0, 25.5, Math.PI]].forEach(p => {
        addStandingCitizen(p[0], p[1], p[2], p[3], 0xe0ac69, 0x0284c7, 0x1e293b, 0x1e1b4b);
    });

    // 4. Commuters on Railway Station Platforms (Platform 1 & 2: X = -30, Z = 20 to 35)
    [[-29.5, 0.8, 18, 0.5], [-29.5, 0.8, 24, -0.4], [-29.5, 0.8, 30, 0.2], [-29.5, 0.8, 35, 0]].forEach(p => {
        addStandingCitizen(p[0], p[1], p[2], p[3], 0x8d5524, 0xf8fafc, 0x475569, 0x0f172a);
    });

    // 5. Readers & Citizens sitting on the Grand Steps of Asiatic Library (X = 100, Z = 100 to 104)
    [[94, 1.35, 101, 0], [106, 1.8, 102, 0], [97, 2.25, 103, 0], [103, 2.7, 104, 0]].forEach(p => {
        addSeatedCitizen(p[0], p[1], p[2], p[3], 0xc68642, 0xea580c, 0x1e293b, 0x0f172a);
    });

    // 6. Travelers waiting outside Airport Terminal 2 (X = 85, Z = 345)
    [[82, 0, 345, 0], [88, 0, 345, 0.4], [94, 0, 345, -0.3]].forEach(p => {
        addStandingCitizen(p[0], p[1], p[2], p[3], 0xe0ac69, 0x4338ca, 0x020617, 0x0f172a);
    });

    if (ambientGeoms.length > 0) {
        const ambientMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(ambientGeoms, false), sharedNpcMat);
        ambientMesh.castShadow = false;
        ambientMesh.receiveShadow = true;
        scene.add(ambientMesh);
    }
}
buildAmbientCitizens();

// ==========================================
// MUMBAI STREET-LEVEL PROPS & URBAN LIFE
// (Chai Stalls, Parked Chetak Scooters, BEST Bus Stop, Thela Carts, MSEB Boxes)
// ==========================================
function buildMumbaiStreetProps() {
    const woodGeoms = [];
    const metalGeoms = [];
    const msebGeoms = [];
    const mcgmGeoms = [];
    const scooterGeoms = [];
    const wheelGeoms = [];
    const awningGeoms = [];
    const samovarGeoms = [];
    const glassCaddyGeoms = [];
    const hlGeoms = [];
    const crateGeoms = [];

    const msebMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6, metalness: 0.3 });
    const mcgmMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5, metalness: 0.2 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
    const scooterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.5 });
    const scooterWheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const awningMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.8 });

    // 1. Mumbai Cutting Chai Stalls (2 Stalls)
    const chaiLocations = [
        { x: 6.2, z: 39.5, rotY: -Math.PI / 2 }, // Corner Market St & North Ave
        { x: 14.5, z: -3.5, rotY: 0 }            // Waterfront Promenade near Vada Pav
    ];

    chaiLocations.forEach(loc => {
        // Wooden Counter Table
        const table = new THREE.BoxGeometry(1.8, 0.9, 0.9);
        table.translate(loc.x, 0.45, loc.z);
        woodGeoms.push(table);

        // Hanging Fabric Awning Support Poles
        [-0.8, 0.8].forEach(px => {
            const pole = new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6);
            pole.translate(loc.x + px, 1.15, loc.z + 0.4);
            metalGeoms.push(pole);
        });

        // Striped Cloth Canopy Overhead
        const awning = new THREE.BoxGeometry(2.1, 0.08, 1.2);
        awning.rotateX(0.15);
        awning.translate(loc.x, 2.3, loc.z + 0.1);
        awningGeoms.push(awning);

        // Brass Samovar / Tea Boiler
        const samovar = new THREE.CylinderGeometry(0.18, 0.22, 0.65, 10);
        samovar.translate(loc.x - 0.4, 1.22, loc.z);
        samovarGeoms.push(samovar);

        // Tea Glass Caddy Rack (Cutting Chai Glasses)
        const caddy = new THREE.BoxGeometry(0.45, 0.22, 0.3);
        caddy.translate(loc.x + 0.35, 1.02, loc.z);
        glassCaddyGeoms.push(caddy);

        // Chai Chalkboard Sign
        const signTex = createBilingualSignboardTexture("मुंबई कटिंग चाय", "CUTTING CHAI ₹10", "#1e1b4b", "#facc15");
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.45), new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }));
        sign.position.set(loc.x, 1.9, loc.z + 0.42);
        scene.add(sign);

        registerBoxCollider(loc.x - 1.1, loc.x + 1.1, loc.z - 0.6, loc.z + 0.6, 'ChaiStall');
    });

    // 2. Parked Bajaj Chetak Retro Scooters (4 Scooters along curbs)
    const scooterLocs = [
        { x: -6.8, z: 26.0, rotY: Math.PI / 2 },  // North Ave West curb
        { x: 18.0, z: 38.5, rotY: 0 },             // Market St curb
        { x: -43.0, z: 52.0, rotY: -Math.PI / 2 },// West Blvd near Chawls
        { x: -12.0, z: 2.0, rotY: 0.4 }           // Promenade curb
    ];

    scooterLocs.forEach(loc => {
        // Curved Pressed Steel Legshield & Footboard
        const frame = new THREE.BoxGeometry(0.38, 0.55, 1.4);
        frame.rotateY(loc.rotY);
        frame.translate(loc.x, 0.45, loc.z);
        scooterGeoms.push(frame);

        const legshield = new THREE.BoxGeometry(0.55, 0.65, 0.12);
        legshield.rotateY(loc.rotY);
        legshield.translate(loc.x + Math.sin(loc.rotY) * 0.4, 0.65, loc.z + Math.cos(loc.rotY) * 0.4);
        scooterGeoms.push(legshield);

        // Dual Split Seats
        const seat = new THREE.BoxGeometry(0.32, 0.12, 0.55);
        seat.rotateY(loc.rotY);
        seat.translate(loc.x - Math.sin(loc.rotY) * 0.2, 0.78, loc.z - Math.cos(loc.rotY) * 0.2);
        scooterGeoms.push(seat);

        // 10-inch Scooter Wheels
        [-0.45, 0.45].forEach(wz => {
            const w = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12);
            w.rotateZ(Math.PI / 2);
            w.rotateY(loc.rotY);
            w.translate(loc.x + Math.sin(loc.rotY) * wz, 0.22, loc.z + Math.cos(loc.rotY) * wz);
            wheelGeoms.push(w);
        });

        // Round Chrome Headlight
        const hl = new THREE.SphereGeometry(0.1, 8, 8);
        hl.translate(loc.x + Math.sin(loc.rotY) * 0.42, 0.95, loc.z + Math.cos(loc.rotY) * 0.42);
        hlGeoms.push(hl);

        registerBoxCollider(loc.x - 0.4, loc.x + 0.4, loc.z - 0.7, loc.z + 0.7, 'ParkedScooter');
    });

    // 3. Authentic BEST Bus Stop Shelter (North Avenue East Sidewalk, X = 7.0, Z = 28)
    const busStopX = 7.0;
    const busStopZ = 28.0;

    // Red tubular frame pillars
    [-1.6, 1.6].forEach(px => {
        const p = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8);
        p.translate(busStopX, 1.6, busStopZ + px);
        metalGeoms.push(p);
    });

    // Yellow Curved Acrylic Roof Canopy
    const busCanopy = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.14, 3.8),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
    );
    busCanopy.position.set(busStopX - 0.4, 3.1, busStopZ);
    busCanopy.rotation.z = -0.1;
    scene.add(busCanopy);

    // Bench Seat inside bus stop
    const busBench = new THREE.BoxGeometry(0.5, 0.1, 2.8);
    busBench.translate(busStopX + 0.1, 0.5, busStopZ);
    woodGeoms.push(busBench);

    // BEST Bus Stop Signboard
    const bestTex = createBilingualSignboardTexture("बृहन्मुंबई विद्युत पुरवठा आणि परिवहन", "BEST BUS STOP — ROUTE 123", "#b91c1c", "#facc15");
    const bestSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.65), new THREE.MeshBasicMaterial({ map: bestTex }));
    bestSign.position.set(busStopX - 0.45, 2.7, busStopZ);
    bestSign.rotation.y = -Math.PI / 2;
    scene.add(bestSign);

    registerBoxCollider(busStopX - 0.8, busStopX + 0.8, busStopZ - 1.8, busStopZ + 1.8, 'BusStop');

    // 4. Mumbai Street Vendor Fruit & Flower Thela (Cart at Market Street, X = -10, Z = 45)
    const thelaX = -10.0;
    const thelaZ = 45.0;

    const thelaBed = new THREE.BoxGeometry(1.4, 0.14, 2.2);
    thelaBed.translate(thelaX, 0.75, thelaZ);
    woodGeoms.push(thelaBed);

    // Wooden Crates of Bananas & Marigolds (Vertex-colored)
    const crate1 = applyVertexColor(new THREE.BoxGeometry(0.55, 0.3, 0.8), 0xfacc15); // Bananas
    crate1.translate(thelaX - 0.3, 0.95, thelaZ - 0.4);
    crateGeoms.push(crate1);

    const crate2 = applyVertexColor(new THREE.BoxGeometry(0.55, 0.3, 0.8), 0xf97316); // Marigolds
    crate2.translate(thelaX + 0.3, 0.95, thelaZ + 0.3);
    crateGeoms.push(crate2);

    // 4 Spoked Cart Wheels
    [-0.72, 0.72].forEach(wx => {
        [-0.7, 0.7].forEach(wz => {
            const w = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 12);
            w.rotateZ(Math.PI / 2);
            w.translate(thelaX + wx, 0.38, thelaZ + wz);
            woodGeoms.push(w);
        });
    });

    registerBoxCollider(thelaX - 0.9, thelaX + 0.9, thelaZ - 1.2, thelaZ + 1.2, 'FruitThela');

    // 5. MSEB Electrical Distribution Feeder Boxes (4 Boxes)
    const msebLocations = [
        { x: -6.8, z: 46.0 },
        { x: 6.8, z: 74.0 },
        { x: -43.0, z: 32.0 },
        { x: 35.0, z: 44.0 }
    ];

    msebLocations.forEach(loc => {
        const box = new THREE.BoxGeometry(0.65, 1.2, 0.9);
        box.translate(loc.x, 0.6, loc.z);
        msebGeoms.push(box);
        registerBoxCollider(loc.x - 0.4, loc.x + 0.4, loc.z - 0.55, loc.z + 0.55, 'MSEBBox');
    });

    // 6. MCGM Municipal Sidewalk Blue Trash Cans (6 Cans)
    const binLocations = [
        { x: -6.2, z: 22.0 },
        { x: 6.2, z: 50.0 },
        { x: -6.2, z: 70.0 },
        { x: 6.2, z: 80.0 },
        { x: -18.0, z: -2.0 },
        { x: 18.0, z: -2.0 }
    ];

    binLocations.forEach(loc => {
        const bin = new THREE.CylinderGeometry(0.24, 0.22, 0.8, 10);
        bin.translate(loc.x, 0.4, loc.z);
        mcgmGeoms.push(bin);
    });

    // Merge Geometries for Optimal Draw Calls
    if (woodGeoms.length > 0) {
        const mergedWood = BufferGeometryUtils.mergeGeometries(woodGeoms);
        const woodMesh = new THREE.Mesh(mergedWood, woodDoorMat);
        woodMesh.castShadow = false;
        scene.add(woodMesh);
    }

    if (metalGeoms.length > 0) {
        const mergedMetal = BufferGeometryUtils.mergeGeometries(metalGeoms);
        const metalMesh = new THREE.Mesh(mergedMetal, metalRailingMat);
        metalMesh.castShadow = false;
        scene.add(metalMesh);
    }

    if (msebGeoms.length > 0) {
        const mergedMseb = BufferGeometryUtils.mergeGeometries(msebGeoms);
        const msebMesh = new THREE.Mesh(mergedMseb, msebMat);
        msebMesh.castShadow = false;
        scene.add(msebMesh);
    }

    if (mcgmGeoms.length > 0) {
        const mergedMcgm = BufferGeometryUtils.mergeGeometries(mcgmGeoms);
        const mcgmMesh = new THREE.Mesh(mergedMcgm, mcgmMat);
        mcgmMesh.castShadow = false;
        scene.add(mcgmMesh);
    }

    if (scooterGeoms.length > 0) {
        const mergedScooter = BufferGeometryUtils.mergeGeometries(scooterGeoms);
        const scooterMesh = new THREE.Mesh(mergedScooter, scooterMat);
        scooterMesh.castShadow = false;
        scene.add(scooterMesh);
    }

    if (wheelGeoms.length > 0) {
        const mergedWheels = BufferGeometryUtils.mergeGeometries(wheelGeoms);
        const wheelMesh = new THREE.Mesh(mergedWheels, scooterWheelMat);
        wheelMesh.castShadow = false;
        scene.add(wheelMesh);
    }

    if (awningGeoms.length > 0) {
        const mergedAwnings = BufferGeometryUtils.mergeGeometries(awningGeoms);
        scene.add(new THREE.Mesh(mergedAwnings, awningMat));
    }

    if (samovarGeoms.length > 0) {
        const mergedSamovars = BufferGeometryUtils.mergeGeometries(samovarGeoms);
        scene.add(new THREE.Mesh(mergedSamovars, brassMat));
    }

    if (glassCaddyGeoms.length > 0) {
        const mergedCaddies = BufferGeometryUtils.mergeGeometries(glassCaddyGeoms);
        scene.add(new THREE.Mesh(mergedCaddies, glassMat));
    }

    if (hlGeoms.length > 0) {
        const mergedHl = BufferGeometryUtils.mergeGeometries(hlGeoms);
        scene.add(new THREE.Mesh(mergedHl, new THREE.MeshBasicMaterial({ color: 0xfffbeb })));
    }

    if (crateGeoms.length > 0) {
        const mergedCrates = BufferGeometryUtils.mergeGeometries(crateGeoms, false);
        scene.add(new THREE.Mesh(mergedCrates, new THREE.MeshStandardMaterial({ roughness: 0.85, vertexColors: true })));
    }
}
buildMumbaiStreetProps();

// ==========================================
// ROAD & TRANSIT NETWORK (Phase 3: City Foundation)
// ==========================================

// ==========================================
// ROAD & TRANSIT NETWORK (Phase 3 & Phase B: 800m x 800m Arterial Grid)
// ==========================================
const allRoadGeoms = [];

function registerRoadSegment(x, z, length, width, isEastWest = true) {
    const geom = isEastWest 
        ? new THREE.BoxGeometry(length, 0.4, width)
        : new THREE.BoxGeometry(width, 0.4, length);
    geom.translate(x, -0.2, z);
    allRoadGeoms.push(geom);
}

// 1. South Arterial: Marine Avenue (Z = 16, X = -380 to +380, width 14m)
registerRoadSegment(0, 16, 760, 14, true);

// 2. Midtown Cross Avenue: Market Street (Z = 42, X = -380 to +380, width 10m)
registerRoadSegment(0, 42, 760, 10, true);

// 3. Central Downtown Boulevard: Midtown Avenue (Z = 140, X = -380 to +380, width 12m with gap for Stark Plaza)
registerRoadSegment(-210, 140, 340, 12, true);
registerRoadSegment(210, 140, 340, 12, true);

// 4. North Arterial: Campus Cross Avenue (Z = 240, X = -360 to +360, width 12m)
registerRoadSegment(0, 240, 720, 12, true);

// 5. Far North Expressway: Terminal Way (Z = 380, X = -360 to +360, width 10m)
registerRoadSegment(0, 380, 720, 10, true);

// 6. Central Spine: North Express Avenue (X = 0, Z = 16 to 480, width 12m with gap for Stark Plaza)
registerRoadSegment(0, 60, 88, 12, false); // Z = 16 to 104
registerRoadSegment(0, 328, 304, 12, false); // Z = 176 to 480

// 7. West Arterial Avenue (X = -180, Z = 16 to 480, width 12m)
registerRoadSegment(-180, 248, 464, 12, false);

// 8. East Arterial Avenue (X = +180, Z = 16 to 480, width 12m)
registerRoadSegment(180, 248, 464, 12, false);

// 9. Far West Coastal Expressway (X = -320, Z = 16 to 240, width 10m)
registerRoadSegment(-320, 128, 224, 10, false);

// 10. Far East Docks Expressway (X = +320, Z = 16 to 240, width 10m)
registerRoadSegment(320, 128, 224, 10, false);

// 11. Preserved Local Connectors: West Blvd (X = -48, Z = 16 to 62) & East Blvd (X = 48, Z = 16 to 62)
registerRoadSegment(-48, 39, 46, 12, false);
registerRoadSegment(48, 39, 46, 12, false);

// 12. Stark Tower Ceremonial Roundabout & Plaza Foundation at (0, 140)
const roundaboutOuter = new THREE.CylinderGeometry(40, 40, 0.4, 32);
roundaboutOuter.translate(0, -0.2, 140);
allRoadGeoms.push(roundaboutOuter);

// Central Stark Tower Foundation Pedestal (radius 18m, height 1.2m)
const starkPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 19, 1.2, 32),
    darkGraniteMat
);
starkPedestal.position.set(0, 0.6, 140);
starkPedestal.receiveShadow = true;
scene.add(starkPedestal);

// Glowing cyan Arc Reactor circular perimeter ring
const arcRingMesh = new THREE.Mesh(
    new THREE.TorusGeometry(17.8, 0.25, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
);
arcRingMesh.rotation.x = Math.PI / 2;
arcRingMesh.position.set(0, 1.25, 140);
scene.add(arcRingMesh);

// Grand Entrance Canopy Sign at Stark Plaza
const starkSignCanvas = document.createElement('canvas');
starkSignCanvas.width = 512; starkSignCanvas.height = 128;
const stCtx = starkSignCanvas.getContext('2d');
stCtx.fillStyle = '#090d16'; stCtx.fillRect(0, 0, 512, 128);
stCtx.fillStyle = '#38bdf8'; stCtx.font = 'bold 24px sans-serif';
stCtx.textAlign = 'center';
stCtx.fillText("HOME HQ — DEVARSHI DAVANE", 256, 48);
stCtx.fillStyle = '#94a3b8'; stCtx.font = '16px sans-serif';
stCtx.fillText("RESIDENCE • CYBER LAB & FLIGHT DECK", 256, 88);
const starkSign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(starkSignCanvas) }));
starkSign.position.set(0, 5.5, 122);
scene.add(starkSign);

// Build Unified Merged Road Network Mesh
if (allRoadGeoms.length > 0) {
    const mergedRoads = BufferGeometryUtils.mergeGeometries(allRoadGeoms);
    const roadMesh = new THREE.Mesh(mergedRoads, new THREE.MeshStandardMaterial({ map: asphaltCrossTex, roughness: 0.85 }));
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);
}

// Sidewalk, Curb & Zebra Crosswalk Batched Geometries
const allSidewalkGeoms = [];
const allCurbGeoms = [];
const allZebraGeoms = [];

function registerSidewalk(x, z, width, length, isEastWest = false) {
    const swGeom = isEastWest 
        ? new THREE.BoxGeometry(length, 0.22, width)
        : new THREE.BoxGeometry(width, 0.22, length);
    swGeom.translate(x, -0.11, z);
    allSidewalkGeoms.push(swGeom);

    const curbGeom = isEastWest
        ? new THREE.BoxGeometry(length, 0.26, 0.22)
        : new THREE.BoxGeometry(0.22, 0.26, length);
    curbGeom.translate(x, -0.09, z);
    allCurbGeoms.push(curbGeom);
}

function registerZebraCrossing(x, z, isEastWest = false) {
    const stripeCount = 6;
    for (let i = 0; i < stripeCount; i++) {
        const stripe = new THREE.PlaneGeometry(isEastWest ? 0.75 : 3.2, isEastWest ? 3.2 : 0.75);
        stripe.rotateX(-Math.PI / 2);
        if (isEastWest) {
            stripe.translate(x - 3.2 + i * 1.3, 0.02, z);
        } else {
            stripe.translate(x, 0.02, z - 3.2 + i * 1.3);
        }
        allZebraGeoms.push(stripe);
    }
}

// Paved circular plaza slab for Stark Tower foundation (radius 34m)
const starkPlazaSlab = new THREE.CylinderGeometry(34, 34, 0.24, 32);
starkPlazaSlab.translate(0, -0.1, 140);
allSidewalkGeoms.push(starkPlazaSlab);

// Register Sidewalk Network across Expanded Avenues
registerSidewalk(0, 24.5, 3.0, 760, true);
registerSidewalk(0, 7.5, 3.0, 760, true);
registerSidewalk(0, 48.5, 3.0, 760, true);
registerSidewalk(0, 35.5, 3.0, 760, true);
registerSidewalk(-210, 147.5, 3.0, 340, true);
registerSidewalk(-210, 132.5, 3.0, 340, true);
registerSidewalk(210, 147.5, 3.0, 340, true);
registerSidewalk(210, 132.5, 3.0, 340, true);
registerSidewalk(0, 247.5, 3.0, 720, true);
registerSidewalk(0, 232.5, 3.0, 720, true);
registerSidewalk(0, 386.5, 3.0, 720, true);
registerSidewalk(0, 373.5, 3.0, 720, true);

// North Express sidewalks
registerSidewalk(-7.5, 60, 3.0, 88, false);
registerSidewalk(7.5, 60, 3.0, 88, false);
registerSidewalk(-7.5, 328, 3.0, 304, false);
registerSidewalk(7.5, 328, 3.0, 304, false);

// West & East Arterial sidewalks
registerSidewalk(-187.5, 248, 3.0, 464, false);
registerSidewalk(-172.5, 248, 3.0, 464, false);
registerSidewalk(172.5, 248, 3.0, 464, false);
registerSidewalk(187.5, 248, 3.0, 464, false);

// Local West & East Blvd sidewalks (preserved)
registerSidewalk(-55.5, 39, 3.0, 46, false);
registerSidewalk(-40.5, 39, 3.0, 46, false);
registerSidewalk(40.5, 39, 3.0, 46, false);
registerSidewalk(55.5, 39, 3.0, 46, false);

// Register Zebra Crossings at Major Intersections
registerZebraCrossing(0, 16, true);
registerZebraCrossing(0, 16, false);
registerZebraCrossing(0, 42, true);
registerZebraCrossing(0, 42, false);
registerZebraCrossing(-48, 42, true);
registerZebraCrossing(48, 42, true);
registerZebraCrossing(-180, 16, true);
registerZebraCrossing(180, 16, true);
registerZebraCrossing(-180, 42, true);
registerZebraCrossing(180, 42, true);
registerZebraCrossing(0, 240, true);
registerZebraCrossing(-180, 240, true);
registerZebraCrossing(180, 240, true);
registerZebraCrossing(0, 380, true);

// Build Unified Merged Meshes
if (allSidewalkGeoms.length > 0) {
    const mergedSw = BufferGeometryUtils.mergeGeometries(allSidewalkGeoms);
    const swMesh = new THREE.Mesh(mergedSw, sidewalkMat);
    swMesh.receiveShadow = true;
    scene.add(swMesh);
}
if (allCurbGeoms.length > 0) {
    const mergedCurbs = BufferGeometryUtils.mergeGeometries(allCurbGeoms);
    const curbMesh = new THREE.Mesh(mergedCurbs, concreteTrimMat);
    curbMesh.castShadow = false;
    scene.add(curbMesh);
}
if (allZebraGeoms.length > 0) {
    const mergedZebra = BufferGeometryUtils.mergeGeometries(allZebraGeoms);
    const zebraMesh = new THREE.Mesh(mergedZebra, new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    scene.add(zebraMesh);
}

// Streetlights & Avenue Trees
[-60, -30, 30, 60].forEach(rx => {
    addStreetLamp(rx, 24);
    addTree(rx, 26, 'city');
});
[30, 54, 70].forEach(rz => {
    addStreetLamp(8, rz);
    addStreetLamp(-8, rz);
    addTree(-10, rz, 'city');
    addTree(10, rz, 'city');
});

function finalizeBatchedVegetationAndLamps() {
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.85 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffea9f });
    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    const cityTrunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
    const cityLeafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });

    if (batchedLampPoles.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedLampPoles), ironMat);
        m.castShadow = false;
        scene.add(m);
    }
    if (batchedLampBulbs.length > 0) {
        scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedLampBulbs), bulbMat));
    }
    if (batchedPalmTrunks.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedPalmTrunks), palmTrunkMat);
        m.castShadow = false;
        scene.add(m);
    }
    if (batchedPalmLeaves.length > 0) {
        scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedPalmLeaves), palmLeafMat));
    }
    if (batchedCityTrunks.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedCityTrunks), cityTrunkMat);
        m.castShadow = false;
        scene.add(m);
    }
    if (batchedCityFoliage.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedCityFoliage), cityLeafMat);
        m.castShadow = false;
        scene.add(m);
    }
}
finalizeBatchedVegetationAndLamps();

// ==========================================
// PROCEDURAL MUMBAI ARCHITECTURE GENERATOR (Phase 3)
// 4 Authentic Mumbai Building Families
// ==========================================
const cityBuildings = [];

// 1. Chawl Building Family (3 Storeys, Cantilevered Corridors, Clotheslines, Tin Roof)
function createChawlBuilding(x, z, width = 16, depth = 10, storeys = 3, rotY = 0) {
    const group = new THREE.Group();
    const storeyH = 3.4;
    const totalH = storeys * storeyH;

    // 1. Main structural block
    const mainMesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, totalH, depth),
        chawlPlasterMat
    );
    mainMesh.position.set(0, totalH / 2, 0);
    mainMesh.castShadow = false;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    // 2. Merged Concrete Corridors & Railings
    const corridorDepth = 1.3;
    const concreteGeoms = [];
    const railingGeoms = [];
    const decorGeoms = [];

    for (let s = 1; s < storeys; s++) {
        const floorY = s * storeyH;
        const slab = new THREE.BoxGeometry(width + 0.3, 0.32, corridorDepth);
        slab.translate(0, floorY, depth / 2 + corridorDepth / 2);
        concreteGeoms.push(slab);

        const railTop = new THREE.BoxGeometry(width + 0.3, 0.1, 0.1);
        railTop.translate(0, floorY + 1.05, depth / 2 + corridorDepth);
        railingGeoms.push(railTop);

        for (let rx = -width / 2 + 1; rx <= width / 2 - 1; rx += 2.0) {
            const picket = new THREE.BoxGeometry(0.08, 1.05, 0.08);
            picket.translate(rx, floorY + 0.52, depth / 2 + corridorDepth);
            railingGeoms.push(picket);
        }

        for (let dx = -width / 2 + 2.2; dx <= width / 2 - 2.2; dx += 3.8) {
            const door = new THREE.BoxGeometry(1.2, 2.1, 0.1);
            door.translate(dx, floorY + 1.05, depth / 2 + 0.06);
            decorGeoms.push(door);
        }
    }

    // Exposed vertical conduit pipes
    [-width / 2 + 0.4, width / 2 - 0.4].forEach(px => {
        const pipe = new THREE.BoxGeometry(0.12, totalH, 0.12);
        pipe.translate(px, totalH / 2, depth / 2 + 0.1);
        concreteGeoms.push(pipe);
    });

    if (concreteGeoms.length > 0) {
        const mergedConcrete = BufferGeometryUtils.mergeGeometries(concreteGeoms);
        const cMesh = new THREE.Mesh(mergedConcrete, concreteTrimMat);
        cMesh.castShadow = false;
        group.add(cMesh);
    }
    if (railingGeoms.length > 0) {
        const mergedRailings = BufferGeometryUtils.mergeGeometries(railingGeoms);
        group.add(new THREE.Mesh(mergedRailings, metalRailingMat));
    }
    if (decorGeoms.length > 0) {
        const mergedDecor = BufferGeometryUtils.mergeGeometries(decorGeoms);
        group.add(new THREE.Mesh(mergedDecor, woodDoorMat));
    }

    // 3. Sloped Corrugated Iron Roof
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.8, 0.35, depth + corridorDepth + 0.6),
        corrugatedRoofMat
    );
    roof.position.set(0, totalH + 0.18, corridorDepth / 2);
    roof.castShadow = false;
    group.add(roof);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);

    const minX = x - (width + 0.4) / 2;
    const maxX = x + (width + 0.4) / 2;
    const minZ = z - depth / 2;
    const maxZ = z + depth / 2 + corridorDepth;
    registerBoxCollider(minX, maxX, minZ, maxZ, 'Chawl', -5, totalH + 1.5);
    cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'chawl' });
    return group;
}

// 2. Mid-Rise Apartment Family (4-6 Storeys, Box Balconies, AC Compressors, Sintex Water Tanks)
function createApartmentBuilding(x, z, width = 12, depth = 10, storeys = 5, colorTheme = 'peach', rotY = 0) {
    const group = new THREE.Group();
    const storeyH = 3.3;
    const totalH = storeys * storeyH;

    let aptMat = aptMatPeach;
    if (colorTheme === 'mint') aptMat = aptMatMint;
    else if (colorTheme === 'cream') aptMat = aptMatCream;
    else if (colorTheme === 'sky') aptMat = aptMatSky;

    // 1. Main Facade Body
    const mainBody = new THREE.Mesh(
        new THREE.BoxGeometry(width, totalH, depth),
        aptMat
    );
    mainBody.position.set(0, totalH / 2, 0);
    mainBody.castShadow = false;
    mainBody.receiveShadow = true;
    group.add(mainBody);

    // 2. Merged Balconies, AC Units, and Parapets
    const concreteGeoms = [];
    const metalGeoms = [];
    const tankGeoms = [];

    const parapet = new THREE.BoxGeometry(width + 0.2, 0.9, depth + 0.2);
    parapet.translate(0, totalH + 0.45, 0);
    concreteGeoms.push(parapet);

    for (let s = 1; s < storeys; s++) {
        const floorY = s * storeyH;
        [-width / 4, width / 4].forEach(bx => {
            const balcony = new THREE.BoxGeometry(width * 0.38, 1.0, 1.2);
            balcony.translate(bx, floorY + 0.5, depth / 2 + 0.6);
            concreteGeoms.push(balcony);

            const grill = new THREE.BoxGeometry(width * 0.36, 1.3, 0.06);
            grill.translate(bx, floorY + 1.65, depth / 2 + 1.18);
            metalGeoms.push(grill);

            const acUnit = new THREE.BoxGeometry(0.9, 0.6, 0.45);
            acUnit.translate(bx + (bx > 0 ? 2.2 : -2.2), floorY + 1.1, depth / 2 + 0.25);
            metalGeoms.push(acUnit);
        });
    }

    [[-width / 4, -depth / 4], [width / 4, depth / 4]].forEach(([tx, tz]) => {
        const tank = new THREE.CylinderGeometry(0.9, 0.9, 1.8, 12);
        tank.translate(tx, totalH + 0.9, tz);
        tankGeoms.push(tank);
    });

    // Dish TV Antenna
    const dishGeom = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 10);
    dishGeom.rotateX(Math.PI / 4);
    dishGeom.translate(0, totalH + 1.2, -depth / 3);
    metalGeoms.push(dishGeom);

    if (concreteGeoms.length > 0) {
        const mergedConcrete = BufferGeometryUtils.mergeGeometries(concreteGeoms);
        const cMesh = new THREE.Mesh(mergedConcrete, concreteTrimMat);
        cMesh.castShadow = false;
        group.add(cMesh);
    }
    if (metalGeoms.length > 0) {
        const mergedMetal = BufferGeometryUtils.mergeGeometries(metalGeoms);
        group.add(new THREE.Mesh(mergedMetal, metalGrillMat));
    }
    if (tankGeoms.length > 0) {
        const mergedTanks = BufferGeometryUtils.mergeGeometries(tankGeoms);
        const tMesh = new THREE.Mesh(mergedTanks, sintexTankMat);
        tMesh.castShadow = false;
        group.add(tMesh);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);

    const minX = x - (width + 0.4) / 2;
    const maxX = x + (width + 0.4) / 2;
    const minZ = z - depth / 2;
    const maxZ = z + depth / 2 + 1.3;
    registerBoxCollider(minX, maxX, minZ, maxZ, 'Apartment', -5, totalH + 2.0);
    cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'apartment' });
    return group;
}

// 3. Commercial Mixed-Use Building Family (Ground Shops, Rolling Shutters, Bilingual Signboard, Awnings)
function createCommercialBuilding(x, z, width = 11, depth = 10, storeys = 4, mrName = "दुकान", enName = "STORE", shutterColor = 0x0284c7, awningColor = 0xef4444, rotY = 0) {
    const group = new THREE.Group();
    const groundH = 4.0;
    const upperStoreyH = 3.1;
    const totalH = groundH + (storeys - 1) * upperStoreyH;

    // 1. Upper Floors Main Body
    const upperBody = new THREE.Mesh(
        new THREE.BoxGeometry(width, totalH - groundH, depth),
        aptMatCream
    );
    upperBody.position.set(0, groundH + (totalH - groundH) / 2, 0);
    upperBody.castShadow = false;
    group.add(upperBody);

    // 2. Merged Ground Base & Parapet
    const concreteGeoms = [];
    const baseGeom = new THREE.BoxGeometry(width + 0.15, groundH, depth);
    baseGeom.translate(0, groundH / 2, 0);
    concreteGeoms.push(baseGeom);

    const parapet = new THREE.BoxGeometry(width + 0.2, 0.8, depth + 0.2);
    parapet.translate(0, totalH + 0.4, 0);
    concreteGeoms.push(parapet);

    const tankGeom = new THREE.CylinderGeometry(1.0, 1.0, 1.9, 10);
    tankGeom.translate(width / 4, totalH + 0.95, -depth / 4);
    concreteGeoms.push(tankGeom);

    const mergedConcrete = BufferGeometryUtils.mergeGeometries(concreteGeoms);
    group.add(new THREE.Mesh(mergedConcrete, concreteTrimMat));

    // 3. Merged Rolling Shutters
    const shutterGeoms = [];
    [-width / 4, width / 4].forEach(sx => {
        const shutter = new THREE.BoxGeometry(width * 0.43, 3.0, 0.18);
        shutter.translate(sx, 1.5, depth / 2 + 0.1);
        shutterGeoms.push(shutter);
    });
    const mergedShutters = BufferGeometryUtils.mergeGeometries(shutterGeoms);
    const sMat = new THREE.MeshStandardMaterial({ color: shutterColor, roughness: 0.45, metalness: 0.65 });
    const sMesh = new THREE.Mesh(mergedShutters, sMat);
    sMesh.castShadow = false;
    group.add(sMesh);

    // 4. Fabric Awning
    const awning = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.3, 0.3, 1.6),
        new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.7 })
    );
    awning.rotation.x = 0.18;
    awning.position.set(0, 3.3, depth / 2 + 0.8);
    awning.castShadow = false;
    group.add(awning);

    // 5. Bilingual Signboard
    const signTex = createBilingualSignboardTexture(mrName, enName, '#0f172a', '#f8fafc');
    const signBoard = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 0.88, 1.3),
        new THREE.MeshBasicMaterial({ map: signTex })
    );
    signBoard.position.set(0, 4.0, depth / 2 + 0.16);
    group.add(signBoard);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);

    const minX = x - (width + 0.4) / 2;
    const maxX = x + (width + 0.4) / 2;
    const minZ = z - depth / 2;
    const maxZ = z + depth / 2 + 1.7;
    registerBoxCollider(minX, maxX, minZ, maxZ, 'Commercial', -5, totalH + 2.0);
    cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'commercial' });
    return group;
}

// 4. Modern Corporate Tower Family (7-9 Storeys, Tinted Glass Curtain, Sunshades, Grand Portico, Rooftop HVAC)
function createCorporateTower(x, z, width = 12, depth = 10, storeys = 8, glassTint = 0x0284c7, rotY = 0) {
    const group = new THREE.Group();
    const storeyH = 3.5;
    const totalH = storeys * storeyH;

    // 1. Tinted Glass Facade Body
    const glassBody = new THREE.Mesh(
        new THREE.BoxGeometry(width, totalH, depth),
        new THREE.MeshStandardMaterial({
            color: glassTint,
            metalness: 0.85,
            roughness: 0.18,
            map: corporateGlassTex
        })
    );
    glassBody.position.set(0, totalH / 2, 0);
    glassBody.castShadow = false;
    glassBody.receiveShadow = true;
    group.add(glassBody);

    // 2. Merged Structural Columns, Sunshades, Portico, and HVAC
    const archGeoms = [];

    [[-width / 2, -depth / 2], [width / 2, -depth / 2], [-width / 2, depth / 2], [width / 2, depth / 2]].forEach(([cx, cz]) => {
        const col = new THREE.BoxGeometry(1.1, totalH + 0.8, 1.1);
        col.translate(cx, (totalH + 0.8) / 2, cz);
        archGeoms.push(col);
    });

    for (let s = 1; s < storeys; s++) {
        const floorY = s * storeyH;
        const shade = new THREE.BoxGeometry(width + 0.3, 0.22, 0.7);
        shade.translate(0, floorY, depth / 2 + 0.35);
        archGeoms.push(shade);
    }

    const portico = new THREE.BoxGeometry(width * 0.52, 0.35, 2.2);
    portico.translate(0, 3.8, depth / 2 + 1.1);
    archGeoms.push(portico);

    [-width * 0.22, width * 0.22].forEach(px => {
        const pillar = new THREE.BoxGeometry(0.3, 3.8, 0.3);
        pillar.translate(px, 1.9, depth / 2 + 2.0);
        archGeoms.push(pillar);
    });

    const hvac = new THREE.BoxGeometry(width * 0.55, 2.5, depth * 0.5);
    hvac.translate(0, totalH + 1.25, 0);
    archGeoms.push(hvac);

    const beaconGeom = new THREE.SphereGeometry(0.24, 8, 8);
    beaconGeom.translate(0, totalH + 2.8, 0);
    archGeoms.push(beaconGeom);

    const mergedArch = BufferGeometryUtils.mergeGeometries(archGeoms);
    const archMesh = new THREE.Mesh(mergedArch, concreteTrimMat);
    archMesh.castShadow = false;
    group.add(archMesh);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);

    const minX = x - (width + 0.6) / 2;
    const maxX = x + (width + 0.6) / 2;
    const minZ = z - depth / 2;
    const maxZ = z + depth / 2 + 2.2;
    registerBoxCollider(minX, maxX, minZ, maxZ, 'CorporateTower', -5, totalH + 4.0);
    cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'corporate' });
    return group;
}

// ==========================================
// BUILD MUMBAI OPEN-WORLD URBAN GRID
// 24 Multi-Storey Buildings Across 4 Sectors
// ==========================================
function buildMumbaiUrbanGrid() {
    // --- SECTOR 1: WEST RESIDENTIAL DISTRICT (Chawls & Mid-Rise Apartments) ---
    // 1. Chawl 1 (Girgaon Heritage Chawl)
    createChawlBuilding(-66, 30, 16, 10, 3);
    // 2. Chawl 2 (Lalbaug Mill Chawl)
    createChawlBuilding(-66, 54, 16, 10, 3);
    // 3. Chawl 3 (Parel Workers Chawl)
    createChawlBuilding(-66, 70, 16, 10, 3);
    // 4. Apartment A1 (Shree Ganesh Kripa Apts)
    createApartmentBuilding(-36, 30, 10, 10, 5, 'peach');
    // 5. Apartment A2 (Sai Krupa Niwas)
    createApartmentBuilding(-36, 54, 10, 10, 4, 'mint');
    // 6. Apartment A3 (Omkar Heights)
    createApartmentBuilding(-36, 70, 10, 10, 5, 'cream');

    // --- SECTOR 2: CENTRAL COMMERCIAL SQUARE (Flanking North Avenue) ---
    // West Row (X = -14)
    // 7. Commercial C1 (Mahalakshmi Super Store)
    createCommercialBuilding(-14, 30, 11, 10, 3, "महालक्ष्मी किराणा स्टोअर्स", "MAHALAKSHMI SUPER STORE", 0x0284c7, 0xef4444);
    // 8. Commercial C2 (Details Mobile & Care)
    createCommercialBuilding(-14, 54, 11, 10, 4, "डीटेल्स मोबाईल केअर", "DETAILS MOBILE & ELECTRONICS", 0x059669, 0xf59e0b);
    // 9. Commercial C3 (Amruta Medical & Pharmacy)
    createCommercialBuilding(-14, 70, 11, 10, 4, "अमृता मेडिकल स्टोअर्स", "AMRUTA MEDICAL & PHARMACY", 0x0284c7, 0x06b6d4);
    // 10. Corporate Tower T1 (Nariman Point Plaza)
    createCorporateTower(-14, 82, 11, 10, 8, 0x0284c7);

    // East Row (X = 14)
    // 11. Commercial C4 (Mumbai Chai & Snacks)
    createCommercialBuilding(14, 30, 11, 10, 3, "मुंबई चाय आणि नाश्ता", "MUMBAI CHAI & FAST FOOD", 0xd97706, 0xf97316);
    // 12. Commercial C5 (Ganesh Stationery & Xerox)
    createCommercialBuilding(14, 54, 11, 10, 4, "गणेश स्टेशनरी आणि झेरॉक्स", "GANESH STATIONERY & XEROX", 0x0284c7, 0x3b82f6);
    // 13. Apartment A4 (Shivaji Park Residency)
    createApartmentBuilding(14, 70, 11, 10, 5, 'sky');
    // 14. Corporate Tower T2 (Bandra-Kurla One)
    createCorporateTower(14, 82, 11, 10, 8, 0x0369a1);

    // --- SECTOR 3: EAST CAMPUS & TECH DISTRICT (Around DMCE College) ---
    // 15. Corporate Tower T3 (Mindspace Software Park)
    createCorporateTower(32, 30, 12, 10, 7, 0x0284c7);
    // 16. Apartment A5 (DMCE Student Towers)
    createApartmentBuilding(32, 54, 12, 10, 5, 'mint');
    // 17. Corporate Tower T4 (Tech Innovation Labs)
    createCorporateTower(32, 70, 12, 10, 8, 0x0f766e);
    // 18. Corporate Tower T5 (Cyber City High-Rise)
    createCorporateTower(64, 30, 14, 10, 8, 0x1d4ed8);
    // Lot at (64, 80) is reserved for the Relocated School Academic Campus with clear, open landscaped plaza

    // --- SECTOR 4: NORTH DISTRICT & ARTERIAL BOULEVARDS ---
    // 22. Secondary School Academic Annex & Library (West of School)
    createCorporateTower(-24, 84, 12, 10, 5, 0x475569);
    // 23. Youth Sports & Cultural Pavilion (East of School)
    createCommercialBuilding(24, 84, 12, 10, 3, "युवा क्रीडा आणि सांस्कृतिक केंद्र", "YOUTH SPORTS & CULTURAL CENTRE", 0x15803d, 0x16a34a);
    // 24. Chawl 4 (Central Railway Staff Colony)
    createChawlBuilding(-48, 82, 14, 10, 3);
}
buildMumbaiUrbanGrid();

// ==========================================
// EXPANDED DISTRICTS BATCH GENERATOR (Phase B: 800m x 800m Vast City)
// 44 Authentically Modeled Mumbai Buildings batched into unified draw calls
// ==========================================
function buildExpandedDistrictsBatch() {
    const batchedWallsPlaster = [];
    const batchedWallsApartments = [];
    const batchedWallsCorporate = [];
    const batchedConcreteTrim = [];
    const batchedGlass = [];
    const batchedMetal = [];
    const batchedRoofs = [];

    function addBox(arr, x, y, z, w, h, d, rotY = 0) {
        const geom = new THREE.BoxGeometry(w, h, d);
        if (rotY !== 0) geom.rotateY(rotY);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    function addCylinder(arr, x, y, z, rTop, rBot, h, seg = 8) {
        const geom = new THREE.CylinderGeometry(rTop, rBot, h, seg);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    // Helper: Build a batched residential Chawl block
    function buildBatchedChawl(x, z, w, d, storeys, rotY = 0) {
        const storeyH = 3.4;
        const totalH = storeys * storeyH;
        // Main plaster structural block
        addBox(batchedWallsPlaster, x, totalH / 2, z, w, totalH, d, rotY);
        // Cantilevered gallery slabs
        for (let s = 1; s < storeys; s++) {
            const fy = s * storeyH;
            addBox(batchedConcreteTrim, x, fy, z + d / 2 + 0.65, w + 0.4, 0.32, 1.3, rotY);
            addBox(batchedMetal, x, fy + 0.55, z + d / 2 + 1.3, w + 0.4, 0.9, 0.08, rotY);
        }
        // Sloped tin roof
        addBox(batchedRoofs, x, totalH + 0.2, z + 0.4, w + 0.8, 0.35, d + 1.6, rotY);
        // Sintex water tanks on roof
        addCylinder(batchedMetal, x - w / 4, totalH + 1.1, z, 0.9, 0.9, 1.8);
        addCylinder(batchedMetal, x + w / 4, totalH + 1.1, z, 0.9, 0.9, 1.8);

        const minX = x - (w + 0.6) / 2;
        const maxX = x + (w + 0.6) / 2;
        const minZ = z - d / 2;
        const maxZ = z + d / 2 + 1.4;
        registerBoxCollider(minX, maxX, minZ, maxZ, 'ExpandedChawl', -5, totalH + 1.5);
        cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'chawl' });
    }

    // Helper: Build a batched Apartment block
    function buildBatchedApartment(x, z, w, d, storeys, theme = 'peach') {
        const storeyH = 3.3;
        const totalH = storeys * storeyH;

        // Main body
        addBox(batchedWallsApartments, x, totalH / 2, z, w, totalH, d);
        // Parapet
        addBox(batchedConcreteTrim, x, totalH + 0.45, z, w + 0.3, 0.9, d + 0.3);
        // Balconies
        for (let s = 1; s < storeys; s++) {
            const fy = s * storeyH;
            addBox(batchedConcreteTrim, x - w / 4, fy + 0.5, z + d / 2 + 0.6, w * 0.38, 1.0, 1.2);
            addBox(batchedConcreteTrim, x + w / 4, fy + 0.5, z + d / 2 + 0.6, w * 0.38, 1.0, 1.2);
            addBox(batchedMetal, x - w / 4 + 2.2, fy + 1.1, z + d / 2 + 0.25, 0.9, 0.6, 0.45);
        }
        // Rooftop water tanks
        addCylinder(batchedMetal, x, totalH + 1.0, z, 1.0, 1.0, 2.0);

        const minX = x - w / 2;
        const maxX = x + w / 2;
        const minZ = z - d / 2;
        const maxZ = z + d / 2 + 1.2;
        registerBoxCollider(minX, maxX, minZ, maxZ, 'ExpandedApartment', -5, totalH + 2.0);
        cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'apartment' });
    }

    // Helper: Build a batched Commercial Retail Plaza
    function buildBatchedCommercial(x, z, w, d, storeys) {
        const storeyH = 3.6;
        const totalH = storeys * storeyH;
        // Main block
        addBox(batchedWallsCorporate, x, totalH / 2, z, w, totalH, d);
        // Concrete band trim
        addBox(batchedConcreteTrim, x, totalH + 0.5, z, w + 0.4, 0.8, d + 0.4);
        // Ground-floor storefront portico canopy
        addBox(batchedConcreteTrim, x, 3.8, z + d / 2 + 1.2, w + 0.6, 0.4, 2.4);
        // Glass display windows
        addBox(batchedGlass, x, 1.8, z + d / 2 + 0.08, w * 0.88, 2.4, 0.1);
        addBox(batchedGlass, x, totalH * 0.65, z + d / 2 + 0.08, w * 0.75, totalH * 0.4, 0.1);

        const minX = x - w / 2;
        const maxX = x + w / 2;
        const minZ = z - d / 2;
        const maxZ = z + d / 2 + 2.4;
        registerBoxCollider(minX, maxX, minZ, maxZ, 'ExpandedCommercial', -5, totalH + 2.0);
        cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'commercial' });
    }

    // Helper: Build a batched High-Rise Corporate Tower
    function buildBatchedCorporate(x, z, w, d, storeys) {
        const storeyH = 3.8;
        const totalH = storeys * storeyH;
        // Podium base
        addBox(batchedConcreteTrim, x, 4.0, z, w + 1.0, 8.0, d + 1.0);
        // Glass tower shaft
        addBox(batchedGlass, x, (totalH + 8) / 2, z, w, totalH - 8, d);
        // Architectural crown / mechanical penthouse
        addBox(batchedConcreteTrim, x, totalH + 1.5, z, w * 0.75, 3.0, d * 0.75);
        // Rooftop communications antenna
        addBox(batchedMetal, x, totalH + 6.0, z, 0.8, 8.0, 0.8);

        const minX = x - (w + 1.0) / 2;
        const maxX = x + (w + 1.0) / 2;
        const minZ = z - (d + 1.0) / 2;
        const maxZ = z + (d + 1.0) / 2;
        registerBoxCollider(minX, maxX, minZ, maxZ, 'ExpandedCorporate', -5, totalH + 8.0);
        cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'corporate' });
    }

    // Helper: Build a batched University / Academia Hall
    function buildBatchedAcademia(x, z, w, d, storeys) {
        const storeyH = 3.8;
        const totalH = storeys * storeyH;
        // Sandstone / brick academic hall
        addBox(batchedWallsApartments, x, totalH / 2, z, w, totalH, d);
        // Grand colonnade cornice & parapet
        addBox(batchedConcreteTrim, x, totalH + 0.6, z, w + 0.6, 1.2, d + 0.6);
        // Grand portico columns at front
        [-w / 3, 0, w / 3].forEach(px => {
            addCylinder(batchedConcreteTrim, x + px, 3.6, z + d / 2 + 1.6, 0.6, 0.6, 7.2);
        });
        addBox(batchedConcreteTrim, x, 7.4, z + d / 2 + 1.6, w * 0.8, 0.6, 3.2);
        // Academic windows
        addBox(batchedGlass, x, totalH * 0.55, z + d / 2 + 0.08, w * 0.82, totalH * 0.5, 0.1);

        const minX = x - w / 2;
        const maxX = x + w / 2;
        const minZ = z - d / 2;
        const maxZ = z + d / 2 + 3.2;
        registerBoxCollider(minX, maxX, minZ, maxZ, 'ExpandedAcademia', -5, totalH + 2.0);
        cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'corporate' });
    }

    // ====================================================
    // SECTOR 1: GIRGAON & LALBAUG RESIDENTIAL (12 Buildings)
    // ====================================================
    // Chawls
    buildBatchedChawl(-240, 30, 18, 12, 3);
    buildBatchedChawl(-240, 60, 18, 12, 3);
    buildBatchedChawl(-240, 90, 18, 12, 3);
    buildBatchedChawl(-240, 160, 18, 12, 3);
    buildBatchedChawl(-240, 190, 18, 12, 3);
    buildBatchedChawl(-300, 60, 16, 12, 3);

    // Apartments
    buildBatchedApartment(-140, 30, 14, 12, 5, 'peach');
    buildBatchedApartment(-140, 60, 14, 12, 6, 'mint');
    buildBatchedApartment(-140, 90, 14, 12, 5, 'cream');
    buildBatchedApartment(-140, 160, 14, 12, 5, 'peach');
    buildBatchedApartment(-140, 190, 14, 12, 6, 'mint');
    buildBatchedApartment(-300, 160, 14, 12, 5, 'cream');

    // ====================================================
    // SECTOR 2: CRAWFORD COMMERCIAL & MARKETS (12 Buildings)
    // ====================================================
    // Retail Commercial Markets
    buildBatchedCommercial(140, 30, 16, 12, 4);
    buildBatchedCommercial(140, 60, 16, 12, 4);
    buildBatchedCommercial(140, 90, 16, 12, 4);
    buildBatchedCommercial(140, 160, 16, 12, 3);
    buildBatchedCommercial(140, 190, 16, 12, 4);
    buildBatchedCommercial(300, 60, 16, 12, 4);

    // Corporate Commercial Towers
    buildBatchedCorporate(240, 30, 16, 14, 8);
    buildBatchedCorporate(240, 60, 16, 14, 9);
    buildBatchedCorporate(240, 90, 16, 14, 10);
    buildBatchedCorporate(240, 160, 16, 14, 8);
    buildBatchedCorporate(240, 190, 16, 14, 9);
    buildBatchedCorporate(300, 160, 16, 14, 9);

    // ====================================================
    // SECTOR 3: MODERN DOWNTOWN & STARK PLAZA FLANKS (8 Buildings)
    // ====================================================
    buildBatchedCorporate(-50, 110, 16, 14, 13);
    buildBatchedCorporate(-50, 170, 16, 14, 13);
    buildBatchedCorporate(50, 110, 16, 14, 13);
    buildBatchedCorporate(50, 170, 16, 14, 13);
    buildBatchedCorporate(-75, 140, 18, 14, 15);
    buildBatchedCorporate(75, 140, 18, 14, 15);
    buildBatchedCorporate(-45, 210, 16, 14, 12);
    buildBatchedCorporate(45, 210, 16, 14, 12);

    // ====================================================
    // SECTOR 4: TECH ACADEMIA & CAMPUS WINGS (12 Buildings)
    // ====================================================
    buildBatchedAcademia(60, 290, 22, 16, 5);
    buildBatchedAcademia(60, 340, 22, 16, 5);
    buildBatchedAcademia(120, 290, 22, 16, 4);
    buildBatchedAcademia(120, 340, 22, 16, 4);
    buildBatchedAcademia(180, 315, 24, 18, 4);
    buildBatchedAcademia(-60, 290, 22, 16, 4);
    buildBatchedAcademia(-60, 340, 22, 16, 4);
    buildBatchedAcademia(-120, 290, 22, 16, 4);
    buildBatchedAcademia(-120, 340, 22, 16, 4);
    buildBatchedAcademia(-180, 315, 24, 16, 6);
    buildBatchedAcademia(-40, 420, 20, 14, 3);
    buildBatchedAcademia(40, 420, 20, 14, 4);

    // Merge and add batched meshes to scene
    const mergeAndAdd = (arr, mat, castShadow = false) => {
        if (arr.length === 0) return;
        const merged = BufferGeometryUtils.mergeGeometries(arr, false);
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        scene.add(mesh);
    };

    // Primary structural masses cast building shadows
    mergeAndAdd(batchedWallsPlaster, chawlPlasterMat, true);
    mergeAndAdd(batchedWallsApartments, aptMatPeach, true);
    mergeAndAdd(batchedWallsCorporate, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }), true);

    // Architectural trims, windows, metal, and roofs (no shadow pass needed)
    mergeAndAdd(batchedConcreteTrim, concreteTrimMat, false);
    mergeAndAdd(batchedGlass, new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.15 }), false);
    mergeAndAdd(batchedMetal, metalRailingMat, false);
    mergeAndAdd(batchedRoofs, corrugatedRoofMat, false);
}
buildExpandedDistrictsBatch();
window.__cityBuildings = cityBuildings;

// ==========================================
// AIRPORT DISTRICT (Far North Z = 380)
// Runway 27/09, ATC Radar Tower & 38m Jetliner
// Styled per Technical Orthographic Model Sheet
// ==========================================
let atcRadarDish = null;

function buildAirportDistrict() {
    const airport = new THREE.Group();

    // 1. Runway 27/09 (Asphalt Strip: 240m L x 28m W, X = -120 to +120, Z = 380)
    const runwayMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });

    const runwayMesh = new THREE.Mesh(new THREE.BoxGeometry(240, 0.1, 28), runwayMat);
    runwayMesh.position.set(0, 0.05, 380);
    runwayMesh.receiveShadow = true;
    airport.add(runwayMesh);

    // Runway Markings (Threshold Piano Keys & Centerline)
    const markGeoms = [];
    // West Threshold (09) Keys
    for (let k = -10; k <= 10; k += 2.2) {
        const bar = new THREE.PlaneGeometry(10, 1.2);
        bar.rotateX(-Math.PI / 2);
        bar.translate(-112, 0.12, 380 + k);
        markGeoms.push(bar);
    }
    // East Threshold (27) Keys
    for (let k = -10; k <= 10; k += 2.2) {
        const bar = new THREE.PlaneGeometry(10, 1.2);
        bar.rotateX(-Math.PI / 2);
        bar.translate(112, 0.12, 380 + k);
        markGeoms.push(bar);
    }
    // Dashed Centerline
    for (let cx = -95; cx <= 95; cx += 16) {
        const dash = new THREE.PlaneGeometry(8, 1.0);
        dash.rotateX(-Math.PI / 2);
        dash.translate(cx, 0.12, 380);
        markGeoms.push(dash);
    }
    const marksMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(markGeoms), lineMat);
    airport.add(marksMesh);

    // Green Threshold Lights
    const lightGeoms = [];
    [-118, 118].forEach(lx => {
        for (let lz = 368; lz <= 392; lz += 3) {
            const bulb = new THREE.SphereGeometry(0.2, 6, 6);
            bulb.translate(lx, 0.25, lz);
            lightGeoms.push(bulb);
        }
    });
    airport.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(lightGeoms), greenMat));

    // 2. ATC Radar Tower (X = -70, Z = 360, Height = 34m)
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
    const cabGlassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, transparent: true, opacity: 0.8 });
    const towerGeoms = [];

    // Cylindrical Shaft
    const shaft = new THREE.CylinderGeometry(3.5, 4.5, 28, 12);
    shaft.translate(-70, 14, 360);
    towerGeoms.push(shaft);

    // Upper Flared Platform
    const platform = new THREE.CylinderGeometry(6.2, 4.2, 3.0, 12);
    platform.translate(-70, 29.5, 360);
    towerGeoms.push(platform);

    // Cab Roof
    const roof = new THREE.ConeGeometry(6.5, 2.5, 12);
    roof.translate(-70, 34.5, 360);
    towerGeoms.push(roof);

    airport.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(towerGeoms), towerMat));

    // Observation Glass Cab
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 5.8, 3.2, 12, 1, true), cabGlassMat);
    cab.position.set(-70, 31.8, 360);
    airport.add(cab);

    // Rotating Radar Dish at Top (Y = 36.5m)
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-70, 36.5, 360);
    const dishMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.4, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
    dishMesh.rotation.x = Math.PI / 3;
    dishGroup.add(dishMesh);
    airport.add(dishGroup);
    atcRadarDish = dishGroup;

    // Obstruction Warning Light
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    beacon.position.set(-70, 36.0, 360);
    airport.add(beacon);

    // 3. 38m Commercial Twin-Engine Jetliner (Parked at X = 45, Z = 376)
    const jetGroup = new THREE.Group();
    jetGroup.position.set(45, 0, 376);
    jetGroup.rotation.y = -Math.PI / 6;

    const jetWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.2 });
    const jetEngineMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.7 });
    const jetTricolorMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4 });

    // Fuselage, Wings, Tail Fin, Engines & Gear merged into single batched mesh
    const jetGeoms = [];
    const fuselage = applyVertexColor(new THREE.CylinderGeometry(1.6, 1.6, 32, 14), 0xf8fafc);
    fuselage.rotateX(Math.PI / 2);
    fuselage.translate(0, 3.5, 0);
    jetGeoms.push(fuselage);

    // Aerodynamic Nose Cone
    const nose = applyVertexColor(new THREE.ConeGeometry(1.6, 6.0, 14), 0xf8fafc);
    nose.rotateX(Math.PI / 2);
    nose.translate(0, 3.5, 19.0);
    jetGeoms.push(nose);

    // Main Swept Wings (36m Span)
    const wingL = applyVertexColor(new THREE.BoxGeometry(16, 0.25, 4.2), 0xf8fafc);
    wingL.rotateY(-0.35);
    wingL.translate(-9.5, 3.2, -1.0);
    jetGeoms.push(wingL);

    const wingR = applyVertexColor(new THREE.BoxGeometry(16, 0.25, 4.2), 0xf8fafc);
    wingR.rotateY(0.35);
    wingR.translate(9.5, 3.2, -1.0);
    jetGeoms.push(wingR);

    // Horizontal Stabilizers at Tail
    const hStabL = applyVertexColor(new THREE.BoxGeometry(5.5, 0.18, 1.8), 0xf8fafc);
    hStabL.rotateY(-0.3);
    hStabL.translate(-3.2, 5.0, -15.0);
    jetGeoms.push(hStabL);

    const hStabR = applyVertexColor(new THREE.BoxGeometry(5.5, 0.18, 1.8), 0xf8fafc);
    hStabR.rotateY(0.3);
    hStabR.translate(3.2, 5.0, -15.0);
    jetGeoms.push(hStabR);

    // Vertical Stabilizer / Tail Fin (Tricolor Orange)
    const vFinGeom = applyVertexColor(new THREE.BoxGeometry(0.24, 5.5, 3.6), 0xea580c);
    vFinGeom.translate(0, 6.5, -14.5);
    jetGeoms.push(vFinGeom);

    // Twin Turbofan Jet Engines on underwing pylons
    [-6.5, 6.5].forEach(ex => {
        const nacelle = applyVertexColor(new THREE.CylinderGeometry(0.9, 0.9, 4.2, 12), 0x1e293b);
        nacelle.rotateX(Math.PI / 2);
        nacelle.translate(ex, 2.3, 0.5);
        jetGeoms.push(nacelle);

        const spinner = applyVertexColor(new THREE.ConeGeometry(0.4, 1.2, 10), 0x94a3b8);
        spinner.rotateX(Math.PI / 2);
        spinner.translate(ex, 2.3, 2.7);
        jetGeoms.push(spinner);
    });

    // Tricycle Landing Gear
    const nWheel = applyVertexColor(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 8), 0x020617);
    nWheel.rotateZ(Math.PI / 2);
    nWheel.translate(0, 0.45, 14.0);
    jetGeoms.push(nWheel);

    [-4.5, 4.5].forEach(gx => {
        const mW = applyVertexColor(new THREE.CylinderGeometry(0.65, 0.65, 0.45, 8), 0x020617);
        mW.rotateZ(Math.PI / 2);
        mW.translate(gx, 0.65, -1.0);
        jetGeoms.push(mW);
    });

    const jetMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(jetGeoms), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }));
    jetMesh.castShadow = false;
    jetGroup.add(jetMesh);
    airport.add(jetGroup);

    // 4. Passenger Terminal 2 & Jetway Aerobridge per Stitch CAD Sheet 3
    const terminalGroup = new THREE.Group();
    const termSolidGeoms = [];
    const termGlassGeoms = [];

    // Main Terminal Concourse Hall (72m W x 14m H x 26m D at X = 95, Z = 356)
    const termHall = applyVertexColor(new THREE.BoxGeometry(72, 14, 26), 0x94a3b8);
    termHall.translate(95, 7, 356);
    termSolidGeoms.push(termHall);

    // Structural Perimeter Columns
    for (let cx = 62; cx <= 128; cx += 11) {
        const col = applyVertexColor(new THREE.CylinderGeometry(0.7, 0.9, 15, 8), 0x64748b);
        col.translate(cx, 7.5, 342);
        termSolidGeoms.push(col);
    }

    // Aerodynamic Modern Roof with Cantilevered Overhang (78m W x 32m D)
    const roofBase = applyVertexColor(new THREE.BoxGeometry(78, 1.2, 32), 0xe2e8f0);
    roofBase.translate(95, 14.6, 356);
    termSolidGeoms.push(roofBase);
    const roofCap = applyVertexColor(new THREE.BoxGeometry(72, 1.2, 28), 0xf1f5f9);
    roofCap.translate(95, 15.8, 356);
    termSolidGeoms.push(roofCap);

    // Terminal Curtain Glass Facade (facing Runway/Apron - South)
    const glassFacade = new THREE.PlaneGeometry(68, 11);
    glassFacade.translate(95, 6.5, 369.1);
    termGlassGeoms.push(glassFacade);

    // Articulated Telescoping Jetway Aerobridge (connecting Terminal Concourse to Jetliner Fuselage at 45, 376)
    const jetwayTunnel = applyVertexColor(new THREE.BoxGeometry(16, 3.2, 3.4), 0x64748b);
    jetwayTunnel.rotateY(-0.62);
    jetwayTunnel.translate(52, 4.8, 371);
    termSolidGeoms.push(jetwayTunnel);

    // Jetway Support Gantry Stilt Legs
    [-1.2, 1.2].forEach(ox => {
        const stilt = applyVertexColor(new THREE.CylinderGeometry(0.25, 0.3, 4.6, 6), 0x475569);
        stilt.translate(52 + ox, 2.3, 371);
        termSolidGeoms.push(stilt);
    });

    // Illuminated Terminal Signboard
    const signBoard = applyVertexColor(new THREE.BoxGeometry(32, 2.2, 0.4), 0xf97316);
    signBoard.translate(95, 14.5, 369.2);
    termSolidGeoms.push(signBoard);

    terminalGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(termSolidGeoms, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 })));
    terminalGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(termGlassGeoms, false), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.85, transparent: true, opacity: 0.85 })));

    airport.add(terminalGroup);

    airport.add(terminalGroup);

    registerBoxCollider(-76, -64, 354, 366, 'ATCRadarTower');
    registerBoxCollider(28, 62, 360, 392, 'JetlinerApron');
    registerBoxCollider(59, 131, 343, 369, 'AirportTerminalBuilding', -5, 18, 16.0);
    registerBoxCollider(43, 61, 364, 378, 'AirportJetway', -5, 8.5, 5.8);

    scene.add(airport);
}
buildAirportDistrict();

// ==========================================
// DISTRICT 1: HOME HQ (STARK SKYSCRAPER)
// (X = 0, Z = 140, Height = 180m)
// Home = Stark Tower (Devarshi's Superhero Skyscraper & Residence)
// ==========================================
let poiHome = { x: 0, z: 140, radius: 18 };
function buildHomeDistrict() {
    // Official Home HQ is unified inside the 180m Skyscraper at (0, 140).
    // Legacy small bungalow decommissioned to preserve performance and architecture.
}
buildHomeDistrict();

function createWallPoster(parent, text, bg, textCol, x, y, z) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 180;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 128, 180);
    ctx.fillStyle = textCol; ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 64, 90);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 120, 172);

    const poster = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.4), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c) }));
    poster.position.set(x, y, z);
    parent.add(poster);
}

// ==========================================
// DISTRICT 2: SCHOOL
// (East Academic Sector: X = 64, Z = 80)
// Strictly Non-Interactive Architectural Landmark
// Styled per Stitch Design Blueprint ARCH-3D-012
// ==========================================
let poiSchool = { x: 64, z: 80, radius: 14 };
window.__poiSchool = poiSchool;
function buildSchoolDistrict() {
    registerBoxCollider(poiSchool.x - 18, poiSchool.x + 18, poiSchool.z - 9, poiSchool.z + 8, 'SchoolBuilding', -5, 24);
    registerBoxCollider(poiSchool.x - 19, poiSchool.x - 13, poiSchool.z - 6, poiSchool.z + 4, 'SchoolBus', -5, 4.0);
    const school = new THREE.Group();

    // 1. Warm Sandstone / Ochre Academic Facade
    const facadeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75, metalness: 0.1 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.65 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 });

    // Main Academic Hall (36m W x 18m H x 14m D)
    const facadeGeoms = [];
    const mainHall = new THREE.BoxGeometry(36, 18, 14);
    mainHall.translate(0, 9, 0);
    facadeGeoms.push(mainHall);

    // Central Symmetrical Entrance Portal & Colonnade Portico (facing South -Z)
    const portico = new THREE.BoxGeometry(12, 12, 3);
    portico.translate(0, 6, -7.5);
    facadeGeoms.push(portico);

    // Rooftop Parapet and HVAC / Machine Room
    const parapet = new THREE.BoxGeometry(36.6, 0.8, 14.6);
    parapet.translate(0, 18.4, 0);
    facadeGeoms.push(parapet);

    const machineRoom = new THREE.BoxGeometry(10, 3.5, 8);
    machineRoom.translate(0, 20.2, 0);
    facadeGeoms.push(machineRoom);

    const mergedFacade = BufferGeometryUtils.mergeGeometries(facadeGeoms);
    const fMesh = new THREE.Mesh(mergedFacade, facadeMat);
    fMesh.castShadow = false;
    fMesh.receiveShadow = true;
    school.add(fMesh);

    // 2. Concrete Trim, Steps & Columns (facing South -Z)
    const trimGeoms = [];
    // Front Entrance Steps descending South
    for (let step = 0; step < 3; step++) {
        const stepGeom = new THREE.BoxGeometry(10 - step * 1.2, 0.35, 1.2);
        stepGeom.translate(0, step * 0.35 + 0.175, -8.6 - step * 0.8);
        trimGeoms.push(stepGeom);
    }
    // Ribbon Cornice bands across storeys
    [5.8, 11.8, 17.8].forEach(by => {
        const band = new THREE.BoxGeometry(36.4, 0.4, 14.4);
        band.translate(0, by, 0);
        trimGeoms.push(band);
    });
    const mergedTrim = BufferGeometryUtils.mergeGeometries(trimGeoms);
    const tMesh = new THREE.Mesh(mergedTrim, trimMat);
    tMesh.receiveShadow = true;
    school.add(tMesh);

    // 3. Ribbon Window Glass Strips (facing South -Z)
    const glassGeoms = [];
    [3.2, 9.2, 15.2].forEach(wy => {
        // Left Wing Windows
        const winL = new THREE.PlaneGeometry(10, 1.8);
        winL.rotateY(Math.PI);
        winL.translate(-10, wy, -7.05);
        glassGeoms.push(winL);
        // Right Wing Windows
        const winR = new THREE.PlaneGeometry(10, 1.8);
        winR.rotateY(Math.PI);
        winR.translate(10, wy, -7.05);
        glassGeoms.push(winR);
    });
    const mergedGlass = BufferGeometryUtils.mergeGeometries(glassGeoms);
    school.add(new THREE.Mesh(mergedGlass, glassMat));

    // 4. Non-Interactive Clean Signage: "SCHOOL" (facing South -Z)
    const sBoardCanvas = document.createElement('canvas');
    sBoardCanvas.width = 512; sBoardCanvas.height = 128;
    const sbCtx = sBoardCanvas.getContext('2d');
    sbCtx.fillStyle = '#0f172a'; sbCtx.fillRect(0, 0, 512, 128);
    sbCtx.fillStyle = '#38bdf8'; sbCtx.font = 'bold 36px sans-serif';
    sbCtx.textAlign = 'center';
    sbCtx.fillText("SCHOOL", 256, 76);
    const sBoard = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sBoardCanvas) }));
    sBoard.position.set(0, 10.5, -9.05);
    sBoard.rotation.y = Math.PI;
    school.add(sBoard);

    // 5. School Playground Football Goal
    const goalMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const goalGeoms = [];
    const crossbar = new THREE.BoxGeometry(8, 0.2, 0.2);
    crossbar.translate(16, 2.5, -2);
    goalGeoms.push(crossbar);
    [-4, 4].forEach(gx => {
        const post = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8);
        post.translate(16 + gx, 1.25, -2);
        goalGeoms.push(post);
    });
    school.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(goalGeoms), goalMat));

    // 6. Yellow School Bus parked outside
    const busBody = applyVertexColor(new THREE.BoxGeometry(4.2, 2.8, 9), 0xf59e0b);
    busBody.translate(-16, 1.8, -2);
    const busRoof = applyVertexColor(new THREE.BoxGeometry(4.2, 0.4, 9), 0xffffff);
    busRoof.translate(-16, 3.3, -2);
    const busMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([busBody, busRoof], false), new THREE.MeshStandardMaterial({ roughness: 0.6, vertexColors: true }));
    school.add(busMesh);

    school.position.set(poiSchool.x, 0, poiSchool.z);
    scene.add(school);
}
buildSchoolDistrict();

// ==========================================
// DISTRICT 3: DMCE COLLEGE CAMPUS
// (X = 48, Z = 62)
// ==========================================
let poiCollege = { x: 48, z: 62, radius: 12 };
function buildCollegeDistrict() {
    registerBoxCollider(poiCollege.x - 17, poiCollege.x + 17, poiCollege.z - 12, poiCollege.z - 1, 'CollegeBuilding', -5, 18);
    const college = new THREE.Group();

    // Grand College Building Facade
    const building = new THREE.Mesh(new THREE.BoxGeometry(32, 16, 10), new THREE.MeshStandardMaterial({ map: modernFacadeTex, roughness: 0.7 }));
    building.position.set(0, 8, -6);
    building.receiveShadow = true;
    college.add(building);

    // Archway entrance
    const arch = new THREE.Mesh(new THREE.BoxGeometry(9, 10, 10.2), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
    arch.position.set(0, 5, -6);
    college.add(arch);

    // Grand Board
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512; signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a'; sCtx.fillRect(0, 0, 512, 128);
    sCtx.fillStyle = '#f8fafc'; sCtx.font = 'bold 22px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText("DATTA MEGHE COLLEGE OF ENGINEERING", 256, 48);
    sCtx.fillStyle = '#38bdf8'; sCtx.font = 'bold 18px monospace';
    sCtx.fillText("B.E. Computer Engineering (2019-2023)", 256, 85);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) }));
    board.position.set(0, 13, -0.8);
    college.add(board);

    // Cherry Blossom Trees
    const cbTrunkGeoms = [];
    const cbLeavesGeoms = [];
    [-18, 18].forEach(tx => {
        const trunk = new THREE.CylinderGeometry(0.5, 0.7, 5, 8);
        trunk.translate(tx, 2.5, 0);
        cbTrunkGeoms.push(trunk);

        const leaves = new THREE.SphereGeometry(3.6, 12, 12);
        leaves.translate(tx, 6.5, 0);
        cbLeavesGeoms.push(leaves);
    });
    college.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(cbTrunkGeoms), new THREE.MeshStandardMaterial({ color: 0x5c4033 })));
    college.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(cbLeavesGeoms), new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.8 })));

    // Graduation Cap Monument (Moved to front ceremonial courtyard centerpiece at Z = -11 / world Z = 51)
    const capMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const capBoard = new THREE.BoxGeometry(2.8, 0.18, 2.8);
    capBoard.rotateY(Math.PI / 4);
    capBoard.translate(0, 2.8, -11);
    const capSkull = new THREE.CylinderGeometry(0.9, 0.9, 0.9, 16);
    capSkull.translate(0, 2.3, -11);
    const capPedestal = new THREE.CylinderGeometry(1.6, 1.8, 1.4, 16);
    capPedestal.translate(0, 0.7, -11);
    college.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries([capBoard, capSkull, capPedestal]), capMat));
    registerCylinderCollider(poiCollege.x, poiCollege.z - 11, 1.8, 'GradCapMonument');

    college.position.set(poiCollege.x, 0, poiCollege.z);
    scene.add(college);
}
buildCollegeDistrict();

// ==========================================
// ART DECO CINEMA ("ART REGAL") & MARINE DRIVE BLOCK
// (Stitch Architectural Reference Sheet 2)
// West Commercial Boulevard: X = -100, Z = 60, Neon Spire Y = 28m
// ==========================================
function buildArtDecoCinemaDistrict() {
    const artDecoGroup = new THREE.Group();
    const solidGeoms = [];
    const neonGeoms = [];

    // --- 1. REGAL CINEMA BUILDING (X = -90, Z = 60) ---
    // Stepped Ziggurat Tier 1 (Base: 22m W x 12m H x 22m D)
    const tier1 = applyVertexColor(new THREE.BoxGeometry(22, 12, 22), 0xfef08a);
    tier1.translate(-90, 6, 60);
    solidGeoms.push(tier1);

    // Stepped Ziggurat Tier 2 (18m W x 3.5m H x 19m D)
    const tier2 = applyVertexColor(new THREE.BoxGeometry(18, 3.5, 19), 0xfef08a);
    tier2.translate(-90, 13.75, 60);
    solidGeoms.push(tier2);

    // Stepped Ziggurat Tier 3 (14m W x 2.2m H x 16m D)
    const tier3 = applyVertexColor(new THREE.BoxGeometry(14, 2.2, 16), 0xfef08a);
    tier3.translate(-90, 16.6, 60);
    solidGeoms.push(tier3);

    // Central Vertical Neon Fin Spire (Y = 14 to 28m)
    const spireCore = applyVertexColor(new THREE.BoxGeometry(1.2, 14, 3.6), 0x991b1b);
    spireCore.translate(-90, 21, 52);
    solidGeoms.push(spireCore);

    // Cyan Neon Glowing Fin Lines
    [-0.65, 0.65].forEach(nx => {
        const neonStrip = new THREE.BoxGeometry(0.1, 13.8, 0.2);
        neonStrip.translate(-90 + nx, 21, 53.8);
        neonGeoms.push(neonStrip);
    });

    // Curved Cantilevered Marquee Canopy over Entrance (facing South -Z)
    const canopy = applyVertexColor(new THREE.CylinderGeometry(5.5, 5.5, 0.8, 16, 1, false, 0, Math.PI), 0x991b1b);
    canopy.rotateX(Math.PI / 2);
    canopy.translate(-90, 4.2, 48.5);
    solidGeoms.push(canopy);

    // Entrance Marquee Signboard ("REGAL CINEMA • रीगल सिनेमा")
    const marqueeSign = applyVertexColor(new THREE.BoxGeometry(14, 1.6, 0.4), 0xd97706);
    marqueeSign.translate(-90, 5.2, 48.8);
    solidGeoms.push(marqueeSign);

    // --- 2. ADJOINING 6-STOREY STREAMLINE MODERNE RESIDENTIAL BLOCK (X = -115, Z = 60) ---
    // Main Body (18m W x 21m H x 22m D)
    const aptBody = applyVertexColor(new THREE.BoxGeometry(18, 21, 22), 0xfde047);
    aptBody.translate(-115, 10.5, 60);
    solidGeoms.push(aptBody);

    // Streamline Rounded Corner Balconies across 6 Storeys
    for (let s = 1; s <= 5; s++) {
        const by = s * 3.5;
        // Curved balcony slab
        const bSlab = applyVertexColor(new THREE.CylinderGeometry(2.8, 2.8, 0.35, 12, 1, false, 0, Math.PI * 0.5), 0x991b1b);
        bSlab.rotateX(-Math.PI / 2);
        bSlab.translate(-106, by, 49);
        solidGeoms.push(bSlab);

        // Nautical speed-line horizontal trim bands
        const speedLine = applyVertexColor(new THREE.BoxGeometry(18.4, 0.25, 22.4), 0x991b1b);
        speedLine.translate(-115, by + 1.2, 60);
        solidGeoms.push(speedLine);

        // Circular Porthole Accent Windows
        const porthole = applyVertexColor(new THREE.TorusGeometry(0.55, 0.08, 6, 12), 0x991b1b);
        porthole.translate(-115, by + 1.8, 48.9);
        solidGeoms.push(porthole);
    }

    // Parapet trim on apartment roof (Y = 21.5m)
    const aptParapet = applyVertexColor(new THREE.BoxGeometry(18.6, 0.8, 22.6), 0x991b1b);
    aptParapet.translate(-115, 21.4, 60);
    solidGeoms.push(aptParapet);

    // Assemble unified batched meshes
    const solidMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(solidGeoms, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
    solidMesh.castShadow = false;
    solidMesh.receiveShadow = true;
    artDecoGroup.add(solidMesh);

    if (neonGeoms.length > 0) {
        artDecoGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(neonGeoms), new THREE.MeshBasicMaterial({ color: 0x06b6d4 })));
    }

    scene.add(artDecoGroup);

    // Register Box Colliders for Walking & Rooftop Superhero Landing
    registerBoxCollider(-101, -79, 49, 71, 'ArtDecoRegalCinema', -5, 20.0, 17.6);
    registerBoxCollider(-125, -105, 49, 71, 'ArtDecoMarineBlock', -5, 24.0, 21.8);
}
buildArtDecoCinemaDistrict();

// ==========================================
// HISTORIC MUMBAI ASIATIC LIBRARY & TOWN HALL
// (Stitch Architectural Reference Sheet 4)
// Central Civic Plaza: X = 100, Z = 110, Roof Y = 15m
// ==========================================
function buildAsiaticLibraryDistrict() {
    const asiaticGroup = new THREE.Group();
    const stoneGeoms = [];

    // 1. Monumental Flight of 30 Classical Steps (34m W x 3.6m H x 12m D)
    for (let step = 0; step < 8; step++) {
        const stepGeom = applyVertexColor(new THREE.BoxGeometry(34 - step * 0.6, 0.45, 1.5), 0xf1f5f9);
        stepGeom.translate(100, step * 0.45 + 0.225, 96 + step * 1.3);
        stoneGeoms.push(stepGeom);
    }

    // Elevated Portico Terrace Deck (Platform at Y = 3.6m)
    const porticoDeck = applyVertexColor(new THREE.BoxGeometry(34, 0.6, 6), 0xe2e8f0);
    porticoDeck.translate(100, 3.6, 107);
    stoneGeoms.push(porticoDeck);

    // 2. Colonnade of 8 Classical Doric/Ionic Columns
    for (let col = -14; col <= 14; col += 4.0) {
        // Fluted column shaft (9.5m tall)
        const shaft = applyVertexColor(new THREE.CylinderGeometry(0.55, 0.65, 9.5, 12), 0xf8fafc);
        shaft.translate(100 + col, 8.65, 107);
        stoneGeoms.push(shaft);

        // Column capital & base
        const cap = applyVertexColor(new THREE.BoxGeometry(1.6, 0.5, 1.6), 0xe2e8f0);
        cap.translate(100 + col, 13.65, 107);
        stoneGeoms.push(cap);
        const base = applyVertexColor(new THREE.BoxGeometry(1.8, 0.4, 1.8), 0xe2e8f0);
        base.translate(100 + col, 4.1, 107);
        stoneGeoms.push(base);
    }

    // 3. Imposing Classical Triangular Pediment with Frieze
    const entablature = applyVertexColor(new THREE.BoxGeometry(34.8, 1.2, 5.5), 0xe2e8f0);
    entablature.translate(100, 14.5, 107);
    stoneGeoms.push(entablature);

    // Triangular Pediment Gabled Tympanum
    const pediment = applyVertexColor(new THREE.ConeGeometry(17.4, 4.2, 4), 0xf1f5f9);
    pediment.rotateY(Math.PI / 4);
    pediment.scale(1.0, 1.0, 0.25);
    pediment.translate(100, 17.2, 107);
    stoneGeoms.push(pediment);

    // 4. Main Neo-Classical Library Halls & Reading Room (38m W x 14.5m H x 22m D)
    const mainHall = applyVertexColor(new THREE.BoxGeometry(38, 11, 22), 0xf1f5f9);
    mainHall.translate(100, 9.1, 120);
    stoneGeoms.push(mainHall);

    // Rooftop Classical Balustrade Parapet (Y = 14.6m)
    const roofParapet = applyVertexColor(new THREE.BoxGeometry(38.6, 0.9, 22.6), 0xe2e8f0);
    roofParapet.translate(100, 15.05, 120);
    stoneGeoms.push(roofParapet);

    // Symmetrical Arched Windows along Hall
    [-12, 12].forEach(wx => {
        const win = applyVertexColor(new THREE.BoxGeometry(4.2, 6.5, 0.3), 0x1e293b);
        win.translate(100 + wx, 9.5, 108.9);
        stoneGeoms.push(win);
    });

    // Bronze Commemorative Plaque ("THE ASIATIC SOCIETY OF MUMBAI • टाऊन हॉल")
    const plaque = applyVertexColor(new THREE.BoxGeometry(4.8, 1.2, 0.2), 0x78350f);
    plaque.translate(100, 5.2, 109.1);
    stoneGeoms.push(plaque);

    const asiaticMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stoneGeoms, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 }));
    asiaticMesh.castShadow = false;
    asiaticMesh.receiveShadow = true;
    asiaticGroup.add(asiaticMesh);

    scene.add(asiaticGroup);

    // Register Box Colliders for Walking & Rooftop Superhero Landing
    registerBoxCollider(83, 117, 95, 107, 'AsiaticLibrarySteps', -2, 5.0, 3.6);
    registerBoxCollider(81, 119, 107, 131, 'AsiaticLibraryHall', -5, 18.0, 14.6);
}
buildAsiaticLibraryDistrict();

// ==========================================
// PHASE 6: LANDMARK INTEGRATION & MUNICIPAL SIGNAGE
// Plazas, Campus Forecourts, Boundary Gates,
// Heritage Bollards & 4-Way BMC Wayfinding Signs
// (Batched into <= 5 Unified Draw Calls)
// ==========================================
function buildLandmarkIntegrationPlazasAndSignage() {
    const batchedPlazaPaving = [];
    const batchedPlazaStone = [];
    const batchedPlazaMetal = [];
    const batchedPlazaFoliage = [];
    const batchedWayfindingBlades = [];

    // ----------------------------------------------------
    // 1. GATEWAY CEREMONIAL PLAZA & WATERFRONT INTEGRATION
    // (Z = 6 to 14, X = -16 to +16)
    // ----------------------------------------------------
    // Paved stone transition slab connecting Promenade (Z=10) with Marine Ave crosswalk (Z=16)
    const gwPlazaSlab = new THREE.BoxGeometry(32, 0.22, 8);
    gwPlazaSlab.translate(0, -0.09, 10);
    batchedPlazaPaving.push(gwPlazaSlab);

    // Stone Planter Boxes flanking the pedestrian promenade entrance
    [-8.0, 8.0].forEach(px => {
        const planter = new THREE.BoxGeometry(2.4, 0.9, 2.4);
        planter.translate(px, 0.45, 8.5);
        batchedPlazaStone.push(planter);

        const shrub = new THREE.SphereGeometry(1.4, 8, 8);
        shrub.translate(px, 1.45, 8.5);
        batchedPlazaFoliage.push(shrub);

        registerBoxCollider(px - 1.3, px + 1.3, 7.2, 9.8, 'GatewayPlanter');
    });

    // MCGM Heritage Cast-Iron Bollards along the Marine Ave pedestrian curb (Z = 10.2)
    // Flanking the walkway, leaving central 13m opening (X in [-6.5, 6.5]) wide open
    [-14, -10, -6.5, 6.5, 10, 14].forEach(bx => {
        const bollardPost = new THREE.CylinderGeometry(0.14, 0.18, 0.95, 8);
        bollardPost.translate(bx, 0.475, 10.2);
        batchedPlazaMetal.push(bollardPost);

        const bollardCap = new THREE.SphereGeometry(0.19, 8, 8);
        bollardCap.translate(bx, 0.98, 10.2);
        batchedPlazaMetal.push(bollardCap);

        registerCylinderCollider(bx, 10.2, 0.25, 'HeritageBollard');
    });

    // ----------------------------------------------------
    // 2. HOME HQ PAVED WALKWAY & GARDEN FORECOURT
    // (X = -48, connecting West Blvd sidewalk to Porch entrance)
    // ----------------------------------------------------
    // Paved flagstone walkway slab (X in [-51, -45], Z in [45, 52])
    const homeWalkway = new THREE.BoxGeometry(6.4, 0.22, 7.5);
    homeWalkway.translate(-48, -0.09, 48.25);
    batchedPlazaPaving.push(homeWalkway);

    // Modern stone garden borders with hedges
    [-51.4, -44.6].forEach(gx => {
        const border = new THREE.BoxGeometry(0.5, 0.4, 6.5);
        border.translate(gx, 0.2, 48.5);
        batchedPlazaStone.push(border);

        const hedge = new THREE.BoxGeometry(0.6, 0.7, 6.5);
        hedge.translate(gx, 0.65, 48.5);
        batchedPlazaFoliage.push(hedge);

        const gatePost = new THREE.BoxGeometry(0.8, 1.4, 0.8);
        gatePost.translate(gx, 0.7, 45.2);
        batchedPlazaStone.push(gatePost);
    });

    // ----------------------------------------------------
    // 3. SCHOOL CAMPUS ENTRANCE & GATES
    // (Relocated to East Academic Sector: X = poiSchool.x, Z = poiSchool.z)
    // ----------------------------------------------------
    // Paved courtyard forecourt slab at new School site
    const schoolPlazaSlab = new THREE.BoxGeometry(40, 0.22, 12);
    schoolPlazaSlab.translate(poiSchool.x, -0.09, poiSchool.z - 4);
    batchedPlazaPaving.push(schoolPlazaSlab);

    // Twin Brick Grand Gate Pillars flanking School campus entrance
    [-10, 10].forEach(gx => {
        const pillar = new THREE.BoxGeometry(1.6, 7.8, 1.6);
        pillar.translate(poiSchool.x + gx, 3.9, poiSchool.z - 8);
        batchedPlazaStone.push(pillar);

        const cap = new THREE.BoxGeometry(2.0, 0.6, 2.0);
        cap.translate(poiSchool.x + gx, 8.0, poiSchool.z - 8);
        batchedPlazaStone.push(cap);

        const sphere = new THREE.SphereGeometry(0.6, 8, 8);
        sphere.translate(poiSchool.x + gx, 8.7, poiSchool.z - 8);
        batchedPlazaStone.push(sphere);
    });

    // Wrought Iron Grand Campus Arch spanning across the School entrance
    const gateBeam = new THREE.BoxGeometry(20.4, 0.4, 0.4);
    gateBeam.translate(poiSchool.x, 7.5, poiSchool.z - 8);
    batchedPlazaMetal.push(gateBeam);

    const gateArchCrest = new THREE.TorusGeometry(8.0, 0.15, 6, 16, Math.PI);
    gateArchCrest.translate(poiSchool.x, 7.5, poiSchool.z - 8);
    batchedPlazaMetal.push(gateArchCrest);

    // School Boundary Walls & Wrought Iron Railings
    [-16, 16].forEach(bx => {
        const wallBase = new THREE.BoxGeometry(10.0, 1.4, 0.5);
        wallBase.translate(poiSchool.x + bx, 0.7, poiSchool.z - 8);
        batchedPlazaStone.push(wallBase);

        const wallRail = new THREE.BoxGeometry(10.0, 1.2, 0.1);
        wallRail.translate(poiSchool.x + bx, 1.9, poiSchool.z - 8);
        batchedPlazaMetal.push(wallRail);
    });
    registerBoxCollider(poiSchool.x - 22, poiSchool.x - 11, poiSchool.z - 8.5, poiSchool.z - 7.5, 'SchoolBoundaryL');
    registerBoxCollider(poiSchool.x + 11, poiSchool.x + 22, poiSchool.z - 8.5, poiSchool.z - 7.5, 'SchoolBoundaryR');

    // School Bus Parking Stall painted outline
    const busStallMark = new THREE.BoxGeometry(4.8, 0.05, 10.5);
    busStallMark.translate(poiSchool.x - 16, 0.02, poiSchool.z - 2);
    batchedPlazaPaving.push(busStallMark);

    // ----------------------------------------------------
    // 4. DMCE COLLEGE CAMPUS DROP-OFF & TURNAROUND PLAZA
    // (X = 48, Z = 46 to 56)
    // ----------------------------------------------------
    // Drop-off forecourt plaza slab connecting East Blvd to college entrance
    const collegePlazaSlab = new THREE.BoxGeometry(26, 0.22, 10);
    collegePlazaSlab.translate(48, -0.09, 51);
    batchedPlazaPaving.push(collegePlazaSlab);

    // Modern Campus Boundary Entrance Pillars
    [40.5, 55.5].forEach(px => {
        const cPillar = new THREE.BoxGeometry(1.4, 5.5, 1.4);
        cPillar.translate(px, 2.75, 47.5);
        batchedPlazaStone.push(cPillar);

        const cCap = new THREE.BoxGeometry(1.8, 0.4, 1.8);
        cCap.translate(px, 5.6, 47.5);
        batchedPlazaStone.push(cCap);
    });

    // Low perimeter planter curbs
    [36.5, 59.5].forEach(cx => {
        const cBorder = new THREE.BoxGeometry(1.2, 0.4, 8);
        cBorder.translate(cx, 0.2, 51);
        batchedPlazaStone.push(cBorder);

        const cHedge = new THREE.BoxGeometry(0.9, 0.8, 7.6);
        cHedge.translate(cx, 0.7, 51);
        batchedPlazaFoliage.push(cHedge);
    });

    // ----------------------------------------------------
    // 5. BMC / MCGM 4-WAY DIRECTIONAL WAYFINDING SIGNPOSTS
    // ----------------------------------------------------
    // Create authentic MCGM green wayfinding texture atlas (512x512)
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512; signCanvas.height = 512;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 512, 512);

    const wayfindingLabels = [
        "↑ HOME HQ / STARK TOWER",
        "↓ GATEWAY OF INDIA / SEA",
        "← DEVARSHI'S CYBER HQ",
        "SCHOOL & DMCE COLLEGE →",
        "↑ NORTH AVENUE / CAMPUS",
        "↓ MARINE DRIVE PROMENADE",
        "← CHAWL RESIDENCES / MARKET",
        "CENTRAL TRAIN STATION →"
    ];

    for (let i = 0; i < 8; i++) {
        const y = i * 64;
        sCtx.fillStyle = '#15803d'; // Authentic MCGM Wayfinding Green
        sCtx.fillRect(8, y + 6, 496, 52);
        sCtx.strokeStyle = '#ffffff';
        sCtx.lineWidth = 2.5;
        sCtx.strokeRect(10, y + 8, 492, 48);

        sCtx.fillStyle = '#ffffff';
        sCtx.font = 'bold 20px sans-serif';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        sCtx.fillText(wayfindingLabels[i], 256, y + 33);
    }
    const wayfindingTex = new THREE.CanvasTexture(signCanvas);

    function createSignBladeGeom(textIdx, width = 2.3, height = 0.42) {
        const geom = new THREE.PlaneGeometry(width, height);
        const uvAttr = geom.attributes.uv;
        const vTop = 1.0 - (textIdx * 0.125);
        const vBottom = 1.0 - ((textIdx + 1) * 0.125);
        uvAttr.setXY(0, 0.02, vTop);
        uvAttr.setXY(1, 0.98, vTop);
        uvAttr.setXY(2, 0.02, vBottom);
        uvAttr.setXY(3, 0.98, vBottom);
        return geom;
    }

    // 4 Key Junction Wayfinding Locations
    const signpostLocations = [
        // Junction 1: Marine Ave & North Ave
        { x: 3.5, z: 13.5, arms: [
            { idx: 0, rotY: 0, dy: 3.8 },               // North: High School Campus
            { idx: 1, rotY: Math.PI, dy: 3.4 },         // South: Gateway of India
            { idx: 2, rotY: Math.PI / 2, dy: 3.0 },     // West: Devarshi's HQ
            { idx: 3, rotY: -Math.PI / 2, dy: 2.6 }     // East: DMCE College
        ]},
        // Junction 2: Market St & North Ave
        { x: 3.5, z: 39.5, arms: [
            { idx: 4, rotY: 0, dy: 3.8 },               // North: North Ave / Campus
            { idx: 5, rotY: Math.PI, dy: 3.4 },         // South: Marine Drive
            { idx: 6, rotY: Math.PI / 2, dy: 3.0 },     // West: Chawls / Market
            { idx: 7, rotY: -Math.PI / 2, dy: 2.6 }     // East: Central Train Station
        ]},
        // Junction 3: West Blvd & Market St
        { x: -44.5, z: 39.5, arms: [
            { idx: 2, rotY: 0, dy: 3.6 },               // North: Devarshi's Cyber HQ
            { idx: 5, rotY: Math.PI, dy: 3.2 },         // South: Marine Drive
            { idx: 7, rotY: -Math.PI / 2, dy: 2.8 }     // East: Central Train Station
        ]},
        // Junction 4: East Blvd & Market St
        { x: 44.5, z: 39.5, arms: [
            { idx: 3, rotY: 0, dy: 3.6 },               // North: DMCE College
            { idx: 5, rotY: Math.PI, dy: 3.2 },         // South: Marine Drive
            { idx: 6, rotY: Math.PI / 2, dy: 2.8 }      // West: Market Street
        ]}
    ];

    signpostLocations.forEach(sp => {
        // Cast-iron signpost pole
        const pole = new THREE.CylinderGeometry(0.09, 0.12, 4.2, 8);
        pole.translate(sp.x, 2.1, sp.z);
        batchedPlazaMetal.push(pole);

        const finial = new THREE.SphereGeometry(0.14, 8, 8);
        finial.translate(sp.x, 4.3, sp.z);
        batchedPlazaMetal.push(finial);

        registerCylinderCollider(sp.x, sp.z, 0.35, 'WayfindingSignpost');

        sp.arms.forEach(arm => {
            const bladeGeom = createSignBladeGeom(arm.idx);
            bladeGeom.rotateY(arm.rotY);
            bladeGeom.translate(sp.x, arm.dy, sp.z);
            batchedWayfindingBlades.push(bladeGeom);
        });
    });

    // ----------------------------------------------------
    // MERGE & ADD UNIFIED BATCHED MESHES (5 Draw Calls)
    // ----------------------------------------------------
    if (batchedPlazaPaving.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedPlazaPaving), walkMat);
        m.receiveShadow = true;
        scene.add(m);
    }

    if (batchedPlazaStone.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedPlazaStone), concreteTrimMat);
        m.castShadow = false; m.receiveShadow = true;
        scene.add(m);
    }

    if (batchedPlazaMetal.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedPlazaMetal), metalRailingMat);
        m.castShadow = false;
        scene.add(m);
    }

    if (batchedPlazaFoliage.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedPlazaFoliage), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 }));
        m.castShadow = false;
        scene.add(m);
    }

    if (batchedWayfindingBlades.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedWayfindingBlades), new THREE.MeshBasicMaterial({ map: wayfindingTex, side: THREE.DoubleSide }));
        scene.add(m);
    }
}
buildLandmarkIntegrationPlazasAndSignage();

// ==========================================
// PHASE C: DEVARSHI'S STARK-INSPIRED SUPERHERO TOWER
// 180m Skyscraper, Grand Atrium Lobby, Luxury Penthouse,
// Cybersecurity Command Lab, and Rooftop Flight Landing Pad
// ==========================================
function buildStarkTower() {
    const towerGroup = new THREE.Group();
    towerGroup.name = "StarkTower";

    const glassGeoms = [];
    const structGeoms = [];
    const glowGeoms = [];
    const floorGeoms = [];
    const interiorWallGeoms = [];
    const furnitureGeoms = [];

    // Helper: Add box to geometry array
    function addBox(arr, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
        const geom = new THREE.BoxGeometry(w, h, d);
        if (rx !== 0) geom.rotateX(rx);
        if (ry !== 0) geom.rotateY(ry);
        if (rz !== 0) geom.rotateZ(rz);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    // Helper: Add cylinder
    function addCyl(arr, x, y, z, rTop, rBot, h, seg = 16, rx = 0, ry = 0, rz = 0) {
        const geom = new THREE.CylinderGeometry(rTop, rBot, h, seg);
        if (rx !== 0) geom.rotateX(rx);
        if (ry !== 0) geom.rotateY(ry);
        if (rz !== 0) geom.rotateZ(rz);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    const tX = 0;
    const tZ = 140;

    // ----------------------------------------------------
    // 1. EXTERIOR HIGH-RISE ARCHITECTURE (180m TOTAL HEIGHT)
    // ----------------------------------------------------

    // A. Grand Base Podium Atrium (Y = 0 to 16m)
    // Curving glass facade around East, North, and West
    for (let a = Math.PI * 0.15; a <= Math.PI * 1.85; a += Math.PI * 0.12) {
        const px = tX + Math.sin(a) * 15.8;
        const pz = tZ + Math.cos(a) * 15.8;
        addBox(glassGeoms, px, 8, pz, 4.2, 16, 0.4, 0, a, 0);
    }

    // 8 Grand Titanium Structural Perimeter Columns (Ground to Y = 16m)
    for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const cx = tX + Math.sin(ang) * 16.2;
        const cz = tZ + Math.cos(ang) * 16.2;
        addCyl(structGeoms, cx, 8, cz, 0.65, 0.75, 16, 8);
    }

    // Grand Entrance Portal at South (X in [-4.5, 4.5], Z = 124.2)
    addBox(structGeoms, tX - 4.6, 6, tZ - 15.8, 0.6, 12, 1.2);
    addBox(structGeoms, tX + 4.6, 6, tZ - 15.8, 0.6, 12, 1.2);
    addBox(glowGeoms, tX, 11.8, tZ - 15.8, 9.6, 0.6, 1.3);

    // Cantilevered Grand Entrance Canopy (Y = 6.2m, extending to Z = 120)
    addBox(structGeoms, tX, 6.2, tZ - 18.5, 11, 0.4, 6);
    addBox(glassGeoms, tX, 6.5, tZ - 18.5, 10.2, 0.1, 5.4);
    [-3.5, 0, 3.5].forEach(lx => {
        addCyl(glowGeoms, tX + lx, 6.0, tZ - 18.5, 0.4, 0.4, 0.1, 8);
    });

    // B. Aerodynamic Tower Shaft (Y = 16 to 120m)
    const shaftTiers = [
        { yBot: 16,  yTop: 36,  rBot: 15.0, rTop: 14.2, zOff: 0.0 },
        { yBot: 36,  yTop: 56,  rBot: 14.2, rTop: 13.5, zOff: 0.6 }, // L2 Penthouse at Y=40
        { yBot: 56,  yTop: 76,  rBot: 13.5, rTop: 12.8, zOff: 1.2 },
        { yBot: 76,  yTop: 96,  rBot: 12.8, rTop: 12.0, zOff: 1.8 }, // L3 Cyber Lab at Y=80
        { yBot: 96,  yTop: 116, rBot: 12.0, rTop: 11.2, zOff: 2.4 },
        { yBot: 116, yTop: 122, rBot: 11.2, rTop: 10.8, zOff: 3.0 }  // Under Flight Deck
    ];

    shaftTiers.forEach(tier => {
        const h = tier.yTop - tier.yBot;
        const cy = tier.yBot + h / 2;
        const cz = tZ + tier.zOff;
        addCyl(glassGeoms, tX, cy, cz, tier.rTop, tier.rBot, h, 24);
        addCyl(structGeoms, tX, tier.yBot, cz, tier.rBot + 0.25, tier.rBot + 0.25, 0.8, 24);
        addCyl(structGeoms, tX, tier.yTop, cz, tier.rTop + 0.25, tier.rTop + 0.25, 0.8, 24);
    });

    // 4 Titanium Aerodynamic Vertical Spine Ribs (from Ground to Y = 168m)
    [-1, 1].forEach(sx => {
        const finGeom = new THREE.BoxGeometry(0.8, 168, 2.5);
        finGeom.translate(tX + sx * 13.2, 84, tZ + 2);
        structGeoms.push(finGeom);

        const neonStrip = new THREE.BoxGeometry(0.18, 168, 0.18);
        neonStrip.translate(tX + sx * 14.5, 84, tZ + 2);
        glowGeoms.push(neonStrip);
    });

    // C. Cantilevered Upper Flight Landing Pad & Armor Deck (Y = 120m)
    const deckY = 120.0;
    const deckLength = 36.0;
    const deckWidth = 30.0;
    const deckCenterZ = tZ - 14.0; // Z = 126

    addBox(structGeoms, tX, deckY - 0.6, deckCenterZ, deckWidth, 1.2, deckLength);
    addBox(floorGeoms, tX, deckY + 0.05, deckCenterZ, deckWidth - 0.8, 0.1, deckLength - 0.8);

    // Diagonal Space-Frame Support Trusses
    [-8, 0, 8].forEach(tx => {
        const truss = new THREE.BoxGeometry(0.8, 0.8, 26);
        truss.rotateX(-0.35);
        truss.translate(tX + tx, 115.5, deckCenterZ + 3);
        structGeoms.push(truss);
    });

    // Arc-Reactor Helipad Target on Deck (Center: X=0, Z=126, Y=120.15)
    const padOuter = new THREE.TorusGeometry(8.5, 0.25, 6, 32);
    padOuter.rotateX(Math.PI / 2);
    padOuter.translate(tX, deckY + 0.15, deckCenterZ);
    glowGeoms.push(padOuter);

    const padInner = new THREE.TorusGeometry(4.5, 0.2, 6, 32);
    padInner.rotateX(Math.PI / 2);
    padInner.translate(tX, deckY + 0.15, deckCenterZ);
    glowGeoms.push(padInner);

    addBox(glowGeoms, tX, deckY + 0.15, deckCenterZ, 6.0, 0.08, 0.6);
    addBox(glowGeoms, tX, deckY + 0.15, deckCenterZ, 0.6, 0.08, 6.0);

    for (let r = 0; r < 16; r++) {
        const rad = (r / 16) * Math.PI * 2;
        const rx = tX + Math.sin(rad) * 11.5;
        const rz = deckCenterZ + Math.cos(rad) * 11.5;
        addCyl(glowGeoms, rx, deckY + 0.2, rz, 0.25, 0.25, 0.15, 8);
    }

    // Flight Deck Balustrade
    addBox(glassGeoms, tX - deckWidth / 2 + 0.3, deckY + 0.7, deckCenterZ, 0.2, 1.4, deckLength);
    addBox(structGeoms, tX - deckWidth / 2 + 0.3, deckY + 1.4, deckCenterZ, 0.3, 0.1, deckLength);
    addBox(glassGeoms, tX + deckWidth / 2 - 0.3, deckY + 0.7, deckCenterZ, 0.2, 1.4, deckLength);
    addBox(structGeoms, tX + deckWidth / 2 - 0.3, deckY + 1.4, deckCenterZ, 0.3, 0.1, deckLength);
    addBox(glassGeoms, tX, deckY + 0.7, deckCenterZ - deckLength / 2 + 0.3, deckWidth, 1.4, 0.2);
    addBox(structGeoms, tX, deckY + 1.4, deckCenterZ - deckLength / 2 + 0.3, deckWidth, 0.1, 0.3);

    // D. Architectural Tower Crown & Communications Spire Needle (Y = 120 to 180m)
    const crownFin1 = new THREE.ConeGeometry(9.5, 48, 16);
    crownFin1.rotateX(0.12);
    crownFin1.translate(tX, 144, tZ + 4);
    glassGeoms.push(crownFin1);

    const crownSpandrel = new THREE.CylinderGeometry(4.5, 8.5, 28, 16);
    crownSpandrel.translate(tX, 154, tZ + 3);
    structGeoms.push(crownSpandrel);

    // Communications Spire Needle rising to precisely 180.0 metres!
    addCyl(structGeoms, tX, 174, tZ + 2.5, 0.08, 0.75, 12, 8);
    addCyl(glowGeoms, tX, 180.1, tZ + 2.5, 0.45, 0.45, 0.6, 8);

    // E. Giant Glowing Cyan Lettermark 'D' (Devarshi Davane)
    // Mounted high on South crown facade at Y = 145m, Z = 135.5m facing South
    addBox(glowGeoms, tX - 4.5, 145, tZ - 4.5, 1.8, 15.0, 0.9);
    addBox(glowGeoms, tX - 0.5, 151.6, tZ - 4.5, 6.2, 1.8, 0.9);
    addBox(glowGeoms, tX - 0.5, 138.4, tZ - 4.5, 6.2, 1.8, 0.9);
    addCyl(glowGeoms, tX + 2.6, 145, tZ - 4.5, 6.5, 6.5, 0.9, 16, Math.PI / 2);

    // ----------------------------------------------------
    // 2. COMPLETE WALKABLE INTERIORS & 4 LEVEL ARCHITECTURE
    // ----------------------------------------------------

    // Central High-Speed Turbo-Lift Shaft (North wall: X in [-4, 4], Z in [146, 151])
    addBox(interiorWallGeoms, tX, 61, tZ + 9, 8.5, 122, 5.0);
    [0, 40, 80, 120].forEach(alt => {
        addBox(furnitureGeoms, tX - 1.1, alt + 1.8, tZ + 6.6, 1.8, 3.6, 0.2);
        addBox(furnitureGeoms, tX + 1.1, alt + 1.8, tZ + 6.6, 1.8, 3.6, 0.2);
        addBox(glowGeoms, tX, alt + 3.7, tZ + 6.7, 4.2, 0.35, 0.1);
        addBox(glowGeoms, tX - 2.1, alt + 1.8, tZ + 6.7, 0.3, 3.6, 0.1);
        addBox(glowGeoms, tX + 2.1, alt + 1.8, tZ + 6.7, 0.3, 3.6, 0.1);
        addBox(glowGeoms, tX, alt + 4.1, tZ + 6.75, 1.8, 0.45, 0.08);
    });

    // LEVEL 1: GRAND ENTRANCE ATRIUM LOBBY (Y = 0m)
    addCyl(floorGeoms, tX, 0.06, tZ, 16.0, 16.0, 0.2, 32);
    addBox(furnitureGeoms, tX, 1.1, tZ - 6, 8.4, 1.2, 1.8);
    addBox(glowGeoms, tX, 2.1, tZ - 6, 6.2, 0.7, 0.08);

    [-3, -1, 1, 3].forEach(gx => {
        addBox(furnitureGeoms, tX + gx, 0.8, tZ - 2, 0.35, 1.2, 2.0);
        addBox(glowGeoms, tX + gx, 1.1, tZ - 2, 0.15, 0.6, 1.6);
    });

    [-8, 8].forEach(px => {
        addCyl(furnitureGeoms, tX + px, 0.6, tZ - 4, 2.2, 2.4, 0.9, 16);
        addCyl(furnitureGeoms, tX + px, 3.2, tZ - 4, 0.22, 0.35, 4.5, 8);
        addCyl(furnitureGeoms, tX + px, 5.5, tZ - 4, 2.5, 0.1, 1.4, 8);
        const uplight = new THREE.TorusGeometry(2.3, 0.1, 6, 16);
        uplight.rotateX(Math.PI / 2);
        uplight.translate(tX + px, 0.9, tZ - 4);
        glowGeoms.push(uplight);
    });

    // Level 1 Colliders (Entrance at South X in [-4.5, 4.5], Z = 124 is open)
    registerBoxCollider(tX - 16.5, tX - 4.5, tZ - 16.5, tZ - 15.0, 'StarkL1FrontWallL', -2, 14);
    registerBoxCollider(tX + 4.5, tX + 16.5, tZ - 16.5, tZ - 15.0, 'StarkL1FrontWallR', -2, 14);
    registerBoxCollider(tX - 16.5, tX - 14.8, tZ - 16.5, tZ + 16.5, 'StarkL1WestWall', -2, 14);
    registerBoxCollider(tX + 14.8, tX + 16.5, tZ - 16.5, tZ + 16.5, 'StarkL1EastWall', -2, 14);
    registerBoxCollider(tX - 16.5, tX + 16.5, tZ + 14.8, tZ + 16.5, 'StarkL1NorthWall', -2, 14);
    registerBoxCollider(tX - 4.5, tX + 4.5, tZ - 7.0, tZ - 5.0, 'StarkL1Desk', -2, 14);
    registerBoxCollider(tX - 4.2, tX + 4.2, tZ + 6.0, tZ + 9.5, 'StarkL1ElevatorShaft', -2, 14);

    // LEVEL 2: LUXURY RESIDENTIAL PENTHOUSE SUITE (Y = 40m)
    const l2Y = 40.0;
    addBox(floorGeoms, tX, l2Y + 0.05, tZ, 24, 0.2, 24);
    addBox(glassGeoms, tX - 12.0, l2Y + 3.0, tZ, 0.2, 6.0, 24);
    addBox(glassGeoms, tX + 12.0, l2Y + 3.0, tZ, 0.2, 6.0, 24);
    addBox(glassGeoms, tX, l2Y + 3.0, tZ - 12.0, 24, 6.0, 0.2);
    addBox(glassGeoms, tX, l2Y + 3.0, tZ + 12.0, 24, 6.0, 0.2);

    addBox(furnitureGeoms, tX + 6, l2Y + 0.5, tZ - 6, 5.4, 0.8, 2.2);
    addBox(furnitureGeoms, tX + 8, l2Y + 0.5, tZ - 3, 2.0, 0.8, 4.0);
    addBox(furnitureGeoms, tX + 5.5, l2Y + 0.35, tZ - 3.5, 2.8, 0.45, 1.8);
    addBox(glowGeoms, tX + 6, l2Y + 3.0, tZ - 11.7, 5.2, 2.8, 0.08);

    addBox(furnitureGeoms, tX - 6, l2Y + 0.9, tZ - 6, 5.8, 1.6, 2.4);
    [-7.5, -6.0, -4.5].forEach(sx => {
        addCyl(furnitureGeoms, tX + sx, l2Y + 0.7, tZ - 4.2, 0.4, 0.4, 1.1, 8);
    });

    addBox(furnitureGeoms, tX - 6, l2Y + 0.5, tZ + 4, 4.8, 0.9, 5.4);
    addBox(furnitureGeoms, tX - 6, l2Y + 1.4, tZ + 6.8, 5.2, 1.8, 0.5);
    addBox(glowGeoms, tX - 6, l2Y + 1.8, tZ + 6.5, 4.6, 0.25, 0.1);

    registerBoxCollider(tX - 12.5, tX - 11.5, tZ - 12.5, tZ + 12.5, 'StarkL2W', 38, 55);
    registerBoxCollider(tX + 11.5, tX + 12.5, tZ - 12.5, tZ + 12.5, 'StarkL2E', 38, 55);
    registerBoxCollider(tX - 12.5, tX + 12.5, tZ - 12.5, tZ - 11.5, 'StarkL2S', 38, 55);
    registerBoxCollider(tX - 12.5, tX + 12.5, tZ + 11.5, tZ + 12.5, 'StarkL2N', 38, 55);
    registerBoxCollider(tX + 3.0, tX + 9.5, tZ - 7.5, tZ - 1.0, 'StarkL2Sofa', 38, 55);
    registerBoxCollider(tX - 9.0, tX - 3.0, tZ - 7.5, tZ - 4.5, 'StarkL2Island', 38, 55);
    registerBoxCollider(tX - 8.5, tX - 3.5, tZ + 1.5, tZ + 7.0, 'StarkL2Bed', 38, 55);
    registerBoxCollider(tX - 4.2, tX + 4.2, tZ + 6.0, tZ + 9.5, 'StarkL2ElevatorShaft', 38, 55);

    // LEVEL 3: CYBERSECURITY LAB & COMMAND PENTHOUSE (Y = 80m)
    const l3Y = 80.0;
    addBox(floorGeoms, tX, l3Y + 0.05, tZ, 24, 0.2, 24);
    addBox(glassGeoms, tX - 12.0, l3Y + 3.0, tZ, 0.2, 6.0, 24);
    addBox(glassGeoms, tX + 12.0, l3Y + 3.0, tZ, 0.2, 6.0, 24);
    addBox(glassGeoms, tX, l3Y + 3.0, tZ - 12.0, 24, 6.0, 0.2);
    addBox(glassGeoms, tX, l3Y + 3.0, tZ + 12.0, 24, 6.0, 0.2);

    addBox(furnitureGeoms, tX, l3Y + 1.0, tZ - 4, 7.2, 1.0, 2.6);
    addBox(furnitureGeoms, tX, l3Y + 1.2, tZ - 2.2, 1.4, 2.0, 1.4);

    addBox(glowGeoms, tX - 2.4, l3Y + 2.2, tZ - 4.6, 2.4, 1.3, 0.08, 0, 0.25, 0);
    addBox(glowGeoms, tX, l3Y + 2.2, tZ - 4.9, 2.6, 1.3, 0.08);
    addBox(glowGeoms, tX + 2.4, l3Y + 2.2, tZ - 4.6, 2.4, 1.3, 0.08, 0, -0.25, 0);

    [-2, 2].forEach(sz => {
        addBox(furnitureGeoms, tX - 8.5, l3Y + 2.4, tZ + sz, 1.8, 4.4, 1.6);
        for (let led = 0; led < 6; led++) {
            addBox(glowGeoms, tX - 7.5, l3Y + 0.8 + led * 0.6, tZ + sz, 0.06, 0.12, 1.2);
        }
    });

    addCyl(glassGeoms, tX + 8.0, l3Y + 2.0, tZ - 2, 1.8, 1.8, 3.8, 16);
    addCyl(structGeoms, tX + 8.0, l3Y + 0.2, tZ - 2, 2.1, 2.2, 0.4, 16);
    addCyl(structGeoms, tX + 8.0, l3Y + 3.9, tZ - 2, 2.1, 2.1, 0.4, 16);
    const podRing = new THREE.TorusGeometry(1.4, 0.1, 6, 16);
    podRing.rotateX(Math.PI / 2);
    podRing.translate(tX + 8.0, l3Y + 0.45, tZ - 2);
    glowGeoms.push(podRing);

    addBox(glowGeoms, tX + 8.0, l3Y + 2.0, tZ - 2, 0.8, 1.1, 0.5);
    addBox(glowGeoms, tX + 8.0, l3Y + 2.9, tZ - 2, 0.45, 0.55, 0.45);

    registerBoxCollider(tX - 12.5, tX - 11.5, tZ - 12.5, tZ + 12.5, 'StarkL3W', 78, 95);
    registerBoxCollider(tX + 11.5, tX + 12.5, tZ - 12.5, tZ + 12.5, 'StarkL3E', 78, 95);
    registerBoxCollider(tX - 12.5, tX + 12.5, tZ - 12.5, tZ - 11.5, 'StarkL3S', 78, 95);
    registerBoxCollider(tX - 12.5, tX + 12.5, tZ + 11.5, tZ + 12.5, 'StarkL3N', 78, 95);
    registerBoxCollider(tX - 3.8, tX + 3.8, tZ - 5.5, tZ - 2.5, 'StarkL3Battlestation', 78, 95);
    registerBoxCollider(tX - 10.0, tX - 7.0, tZ - 3.5, tZ + 4.5, 'StarkL3Servers', 78, 95);
    registerBoxCollider(tX + 6.0, tX + 10.0, tZ - 4.0, tZ + 0.0, 'StarkL3ArmorPod', 78, 95);
    registerBoxCollider(tX - 4.2, tX + 4.2, tZ + 6.0, tZ + 9.5, 'StarkL3ElevatorShaft', 78, 95);

    // LEVEL 4: ROOFTOP FLIGHT LANDING PAD (Y = 120m)
    addBox(structGeoms, tX, deckY + 2.5, tZ + 6.5, 7.5, 5.0, 4.0);
    addBox(glassGeoms, tX, deckY + 2.0, tZ + 4.4, 4.2, 3.8, 0.2);

    registerBoxCollider(tX - deckWidth / 2 - 0.5, tX - deckWidth / 2 + 0.8, deckCenterZ - deckLength / 2, deckCenterZ + deckLength / 2, 'StarkL4BalustradeW', 118, 135);
    registerBoxCollider(tX + deckWidth / 2 - 0.8, tX + deckWidth / 2 + 0.5, deckCenterZ - deckLength / 2, deckCenterZ + deckLength / 2, 'StarkL4BalustradeE', 118, 135);
    registerBoxCollider(tX - deckWidth / 2, tX + deckWidth / 2, deckCenterZ - deckLength / 2 - 0.5, deckCenterZ - deckLength / 2 + 0.8, 'StarkL4BalustradeS', 118, 135);
    registerBoxCollider(tX - deckWidth / 2, tX + deckWidth / 2, deckCenterZ + deckLength / 2 - 0.8, deckCenterZ + deckLength / 2 + 0.5, 'StarkL4BalustradeN', 118, 135);
    registerBoxCollider(tX - 4.0, tX + 4.0, tZ + 4.5, tZ + 9.0, 'StarkL4Vestibule', 118, 135);

    // ----------------------------------------------------
    // 3. UNIFIED GEOMETRY MERGE & MESH CREATION (Only 6 Draw Calls!)
    // ----------------------------------------------------
    const starkGlassMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.65
    });

    const starkMetalMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        emissive: 0x0f172a,
        emissiveIntensity: 0.25,
        roughness: 0.35,
        metalness: 0.8
    });

    const starkGlowMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8
    });

    const starkFloorMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        emissive: 0x1e293b,
        emissiveIntensity: 0.35,
        roughness: 0.3
    });

    const starkInteriorMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        emissive: 0x334155,
        emissiveIntensity: 0.45,
        roughness: 0.35,
        metalness: 0.25
    });

    if (glassGeoms.length > 0) {
        const mergedGlass = BufferGeometryUtils.mergeGeometries(glassGeoms);
        const glassMesh = new THREE.Mesh(mergedGlass, starkGlassMat);
        glassMesh.castShadow = false;
        towerGroup.add(glassMesh);
    }

    if (structGeoms.length > 0) {
        const mergedStruct = BufferGeometryUtils.mergeGeometries(structGeoms);
        const structMesh = new THREE.Mesh(mergedStruct, starkMetalMat);
        structMesh.castShadow = false;
        structMesh.receiveShadow = true;
        towerGroup.add(structMesh);
    }

    if (glowGeoms.length > 0) {
        const mergedGlow = BufferGeometryUtils.mergeGeometries(glowGeoms);
        const glowMesh = new THREE.Mesh(mergedGlow, starkGlowMat);
        glowMesh.castShadow = false;
        towerGroup.add(glowMesh);
    }

    if (floorGeoms.length > 0) {
        const mergedFloors = BufferGeometryUtils.mergeGeometries(floorGeoms);
        const floorMesh = new THREE.Mesh(mergedFloors, starkFloorMat);
        floorMesh.receiveShadow = true;
        towerGroup.add(floorMesh);
    }

    if (interiorWallGeoms.length > 0) {
        const mergedWalls = BufferGeometryUtils.mergeGeometries(interiorWallGeoms);
        const wallMesh = new THREE.Mesh(mergedWalls, starkMetalMat);
        wallMesh.receiveShadow = true;
        towerGroup.add(wallMesh);
    }

    if (furnitureGeoms.length > 0) {
        const mergedFurn = BufferGeometryUtils.mergeGeometries(furnitureGeoms);
        const furnMesh = new THREE.Mesh(mergedFurn, starkInteriorMat);
        furnMesh.castShadow = false;
        furnMesh.receiveShadow = true;
        towerGroup.add(furnMesh);
    }

    scene.add(towerGroup);
    cityBuildings.push({ minX: -16, maxX: 16, minZ: 124, maxZ: 156, type: 'stark_tower' });
}
buildStarkTower();

// ==========================================
// VEHICLE 1: CYBER MOTORBIKE
// ==========================================
let bikeVehicle = {
    type: 'bike',
    mesh: null,
    x: -5,
    z: 4,
    rotation: 0,
    speed: 0,
    maxSpeed: 26,
    light: null
};

function buildCyberBike() {
    const bikeGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.85, roughness: 0.2 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });

    // Chassis & Body
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 2.8), frameMat);
    chassis.position.y = 0.9;
    chassis.castShadow = true;
    bikeGroup.add(chassis);

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 1.2), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    seat.position.set(0, 1.35, -0.2);
    bikeGroup.add(seat);

    // Wheels
    [-1.4, 1.4].forEach(wz => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.4, 16), tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0.65, wz);
        wheel.castShadow = false;
        bikeGroup.add(wheel);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.42, 16), chromeMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(0, 0.65, wz);
        bikeGroup.add(rim);
    });

    // Handlebars
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), chromeMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.6, 0.8);
    bikeGroup.add(bar);

    // Headlight & Spotlight Beam
    const headlamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    headlamp.position.set(0, 1.3, 1.5);
    bikeGroup.add(headlamp);

    const headlight = new THREE.SpotLight(0x38bdf8, 4.0, 40, Math.PI / 4, 0.5);
    headlight.position.set(0, 1.3, 1.5);
    headlight.target.position.set(0, 0, 15);
    bikeGroup.add(headlight);
    bikeGroup.add(headlight.target);

    bikeGroup.position.set(bikeVehicle.x, 0, bikeVehicle.z);
    scene.add(bikeGroup);

    bikeVehicle.mesh = bikeGroup;
    bikeVehicle.light = headlight;
}
buildCyberBike();

// ==========================================
// VEHICLE 2: CYBER SPORTS CAR
// ==========================================
let carVehicle = {
    type: 'car',
    mesh: null,
    x: 5,
    z: 4,
    rotation: 0,
    speed: 0,
    maxSpeed: 38,
    wheels: [],
    light: null
};

function buildCyberCar() {
    const carGroup = new THREE.Group();
    const carMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.9, roughness: 0.15 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.65 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 });
    // Styled per Vehicle Concept Sheet: Cyber Sports Car with Glowing Cyan Rims
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.1 });

    // Lower Body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 5.2), carMat);
    lowerBody.position.y = 0.7;
    lowerBody.castShadow = true;
    carGroup.add(lowerBody);

    // Glowing Cyan Underglow Neon
    const underglow = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 4.6), new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.75 }));
    underglow.position.y = 0.2;
    carGroup.add(underglow);

    // Cabin & Windshield
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 2.6), glassMat);
    cabin.position.set(0, 1.45, -0.3);
    carGroup.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 2.4), darkMat);
    roof.position.set(0, 1.85, -0.3);
    carGroup.add(roof);

    // Rear Spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.6), darkMat);
    spoiler.position.set(0, 1.5, -2.4);
    carGroup.add(spoiler);

    // 4 Wheels with Cyan Rims
    [-1.3, 1.3].forEach(wx => {
        [-1.6, 1.6].forEach(wz => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), tireMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.55, wz);
            wheel.castShadow = false;
            carGroup.add(wheel);

            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.42, 8), rimMat);
            rim.rotation.z = Math.PI / 2;
            rim.position.set(wx, 0.55, wz);
            carGroup.add(rim);

            carVehicle.wheels.push(wheel);
        });
    });

    // Twin Headlight Spots
    [-0.8, 0.8].forEach(hx => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        hl.position.set(hx, 0.8, 2.6);
        carGroup.add(hl);
    });

    const carSpot = new THREE.SpotLight(0x38bdf8, 4.5, 45, Math.PI / 3, 0.4);
    carSpot.position.set(0, 0.9, 2.7);
    carSpot.target.position.set(0, 0, 20);
    carGroup.add(carSpot);
    carGroup.add(carSpot.target);

    // Red LED Tail Light Bar
    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.15), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    tailLight.position.set(0, 0.9, -2.62);
    carGroup.add(tailLight);

    carGroup.position.set(carVehicle.x, 0, carVehicle.z);
    scene.add(carGroup);

    carVehicle.mesh = carGroup;
    carVehicle.light = carSpot;
}
buildCyberCar();

// ==========================================
// VEHICLE 2B: BAJAJ RE KAALI-PEELI 3-WHEEL AUTO-RICKSHAW
// Styled per Mumbai Vehicle Concept Sheet & Engineering CAD
// ==========================================
let rickshawVehicle = {
    type: 'rickshaw',
    mesh: null,
    x: 8.5,
    z: 22,
    rotation: 0,
    speed: 0,
    maxSpeed: 32, // 32 km/h authentic Mumbai auto cruising speed
    wheels: [],
    light: null
};

function buildAutoRickshaw() {
    const rickGroup = new THREE.Group();
    const kaaliBlackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.4 });
    const peeliYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 }); // Rexine brown

    // 1. Lower Black Body Chassis (Kaali)
    const bodyGeoms = [];
    const floor = new THREE.BoxGeometry(1.6, 0.25, 2.7);
    floor.translate(0, 0.45, 0);
    bodyGeoms.push(floor);

    // Front Nose / Cowl (Tapered front)
    const nose = new THREE.BoxGeometry(1.1, 0.75, 0.9);
    nose.translate(0, 0.85, 1.0);
    bodyGeoms.push(nose);

    // Rear Cabin Enclosure Walls
    const rearBack = new THREE.BoxGeometry(1.6, 0.8, 0.15);
    rearBack.translate(0, 0.9, -1.3);
    bodyGeoms.push(rearBack);

    const mergedBody = BufferGeometryUtils.mergeGeometries(bodyGeoms);
    const bodyMesh = new THREE.Mesh(mergedBody, kaaliBlackMat);
    bodyMesh.castShadow = true;
    rickGroup.add(bodyMesh);

    // 2. Yellow Canopy Roof (Peeli)
    const roofGeoms = [];
    const canopyTop = new THREE.BoxGeometry(1.65, 0.12, 2.2);
    canopyTop.translate(0, 1.95, -0.2);
    roofGeoms.push(canopyTop);

    // Canopy Sloped Front Lip
    const canopyLip = new THREE.BoxGeometry(1.4, 0.1, 0.6);
    canopyLip.rotateX(-0.35);
    canopyLip.translate(0, 1.85, 0.9);
    roofGeoms.push(canopyLip);

    // Rear Canopy Wall
    const canopyRear = new THREE.BoxGeometry(1.65, 0.65, 0.1);
    canopyRear.translate(0, 1.55, -1.3);
    roofGeoms.push(canopyRear);

    const mergedRoof = BufferGeometryUtils.mergeGeometries(roofGeoms);
    const roofMesh = new THREE.Mesh(mergedRoof, peeliYellowMat);
    rickGroup.add(roofMesh);

    // 3. Canopy Support Pillars & Handlebars (Chrome Metal)
    const poleGeoms = [];
    [-0.78, 0.78].forEach(px => {
        [-1.25, 0.35].forEach(pz => {
            const pole = new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6);
            pole.translate(px, 1.4, pz);
            poleGeoms.push(pole);
        });
    });
    // Front Windshield Frame Pillars
    [-0.55, 0.55].forEach(fx => {
        const fPole = new THREE.CylinderGeometry(0.025, 0.025, 0.95, 6);
        fPole.translate(fx, 1.4, 0.85);
        poleGeoms.push(fPole);
    });
    // Chrome Handlebars & Steering Column
    const column = new THREE.CylinderGeometry(0.035, 0.035, 0.7, 6);
    column.rotateX(0.25);
    column.translate(0, 1.05, 0.7);
    poleGeoms.push(column);
    const hBar = new THREE.BoxGeometry(0.8, 0.05, 0.05);
    hBar.translate(0, 1.35, 0.62);
    poleGeoms.push(hBar);

    const mergedPoles = BufferGeometryUtils.mergeGeometries(poleGeoms);
    rickGroup.add(new THREE.Mesh(mergedPoles, metalMat));

    // 4. Windshield Glass
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), glassMat);
    windshield.position.set(0, 1.45, 0.88);
    rickGroup.add(windshield);

    // 5. Driver & Passenger Seats (Rexine Brown)
    const dGeom = new THREE.BoxGeometry(0.65, 0.25, 0.45);
    dGeom.translate(0, 0.8, 0.2);
    const pGeom = new THREE.BoxGeometry(1.5, 0.28, 0.65);
    pGeom.translate(0, 0.75, -0.85);
    const seatMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([dGeom, pGeom]), seatMat);
    rickGroup.add(seatMesh);

    // 6. Three Wheels (1 Front Steerable, 2 Rear Drive Wheels)
    const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 14), tireMat);
    fWheel.rotation.z = Math.PI / 2;
    fWheel.position.set(0, 0.38, 1.15);
    rickGroup.add(fWheel);
    rickshawVehicle.wheels.push(fWheel);

    [-0.72, 0.72].forEach(rx => {
        const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 14), tireMat);
        rWheel.rotation.z = Math.PI / 2;
        rWheel.position.set(rx, 0.38, -0.65);
        rickGroup.add(rWheel);
        rickshawVehicle.wheels.push(rWheel);
    });

    // 7. Authentic Front Round Headlamp & Spotlight
    const hlGeom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
    hlGeom.rotation.x = Math.PI / 2;
    hlGeom.position.set(0, 0.88, 1.48);
    rickGroup.add(hlGeom);

    const rickSpot = new THREE.SpotLight(0xfffae6, 3.8, 38, Math.PI / 3.5, 0.4);
    rickSpot.position.set(0, 0.88, 1.55);
    rickSpot.target.position.set(0, 0, 18);
    rickGroup.add(rickSpot);
    rickGroup.add(rickSpot.target);

    // 8. Mumbai Registration Plate: "MH 01 EA 4021"
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 128; plateCanvas.height = 48;
    const pCtx = plateCanvas.getContext('2d');
    pCtx.fillStyle = '#facc15'; pCtx.fillRect(0, 0, 128, 48);
    pCtx.strokeStyle = '#0f172a'; pCtx.lineWidth = 3; pCtx.strokeRect(2, 2, 124, 44);
    pCtx.fillStyle = '#0f172a'; pCtx.font = 'bold 15px monospace'; pCtx.textAlign = 'center';
    pCtx.fillText("MH 01 EA 4021", 64, 30);
    const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.24), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(plateCanvas) }));
    plateMesh.position.set(0, 0.52, -1.38);
    plateMesh.rotation.y = Math.PI;
    rickGroup.add(plateMesh);

    // Position at Auto Stand on Marine Ave
    rickGroup.position.set(rickshawVehicle.x, 0, rickshawVehicle.z);
    scene.add(rickGroup);

    rickshawVehicle.mesh = rickGroup;
    rickshawVehicle.light = rickSpot;
}
buildAutoRickshaw();
window.__rickshawVehicle = rickshawVehicle;

// Active Vehicle State
let activeVehicle = null; // null | bikeVehicle | carVehicle | rickshawVehicle | 'train'

// ==========================================
// VEHICLE 3: MUMBAI SUBURBAN LOCAL TRAIN & BROAD GAUGE RAILWAY
// Continuous Indian Standard Broad Gauge (1,676mm) Spline Loop
// Dual Tracks: Up Line (X = -22, Northbound), Down Line (X = -26, Southbound)
// ==========================================
const trainStationZ = [16, 50, 84]; // Gateway Station, Home West Station, Academia North Terminal
let trainSpline = null;
let stationSchedule = []; // Array of { name, s, z, platX }

let trainState = {
    spline: null,
    splineLength: 180,
    coach1: null,
    coach2: null,
    coach3: null,
    mesh: null, // Lead coach reference for compatibility
    x: -22,
    z: 16,
    speed: 0,
    maxSpeed: 16.0, // 58 km/h cruising speed
    progress: 0.05,
    targetStationIdx: 0,
    dwellTimer: 0,
    isDwelling: true, // Start dwelling at Gateway Station
    hornPlayed: false
};

function createTrainDestinationTexture(mrText, enText) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 250, 58);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mrText, 128, 26);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(enText, 128, 52);

    return new THREE.CanvasTexture(c);
}

function buildRailwaySystem() {
    // 1. Define Continuous Broad Gauge Closed Spline Loop
    // Dual parallel tracks: Up Line (X = -22) and Down Line (X = -26)
    // Smooth continuous curved turnaround loops at North Terminal (Z ~ 96) and South Gateway (Z ~ 0.5)
    const railwayLoopPoints = [
        new THREE.Vector3(-22, 0.25, 8),
        new THREE.Vector3(-22, 0.25, 16), // Gateway Up
        new THREE.Vector3(-22, 0.25, 30),
        new THREE.Vector3(-22, 0.25, 42), // Market St Crossing
        new THREE.Vector3(-22, 0.25, 50), // Home West Up
        new THREE.Vector3(-22, 0.25, 70),
        new THREE.Vector3(-22, 0.25, 84), // Academia North Up
        new THREE.Vector3(-22, 0.25, 88),
        new THREE.Vector3(-22.3, 0.25, 92),
        new THREE.Vector3(-23.1, 0.25, 95),
        new THREE.Vector3(-24.0, 0.25, 96), // North Turn Apex
        new THREE.Vector3(-24.9, 0.25, 95),
        new THREE.Vector3(-25.7, 0.25, 92),
        new THREE.Vector3(-26.0, 0.25, 88),
        new THREE.Vector3(-26.0, 0.25, 84), // Academia North Down
        new THREE.Vector3(-26.0, 0.25, 70),
        new THREE.Vector3(-26.0, 0.25, 50), // Home West Down
        new THREE.Vector3(-26.0, 0.25, 42), // Market St Crossing
        new THREE.Vector3(-26.0, 0.25, 30),
        new THREE.Vector3(-26.0, 0.25, 16), // Gateway Down
        new THREE.Vector3(-26.0, 0.25, 8),
        new THREE.Vector3(-25.7, 0.25, 4.5),
        new THREE.Vector3(-24.9, 0.25, 1.5),
        new THREE.Vector3(-24.0, 0.25, 0.5), // South Turn Apex
        new THREE.Vector3(-23.1, 0.25, 1.5),
        new THREE.Vector3(-22.3, 0.25, 4.5)
    ];

    trainSpline = new THREE.CatmullRomCurve3(railwayLoopPoints, true, 'centripetal');
    trainState.spline = trainSpline;
    const splineLen = trainSpline.getLength();
    trainState.splineLength = splineLen;

    // Calibrate scheduled station stops along the continuous spline loop
    const stopsDef = [
        { name: "Gateway (Up)", target: new THREE.Vector3(-22, 0.25, 16), z: 16, platX: -24 },
        { name: "Home West (Up)", target: new THREE.Vector3(-22, 0.25, 50), z: 50, platX: -24 },
        { name: "Academia North (Up)", target: new THREE.Vector3(-22, 0.25, 84), z: 84, platX: -24 },
        { name: "Academia North (Down)", target: new THREE.Vector3(-26, 0.25, 84), z: 84, platX: -28.6 },
        { name: "Home West (Down)", target: new THREE.Vector3(-26, 0.25, 50), z: 50, platX: -28.6 },
        { name: "Gateway (Down)", target: new THREE.Vector3(-26, 0.25, 16), z: 16, platX: -28.6 }
    ];

    stationSchedule = [];
    const SAMPLES = 600;
    stopsDef.forEach(def => {
        let bestS = 0;
        let bestDist = Infinity;
        for (let i = 0; i < SAMPLES; i++) {
            const s = i / SAMPLES;
            const pt = trainSpline.getPointAt(s);
            const d = pt.distanceTo(def.target);
            if (d < bestDist) {
                bestDist = d;
                bestS = s;
            }
        }
        stationSchedule.push({ name: def.name, s: bestS, z: def.z, platX: def.platX });
    });
    stationSchedule.sort((a, b) => a.s - b.s);
    trainState.progress = stationSchedule[0].s;

    // 2. Physical Indian Standard Broad Gauge (1,676mm) Steel Rails
    const leftRailPts = [];
    const rightRailPts = [];
    const RAIL_SAMPLES = 280;
    const UP = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < RAIL_SAMPLES; i++) {
        const t = i / RAIL_SAMPLES;
        const pt = trainSpline.getPointAt(t);
        const tan = trainSpline.getTangentAt(t);
        const norm = new THREE.Vector3().crossVectors(tan, UP).normalize();

        leftRailPts.push(new THREE.Vector3(pt.x + norm.x * 0.838, 0.22, pt.z + norm.z * 0.838));
        rightRailPts.push(new THREE.Vector3(pt.x - norm.x * 0.838, 0.22, pt.z - norm.z * 0.838));
    }

    const leftRailCurve = new THREE.CatmullRomCurve3(leftRailPts, true, 'centripetal');
    const rightRailCurve = new THREE.CatmullRomCurve3(rightRailPts, true, 'centripetal');

    const leftRailGeom = new THREE.TubeGeometry(leftRailCurve, 260, 0.05, 6, true);
    const rightRailGeom = new THREE.TubeGeometry(rightRailCurve, 260, 0.05, 6, true);
    const mergedRails = BufferGeometryUtils.mergeGeometries([leftRailGeom, rightRailGeom]);

    const steelRailMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.95,
        roughness: 0.18
    });
    const railsMesh = new THREE.Mesh(mergedRails, steelRailMat);
    railsMesh.castShadow = false;
    scene.add(railsMesh);

    // 3. Batched Concrete Sleepers (Ties) along track
    const sleeperGeoms = [];
    const SLEEPER_COUNT = 190;
    for (let k = 0; k < SLEEPER_COUNT; k++) {
        const t = k / SLEEPER_COUNT;
        const pt = trainSpline.getPointAt(t);
        const tan = trainSpline.getTangentAt(t);
        const rotY = Math.atan2(tan.x, tan.z) + Math.PI / 2;

        const sleeper = new THREE.BoxGeometry(2.6, 0.14, 0.24);
        sleeper.rotateY(rotY);
        sleeper.translate(pt.x, 0.08, pt.z);
        sleeperGeoms.push(sleeper);
    }
    const mergedSleepers = BufferGeometryUtils.mergeGeometries(sleeperGeoms);
    const sleeperMesh = new THREE.Mesh(mergedSleepers, concreteTrimMat);
    sleeperMesh.receiveShadow = true;
    scene.add(sleeperMesh);

    // 4. Crushed Granite Stone Ballast Bed
    const ballastGeoms = [];
    const straightBallast = new THREE.BoxGeometry(8.4, 0.22, 84);
    straightBallast.translate(-24, 0.01, 47);
    ballastGeoms.push(straightBallast);

    const northBallast = new THREE.BoxGeometry(8.4, 0.22, 10);
    northBallast.translate(-24, 0.01, 91);
    ballastGeoms.push(northBallast);

    const southBallast = new THREE.BoxGeometry(8.4, 0.22, 9);
    southBallast.translate(-24, 0.01, 4.5);
    ballastGeoms.push(southBallast);

    const mergedBallast = BufferGeometryUtils.mergeGeometries(ballastGeoms);
    const ballastMesh = new THREE.Mesh(mergedBallast, darkGraniteMat);
    ballastMesh.receiveShadow = true;
    scene.add(ballastMesh);

    // 5. Overhead 25 kV AC Catenary Masts (Portal Gantries) & Contact Wire
    const gantryGeoms = [];
    const gantryZ = [8, 24, 40, 56, 72, 88, 96];
    gantryZ.forEach(gz => {
        // Left Column (X = -27.8)
        const colL = new THREE.BoxGeometry(0.25, 6.2, 0.25);
        colL.translate(-27.8, 3.1, gz);
        gantryGeoms.push(colL);

        // Right Column (X = -20.2)
        const colR = new THREE.BoxGeometry(0.25, 6.2, 0.25);
        colR.translate(-20.2, 3.1, gz);
        gantryGeoms.push(colR);

        // Horizontal Lattice Beam
        const beam = new THREE.BoxGeometry(8.0, 0.35, 0.35);
        beam.translate(-24.0, 6.0, gz);
        gantryGeoms.push(beam);

        // Cantilever suspension drop arms at X = -22 and X = -26
        [-26, -22].forEach(cx => {
            const arm = new THREE.BoxGeometry(0.08, 0.8, 0.08);
            arm.translate(cx, 5.5, gz);
            gantryGeoms.push(arm);
            const insul = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6);
            insul.translate(cx, 5.25, gz);
            gantryGeoms.push(insul);
        });
    });
    const mergedGantries = BufferGeometryUtils.mergeGeometries(gantryGeoms);
    const gantryMesh = new THREE.Mesh(mergedGantries, metalRailingMat);
    gantryMesh.castShadow = false;
    scene.add(gantryMesh);

    // Continuous 25 kV AC Copper Contact Wire at Y = 5.2m
    const wirePts = [];
    for (let i = 0; i < 180; i++) {
        const pt = trainSpline.getPointAt(i / 180);
        wirePts.push(new THREE.Vector3(pt.x, 5.2, pt.z));
    }
    const wireCurve = new THREE.CatmullRomCurve3(wirePts, true, 'centripetal');
    const wireGeom = new THREE.TubeGeometry(wireCurve, 180, 0.016, 4, true);
    const wireMesh = new THREE.Mesh(wireGeom, new THREE.MeshStandardMaterial({
        color: 0xb45309,
        metalness: 0.85,
        roughness: 0.3
    }));
    scene.add(wireMesh);

    // 6. Market Street Level Crossing (Z = 42)
    const crossingPanel = new THREE.Mesh(
        new THREE.BoxGeometry(8.4, 0.22, 10.0),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    crossingPanel.position.set(-24.0, 0.12, 42.0);
    scene.add(crossingPanel);

    [-28.4, -19.6].forEach(px => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), metalRailingMat);
        post.position.set(px, 1.6, 42.0);
        scene.add(post);

        const boom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 5.0), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        boom.position.set(px, 1.2, 42.0);
        scene.add(boom);

        const light = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        light.position.set(px, 3.1, 42.0);
        scene.add(light);
    });

    // 7. Passenger Stations (Gateway, Home West, Academia North)
    registerBoxCollider(-31.0, -26.5, 5, 27, 'PlatformGateway');
    registerBoxCollider(-31.0, -26.5, 39, 61, 'PlatformHome');
    registerBoxCollider(-31.0, -26.5, 73, 95, 'PlatformAcademia');
    registerBoxCollider(-24.8, -23.2, 5, 27, 'IslandPlatformGateway');
    registerBoxCollider(-24.8, -23.2, 39, 61, 'IslandPlatformHome');
    registerBoxCollider(-24.8, -23.2, 73, 95, 'IslandPlatformAcademia');

    const platGeoms = [];
    const canopyGeoms = [];

    const stationNames = [
        { mr: "गेटवे ऑफ इंडिया", en: "GATEWAY TERMINAL" },
        { mr: "होम वेस्ट (देव मुख्यालय)", en: "HOME WEST (DEV HQ)" },
        { mr: "अकॅडेमिया नॉर्थ (महाविद्यालय)", en: "ACADEMIA NORTH (COLLEGE)" }
    ];

    trainStationZ.forEach((sz, idx) => {
        // Western Main Platform Slab (X = -28.7, width 4.2, length 22, height 0.65)
        const platW = new THREE.BoxGeometry(4.2, 0.65, 22);
        platW.translate(-28.7, 0.325, sz);
        platGeoms.push(platW);

        // Central Island Platform (X = -24.0, width 1.6, length 22, height 0.65)
        const platIsland = new THREE.BoxGeometry(1.6, 0.65, 22);
        platIsland.translate(-24.0, 0.325, sz);
        platGeoms.push(platIsland);

        // Western Platform Canopy Roof
        const canopy = new THREE.BoxGeometry(4.6, 0.22, 22);
        canopy.translate(-28.7, 4.3, sz);
        canopyGeoms.push(canopy);

        // Canopy Support Pillars
        [-8, 0, 8].forEach(pz => {
            const pillar = new THREE.BoxGeometry(0.2, 3.8, 0.2);
            pillar.translate(-30.0, 2.3, sz + pz);
            canopyGeoms.push(pillar);
        });

        // High-Resolution Bilingual Station Signboard (Marathi + English)
        const signTex = createBilingualSignboardTexture(stationNames[idx].mr, stationNames[idx].en);
        const signMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(5.2, 1.3),
            new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
        );
        signMesh.position.set(-26.55, 3.2, sz);
        signMesh.rotation.y = Math.PI / 2;
        scene.add(signMesh);
    });

    const mergedPlats = BufferGeometryUtils.mergeGeometries(platGeoms);
    const platformMesh = new THREE.Mesh(mergedPlats, concreteTrimMat);
    platformMesh.receiveShadow = true;
    scene.add(platformMesh);

    const mergedCanopies = BufferGeometryUtils.mergeGeometries(canopyGeoms);
    const canopyMesh = new THREE.Mesh(mergedCanopies, new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.5,
        metalness: 0.3
    }));
    canopyMesh.castShadow = false;
    scene.add(canopyMesh);

    // 7b. Station Overbridge Stairs & ATVM Ticket Booth at Gateway Station (X = -32, Z = 16)
    const ticketMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const ticketGeoms = [];
    const boothBody = new THREE.BoxGeometry(3.6, 2.8, 3.0);
    boothBody.translate(-32.5, 1.4, 16);
    ticketGeoms.push(boothBody);
    const winCutout = new THREE.BoxGeometry(0.3, 1.0, 1.8);
    winCutout.translate(-30.6, 1.5, 16);
    ticketGeoms.push(winCutout);
    for (let st = 0; st < 10; st++) {
        const step = new THREE.BoxGeometry(2.2, 0.35, 0.65);
        step.translate(-31.2, st * 0.35 + 0.175, 20 + st * 0.65);
        ticketGeoms.push(step);
    }
    const ticketMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(ticketGeoms), ticketMat);
    scene.add(ticketMesh);

    const ticketSignTex = createBilingualSignboardTexture("अनारक्षित तिकीट खिडकी", "UNRESERVED TICKETS / ATVM");
    const ticketSign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 0.8),
        new THREE.MeshBasicMaterial({ map: ticketSignTex, side: THREE.DoubleSide })
    );
    ticketSign.position.set(-30.5, 2.5, 16);
    ticketSign.rotation.y = Math.PI / 2;
    scene.add(ticketSign);

    // 8. Articulated 3-Car Mumbai Suburban EMU Rake
    const emuWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.2 });
    const emuPurpleMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.35, metalness: 0.25 });
    const emuYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.2 });
    const emuDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.5 });
    const emuGlassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.75 });
    const emuGrabPoleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.95 });
    const emuWheelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.85 });

    function createEMUCoach(type = 'lead') {
        const coach = new THREE.Group();

        // 1. Merged White Body Geometries (Floor, Roof, Rear Panel)
        const whiteGeoms = [];
        const floorGeom = new THREE.BoxGeometry(3.08, 0.3, 6.0);
        floorGeom.translate(0, 0.8, 0);
        whiteGeoms.push(floorGeom);

        const roofGeom = new THREE.BoxGeometry(3.1, 0.25, 6.0);
        roofGeom.translate(0, 3.35, 0);
        whiteGeoms.push(roofGeom);

        if (type === 'trail') {
            const rearGeom = new THREE.BoxGeometry(3.08, 2.2, 0.4);
            rearGeom.translate(0, 1.9, -3.1);
            whiteGeoms.push(rearGeom);
        }

        const mergedWhite = BufferGeometryUtils.mergeGeometries(whiteGeoms);
        const whiteMesh = new THREE.Mesh(mergedWhite, emuWhiteMat);
        whiteMesh.castShadow = false;
        coach.add(whiteMesh);

        // 2. Merged Purple Stripes (Waist & Roofline)
        const purpleGeoms = [];
        const waistGeom = new THREE.BoxGeometry(3.14, 0.5, 6.02);
        waistGeom.translate(0, 1.45, 0);
        purpleGeoms.push(waistGeom);

        const topGeom = new THREE.BoxGeometry(3.14, 0.25, 6.02);
        topGeom.translate(0, 3.15, 0);
        purpleGeoms.push(topGeom);

        const mergedPurple = BufferGeometryUtils.mergeGeometries(purpleGeoms);
        const purpleMesh = new THREE.Mesh(mergedPurple, emuPurpleMat);
        coach.add(purpleMesh);

        // 3. Merged Dark Interior & Bogies
        const darkGeoms = [];
        const seat1Geom = new THREE.BoxGeometry(0.6, 0.35, 5.4);
        seat1Geom.translate(-1.1, 0.95, 0);
        darkGeoms.push(seat1Geom);

        const seat2Geom = new THREE.BoxGeometry(0.6, 0.35, 5.4);
        seat2Geom.translate(1.1, 0.95, 0);
        darkGeoms.push(seat2Geom);

        [-1.8, 1.8].forEach(bz => {
            const bogieGeom = new THREE.BoxGeometry(2.2, 0.16, 2.1);
            bogieGeom.translate(0, 0.42, bz);
            darkGeoms.push(bogieGeom);
        });

        if (type === 'lead') {
            const cowGeom = new THREE.BoxGeometry(2.6, 0.2, 0.3);
            cowGeom.translate(0, 0.3, 3.25);
            darkGeoms.push(cowGeom);
        } else if (type === 'motor') {
            const tracGeom = new THREE.BoxGeometry(2.2, 0.4, 2.8);
            tracGeom.translate(0, 3.65, 0);
            darkGeoms.push(tracGeom);
        }

        const mergedDark = BufferGeometryUtils.mergeGeometries(darkGeoms);
        const darkMesh = new THREE.Mesh(mergedDark, emuDarkMat);
        coach.add(darkMesh);

        // 4. Merged Flanged Steel Wheels (8 wheels per car)
        const wheelGeoms = [];
        [-1.8, 1.8].forEach(bz => {
            [-0.84, 0.84].forEach(wx => {
                [-0.65, 0.65].forEach(wz => {
                    const wGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.14, 12);
                    wGeom.rotateZ(Math.PI / 2);
                    wGeom.translate(wx, 0.25, bz + wz);
                    wheelGeoms.push(wGeom);
                });
            });
        });
        const mergedWheels = BufferGeometryUtils.mergeGeometries(wheelGeoms);
        const wheelMesh = new THREE.Mesh(mergedWheels, emuWheelMat);
        coach.add(wheelMesh);

        // 5. Merged Stainless-Steel Grab Poles (4 doorway poles)
        const poleGeoms = [];
        [-1.56, 1.56].forEach(wx => {
            [-1.3, 1.3].forEach(dz => {
                const pGeom = new THREE.CylinderGeometry(0.025, 0.025, 2.1, 6);
                pGeom.translate(wx > 0 ? wx - 0.06 : wx + 0.06, 2.0, dz);
                poleGeoms.push(pGeom);
            });
        });
        const mergedPoles = BufferGeometryUtils.mergeGeometries(poleGeoms);
        const poleMesh = new THREE.Mesh(mergedPoles, emuGrabPoleMat);
        coach.add(poleMesh);

        // 6. Windows & Front Glass
        const glassGeoms = [];
        [-1.56, 1.56].forEach(wx => {
            const winGeom = new THREE.PlaneGeometry(1.2, 0.85);
            winGeom.rotateY(wx > 0 ? Math.PI / 2 : -Math.PI / 2);
            winGeom.translate(wx, 2.2, 0);
            glassGeoms.push(winGeom);
        });

        if (type === 'lead') {
            const windshieldGeom = new THREE.PlaneGeometry(2.4, 0.9);
            windshieldGeom.translate(0, 2.45, 3.32);
            glassGeoms.push(windshieldGeom);
        }
        const mergedGlass = BufferGeometryUtils.mergeGeometries(glassGeoms);
        const glassMesh = new THREE.Mesh(mergedGlass, emuGlassMat);
        coach.add(glassMesh);

        // 7. Specialized Lead / Motor / Trail Features
        if (type === 'lead') {
            const hazardCanvas = document.createElement('canvas');
            hazardCanvas.width = 256; hazardCanvas.height = 128;
            const hzCtx = hazardCanvas.getContext('2d');
            hzCtx.fillStyle = '#facc15';
            hzCtx.fillRect(0, 0, 256, 128);
            // Angled black chevron hazard stripes across lower cab
            hzCtx.fillStyle = '#0f172a';
            for (let x = -60; x < 320; x += 36) {
                hzCtx.beginPath();
                hzCtx.moveTo(x, 128);
                hzCtx.lineTo(x + 16, 128);
                hzCtx.lineTo(x + 38, 52);
                hzCtx.lineTo(x + 22, 52);
                hzCtx.closePath();
                hzCtx.fill();
            }
            // Central Railway red emblem circle
            hzCtx.fillStyle = '#dc2626';
            hzCtx.beginPath();
            hzCtx.arc(128, 28, 12, 0, Math.PI * 2);
            hzCtx.fill();
            hzCtx.fillStyle = '#ffffff';
            hzCtx.font = 'bold 10px sans-serif';
            hzCtx.textAlign = 'center';
            hzCtx.fillText("CR", 128, 32);

            const hazardTex = new THREE.CanvasTexture(hazardCanvas);
            const emuLeadFrontMat = new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.35, metalness: 0.2 });
            const yellowFront = new THREE.Mesh(new THREE.BoxGeometry(3.08, 2.2, 0.4), emuLeadFrontMat);
            yellowFront.position.set(0, 1.9, 3.1);
            coach.add(yellowFront);

            const destTex = createTrainDestinationTexture("छ.शि.म.ट. जलद", "CSMT FAST");
            const destMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: destTex }));
            destMesh.position.set(0, 3.05, 3.32);
            coach.add(destMesh);

            [-0.85, 0.85].forEach(hx => {
                const hl = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
                hl.position.set(hx, 1.35, 3.32);
                coach.add(hl);
            });

            const trainHeadlight = new THREE.SpotLight(0xfffae6, 4.0, 48, Math.PI / 4.5, 0.35);
            trainHeadlight.position.set(0, 1.8, 3.3);
            trainHeadlight.target.position.set(0, 0, 35);
            coach.add(trainHeadlight);
            coach.add(trainHeadlight.target);
        } else if (type === 'motor') {
            const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.4), metalRailingMat);
            pantoBase.position.set(0, 3.9, 0.2);
            coach.add(pantoBase);

            const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0xea580c }));
            arm1.rotation.x = Math.PI / 4;
            arm1.position.set(-0.4, 4.4, -0.1);
            coach.add(arm1);

            const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0xea580c }));
            arm2.rotation.x = -Math.PI / 4;
            arm2.position.set(-0.4, 4.9, 0.3);
            coach.add(arm2);

            const shoe = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.18), new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9 }));
            shoe.position.set(0, 5.2, 0.3);
            coach.add(shoe);
        } else if (type === 'trail') {
            [-0.85, 0.85].forEach(rx => {
                const tl = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
                tl.position.set(rx, 1.35, -3.32);
                tl.rotation.y = Math.PI;
                coach.add(tl);
            });
        }

        return coach;
    }

    const coach1 = createEMUCoach('lead');
    const coach2 = createEMUCoach('motor');
    const coach3 = createEMUCoach('trail');

    scene.add(coach1);
    scene.add(coach2);
    scene.add(coach3);

    trainState.coach1 = coach1;
    trainState.coach2 = coach2;
    trainState.coach3 = coach3;
    trainState.mesh = coach1;

    // Initial Coach Alignment on Spline
    const initialS = stationSchedule[0].s;
    const deltaS = 6.8 / splineLen;

    const p1 = trainSpline.getPointAt(initialS);
    const t1 = trainSpline.getTangentAt(initialS);
    coach1.position.copy(p1);
    coach1.rotation.y = Math.atan2(t1.x, t1.z);

    const s2 = (initialS - deltaS + 1.0) % 1.0;
    const p2 = trainSpline.getPointAt(s2);
    const t2 = trainSpline.getTangentAt(s2);
    coach2.position.copy(p2);
    coach2.rotation.y = Math.atan2(t2.x, t2.z);

    const s3 = (initialS - deltaS * 2 + 1.0) % 1.0;
    const p3 = trainSpline.getPointAt(s3);
    const t3 = trainSpline.getTangentAt(s3);
    coach3.position.copy(p3);
    coach3.rotation.y = Math.atan2(t3.x, t3.z);

    trainState.x = p1.x;
    trainState.z = p1.z;
    trainState.progress = initialS;

    window.__trainState = trainState;
    window.__trainSpline = trainSpline;
    window.__stationSchedule = stationSchedule;
}
buildRailwaySystem();

// ==========================================
// CHARACTER & HERO IRON MAN FLIGHT
// ==========================================
const characterGroup = new THREE.Group();
scene.add(characterGroup);

// Iron Man Armor Suit Mesh (Active during flight & superhero landing)
const ironManSuit = new THREE.Group();
const redArmorMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.85, roughness: 0.25 });
const goldArmorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
const arcReactorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

// Helmet, Chest & Legs (Red Armor)
const redGeoms = [];
const hGeom = new THREE.SphereGeometry(0.68, 14, 14);
hGeom.translate(0, 1.95, 0);
redGeoms.push(hGeom);
const cGeom = new THREE.BoxGeometry(0.95, 1.0, 0.65);
cGeom.translate(0, 1.1, 0);
redGeoms.push(cGeom);
[-0.26, 0.26].forEach(lx => {
    const lGeom = new THREE.CylinderGeometry(0.2, 0.22, 0.9, 8);
    lGeom.translate(lx, 0.45, 0);
    redGeoms.push(lGeom);
});
ironManSuit.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(redGeoms), redArmorMat));

// Faceplate, Shoulder Pads & Boots (Gold Armor)
const goldGeoms = [];
const fpGeom = new THREE.BoxGeometry(0.58, 0.62, 0.35);
fpGeom.translate(0, 1.9, 0.45);
goldGeoms.push(fpGeom);
[-0.65, 0.65].forEach(sx => {
    const pGeom = new THREE.SphereGeometry(0.28, 8, 8);
    pGeom.translate(sx, 1.45, 0);
    goldGeoms.push(pGeom);
});
[-0.26, 0.26].forEach(lx => {
    const bGeom = new THREE.BoxGeometry(0.32, 0.22, 0.55);
    bGeom.translate(lx, 0.11, 0.06);
    goldGeoms.push(bGeom);
});
ironManSuit.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(goldGeoms), goldArmorMat));

// Glowing Eyes & Arc Reactor (Cyan Energy)
const cyanGeoms = [];
[-0.16, 0.16].forEach(ex => {
    const eyeGeom = new THREE.BoxGeometry(0.14, 0.05, 0.1);
    eyeGeom.translate(ex, 1.96, 0.63);
    cyanGeoms.push(eyeGeom);
});
const arGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 14);
arGeom.rotateX(Math.PI / 2);
arGeom.translate(0, 1.25, 0.35);
cyanGeoms.push(arGeom);
ironManSuit.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(cyanGeoms), arcReactorMat));

characterGroup.add(ironManSuit);

// Repulsor Jet Thrust Lights & Particle Sparks (Optimized Batched Instances)
const jetParticles = [];
const jetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), jetMat);
    characterGroup.add(p);
    jetParticles.push({ mesh: p, offset: (i % 2 === 0 ? 0.26 : -0.26) });
}

const repulsorLight = new THREE.PointLight(0x00f2fe, 5.0, 14);
repulsorLight.position.set(0, 0.2, 0);
characterGroup.add(repulsorLight);

// Shockwave Ring (Triggers on Superhero landing)
const shockRingGeom = new THREE.RingGeometry(0.1, 0.6, 32);
const shockRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0 });
const shockRing = new THREE.Mesh(shockRingGeom, shockRingMat);
shockRing.rotation.x = -Math.PI / 2;
shockRing.position.y = 0.05;
scene.add(shockRing);

// Casual Techwear GLB Model (Loaded in background, swapped after suit landing)
let casualMeshRoot = null;
const gltfLoader = new GLTFLoader();
gltfLoader.load(
    './public/models/devarshi_chibi_character.glb',
    (gltf) => {
        casualMeshRoot = gltf.scene;
        // Correcting GLTF orientation (exported Z-up to Three.js Y-up)
        casualMeshRoot.rotation.x = -Math.PI / 2;
        casualMeshRoot.rotation.z = Math.PI;

        const box = new THREE.Box3().setFromObject(casualMeshRoot);
        const size = new THREE.Vector3();
        box.getSize(size);
        const targetHeight = 2.4;
        const scale = targetHeight / Math.max(size.x, size.y, size.z);
        casualMeshRoot.scale.set(scale, scale, scale);

        box.setFromObject(casualMeshRoot);
        casualMeshRoot.position.y = -box.min.y;
        casualMeshRoot.position.x = -(box.min.x + box.max.x) / 2;
        casualMeshRoot.position.z = -(box.min.z + box.max.z) / 2;

        casualMeshRoot.visible = false;
        characterGroup.add(casualMeshRoot);

        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => document.getElementById('loading-screen').style.display = 'none', 600);
    },
    undefined,
    () => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => document.getElementById('loading-screen').style.display = 'none', 600);
    }
);

// Spawn state: Iron Man flies in high above Gateway waterfront
characterGroup.position.set(0, 32, -4);
let isFlyingIn = true;
let initialDropSpeed = 16;
let shockwaveActive = false;
let shockwaveScale = 1;

// ==========================================
// 6-DOF IRON MAN SUPERHERO FLIGHT ENGINE
// ==========================================
let isFlightMode = false;
let flightSpeed = 0;
let flightVertSpeed = 0;
let flightPitch = 0;
let flightRoll = 0;
let flightHeading = 0;
let flightBobTimer = 0;

// Controls & Movement State
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false, c: false, ctrl: false };
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = true;
    if (k === 's' || k === 'arrowdown') keys.s = true;
    if (k === 'a' || k === 'arrowleft') keys.a = true;
    if (k === 'd' || k === 'arrowright') keys.d = true;
    if (k === ' ' || e.key === 'Spacebar') { keys.space = true; e.preventDefault(); }
    if (e.key === 'Shift') keys.shift = true;
    if (e.key === 'Control') keys.ctrl = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (k === 'f') toggleVehicleMount();
    if (k === 'g') toggleFlightMode();
    if (k === 'e') handleInteraction();
    if (k === 't') cycleTimeOfDay();
    if (k === 'v') toggleCameraMode();
    if (k === 'c') {
        if (isFlightMode) keys.c = true;
        else toggleCameraMode();
    }
    if (k === 'escape') {
        closeModal();
        closeLandmarkModal();
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = false;
    if (k === 's' || k === 'arrowdown') keys.s = false;
    if (k === 'a' || k === 'arrowleft') keys.a = false;
    if (k === 'd' || k === 'arrowright') keys.d = false;
    if (k === ' ' || e.key === 'Spacebar') keys.space = false;
    if (e.key === 'Shift') keys.shift = false;
    if (e.key === 'Control') keys.ctrl = false;
    if (k === 'c') keys.c = false;
});

function toggleCameraMode() {
    const modes = ['chase', 'cinematic', 'orbit'];
    cameraMode = modes[(modes.indexOf(cameraMode) + 1) % modes.length];
    orbitControls.enabled = (cameraMode === 'orbit');
}

// Iron Man JARVIS Flight HUD Elements
const flightHudEl = document.getElementById('flight-hud');
const flightSpdVal = document.getElementById('flight-spd-val');
const flightMachVal = document.getElementById('flight-mach-val');
const flightAltVal = document.getElementById('flight-alt-val');
const flightAglVal = document.getElementById('flight-agl-val');
const flightHeadingVal = document.getElementById('flight-heading-val');
const flightBoostBar = document.getElementById('flight-boost-bar');
const flightClimbVal = document.getElementById('flight-climb-val');
const btnToggleFlight = document.getElementById('btn-toggle-flight');

if (btnToggleFlight) {
    btnToggleFlight.addEventListener('click', toggleFlightMode);
}

function enterFlightMode(launchOffDeck = false) {
    if (activeVehicle) dismountVehicle();
    isFlightMode = true;
    ironManSuit.visible = true;
    if (casualMeshRoot) casualMeshRoot.visible = false;
    jetParticles.forEach(p => p.mesh.visible = true);
    repulsorLight.intensity = 6.0;
    playSound('repulsor');
    startFlightAudio();

    if (launchOffDeck) {
        // Launch trajectory from Stark Tower Helipad at Y = 120m
        characterGroup.position.set(0, 124, 120);
        characterGroup.rotation.set(0, Math.PI, 0); // Face South toward Mumbai city
        flightHeading = Math.PI;
        flightSpeed = 38;
        flightVertSpeed = 6;
    } else {
        // Ground or mid-air takeoff
        if (characterGroup.position.y < currentFloorElevation + 2.5) {
            characterGroup.position.y = currentFloorElevation + 4.5;
        }
        flightHeading = characterGroup.rotation.y;
        flightSpeed = 20;
        flightVertSpeed = 8;
    }

    if (flightHudEl) flightHudEl.classList.add('active');
    if (btnToggleFlight) {
        btnToggleFlight.textContent = '⚡ Land Suit [G]';
        btnToggleFlight.classList.add('active');
    }
}

function exitFlightMode(superheroLanding = true) {
    isFlightMode = false;
    stopFlightAudio();
    characterGroup.rotation.x = 0;
    characterGroup.rotation.z = 0;
    flightSpeed = 0;
    flightVertSpeed = 0;
    camera.fov = 52;
    camera.updateProjectionMatrix();

    // Dynamic Surface Elevation Check (Helipad, Building Rooftops, or Ground)
    const surfaceY = getSurfaceElevationAt(characterGroup.position.x, characterGroup.position.z);
    if (surfaceY > 0 && characterGroup.position.y >= surfaceY - 2.5) {
        currentFloorElevation = surfaceY;
    } else {
        currentFloorElevation = 0;
    }
    window.__currentFloorElevation = currentFloorElevation;

    if (superheroLanding) {
        characterGroup.position.y = currentFloorElevation;
        playSound('landing');
        shockwaveActive = true;
        shockwaveScale = 0.5;
        shockRing.position.set(characterGroup.position.x, currentFloorElevation + 0.05, characterGroup.position.z);
        shockRingMat.opacity = 1.0;
    }

    jetParticles.forEach(p => p.mesh.visible = false);
    repulsorLight.intensity = 0.2;

    if (flightHudEl) flightHudEl.classList.remove('active');
    if (btnToggleFlight) {
        btnToggleFlight.textContent = '⚡ Iron Man [G]';
        btnToggleFlight.classList.remove('active');
    }
}

function toggleFlightMode() {
    if (isFlightMode) {
        exitFlightMode(true);
    } else {
        enterFlightMode(false);
    }
}

// UI Dialogue Speech Bubble & Modals
const speechBubbleEl = document.getElementById('speech-bubble');
const interactionPromptEl = document.getElementById('interaction-prompt');
const interactionLabelEl = document.getElementById('interaction-label');
const interactionKeyEl = document.getElementById('interaction-key');
const interactiveModalEl = document.getElementById('interactive-modal');
const modalTitleEl = document.getElementById('modal-title-text');
const modalBodyEl = document.getElementById('modal-body-text');
const modalCodePreviewEl = document.getElementById('modal-code-preview');
const modalCloseBtn = document.getElementById('modal-close-btn');

modalCloseBtn.addEventListener('click', closeModal);
function closeModal() { interactiveModalEl.classList.remove('active'); }

// Landmark 3D Reference Model Preview (Sketchfab photogrammetry embed)
const SKETCHFAB_GATEWAY_URL = 'https://sketchfab.com/models/38a652e9f3bf49039026ef65ef61ac92/embed';
const landmarkModalEl = document.getElementById('landmark-modal');
const landmarkBackdropEl = document.getElementById('landmark-modal-backdrop');
const landmarkIframeContainer = document.getElementById('landmark-iframe-container');
const landmarkCloseBtn = document.getElementById('landmark-close-btn');
const btnLandmarkPreview = document.getElementById('btn-landmark-preview');

function openLandmarkModal() {
    if (!landmarkModalEl) return;
    // Inject iframe on-demand to prevent unnecessary network, GPU, and memory consumption on mobile/idle
    if (!landmarkIframeContainer.querySelector('iframe')) {
        const iframe = document.createElement('iframe');
        iframe.title = 'Gateway of India 3D Model Preview';
        iframe.frameBorder = '0';
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.allow = 'autoplay; fullscreen; xr-spatial-tracking';
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('mozallowfullscreen', 'true');
        iframe.setAttribute('webkitallowfullscreen', 'true');
        iframe.src = SKETCHFAB_GATEWAY_URL;
        landmarkIframeContainer.appendChild(iframe);
    }
    landmarkModalEl.classList.add('active');
    if (landmarkBackdropEl) landmarkBackdropEl.classList.add('active');
}

function closeLandmarkModal() {
    if (!landmarkModalEl) return;
    landmarkModalEl.classList.remove('active');
    if (landmarkBackdropEl) landmarkBackdropEl.classList.remove('active');
    // Clear iframe from DOM immediately so WebGL context, audio, and network sockets are released
    landmarkIframeContainer.innerHTML = '';
}

if (landmarkCloseBtn) landmarkCloseBtn.addEventListener('click', closeLandmarkModal);
if (landmarkBackdropEl) landmarkBackdropEl.addEventListener('click', closeLandmarkModal);
if (btnLandmarkPreview) btnLandmarkPreview.addEventListener('click', openLandmarkModal);

// Fast Travel Teleport System
function teleportTo(targetX, targetZ, label, targetY = 0) {
    if (isFlightMode) exitFlightMode(false);
    if (activeVehicle) dismountVehicle();
    const fade = document.getElementById('fade-overlay');
    fade.style.opacity = '1';
    playSound('chime');

    setTimeout(() => {
        currentFloorElevation = targetY;
        window.__currentFloorElevation = currentFloorElevation;
        characterGroup.position.set(targetX, targetY, targetZ);
        characterGroup.rotation.y = 0;
        camera.position.set(targetX, targetY + 7.5, targetZ - 14);
        camera.lookAt(targetX, targetY + 2, targetZ + 4);
        fade.style.opacity = '0';
    }, 400);
}

document.getElementById('btn-tp-gateway').addEventListener('click', () => teleportTo(0, -6, 'Gateway', 0));
document.getElementById('btn-tp-home').addEventListener('click', () => teleportTo(0, 122, 'Home HQ', 0));
document.getElementById('btn-tp-school').addEventListener('click', () => teleportTo(poiSchool.x, poiSchool.z - 16, 'School', 0));
document.getElementById('btn-tp-college').addEventListener('click', () => teleportTo(48, 34, 'DMCE College', 0));
const btnTpStark = document.getElementById('btn-tp-stark');
if (btnTpStark) btnTpStark.addEventListener('click', () => teleportTo(0, 122, 'Home HQ', 0));

// Stark Tower Turbo-Lift Modal Controller
const starkElevatorModalEl = document.getElementById('stark-elevator-modal');
const elevatorCloseBtnEl = document.getElementById('elevator-close-btn');

function openElevatorModal() {
    if (starkElevatorModalEl) starkElevatorModalEl.classList.add('active');
}

function closeElevatorModal() {
    if (starkElevatorModalEl) starkElevatorModalEl.classList.remove('active');
}

if (elevatorCloseBtnEl) elevatorCloseBtnEl.addEventListener('click', closeElevatorModal);

const floorAltitudes = [0, 40, 80, 120];
const floorNames = [
    "Grand Entrance Lobby (0m)",
    "Residential Penthouse (40m)",
    "Cybersecurity Lab (80m)",
    "Rooftop Flight Deck (120m)"
];

function teleportToFloor(floorIndex) {
    closeElevatorModal();
    let alt = 0;
    if (floorIndex === 4 || floorIndex === 3) alt = 120;
    else if (floorIndex === 2) alt = 80;
    else if (floorIndex === 1) alt = 40;
    else if (floorIndex === 0) alt = 0;
    else if (floorAltitudes[floorIndex] !== undefined) alt = floorAltitudes[floorIndex];
    if (isFlightMode) exitFlightMode(false);
    if (activeVehicle) dismountVehicle();
    const fade = document.getElementById('fade-overlay');
    fade.style.opacity = '1';
    playSound('chime');

    setTimeout(() => {
        currentFloorElevation = alt;
        window.__currentFloorElevation = currentFloorElevation;
        characterGroup.position.set(0, alt, 144);
        characterGroup.rotation.set(0, Math.PI, 0); // Face South toward interior
        camera.position.set(0, alt + 7.5, 144 - 14);
        camera.lookAt(0, alt + 2, 144 + 4);
        fade.style.opacity = '0';
    }, 450);
}

document.querySelectorAll('.floor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const fIdx = parseInt(btn.getAttribute('data-floor'), 10);
        teleportToFloor(fIdx);
    });
});

// Vehicle Speedometer HUD
const speedoCard = document.getElementById('speedo-card');
const speedoMode = document.getElementById('speedo-mode');
const speedoVal = document.getElementById('speedo-val');

function toggleVehicleMount() {
    if (isFlightMode) exitFlightMode(false);
    if (activeVehicle) {
        dismountVehicle();
    } else {
        // Proximity check for Bike
        const dBike = characterGroup.position.distanceTo(bikeVehicle.mesh.position);
        if (dBike < 4.5) {
            mountVehicle(bikeVehicle);
            return;
        }

        // Proximity check for Sports Car
        const dCar = characterGroup.position.distanceTo(carVehicle.mesh.position);
        if (dCar < 5.0) {
            mountVehicle(carVehicle);
            return;
        }

        // Proximity check for Kaali-Peeli Auto-Rickshaw
        if (rickshawVehicle && rickshawVehicle.mesh) {
            const dRick = characterGroup.position.distanceTo(rickshawVehicle.mesh.position);
            if (dRick < 4.8) {
                mountVehicle(rickshawVehicle);
                return;
            }
        }

        // Proximity check for Train
        if (trainState.coach1) {
            const p = characterGroup.position;
            const d1 = p.distanceTo(trainState.coach1.position);
            const d2 = p.distanceTo(trainState.coach2.position);
            const d3 = p.distanceTo(trainState.coach3.position);
            if (d1 < 5.5 || d2 < 5.5 || d3 < 5.5) {
                mountTrain();
                return;
            }
        }
    }
}

function mountVehicle(v) {
    activeVehicle = v;
    speedoCard.style.display = 'flex';
    if (v.type === 'bike') {
        speedoMode.textContent = '🏍️ CYBER BIKE';
        characterGroup.visible = true;
        characterGroup.position.set(0, 0.45, -0.2);
        characterGroup.rotation.set(0, 0, 0);
        v.mesh.add(characterGroup);
    } else if (v.type === 'rickshaw') {
        speedoMode.textContent = '🛺 KAALI-PEELI AUTO';
        characterGroup.visible = true;
        characterGroup.position.set(0, 0.42, 0.15);
        characterGroup.rotation.set(0, 0, 0);
        v.mesh.add(characterGroup);
    } else {
        speedoMode.textContent = '🚗 CYBER CAR';
        characterGroup.visible = true;
        characterGroup.position.set(0.4, 0.4, -0.3);
        characterGroup.rotation.set(0, 0, 0);
        v.mesh.add(characterGroup);
    }
    playSound('engine');
}

function mountTrain() {
    activeVehicle = 'train';
    trainState.coach1.add(characterGroup);
    characterGroup.visible = true;
    characterGroup.position.set(-1.42, 0.65, 0);
    characterGroup.rotation.set(0, -Math.PI / 2, 0);
    speedoCard.style.display = 'flex';
    speedoMode.textContent = '🚊 MUMBAI LOCAL EXPRESS';
    playSound('trainHorn');
}

function dismountVehicle() {
    if (activeVehicle === 'train') {
        activeVehicle = null;
        scene.add(characterGroup);
        const nearestZ = trainStationZ.reduce((prev, curr) => Math.abs(curr - trainState.coach1.position.z) < Math.abs(prev - trainState.coach1.position.z) ? curr : prev);
        characterGroup.position.set(-28.6, 0.65, nearestZ);
        characterGroup.rotation.set(0, Math.PI / 2, 0);
    } else if (activeVehicle) {
        const v = activeVehicle;
        activeVehicle = null;
        scene.add(characterGroup);
        characterGroup.position.set(v.mesh.position.x - 2.5, 0, v.mesh.position.z);
        characterGroup.rotation.set(0, v.rotation, 0);
    }
    speedoCard.style.display = 'none';
    playSound('chime');
}

// Proximity Interaction Triggers
let currentInteraction = null;

function handleInteraction() {
    // If near train station or train, toggle train ride
    if (currentInteraction === 'trainStation' || currentInteraction === 'trainRide') {
        if (activeVehicle === 'train') dismountVehicle();
        else mountTrain();
        return;
    }

    if (!currentInteraction) return;
    playSound('chime');

    if (currentInteraction === 'vadapav') {
        modalTitleEl.innerHTML = "🥪 Dev's Mumbai Vada Pav Cart";
        modalBodyEl.innerHTML = `
            <strong>The fuel behind every late-night coding session!</strong><br><br>
            Fresh Mumbai batata vada spiced with ginger, garlic, green chilies, and mustard seeds, golden fried in gram flour batter and served inside warm pav with fiery garlic chutney.<br><br>
            <em>"Hot code, hotter vada pavs!"</em>
        `;
        modalCodePreviewEl.style.display = 'none';
        interactiveModalEl.classList.add('active');
    } else if (currentInteraction === 'homePC') {
        modalTitleEl.innerHTML = "💻 Devarshi's Developer Workstation & Cyber HQ";
        modalBodyEl.innerHTML = `
            <strong>Personal Headquarters & Research Battlestation</strong><br>
            Custom dual curved displays, Linux terminal, and automated security penetration pipelines.
        `;
        modalCodePreviewEl.style.display = 'block';
        modalCodePreviewEl.innerHTML = `
const devarshi = {
    role: "Computer Engineer & Cybersecurity Specialist",
    education: "B.E. Computer Engineering @ DMCE",
    focus: ["Penetration Testing", "Three.js / WebGL", "DevSecOps", "Cloud Security"],
    tools: ["Linux", "Docker", "Python", "React", "Three.js", "Wireshark"],
    status: "100% OPERATIONAL — Ready for high-impact engineering roles"
};
console.log("Welcome to my Cyber Universe!");
        `;
        interactiveModalEl.classList.add('active');
    } else if (currentInteraction === 'collegeBoard') {
        modalTitleEl.innerHTML = "🎓 Datta Meghe College of Engineering (DMCE)";
        modalBodyEl.innerHTML = `
            <strong>Higher Education & Engineering Credentials:</strong><br>
            • <strong>Degree:</strong> Bachelor of Engineering (B.E.) in Computer Engineering (2019 – 2023)<br>
            • <strong>Key Coursework:</strong> Distributed Operating Systems, Network Security & Cryptography, Analysis of Algorithms, Artificial Intelligence, Database Management Systems.<br>
            • <strong>Leadership & Clubs:</strong> Cybersecurity Club Core Member, Hackathon Lead, and Open-Source Contributor.
        `;
        modalCodePreviewEl.style.display = 'none';
        interactiveModalEl.classList.add('active');
    } else if (currentInteraction === 'gatewayPreview') {
        openLandmarkModal();
    } else if (currentInteraction === 'starkElevator') {
        openElevatorModal();
        return;
    } else if (currentInteraction === 'starkBattlestation') {
        modalTitleEl.innerHTML = "🛡️ Devarshi's Cybersecurity Command Battlestation";
        modalBodyEl.innerHTML = `
            <strong>Stark Tower Cyber Command & Security Operations (Level 3 — Altitude: 80m)</strong><br><br>
            • <strong>Core Systems:</strong> Triple 49" curved displays with automated DevSecOps pipelines, container vulnerability audits, and live network telemetry.<br>
            • <strong>Active Stack:</strong> Linux Kernel, Docker, Python, Three.js/WebGL, React, Wireshark, Metasploit, Burp Suite, CI/CD Cloud Security.<br>
            • <strong>Specialization:</strong> Full-Stack Systems Engineering & Offensive/Defensive Cybersecurity Infrastructure.
        `;
        modalCodePreviewEl.style.display = 'block';
        modalCodePreviewEl.innerHTML = `
# Stark Tower Cybersecurity Terminal v4.2
[SYS_STATUS]: ALL DEFENSE MATRICES GREEN
[NETWORK]: 10 Gbps Encrypted Mesh | Zero-Trust Architecture
[CONTAINERS]: 14 Microservices Active (Kubernetes Cluster)
[PIPELINE]: SAST/DAST Automated Scanning PASSED (0 Critical Vulnerabilities)
[ARMOR_LINK]: MARK III Pod Synchronized | Arc Reactor Output: 100%
        `;
        interactiveModalEl.classList.add('active');
        return;
    } else if (currentInteraction === 'starkFlightDeck') {
        enterFlightMode(true);
        return;
    }
}

// ==========================================
// ACCURATE GPS MINI-MAP RADAR ENGINE
// ==========================================
const mapCanvas = document.getElementById('minimap-canvas');
const mapCtx = mapCanvas.getContext('2d');
const gpsCoordsEl = document.getElementById('gps-coords');
const waypointTrackerEl = document.getElementById('waypoint-tracker');
let radarAngle = 0;

function updateMiniMap(playerX, playerZ, playerRot) {
    gpsCoordsEl.textContent = `X: ${Math.round(playerX)} | Z: ${Math.round(playerZ)}`;

    // Nearest waypoint calculation across all expanded districts
    const waypoints = [
        { name: "Gateway Arch", x: 0, z: -6 },
        { name: "Home HQ (Tower)", x: 0, z: 140 },
        { name: "School", x: poiSchool.x, z: poiSchool.z },
        { name: "DMCE College", x: poiCollege.x, z: poiCollege.z },
        { name: "City Train Station", x: trainState.x, z: 16 },
        { name: "West Residential District", x: -240, z: 90 },
        { name: "East Commercial Bazaar", x: 240, z: 90 },
        { name: "North Tech Academia", x: 0, z: 340 },
        { name: "Airport District", x: 0, z: 380 }
    ];

    let nearest = waypoints[0];
    let minDist = Infinity;
    waypoints.forEach(wp => {
        const d = Math.hypot(wp.x - playerX, wp.z - playerZ);
        if (d < minDist) { minDist = d; nearest = wp; }
    });
    waypointTrackerEl.textContent = `🎯 Nearest: ${nearest.name} (${Math.round(minDist)}m)`;

    mapCtx.clearRect(0, 0, 190, 190);

    // Player-Centric Scrolling GTA Radar
    const cx = 95;
    const cy = 95;
    const radarRadius = 88;
    const scale = 0.65; // ~290m visual diameter around player

    function toMapX(wx) { return cx + (wx - playerX) * scale; }
    function toMapY(wz) { return cy - (wz - playerZ) * scale; }

    mapCtx.save();
    mapCtx.beginPath();
    mapCtx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    mapCtx.clip();

    // 1. Dark radar background
    mapCtx.fillStyle = '#090d16';
    mapCtx.fillRect(0, 0, 190, 190);

    // 2. Arabian Sea Water (South of Z = -22)
    const seaScreenY = toMapY(-22);
    if (seaScreenY < 190) {
        const seaTop = Math.max(0, seaScreenY);
        mapCtx.fillStyle = '#1e3a8a';
        mapCtx.fillRect(0, seaTop, 190, 190 - seaTop);
        mapCtx.strokeStyle = '#38bdf8';
        mapCtx.lineWidth = 1.5;
        mapCtx.beginPath();
        mapCtx.moveTo(0, seaScreenY);
        mapCtx.lineTo(190, seaScreenY);
        mapCtx.stroke();
    }

    // 3. Waterfront Promenade (Z = -22 to 10)
    mapCtx.fillStyle = '#64748b';
    mapCtx.fillRect(toMapX(-380), toMapY(10), 760 * scale, 32 * scale);

    // 4. Arterial Road Grid
    mapCtx.fillStyle = '#1e293b';
    // Marine Ave (Z = 16, width 14)
    mapCtx.fillRect(toMapX(-380), toMapY(23), 760 * scale, 14 * scale);
    // Market Street (Z = 42, width 10)
    mapCtx.fillRect(toMapX(-380), toMapY(47), 760 * scale, 10 * scale);
    // Midtown Ave (Z = 140, width 12)
    mapCtx.fillRect(toMapX(-380), toMapY(146), 760 * scale, 12 * scale);
    // Campus Cross Ave (Z = 240, width 12)
    mapCtx.fillRect(toMapX(-360), toMapY(246), 720 * scale, 12 * scale);
    // Far North Expressway (Z = 380, width 10)
    mapCtx.fillRect(toMapX(-360), toMapY(385), 720 * scale, 10 * scale);

    // North Express Avenue Spine (X = 0, Z = 16 to 480)
    mapCtx.fillRect(toMapX(-6), toMapY(480), 12 * scale, 464 * scale);
    // West Arterial (X = -180, Z = 16 to 480)
    mapCtx.fillRect(toMapX(-186), toMapY(480), 12 * scale, 464 * scale);
    // East Arterial (X = 180, Z = 16 to 480)
    mapCtx.fillRect(toMapX(174), toMapY(480), 12 * scale, 464 * scale);
    // Far West Coastal (X = -320, Z = 16 to 240)
    mapCtx.fillRect(toMapX(-325), toMapY(240), 10 * scale, 224 * scale);
    // Far East Docks (X = 320, Z = 16 to 240)
    mapCtx.fillRect(toMapX(315), toMapY(240), 10 * scale, 224 * scale);

    // Local connectors (Z = 16 to 62)
    mapCtx.fillRect(toMapX(-54), toMapY(62), 12 * scale, 46 * scale);
    mapCtx.fillRect(toMapX(42), toMapY(62), 12 * scale, 46 * scale);

    // Stark Plaza Roundabout
    mapCtx.fillStyle = '#0284c7';
    mapCtx.beginPath();
    mapCtx.arc(toMapX(0), toMapY(140), 34 * scale, 0, Math.PI * 2);
    mapCtx.fill();

    // 5. Railway Track Spline Loop
    if (trainSpline) {
        mapCtx.strokeStyle = 'rgba(249, 115, 22, 0.75)';
        mapCtx.lineWidth = 2.0;
        mapCtx.beginPath();
        for (let i = 0; i <= 64; i++) {
            const pt = trainSpline.getPointAt(i / 64);
            const mx = toMapX(pt.x);
            const my = toMapY(pt.z);
            if (i === 0) mapCtx.moveTo(mx, my);
            else mapCtx.lineTo(mx, my);
        }
        mapCtx.closePath();
        mapCtx.stroke();
    }

    // Station Platforms
    trainStationZ.forEach(sz => {
        mapCtx.fillStyle = '#38bdf8';
        mapCtx.fillRect(toMapX(-30.8), toMapY(sz + 11), 4.2 * scale, 22 * scale);
    });

    // 6. Building Footprints across City (All 68 buildings)
    cityBuildings.forEach(b => {
        const bx = toMapX(b.minX);
        const by = toMapY(b.maxZ);
        const bw = (b.maxX - b.minX) * scale;
        const bh = (b.maxZ - b.minZ) * scale;
        // Radar viewport culling
        if (bx + bw < 0 || bx > 190 || by + bh < 0 || by > 190) return;

        if (b.type === 'chawl') mapCtx.fillStyle = '#b45309';
        else if (b.type === 'apartment') mapCtx.fillStyle = '#eab308';
        else if (b.type === 'commercial') mapCtx.fillStyle = '#06b6d4';
        else if (b.type === 'corporate') mapCtx.fillStyle = '#3b82f6';
        else mapCtx.fillStyle = '#475569';
        mapCtx.fillRect(bx, by, bw, bh);
    });

    // Gateway Arch (Gold)
    mapCtx.fillStyle = '#f59e0b';
    mapCtx.fillRect(toMapX(-16), toMapY(-26), 32 * scale, 12 * scale);

    // Home HQ (Blue)
    mapCtx.fillStyle = '#2563eb';
    mapCtx.fillRect(toMapX(poiHome.x - 11), toMapY(poiHome.z + 10), 22 * scale, 20 * scale);

    // School (Purple)
    mapCtx.fillStyle = '#9333ea';
    mapCtx.fillRect(toMapX(poiSchool.x - 18), toMapY(poiSchool.z + 7), 36 * scale, 14 * scale);

    // DMCE College (Emerald)
    mapCtx.fillStyle = '#059669';
    mapCtx.fillRect(toMapX(poiCollege.x - 16), toMapY(poiCollege.z + 6), 32 * scale, 16 * scale);

    // 7. Train Coaches
    [trainState.coach1, trainState.coach2, trainState.coach3].forEach((c, idx) => {
        if (!c) return;
        const cxMap = toMapX(c.position.x);
        const cyMap = toMapY(c.position.z);
        if (Math.hypot(cxMap - cx, cyMap - cy) > radarRadius) return;
        mapCtx.save();
        mapCtx.translate(cxMap, cyMap);
        mapCtx.rotate(c.rotation.y);
        mapCtx.fillStyle = idx === 0 ? '#facc15' : '#8b5cf6';
        mapCtx.fillRect(-2.5, -4.5, 5, 9);
        mapCtx.restore();
    });

    // Parked Vehicles
    mapCtx.fillStyle = '#06b6d4';
    mapCtx.beginPath();
    mapCtx.arc(toMapX(carVehicle.mesh.position.x), toMapY(carVehicle.mesh.position.z), 4, 0, Math.PI * 2);
    mapCtx.fill();

    mapCtx.fillStyle = '#ef4444';
    mapCtx.beginPath();
    mapCtx.arc(toMapX(bikeVehicle.mesh.position.x), toMapY(bikeVehicle.mesh.position.z), 3.5, 0, Math.PI * 2);
    mapCtx.fill();

    if (rickshawVehicle && rickshawVehicle.mesh) {
        mapCtx.fillStyle = '#facc15';
        mapCtx.beginPath();
        mapCtx.arc(toMapX(rickshawVehicle.mesh.position.x), toMapY(rickshawVehicle.mesh.position.z), 3.5, 0, Math.PI * 2);
        mapCtx.fill();
    }

    // 8. Landmark Waypoint Blips (In-radar vs Clamped to Rim)
    waypoints.forEach(wp => {
        const wx = toMapX(wp.x);
        const wy = toMapY(wp.z);
        const dist = Math.hypot(wx - cx, wy - cy);
        if (dist <= radarRadius - 8) {
            mapCtx.fillStyle = '#38bdf8';
            mapCtx.beginPath();
            mapCtx.arc(wx, wy, 4, 0, Math.PI * 2);
            mapCtx.fill();
            mapCtx.strokeStyle = '#ffffff';
            mapCtx.lineWidth = 1;
            mapCtx.stroke();
        } else {
            const angle = Math.atan2(wy - cy, wx - cx);
            const rimX = cx + Math.cos(angle) * (radarRadius - 6);
            const rimY = cy + Math.sin(angle) * (radarRadius - 6);
            mapCtx.fillStyle = '#f59e0b';
            mapCtx.beginPath();
            mapCtx.arc(rimX, rimY, 3.5, 0, Math.PI * 2);
            mapCtx.fill();
        }
    });

    mapCtx.restore();

    // 9. Radar Outer Ring, Gridlines & Sweeper Arm
    mapCtx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    mapCtx.lineWidth = 2.0;
    mapCtx.beginPath();
    mapCtx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    mapCtx.stroke();

    // Range rings
    mapCtx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    mapCtx.lineWidth = 1;
    mapCtx.beginPath();
    mapCtx.arc(cx, cy, 40, 0, Math.PI * 2);
    mapCtx.arc(cx, cy, 70, 0, Math.PI * 2);
    mapCtx.stroke();

    // Rotating Radar Sweeper
    radarAngle += 0.04;
    mapCtx.save();
    mapCtx.translate(cx, cy);
    mapCtx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.moveTo(0, 0);
    mapCtx.lineTo(Math.cos(radarAngle) * (radarRadius - 2), Math.sin(radarAngle) * (radarRadius - 2));
    mapCtx.stroke();
    mapCtx.restore();

    // 10. Player Center Navigation Marker & Heading Arrow
    mapCtx.save();
    mapCtx.translate(cx, cy);
    const heading = (!isFlightMode && !activeVehicle) ? (playerRot - Math.PI) : playerRot;
    mapCtx.rotate(heading);

    // Pulsing GPS signal
    const pulse = (Date.now() % 1000) / 1000;
    mapCtx.strokeStyle = `rgba(239, 68, 68, ${1 - pulse})`;
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.arc(0, 0, 6 + pulse * 10, 0, Math.PI * 2);
    mapCtx.stroke();

    // Sharp Navigation Arrowhead
    mapCtx.fillStyle = '#ef4444';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -9);
    mapCtx.lineTo(6, 6);
    mapCtx.lineTo(0, 3);
    mapCtx.lineTo(-6, 6);
    mapCtx.closePath();
    mapCtx.fill();

    mapCtx.strokeStyle = '#ffffff';
    mapCtx.lineWidth = 1.5;
    mapCtx.stroke();
    mapCtx.restore();
}

// ==========================================
// MAIN GAME LOOP & PHYSICS UPDATE
// ==========================================
const clock = new THREE.Clock();
let walkCycle = 0;
let thunderTimer = 0;

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    // 1. Water Wave Motion
    seaMesh.position.y = -0.6 + Math.sin(time * 1.6) * 0.12;

    // 2. Weather Rain & Thunder Simulation
    if (weatherMode === 'rain' || weatherMode === 'storm') {
        const pos = rainGeom.attributes.position.array;
        for (let i = 1; i < rainCount * 3; i += 3) {
            pos[i] -= 48 * delta;
            pos[i - 1] += 8 * delta; // Wind slant
            if (pos[i] < 0) {
                pos[i] = 55;
                pos[i - 1] = (Math.random() - 0.5) * 200;
            }
        }
        rainGeom.attributes.position.needsUpdate = true;

        if (weatherMode === 'storm') {
            thunderTimer += delta;
            if (thunderTimer > 4.5 + Math.random() * 5.0) {
                thunderTimer = 0;
                playSound('thunder');
                // Thunder Flash Effect
                ambientLight.intensity = 3.5;
                sunLight.intensity = 5.0;
                setTimeout(() => {
                    ambientLight.intensity = 0.5;
                    sunLight.intensity = 0.6;
                }, 80);
            }
        }
    }

    // 3. Animated Mumbai Pedestrian Crowd (Articulated Humanoids, Waypoints & Weather Reactivity)
    const isRaining = (weatherMode === 'rain' || weatherMode === 'storm');
    npcs.forEach(npc => {
        const target = npc.waypoints[npc.wpIdx];
        const toTarget = new THREE.Vector2(target.x - npc.group.position.x, target.z - npc.group.position.z);
        const dist = toTarget.length();

        if (dist < 0.6) {
            npc.wpIdx = (npc.wpIdx + 1) % npc.waypoints.length;
        } else {
            toTarget.normalize();
            npc.group.position.x += toTarget.x * npc.speed * delta;
            npc.group.position.z += toTarget.y * npc.speed * delta;

            const targetRot = Math.atan2(toTarget.x, toTarget.y);
            let diff = (targetRot - npc.group.rotation.y) % (Math.PI * 2);
            if (diff < -Math.PI) diff += Math.PI * 2;
            if (diff > Math.PI) diff -= Math.PI * 2;
            npc.group.rotation.y += diff * 0.15;
        }

        // Articulated Walk Kinematics (Leg and Arm Swings)
        npc.walkCycle += delta * npc.speed * 4.4;
        const swing = Math.sin(npc.walkCycle);
        npc.legL.rotation.x = -swing * 0.52;
        npc.legR.rotation.x = swing * 0.52;
        npc.group.position.y = Math.abs(Math.sin(npc.walkCycle * 2)) * 0.06;

        // Dynamic Weather-Reactive Umbrellas
        npc.umbrellaGroup.visible = isRaining;
        if (isRaining) {
            npc.armR.rotation.x = -Math.PI / 3;
            npc.armR.rotation.z = -0.15;
            npc.armL.rotation.x = swing * 0.35;
        } else {
            npc.armL.rotation.x = swing * 0.45;
            npc.armR.rotation.x = -swing * 0.45;
            npc.armR.rotation.z = 0;
        }
    });

    // 4. Mumbai Suburban Local Train Simulation (Articulated EMU Rake on Broad Gauge Spline Loop)
    if (trainSpline && stationSchedule.length > 0 && trainState.coach1) {
        const targetStop = stationSchedule[trainState.targetStationIdx];
        let distS = targetStop.s - trainState.progress;
        if (distS < 0) distS += 1.0;
        const distM = distS * trainState.splineLength;

        if (trainState.isDwelling) {
            trainState.dwellTimer += delta;
            trainState.speed = 0;
            if (trainState.dwellTimer > 3.8 && !trainState.hornPlayed) {
                playSound('trainHorn');
                trainState.hornPlayed = true;
            }
            if (trainState.dwellTimer >= 5.0) {
                trainState.isDwelling = false;
                trainState.dwellTimer = 0;
                trainState.hornPlayed = false;
                trainState.targetStationIdx = (trainState.targetStationIdx + 1) % stationSchedule.length;
            }
        } else {
            if (distM < 16.0) {
                const targetSpeed = Math.max(1.5, (distM / 16.0) * trainState.maxSpeed);
                trainState.speed = THREE.MathUtils.lerp(trainState.speed, targetSpeed, 0.08);
                if (distM < 0.4 || distM > trainState.splineLength - 1.0) {
                    trainState.progress = targetStop.s;
                    trainState.speed = 0;
                    trainState.isDwelling = true;
                    trainState.dwellTimer = 0;
                    trainState.hornPlayed = false;
                    playSound('chime');
                }
            } else {
                trainState.speed = THREE.MathUtils.lerp(trainState.speed, trainState.maxSpeed, 0.05);
            }
            trainState.progress = (trainState.progress + (trainState.speed * delta) / trainState.splineLength) % 1.0;
        }

        // Articulated Carriage Kinematics along Spline Loop
        const deltaS = 6.8 / trainState.splineLength;
        const s1 = trainState.progress;
        const s2 = (trainState.progress - deltaS + 1.0) % 1.0;
        const s3 = (trainState.progress - deltaS * 2 + 1.0) % 1.0;

        const p1 = trainSpline.getPointAt(s1);
        const t1 = trainSpline.getTangentAt(s1);
        trainState.coach1.position.copy(p1);
        trainState.coach1.rotation.y = Math.atan2(t1.x, t1.z);

        const p2 = trainSpline.getPointAt(s2);
        const t2 = trainSpline.getTangentAt(s2);
        trainState.coach2.position.copy(p2);
        trainState.coach2.rotation.y = Math.atan2(t2.x, t2.z);

        const p3 = trainSpline.getPointAt(s3);
        const t3 = trainSpline.getTangentAt(s3);
        trainState.coach3.position.copy(p3);
        trainState.coach3.rotation.y = Math.atan2(t3.x, t3.z);

        trainState.x = p1.x;
        trainState.z = p1.z;
    }

    // 5. Superhero Iron Man Landing Sequence
    if (isFlyingIn) {
        characterGroup.position.y -= initialDropSpeed * delta;
        characterGroup.position.z = THREE.MathUtils.lerp(characterGroup.position.z, -6, 0.04);

        // Repulsor particles
        jetParticles.forEach(p => {
            p.mesh.visible = true;
            p.mesh.position.set(p.offset + (Math.random() - 0.5) * 0.2, -0.2 - Math.random() * 0.9, (Math.random() - 0.5) * 0.2);
        });

        // Touchdown: Superhero 3-point landing!
        if (characterGroup.position.y <= 0) {
            characterGroup.position.y = 0;
            characterGroup.position.z = -6;
            characterGroup.rotation.y = 0;
            isFlyingIn = false;

            // Landing thud & shockwave
            playSound('landing');
            shockwaveActive = true;
            shockwaveScale = 0.5;
            shockRing.position.set(characterGroup.position.x, 0.05, characterGroup.position.z);
            shockRingMat.opacity = 1.0;

            // Transition: suit down to casual techwear chibi model
            setTimeout(() => {
                ironManSuit.visible = false;
                if (casualMeshRoot) casualMeshRoot.visible = true;
                jetParticles.forEach(p => p.mesh.visible = false);
                repulsorLight.intensity = 0.2;

                // Speech greeting popup
                speechBubbleEl.classList.add('visible');
                setTimeout(() => speechBubbleEl.classList.remove('visible'), 7000);
            }, 800);
        }
    } else {
        // Shockwave expansion
        if (shockwaveActive) {
            shockwaveScale += delta * 12;
            shockRing.scale.set(shockwaveScale, shockwaveScale, 1);
            shockRingMat.opacity -= delta * 1.8;
            if (shockRingMat.opacity <= 0) shockwaveActive = false;
        }

        // ==========================================
        // ACTIVE ACTOR CONTROLS & CAMERA
        // ==========================================
        if (isFlightMode) {
            // ==========================================
            // IRON MAN 3D 6-DOF SUPERHERO FLIGHT ENGINE
            // ==========================================
            const isBoosting = keys.shift;

            // 1. Yaw & Steering Control
            const turnRate = (isBoosting ? 1.6 : 2.4);
            if (keys.a) flightHeading += turnRate * delta;
            if (keys.d) flightHeading -= turnRate * delta;

            // 2. Roll Banking (into turns)
            let targetRoll = 0;
            if (keys.a) targetRoll = isBoosting ? 0.65 : 0.45;
            if (keys.d) targetRoll = isBoosting ? -0.65 : -0.45;
            flightRoll = THREE.MathUtils.lerp(flightRoll, targetRoll, 0.12);

            // 3. Thrust & Speed
            let targetForward = 0;
            if (keys.w) targetForward = isBoosting ? 68.0 : 34.0;
            else if (keys.s) targetForward = -12.0; // Airbrake / Reverse

            flightSpeed = THREE.MathUtils.lerp(flightSpeed, targetForward, delta * (keys.w ? 3.5 : 2.5));

            // 4. Vertical Ascent / Dive Control
            let vertInput = 0;
            if (keys.space) vertInput += 1;
            if (keys.c || keys.ctrl) vertInput -= 1;

            const targetVertSpeed = vertInput * (isBoosting ? 38.0 : 20.0);
            flightVertSpeed = THREE.MathUtils.lerp(flightVertSpeed, targetVertSpeed, delta * 4.0);

            // 5. Pitch Kinematics
            const forwardPitchRatio = THREE.MathUtils.clamp(flightSpeed / 68.0, 0, 1);
            const cruisePitch = -forwardPitchRatio * (isBoosting ? (Math.PI * 0.44) : (Math.PI * 0.28));
            const vertPitchOffset = (flightVertSpeed / 38.0) * (Math.PI * 0.22);
            const targetPitch = cruisePitch + vertPitchOffset;
            flightPitch = THREE.MathUtils.lerp(flightPitch, targetPitch, 0.1);

            // 6. Kinematic Displacement
            const fwdX = Math.sin(flightHeading);
            const fwdZ = Math.cos(flightHeading);
            characterGroup.position.x += fwdX * flightSpeed * delta;
            characterGroup.position.z += fwdZ * flightSpeed * delta;
            characterGroup.position.y += flightVertSpeed * delta;

            // Hover floating bobbing when idle in air
            if (!keys.w && !keys.s && vertInput === 0) {
                flightBobTimer += delta * 3.2;
                characterGroup.position.y += Math.sin(flightBobTimer) * 0.04 * delta * 20;
            }

            // 7. World Clamps & Altitude Bounds (Allow full oceanic flight down to Z = -380)
            characterGroup.position.x = THREE.MathUtils.clamp(characterGroup.position.x, -390, 390);
            characterGroup.position.z = THREE.MathUtils.clamp(characterGroup.position.z, -380, 524);
            const minFlyY = (characterGroup.position.z < -20) ? 0.6 : 0.2;
            characterGroup.position.y = THREE.MathUtils.clamp(characterGroup.position.y, minFlyY, 320);

            // 8. Dynamic 3D Building Collisions
            resolveCollision(characterGroup.position, 1.0);

            // 9. Character Group Rotations
            characterGroup.rotation.y = flightHeading;
            characterGroup.rotation.x = flightPitch;
            characterGroup.rotation.z = flightRoll;

            // 10. Repulsor Flame Particles & Lighting
            repulsorLight.intensity = isBoosting ? 14.0 : 6.0;
            repulsorLight.color.setHex(isBoosting ? 0x60a5fa : 0x00f2fe);
            const trailLen = isBoosting ? 2.2 : 1.1;
            jetParticles.forEach((p) => {
                p.mesh.visible = true;
                const px = p.offset + (Math.random() - 0.5) * 0.12;
                const py = -0.2 - Math.random() * (isBoosting ? 1.8 : 0.85);
                const pz = (Math.random() - 0.5) * 0.15 - Math.random() * trailLen;
                p.mesh.position.set(px, py, pz);
            });

            // 11. Audio Modulation
            updateFlightAudio(flightSpeed, isBoosting);

            // 12. Touchdown / Landing Detection (Helipad, Any Building Rooftop, or Ground)
            const surfaceY = getSurfaceElevationAt(characterGroup.position.x, characterGroup.position.z);
            if (surfaceY > 0 && characterGroup.position.y >= surfaceY - 1.8) {
                currentFloorElevation = surfaceY;
            } else {
                currentFloorElevation = 0;
            }
            window.__currentFloorElevation = currentFloorElevation;

            if (characterGroup.position.y <= currentFloorElevation + 0.35 && (flightVertSpeed < -1.5 || keys.c)) {
                exitFlightMode(true);
            }

            // 13. Dynamic Aerodynamic Chase Camera
            if (cameraMode === 'chase' || cameraMode === 'cinematic') {
                const followDist = isBoosting ? 22.0 : 16.0;
                const followHeight = (cameraMode === 'cinematic' ? 3.0 : 4.5);
                const camTargetX = characterGroup.position.x - fwdX * followDist;
                const camTargetZ = characterGroup.position.z - fwdZ * followDist;
                const camTargetY = characterGroup.position.y + followHeight;

                camera.position.x = THREE.MathUtils.lerp(camera.position.x, camTargetX, 0.12);
                camera.position.z = THREE.MathUtils.lerp(camera.position.z, camTargetZ, 0.12);
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, camTargetY, 0.12);
                camera.lookAt(characterGroup.position.x + fwdX * 16, characterGroup.position.y + (cameraMode === 'cinematic' ? 2.5 : 0), characterGroup.position.z + fwdZ * 16);

                camera.fov = THREE.MathUtils.lerp(camera.fov, isBoosting ? 66 : 52, 0.08);
                camera.updateProjectionMatrix();
            }

            // 14. Flight HUD Telemetry Update
            if (flightHudEl) {
                const speedKmh = Math.round(Math.abs(flightSpeed) * 3.6);
                flightSpdVal.textContent = speedKmh;
                flightMachVal.textContent = "MACH " + (speedKmh / 1235).toFixed(2);
                flightAltVal.textContent = characterGroup.position.y.toFixed(1);
                flightAglVal.textContent = "AGL: " + Math.max(0, characterGroup.position.y - currentFloorElevation).toFixed(1) + " M";
                flightClimbVal.textContent = "V/S: " + (flightVertSpeed > 0 ? "+" : "") + flightVertSpeed.toFixed(1) + " M/S";

                const deg = Math.round(((flightHeading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * (180 / Math.PI));
                const cardinal = deg < 22 ? 'N' : deg < 67 ? 'NE' : deg < 112 ? 'E' : deg < 157 ? 'SE' : deg < 202 ? 'S' : deg < 247 ? 'SW' : deg < 292 ? 'W' : deg < 337 ? 'NW' : 'N';
                flightHeadingVal.textContent = "HDG: " + String(deg).padStart(3, '0') + "° " + cardinal;

                flightBoostBar.style.width = isBoosting ? '100%' : (keys.w ? '60%' : '20%');
            }

            updateMiniMap(characterGroup.position.x, characterGroup.position.z, characterGroup.rotation.y);
            checkProximity();
        } else if (activeVehicle === 'train') {
            // Train Passenger Mode: calculate real speed in km/h
            speedoVal.textContent = Math.round(trainState.isDwelling ? 0 : (trainState.speed * 3.6));

            if (cameraMode === 'chase' || cameraMode === 'cinematic') {
                const c1 = trainState.coach1;
                camera.position.x = THREE.MathUtils.lerp(camera.position.x, c1.position.x - 12, 0.08);
                camera.position.z = THREE.MathUtils.lerp(camera.position.z, c1.position.z - 8, 0.08);
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, 6.5, 0.08);
                camera.lookAt(c1.position.x, 2.5, c1.position.z + 4);
            }

            updateMiniMap(trainState.coach1.position.x, trainState.coach1.position.z, trainState.coach1.rotation.y);
            checkTrainProximity();
        } else if (activeVehicle) {
            // Bike, Auto-Rickshaw, or Sports Car Physics
            const v = activeVehicle;
            const isCar = (v.type === 'car');
            const isRickshaw = (v.type === 'rickshaw');
            const turnSpeed = isCar ? 1.8 : (isRickshaw ? 2.2 : 2.5);

            // Acceleration & Braking
            if (keys.w) v.speed = THREE.MathUtils.lerp(v.speed, v.maxSpeed, 0.04);
            else if (keys.s) v.speed = THREE.MathUtils.lerp(v.speed, -10, 0.05);
            else v.speed = THREE.MathUtils.lerp(v.speed, 0, 0.06);

            // Steering: 'D' steers Right (clockwise / positive X offset), 'A' steers Left (counter-clockwise)
            if (keys.d) v.rotation += turnSpeed * delta * (v.speed >= 0 ? 1 : -1);
            if (keys.a) v.rotation -= turnSpeed * delta * (v.speed >= 0 ? 1 : -1);

            v.mesh.position.x += Math.sin(v.rotation) * v.speed * delta;
            v.mesh.position.z += Math.cos(v.rotation) * v.speed * delta;
            v.mesh.rotation.y = v.rotation;

            // Tilt & Drift roll for single-track motorbike
            if (v.type === 'bike') {
                const targetRoll = keys.d ? -0.25 : (keys.a ? 0.25 : 0);
                v.mesh.rotation.z = THREE.MathUtils.lerp(v.mesh.rotation.z, targetRoll, 0.2);
            }

            // Spin vehicle wheels
            if (v.wheels && v.wheels.length > 0) {
                v.wheels.forEach(w => w.rotation.x += v.speed * delta * 2.0);
            }

            // Resolve vehicle collisions against world obstacles
            resolveCollision(v.mesh.position, isCar ? 1.6 : (isRickshaw ? 1.25 : 0.85));

            // Speedometer update
            speedoVal.textContent = Math.round(Math.abs(v.speed * 3.6));

            // Camera follow vehicle
            if (cameraMode === 'chase' || cameraMode === 'cinematic') {
                const followDist = isCar ? 14 : 11;
                const camElevation = isCar ? 6.2 : 5.5;
                camera.position.x = THREE.MathUtils.lerp(camera.position.x, v.mesh.position.x - Math.sin(v.rotation) * followDist, 0.1);
                camera.position.z = THREE.MathUtils.lerp(camera.position.z, v.mesh.position.z - Math.cos(v.rotation) * followDist, 0.1);
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, camElevation, 0.1);
                camera.lookAt(v.mesh.position.x, 1.8, v.mesh.position.z + Math.cos(v.rotation) * 4);
            }

            updateMiniMap(v.mesh.position.x, v.mesh.position.z, v.rotation);
            checkVehicleProximity(v);
        } else {
            // Free On-Foot Character Movement (Camera-Relative)
            const isSprinting = keys.shift;
            const moveSpeed = isSprinting ? 16.0 : 9.0;

            // Extract canonical horizontal camera vectors (screen-space relative)
            const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            camRight.y = 0;
            if (camRight.lengthSq() < 0.001) camRight.set(1, 0, 0);
            else camRight.normalize();

            const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            camForward.y = 0;
            if (camForward.lengthSq() < 0.001) camForward.set(0, 0, 1);
            else camForward.normalize();

            // Synthesize camera-relative input vector
            const inputVec = new THREE.Vector3();
            if (keys.w) inputVec.add(camForward);
            if (keys.s) inputVec.sub(camForward);
            if (keys.d) inputVec.add(camRight);
            if (keys.a) inputVec.sub(camRight);

            const moving = inputVec.lengthSq() > 0.001;
            if (moving) {
                inputVec.normalize();

                // Kinematic displacement
                characterGroup.position.x += inputVec.x * moveSpeed * delta;
                characterGroup.position.z += inputVec.z * moveSpeed * delta;

                // Character facing: Math.atan2(x, z) + Math.PI aligns the visual front
                // with the forward velocity vector (fixing the 180-degree moonwalk defect)
                const targetRot = Math.atan2(inputVec.x, inputVec.z) + Math.PI;
                let diff = (targetRot - characterGroup.rotation.y) % (Math.PI * 2);
                if (diff < -Math.PI) diff += Math.PI * 2;
                if (diff > Math.PI) diff -= Math.PI * 2;
                characterGroup.rotation.y += diff * 0.25;

                walkCycle += delta * (isSprinting ? 18 : 12);
                if (characterGroup.position.y > currentFloorElevation + 0.6) {
                    characterGroup.position.y = THREE.MathUtils.lerp(characterGroup.position.y, currentFloorElevation, 0.16);
                } else {
                    characterGroup.position.y = currentFloorElevation + Math.abs(Math.sin(walkCycle)) * 0.18;
                }
            } else {
                characterGroup.position.y = THREE.MathUtils.lerp(characterGroup.position.y, currentFloorElevation, 0.2);
            }

            // Rooftop Edge-Drop / Vertical Gravity Step Detection
            if (currentFloorElevation > 0) {
                const surfaceY = getSurfaceElevationAt(characterGroup.position.x, characterGroup.position.z);
                if (surfaceY < currentFloorElevation - 0.8) {
                    currentFloorElevation = surfaceY;
                }
            }

            // Spacebar Thruster Hover Boost
            if (keys.space) {
                characterGroup.position.y = THREE.MathUtils.lerp(characterGroup.position.y, currentFloorElevation + 4.2, 0.1);
                repulsorLight.intensity = 4.2;
                jetParticles.forEach(p => {
                    p.mesh.visible = true;
                    p.mesh.position.set(p.offset, -0.3 - Math.random() * 0.6, (Math.random() - 0.5) * 0.2);
                });
            } else if (!isFlyingIn) {
                repulsorLight.intensity = 0.2;
                jetParticles.forEach(p => p.mesh.visible = false);
            }

            // Resolve character collision against all world colliders & boundaries
            resolveCollision(characterGroup.position, 0.6);

            // Elevated 3rd-person Panoramic Follow Camera (Open World RPG Style)
            if (cameraMode === 'chase') {
                camera.position.x = THREE.MathUtils.lerp(camera.position.x, characterGroup.position.x, 0.08);
                camera.position.z = THREE.MathUtils.lerp(camera.position.z, characterGroup.position.z - 14, 0.08);
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, characterGroup.position.y + 7.5, 0.08);
                camera.lookAt(characterGroup.position.x, characterGroup.position.y + 2.0, characterGroup.position.z + 4);
            } else if (cameraMode === 'cinematic') {
                // Skyscraper & landmark low-angle cinematic panoramic framing
                camera.position.x = THREE.MathUtils.lerp(camera.position.x, characterGroup.position.x, 0.08);
                camera.position.z = THREE.MathUtils.lerp(camera.position.z, characterGroup.position.z - 34, 0.08);
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, characterGroup.position.y + 4.5, 0.08);
                camera.lookAt(characterGroup.position.x, characterGroup.position.y + 60.0, characterGroup.position.z + 30);
            }

            updateMiniMap(characterGroup.position.x, characterGroup.position.z, characterGroup.rotation.y);
            checkProximity();
        }
    }

    if (atcRadarDish) atcRadarDish.rotation.y += delta * 1.8;
    maritimeFerryBoats.forEach(b => {
        b.group.position.y = -0.4 + Math.sin(time * 1.4 + b.phase) * 0.12;
        b.group.rotation.z = Math.sin(time * 1.1 + b.phase) * 0.04;
        b.group.rotation.x = Math.cos(time * 0.9 + b.phase) * 0.03;
    });

    if (cameraMode === 'orbit') orbitControls.update();

    updateSpeechBubble();
    renderer.render(scene, camera);
}

function updateSpeechBubble() {
    if (!speechBubbleEl.classList.contains('visible')) return;
    const pos = characterGroup.position.clone();
    pos.y += 2.8;
    pos.project(camera);

    const sx = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-(pos.y * 0.5) + 0.5) * window.innerHeight;
    speechBubbleEl.style.left = `${sx}px`;
    speechBubbleEl.style.top = `${sy}px`;
}

// Proximity Check Handlers
function checkProximity() {
    currentInteraction = null;
    const p = characterGroup.position;

    // 0. Check Gateway of India Arch (At X: 0, Z: -32)
    if (p.distanceTo(new THREE.Vector3(0, 0, -32)) < 22) {
        currentInteraction = 'gatewayPreview';
        showPrompt('E', 'Preview Gateway 3D Model 🏛️');
        return;
    }

    // 1. Check Vada Pav Cart
    if (p.distanceTo(new THREE.Vector3(poiVadaPav.x, 0, poiVadaPav.z)) < poiVadaPav.radius) {
        currentInteraction = 'vadapav';
        showPrompt('E', 'Order Vada Pav 🥪');
        return;
    }

    // 2. Check DMCE College Board
    if (p.distanceTo(new THREE.Vector3(poiCollege.x, 0, poiCollege.z - 10)) < 18) {
        currentInteraction = 'collegeBoard';
        showPrompt('E', 'Inspect DMCE College 🎓');
        return;
    }

    // 5. Check Cyber Bike
    if (p.distanceTo(bikeVehicle.mesh.position) < 4.5) {
        showPrompt('F', 'Ride Cyber Motorbike 🏍️');
        return;
    }

    // 6. Check Cyber Sports Car
    if (p.distanceTo(carVehicle.mesh.position) < 5.0) {
        showPrompt('F', 'Drive Cyber Sports Car 🚗');
        return;
    }

    // 6b. Check Kaali-Peeli Auto-Rickshaw
    if (rickshawVehicle && rickshawVehicle.mesh && p.distanceTo(rickshawVehicle.mesh.position) < 4.8) {
        showPrompt('F', 'Drive Kaali-Peeli Auto 🛺');
        return;
    }

    // 7. Check Mumbai Local EMU Train
    if (trainState.coach1) {
        const d1 = p.distanceTo(trainState.coach1.position);
        const d2 = p.distanceTo(trainState.coach2.position);
        const d3 = p.distanceTo(trainState.coach3.position);
        if (d1 < 5.5 || d2 < 5.5 || d3 < 5.5) {
            currentInteraction = 'trainRide';
            showPrompt('E', 'Board Mumbai Local Train 🚊');
            return;
        }
    }

    // 8. Check Home HQ Elevator Bank (on any of the 4 floors near X=0, Z=146.5)
    if (Math.abs(p.x) < 4.2 && Math.abs(p.z - 146.5) < 3.5) {
        currentInteraction = 'starkElevator';
        showPrompt('E', 'Call Home HQ Turbo-Lift ⚡');
        return;
    }

    // 9. Check Home HQ Level 3 Cybersecurity Battlestation (Y ~ 80, X=0, Z=136)
    if (p.y >= 75 && p.y <= 85 && Math.abs(p.x) < 3.8 && Math.abs(p.z - 136) < 3.8) {
        currentInteraction = 'starkBattlestation';
        showPrompt('E', 'Access DevSecOps Terminal 🛡️');
        return;
    }

    // 10. Check Home HQ Level 4 Rooftop Flight Deck (Y ~ 120, X=0, Z=126)
    if (p.y >= 115 && p.y <= 125 && Math.abs(p.x) < 7.0 && Math.abs(p.z - 126) < 7.0) {
        currentInteraction = 'starkFlightDeck';
        showPrompt('E', 'Launch Iron Man Flight ⚡');
        return;
    }

    hidePrompt();
}

function checkVehicleProximity(v) {
    const vName = v.type === 'bike' ? 'Bike' : (v.type === 'rickshaw' ? 'Auto 🛺' : 'Car');
    showPrompt('F', `Dismount ${vName} ⏹️`);
}

function checkTrainProximity() {
    showPrompt('E', 'Dismount Train at Station ⏹️');
}

function showPrompt(key, text) {
    interactionKeyEl.textContent = key;
    interactionLabelEl.textContent = text;
    interactionPromptEl.classList.add('show');
}

function hidePrompt() {
    currentInteraction = null;
    interactionPromptEl.classList.remove('show');
}

// Initial Boot
updateTimeOfDay('sunset');
animate();

// Verification & Automated Test Hooks
window.__trainState = trainState;
window.__trainSpline = trainSpline;
window.__stationSchedule = stationSchedule;
window.__mountTrain = mountTrain;
window.__dismountVehicle = dismountVehicle;
window.__checkProximity = checkProximity;
window.__handleInteraction = handleInteraction;
window.__renderer = renderer;
window.__characterGroup = characterGroup;
window.__camera = camera;
window.__npcs = npcs;
window.__resolveCollision = resolveCollision;
window.__bikeVehicle = bikeVehicle;
window.__carVehicle = carVehicle;
window.__getActiveVehicle = () => activeVehicle;
window.__setWeatherMode = (m) => { weatherMode = m; };
window.__setCameraMode = (m) => { cameraMode = m; orbitControls.enabled = (m === 'orbit'); };
window.__starkTower = {
    teleportToFloor,
    floorAltitudes,
    floorNames,
    openElevatorModal,
    closeElevatorModal
};
window.__isFlightMode = () => isFlightMode;
window.__getIsFlightMode = () => isFlightMode;
window.__enterFlightMode = enterFlightMode;
window.__exitFlightMode = exitFlightMode;
window.__toggleFlightMode = toggleFlightMode;
window.__flightSpeed = () => flightSpeed;
window.__flightVertSpeed = () => flightVertSpeed;
window.__flightPitch = () => flightPitch;
window.__flightRoll = () => flightRoll;
window.__flightHeading = () => flightHeading;
window.__keys = keys;
window.__updateMiniMap = updateMiniMap;
window.__poiSchool = poiSchool;
window.__rickshawVehicle = rickshawVehicle;
window.__maritimeFerryBoats = maritimeFerryBoats;
window.__atcRadarDish = atcRadarDish;
window.__worldColliders = worldColliders;

// Responsive Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
