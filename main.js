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

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 3000);
// Initial position behind the character landing spot, looking forward into the open world city
camera.position.set(0, 7.5, -18);

const isMobileDevice = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || (window.innerWidth <= 768);
const getOptimalPixelRatio = () => isMobileDevice ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 1.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(getOptimalPixelRatio());
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
// LEVEL OF DETAIL (LOD) & DISTANCE CULLING SYSTEM
// ==========================================
const lodRegistry = [];

function registerLODItem(meshOrGroup, nearDist = 0, farDist = 200) {
    if (!meshOrGroup) return;
    lodRegistry.push({
        target: meshOrGroup,
        nearDist,
        farDist,
        isVisible: true
    });
}

function updateLevelOfDetail(camPos) {
    if (!camPos) return;
    for (let i = 0; i < lodRegistry.length; i++) {
        const item = lodRegistry[i];
        const obj = item.target;
        if (!obj) continue;
        const dist = camPos.distanceTo(obj.position);
        const shouldBeVisible = (dist >= item.nearDist && dist <= item.farDist);
        if (obj.visible !== shouldBeVisible) {
            obj.visible = shouldBeVisible;
        }
    }
}
window.__lodRegistry = lodRegistry;
window.__registerLODItem = registerLODItem;

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
const btnWeather = document.getElementById('btn-toggle-weather');
if (btnWeather) btnWeather.addEventListener('click', cycleWeather);

// ==========================================
// SINGLE SOURCE OF TRUTH: WORLD ARCHITECTURE (Phase B: 800m x 800m Footprint)
// ==========================================
const WORLD_CONFIG = {
    bounds: {
        minX: -1000,
        maxX: 1000,
        minZ: -400,
        maxZ: 1600
    },
    playableLimits: {
        minX: -990,
        maxX: 990,
        minZ: -390,
        maxZ: 1590
    },
    width: 2000,
    depth: 2000,
    districts: {
        waterfront: { minX: -600, maxX: 600, minZ: -400, maxZ: 10, name: "Gateway Waterfront & Marine Drive" },
        historicResidential: { minX: -800, maxX: -200, minZ: 10, maxZ: 750, name: "Western Residential & Historic Chawls" },
        modernDowntown: { minX: -200, maxX: 200, minZ: 10, maxZ: 350, name: "Modern Downtown & Home HQ Plaza" },
        commercialMarkets: { minX: 150, maxX: 700, minZ: 10, maxZ: 650, name: "Crawford Commercial & Cyber Bazaar" },
        schoolQuarter: { minX: -550, maxX: -150, minZ: 750, maxZ: 1150, name: "Northwestern Academic Quarter (School)" },
        dmceCampus: { minX: 200, maxX: 650, minZ: 700, maxZ: 1100, name: "Northeastern Tech Campus (DMCE College)" },
        csmiaAirport: { minX: 350, maxX: 950, minZ: 1100, maxZ: 1550, name: "CSMIA International Airport & Aero-Hub" }
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

function getSurfaceElevationAt(x, z, currentY = 0) {
    let topY = 0;
    // Stark Tower Home HQ (X: 0, Z: 140, radius: 22, height: 120)
    // Only return upper floor levels if player elevation is actually at or near that floor
    if (Math.hypot(x - 0, z - 140) < 22) {
        if (currentY >= 115) return 120; // Level 4: Helipad & Flight Deck
        if (currentY >= 75) return 80;   // Level 3: Battlestation & Lab
        if (currentY >= 35) return 40;   // Level 2: Executive Cyber Penthouse
        return 0;                        // Level 1: Ground Plaza
    }
    // Haji Ali Coastal Causeway Walkway (X in [-185, -175], Z in [-142, -20])
    if (x >= -185 && x <= -175 && z >= -142 && z <= -20) {
        return 0.6;
    }
    // Haji Ali Dargah Islet Platform & Sanctuary
    if (x >= -206 && x <= -154 && z >= -186 && z <= -134) {
        if (x >= -193 && x <= -167 && z >= -173 && z <= -151) {
            // Sanctuary Roof if flying/landing above roof level, else courtyard floor
            if (currentY >= 6.0) return 8.7;
        }
        return 1.0; // Courtyard Platform
    }
    // Asiatic Library Grand Classical Steps & Terrace
    if (x >= 82 && x <= 118) {
        if (z >= 95.2 && z <= 105.8) {
            const stepIdx = Math.floor((z - 95.2) / 1.3);
            return Math.min(3.6, Math.max(0.45, (stepIdx + 1) * 0.45));
        }
        if (z > 105.8 && z <= 110) {
            return 3.9; // Portico Deck
        }
    }
    // Check all building and platform colliders
    for (let i = 0; i < worldColliders.length; i++) {
        const c = worldColliders[i];
        if (c.type === 'box') {
            const rY = (c.roofY !== undefined) ? c.roofY : ((c.maxY !== undefined && c.maxY >= 2.0) ? c.maxY : 0);
            if (rY >= 0.5 && !c.label?.includes('Balustrade') && !c.label?.includes('Boundary') && !c.label?.includes('Pier')) {
                if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
                    // Only return roof elevation if player is at or near the roof
                    if (currentY >= rY - 2.0) {
                        if (rY > topY) topY = rY;
                    }
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
            if (pos.y < col.minY || pos.y >= topElevation - 0.08) continue;
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

// 1. Arabian Sea (Z = -20 to -820, X = -1200 to +1200)
const waterGeom = new THREE.PlaneGeometry(2400, 800, 96, 48);
const waterUniforms = { uTime: { value: 0 } };
const waterMat = new THREE.MeshStandardMaterial({ color: 0x0e4466, roughness: 0.15, metalness: 0.8, flatShading: true });
waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed.z += sin(position.x * 0.04 + uTime * 2.2) * 0.45
                       + cos(position.y * 0.05 + uTime * 1.8) * 0.35
                       + sin((position.x + position.y) * 0.025 + uTime * 1.2) * 0.22;`
    );
};
const seaMesh = new THREE.Mesh(waterGeom, waterMat);
seaMesh.rotation.x = -Math.PI / 2;
seaMesh.position.set(0, -0.6, -420);
seaMesh.receiveShadow = false;
scene.add(seaMesh);

// 2. Main Ground Turf (Lush Green Grass spanning north of Marine Drive: Z = -10 to 1690, width 2200m)
const mainGround = new THREE.Mesh(
    new THREE.PlaneGeometry(2200, 1800),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
);
mainGround.rotation.x = -Math.PI / 2;
mainGround.position.set(0, -0.4, 790);
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

    // 2. Authentic Whitewashed Marble Dargah Sanctuary, Courtyard, Dome & Minaret
    // Courtyard Terrace Slabs (Sandstone & White Marble Paving)
    const courtyardPlinth = applyVertexColor(new THREE.BoxGeometry(44, 0.6, 38), 0xd4b996);
    courtyardPlinth.translate(-180, 0.7, -160);
    hajiAliGeoms.push(courtyardPlinth);

    const courtyard = applyVertexColor(new THREE.BoxGeometry(42.8, 0.2, 36.8), 0xf1f5f9);
    courtyard.translate(-180, 1.0, -160);
    hajiAliGeoms.push(courtyard);

    // Green marble perimeter inlay ribbon in courtyard
    const greenBorder = applyVertexColor(new THREE.BoxGeometry(41.6, 0.22, 35.6), 0x047857);
    greenBorder.translate(-180, 1.01, -160);
    hajiAliGeoms.push(greenBorder);
    const innerCourtyard = applyVertexColor(new THREE.BoxGeometry(39.6, 0.24, 33.6), 0xf8fafc);
    innerCourtyard.translate(-180, 1.02, -160);
    hajiAliGeoms.push(innerCourtyard);

    // Courtyard Perimeter Jali Screen Parapets (Carved Marble Balustrade)
    const jaliN = applyVertexColor(new THREE.BoxGeometry(42, 1.2, 0.4), 0xe2e8f0);
    jaliN.translate(-180, 1.8, -178);
    hajiAliGeoms.push(jaliN);
    const jaliS = applyVertexColor(new THREE.BoxGeometry(42, 1.2, 0.4), 0xe2e8f0);
    jaliS.translate(-180, 1.8, -142);
    hajiAliGeoms.push(jaliS);
    const jaliW = applyVertexColor(new THREE.BoxGeometry(0.4, 1.2, 36), 0xe2e8f0);
    jaliW.translate(-201, 1.8, -160);
    hajiAliGeoms.push(jaliW);

    // Main Sanctuary Prayer Hall (22m W x 7.5m H x 18m D)
    const hallPlinth = applyVertexColor(new THREE.BoxGeometry(22.6, 1.0, 18.6), 0x334155);
    hallPlinth.translate(-180, 1.5, -162);
    hajiAliGeoms.push(hallPlinth);

    const hall = applyVertexColor(new THREE.BoxGeometry(22, 6.7, 18), 0xf8fafc);
    hall.translate(-180, 5.35, -162);
    hajiAliGeoms.push(hall);

    // Sanctuary Flat Rooftop Landing Platform (Accessible for Superhero Landing)
    const roofSlab = applyVertexColor(new THREE.BoxGeometry(22.4, 0.5, 18.4), 0xe2e8f0);
    roofSlab.translate(-180, 8.7, -162);
    hajiAliGeoms.push(roofSlab);

    // Rooftop Marble Parapet along roof edges
    const roofParapetN = applyVertexColor(new THREE.BoxGeometry(22.4, 0.8, 0.4), 0xf8fafc);
    roofParapetN.translate(-180, 9.35, -171);
    hajiAliGeoms.push(roofParapetN);
    const roofParapetS = applyVertexColor(new THREE.BoxGeometry(22.4, 0.8, 0.4), 0xf8fafc);
    roofParapetS.translate(-180, 9.35, -153);
    hajiAliGeoms.push(roofParapetS);
    const roofParapetE = applyVertexColor(new THREE.BoxGeometry(0.4, 0.8, 18), 0xf8fafc);
    roofParapetE.translate(-169, 9.35, -162);
    hajiAliGeoms.push(roofParapetE);
    const roofParapetW = applyVertexColor(new THREE.BoxGeometry(0.4, 0.8, 18), 0xf8fafc);
    roofParapetW.translate(-191, 9.35, -162);
    hajiAliGeoms.push(roofParapetW);

    // Arched Entrance Portico / Grand Iwan Vestibule (South Facing)
    const portico = applyVertexColor(new THREE.BoxGeometry(9.6, 6.4, 4.8), 0xf8fafc);
    portico.translate(-180, 4.3, -151);
    hajiAliGeoms.push(portico);

    // Portico Decorative Arch Inlay & Teakwood Doors
    const archPortal = applyVertexColor(new THREE.BoxGeometry(5.2, 5.0, 0.3), 0x047857);
    archPortal.translate(-180, 3.6, -148.5);
    hajiAliGeoms.push(archPortal);

    const doorRecess = applyVertexColor(new THREE.BoxGeometry(3.6, 3.8, 0.4), 0x1e293b);
    doorRecess.translate(-180, 3.0, -148.7);
    hajiAliGeoms.push(doorRecess);

    const woodenDoors = applyVertexColor(new THREE.BoxGeometry(3.2, 3.4, 0.15), 0x78350f);
    woodenDoors.translate(-180, 2.8, -148.8);
    hajiAliGeoms.push(woodenDoors);

    // Side Arched Windows on Sanctuary Facade
    [-7.0, 7.0].forEach(wx => {
        const winBorder = applyVertexColor(new THREE.BoxGeometry(2.4, 3.2, 0.2), 0x047857);
        winBorder.translate(-180 + wx, 4.5, -152.9);
        hajiAliGeoms.push(winBorder);
        const winGlass = applyVertexColor(new THREE.BoxGeometry(1.8, 2.6, 0.25), 0x0284c7);
        winGlass.translate(-180 + wx, 4.5, -152.9);
        hajiAliGeoms.push(winGlass);
    });

    // Central Indo-Islamic Marble Dome
    const drum = applyVertexColor(new THREE.CylinderGeometry(5.4, 5.4, 1.8, 16), 0x047857);
    drum.translate(-180, 9.6, -162);
    hajiAliGeoms.push(drum);

    const dome = applyVertexColor(new THREE.SphereGeometry(5.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7), 0xf8fafc);
    dome.translate(-180, 11.0, -162);
    hajiAliGeoms.push(dome);

    const domeFinial = applyVertexColor(new THREE.ConeGeometry(0.35, 3.2, 8), 0xf59e0b);
    domeFinial.translate(-180, 16.4, -162);
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
    registerBoxCollider(-184.0, -176.0, -142, -20, 'HajiAliCauseway', -2, 0.6, 0.6);
    registerBoxCollider(-204, -156, -182, -138, 'HajiAliIslet', -2, 1.0, 1.0);
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
const allPedestrians = [];
const streetActivities = [];
const ambientAgents = [];
let instancedPedestrians = null;
let pedDummy = null;

// ==========================================
// SYSTEM 1: PEDESTRIAN SIMULATION (120 PEDESTRIANS)
// 30 Detailed Bi-Pedal Rigs + 90 Instanced Distance Walkers
// ==========================================
function buildPedestrianSimulation() {
    // 1. 30 Detailed Bi-Pedal Articulated Walkers across all 7 Districts
    const detailedConfigs = [
        // District 1: Gateway Waterfront Promenade (5)
        { skin: 3, shirt: 0, pants: 0, hair: 0, type: 'chaiwala', wps: [{x: -14, z: -4}, {x: 18, z: -4}, {x: 8, z: -12}, {x: -12, z: -10}] },
        { skin: 2, shirt: 1, pants: 3, hair: 0, type: 'dabbawala', wps: [{x: -30, z: 2}, {x: 10, z: 2}, {x: 25, z: -4}, {x: -15, z: -4}] },
        { skin: 1, shirt: 3, pants: 3, hair: 0, type: 'saree', wps: [{x: 12, z: -6}, {x: 32, z: -6}, {x: 20, z: 4}, {x: 0, z: 4}] },
        { skin: 2, shirt: 2, pants: 1, hair: 1, type: 'commuter', wps: [{x: -25, z: -14}, {x: 25, z: -14}, {x: 15, z: -8}, {x: -18, z: -8}] },
        { skin: 0, shirt: 4, pants: 2, hair: 2, type: 'tourist', wps: [{x: -8, z: -18}, {x: 8, z: -18}, {x: 14, z: -6}, {x: -14, z: -6}] },

        // District 2: Marine Drive Coastal Promenade (4)
        { skin: 1, shirt: 0, pants: 2, hair: 0, type: 'jogger', wps: [{x: -28, z: 30}, {x: -28, z: 110}, {x: -32, z: 90}, {x: -32, z: 40}] },
        { skin: 2, shirt: 4, pants: 0, hair: 1, type: 'student_headphones', wps: [{x: -31, z: 50}, {x: -31, z: 120}, {x: -28, z: 100}, {x: -28, z: 60}] },
        { skin: 3, shirt: 2, pants: 4, hair: 0, type: 'senior_walker', wps: [{x: -29, z: 40}, {x: -29, z: 85}, {x: -33, z: 80}, {x: -33, z: 45}] },
        { skin: 1, shirt: 1, pants: 1, hair: 2, type: 'photographer', wps: [{x: -33, z: 65}, {x: -33, z: 105}, {x: -29, z: 95}, {x: -29, z: 70}] },

        // District 3: Downtown Home HQ / Stark Tower Midtown Plaza (5)
        { skin: 1, shirt: 0, pants: 0, hair: 0, type: 'tech_exec', wps: [{x: -14, z: 230}, {x: 14, z: 230}, {x: 14, z: 260}, {x: -14, z: 260}] },
        { skin: 2, shirt: 3, pants: 2, hair: 1, type: 'cyber_security', wps: [{x: 8, z: 220}, {x: 8, z: 275}, {x: -8, z: 275}, {x: -8, z: 220}] },
        { skin: 0, shirt: 1, pants: 3, hair: 0, type: 'designer', wps: [{x: -18, z: 240}, {x: 18, z: 240}, {x: 10, z: 265}, {x: -10, z: 265}] },
        { skin: 3, shirt: 4, pants: 1, hair: 2, type: 'office_worker', wps: [{x: 12, z: 235}, {x: -12, z: 235}, {x: -12, z: 255}, {x: 12, z: 255}] },
        { skin: 2, shirt: 2, pants: 0, hair: 0, type: 'courier', wps: [{x: 6, z: 215}, {x: 6, z: 270}, {x: 14, z: 270}, {x: 14, z: 215}] },

        // District 4: West Residential Chawls (4)
        { skin: 2, shirt: 0, pants: 4, hair: 0, type: 'chawl_resident', wps: [{x: -170, z: 460}, {x: -200, z: 460}, {x: -200, z: 500}, {x: -170, z: 500}] },
        { skin: 3, shirt: 2, pants: 3, hair: 1, type: 'chai_drinker', wps: [{x: -175, z: 470}, {x: -195, z: 470}, {x: -195, z: 485}, {x: -175, z: 485}] },
        { skin: 1, shirt: 3, pants: 1, hair: 0, type: 'neighbor', wps: [{x: -185, z: 450}, {x: -185, z: 510}, {x: -178, z: 510}, {x: -178, z: 450}] },
        { skin: 2, shirt: 1, pants: 0, hair: 2, type: 'tailor', wps: [{x: -192, z: 465}, {x: -168, z: 465}, {x: -168, z: 495}, {x: -192, z: 495}] },

        // District 5: Commercial Bazaar Junction (4)
        { skin: 2, shirt: 4, pants: 0, hair: 0, type: 'merchant', wps: [{x: 165, z: 415}, {x: 195, z: 415}, {x: 195, z: 445}, {x: 165, z: 445}] },
        { skin: 1, shirt: 1, pants: 2, hair: 1, type: 'shopper', wps: [{x: 170, z: 420}, {x: 170, z: 455}, {x: 185, z: 455}, {x: 185, z: 420}] },
        { skin: 3, shirt: 0, pants: 3, hair: 0, type: 'porter', wps: [{x: 160, z: 430}, {x: 198, z: 430}, {x: 198, z: 440}, {x: 160, z: 440}] },
        { skin: 0, shirt: 2, pants: 1, hair: 2, type: 'spice_trader', wps: [{x: 178, z: 410}, {x: 178, z: 450}, {x: 192, z: 450}, {x: 192, z: 410}] },

        // District 6: Model High School District (4)
        { skin: 1, shirt: 0, pants: 0, hair: 0, type: 'school_student_1', wps: [{x: -310, z: 885}, {x: -335, z: 885}, {x: -335, z: 925}, {x: -310, z: 925}] },
        { skin: 2, shirt: 4, pants: 1, hair: 1, type: 'school_student_2', wps: [{x: -315, z: 890}, {x: -315, z: 935}, {x: -328, z: 935}, {x: -328, z: 890}] },
        { skin: 3, shirt: 2, pants: 4, hair: 0, type: 'school_teacher', wps: [{x: -305, z: 895}, {x: -330, z: 895}, {x: -330, z: 915}, {x: -305, z: 915}] },
        { skin: 0, shirt: 3, pants: 2, hair: 2, type: 'parent_guardian', wps: [{x: -322, z: 880}, {x: -322, z: 930}, {x: -312, z: 930}, {x: -312, z: 880}] },

        // District 7: DMCE Academia Campus (4)
        { skin: 2, shirt: 1, pants: 0, hair: 0, type: 'dmce_engineer_1', wps: [{x: 395, z: 865}, {x: 435, z: 865}, {x: 435, z: 905}, {x: 395, z: 905}] },
        { skin: 1, shirt: 3, pants: 2, hair: 1, type: 'dmce_engineer_2', wps: [{x: 405, z: 870}, {x: 405, z: 915}, {x: 425, z: 915}, {x: 425, z: 870}] },
        { skin: 3, shirt: 0, pants: 3, hair: 2, type: 'dmce_professor', wps: [{x: 412, z: 860}, {x: 438, z: 860}, {x: 438, z: 895}, {x: 412, z: 895}] },
        { skin: 0, shirt: 4, pants: 1, hair: 0, type: 'dmce_researcher', wps: [{x: 398, z: 875}, {x: 398, z: 920}, {x: 430, z: 920}, {x: 430, z: 875}] }
    ];

    npcs.length = 0;
    detailedConfigs.forEach((cfg, idx) => {
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

        const npcObj = {
            id: `npc_det_${idx}`,
            isDetailed: true,
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
            speed: 1.1 + (idx % 5) * 0.18
        };
        npcs.push(npcObj);
        allPedestrians.push(npcObj);
    });

    // 2. 90 Simplified / Instanced Distance Walkers in 1 Draw Call
    const pedTorso = applyVertexColor(new THREE.BoxGeometry(0.42, 0.65, 0.24), 0x3b82f6);
    pedTorso.translate(0, 1.25, 0);
    const pedHead = applyVertexColor(new THREE.SphereGeometry(0.18, 6, 6), 0xd4a373);
    pedHead.translate(0, 1.72, 0);
    const pedLegs = applyVertexColor(new THREE.BoxGeometry(0.36, 0.85, 0.20), 0x1e293b);
    pedLegs.translate(0, 0.45, 0);

    const mergedPedGeom = BufferGeometryUtils.mergeGeometries([pedTorso, pedHead, pedLegs]);
    const instMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    instancedPedestrians = new THREE.InstancedMesh(mergedPedGeom, instMat, 90);
    instancedPedestrians.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedPedestrians);
    pedDummy = new THREE.Object3D();

    const sidewalkCircuits = [
        { minX: -7.5, maxX: -6.5, minZ: 16, maxZ: 960, dirZ: 1 },
        { minX: 6.5, maxX: 7.5, minZ: 16, maxZ: 960, dirZ: -1 },
        { minX: -34, maxX: -27, minZ: 20, maxZ: 240, dirZ: 1 },
        { minX: -188, maxX: -172, minZ: 440, maxZ: 530, dirZ: 1 },
        { minX: 165, maxX: 195, minZ: 400, maxZ: 460, dirZ: -1 },
        { minX: -340, maxX: 440, minZ: 895, maxZ: 905, dirX: 1 }
    ];

    for (let k = 0; k < 90; k++) {
        const circ = sidewalkCircuits[k % sidewalkCircuits.length];
        const frac = (k / 90.0);
        let curX = circ.minX + (circ.maxX - circ.minX) * ((k * 7) % 10) / 10;
        let curZ = circ.minZ + (circ.maxZ - circ.minZ) * frac;
        const dirX = circ.dirX || 0;
        const dirZ = circ.dirZ || 1;

        pedDummy.position.set(curX, 0, curZ);
        pedDummy.rotation.y = Math.atan2(dirX, dirZ);
        pedDummy.updateMatrix();
        instancedPedestrians.setMatrixAt(k, pedDummy.matrix);

        const instObj = {
            id: `npc_inst_${k}`,
            isDetailed: false,
            instIndex: k,
            circuit: circ,
            x: curX,
            z: curZ,
            dirX,
            dirZ,
            speed: 1.0 + (k % 4) * 0.15,
            walkPhase: Math.random() * Math.PI * 2
        };
        allPedestrians.push(instObj);
    }
    instancedPedestrians.instanceMatrix.needsUpdate = true;

    window.__npcs = npcs;
    window.__pedestrians = { detailed: npcs, instanced: allPedestrians.filter(p => !p.isDetailed), total: allPedestrians.length };
    window.__allPedestriansCount = allPedestrians.length;
}

// ------------------------------------------
// SYSTEM 11: STREET ACTIVITY SIMULATION (20 LOCATIONS)
// ------------------------------------------
function buildStreetActivities() {
    streetActivities.length = 0;
    const stallWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const stallCanopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const metalBrassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });
    const greenProduceMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });

    const activityDefs = [
        { id: 'act_gw_chai', name: "Gateway Cutting Chai Stall", x: -12, z: -5, type: 'chai' },
        { id: 'act_gw_coco', name: "Marine Drive Coconut Vendor", x: 14, z: -6, type: 'coconut' },
        { id: 'act_gw_photo', name: "Waterfront Souvenir Kiosk", x: -26, z: -2, type: 'kiosk' },
        { id: 'act_gw_bhutta', name: "Roasted Bhutta & Corn Cart", x: 28, z: -4, type: 'bhutta' },
        { id: 'act_md_tapri', name: "Marine Drive Chai Tapri", x: -18, z: 75, type: 'chai' },
        { id: 'act_md_kulfi', name: "Chowpatty Kulfi Cart", x: -15, z: 85, type: 'kulfi' },
        { id: 'act_md_news', name: "Marine Newsstand & Books", x: -32, z: 78, type: 'kiosk' },
        { id: 'act_hq_cyber', name: "Stark Plaza Cyber-Chai Bar", x: -8, z: 238, type: 'chai' },
        { id: 'act_hq_vada', name: "Downtown Mumbai Vada Pav Thela", x: 12, z: 242, type: 'vadapav' },
        { id: 'act_hq_fruit', name: "Fresh Fruit Cart", x: -12, z: 262, type: 'fruit' },
        { id: 'act_ch_chai', name: "Chawl Corner Chai Tapri", x: -190, z: 475, type: 'chai' },
        { id: 'act_ch_garland', name: "Marigold Flower Garland Stall", x: -170, z: 485, type: 'flower' },
        { id: 'act_ch_veg', name: "Chawl Vegetable Thela", x: -185, z: 505, type: 'produce' },
        { id: 'act_bz_spice', name: "Spice & Sacks Market", x: 175, z: 425, type: 'spice' },
        { id: 'act_bz_pav', name: "Sizzling Pav Bhaji Tawa", x: 185, z: 435, type: 'pavbhaji' },
        { id: 'act_bz_textile', name: "Textile & Saree Kiosk", x: 168, z: 445, type: 'kiosk' },
        { id: 'act_sc_candy', name: "School Stationery & Candy Cart", x: -310, z: 895, type: 'kiosk' },
        { id: 'act_sc_bhel', name: "Bhelpuri & Chana Cart", x: -330, z: 905, type: 'snack' },
        { id: 'act_dmce_canteen', name: "DMCE Engineering Canteen Adda", x: 410, z: 895, type: 'chai' },
        { id: 'act_dmce_print', name: "Blueprint & Xerox Kiosk", x: 430, z: 905, type: 'kiosk' }
    ];

    const staticWoodGeoms = [];
    const staticMetalGeoms = [];
    const staticCanopyGeoms = [];
    const staticProduceGeoms = [];
    const staticFlowerGeoms = [];

    activityDefs.forEach((act, idx) => {
        const table = new THREE.BoxGeometry(1.8, 0.85, 0.9);
        table.translate(act.x, 0.425, act.z);
        staticWoodGeoms.push(table);

        const roof = new THREE.BoxGeometry(2.2, 0.12, 1.3);
        roof.translate(act.x, 2.2, act.z);
        staticCanopyGeoms.push(roof);

        if (act.type === 'chai' || act.type === 'pavbhaji') {
            const samovar = new THREE.CylinderGeometry(0.22, 0.22, 0.55, 10);
            samovar.translate(act.x - 0.4, 0.95, act.z);
            staticMetalGeoms.push(samovar);
        } else if (act.type === 'coconut' || act.type === 'produce') {
            const stack = new THREE.CylinderGeometry(0.35, 0.45, 0.4, 8);
            stack.translate(act.x + 0.3, 0.95, act.z);
            staticProduceGeoms.push(stack);
        } else if (act.type === 'flower') {
            const garlands = new THREE.TorusGeometry(0.35, 0.08, 6, 12);
            garlands.rotateX(Math.PI / 2);
            garlands.translate(act.x, 1.8, act.z);
            staticFlowerGeoms.push(garlands);
        }

        registerBoxCollider(act.x - 1.2, act.x + 1.2, act.z - 0.8, act.z + 0.8, `StreetAct_${act.id}`, -2, 2.5);

        let steamQuad = null;
        if (act.type === 'chai' || act.type === 'pavbhaji') {
            const steamMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.45 });
            steamQuad = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.6), steamMat);
            steamQuad.position.set(act.x - 0.4, 1.45, act.z);
            scene.add(steamQuad);
        }

        streetActivities.push({
            id: act.id,
            name: act.name,
            x: act.x,
            z: act.z,
            type: act.type,
            steamQuad,
            timer: idx * 0.8
        });
    });

    if (staticWoodGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(staticWoodGeoms), stallWoodMat));
    if (staticMetalGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(staticMetalGeoms), metalBrassMat));
    if (staticCanopyGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(staticCanopyGeoms), stallCanopyMat));
    if (staticProduceGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(staticProduceGeoms), greenProduceMat));
    if (staticFlowerGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(staticFlowerGeoms), flowerMat));

    window.__streetActivities = streetActivities;
}

// ------------------------------------------
// SYSTEM 12: ENVIRONMENTAL SIMULATION (30 AMBIENT AGENTS)
// ------------------------------------------
function createBirdMesh(colorHex = 0xf8fafc, span = 1.4) {
    const birdGeom = new THREE.BufferGeometry();
    const half = span / 2;
    const vertices = new Float32Array([
        0, 0, 0.4,   -half, 0.1, -0.2,   0, 0, -0.4,
        0, 0, 0.4,    0, 0, -0.4,         half, 0.1, -0.2
    ]);
    birdGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    birdGeom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(birdGeom, mat);
    const grp = new THREE.Group();
    grp.add(mesh);
    return { group: grp, mesh };
}

function buildEnvironmentalSimulation() {
    ambientAgents.length = 0;

    for (let i = 0; i < 20; i++) {
        const bird = createBirdMesh(0xf8fafc, 1.2);
        const radius = 25.0 + (i % 5) * 12.0;
        const startAngle = (i / 20.0) * Math.PI * 2;
        const startY = 18.0 + (i % 4) * 4.5;
        const cx = 0, cz = 0;

        bird.group.position.set(cx + Math.cos(startAngle) * radius, startY, cz + Math.sin(startAngle) * radius);
        scene.add(bird.group);

        ambientAgents.push({
            id: `seagull_${i}`,
            type: 'seagull',
            group: bird.group,
            mesh: bird.mesh,
            radius,
            angle: startAngle,
            altitude: startY,
            speed: 0.8 + (i % 3) * 0.2,
            flapSpeed: 10.0 + (i % 4) * 1.5,
            center: { x: cx, z: cz }
        });
    }

    for (let k = 0; k < 10; k++) {
        const kite = createBirdMesh(0x78350f, 2.2);
        const radius = 60.0 + (k % 4) * 25.0;
        const startAngle = (k / 10.0) * Math.PI * 2;
        const startY = 85.0 + (k % 3) * 20.0;
        const cx = 0, cz = 360;

        kite.group.position.set(cx + Math.cos(startAngle) * radius, startY, cz + Math.sin(startAngle) * radius);
        scene.add(kite.group);

        ambientAgents.push({
            id: `kite_${k}`,
            type: 'kite',
            group: kite.group,
            mesh: kite.mesh,
            radius,
            angle: startAngle,
            altitude: startY,
            speed: 0.35 + (k % 3) * 0.1,
            flapSpeed: 2.5 + (k % 2) * 0.8,
            center: { x: cx, z: cz }
        });
    }

    window.__ambientAgents = ambientAgents;
}

buildPedestrianSimulation();
buildStreetActivities();
buildEnvironmentalSimulation();

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

    // 5. Readers & Citizens sitting on the Grand Steps of Asiatic Library (Facing North toward plaza)
    [[94, 1.35, 99.9, Math.PI], [106, 1.80, 101.2, Math.PI], [97, 2.25, 102.5, Math.PI], [103, 2.70, 103.8, Math.PI]].forEach(p => {
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
        registerLODItem(ambientMesh, 0, 160);
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

// 5. Far North Expressway: Terminal Way (Z = 380, X = -360 to +360, width 10m with clearance gap for Airport Runway & Apron)
registerRoadSegment(-245, 380, 230, 10, true); // West of Airport: X = -360 to -130
registerRoadSegment(245, 380, 230, 10, true);  // East of Airport: X = +130 to +360

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

// 12. Extended North Express Superhighway Spine (X = 0, Z = 480 to 1400)
registerRoadSegment(0, 940, 920, 14, false);

// 13. Western Academic Corridor to Model High School (X = -320, Z = 240 to 1000)
registerRoadSegment(-320, 620, 760, 12, false);

// 14. Eastern Tech Corridor to DMCE College Campus (X = +420, Z = 240 to 1000)
registerRoadSegment(420, 620, 760, 12, false);

// 15. Trans-City Academic Boulevard connecting School & DMCE (Z = 900, X = -450 to +550)
registerRoadSegment(50, 900, 1000, 14, true);

// 16. Far North Airport Parkway to CSMIA Terminal (Z = 1250, X = 150 to 900)
registerRoadSegment(525, 1250, 750, 14, true);

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

// Grand Entrance Canopy Sign at Home HQ Plaza
const starkSignCanvas = document.createElement('canvas');
starkSignCanvas.width = 512; starkSignCanvas.height = 128;
const stCtx = starkSignCanvas.getContext('2d');
stCtx.fillStyle = '#090d16'; stCtx.fillRect(0, 0, 512, 128);
stCtx.fillStyle = '#38bdf8'; stCtx.font = 'bold 28px sans-serif';
stCtx.textAlign = 'center';
stCtx.fillText("HOME HQ PLAZA — DEVARSHI DAVANE", 256, 48);
stCtx.fillStyle = '#94a3b8'; stCtx.font = '16px sans-serif';
stCtx.fillText("HEADQUARTERS • CYBER LAB & FLIGHT DECK", 256, 88);
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

// Streetlights & Avenue Trees (Positioned cleanly on sidewalks, clear of roadways and building facades)
[-60, -30, 30, 60].forEach(rx => {
    addStreetLamp(rx, 18.5);
    addTree(rx, 18.5, 'city');
});
[22, 46, 68].forEach(rz => {
    addStreetLamp(5.8, rz);
    addStreetLamp(-5.8, rz);
});
[14, 38, 60, 78].forEach(rz => {
    addTree(-6.2, rz, 'city');
    addTree(6.2, rz, 'city');
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

    for (let s = 0; s < storeys; s++) {
        const floorY = s * storeyH;
        if (s === 0) {
            // Ground floor plinth, entrance doorways and grilled windows
            const plinth = new THREE.BoxGeometry(width + 0.3, 0.35, corridorDepth);
            plinth.translate(0, 0.175, depth / 2 + corridorDepth / 2);
            concreteGeoms.push(plinth);

            for (let dx = -width / 2 + 2.2; dx <= width / 2 - 2.2; dx += 3.8) {
                const door = new THREE.BoxGeometry(1.2, 2.2, 0.1);
                door.translate(dx, 1.1, depth / 2 + 0.06);
                decorGeoms.push(door);

                [-0.85, 0.85].forEach(wx => {
                    const win = new THREE.BoxGeometry(0.7, 0.9, 0.08);
                    win.translate(dx + wx, 1.35, depth / 2 + 0.06);
                    decorGeoms.push(win);
                });
            }
        } else {
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

    // Ground floor entrance portico & lobby double doors
    const portico = new THREE.BoxGeometry(width * 0.42, 0.35, 2.0);
    portico.translate(0, 3.2, depth / 2 + 1.0);
    concreteGeoms.push(portico);

    [-width * 0.18, width * 0.18].forEach(px => {
        const col = new THREE.BoxGeometry(0.3, 3.2, 0.3);
        col.translate(px, 1.6, depth / 2 + 1.8);
        concreteGeoms.push(col);
    });

    const lobbyDoor = new THREE.BoxGeometry(2.4, 2.6, 0.12);
    lobbyDoor.translate(0, 1.3, depth / 2 + 0.06);
    metalGeoms.push(lobbyDoor);

    [-width * 0.34, width * 0.34].forEach(wx => {
        const win = new THREE.BoxGeometry(1.6, 1.4, 0.1);
        win.translate(wx, 1.6, depth / 2 + 0.06);
        metalGeoms.push(win);
    });

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
    // 18. Corporate Tower T5 (Cyber City High-Rise East Lot)
    createCorporateTower(90, 30, 12, 10, 8, 0x1d4ed8);
    // Lot at (64, 80) is reserved for the Relocated School Academic Campus with clear, open landscaped plaza

    // --- SECTOR 4: NORTH DISTRICT & ARTERIAL BOULEVARDS ---
    // 22. Secondary School Academic Annex & Library (West of School, spacious 10m avenue clearance)
    createCorporateTower(-34, 84, 12, 10, 5, 0x475569);
    // 23. Youth Sports & Cultural Pavilion (East of School, spacious 10m avenue clearance)
    createCommercialBuilding(34, 84, 12, 10, 3, "युवा क्रीडा आणि सांस्कृतिक केंद्र", "YOUTH SPORTS & CULTURAL CENTRE", 0x15803d, 0x16a34a);
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
        // Ground floor plinth, entrance doorways and grilled windows
        addBox(batchedConcreteTrim, x, 0.175, z + d / 2 + 0.65, w + 0.4, 0.35, 1.3, rotY);
        for (let dx = -w / 2 + 2.2; dx <= w / 2 - 2.2; dx += 3.8) {
            addBox(batchedRoofs, x + dx, 1.1, z + d / 2 + 0.06, 1.2, 2.2, 0.1, rotY);
            addBox(batchedMetal, x + dx - 0.9, 1.4, z + d / 2 + 0.06, 0.7, 0.9, 0.08, rotY);
            addBox(batchedMetal, x + dx + 0.9, 1.4, z + d / 2 + 0.06, 0.7, 0.9, 0.08, rotY);
        }
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
        // Ground floor entrance lobby portico & double doors
        addBox(batchedConcreteTrim, x, 3.2, z + d / 2 + 1.0, w * 0.4, 0.35, 2.0);
        addBox(batchedConcreteTrim, x - w * 0.16, 1.6, z + d / 2 + 1.8, 0.3, 3.2, 0.3);
        addBox(batchedConcreteTrim, x + w * 0.16, 1.6, z + d / 2 + 1.8, 0.3, 3.2, 0.3);
        addBox(batchedMetal, x, 1.25, z + d / 2 + 0.06, 2.4, 2.5, 0.12);
        addBox(batchedGlass, x - w * 0.32, 1.6, z + d / 2 + 0.06, 1.6, 1.4, 0.1);
        addBox(batchedGlass, x + w * 0.32, 1.6, z + d / 2 + 0.06, 1.6, 1.4, 0.1);
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

    // Helper: Build a batched High-Rise Corporate Tower (Realistic Curtain Wall, Spandrel Bands & Mullions)
    function buildBatchedCorporate(x, z, w, d, storeys) {
        const storeyH = 3.8;
        const totalH = storeys * storeyH;
        // Podium base with lobby entrance
        addBox(batchedConcreteTrim, x, 4.0, z, w + 1.0, 8.0, d + 1.0);
        addBox(batchedGlass, x, 2.4, z + (d + 1.0) / 2 + 0.05, w * 0.6, 3.6, 0.1);

        // Glass tower shaft
        addBox(batchedGlass, x, (totalH + 8) / 2, z, w, totalH - 8, d);

        // Horizontal floor spandrels & architectural sunshade louvers on every storey
        for (let s = 2; s <= storeys; s++) {
            const fy = s * storeyH;
            addBox(batchedConcreteTrim, x, fy, z, w + 0.3, 0.45, d + 0.3);
            addBox(batchedMetal, x, fy + 0.3, z + d / 2 + 0.25, w * 0.92, 0.15, 0.4);
        }

        // Vertical corner structural mullions running full height
        [[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]].forEach(([cx, cz]) => {
            addBox(batchedMetal, x + cx, totalH / 2, z + cz, 0.5, totalH, 0.5);
        });

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
    // SECTOR 3: MODERN DOWNTOWN & STARK PLAZA FLANKS (8 Buildings, clear of Midtown Ave at Z = 140)
    // ====================================================
    buildBatchedCorporate(-50, 110, 16, 14, 13);
    buildBatchedCorporate(-50, 170, 16, 14, 13);
    buildBatchedCorporate(50, 110, 16, 14, 13);
    buildBatchedCorporate(50, 170, 16, 14, 13);
    buildBatchedCorporate(-80, 172, 18, 14, 15);
    buildBatchedCorporate(80, 172, 18, 14, 15);
    buildBatchedCorporate(-45, 210, 16, 14, 12);
    buildBatchedCorporate(45, 210, 16, 14, 12);

    // ====================================================
    // SECTOR 4: TECH ACADEMIA & CAMPUS WINGS (12 Buildings, clear of Campus Cross Ave at Z = 240 and Airport at Z = 380)
    // ====================================================
    buildBatchedAcademia(60, 268, 22, 16, 5);
    buildBatchedAcademia(60, 310, 22, 16, 5);
    buildBatchedAcademia(120, 268, 22, 16, 4);
    buildBatchedAcademia(120, 310, 22, 16, 4);
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
    mergeAndAdd(batchedWallsCorporate, new THREE.MeshStandardMaterial({
        map: modernFacadeTex,
        color: 0x94a3b8,
        roughness: 0.5,
        metalness: 0.3
    }), true);

    // Architectural trims, windows, metal, and roofs (no shadow pass needed)
    mergeAndAdd(batchedConcreteTrim, concreteTrimMat, false);
    mergeAndAdd(batchedGlass, new THREE.MeshStandardMaterial({
        map: corporateGlassTex,
        color: 0x38bdf8,
        metalness: 0.85,
        roughness: 0.15
    }), false);
    mergeAndAdd(batchedMetal, metalRailingMat, false);
    mergeAndAdd(batchedRoofs, corrugatedRoofMat, false);
}
buildExpandedDistrictsBatch();
window.__cityBuildings = cityBuildings;

// ==========================================
// AIRPORT DISTRICT (CSMIA International Aero-Hub: X = 650, Z = 1250)
// Runway 27/09, ATC Radar Tower & 38m Jetliner
// Styled per Technical Orthographic Model Sheet
// ==========================================
let poiAirport = { x: 650, z: 1250, radius: 45 };
window.__poiAirport = poiAirport;
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

// 3. Aircraft fleet handled by buildAirportSimulation() below

    // 4. Passenger Terminal 2 & Jetway Aerobridge per Stitch CAD Sheet 3
    const terminalGroup = new THREE.Group();
    const termSolidGeoms = [];
    const termGlassGeoms = [];

    // Main Terminal Concourse Hall (72m W x 14m H x 22m D at X = 95, Z = 348, dedicated buffer from runway)
    const termHall = applyVertexColor(new THREE.BoxGeometry(72, 14, 22), 0x94a3b8);
    termHall.translate(95, 7, 348);
    termSolidGeoms.push(termHall);

    // Structural Perimeter Columns
    for (let cx = 62; cx <= 128; cx += 11) {
        const col = applyVertexColor(new THREE.CylinderGeometry(0.7, 0.9, 15, 8), 0x64748b);
        col.translate(cx, 7.5, 337);
        termSolidGeoms.push(col);
    }

    // Aerodynamic Modern Roof with Cantilevered Overhang (78m W x 26m D)
    const roofBase = applyVertexColor(new THREE.BoxGeometry(78, 1.2, 26), 0xe2e8f0);
    roofBase.translate(95, 14.6, 348);
    termSolidGeoms.push(roofBase);
    const roofCap = applyVertexColor(new THREE.BoxGeometry(72, 1.2, 22), 0xf1f5f9);
    roofCap.translate(95, 15.8, 348);
    termSolidGeoms.push(roofCap);

    // Terminal Curtain Glass Facade (facing Runway/Apron - South)
    const glassFacade = new THREE.PlaneGeometry(68, 11);
    glassFacade.translate(95, 6.5, 359.1);
    termGlassGeoms.push(glassFacade);

    // Articulated Telescoping Jetway Aerobridge (connecting Terminal Concourse to Jetliner Fuselage at 45, 372)
    const jetwayTunnel = applyVertexColor(new THREE.BoxGeometry(16, 3.2, 3.4), 0x64748b);
    jetwayTunnel.rotateY(-0.62);
    jetwayTunnel.translate(52, 4.8, 365);
    termSolidGeoms.push(jetwayTunnel);

    // Jetway Support Gantry Stilt Legs
    [-1.2, 1.2].forEach(ox => {
        const stilt = applyVertexColor(new THREE.CylinderGeometry(0.25, 0.3, 4.6, 6), 0x475569);
        stilt.translate(52 + ox, 2.3, 365);
        termSolidGeoms.push(stilt);
    });

    // Illuminated Terminal Signboard
    const signBoard = applyVertexColor(new THREE.BoxGeometry(32, 2.2, 0.4), 0xf97316);
    signBoard.translate(95, 14.5, 359.2);
    termSolidGeoms.push(signBoard);

    terminalGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(termSolidGeoms, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 })));
    terminalGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(termGlassGeoms, false), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.85, transparent: true, opacity: 0.85 })));

    airport.add(terminalGroup);

    airport.position.set(poiAirport.x, 0, poiAirport.z - 380);
    const offX = poiAirport.x;
    const offZ = poiAirport.z - 380;
    registerBoxCollider(offX - 76, offX - 64, offZ + 354, offZ + 366, 'ATCRadarTower');
    registerBoxCollider(offX + 28, offX + 62, offZ + 360, offZ + 392, 'JetlinerApron');
    registerBoxCollider(offX + 59, offX + 131, offZ + 337, offZ + 359, 'AirportTerminalBuilding', -5, 18, 16.0);
    registerBoxCollider(offX + 43, offX + 61, offZ + 358, offZ + 372, 'AirportJetway', -5, 8.5, 5.8);

    scene.add(airport);
}
buildAirportDistrict();

// ==========================================
// SYSTEM 7: AIRPORT SIMULATION (6 AIRCRAFT FLEET)
// ==========================================
const airportPlanes = [];

function createJetlinerModel(fuselageHex = 0xf8fafc, tailHex = 0xea580c, engineHex = 0x1e293b) {
    const jetGeoms = [];
    const fuselage = applyVertexColor(new THREE.CylinderGeometry(1.6, 1.6, 32, 14), fuselageHex);
    fuselage.rotateX(Math.PI / 2);
    fuselage.translate(0, 3.5, 0);
    jetGeoms.push(fuselage);

    const nose = applyVertexColor(new THREE.ConeGeometry(1.6, 6.0, 14), fuselageHex);
    nose.rotateX(Math.PI / 2);
    nose.translate(0, 3.5, 19.0);
    jetGeoms.push(nose);

    const wingL = applyVertexColor(new THREE.BoxGeometry(16, 0.25, 4.2), fuselageHex);
    wingL.rotateY(-0.35);
    wingL.translate(-9.5, 3.2, -1.0);
    jetGeoms.push(wingL);

    const wingR = applyVertexColor(new THREE.BoxGeometry(16, 0.25, 4.2), fuselageHex);
    wingR.rotateY(0.35);
    wingR.translate(9.5, 3.2, -1.0);
    jetGeoms.push(wingR);

    const hStabL = applyVertexColor(new THREE.BoxGeometry(5.5, 0.18, 1.8), fuselageHex);
    hStabL.rotateY(-0.3);
    hStabL.translate(-3.2, 5.0, -15.0);
    jetGeoms.push(hStabL);

    const hStabR = applyVertexColor(new THREE.BoxGeometry(5.5, 0.18, 1.8), fuselageHex);
    hStabR.rotateY(0.3);
    hStabR.translate(3.2, 5.0, -15.0);
    jetGeoms.push(hStabR);

    const vFinGeom = applyVertexColor(new THREE.BoxGeometry(0.24, 5.5, 3.6), tailHex);
    vFinGeom.translate(0, 6.5, -14.5);
    jetGeoms.push(vFinGeom);

    [-6.5, 6.5].forEach(ex => {
        const nacelle = applyVertexColor(new THREE.CylinderGeometry(0.9, 0.9, 4.2, 12), engineHex);
        nacelle.rotateX(Math.PI / 2);
        nacelle.translate(ex, 2.3, 0.5);
        jetGeoms.push(nacelle);

        const spinner = applyVertexColor(new THREE.ConeGeometry(0.4, 1.2, 10), 0x94a3b8);
        spinner.rotateX(Math.PI / 2);
        spinner.translate(ex, 2.3, 2.7);
        jetGeoms.push(spinner);
    });

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

    const mesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(jetGeoms), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }));
    mesh.castShadow = false;
    const grp = new THREE.Group();
    grp.add(mesh);

    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    strobe.position.set(0, 9.3, -15.5);
    grp.add(strobe);

    return { group: grp, strobe };
}

function buildAirportSimulation() {
    airportPlanes.length = 0;
    const apX = poiAirport.x;
    const apZ = poiAirport.z;

    const p0 = createJetlinerModel(0xf8fafc, 0xea580c, 0x1e293b);
    p0.group.position.set(apX + 45, 0, apZ - 4);
    p0.group.rotation.y = -Math.PI / 6;
    scene.add(p0.group);
    airportPlanes.push({ id: 0, name: "Air India AI-101 (Gate 1)", state: 'parked', group: p0.group, strobe: p0.strobe, x: apX + 45, y: 0, z: apZ - 4 });

    const p1 = createJetlinerModel(0xf8fafc, 0x1d4ed8, 0x0f172a);
    p1.group.position.set(apX + 85, 0, apZ - 4);
    p1.group.rotation.y = -Math.PI / 6;
    scene.add(p1.group);
    airportPlanes.push({ id: 1, name: "IndiGo 6E-404 (Gate 2)", state: 'parked', group: p1.group, strobe: p1.strobe, x: apX + 85, y: 0, z: apZ - 4 });

    const p2 = createJetlinerModel(0xf8fafc, 0x701a75, 0x1e293b);
    p2.group.position.set(apX - 30, 0, apZ + 20);
    scene.add(p2.group);
    airportPlanes.push({
        id: 2,
        name: "Vistara UK-920 (Taxiing)",
        state: 'taxiing',
        group: p2.group,
        strobe: p2.strobe,
        x: apX - 30,
        y: 0,
        z: apZ + 20,
        speed: 6.5,
        progress: 0.1
    });

    const p3 = createJetlinerModel(0xf8fafc, 0xd97706, 0x1e293b);
    p3.group.position.set(apX - 110, 0, apZ);
    scene.add(p3.group);
    airportPlanes.push({
        id: 3,
        name: "Akasa Air QP-112 (Takeoff / Climb)",
        state: 'takeoff',
        group: p3.group,
        strobe: p3.strobe,
        x: apX - 110,
        y: 0,
        z: apZ,
        timer: 0,
        stage: 0
    });

    const p4 = createJetlinerModel(0xf8fafc, 0x059669, 0x1e293b);
    p4.group.position.set(apX - 320, 65, apZ);
    scene.add(p4.group);
    airportPlanes.push({
        id: 4,
        name: "SpiceJet SG-303 (Landing / Approach)",
        state: 'landing',
        group: p4.group,
        strobe: p4.strobe,
        x: apX - 320,
        y: 65,
        z: apZ,
        timer: 0,
        stage: 0
    });

    const p5 = createJetlinerModel(0xf8fafc, 0xdc2626, 0x1e293b);
    p5.group.position.set(-600, 195, 400);
    p5.group.rotation.y = Math.PI / 2;
    scene.add(p5.group);
    airportPlanes.push({
        id: 5,
        name: "Emirates EK-500 (Cruising Flight)",
        state: 'cruising',
        group: p5.group,
        strobe: p5.strobe,
        x: -600,
        y: 195,
        z: 400,
        speed: 38.0
    });

    window.__airportPlanes = airportPlanes;
}
buildAirportSimulation();

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
// DISTRICT 2: MODEL HIGH SCHOOL
// (Northwestern Academic Quarter: X = -320, Z = 920)
// Architectural Landmark & Academic Foundation
// ==========================================
let poiSchool = { x: -320, z: 920, radius: 18 };
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
// (Northeastern Tech Campus: X = 420, Z = 880)
// Higher Education & Engineering Credentials
// ==========================================
let poiCollege = { x: 420, z: 880, radius: 18 };
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
        "↑ HOME HQ PLAZA",
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

    // 4 Key Junction Wayfinding Locations (Firmly on Sidewalk Curbs, Clear of Roadways)
    const signpostLocations = [
        // Junction 1: Marine Ave & North Ave (West Sidewalk Curb)
        { x: -5.8, z: 14.0, arms: [
            { idx: 0, rotY: 0, dy: 3.8 },               // North: High School Campus
            { idx: 1, rotY: Math.PI, dy: 3.4 },         // South: Gateway of India
            { idx: 2, rotY: Math.PI / 2, dy: 3.0 },     // West: Devarshi's HQ
            { idx: 3, rotY: -Math.PI / 2, dy: 2.6 }     // East: DMCE College
        ]},
        // Junction 2: Market St & North Ave (East Sidewalk Curb)
        { x: 5.8, z: 42.0, arms: [
            { idx: 4, rotY: 0, dy: 3.8 },               // North: North Ave / Campus
            { idx: 5, rotY: Math.PI, dy: 3.4 },         // South: Marine Drive
            { idx: 6, rotY: Math.PI / 2, dy: 3.0 },     // West: Chawls / Market
            { idx: 7, rotY: -Math.PI / 2, dy: 2.6 }     // East: Central Train Station
        ]},
        // Junction 3: West Blvd & Market St (Sidewalk Corner)
        { x: -42.0, z: 42.0, arms: [
            { idx: 2, rotY: 0, dy: 3.6 },               // North: Devarshi's Cyber HQ
            { idx: 5, rotY: Math.PI, dy: 3.2 },         // South: Marine Drive
            { idx: 7, rotY: -Math.PI / 2, dy: 2.8 }     // East: Central Train Station
        ]},
        // Junction 4: East Blvd & Market St (Sidewalk Corner)
        { x: 42.0, z: 42.0, arms: [
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

    // F. Glowing Horizontal Collar Ring Sign: "HOME HQ" (Matching Reference Image)
    const collarCanvas = document.createElement('canvas');
    collarCanvas.width = 1024;
    collarCanvas.height = 256;
    const colCtx = collarCanvas.getContext('2d');
    colCtx.fillStyle = '#0a0f1d';
    colCtx.fillRect(0, 0, 1024, 256);
    colCtx.strokeStyle = '#06b6d4';
    colCtx.lineWidth = 6;
    colCtx.strokeRect(10, 10, 1004, 236);
    colCtx.fillStyle = '#ffffff';
    colCtx.font = 'bold 96px "JetBrains Mono", sans-serif';
    colCtx.textAlign = 'center';
    colCtx.textBaseline = 'middle';
    colCtx.shadowColor = '#38bdf8';
    colCtx.shadowBlur = 24;
    colCtx.fillText('HOME HQ', 512, 128);
    const collarTex = new THREE.CanvasTexture(collarCanvas);
    const collarMat = new THREE.MeshBasicMaterial({ map: collarTex, side: THREE.DoubleSide });
    const collarSign = new THREE.Mesh(new THREE.CylinderGeometry(11.2, 11.2, 5.2, 32, 1, true, Math.PI * 0.72, Math.PI * 0.56), collarMat);
    collarSign.position.set(tX, 134, tZ);
    towerGroup.add(collarSign);

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

    // Exterior perimeter wall colliders for the full 180m skyscraper shaft (eliminates character clipping)
    registerBoxCollider(tX - 16.5, tX - 14.5, tZ - 16.5, tZ + 16.5, 'StarkTowerShaftW', 14, 120);
    registerBoxCollider(tX + 14.5, tX + 16.5, tZ - 16.5, tZ + 16.5, 'StarkTowerShaftE', 14, 120);
    registerBoxCollider(tX - 16.5, tX + 16.5, tZ - 16.5, tZ - 14.5, 'StarkTowerShaftS', 14, 120);
    registerBoxCollider(tX - 16.5, tX + 16.5, tZ + 14.5, tZ + 16.5, 'StarkTowerShaftN', 14, 120);

    // ----------------------------------------------------
    // 3. UNIFIED GEOMETRY MERGE & MESH CREATION (Only 6 Draw Calls!)
    // ----------------------------------------------------
    const starkGlassMat = new THREE.MeshStandardMaterial({
        map: corporateGlassTex,
        color: 0x0284c7,
        roughness: 0.12,
        metalness: 0.88,
        transparent: false,
        opacity: 1.0
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
        registerLODItem(wallMesh, 0, 170);
    }

    if (furnitureGeoms.length > 0) {
        const mergedFurn = BufferGeometryUtils.mergeGeometries(furnitureGeoms);
        const furnMesh = new THREE.Mesh(mergedFurn, starkInteriorMat);
        furnMesh.castShadow = false;
        furnMesh.receiveShadow = true;
        towerGroup.add(furnMesh);
        registerLODItem(furnMesh, 0, 130);
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
    // Styled per Reference Image: Metallic Silver/Titanium Sports Coupe
    const carMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.88, roughness: 0.18 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1, transparent: true, opacity: 0.82 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 });

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
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.18, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        hl.position.set(hx, 0.8, 2.6);
        carGroup.add(hl);
    });

    const carSpot = new THREE.SpotLight(0xffffff, 7.5, 65, Math.PI / 4, 0.35);
    carSpot.position.set(0, 0.9, 2.7);
    carSpot.target.position.set(0, 0, 25);
    carGroup.add(carSpot);
    carGroup.add(carSpot.target);

    // Red LED Tail Light Bar
    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.15), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
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
const trainStationZ = [16, 80, 250, 480, 900, 430, 860, 1250]; // 8 Suburban Stations
const allTrains = [];
const railwayStations = [];
const trafficSignals = [];
const trafficVehicles = [];
const publicTransit = [];

let trainSpline = null;
let stationSchedule = [];
let boardableTrain = null;

let trainState = {
    spline: null,
    splineLength: 1900,
    coach1: null,
    coach2: null,
    coach3: null,
    mesh: null,
    x: -22,
    z: 16,
    speed: 0,
    maxSpeed: 16.0,
    progress: 0.05,
    targetStationIdx: 0,
    dwellTimer: 0,
    isDwelling: true,
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

// ------------------------------------------
// SYSTEM 3 & 4: MUMBAI RAILWAY & 8 STATIONS
// ------------------------------------------
function buildRailwaySystem() {
    // 1. Line 1: Western Coastal Suburban Corridor (Blue Line: Gateway to School & North Park)
    const line1Points = [
        new THREE.Vector3(-22, 0.25, 8),
        new THREE.Vector3(-22, 0.25, 16),   // 1. Gateway Terminus
        new THREE.Vector3(-22, 0.25, 80),   // 2. Marine Drive Halt
        new THREE.Vector3(-22, 0.25, 140),  // Midtown West
        new THREE.Vector3(-22, 0.25, 250),  // 3. Downtown Home HQ
        new THREE.Vector3(-22, 0.25, 380),  // Chawls South
        new THREE.Vector3(-22, 0.25, 480),  // 4. Chawls Central
        new THREE.Vector3(-22, 0.25, 700),  // Chawls North
        new THREE.Vector3(-22, 0.25, 900),  // 5. School & North Park
        new THREE.Vector3(-22.5, 0.25, 930),
        new THREE.Vector3(-24.0, 0.25, 940), // North Turn Apex
        new THREE.Vector3(-25.5, 0.25, 930),
        new THREE.Vector3(-26, 0.25, 900),  // Down Line
        new THREE.Vector3(-26, 0.25, 700),
        new THREE.Vector3(-26, 0.25, 480),
        new THREE.Vector3(-26, 0.25, 380),
        new THREE.Vector3(-26, 0.25, 250),
        new THREE.Vector3(-26, 0.25, 140),
        new THREE.Vector3(-26, 0.25, 80),
        new THREE.Vector3(-26, 0.25, 16),
        new THREE.Vector3(-26, 0.25, 8),
        new THREE.Vector3(-25.5, 0.25, 2),
        new THREE.Vector3(-24.0, 0.25, 0.5), // South Turn Apex
        new THREE.Vector3(-22.5, 0.25, 2)
    ];
    const splineLine1 = new THREE.CatmullRomCurve3(line1Points, true, 'centripetal');
    trainSpline = splineLine1;
    const splineLen1 = splineLine1.getLength();

    // 2. Line 2: Central & Harbour Aero-Express Corridor (Red Line: Gateway to CSMIA Airport)
    const line2Points = [
        new THREE.Vector3(-10, 0.25, 16),   // Gateway East
        new THREE.Vector3(-10, 0.25, 140),  // Downtown South
        new THREE.Vector3(-10, 0.25, 250),  // Home HQ East
        new THREE.Vector3(30, 0.25, 330),   // Turn to East
        new THREE.Vector3(180, 0.25, 430),  // 6. Commercial Bazaar Junction
        new THREE.Vector3(280, 0.25, 620),  // Eastern Transit Arc
        new THREE.Vector3(400, 0.25, 860),  // 7. DMCE Academia Station
        new THREE.Vector3(500, 0.25, 1050), // North Aero Viaduct
        new THREE.Vector3(640, 0.25, 1250), // 8. CSMIA Airport Terminal
        new THREE.Vector3(646, 0.25, 1275),
        new THREE.Vector3(652, 0.25, 1270), // Airport Turn Apex
        new THREE.Vector3(646, 0.25, 1250), // Down Return Track
        new THREE.Vector3(506, 0.25, 1050),
        new THREE.Vector3(406, 0.25, 860),
        new THREE.Vector3(286, 0.25, 620),
        new THREE.Vector3(186, 0.25, 430),
        new THREE.Vector3(36, 0.25, 330),
        new THREE.Vector3(-4, 0.25, 250),
        new THREE.Vector3(-4, 0.25, 140),
        new THREE.Vector3(-4, 0.25, 16),
        new THREE.Vector3(-7, 0.25, 4)
    ];
    const splineLine2 = new THREE.CatmullRomCurve3(line2Points, true, 'centripetal');
    const splineLen2 = splineLine2.getLength();

    // 3. Station Definitions across both Corridors (8 Distinct Stations)
    const allStationDefs = [
        { id: 'st-gateway', name: "GATEWAY TERMINUS", mr: "गेटवे ऑफ इंडिया", x: -24, z: 16, spline: splineLine1, line: 1 },
        { id: 'st-marinedrive', name: "MARINE DRIVE HALT", mr: "मरीन ड्राईव्ह", x: -24, z: 80, spline: splineLine1, line: 1 },
        { id: 'st-homehq', name: "DOWNTOWN HOME HQ", mr: "होम मुख्यालय (देव)", x: -24, z: 250, spline: splineLine1, line: 1 },
        { id: 'st-chawls', name: "CHAWLS CENTRAL", mr: "चाळ मध्यवर्ती", x: -24, z: 480, spline: splineLine1, line: 1 },
        { id: 'st-school', name: "SCHOOL & NORTH PARK", mr: "शाळा व उत्तर उद्यान", x: -24, z: 900, spline: splineLine1, line: 1 },
        { id: 'st-bazaar', name: "COMMERCIAL BAZAAR", mr: "व्यापारी बाजार जंक्शन", x: 180, z: 430, spline: splineLine2, line: 2 },
        { id: 'st-dmce', name: "DMCE ACADEMIA", mr: "डी.एम.सी.ई. अभियांत्रिकी", x: 400, z: 860, spline: splineLine2, line: 2 },
        { id: 'st-airport', name: "CSMIA AIRPORT TERMINAL", mr: "छ.शि.म. आंतरराष्ट्रीय विमानतळ", x: 640, z: 1250, spline: splineLine2, line: 2 }
    ];

    const stationPlatGeoms = [];
    const stationCanopyGeoms = [];
    const stationPillarGeoms = [];
    const commuterGeoms = [];

    const platMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.5 });
    const commuterMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });

    allStationDefs.forEach((st) => {
        const plat = new THREE.BoxGeometry(4.2, 0.65, 28);
        plat.translate(st.x - 4.5, 0.325, st.z);
        stationPlatGeoms.push(plat);

        const canopy = new THREE.BoxGeometry(4.8, 0.22, 28);
        canopy.translate(st.x - 4.5, 4.3, st.z);
        stationCanopyGeoms.push(canopy);

        [-10, 0, 10].forEach(pz => {
            const pillar = new THREE.BoxGeometry(0.2, 3.8, 0.2);
            pillar.translate(st.x - 6.0, 2.3, st.z + pz);
            stationPillarGeoms.push(pillar);
        });

        const signTex = createBilingualSignboardTexture(st.mr, st.name);
        const signMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(5.2, 1.3),
            new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
        );
        signMesh.position.set(st.x - 3.8, 3.2, st.z);
        signMesh.rotation.y = Math.PI / 2;
        scene.add(signMesh);

        for (let c = 0; c < 5; c++) {
            const cz = st.z - 8 + c * 3.8 + (Math.random() - 0.5) * 0.8;
            const cx = st.x - 4.2 + (Math.random() - 0.5) * 1.5;
            const body = applyVertexColor(new THREE.BoxGeometry(0.42, 1.1, 0.25), Math.random() > 0.5 ? 0x2563eb : 0xd97706);
            body.translate(cx, 1.2, cz);
            commuterGeoms.push(body);
            const head = applyVertexColor(new THREE.SphereGeometry(0.14, 6, 6), 0xd4a373);
            head.translate(cx, 1.9, cz);
            commuterGeoms.push(head);
        }

        registerBoxCollider(st.x - 6.8, st.x - 2.2, st.z - 14, st.z + 14, `Platform_${st.id}`, -5, 1.2);

        railwayStations.push({
            id: st.id,
            name: st.name,
            mr: st.mr,
            x: st.x,
            z: st.z,
            line: st.line,
            spline: st.spline
        });
    });

    if (stationPlatGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stationPlatGeoms), platMat));
    if (stationCanopyGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stationCanopyGeoms), canopyMat));
    if (stationPillarGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stationPillarGeoms), metalRailingMat));
    if (commuterGeoms.length > 0) {
        scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(commuterGeoms), commuterMat));
    }

    function calibrateSchedule(spline, lineStations) {
        const sched = [];
        const SAMPLES = 800;
        lineStations.forEach(st => {
            let bestS = 0, bestDist = Infinity;
            for (let i = 0; i < SAMPLES; i++) {
                const s = i / SAMPLES;
                const pt = spline.getPointAt(s);
                const d = pt.distanceTo(new THREE.Vector3(st.x, 0.25, st.z));
                if (d < bestDist) { bestDist = d; bestS = s; }
            }
            sched.push({ name: st.name, s: bestS, x: st.x, z: st.z });
        });
        sched.sort((a, b) => a.s - b.s);
        return sched;
    }

    const schedLine1 = calibrateSchedule(splineLine1, allStationDefs.filter(s => s.line === 1));
    const schedLine2 = calibrateSchedule(splineLine2, allStationDefs.filter(s => s.line === 2));
    stationSchedule = schedLine1;

    function buildCorridorTracks(spline, sampleCount) {
        const leftPts = [], rightPts = [];
        const UP = new THREE.Vector3(0, 1, 0);
        for (let i = 0; i < sampleCount; i++) {
            const t = i / sampleCount;
            const pt = spline.getPointAt(t);
            const tan = spline.getTangentAt(t);
            const norm = new THREE.Vector3().crossVectors(tan, UP).normalize();
            leftPts.push(new THREE.Vector3(pt.x + norm.x * 0.838, 0.22, pt.z + norm.z * 0.838));
            rightPts.push(new THREE.Vector3(pt.x - norm.x * 0.838, 0.22, pt.z - norm.z * 0.838));
        }
        const lGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftPts, true, 'centripetal'), sampleCount, 0.05, 5, true);
        const rGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightPts, true, 'centripetal'), sampleCount, 0.05, 5, true);
        const railsMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([lGeom, rGeom]), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 }));
        scene.add(railsMesh);
    }
    buildCorridorTracks(splineLine1, 480);
    buildCorridorTracks(splineLine2, 480);

    function buildEMUCoachSet(trainName, colorHex) {
        const emuPurpleMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45, metalness: 0.15 });
        const emuCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.55 });
        const emuDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
        const emuWheelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });

        function createCoach(type) {
            const coach = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.6, 6.0), emuCreamMat);
            body.position.set(0, 1.8, 0);
            coach.add(body);

            const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.14, 0.5, 6.02), emuPurpleMat);
            stripe.position.set(0, 1.45, 0);
            coach.add(stripe);

            [-1.8, 1.8].forEach(bz => {
                const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 2.1), emuDarkMat);
                bogie.position.set(0, 0.45, bz);
                coach.add(bogie);

                [-0.84, 0.84].forEach(wx => {
                    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 10), emuWheelMat);
                    wheel.rotateZ(Math.PI / 2);
                    wheel.position.set(wx, 0.25, bz);
                    coach.add(wheel);
                });
            });

            if (type === 'lead') {
                const hl = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
                hl.position.set(0, 1.4, 3.02);
                coach.add(hl);
            }
            return coach;
        }

        const c1 = createCoach('lead');
        const c2 = createCoach('motor');
        const c3 = createCoach('trail');
        scene.add(c1); scene.add(c2); scene.add(c3);
        return { c1, c2, c3 };
    }

    // 4 Active Trainsets across both Corridors (Opposing Services)
    const t0 = buildEMUCoachSet("WESTERN FAST UP", 0x7c3aed);
    allTrains.push({
        id: 0,
        name: "Western Express Up (To School)",
        line: 1,
        spline: splineLine1,
        splineLength: splineLen1,
        schedule: schedLine1,
        targetIdx: 0,
        progress: 0.05,
        speed: 0,
        maxSpeed: 16.0,
        isDwelling: true,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t0.c1,
        coach2: t0.c2,
        coach3: t0.c3
    });

    const t1 = buildEMUCoachSet("WESTERN LOCAL DOWN", 0x2563eb);
    allTrains.push({
        id: 1,
        name: "Western Local Down (To Gateway)",
        line: 1,
        spline: splineLine1,
        splineLength: splineLen1,
        schedule: schedLine1,
        targetIdx: Math.floor(schedLine1.length / 2),
        progress: 0.55,
        speed: 12.0,
        maxSpeed: 16.0,
        isDwelling: false,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t1.c1,
        coach2: t1.c2,
        coach3: t1.c3
    });

    const t2 = buildEMUCoachSet("AERO-EXPRESS UP", 0xdc2626);
    allTrains.push({
        id: 2,
        name: "Harbour Aero-Express Up (To Airport)",
        line: 2,
        spline: splineLine2,
        splineLength: splineLen2,
        schedule: schedLine2,
        targetIdx: 0,
        progress: 0.08,
        speed: 0,
        maxSpeed: 18.0,
        isDwelling: true,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t2.c1,
        coach2: t2.c2,
        coach3: t2.c3
    });

    const t3 = buildEMUCoachSet("AERO-EXPRESS DOWN", 0x059669);
    allTrains.push({
        id: 3,
        name: "Harbour Aero-Express Down (To Gateway)",
        line: 2,
        spline: splineLine2,
        splineLength: splineLen2,
        schedule: schedLine2,
        targetIdx: Math.floor(schedLine2.length / 2),
        progress: 0.58,
        speed: 14.0,
        maxSpeed: 18.0,
        isDwelling: false,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t3.c1,
        coach2: t3.c2,
        coach3: t3.c3
    });

    trainState.coach1 = allTrains[0].coach1;
    trainState.coach2 = allTrains[0].coach2;
    trainState.coach3 = allTrains[0].coach3;
    trainState.mesh = allTrains[0].coach1;
    trainState.splineLength = splineLen1;

    window.__allTrains = allTrains;
    window.__railwayStations = railwayStations;
    window.__trainState = trainState;
    window.__trainSpline = splineLine1;
    window.__stationSchedule = stationSchedule;
}

// ------------------------------------------
// SYSTEM 5: TRAFFIC SIGNAL SIMULATION (20 JUNCTIONS)
// ------------------------------------------
function buildTrafficSignalSystem() {
    const signalCoords = [
        { x: 0, z: 16 }, { x: 0, z: 42 }, { x: 0, z: 140 }, { x: 0, z: 240 },
        { x: 0, z: 380 }, { x: 0, z: 500 }, { x: 0, z: 700 }, { x: 0, z: 900 },
        { x: 0, z: 1100 }, { x: 0, z: 1250 },
        { x: -180, z: 16 }, { x: -180, z: 42 }, { x: -180, z: 140 }, { x: -180, z: 240 }, { x: -180, z: 480 },
        { x: -320, z: 900 },
        { x: 180, z: 16 }, { x: 180, z: 140 },
        { x: 420, z: 900 },
        { x: 650, z: 1250 }
    ];

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const offMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
    const postGeoms = [];

    signalCoords.forEach((loc, idx) => {
        const pole = new THREE.CylinderGeometry(0.12, 0.14, 4.2, 8);
        pole.translate(loc.x + 7.0, 2.1, loc.z + 7.0);
        postGeoms.push(pole);

        const nsHead = new THREE.Group();
        nsHead.position.set(loc.x + 7.0, 3.6, loc.z + 7.0);
        const rLight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), offMat.clone());
        rLight.position.set(0, 0.35, 0);
        const aLight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), offMat.clone());
        aLight.position.set(0, 0, 0);
        const gLight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), greenMat.clone());
        gLight.position.set(0, -0.35, 0);
        nsHead.add(rLight); nsHead.add(aLight); nsHead.add(gLight);
        scene.add(nsHead);

        trafficSignals.push({
            id: idx,
            x: loc.x,
            z: loc.z,
            phase: 0,
            timer: (idx * 3.7) % 25.0,
            rLight, aLight, gLight,
            isRedFor: function(carX, carZ, dirX, dirZ) {
                const isNS = Math.abs(dirZ) > Math.abs(dirX);
                if (isNS) {
                    return this.phase === 2 || this.phase === 3 || this.phase === 1;
                } else {
                    return this.phase === 0 || this.phase === 1 || this.phase === 3;
                }
            }
        });
    });

    if (postGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(postGeoms), poleMat));
    window.__trafficSignals = trafficSignals;
}

// ------------------------------------------
// SYSTEM 2: ROAD TRAFFIC SIMULATION (60 VEHICLES)
// ------------------------------------------
function buildRoadTrafficSystem() {
    const laneConfigs = [
        { startX: 6, startZ: 20, dirX: 0, dirZ: 1, maxZ: 1380, minZ: 20 },
        { startX: -6, startZ: 1380, dirX: 0, dirZ: -1, maxZ: 1380, minZ: 20 },
        { startX: -174, startZ: 20, dirX: 0, dirZ: 1, maxZ: 470, minZ: 20 },
        { startX: -186, startZ: 470, dirX: 0, dirZ: -1, maxZ: 470, minZ: 20 },
        { startX: -314, startZ: 250, dirX: 0, dirZ: 1, maxZ: 980, minZ: 250 },
        { startX: -326, startZ: 980, dirX: 0, dirZ: -1, maxZ: 980, minZ: 250 },
        { startX: 426, startZ: 250, dirX: 0, dirZ: 1, maxZ: 980, minZ: 250 },
        { startX: 414, startZ: 980, dirX: 0, dirZ: -1, maxZ: 980, minZ: 250 },
        { startX: -400, startZ: 896, dirX: 1, dirZ: 0, minX: -400, maxX: 500 },
        { startX: 500, startZ: 904, dirX: -1, dirZ: 0, minX: -400, maxX: 500 },
        { startX: 160, startZ: 1246, dirX: 1, dirZ: 0, minX: 160, maxX: 850 },
        { startX: 850, startZ: 1254, dirX: -1, dirZ: 0, minX: 160, maxX: 850 }
    ];

    const carPalette = [0x3b82f6, 0xe2e8f0, 0x0f172a, 0xdc2626, 0x06b6d4, 0xf97316, 0x8b5cf6];

    for (let i = 0; i < 12; i++) {
        const lane = laneConfigs[i % laneConfigs.length];
        const vGroup = new THREE.Group();
        const color = carPalette[i % carPalette.length];

        const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 4.2), new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.3 }));
        body.position.y = 0.55;
        vGroup.add(body);

        const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.85 }));
        glass.position.set(0, 1.05, -0.2);
        vGroup.add(glass);

        [-0.7, 0.7].forEach(hx => {
            const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
            hl.position.set(hx, 0.5, 2.12);
            vGroup.add(hl);
        });

        const wheels = [];
        [-0.95, 0.95].forEach(wx => {
            [-1.2, 1.2].forEach(wz => {
                const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 10), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
                w.rotateZ(Math.PI / 2);
                w.position.set(wx, 0.32, wz);
                vGroup.add(w);
                wheels.push(w);
            });
        });

        const offsetAlongLane = (i * 70.0) % 800;
        const curX = lane.dirX !== 0 ? (lane.startX + lane.dirX * offsetAlongLane) : lane.startX;
        const curZ = lane.dirZ !== 0 ? (lane.startZ + lane.dirZ * offsetAlongLane) : lane.startZ;

        vGroup.position.set(curX, 0, curZ);
        vGroup.rotation.y = Math.atan2(lane.dirX, lane.dirZ);
        scene.add(vGroup);

        trafficVehicles.push({
            id: i,
            isDetailed: true,
            group: vGroup,
            wheels,
            lane,
            x: curX,
            z: curZ,
            dirX: lane.dirX,
            dirZ: lane.dirZ,
            speed: 12.0 + (i % 4) * 1.5,
            targetSpeed: 12.0
        });
    }

    const instGeom = new THREE.BoxGeometry(1.9, 0.85, 3.8);
    const instMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
    const instMesh = new THREE.InstancedMesh(instGeom, instMat, 48);
    instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instMesh);

    const dummy = new THREE.Object3D();
    for (let k = 0; k < 48; k++) {
        const lane = laneConfigs[(k + 12) % laneConfigs.length];
        const offset = (k * 45.0) % 900;
        const curX = lane.dirX !== 0 ? (lane.startX + lane.dirX * offset) : lane.startX;
        const curZ = lane.dirZ !== 0 ? (lane.startZ + lane.dirZ * offset) : lane.startZ;

        dummy.position.set(curX, 0.5, curZ);
        dummy.rotation.y = Math.atan2(lane.dirX, lane.dirZ);
        dummy.updateMatrix();
        instMesh.setMatrixAt(k, dummy.matrix);

        trafficVehicles.push({
            id: 12 + k,
            isDetailed: false,
            instIndex: k,
            lane,
            x: curX,
            z: curZ,
            dirX: lane.dirX,
            dirZ: lane.dirZ,
            speed: 11.0 + (k % 3) * 1.2,
            targetSpeed: 11.0
        });
    }
    instMesh.instanceMatrix.needsUpdate = true;
    window.__trafficVehicles = trafficVehicles;
    window.__instancedTraffic = instMesh;
    window.__trafficDummy = dummy;
}

// ------------------------------------------
// SYSTEM 6: PUBLIC TRANSPORT SIMULATION (12 BUSES + 8 TAXIS)
// ------------------------------------------
function buildPublicTransitSystem() {
    const busMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
    const taxiBlackMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.35 });
    const taxiYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

    for (let b = 0; b < 12; b++) {
        const busGroup = new THREE.Group();
        const isDoubleDecker = (b % 3 === 0);

        const lower = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 8.4), busMat);
        lower.position.y = 1.1;
        busGroup.add(lower);

        const height = isDoubleDecker ? 1.6 : 0.3;
        const upper = new THREE.Mesh(new THREE.BoxGeometry(2.55, height, 8.2), isDoubleDecker ? busMat : creamMat);
        upper.position.y = isDoubleDecker ? 2.8 : 2.15;
        busGroup.add(upper);

        [-1.25, 1.25].forEach(wx => {
            [-2.6, 2.6].forEach(wz => {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.28, 10), new THREE.MeshStandardMaterial({ color: 0x18181b }));
                wheel.rotateZ(Math.PI / 2);
                wheel.position.set(wx, 0.48, wz);
                busGroup.add(wheel);
            });
        });

        const destBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.45), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
        destBoard.position.set(0, isDoubleDecker ? 3.4 : 1.9, 4.22);
        busGroup.add(destBoard);

        const route = (b < 6) ? 1 : 2;
        const startZ = 20 + b * 110;
        const posX = route === 1 ? -6 : 6;
        busGroup.position.set(posX, 0, startZ);
        busGroup.rotation.y = (route === 1) ? Math.PI : 0;
        scene.add(busGroup);

        publicTransit.push({
            id: `bus_${b}`,
            type: 'bus',
            group: busGroup,
            route,
            x: posX,
            z: startZ,
            dirX: 0,
            dirZ: route === 1 ? -1 : 1,
            speed: 10.0,
            targetSpeed: 10.0,
            dwellTimer: 0,
            isDwelling: false
        });
    }

    for (let tx = 0; tx < 8; tx++) {
        const taxiGroup = new THREE.Group();

        const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 3.8), taxiBlackMat);
        lower.position.y = 0.52;
        taxiGroup.add(lower);

        const upper = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 2.0), taxiYellowMat);
        upper.position.set(0, 1.05, -0.15);
        taxiGroup.add(upper);

        const roofLight = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.22), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
        roofLight.position.set(0, 1.4, -0.15);
        taxiGroup.add(roofLight);

        const laneZ = 40 + tx * 160;
        taxiGroup.position.set(-174, 0, laneZ);
        scene.add(taxiGroup);

        publicTransit.push({
            id: `taxi_${tx}`,
            type: 'taxi',
            group: taxiGroup,
            x: -174,
            z: laneZ,
            dirX: 0,
            dirZ: 1,
            speed: 13.5,
            targetSpeed: 13.5
        });
    }

    window.__publicTransit = publicTransit;
}

// ------------------------------------------
// TRANSIT & TRAFFIC ANIMATION UPDATES
// ------------------------------------------
function updateRailwaySystem(delta) {
    if (!allTrains || allTrains.length === 0) return;

    for (let i = 0; i < allTrains.length; i++) {
        const tr = allTrains[i];
        if (!tr.spline || tr.schedule.length === 0 || !tr.coach1) continue;

        const targetStop = tr.schedule[tr.targetIdx];
        let distS = targetStop.s - tr.progress;
        if (distS < 0) distS += 1.0;
        const distM = distS * tr.splineLength;

        if (tr.isDwelling) {
            tr.dwellTimer += delta;
            tr.speed = 0;
            if (tr.dwellTimer > 3.8 && !tr.hornPlayed) {
                if (i === 0 || tr === boardableTrain) playSound('trainHorn');
                tr.hornPlayed = true;
            }
            if (tr.dwellTimer >= 5.0) {
                tr.isDwelling = false;
                tr.dwellTimer = 0;
                tr.hornPlayed = false;
                tr.targetIdx = (tr.targetIdx + 1) % tr.schedule.length;
            }
        } else {
            if (distM < 16.0) {
                const targetSpeed = Math.max(1.5, (distM / 16.0) * tr.maxSpeed);
                tr.speed = THREE.MathUtils.lerp(tr.speed, targetSpeed, 0.08);
                if (distM < 0.4 || distM > tr.splineLength - 1.0) {
                    tr.progress = targetStop.s;
                    tr.speed = 0;
                    tr.isDwelling = true;
                    tr.dwellTimer = 0;
                    tr.hornPlayed = false;
                    if (i === 0 || tr === boardableTrain) playSound('chime');
                }
            } else {
                tr.speed = THREE.MathUtils.lerp(tr.speed, tr.maxSpeed, 0.05);
            }
            tr.progress = (tr.progress + (tr.speed * delta) / tr.splineLength) % 1.0;
        }

        const deltaS = 6.8 / tr.splineLength;
        const s1 = tr.progress;
        const s2 = (tr.progress - deltaS + 1.0) % 1.0;
        const s3 = (tr.progress - deltaS * 2 + 1.0) % 1.0;

        const p1 = tr.spline.getPointAt(s1);
        const t1 = tr.spline.getTangentAt(s1);
        tr.coach1.position.copy(p1);
        tr.coach1.rotation.y = Math.atan2(t1.x, t1.z);

        const p2 = tr.spline.getPointAt(s2);
        const t2 = tr.spline.getTangentAt(s2);
        tr.coach2.position.copy(p2);
        tr.coach2.rotation.y = Math.atan2(t2.x, t2.z);

        const p3 = tr.spline.getPointAt(s3);
        const t3 = tr.spline.getTangentAt(s3);
        tr.coach3.position.copy(p3);
        tr.coach3.rotation.y = Math.atan2(t3.x, t3.z);

        if (i === 0 || tr === boardableTrain) {
            trainState.x = p1.x;
            trainState.z = p1.z;
            trainState.speed = tr.speed;
            trainState.isDwelling = tr.isDwelling;
            trainState.progress = tr.progress;
        }
    }
}

function updateTrafficSignals(delta) {
    if (!trafficSignals || trafficSignals.length === 0) return;
    for (let i = 0; i < trafficSignals.length; i++) {
        const sig = trafficSignals[i];
        sig.timer = (sig.timer + delta) % 25.0;

        let newPhase = 0;
        if (sig.timer < 10.0) newPhase = 0;
        else if (sig.timer < 12.5) newPhase = 1;
        else if (sig.timer < 22.5) newPhase = 2;
        else newPhase = 3;

        if (sig.phase !== newPhase) {
            sig.phase = newPhase;
            if (sig.rLight && sig.aLight && sig.gLight) {
                if (newPhase === 0) {
                    sig.gLight.material.color.setHex(0x22c55e);
                    sig.aLight.material.color.setHex(0x334155);
                    sig.rLight.material.color.setHex(0x334155);
                } else if (newPhase === 1) {
                    sig.gLight.material.color.setHex(0x334155);
                    sig.aLight.material.color.setHex(0xf59e0b);
                    sig.rLight.material.color.setHex(0x334155);
                } else if (newPhase === 2) {
                    sig.gLight.material.color.setHex(0x334155);
                    sig.aLight.material.color.setHex(0x334155);
                    sig.rLight.material.color.setHex(0xef4444);
                } else {
                    sig.gLight.material.color.setHex(0x334155);
                    sig.aLight.material.color.setHex(0xf59e0b);
                    sig.rLight.material.color.setHex(0xef4444);
                }
            }
        }
    }
}

function updateRoadTraffic(delta) {
    if (!trafficVehicles || trafficVehicles.length === 0) return;
    const instMesh = window.__instancedTraffic;
    const dummy = window.__trafficDummy;
    let instNeedsUpdate = false;

    for (let i = 0; i < trafficVehicles.length; i++) {
        const v = trafficVehicles[i];
        let targetSpeed = 12.0;

        for (let s = 0; s < trafficSignals.length; s++) {
            const sig = trafficSignals[s];
            const dx = sig.x - v.x;
            const dz = sig.z - v.z;
            const dist = Math.hypot(dx, dz);
            if (dist < 16.0) {
                const dot = dx * v.dirX + dz * v.dirZ;
                if (dot > 0 && dot < 14.0) {
                    if (sig.isRedFor(v.x, v.z, v.dirX, v.dirZ)) {
                        targetSpeed = 0;
                        break;
                    }
                }
            }
        }

        if (targetSpeed > 0) {
            for (let j = 0; j < trafficVehicles.length; j++) {
                if (i === j) continue;
                const other = trafficVehicles[j];
                const dx = other.x - v.x;
                const dz = other.z - v.z;
                const dot = dx * v.dirX + dz * v.dirZ;
                if (dot > 0 && dot < 9.0) {
                    const perp = Math.abs(dx * v.dirZ - dz * v.dirX);
                    if (perp < 2.5) {
                        targetSpeed = Math.min(targetSpeed, Math.max(0, other.speed - 2.0));
                        break;
                    }
                }
            }
        }

        v.speed = THREE.MathUtils.lerp(v.speed, targetSpeed, delta * 3.5);

        if (v.dirZ !== 0) {
            v.z += v.dirZ * v.speed * delta;
            if (v.lane.maxZ !== undefined && v.lane.minZ !== undefined) {
                if (v.z > v.lane.maxZ) v.z = v.lane.minZ;
                else if (v.z < v.lane.minZ) v.z = v.lane.maxZ;
            }
        } else if (v.dirX !== 0) {
            v.x += v.dirX * v.speed * delta;
            if (v.lane.maxX !== undefined && v.lane.minX !== undefined) {
                if (v.x > v.lane.maxX) v.x = v.lane.minX;
                else if (v.x < v.lane.minX) v.x = v.lane.maxX;
            }
        }

        if (v.isDetailed) {
            v.group.position.set(v.x, 0, v.z);
            if (v.wheels) {
                v.wheels.forEach(w => {
                    w.rotation.x += v.speed * delta * 2.5;
                });
            }
        } else if (instMesh && dummy) {
            dummy.position.set(v.x, 0.5, v.z);
            dummy.rotation.y = Math.atan2(v.dirX, v.dirZ);
            dummy.updateMatrix();
            instMesh.setMatrixAt(v.instIndex, dummy.matrix);
            instNeedsUpdate = true;
        }
    }

    if (instNeedsUpdate && instMesh) {
        instMesh.instanceMatrix.needsUpdate = true;
    }
}

function updatePublicTransit(delta) {
    if (!publicTransit || publicTransit.length === 0) return;

    for (let i = 0; i < publicTransit.length; i++) {
        const pt = publicTransit[i];

        if (pt.type === 'bus') {
            if (pt.isDwelling) {
                pt.dwellTimer += delta;
                pt.speed = 0;
                if (pt.dwellTimer >= 4.0) {
                    pt.isDwelling = false;
                    pt.dwellTimer = 0;
                }
            } else {
                let targetSpeed = 10.0;
                for (let s = 0; s < trafficSignals.length; s++) {
                    const sig = trafficSignals[s];
                    const dz = sig.z - pt.z;
                    if (Math.abs(sig.x - pt.x) < 8 && dz * pt.dirZ > 0 && Math.abs(dz) < 14.0) {
                        if (sig.isRedFor(pt.x, pt.z, pt.dirX, pt.dirZ)) {
                            targetSpeed = 0;
                            break;
                        }
                    }
                }
                pt.speed = THREE.MathUtils.lerp(pt.speed, targetSpeed, delta * 3.0);
                pt.z += pt.dirZ * pt.speed * delta;

                if (pt.route === 1) {
                    if (pt.z < 20) pt.z = 1350;
                } else {
                    if (pt.z > 1350) pt.z = 20;
                }

                if (Math.floor(pt.z) % 220 < 2 && pt.speed > 4.0) {
                    pt.isDwelling = true;
                    pt.dwellTimer = 0;
                }
            }
            pt.group.position.set(pt.x, 0, pt.z);
        } else if (pt.type === 'taxi') {
            let targetSpeed = 13.5;
            for (let s = 0; s < trafficSignals.length; s++) {
                const sig = trafficSignals[s];
                const dz = sig.z - pt.z;
                if (Math.abs(sig.x - pt.x) < 8 && dz * pt.dirZ > 0 && Math.abs(dz) < 14.0) {
                    if (sig.isRedFor(pt.x, pt.z, pt.dirX, pt.dirZ)) {
                        targetSpeed = 0;
                        break;
                    }
                }
            }
            pt.speed = THREE.MathUtils.lerp(pt.speed, targetSpeed, delta * 3.5);
            pt.z += pt.dirZ * pt.speed * delta;
            if (pt.z > 470) pt.z = 20;
            pt.group.position.set(pt.x, 0, pt.z);
        }
    }
}

buildRailwaySystem();
buildTrafficSignalSystem();
buildRoadTrafficSystem();
buildPublicTransitSystem();

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

ironManSuit.scale.set(0.68, 0.68, 0.68);
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

// Procedural Articulated Developer Character (Realistic Locomotion & Proportions)
function createArticulatedDeveloper() {
    const group = new THREE.Group();
    group.name = "ArticulatedDeveloper";

    const skinColor = 0xc68652;
    const shirtColor = 0x18181b; // Charcoal black modern tee
    const pantsColor = 0x1e293b; // Dark navy / indigo denim
    const shoeColor = 0x09090b;  // Dark sneaker body
    const soleColor = 0xf8fafc;  // Crisp white sneaker sole
    const hairColor = 0x171717;  // Natural styled black hair

    const devMat = new THREE.MeshStandardMaterial({ roughness: 0.65, vertexColors: true });

    // 1. Torso + Head + Neck + Hair
    const bodyGeoms = [];
    const torso = applyVertexColor(new THREE.BoxGeometry(0.48, 0.65, 0.26), shirtColor);
    torso.translate(0, 1.25, 0);
    bodyGeoms.push(torso);

    const neck = applyVertexColor(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 10), skinColor);
    neck.translate(0, 1.62, 0);
    bodyGeoms.push(neck);

    const head = applyVertexColor(new THREE.SphereGeometry(0.18, 12, 12), skinColor);
    head.translate(0, 1.76, 0);
    bodyGeoms.push(head);

    const hairTop = applyVertexColor(new THREE.SphereGeometry(0.19, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), hairColor);
    hairTop.rotateX(-0.15);
    hairTop.translate(0, 1.80, 0);
    bodyGeoms.push(hairTop);

    const mergedBody = BufferGeometryUtils.mergeGeometries(bodyGeoms, false);
    const bodyMesh = new THREE.Mesh(mergedBody, devMat);
    group.add(bodyMesh);

    // 2. Articulated Left Arm (Shoulder Pivot at -0.30, 1.50, 0)
    const armL = new THREE.Group();
    armL.position.set(-0.30, 1.50, 0);
    const sleeveL = applyVertexColor(new THREE.CylinderGeometry(0.075, 0.07, 0.24, 10), shirtColor);
    sleeveL.translate(0, -0.12, 0);
    const forearmL = applyVertexColor(new THREE.CylinderGeometry(0.06, 0.052, 0.32, 10), skinColor);
    forearmL.translate(0, -0.38, 0);
    const handL = applyVertexColor(new THREE.SphereGeometry(0.054, 8, 8), skinColor);
    handL.translate(0, -0.56, 0);
    const watchL = applyVertexColor(new THREE.TorusGeometry(0.065, 0.016, 6, 12), 0x06b6d4);
    watchL.rotateX(Math.PI / 2);
    watchL.translate(0, -0.48, 0);
    const mergedArmL = BufferGeometryUtils.mergeGeometries([sleeveL, forearmL, handL, watchL], false);
    armL.add(new THREE.Mesh(mergedArmL, devMat));
    group.add(armL);

    // 3. Articulated Right Arm (Shoulder Pivot at 0.30, 1.50, 0)
    const armR = new THREE.Group();
    armR.position.set(0.30, 1.50, 0);
    const sleeveR = applyVertexColor(new THREE.CylinderGeometry(0.075, 0.07, 0.24, 10), shirtColor);
    sleeveR.translate(0, -0.12, 0);
    const forearmR = applyVertexColor(new THREE.CylinderGeometry(0.06, 0.052, 0.32, 10), skinColor);
    forearmR.translate(0, -0.38, 0);
    const handR = applyVertexColor(new THREE.SphereGeometry(0.054, 8, 8), skinColor);
    handR.translate(0, -0.56, 0);
    const mergedArmR = BufferGeometryUtils.mergeGeometries([sleeveR, forearmR, handR], false);
    armR.add(new THREE.Mesh(mergedArmR, devMat));
    group.add(armR);

    // 4. Articulated Left Leg (Hip Pivot at -0.13, 0.90, 0)
    const legL = new THREE.Group();
    legL.position.set(-0.13, 0.90, 0);
    const pantsL = applyVertexColor(new THREE.BoxGeometry(0.18, 0.76, 0.20), pantsColor);
    pantsL.translate(0, -0.38, 0);
    const shoeL = applyVertexColor(new THREE.BoxGeometry(0.16, 0.10, 0.26), shoeColor);
    shoeL.translate(0, -0.76, 0.03);
    const soleL = applyVertexColor(new THREE.BoxGeometry(0.165, 0.03, 0.27), soleColor);
    soleL.translate(0, -0.81, 0.03);
    const mergedLegL = BufferGeometryUtils.mergeGeometries([pantsL, shoeL, soleL], false);
    legL.add(new THREE.Mesh(mergedLegL, devMat));
    group.add(legL);

    // 5. Articulated Right Leg (Hip Pivot at 0.13, 0.90, 0)
    const legR = new THREE.Group();
    legR.position.set(0.13, 0.90, 0);
    const pantsR = applyVertexColor(new THREE.BoxGeometry(0.18, 0.76, 0.20), pantsColor);
    pantsR.translate(0, -0.38, 0);
    const shoeR = applyVertexColor(new THREE.BoxGeometry(0.16, 0.10, 0.26), shoeColor);
    shoeR.translate(0, -0.76, 0.03);
    const soleR = applyVertexColor(new THREE.BoxGeometry(0.165, 0.03, 0.27), soleColor);
    soleR.translate(0, -0.81, 0.03);
    const mergedLegR = BufferGeometryUtils.mergeGeometries([pantsR, shoeR, soleR], false);
    legR.add(new THREE.Mesh(mergedLegR, devMat));
    group.add(legR);

    return { group, armL, armR, legL, legR, bodyMesh };
}

const devChar = createArticulatedDeveloper();
let casualMeshRoot = devChar.group;
characterGroup.add(devChar.group);
devChar.group.visible = false;

// Precompile WebGL shader pipelines upfront (PSO cache pattern) to eliminate runtime stutter
try {
    renderer.compile(scene, camera);
} catch (e) {
    console.warn("Pipeline pre-compile notice:", e);
}

// Instantly dismiss loading screen once 3D world is ready
const ls = document.getElementById('loading-screen');
if (ls) {
    ls.style.opacity = '0';
    setTimeout(() => ls.style.display = 'none', 600);
}

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
    if (k === 'p' || k === 'm') toggleCyberPhone();
    if (k === 'c') {
        if (isFlightMode) keys.c = true;
        else toggleCameraMode();
    }
    if (k === 'escape') {
        closeModal();
        closeLandmarkModal();
        closeCyberPhone();
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

// ==========================================
// MOBILE TOUCH JOYSTICK & CONTROLS
// ==========================================
const joystickBase = document.getElementById('joystick-base');
const joystickThumb = document.getElementById('joystick-thumb');

if (joystickBase && joystickThumb) {
    let joystickActive = false;
    let touchId = null;
    let baseRect = null;
    const maxRadius = 38;

    const onTouchStart = (e) => {
        if (joystickActive) return;
        const touch = e.changedTouches[0];
        touchId = touch.identifier;
        joystickActive = true;
        baseRect = joystickBase.getBoundingClientRect();
        updateJoystickPos(touch.clientX, touch.clientY);
        e.preventDefault();
    };

    const updateJoystickPos = (clientX, clientY) => {
        const centerX = baseRect.left + baseRect.width / 2;
        const centerY = baseRect.top + baseRect.height / 2;
        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
        }

        joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;

        const normX = dx / maxRadius;
        const normY = dy / maxRadius;
        const deadzone = 0.25;

        keys.w = normY < -deadzone;
        keys.s = normY > deadzone;
        keys.a = normX < -deadzone;
        keys.d = normX > deadzone;
    };

    const onTouchMove = (e) => {
        if (!joystickActive) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId) {
                updateJoystickPos(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                e.preventDefault();
                break;
            }
        }
    };

    const onTouchEnd = (e) => {
        if (!joystickActive) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId) {
                joystickActive = false;
                touchId = null;
                joystickThumb.style.transform = 'translate(0px, 0px)';
                keys.w = false;
                keys.s = false;
                keys.a = false;
                keys.d = false;
                e.preventDefault();
                break;
            }
        }
    };

    joystickBase.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onTouchEnd, { passive: false });
}

// Touch Action Buttons
const bindTouchBtn = (id, onDown, onUp) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        onDown();
    }, { passive: false });
    if (onUp) {
        el.addEventListener('touchend', (e) => {
            e.preventDefault();
            onUp();
        }, { passive: false });
        el.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            onUp();
        }, { passive: false });
    }
};

bindTouchBtn('touch-btn-jump', () => { keys.space = true; }, () => { keys.space = false; });
bindTouchBtn('touch-btn-action', () => handleInteraction());
bindTouchBtn('touch-btn-ride', () => toggleVehicleMount());
bindTouchBtn('touch-btn-fly', () => toggleFlightMode());
bindTouchBtn('touch-btn-cam', () => toggleCameraMode());

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

    // Dynamic Surface Elevation Check (Helipad, Building Rooftops, Platforms, or Ground)
    const surfaceY = getSurfaceElevationAt(characterGroup.position.x, characterGroup.position.z, characterGroup.position.y);
    if (surfaceY > 0) {
        currentFloorElevation = surfaceY;
    } else if (characterGroup.position.z >= -20) {
        currentFloorElevation = 0;
    } else {
        currentFloorElevation = 0.1;
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
    ironManSuit.visible = false;
    if (casualMeshRoot) casualMeshRoot.visible = true;

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

// Fast Travel Teleport System (with Mumbai City Express Subway Cutaway Vignette)
function teleportTo(targetX, targetZ, label, targetY = 0) {
    if (isFlightMode) exitFlightMode(false);
    if (activeVehicle) dismountVehicle();

    const vignette = document.getElementById('subway-vignette');
    const destTitle = document.getElementById('subway-dest-title');
    const fade = document.getElementById('fade-overlay');

    if (destTitle && label) {
        destTitle.textContent = `NEXT STOP: ${label.toUpperCase()}`;
    }

    if (vignette) {
        vignette.classList.add('active');
        playSound('chime');
    } else if (fade) {
        fade.style.opacity = '1';
        playSound('chime');
    }

    setTimeout(() => {
        currentFloorElevation = targetY;
        window.__currentFloorElevation = currentFloorElevation;
        characterGroup.position.set(targetX, targetY, targetZ);
        characterGroup.rotation.y = Math.PI; // Face South into the open city
        camera.position.set(targetX, targetY + 7.5, targetZ - 14);
        camera.lookAt(targetX, targetY + 2, targetZ + 4);

        setTimeout(() => {
            if (vignette) vignette.classList.remove('active');
            if (fade) fade.style.opacity = '0';
        }, 380);
    }, 620);
}

// ==========================================
// CYBER-SMARTPHONE DRAWER CONTROLLER ("FNSM App" Style)
// ==========================================
const phoneOverlay = document.getElementById('cyber-phone-overlay');
const btnMobileOptions = document.getElementById('btn-mobile-options');
const btnPhoneClose = document.getElementById('btn-phone-close');
const phoneTabs = document.querySelectorAll('.phone-tab-btn');
const phoneTabContents = document.querySelectorAll('.phone-tab-content');
const phoneClock = document.getElementById('phone-clock');
const phoneCurLoc = document.getElementById('phone-cur-loc');

function openCyberPhone() {
    if (phoneOverlay) phoneOverlay.classList.add('open');
    if (phoneClock) {
        const d = new Date();
        phoneClock.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    const currentDistrictEl = document.getElementById('gta-district-name');
    if (phoneCurLoc && currentDistrictEl) {
        phoneCurLoc.textContent = currentDistrictEl.textContent;
    }
    playSound('chime');
}

function closeCyberPhone() {
    if (phoneOverlay) phoneOverlay.classList.remove('open');
}

function toggleCyberPhone() {
    if (!phoneOverlay) return;
    if (phoneOverlay.classList.contains('open')) closeCyberPhone();
    else openCyberPhone();
}

if (btnMobileOptions) btnMobileOptions.addEventListener('click', toggleCyberPhone);
if (btnPhoneClose) btnPhoneClose.addEventListener('click', closeCyberPhone);
if (phoneOverlay) {
    phoneOverlay.addEventListener('click', (e) => {
        if (e.target === phoneOverlay) closeCyberPhone();
    });
}

phoneTabs.forEach(btn => {
    btn.addEventListener('click', () => {
        phoneTabs.forEach(b => b.classList.remove('active'));
        phoneTabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('active');
        playSound('click');
    });
});

// Fast Travel transit cards inside Cyber-Phone
document.querySelectorAll('.transit-card').forEach(card => {
    card.addEventListener('click', () => {
        const x = parseFloat(card.getAttribute('data-x'));
        const z = parseFloat(card.getAttribute('data-z'));
        const y = parseFloat(card.getAttribute('data-y') || 0);
        const name = card.getAttribute('data-name');
        closeCyberPhone();
        teleportTo(x, z, name, y);
    });
});

// Environment buttons inside Cyber-Phone
const phoneBtnTime = document.getElementById('phone-btn-time');
if (phoneBtnTime) phoneBtnTime.addEventListener('click', () => { cycleTimeOfDay(); playSound('click'); });
const phoneBtnWeather = document.getElementById('phone-btn-weather');
if (phoneBtnWeather) phoneBtnWeather.addEventListener('click', () => { cycleWeather(); playSound('click'); });
const phoneBtnCam = document.getElementById('phone-btn-cam');
if (phoneBtnCam) phoneBtnCam.addEventListener('click', () => { toggleCameraMode(); playSound('click'); });
const phoneBtnAudio = document.getElementById('phone-btn-audio');
if (phoneBtnAudio) phoneBtnAudio.addEventListener('click', () => { toggleAudio(); playSound('click'); });

// ==========================================
// 3D SPATIAL WORLD WAYPOINTS
// ==========================================
const WORLD_WAYPOINTS = [
    { id: 'wp-home', name: 'Home HQ', icon: '🏠', pos: new THREE.Vector3(0, 18, 140) },
    { id: 'wp-gateway', name: 'Gateway', icon: '🏛️', pos: new THREE.Vector3(0, 14, 0) },
    { id: 'wp-school', name: "School", icon: '🏫', pos: new THREE.Vector3(-320, 16, 920) },
    { id: 'wp-college', name: 'DMCE College', icon: '🎓', pos: new THREE.Vector3(420, 20, 880) },
    { id: 'wp-airport', name: 'Airport', icon: '✈️', pos: new THREE.Vector3(650, 16, 1250) }
];

const waypointsContainer = document.getElementById('world-waypoints-container');
const waypointEls = new Map();

if (waypointsContainer) {
    WORLD_WAYPOINTS.forEach(wp => {
        const pin = document.createElement('div');
        pin.className = 'world-waypoint-pin';
        pin.innerHTML = `<span>${wp.icon}</span> <span>${wp.name}</span> <span class="wp-dist-badge">0m</span>`;
        pin.addEventListener('click', () => {
            teleportTo(wp.pos.x, wp.pos.z, wp.name, 0);
        });
        waypointsContainer.appendChild(pin);
        waypointEls.set(wp.id, pin);
    });
}

function updateWorldWaypoints() {
    if (!waypointsContainer || waypointEls.size === 0) return;
    const playerPos = characterGroup.position;
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;

    WORLD_WAYPOINTS.forEach(wp => {
        const pin = waypointEls.get(wp.id);
        if (!pin) return;

        const dist = Math.round(playerPos.distanceTo(wp.pos));
        const distBadge = pin.querySelector('.wp-dist-badge');
        if (distBadge) distBadge.textContent = `${dist}m`;

        // Hide pin if player is directly within landmark zone (< 10m)
        if (dist < 10) {
            pin.style.display = 'none';
            return;
        }

        // Project 3D world pos to 2D screen NDC
        const screenPos = wp.pos.clone().project(camera);

        // Check if point is behind camera (z > 1) or out of viewport bounds
        if (screenPos.z > 1.0 || screenPos.x < -0.92 || screenPos.x > 0.92 || screenPos.y < -0.92 || screenPos.y > 0.92) {
            pin.style.display = 'none';
            return;
        }

        pin.style.display = 'flex';
        const screenX = (screenPos.x * halfW) + halfW;
        const screenY = -(screenPos.y * halfH) + halfH;
        pin.style.left = `${screenX}px`;
        pin.style.top = `${screenY}px`;
    });
}

const btnTpGw = document.getElementById('btn-tp-gateway');
if (btnTpGw) btnTpGw.addEventListener('click', () => teleportTo(0, -6, 'Gateway', 0));
const btnTpHm = document.getElementById('btn-tp-home');
if (btnTpHm) btnTpHm.addEventListener('click', () => teleportTo(0, 122, 'Home HQ', 0));
const btnTpSc = document.getElementById('btn-tp-school');
if (btnTpSc) btnTpSc.addEventListener('click', () => teleportTo(poiSchool.x, poiSchool.z - 16, 'School', 0));
const btnTpCl = document.getElementById('btn-tp-college');
if (btnTpCl) btnTpCl.addEventListener('click', () => teleportTo(poiCollege.x, poiCollege.z - 16, 'DMCE College', 0));
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

// GTA Style Tachometer & Radar HUD Controllers
const speedoCard = document.getElementById('speedo-card');
const speedoMode = document.getElementById('speedo-mode');
const speedoVal = document.getElementById('speedo-val');

const tachoCard = document.getElementById('tachometer-card');
const tachoSpeedVal = document.getElementById('tacho-speed-value');
const tachoGearBadge = document.getElementById('tacho-gear-badge');
const tachoNeedlePivot = document.getElementById('tacho-needle-pivot');
const tachoActiveArc = document.getElementById('tacho-active-arc');
const tachoModeLabel = document.getElementById('tacho-mode-label');

function getDistrictName(x, z) {
    if (z < -10) {
        if (Math.abs(x) < 35) return "GATEWAY ESPLANADE | ARABIAN HARBOR";
        return "HAJI ALI CAUSEWAY | WORLI SHORELINE";
    }
    if (z >= -10 && z < 70) {
        if (x < -20 && z < 35) return "CENTRAL RAILWAY TERMINUS | VT LINE";
        return "MARINE DRIVE PROMENADE | SOUTH COAST";
    }
    if (z >= 70 && z < 350) {
        if (x < -150) return "WEST RESIDENTIAL | HISTORIC CHAWLS";
        if (x > 150) return "EAST COMMERCIAL | CYBER BAZAAR";
        return "MIDTOWN AVENUE | HOME HQ PLAZA";
    }
    if (z >= 350 && z < 750) {
        if (x < -150) return "WEST CHAWLS & RESIDENTIAL DISTRICT";
        if (x > 150) return "COMMERCIAL TECH MART & BAZAAR";
        return "CENTRAL EXPRESSWAY | MIDTOWN BOULEVARD";
    }
    if (z >= 750 && z < 1100) {
        if (x < -50) return "NORTHWEST ACADEMIA | MODEL HIGH SCHOOL";
        if (x > 50) return "NORTHEAST TECH CAMPUS | DMCE COLLEGE";
        return "CENTRAL PARKWAY & TECH MEADOWS";
    }
    if (x > 200) return "CSMIA INTERNATIONAL AIRPORT | AERO-HUB";
    return "NORTH EXPRESS SUPERHIGHWAY | AEROSPACE WAY";
}

function updateTachometerHUD(speedMps, isReverse = false) {
    const speedKmh = Math.round(Math.abs(speedMps) * 3.6);
    if (tachoSpeedVal) tachoSpeedVal.textContent = speedKmh;
    if (speedoVal) speedoVal.textContent = speedKmh;

    const ratio = Math.min(1, speedKmh / 140);
    const needleDeg = -125 + ratio * 250;
    if (tachoNeedlePivot) {
        tachoNeedlePivot.style.transform = `rotate(${needleDeg}deg)`;
    }

    if (tachoActiveArc) {
        const offset = 356 - (ratio * 250 / 360) * 356;
        tachoActiveArc.style.strokeDashoffset = offset;
    }

    if (tachoGearBadge) {
        if (isReverse) {
            tachoGearBadge.textContent = "REVERSE";
        } else if (speedKmh === 0) {
            tachoGearBadge.textContent = activeVehicle ? "1ST GEAR" : "PARK";
        } else if (speedKmh < 24) {
            tachoGearBadge.textContent = "1ST GEAR";
        } else if (speedKmh < 48) {
            tachoGearBadge.textContent = "2ND GEAR";
        } else if (speedKmh < 75) {
            tachoGearBadge.textContent = "3RD GEAR";
        } else if (speedKmh < 98) {
            tachoGearBadge.textContent = "4TH GEAR";
        } else if (speedKmh < 122) {
            tachoGearBadge.textContent = "5TH GEAR";
        } else {
            tachoGearBadge.textContent = "6TH GEAR";
        }
    }

    if (tachoModeLabel) {
        if (activeVehicle) {
            tachoModeLabel.textContent = (activeVehicle.type === 'car') ? "SPEED | SPORT MODE" : (activeVehicle.type === 'bike' ? "BIKE | TURBO MODE" : "AUTO | TRANSIT MODE");
        } else if (isFlightMode) {
            tachoModeLabel.textContent = "FLIGHT | THRUST ON";
        } else {
            tachoModeLabel.textContent = "SPEED | SPORT MODE";
        }
    }
}

// Collapsible Controls Toggle
const controlsToggleBtn = document.getElementById('controls-toggle-btn');
const controlsCardEl = document.getElementById('controls-card');
if (controlsToggleBtn && controlsCardEl) {
    controlsToggleBtn.addEventListener('click', () => {
        controlsCardEl.style.display = (controlsCardEl.style.display === 'none') ? 'flex' : 'none';
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'h' || e.key === 'H') {
            controlsCardEl.style.display = (controlsCardEl.style.display === 'none') ? 'flex' : 'none';
        }
    });
}

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

        // Proximity check for Train (All 4 Active Trains)
        const trainsToBoard = (allTrains && allTrains.length > 0) ? allTrains : [trainState];
        for (let t = 0; t < trainsToBoard.length; t++) {
            const tr = trainsToBoard[t];
            if (tr.coach1) {
                const p = characterGroup.position;
                const d1 = p.distanceTo(tr.coach1.position);
                const d2 = tr.coach2 ? p.distanceTo(tr.coach2.position) : Infinity;
                const d3 = tr.coach3 ? p.distanceTo(tr.coach3.position) : Infinity;
                if (d1 < 5.8 || d2 < 5.8 || d3 < 5.8) {
                    boardableTrain = tr;
                    mountTrain();
                    return;
                }
            }
        }
    }
}

function mountVehicle(v) {
    activeVehicle = v;
    if (speedoCard) speedoCard.style.display = 'none';
    if (speechBubbleEl) speechBubbleEl.classList.remove('visible');
    if (v.type === 'bike') {
        speedoMode.textContent = '🏍️ CYBER BIKE';
        characterGroup.visible = true;
        characterGroup.scale.set(0.70, 0.70, 0.70);
        characterGroup.position.set(0, 0.45, -0.15);
        characterGroup.rotation.set(0, 0, 0);
        v.mesh.add(characterGroup);
    } else if (v.type === 'rickshaw') {
        speedoMode.textContent = '🛺 KAALI-PEELI AUTO';
        characterGroup.visible = true;
        characterGroup.scale.set(0.65, 0.65, 0.65);
        characterGroup.position.set(0, 0.35, 0.25);
        characterGroup.rotation.set(0, 0, 0);
        v.mesh.add(characterGroup);
    } else {
        speedoMode.textContent = '🚗 CYBER CAR';
        // Enclosed sports coupe with tinted glass - driver safely inside
        characterGroup.visible = false;
        v.mesh.add(characterGroup);
    }
    playSound('engine');
}

function mountTrain() {
    activeVehicle = 'train';
    const tr = boardableTrain || (allTrains.length > 0 ? allTrains[0] : trainState);
    trainState.coach1 = tr.coach1;
    trainState.coach2 = tr.coach2;
    trainState.coach3 = tr.coach3;
    trainState.mesh = tr.coach1;
    trainState.splineLength = tr.splineLength;
    trainState.speed = tr.speed;
    trainState.isDwelling = tr.isDwelling;

    tr.coach1.add(characterGroup);
    characterGroup.visible = true;
    characterGroup.scale.set(0.85, 0.85, 0.85);
    characterGroup.position.set(-1.42, 0.65, 0);
    characterGroup.rotation.set(0, -Math.PI / 2, 0);
    speedoCard.style.display = 'flex';
    speedoMode.textContent = `🚆 ${tr.name ? tr.name.toUpperCase() : 'MUMBAI LOCAL EXPRESS'}`;
    playSound('trainHorn');
}

function dismountVehicle() {
    characterGroup.scale.set(1, 1, 1);
    characterGroup.visible = true;
        if (activeVehicle === 'train') {
        activeVehicle = null;
        scene.add(characterGroup);
        const curC = (boardableTrain && boardableTrain.coach1) ? boardableTrain.coach1 : (trainState.coach1 || { position: { x: -22, z: 16 } });
        let platformX = curC.position.x < 100 ? -28.6 : (curC.position.x - 4.5);
        let nearestZ = curC.position.z;
        if (railwayStations.length > 0) {
            const nearestSt = railwayStations.reduce((prev, curr) => Math.hypot(curr.x - curC.position.x, curr.z - curC.position.z) < Math.hypot(prev.x - curC.position.x, prev.z - curC.position.z) ? curr : prev);
            if (nearestSt) {
                platformX = nearestSt.x - 4.5;
                nearestZ = nearestSt.z;
            }
        }
        characterGroup.position.set(platformX, 0.65, nearestZ);
        characterGroup.rotation.set(0, Math.PI / 2, 0);
    } else if (activeVehicle) {
        const v = activeVehicle;
        activeVehicle = null;
        scene.add(characterGroup);
        characterGroup.position.set(v.mesh.position.x - 2.5, 0, v.mesh.position.z);
        characterGroup.rotation.set(0, v.rotation + Math.PI, 0);
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
            • <strong>Leadership & Clubs:</strong> Cybersecurity Club Core Member, Hackathon Lead, and Open-Source Contributor.<br>
            • <em>Northeastern Tech Campus — Mumbai Open World</em>
        `;
        modalCodePreviewEl.style.display = 'none';
        interactiveModalEl.classList.add('active');
    } else if (currentInteraction === 'schoolBoard') {
        modalTitleEl.innerHTML = "🏫 Model High School & Academic Foundations";
        modalBodyEl.innerHTML = `
            <strong>Secondary & Higher Secondary Education:</strong><br><br>
            • <strong>Stream:</strong> Science, Mathematics & Computer Applications<br>
            • <strong>Foundations:</strong> Early passion for programming, logic design, and competitive coding<br>
            • <strong>Achievements:</strong> High School Tech Exhibition Winner & Academic Honors<br>
            • <em>Northwestern Academic Quarter — Mumbai Open World</em>
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
    if (gpsCoordsEl) gpsCoordsEl.textContent = `X: ${Math.round(playerX)} | Z: ${Math.round(playerZ)}`;

    // Nearest waypoint calculation across all expanded districts (2km world)
    const waypoints = [
        { name: "Gateway Arch", x: 0, z: -6 },
        { name: "Home HQ (Tower)", x: 0, z: 140 },
        { name: "Model High School", x: poiSchool.x, z: poiSchool.z },
        { name: "DMCE College", x: poiCollege.x, z: poiCollege.z },
        { name: "City Train Station", x: trainState.x, z: 16 },
        { name: "West Residential Chawls", x: -550, z: 500 },
        { name: "East Commercial Bazaar", x: 350, z: 450 },
        { name: "CSMIA Airport Terminal", x: poiAirport.x, z: poiAirport.z }
    ];

    let nearest = waypoints[0];
    let minDist = Infinity;
    waypoints.forEach(wp => {
        const d = Math.hypot(wp.x - playerX, wp.z - playerZ);
        if (d < minDist) { minDist = d; nearest = wp; }
    });
    if (waypointTrackerEl) waypointTrackerEl.textContent = `🎯 Nearest: ${nearest.name} (${Math.round(minDist)}m)`;

    // Update dynamic district text across GTA HUD
    const currentDistrict = getDistrictName(playerX, playerZ);
    const radarBanner = document.getElementById('radar-district-banner');
    if (radarBanner) radarBanner.textContent = currentDistrict;
    const districtNameEl = document.getElementById('gta-district-name');
    if (districtNameEl) districtNameEl.textContent = currentDistrict;

    mapCtx.clearRect(0, 0, 220, 140);

    // Player-Centric Scrolling Rectangular GTA Radar
    const cx = 110;
    const cy = 70;
    const radarRadius = 66;
    const scale = 0.65; // ~340m visual diameter around player

    function toMapX(wx) { return cx + (wx - playerX) * scale; }
    function toMapY(wz) { return cy - (wz - playerZ) * scale; }

    // 1. Dark radar background
    mapCtx.fillStyle = '#090d16';
    mapCtx.fillRect(0, 0, 220, 140);

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

    // North Express Avenue Spine (X = 0, Z = 16 to 1400)
    mapCtx.fillRect(toMapX(-6), toMapY(1400), 12 * scale, 1384 * scale);
    // Academia Cross Boulevard (Z = 900, School to DMCE)
    mapCtx.fillRect(toMapX(-450), toMapY(907), 1000 * scale, 14 * scale);
    // Airport Terminal Parkway (Z = 1250)
    mapCtx.fillRect(toMapX(150), toMapY(1257), 750 * scale, 14 * scale);
    // West Academic Corridor (X = -320 to School)
    mapCtx.fillRect(toMapX(-326), toMapY(1000), 12 * scale, 760 * scale);
    // East Tech Corridor (X = 420 to DMCE)
    mapCtx.fillRect(toMapX(414), toMapY(1000), 12 * scale, 760 * scale);
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

    // CSMIA Airport Runway (Orange Strip)
    mapCtx.fillStyle = '#f97316';
    mapCtx.fillRect(toMapX(poiAirport.x - 120), toMapY(poiAirport.z + 14), 240 * scale, 28 * scale);

    // 7. Train Coaches (All 4 Active Trains across Corridors)
    const trainsToRender = (allTrains && allTrains.length > 0) ? allTrains : [{ coach1: trainState.coach1, coach2: trainState.coach2, coach3: trainState.coach3, line: 1 }];
    trainsToRender.forEach((tr, tIdx) => {
        [tr.coach1, tr.coach2, tr.coach3].forEach((c, idx) => {
            if (!c) return;
            const cxMap = toMapX(c.position.x);
            const cyMap = toMapY(c.position.z);
            if (Math.hypot(cxMap - cx, cyMap - cy) > radarRadius) return;
            mapCtx.save();
            mapCtx.translate(cxMap, cyMap);
            mapCtx.rotate(c.rotation.y);
            mapCtx.fillStyle = idx === 0 ? (tr.line === 1 ? '#facc15' : '#ef4444') : '#8b5cf6';
            mapCtx.fillRect(-2.5, -4.5, 5, 9);
            mapCtx.restore();
        });
    });

    // Public Transit Buses & Taxis on Radar
    if (publicTransit && publicTransit.length > 0) {
        publicTransit.forEach(pt => {
            const mx = toMapX(pt.x);
            const my = toMapY(pt.z);
            if (Math.hypot(mx - cx, my - cy) > radarRadius) return;
            if (pt.type === 'bus') {
                mapCtx.fillStyle = '#dc2626';
                mapCtx.fillRect(mx - 2, my - 3.5, 4, 7);
            } else {
                mapCtx.fillStyle = '#facc15';
                mapCtx.beginPath();
                mapCtx.arc(mx, my, 2, 0, Math.PI * 2);
                mapCtx.fill();
            }
        });
    }

    // Aircraft Fleet on Radar
    if (airportPlanes && airportPlanes.length > 0) {
        airportPlanes.forEach(p => {
            const pxMap = toMapX(p.x);
            const pyMap = toMapY(p.z);
            if (Math.hypot(pxMap - cx, pyMap - cy) > radarRadius) return;
            mapCtx.save();
            mapCtx.translate(pxMap, pyMap);
            mapCtx.fillStyle = '#ffffff';
            mapCtx.beginPath();
            mapCtx.arc(0, 0, 3, 0, Math.PI * 2);
            mapCtx.fill();
            mapCtx.restore();
        });
    }

    // Street Activity Vendors on Radar
    if (streetActivities && streetActivities.length > 0) {
        streetActivities.forEach(act => {
            const axMap = toMapX(act.x);
            const ayMap = toMapY(act.z);
            if (Math.hypot(axMap - cx, ayMap - cy) > radarRadius) return;
            mapCtx.fillStyle = '#10b981';
            mapCtx.fillRect(axMap - 1.5, ayMap - 1.5, 3, 3);
        });
    }

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

    // 9. Authentic GTA Radar Reticle Overlay & Rings
    mapCtx.strokeStyle = 'rgba(34, 197, 94, 0.28)';
    mapCtx.lineWidth = 1;
    mapCtx.beginPath();
    mapCtx.arc(cx, cy, 32, 0, Math.PI * 2);
    mapCtx.arc(cx, cy, 58, 0, Math.PI * 2);
    mapCtx.moveTo(cx - 65, cy); mapCtx.lineTo(cx + 65, cy);
    mapCtx.moveTo(cx, cy - 65); mapCtx.lineTo(cx, cy + 65);
    mapCtx.stroke();

    // Rotating Radar Sweeper
    radarAngle += 0.04;
    mapCtx.save();
    mapCtx.translate(cx, cy);
    mapCtx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.moveTo(0, 0);
    mapCtx.lineTo(Math.cos(radarAngle) * 58, Math.sin(radarAngle) * 58);
    mapCtx.stroke();
    mapCtx.restore();

    // 10. Player Center Navigation Marker & Heading Arrow
    mapCtx.save();
    mapCtx.translate(cx, cy);
    const isPlayerOnFoot = (!isFlightMode && !activeVehicle);
    const heading = isPlayerOnFoot ? (playerRot - Math.PI) : playerRot;
    mapCtx.rotate(heading);

    // Sharp White/Cyan Navigation Arrowhead (GTA Style)
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -9);
    mapCtx.lineTo(6, 6);
    mapCtx.lineTo(0, 3);
    mapCtx.lineTo(-6, 6);
    mapCtx.closePath();
    mapCtx.fill();

    mapCtx.strokeStyle = '#38bdf8';
    mapCtx.lineWidth = 1.5;
    mapCtx.stroke();
    mapCtx.restore();
}

// ==========================================
// VEHICLE DYNAMICS & PHYSICS ENGINE
// Tuned per threejs-gameplay-systems: game-feel & physics-engine-selection
// ==========================================
function updateVehiclePhysics(v, delta) {
    if (!v || !v.mesh) return;

    const isCar = (v.type === 'car');
    const isRickshaw = (v.type === 'rickshaw');
    const isBike = (v.type === 'bike');

    // Dynamic Kinematic Tuning per Vehicle Class
    const maxSpeed = isCar ? 32.0 : (isRickshaw ? 18.0 : 26.0);
    const maxReverse = isCar ? -8.0 : (isRickshaw ? -5.0 : -6.5);
    const accelRate = isCar ? 0.045 : (isRickshaw ? 0.035 : 0.060);
    const brakeRate = isCar ? 0.080 : (isRickshaw ? 0.070 : 0.090);
    const naturalDrag = isCar ? 0.035 : (isRickshaw ? 0.045 : 0.040);
    const baseTurnSpeed = isCar ? 1.85 : (isRickshaw ? 2.35 : 2.55);
    const colRadius = isCar ? 1.6 : (isRickshaw ? 1.25 : 0.85);
    const wheelRadius = isCar ? 0.45 : (isRickshaw ? 0.35 : 0.40);

    // 1. Progressive Throttle, Hydraulic Braking & Natural Drag
    if (keys.w) {
        v.speed = THREE.MathUtils.lerp(v.speed, maxSpeed, accelRate);
    } else if (keys.s) {
        if (v.speed > 0.4) {
            // Hydraulic Braking while moving forward
            v.speed = THREE.MathUtils.lerp(v.speed, 0, brakeRate);
        } else {
            // Reverse Gear
            v.speed = THREE.MathUtils.lerp(v.speed, maxReverse, accelRate * 0.8);
        }
    } else {
        // Natural Rolling Friction & Aerodynamic Drag
        v.speed = THREE.MathUtils.lerp(v.speed, 0, naturalDrag);
        if (Math.abs(v.speed) < 0.05) v.speed = 0;
    }

    // 2. Speed-Dependent Steering with Damping (Prevents Spinouts at Top Speed)
    let steerInput = 0;
    if (keys.d) steerInput += 1;
    if (keys.a) steerInput -= 1;

    const speedRatio = Math.min(1, Math.abs(v.speed) / maxSpeed);
    const minAuthority = isBike ? 0.35 : (isRickshaw ? 0.30 : 0.12);
    const steerAuthority = Math.min(1, minAuthority + (Math.abs(v.speed) / 3.5) * (1 - minAuthority));
    const steerDamping = 1 / (1 + speedRatio * 0.72);
    const effectiveTurn = baseTurnSpeed * steerAuthority * steerDamping;

    // Steering direction inverts when reversing
    const steerDir = (v.speed >= 0 ? 1 : -1);
    v.rotation += steerInput * effectiveTurn * steerDir * delta;

    // 3. Coordinate Position Integration
    const prevX = v.mesh.position.x;
    const prevZ = v.mesh.position.z;
    v.mesh.position.x += Math.sin(v.rotation) * v.speed * delta;
    v.mesh.position.z += Math.cos(v.rotation) * v.speed * delta;
    v.mesh.rotation.y = v.rotation;

    // 4. Vehicle Class-Specific Suspension, Roll & Pitch Feel
    if (isBike) {
        // Motorcycle counter-steer banking lean into turns
        const targetRoll = -steerInput * 0.32 * (0.35 + speedRatio * 0.65);
        v.mesh.rotation.z = THREE.MathUtils.lerp(v.mesh.rotation.z, targetRoll, 0.22);
        const targetPitch = (keys.w && v.speed > 2) ? 0.015 : 0;
        v.mesh.rotation.x = THREE.MathUtils.lerp(v.mesh.rotation.x, targetPitch, 0.1);
        v.mesh.position.y = 0;
    } else if (isRickshaw) {
        // Mumbai Auto-Rickshaw: 3-wheel chassis lean
        const targetRoll = -steerInput * (0.05 + speedRatio * 0.08);
        v.mesh.rotation.z = THREE.MathUtils.lerp(v.mesh.rotation.z, targetRoll, 0.16);

        // Quintessential Mumbai 2-stroke idle rumble when stopped
        if (Math.abs(v.speed) < 0.6) {
            const rumbleTime = performance.now() * 0.032;
            v.mesh.position.y = Math.sin(rumbleTime) * 0.012;
            v.mesh.rotation.x = THREE.MathUtils.lerp(v.mesh.rotation.x, Math.sin(rumbleTime * 1.3) * 0.007, 0.2);
        } else {
            v.mesh.position.y = 0;
            v.mesh.rotation.x = THREE.MathUtils.lerp(v.mesh.rotation.x, 0, 0.15);
        }
    } else if (isCar) {
        // Cyber Sports Car: Lateral body roll outwards when cornering
        const targetRoll = -steerInput * speedRatio * 0.05;
        v.mesh.rotation.z = THREE.MathUtils.lerp(v.mesh.rotation.z, targetRoll, 0.14);

        // Pitch dive on hard braking / squat on acceleration
        let targetPitch = 0;
        if (keys.s && v.speed > 1.2) targetPitch = -0.024; // nose dive
        else if (keys.w && v.speed < maxSpeed * 0.85) targetPitch = 0.014; // rear squat
        v.mesh.rotation.x = THREE.MathUtils.lerp(v.mesh.rotation.x, targetPitch, 0.12);
        v.mesh.position.y = 0;
    }

    // 5. Wheel Angular Velocity Rotation
    if (!v.wheels && isBike && v.mesh) {
        v.wheels = [];
        v.mesh.children.forEach(child => {
            if (child.isMesh && child.geometry && child.geometry.type === 'CylinderGeometry' && Math.abs(child.rotation.z - Math.PI / 2) < 0.1) {
                v.wheels.push(child);
            }
        });
    }
    if (v.wheels && v.wheels.length > 0) {
        const angularDelta = (v.speed / wheelRadius) * delta;
        for (let i = 0; i < v.wheels.length; i++) {
            v.wheels[i].rotation.x += angularDelta;
        }
    }

    // 6. Bounding Collision Resolution & Elastic Damping
    resolveCollision(v.mesh.position, colRadius);
    const movedDist = Math.hypot(v.mesh.position.x - prevX, v.mesh.position.z - prevZ);
    const expectedDist = Math.abs(v.speed * delta);
    if (expectedDist > 0.06 && movedDist < expectedDist * 0.3) {
        v.speed *= 0.5; // absorb kinetic energy on obstacle collision
    }
}
window.__updateVehiclePhysics = updateVehiclePhysics;

// ==========================================
// MAIN GAME LOOP & PHYSICS UPDATE
// ==========================================
const clock = new THREE.Clock();
let walkCycle = 0;
let idleTimer = 0;
let thunderTimer = 0;

let lastFrameTime = performance.now();
const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;


// ==========================================
// BATCH 3 UPDATE FUNCTIONS
// ==========================================
function updatePedestrianSimulation(delta) {
    if (!allPedestrians || allPedestrians.length === 0) return;
    const isRaining = (typeof weatherMode !== 'undefined') && (weatherMode === 'rain' || weatherMode === 'storm');

    for (let i = 0; i < npcs.length; i++) {
        const npc = npcs[i];
        const target = npc.waypoints[npc.wpIdx];
        const dx = target.x - npc.group.position.x;
        const dz = target.z - npc.group.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.8) {
            npc.wpIdx = (npc.wpIdx + 1) % npc.waypoints.length;
        } else {
            const nx = dx / dist;
            const nz = dz / dist;
            npc.group.position.x += nx * npc.speed * delta;
            npc.group.position.z += nz * npc.speed * delta;

            const targetRot = Math.atan2(nx, nz);
            let diff = (targetRot - npc.group.rotation.y) % (Math.PI * 2);
            if (diff < -Math.PI) diff += Math.PI * 2;
            if (diff > Math.PI) diff -= Math.PI * 2;
            npc.group.rotation.y += diff * 0.15;
        }

        npc.walkCycle += delta * npc.speed * 4.4;
        const swing = Math.sin(npc.walkCycle);
        if (npc.legL) npc.legL.rotation.x = -swing * 0.52;
        if (npc.legR) npc.legR.rotation.x = swing * 0.52;
        npc.group.position.y = Math.abs(Math.sin(npc.walkCycle * 2)) * 0.06;

        if (npc.umbrellaGroup) npc.umbrellaGroup.visible = isRaining;
        if (isRaining) {
            if (npc.armR) { npc.armR.rotation.x = -Math.PI / 3; npc.armR.rotation.z = -0.15; }
            if (npc.armL) npc.armL.rotation.x = swing * 0.35;
        } else {
            if (npc.armL) npc.armL.rotation.x = swing * 0.45;
            if (npc.armR) { npc.armR.rotation.x = -swing * 0.45; npc.armR.rotation.z = 0; }
        }
    }

    if (instancedPedestrians && pedDummy) {
        for (let k = 0; k < 90; k++) {
            const p = allPedestrians[30 + k];
            if (!p) continue;
            if (p.dirZ !== 0) {
                p.z += p.dirZ * p.speed * delta;
                if (p.z > p.circuit.maxZ) p.z = p.circuit.minZ;
                else if (p.z < p.circuit.minZ) p.z = p.circuit.maxZ;
            } else if (p.dirX !== 0) {
                p.x += p.dirX * p.speed * delta;
                if (p.x > p.circuit.maxX) p.x = p.circuit.minX;
                else if (p.x < p.circuit.minX) p.x = p.circuit.maxX;
            }

            p.walkPhase += p.speed * delta * 6.0;
            const bob = Math.abs(Math.sin(p.walkPhase)) * 0.04;

            pedDummy.position.set(p.x, bob, p.z);
            pedDummy.rotation.y = Math.atan2(p.dirX, p.dirZ);
            pedDummy.updateMatrix();
            instancedPedestrians.setMatrixAt(k, pedDummy.matrix);
        }
        instancedPedestrians.instanceMatrix.needsUpdate = true;
    }
}

function updateAirportSimulation(delta) {
    if (!airportPlanes || airportPlanes.length === 0) return;
    const apX = poiAirport.x;
    const apZ = poiAirport.z;

    for (let i = 0; i < airportPlanes.length; i++) {
        const plane = airportPlanes[i];

        if (plane.strobe) {
            const on = (Math.floor(Date.now() / 600) % 2 === 0);
            plane.strobe.visible = on;
        }

        if (plane.state === 'taxiing') {
            plane.progress = (plane.progress + (plane.speed * delta) / 400.0) % 1.0;
            const ang = plane.progress * Math.PI * 2;
            plane.x = apX + Math.cos(ang) * 60;
            plane.z = apZ + 25 + Math.sin(ang) * 18;
            plane.group.position.set(plane.x, 0, plane.z);
            plane.group.rotation.y = -ang + Math.PI / 2;
        } else if (plane.state === 'takeoff') {
            plane.timer += delta;
            if (plane.timer < 8.0) {
                plane.x += delta * 25.0;
                plane.y = 0;
                plane.group.rotation.set(0, Math.PI / 2, 0);
            } else if (plane.timer < 16.0) {
                plane.x += delta * 35.0;
                plane.y += delta * 8.0;
                plane.group.rotation.set(0, Math.PI / 2, 0.22);
            } else if (plane.timer < 28.0) {
                const turnFrac = (plane.timer - 16.0) / 12.0;
                const turnAng = Math.PI / 2 + turnFrac * Math.PI;
                plane.x += Math.cos(turnAng) * 40.0 * delta;
                plane.z += Math.sin(turnAng) * 40.0 * delta;
                plane.group.rotation.set(0, turnAng, 0.35);
            } else {
                plane.timer = 0;
                plane.x = apX - 110;
                plane.y = 0;
                plane.z = apZ;
            }
            plane.group.position.set(plane.x, plane.y, plane.z);
        } else if (plane.state === 'landing') {
            plane.timer += delta;
            if (plane.timer < 10.0) {
                const f = plane.timer / 10.0;
                plane.x = apX - 320 + f * 220;
                plane.y = THREE.MathUtils.lerp(65, 0, f);
                plane.group.rotation.set(0, Math.PI / 2, -0.08);
            } else if (plane.timer < 18.0) {
                plane.x += (18.0 - plane.timer) * 3.5 * delta;
                plane.y = 0;
                plane.group.rotation.set(0, Math.PI / 2, 0);
            } else {
                plane.timer = 0;
                plane.x = apX - 320;
                plane.y = 65;
            }
            plane.group.position.set(plane.x, plane.y, plane.z);
        } else if (plane.state === 'cruising') {
            plane.x += plane.speed * delta;
            if (plane.x > 1000) plane.x = -1000;
            plane.group.position.set(plane.x, plane.y, plane.z);
        }
    }
}

function updateStreetActivities(delta) {
    if (!streetActivities || streetActivities.length === 0) return;
    const now = Date.now() * 0.003;
    for (let i = 0; i < streetActivities.length; i++) {
        const act = streetActivities[i];
        if (act.steamQuad) {
            const phase = (now + act.timer) % 1.0;
            act.steamQuad.position.y = 1.35 + phase * 0.65;
            act.steamQuad.scale.set(1.0 + phase * 0.8, 1.0 + phase * 0.8, 1.0);
            act.steamQuad.material.opacity = (1.0 - phase) * 0.5;
        }
    }
}

function updateEnvironmentalSimulation(delta) {
    if (!ambientAgents || ambientAgents.length === 0) return;

    for (let i = 0; i < ambientAgents.length; i++) {
        const ag = ambientAgents[i];
        ag.angle += ag.speed * delta * 0.4;
        const curX = ag.center.x + Math.cos(ag.angle) * ag.radius;
        const curZ = ag.center.z + Math.sin(ag.angle) * ag.radius;
        const curY = ag.altitude + Math.sin(ag.angle * 2.0) * 1.8;

        ag.group.position.set(curX, curY, curZ);
        ag.group.rotation.y = -ag.angle + Math.PI / 2;
        ag.group.rotation.z = 0.15;

        if (ag.mesh) {
            const flap = Math.sin(Date.now() * 0.001 * ag.flapSpeed) * 0.35;
            ag.mesh.rotation.x = flap;
        }
    }
}

function animate(now = performance.now()) {
    requestAnimationFrame(animate);
    if (document.hidden) return; // Pause updates when tab inactive
    const elapsed = now - lastFrameTime;
    if (elapsed < FRAME_INTERVAL - 1) return; // Cap at 60 FPS to prevent thermal strain
    lastFrameTime = now - (elapsed % FRAME_INTERVAL);

    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    // 1. Arabian Sea Multi-Harmonic Flowing Waves (GPU Vertex Shader)
    waterUniforms.uTime.value = time;

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

        // 3. Mumbai Pedestrian, Aviation, Street Activities & Ambient Simulation (Batch 3)
    updatePedestrianSimulation(delta);
    updateAirportSimulation(delta);
    updateStreetActivities(delta);
    updateEnvironmentalSimulation(delta);

    // 4. Mumbai Transit & Road Infrastructure Simulation (Batch 2)
    updateRailwaySystem(delta);
    updateTrafficSignals(delta);
    updateRoadTraffic(delta);
    updatePublicTransit(delta);

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
            characterGroup.rotation.y = Math.PI; // Face South into the open city
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

                // Speech greeting popup (only when on foot)
                if (!activeVehicle && !isFlightMode) {
                    speechBubbleEl.classList.add('visible');
                    setTimeout(() => speechBubbleEl.classList.remove('visible'), 5000);
                }
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

            // 1. Yaw & Steering Control (A turns Left, D turns Right)
            const turnRate = (isBoosting ? 1.6 : 2.4);
            if (keys.a) flightHeading -= turnRate * delta;
            if (keys.d) flightHeading += turnRate * delta;

            // 2. Roll Banking (into turns: banking left on A, right on D)
            let targetRoll = 0;
            if (keys.a) targetRoll = isBoosting ? -0.65 : -0.45;
            if (keys.d) targetRoll = isBoosting ? 0.65 : 0.45;
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

            // 7. World Clamps & Altitude Bounds (Expanded 2km x 2km airspace)
            characterGroup.position.x = THREE.MathUtils.clamp(characterGroup.position.x, -990, 990);
            characterGroup.position.z = THREE.MathUtils.clamp(characterGroup.position.z, -390, 1590);
            const minFlyY = (characterGroup.position.z < -20) ? 0.6 : 0.2;
            characterGroup.position.y = THREE.MathUtils.clamp(characterGroup.position.y, minFlyY, 450);

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

            // 12. Touchdown / Landing Detection (Helipad, Any Building Rooftop, Platforms, or Ground)
            const surfaceY = getSurfaceElevationAt(characterGroup.position.x, characterGroup.position.z, characterGroup.position.y);
            if (surfaceY > 0) {
                currentFloorElevation = surfaceY;
            } else if (characterGroup.position.z >= -20) {
                currentFloorElevation = 0;
            } else {
                currentFloorElevation = 0.1;
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
                // Aerodynamic banking: tilt camera into roll (Insomniac traversal feel)
                camera.rotation.z += flightRoll * 0.18;

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
            updateVehiclePhysics(activeVehicle, delta);

            // Tachometer & Speedometer update
            updateTachometerHUD(activeVehicle.speed, activeVehicle.speed < -0.2);

            // Camera follow vehicle
            if (cameraMode === 'chase' || cameraMode === 'cinematic') {
                const isCar = (activeVehicle.type === 'car');
                const followDist = isCar ? 7.8 : 9.5;
                const camElevation = isCar ? 2.5 : 3.6;
                camera.position.x = THREE.MathUtils.lerp(camera.position.x, activeVehicle.mesh.position.x - Math.sin(activeVehicle.rotation) * followDist, 0.14);
                camera.position.z = THREE.MathUtils.lerp(camera.position.z, activeVehicle.mesh.position.z - Math.cos(activeVehicle.rotation) * followDist, 0.14);
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, camElevation, 0.14);
                const lookX = activeVehicle.mesh.position.x + Math.sin(activeVehicle.rotation) * 8;
                const lookZ = activeVehicle.mesh.position.z + Math.cos(activeVehicle.rotation) * 8;
                camera.lookAt(lookX, 1.4, lookZ);
                // Cornering camera tilt (Dutch angle on hard steering)
                if (keys.a || keys.d || keys.arrowleft || keys.arrowright) {
                    const steerDir = (keys.a || keys.arrowleft) ? 1 : -1;
                    const speedFactor = Math.min(1, Math.abs(activeVehicle.speed) / 20);
                    camera.rotation.z += steerDir * 0.032 * speedFactor;
                }

                const speedRatio = Math.min(1, Math.abs(activeVehicle.speed) / 32);
                camera.fov = THREE.MathUtils.lerp(camera.fov, 50 + speedRatio * 14, 0.08);
                camera.updateProjectionMatrix();
            }

            updateMiniMap(activeVehicle.mesh.position.x, activeVehicle.mesh.position.z, activeVehicle.rotation);
            checkVehicleProximity(activeVehicle);
        } else {
            // Free On-Foot Character Movement (Camera-Relative)
            const isSprinting = keys.shift;
            const moveSpeed = isSprinting ? 16.0 : 9.0;

            // Extract canonical horizontal camera vectors (screen-space relative)
            const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            camForward.y = 0;
            if (camForward.lengthSq() < 0.001) camForward.set(0, 0, 1);
            else camForward.normalize();

            // Screen-space right on ground plane (Forward x Up)
            const camRight = camForward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();

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

                // Natural articulated human walking locomotion
                walkCycle += delta * (isSprinting ? 9.5 : 6.5);
                const stride = Math.sin(walkCycle);

                if (devChar) {
                    devChar.legL.rotation.x = -stride * 0.62;
                    devChar.legR.rotation.x = stride * 0.62;
                    devChar.armL.rotation.x = stride * 0.48;
                    devChar.armR.rotation.x = -stride * 0.48;
                    devChar.armL.rotation.z = 0.08;
                    devChar.armR.rotation.z = -0.08;
                }

                const gaitBob = Math.sin(walkCycle * 2) * 0.02;
                if (characterGroup.position.y > currentFloorElevation + 0.4) {
                    characterGroup.position.y = THREE.MathUtils.lerp(characterGroup.position.y, currentFloorElevation, 0.16);
                } else {
                    characterGroup.position.y = currentFloorElevation + gaitBob;
                }

                // Natural human forward torso lean and subtle hip roll
                const targetRoll = Math.sin(walkCycle) * 0.035;
                const targetPitch = isSprinting ? 0.09 : 0.04;
                characterGroup.rotation.z = THREE.MathUtils.lerp(characterGroup.rotation.z, targetRoll, 0.15);
                characterGroup.rotation.x = THREE.MathUtils.lerp(characterGroup.rotation.x, targetPitch, 0.15);
            } else {
                idleTimer += delta * 2.2;
                if (devChar) {
                    devChar.legL.rotation.x = THREE.MathUtils.lerp(devChar.legL.rotation.x, 0, 0.2);
                    devChar.legR.rotation.x = THREE.MathUtils.lerp(devChar.legR.rotation.x, 0, 0.2);
                    devChar.armL.rotation.x = THREE.MathUtils.lerp(devChar.armL.rotation.x, Math.sin(idleTimer) * 0.03, 0.15);
                    devChar.armR.rotation.x = THREE.MathUtils.lerp(devChar.armR.rotation.x, -Math.sin(idleTimer) * 0.03, 0.15);
                    devChar.armL.rotation.z = THREE.MathUtils.lerp(devChar.armL.rotation.z, 0.06, 0.15);
                    devChar.armR.rotation.z = THREE.MathUtils.lerp(devChar.armR.rotation.z, -0.06, 0.15);
                }

                characterGroup.position.y = THREE.MathUtils.lerp(characterGroup.position.y, currentFloorElevation, 0.2);
                characterGroup.rotation.z = THREE.MathUtils.lerp(characterGroup.rotation.z, 0, 0.18);
                characterGroup.rotation.x = THREE.MathUtils.lerp(characterGroup.rotation.x, 0, 0.18);
            }

            updateTachometerHUD(moving ? (isSprinting ? 5.2 : 2.8) : 0, false);

            // Dynamic Surface Elevation & Step/Drop Detection (Rooftops, Steps, Platforms, Causeway)
            const targetSurfaceY = getSurfaceElevationAt(characterGroup.position.x, characterGroup.position.z, characterGroup.position.y);
            if (targetSurfaceY > 0) {
                currentFloorElevation = targetSurfaceY;
            } else if (characterGroup.position.z >= -20) {
                // On mainland ground
                currentFloorElevation = 0;
            } else {
                // Buoyant water surface when over sea without a platform
                currentFloorElevation = 0.1;
            }
            window.__currentFloorElevation = currentFloorElevation;

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
    // Maritime Tourist Ferry Boats Sailing Routes across the Harbor
    maritimeFerryBoats.forEach((b, idx) => {
        if (idx === 0) {
            // Harbor Ferry 1: Cruising East-West along Gateway Harbor (-55 to +55)
            const cruiseAngle = time * 0.18 + b.phase;
            const newX = Math.sin(cruiseAngle) * 55;
            const newZ = -46 + Math.cos(cruiseAngle) * 12;
            const dirX = Math.cos(cruiseAngle) * 55;
            const dirZ = -Math.sin(cruiseAngle) * 12;
            b.group.position.set(newX, -0.4 + Math.sin(time * 1.5) * 0.12, newZ);
            b.group.rotation.y = Math.atan2(dirX, dirZ);
            b.group.rotation.z = Math.sin(time * 1.2) * 0.04;
            b.group.rotation.x = Math.cos(time * 0.9) * 0.03;
        } else {
            // Outer Bay Ferry 2: Cruising coastal route out to sea (-50 to -115)
            const cruiseAngle = time * 0.14 + b.phase;
            const newX = 22 + Math.sin(cruiseAngle) * 18;
            const newZ = -80 + Math.cos(cruiseAngle) * 35;
            const dirX = Math.cos(cruiseAngle) * 18;
            const dirZ = -Math.sin(cruiseAngle) * 35;
            b.group.position.set(newX, -0.4 + Math.sin(time * 1.3) * 0.12, newZ);
            b.group.rotation.y = Math.atan2(dirX, dirZ);
            b.group.rotation.z = Math.sin(time * 1.1) * 0.04;
            b.group.rotation.x = Math.cos(time * 0.8) * 0.03;
        }
    });

    if (cameraMode === 'orbit') orbitControls.update();

    updateSpeechBubble();
    updateWorldWaypoints();
    updateLevelOfDetail(camera.position);
    renderer.render(scene, camera);
}

function updateSpeechBubble() {
    if (activeVehicle || isFlightMode) {
        if (speechBubbleEl && speechBubbleEl.classList.contains('visible')) speechBubbleEl.classList.remove('visible');
        return;
    }
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

    // 2b. Check Model High School Board
    if (p.distanceTo(new THREE.Vector3(poiSchool.x, 0, poiSchool.z - 10)) < 18) {
        currentInteraction = 'schoolBoard';
        showPrompt('E', 'Inspect Model High School 🏫');
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

        // 7. Check Mumbai Local EMU Trains (All 4 Active Trainsets)
    const trainsToCheck = (allTrains && allTrains.length > 0) ? allTrains : [trainState];
    for (let t = 0; t < trainsToCheck.length; t++) {
        const tr = trainsToCheck[t];
        if (tr.coach1) {
            const d1 = p.distanceTo(tr.coach1.position);
            const d2 = tr.coach2 ? p.distanceTo(tr.coach2.position) : Infinity;
            const d3 = tr.coach3 ? p.distanceTo(tr.coach3.position) : Infinity;
            if (d1 < 5.8 || d2 < 5.8 || d3 < 5.8) {
                boardableTrain = tr;
                currentInteraction = 'trainRide';
                showPrompt('E', `Board ${tr.name || 'Mumbai Local Train'} 🚆`);
                return;
            }
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
window.__devChar = devChar;
window.teleportTo = teleportTo;
window.mountVehicle = mountVehicle;
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
window.__allTrains = allTrains;
window.__railwayStations = railwayStations;
window.__trafficSignals = trafficSignals;
window.__trafficVehicles = trafficVehicles;
window.__publicTransit = publicTransit;
window.__allPedestrians = allPedestrians;
window.__allPedestriansCount = allPedestrians.length;
window.__airportPlanes = airportPlanes;
window.__streetActivities = streetActivities;
window.__ambientAgents = ambientAgents;

// Responsive Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(getOptimalPixelRatio());
});
