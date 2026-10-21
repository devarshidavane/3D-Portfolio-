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
scene.fog = new THREE.FogExp2(0x0c1427, 0.009);

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
const skyGeom = new THREE.SphereGeometry(350, 32, 16);
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
    starPositions[i] = (Math.random() - 0.5) * 600;
    starPositions[i + 1] = 20 + Math.random() * 250;
    starPositions[i + 2] = (Math.random() - 0.5) * 600;
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
const rainCount = 2200;
const rainGeom = new THREE.BufferGeometry();
const rainPositions = new Float32Array(rainCount * 3);
for (let i = 0; i < rainCount * 3; i += 3) {
    rainPositions[i] = (Math.random() - 0.5) * 200;
    rainPositions[i + 1] = Math.random() * 55;
    rainPositions[i + 2] = (Math.random() - 0.5) * 200 + 30;
}
rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rainMat = new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.38, transparent: true, opacity: 0 });
const rainParticles = new THREE.Points(rainGeom, rainMat);
scene.add(rainParticles);

function cycleWeather() {
    const modes = ['clear', 'rain', 'storm'];
    weatherMode = modes[(modes.indexOf(weatherMode) + 1) % modes.length];
    const btn = document.getElementById('btn-toggle-weather');

    if (weatherMode === 'clear') {
        btn.textContent = '☀️ Clear';
        btn.classList.remove('active');
        rainMat.opacity = 0;
    } else if (weatherMode === 'rain') {
        btn.textContent = '🌧️ Rain: ON';
        btn.classList.add('active');
        rainMat.opacity = 0.65;
    } else if (weatherMode === 'storm') {
        btn.textContent = '⚡ Thunderstorm';
        btn.classList.add('active');
        rainMat.opacity = 0.9;
        playSound('thunder');
    }
}
document.getElementById('btn-toggle-weather').addEventListener('click', cycleWeather);

// ==========================================
// WORLD COLLISION PROXY ENGINE (Phase 2)
// ==========================================
const worldColliders = [];

function registerBoxCollider(minX, maxX, minZ, maxZ, label = 'obstacle') {
    worldColliders.push({ type: 'box', minX, maxX, minZ, maxZ, label });
}

function registerCylinderCollider(x, z, radius, label = 'pole') {
    worldColliders.push({ type: 'cylinder', x, z, radius, label });
}

function resolveCollision(pos, radius = 0.5) {
    // 1. World Boundaries Clamp (Strict soft limits)
    pos.x = THREE.MathUtils.clamp(pos.x, -75, 75);
    pos.z = THREE.MathUtils.clamp(pos.z, -21.5, 104);

    // 2. Spatial Obstacle Colliders
    for (let i = 0; i < worldColliders.length; i++) {
        const col = worldColliders[i];
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

// Streetlamp Helper
function addStreetLamp(x, z) {
    const lamp = new THREE.Group();
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.85 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 6.2, 8), ironMat);
    pole.position.y = 3.1;
    pole.castShadow = true;
    lamp.add(pole);

    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), new THREE.MeshBasicMaterial({ color: 0xffea9f }));
    bulb.position.y = 6.4;
    lamp.add(bulb);

    const pl = new THREE.PointLight(0xffa834, 2.2, 22, 1.5);
    pl.position.y = 6.4;
    pl.castShadow = false;
    lamp.add(pl);

    lamp.position.set(x, 0, z);
    scene.add(lamp);
    streetLamps.push({ group: lamp, light: pl });
    registerCylinderCollider(x, z, 0.45, 'streetlamp');
}

// Low-poly City Trees
function addTree(x, z, type = 'palm') {
    const tree = new THREE.Group();
    if (type === 'palm') {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 6, 8), trunkMat);
        trunk.position.y = 3;
        trunk.castShadow = true;
        tree.add(trunk);

        const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
            const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.8, 4), leafMat);
            leaf.rotation.z = Math.PI / 3;
            leaf.rotation.y = a;
            leaf.position.y = 6.2;
            tree.add(leaf);
        }
    } else {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
        trunk.position.y = 2.25;
        tree.add(trunk);
        const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8), new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 }));
        leaves.position.y = 5.5;
        leaves.castShadow = true;
        tree.add(leaves);
    }
    tree.position.set(x, 0, z);
    scene.add(tree);
    registerCylinderCollider(x, z, 0.65, 'tree');
}

// ==========================================
// OPEN WORLD TERRAIN & DISTRICT GEOMETRY
// ==========================================

// 1. Arabian Sea (Z = -23 to -140)
const waterGeom = new THREE.PlaneGeometry(360, 140, 48, 24);
const waterMat = new THREE.MeshStandardMaterial({ color: 0x123c69, roughness: 0.12, metalness: 0.75, flatShading: true });
const seaMesh = new THREE.Mesh(waterGeom, waterMat);
seaMesh.rotation.x = -Math.PI / 2;
seaMesh.position.set(0, -0.6, -90);
seaMesh.receiveShadow = true;
scene.add(seaMesh);

// 2. Main Ground Turf (Lush Green Grass spanning across all districts)
const mainGround = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 200),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 })
);
mainGround.rotation.x = -Math.PI / 2;
mainGround.position.set(0, -0.4, 55);
mainGround.receiveShadow = true;
scene.add(mainGround);

// 3. Gateway Waterfront Promenade (Zone 1: Z = -22 to +10, X = -45 to +45)
const walkMat = new THREE.MeshStandardMaterial({ map: cobblestoneTex, roughness: 0.75 });
const promenade = new THREE.Mesh(new THREE.BoxGeometry(90, 0.8, 32), walkMat);
promenade.position.set(0, -0.4, -6);
promenade.receiveShadow = true;
scene.add(promenade);

// Sea Steps & Balustrade Railing at Z = -22
const railMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
const topBar = new THREE.Mesh(new THREE.BoxGeometry(90, 0.4, 0.6), railMat);
topBar.position.set(0, 1.2, -22);
topBar.castShadow = true;
scene.add(topBar);

for (let rx = -44; rx <= 44; rx += 2.5) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.2, 8), railMat);
    post.position.set(rx, 0.6, -22);
    post.castShadow = true;
    scene.add(post);
}
registerBoxCollider(-45, 45, -23.0, -21.0, 'SeaBalustrade');

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
    registerBoxCollider(-16, 16, -38, -26, 'GatewayArch');
    const monument = new THREE.Group();
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.85, metalness: 0.08 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0xb58452, roughness: 0.9 });

    // Central Mass
    const base = new THREE.Mesh(new THREE.BoxGeometry(32, 20, 12), basaltMat);
    base.position.set(0, 10, -32);
    base.castShadow = true; base.receiveShadow = true;
    monument.add(base);

    // Archway Openings (Central + Sides)
    const centralArch = new THREE.Mesh(new THREE.BoxGeometry(11, 14, 12.4), new THREE.MeshStandardMaterial({ color: 0x1c140d }));
    centralArch.position.set(0, 7, -32);
    monument.add(centralArch);

    [-11, 11].forEach(ax => {
        const sideArch = new THREE.Mesh(new THREE.BoxGeometry(4.5, 9.5, 12.2), new THREE.MeshStandardMaterial({ color: 0x271c14 }));
        sideArch.position.set(ax, 4.75, -32);
        monument.add(sideArch);
    });

    // Attic & Parapet Cornice
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(34, 2.5, 13), darkStoneMat);
    cornice.position.set(0, 21.2, -32);
    cornice.castShadow = true;
    monument.add(cornice);

    const upperAttic = new THREE.Mesh(new THREE.BoxGeometry(24, 4, 9), basaltMat);
    upperAttic.position.set(0, 24, -32);
    monument.add(upperAttic);

    // 4 Corner Turrets with Mini Domes
    [[-15, -5], [15, -5], [-15, 5], [15, 5]].forEach(([tx, tz]) => {
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 14, 16), darkStoneMat);
        turret.position.set(tx, 25, -32 + tz);
        monument.add(turret);

        const dome = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), basaltMat);
        dome.position.set(tx, 32, -32 + tz);
        monument.add(dome);

        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.4, 3, 8), darkStoneMat);
        spire.position.set(tx, 34.5, -32 + tz);
        monument.add(spire);
    });

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
    [-1.7, 1.7].forEach(wx => {
        [-1.2, 1.2].forEach(wz => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.2, 16), wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.7, wz);
            cart.add(wheel);
        });
    });

    // Showcase with Vada Pavs
    const showcase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
    showcase.position.set(-0.8, 3.1, 0);
    cart.add(showcase);

    const pavMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.8 });
    for (let px = -1.6; px <= 0; px += 0.5) {
        for (let pz = -0.5; pz <= 0.5; pz += 0.5) {
            const bun = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), pavMat);
            bun.scale.set(1.2, 0.7, 1.2);
            bun.position.set(px, 2.7, pz);
            cart.add(bun);
        }
    }

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

// Animated Pedestrians along Promenade
const npcs = [];
for (let i = 0; i < 4; i++) {
    const p = new THREE.Group();
    const colors = [0x38bdf8, 0xf43f5e, 0x10b981, 0xa855f7];
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 1.2, 10), new THREE.MeshStandardMaterial({ color: colors[i] }));
    body.position.y = 1.1;
    p.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), new THREE.MeshStandardMaterial({ color: 0xf5cba7 }));
    head.position.y = 1.95;
    p.add(head);

    p.position.set(-25 + (i * 18), 0, -4 + (i % 2 === 0 ? 3 : -3));
    scene.add(p);
    npcs.push({ group: p, speed: 1.2 + Math.random() * 0.8, dir: i % 2 === 0 ? 1 : -1, minX: -36, maxX: 36 });
}

// ==========================================
// ROAD & TRANSIT NETWORK (Phase 3: City Foundation)
// ==========================================

// 1. East-West Marine Avenue (Z = 16, X = -75 to +75, width 12)
const roadMain = new THREE.Mesh(
    new THREE.BoxGeometry(150, 0.4, 12),
    new THREE.MeshStandardMaterial({ map: asphaltCrossTex, roughness: 0.85 })
);
roadMain.position.set(0, -0.2, 16);
roadMain.receiveShadow = true;
scene.add(roadMain);

// 2. North Avenue (X = 0, connecting Marine Ave Z = 16 to School Z = 92, width 12)
const roadNorth = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.4, 76),
    new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.85 })
);
roadNorth.position.set(0, -0.2, 54);
roadNorth.receiveShadow = true;
scene.add(roadNorth);

// 3. West Boulevard (X = -48, connecting Marine Ave to Home District Z = 62, width 12)
const roadWest = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.4, 46),
    new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.85 })
);
roadWest.position.set(-48, -0.2, 39);
roadWest.receiveShadow = true;
scene.add(roadWest);

// 4. East Boulevard (X = 48, connecting Marine Ave to DMCE College Z = 62, width 12)
const roadEast = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.4, 46),
    new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.85 })
);
roadEast.position.set(48, -0.2, 39);
roadEast.receiveShadow = true;
scene.add(roadEast);

// 5. Market Street Cross Avenue (Z = 42, X = -75 to +75, width 8 - interconnected urban grid)
const roadMarket = new THREE.Mesh(
    new THREE.BoxGeometry(150, 0.4, 8),
    new THREE.MeshStandardMaterial({ map: asphaltCrossTex, roughness: 0.85 })
);
roadMarket.position.set(0, -0.2, 42);
roadMarket.receiveShadow = true;
scene.add(roadMarket);

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

// Register Sidewalk Network
registerSidewalk(0, 23.5, 3.0, 150, true);
registerSidewalk(0, 8.5, 3.0, 150, true);
registerSidewalk(-7.5, 54, 3.0, 76, false);
registerSidewalk(7.5, 54, 3.0, 76, false);
registerSidewalk(-55.5, 39, 3.0, 46, false);
registerSidewalk(-40.5, 39, 3.0, 46, false);
registerSidewalk(40.5, 39, 3.0, 46, false);
registerSidewalk(55.5, 39, 3.0, 46, false);
registerSidewalk(0, 47.5, 3.0, 150, true);
registerSidewalk(0, 36.5, 3.0, 150, true);

// Register Zebra Crossings at Major Intersections
registerZebraCrossing(0, 16, true);
registerZebraCrossing(0, 16, false);
registerZebraCrossing(0, 42, true);
registerZebraCrossing(0, 42, false);
registerZebraCrossing(-48, 42, true);
registerZebraCrossing(48, 42, true);
registerZebraCrossing(0, 86, true);

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
    curbMesh.castShadow = true;
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
    mainMesh.castShadow = true;
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

    if (concreteGeoms.length > 0) {
        const mergedConcrete = BufferGeometryUtils.mergeGeometries(concreteGeoms);
        const cMesh = new THREE.Mesh(mergedConcrete, concreteTrimMat);
        cMesh.castShadow = true;
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
    roof.castShadow = true;
    group.add(roof);

    // Exposed vertical conduit pipes
    const pipeGeoms = [];
    [-width / 2 + 0.4, width / 2 - 0.4].forEach(px => {
        const pipe = new THREE.BoxGeometry(0.12, totalH, 0.12);
        pipe.translate(px, totalH / 2, depth / 2 + 0.1);
        pipeGeoms.push(pipe);
    });
    const mergedPipes = BufferGeometryUtils.mergeGeometries(pipeGeoms);
    group.add(new THREE.Mesh(mergedPipes, pipeMat));

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);

    const minX = x - (width + 0.4) / 2;
    const maxX = x + (width + 0.4) / 2;
    const minZ = z - depth / 2;
    const maxZ = z + depth / 2 + corridorDepth;
    registerBoxCollider(minX, maxX, minZ, maxZ, 'Chawl');
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
    mainBody.castShadow = true;
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

    if (concreteGeoms.length > 0) {
        const mergedConcrete = BufferGeometryUtils.mergeGeometries(concreteGeoms);
        const cMesh = new THREE.Mesh(mergedConcrete, concreteTrimMat);
        cMesh.castShadow = true;
        group.add(cMesh);
    }
    if (metalGeoms.length > 0) {
        const mergedMetal = BufferGeometryUtils.mergeGeometries(metalGeoms);
        group.add(new THREE.Mesh(mergedMetal, metalGrillMat));
    }
    if (tankGeoms.length > 0) {
        const mergedTanks = BufferGeometryUtils.mergeGeometries(tankGeoms);
        const tMesh = new THREE.Mesh(mergedTanks, sintexTankMat);
        tMesh.castShadow = true;
        group.add(tMesh);
    }

    // Dish TV Antenna
    const dish = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.08, 12),
        whiteTrimMat
    );
    dish.rotation.x = Math.PI / 4;
    dish.position.set(0, totalH + 1.2, -depth / 3);
    group.add(dish);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);

    const minX = x - (width + 0.4) / 2;
    const maxX = x + (width + 0.4) / 2;
    const minZ = z - depth / 2;
    const maxZ = z + depth / 2 + 1.3;
    registerBoxCollider(minX, maxX, minZ, maxZ, 'Apartment');
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
    upperBody.castShadow = true;
    group.add(upperBody);

    // 2. Merged Ground Base & Parapet
    const concreteGeoms = [];
    const baseGeom = new THREE.BoxGeometry(width + 0.15, groundH, depth);
    baseGeom.translate(0, groundH / 2, 0);
    concreteGeoms.push(baseGeom);

    const parapet = new THREE.BoxGeometry(width + 0.2, 0.8, depth + 0.2);
    parapet.translate(0, totalH + 0.4, 0);
    concreteGeoms.push(parapet);

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
    sMesh.castShadow = true;
    group.add(sMesh);

    // 4. Fabric Awning
    const awning = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.3, 0.3, 1.6),
        new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.7 })
    );
    awning.rotation.x = 0.18;
    awning.position.set(0, 3.3, depth / 2 + 0.8);
    awning.castShadow = true;
    group.add(awning);

    // 5. Bilingual Signboard
    const signTex = createBilingualSignboardTexture(mrName, enName, '#0f172a', '#f8fafc');
    const signBoard = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 0.88, 1.3),
        new THREE.MeshBasicMaterial({ map: signTex })
    );
    signBoard.position.set(0, 4.0, depth / 2 + 0.16);
    group.add(signBoard);

    // 6. Rooftop Tank
    const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.0, 1.9, 12),
        sintexTankMat
    );
    tank.position.set(width / 4, totalH + 0.95, -depth / 4);
    tank.castShadow = true;
    group.add(tank);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);

    const minX = x - (width + 0.4) / 2;
    const maxX = x + (width + 0.4) / 2;
    const minZ = z - depth / 2;
    const maxZ = z + depth / 2 + 1.7;
    registerBoxCollider(minX, maxX, minZ, maxZ, 'Commercial');
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
    glassBody.castShadow = true;
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

    const mergedArch = BufferGeometryUtils.mergeGeometries(archGeoms);
    const archMesh = new THREE.Mesh(mergedArch, concreteTrimMat);
    archMesh.castShadow = true;
    group.add(archMesh);

    // 3. Red Warning Beacon
    const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    beacon.position.set(0, totalH + 2.8, 0);
    group.add(beacon);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);

    const minX = x - (width + 0.6) / 2;
    const maxX = x + (width + 0.6) / 2;
    const minZ = z - depth / 2;
    const maxZ = z + depth / 2 + 2.2;
    registerBoxCollider(minX, maxX, minZ, maxZ, 'CorporateTower');
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
    // 19. Commercial C6 (Campus Cafe & Bakery)
    createCommercialBuilding(64, 54, 14, 10, 3, "कॅम्पस कॅफे आणि बेकरी", "CAMPUS CAFE & BAKERY", 0xb91c1c, 0xf43f5e);
    // 20. Corporate Tower T6 (Cloud Data Center)
    createCorporateTower(64, 70, 14, 10, 7, 0x0369a1);
    // 21. Apartment A6 (Seawoods Enclave)
    createApartmentBuilding(64, 82, 12, 10, 6, 'peach');

    // --- SECTOR 4: NORTH DISTRICT & ARTERIAL BOULEVARDS ---
    // 22. St. Xavier's Academic Annex & Library (West of School)
    createCorporateTower(-24, 84, 12, 10, 5, 0x475569);
    // 23. Youth Sports & Cultural Pavilion (East of School)
    createCommercialBuilding(24, 84, 12, 10, 3, "युवा क्रीडा आणि सांस्कृतिक केंद्र", "YOUTH SPORTS & CULTURAL CENTRE", 0x15803d, 0x16a34a);
    // 24. Chawl 4 (Central Railway Staff Colony)
    createChawlBuilding(-48, 82, 14, 10, 3);
}
buildMumbaiUrbanGrid();
window.__cityBuildings = cityBuildings;

// ==========================================
// DISTRICT 1: HOME & DEV WORKSTATION (HQ)
// (X = -48, Z = 62)
// ==========================================
let poiHome = { x: -48, z: 62, radius: 10 };
function buildHomeDistrict() {
    registerBoxCollider(poiHome.x - 11.5, poiHome.x + 11.5, poiHome.z - 10.5, poiHome.z + 10.5, 'HomeHQ');
    const home = new THREE.Group();

    // Modern glass-front villa
    const floor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 20), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 }));
    floor.position.set(0, -0.1, 0);
    floor.receiveShadow = true;
    home.add(floor);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 0.8), new THREE.MeshStandardMaterial({ map: modernFacadeTex, roughness: 0.7 }));
    backWall.position.set(0, 6, -10);
    home.add(backWall);

    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, 20), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }));
    sideWall.position.set(-11, 6, 0);
    home.add(sideWall);

    // Neon Home Sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256; signCanvas.height = 64;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("🏠 DEVARSHI'S HQ", 128, 42);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) }));
    sign.position.set(0, 11, -9.5);
    home.add(sign);

    // Bed Setup
    const bed = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }));
    bed.position.set(-6.5, 0.6, -5);
    home.add(bed);

    // PC Gaming Desk Setup
    const desk = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 3.5), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    desk.position.set(4, 2.5, -7);
    home.add(desk);

    // Dual Monitors with Glowing Code
    const monCanvas = document.createElement('canvas');
    monCanvas.width = 256; monCanvas.height = 128;
    const mCtx = monCanvas.getContext('2d');
    mCtx.fillStyle = '#020617'; mCtx.fillRect(0, 0, 256, 128);
    mCtx.fillStyle = '#38bdf8'; mCtx.font = 'bold 12px monospace';
    mCtx.fillText("> Devarshi.role = 'DevSecOps';", 10, 28);
    mCtx.fillText("> Devarshi.skills = ['ThreeJS', 'React'];", 10, 52);
    mCtx.fillStyle = '#22c55e';
    mCtx.fillText("> Status: Server Online (60 FPS)", 10, 80);
    const monTex = new THREE.CanvasTexture(monCanvas);

    [-1.6, 1.6].forEach(mx => {
        const mon = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.6), new THREE.MeshBasicMaterial({ map: monTex }));
        mon.position.set(4 + mx, 3.8, -7.5);
        home.add(mon);
    });

    // Gaming Chair
    const chair = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 1.8), new THREE.MeshStandardMaterial({ color: 0x06b6d4 }));
    chair.position.set(4, 1.3, -4.5);
    home.add(chair);

    // Posters (Iron Man & Max Verstappen)
    createWallPoster(home, 'IRON MAN', '#dc2626', '#fde047', -6.5, 6.5, -9.5);
    createWallPoster(home, 'VERSTAPPEN 33', '#1e3a8a', '#ef4444', 4, 7.5, -9.5);

    // Cozy Interior Ceiling Light
    const roomLight = new THREE.PointLight(0xffedd5, 2.8, 26);
    roomLight.position.set(0, 8, 0);
    home.add(roomLight);

    home.position.set(poiHome.x, 0, poiHome.z);
    scene.add(home);
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
// DISTRICT 2: HIGH SCHOOL CAMPUS (ST. XAVIER'S)
// (X = 0, Z = 102)
// ==========================================
let poiSchool = { x: 0, z: 102, radius: 14 };
function buildSchoolDistrict() {
    registerBoxCollider(poiSchool.x - 18, poiSchool.x + 18, poiSchool.z - 13, poiSchool.z + 1, 'SchoolBuilding');
    registerBoxCollider(poiSchool.x - 19, poiSchool.x - 13, poiSchool.z + 1.5, poiSchool.z + 10.5, 'SchoolBus');
    const school = new THREE.Group();

    // Red Brick School Main Building
    const schoolBuilding = new THREE.Mesh(new THREE.BoxGeometry(34, 14, 12), new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.8 }));
    schoolBuilding.position.set(0, 7, -6);
    schoolBuilding.castShadow = true; schoolBuilding.receiveShadow = true;
    school.add(schoolBuilding);

    // Central Clock Tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(8, 22, 8), new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.8 }));
    tower.position.set(0, 11, -6);
    school.add(tower);

    // Clock Face
    const clockCanvas = document.createElement('canvas');
    clockCanvas.width = 128; clockCanvas.height = 128;
    const cCtx = clockCanvas.getContext('2d');
    cCtx.fillStyle = '#f8fafc'; cCtx.beginPath(); cCtx.arc(64, 64, 60, 0, Math.PI * 2); cCtx.fill();
    cCtx.strokeStyle = '#0f172a'; cCtx.lineWidth = 6; cCtx.stroke();
    // Clock hands
    cCtx.strokeStyle = '#0f172a'; cCtx.lineWidth = 5;
    cCtx.beginPath(); cCtx.moveTo(64, 64); cCtx.lineTo(64, 25); cCtx.stroke();
    cCtx.beginPath(); cCtx.moveTo(64, 64); cCtx.lineTo(95, 64); cCtx.stroke();
    const clockMesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(clockCanvas) }));
    clockMesh.position.set(0, 18, -1.9);
    school.add(clockMesh);

    // School Roof Pyramid Spire
    const spire = new THREE.Mesh(new THREE.ConeGeometry(5.8, 6, 4), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    spire.rotation.y = Math.PI / 4;
    spire.position.set(0, 25, -6);
    school.add(spire);

    // Grand Entrance Doors & School Board
    const sBoardCanvas = document.createElement('canvas');
    sBoardCanvas.width = 512; sBoardCanvas.height = 128;
    const sbCtx = sBoardCanvas.getContext('2d');
    sbCtx.fillStyle = '#1e1b4b'; sbCtx.fillRect(0, 0, 512, 128);
    sbCtx.fillStyle = '#f59e0b'; sbCtx.font = 'bold 26px serif';
    sbCtx.textAlign = 'center';
    sbCtx.fillText("ST. XAVIER'S HIGH SCHOOL", 256, 52);
    sbCtx.fillStyle = '#cbd5e1'; sbCtx.font = 'bold 18px sans-serif';
    sbCtx.fillText("Foundational Academic Excellence (2007 - 2017)", 256, 92);
    const sBoard = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sBoardCanvas) }));
    sBoard.position.set(0, 11, 0.2);
    school.add(sBoard);

    // School Playground Football Goal
    const goalMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 0.2), goalMat);
    crossbar.position.set(16, 2.5, 6);
    school.add(crossbar);
    [-4, 4].forEach(gx => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8), goalMat);
        post.position.set(16 + gx, 1.25, 6);
        school.add(post);
    });

    // Yellow School Bus parked outside
    const bus = new THREE.Group();
    const busBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 9), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
    busBody.position.set(-16, 1.8, 6);
    bus.add(busBody);
    const busRoof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 9), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    busRoof.position.set(-16, 3.3, 6);
    bus.add(busRoof);
    school.add(bus);

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
    registerBoxCollider(poiCollege.x - 17, poiCollege.x + 17, poiCollege.z - 12, poiCollege.z - 1, 'CollegeBuilding');
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
    [-18, 18].forEach(tx => {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 5, 8), new THREE.MeshStandardMaterial({ color: 0x5c4033 }));
        trunk.position.set(tx, 2.5, 0);
        college.add(trunk);

        const leaves = new THREE.Mesh(new THREE.SphereGeometry(3.6, 12, 12), new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.8 }));
        leaves.position.set(tx, 6.5, 0);
        college.add(leaves);
    });

    // Graduation Cap Monument
    const cap = new THREE.Group();
    const capMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const capBoard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 2.4), capMat);
    capBoard.rotation.y = Math.PI / 4;
    capBoard.position.y = 2.2;
    cap.add(capBoard);
    const capSkull = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.8, 16), capMat);
    capSkull.position.y = 1.7;
    cap.add(capSkull);
    cap.position.set(0, 0, 4);
    college.add(cap);

    college.position.set(poiCollege.x, 0, poiCollege.z);
    scene.add(college);
}
buildCollegeDistrict();

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
        wheel.castShadow = true;
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
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.95, roughness: 0.1 });

    // Lower Body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 5.2), carMat);
    lowerBody.position.y = 0.7;
    lowerBody.castShadow = true;
    carGroup.add(lowerBody);

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

    // 4 Wheels
    [-1.3, 1.3].forEach(wx => {
        [-1.6, 1.6].forEach(wz => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), tireMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.55, wz);
            wheel.castShadow = true;
            carGroup.add(wheel);

            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.42, 8), rimMat);
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

// Active Vehicle State
let activeVehicle = null; // null | bikeVehicle | carVehicle | 'train'

// ==========================================
// VEHICLE 3: MUMBAI CITY EXPRESS LOCAL TRAIN
// (Railway Track running along X = -24, Z = 14 to 86)
// ==========================================
const trainStationZ = [16, 50, 84]; // Gateway Station, Home Station, School/College Terminal
let trainState = {
    mesh: null,
    x: -24,
    z: 16,
    speed: 0,
    maxSpeed: 18,
    targetStationIdx: 1,
    direction: 1, // 1: Northbound, -1: Southbound
    dwellTimer: 0,
    isDwelling: false
};

function buildRailwaySystem() {
    registerBoxCollider(-31.5, -26.0, 6, 94, 'TrainPlatforms');
    // Railway Track Bed (Z = 12 to 88, width 6)
    const trackBed = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.3, 76),
        new THREE.MeshStandardMaterial({ map: railTrackTex, roughness: 0.9 })
    );
    trackBed.position.set(-24, -0.15, 50);
    trackBed.receiveShadow = true;
    scene.add(trackBed);

    // Train Station Platforms (Gateway, Home, School/College)
    trainStationZ.forEach((sz, idx) => {
        const plat = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.7, 16), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 }));
        plat.position.set(-28.5, 0.25, sz);
        scene.add(plat);

        // Canopy
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
        canopy.position.set(-28.5, 4.2, sz);
        scene.add(canopy);

        // Sign
        const sCan = document.createElement('canvas');
        sCan.width = 256; sCan.height = 64;
        const ctx = sCan.getContext('2d');
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        const names = ['STATION: GATEWAY', 'STATION: HOME HQ', 'STATION: ACADEMIA'];
        ctx.fillText(names[idx], 128, 40);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sCan) }));
        sign.position.set(-25.8, 3.2, sz);
        sign.rotation.y = Math.PI / 2;
        scene.add(sign);
    });

    // Futuristic Electric Train Group (3 Cars)
    const trainGroup = new THREE.Group();
    const trainMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.7 });
    const blueStripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    [-6.5, 0, 6.5].forEach((cz, i) => {
        const car = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 6.0), trainMat);
        body.position.y = 1.8;
        body.castShadow = true;
        car.add(body);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.6, 6.04), blueStripeMat);
        stripe.position.y = 1.3;
        car.add(stripe);

        // Windows
        [-1.63, 1.63].forEach(wx => {
            for (let wz = -2; wz <= 2; wz += 1.3) {
                const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), winMat);
                win.position.set(wx, 2.1, wz);
                win.rotation.y = wx > 0 ? Math.PI / 2 : -Math.PI / 2;
                car.add(win);
            }
        });

        car.position.z = cz;
        trainGroup.add(car);
    });

    // Train Headlight
    const trainHeadlight = new THREE.SpotLight(0xfffae6, 4.0, 35, Math.PI / 4, 0.4);
    trainHeadlight.position.set(0, 1.8, 10);
    trainHeadlight.target.position.set(0, 0, 25);
    trainGroup.add(trainHeadlight);
    trainGroup.add(trainHeadlight.target);

    trainGroup.position.set(trainState.x, 0, trainState.z);
    scene.add(trainGroup);
    trainState.mesh = trainGroup;
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

// Helmet
const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 16), redArmorMat);
helmet.position.y = 1.95;
ironManSuit.add(helmet);

const faceplate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 0.35), goldArmorMat);
faceplate.position.set(0, 1.9, 0.45);
ironManSuit.add(faceplate);

// Glowing Eyes
[-0.16, 0.16].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.1), arcReactorMat);
    eye.position.set(ex, 1.96, 0.63);
    ironManSuit.add(eye);
});

// Chestplate + Arc Reactor
const chest = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 0.65), redArmorMat);
chest.position.y = 1.1;
ironManSuit.add(chest);

const arcReactor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), arcReactorMat);
arcReactor.rotation.x = Math.PI / 2;
arcReactor.position.set(0, 1.25, 0.35);
ironManSuit.add(arcReactor);

// Gold Shoulder Pads
[-0.65, 0.65].forEach(sx => {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), goldArmorMat);
    pad.position.set(sx, 1.45, 0);
    ironManSuit.add(pad);
});

// Legs & Repulsor Boots
[-0.26, 0.26].forEach(lx => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.9, 8), redArmorMat);
    leg.position.set(lx, 0.45, 0);
    ironManSuit.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.55), goldArmorMat);
    boot.position.set(lx, 0.11, 0.06);
    ironManSuit.add(boot);
});

characterGroup.add(ironManSuit);

// Repulsor Jet Thrust Lights & Particle Sparks
const jetParticles = [];
const jetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
for (let i = 0; i < 24; i++) {
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
let flightSpeed = 16;
let shockwaveActive = false;
let shockwaveScale = 1;

// Controls & Movement State
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = true;
    if (k === 's' || k === 'arrowdown') keys.s = true;
    if (k === 'a' || k === 'arrowleft') keys.a = true;
    if (k === 'd' || k === 'arrowright') keys.d = true;
    if (k === ' ' || e.key === 'Spacebar') { keys.space = true; e.preventDefault(); }
    if (e.key === 'Shift') keys.shift = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (k === 'f') toggleVehicleMount();
    if (k === 'e') handleInteraction();
    if (k === 't') cycleTimeOfDay();
    if (k === 'c') toggleCameraMode();
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
});

function toggleCameraMode() {
    const modes = ['chase', 'cinematic', 'orbit'];
    cameraMode = modes[(modes.indexOf(cameraMode) + 1) % modes.length];
    orbitControls.enabled = (cameraMode === 'orbit');
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
function teleportTo(targetX, targetZ, label) {
    if (activeVehicle) dismountVehicle();
    const fade = document.getElementById('fade-overlay');
    fade.style.opacity = '1';
    playSound('chime');

    setTimeout(() => {
        characterGroup.position.set(targetX, 0, targetZ);
        characterGroup.rotation.y = 0;
        camera.position.set(targetX, 7.5, targetZ - 14);
        camera.lookAt(targetX, 2, targetZ + 4);
        fade.style.opacity = '0';
    }, 400);
}

document.getElementById('btn-tp-gateway').addEventListener('click', () => teleportTo(0, -6, 'Gateway'));
document.getElementById('btn-tp-home').addEventListener('click', () => teleportTo(-48, 34, 'Home HQ'));
document.getElementById('btn-tp-school').addEventListener('click', () => teleportTo(0, 66, 'High School'));
document.getElementById('btn-tp-college').addEventListener('click', () => teleportTo(48, 34, 'DMCE College'));

// Vehicle Speedometer HUD
const speedoCard = document.getElementById('speedo-card');
const speedoMode = document.getElementById('speedo-mode');
const speedoVal = document.getElementById('speedo-val');

function toggleVehicleMount() {
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

        // Proximity check for Train
        const dTrain = characterGroup.position.distanceTo(trainState.mesh.position);
        if (dTrain < 6.0) {
            mountTrain();
            return;
        }
    }
}

function mountVehicle(v) {
    activeVehicle = v;
    speedoCard.style.display = 'flex';
    speedoMode.textContent = v.type === 'bike' ? '🏍️ CYBER BIKE' : '🚗 CYBER CAR';
    playSound('engine');
    if (v.type === 'bike') {
        characterGroup.visible = true;
        characterGroup.position.set(0, 0.45, -0.2);
        characterGroup.rotation.set(0, 0, 0);
        v.mesh.add(characterGroup);
    } else {
        characterGroup.visible = true;
        characterGroup.position.set(0.4, 0.4, -0.3);
        characterGroup.rotation.set(0, 0, 0);
        v.mesh.add(characterGroup);
    }
}

function mountTrain() {
    activeVehicle = 'train';
    characterGroup.visible = false;
    speedoCard.style.display = 'flex';
    speedoMode.textContent = '🚊 MUMBAI CITY EXPRESS';
    playSound('trainHorn');
}

function dismountVehicle() {
    if (activeVehicle === 'train') {
        activeVehicle = null;
        characterGroup.visible = true;
        scene.add(characterGroup);
        characterGroup.position.set(trainState.x - 4.5, 0, trainState.z);
    } else if (activeVehicle) {
        const v = activeVehicle;
        activeVehicle = null;
        scene.add(characterGroup);
        characterGroup.position.set(v.mesh.position.x - 2.5, 0, v.mesh.position.z);
        characterGroup.rotation.set(0, v.rotation, 0);
    }
    speedoCard.style.display = 'none';
    playSound('engine');
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
    } else if (currentInteraction === 'schoolBoard') {
        modalTitleEl.innerHTML = "🏫 St. Xavier's High School";
        modalBodyEl.innerHTML = `
            <strong>Foundational Academic Journey:</strong><br>
            • <strong>Schooling:</strong> St. Xavier's High School (Graduated with Distinction)<br>
            • <strong>Milestones:</strong> Science Fair Gold Medalist, Inter-School Mathematics Olympiad finalist, and Football Team Captain.<br>
            • <strong>First Spark:</strong> Built first algorithmic automation script and explored computer architecture at age 14.
        `;
        modalCodePreviewEl.style.display = 'none';
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

    // Nearest waypoint calculation
    const waypoints = [
        { name: "Gateway Arch", x: 0, z: -6 },
        { name: "Devarshi's HQ", x: poiHome.x, z: poiHome.z },
        { name: "St. Xavier's School", x: poiSchool.x, z: poiSchool.z },
        { name: "DMCE College", x: poiCollege.x, z: poiCollege.z },
        { name: "City Train Station", x: trainState.x, z: 16 }
    ];

    let nearest = waypoints[0];
    let minDist = Infinity;
    waypoints.forEach(wp => {
        const d = Math.hypot(wp.x - playerX, wp.z - playerZ);
        if (d < minDist) { minDist = d; nearest = wp; }
    });
    waypointTrackerEl.textContent = `🎯 Nearest: ${nearest.name} (${Math.round(minDist)}m)`;

    mapCtx.clearRect(0, 0, 190, 190);

    // Coordinate Transform: Map Center (95, 95) represents World (0, 35)
    // Scale: 1 unit in world = 1.15 px on map
    const cx = 95;
    const cy = 95;
    const scale = 1.15;
    const worldCenterZ = 35;

    function toMapX(wx) { return cx + (wx * scale); }
    function toMapY(wz) { return cy + ((wz - worldCenterZ) * scale); }

    // 1. Ocean Water (Top region)
    mapCtx.fillStyle = '#1e3a8a';
    mapCtx.fillRect(0, 0, 190, toMapY(-22));

    // Shoreline accent
    mapCtx.strokeStyle = '#38bdf8';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.moveTo(0, toMapY(-22));
    mapCtx.lineTo(190, toMapY(-22));
    mapCtx.stroke();

    // 2. Promenade Plaza
    mapCtx.fillStyle = '#64748b';
    mapCtx.fillRect(toMapX(-45), toMapY(-22), 90 * scale, 32 * scale);

    // 3. Road Network
    mapCtx.fillStyle = '#1e293b';
    // Marine Ave (East-West)
    mapCtx.fillRect(toMapX(-75), toMapY(10), 150 * scale, 12 * scale);
    // Market Street (East-West Cross Ave at Z = 42)
    mapCtx.fillRect(toMapX(-75), toMapY(38), 150 * scale, 8 * scale);
    // North Ave to School
    mapCtx.fillRect(toMapX(-6), toMapY(16), 12 * scale, 76 * scale);
    // West Blvd to Home
    mapCtx.fillRect(toMapX(-54), toMapY(16), 12 * scale, 46 * scale);
    // East Blvd to DMCE
    mapCtx.fillRect(toMapX(42), toMapY(16), 12 * scale, 46 * scale);

    // 4. Railway Track
    mapCtx.strokeStyle = '#f97316';
    mapCtx.lineWidth = 2.5;
    mapCtx.setLineDash([4, 4]);
    mapCtx.beginPath();
    mapCtx.moveTo(toMapX(-24), toMapY(12));
    mapCtx.lineTo(toMapX(-24), toMapY(88));
    mapCtx.stroke();
    mapCtx.setLineDash([]);

    // 5. Building Footprints
    // Procedural Mumbai City Buildings (24 Buildings)
    cityBuildings.forEach(b => {
        if (b.type === 'chawl') mapCtx.fillStyle = '#b45309';
        else if (b.type === 'apartment') mapCtx.fillStyle = '#eab308';
        else if (b.type === 'commercial') mapCtx.fillStyle = '#06b6d4';
        else if (b.type === 'corporate') mapCtx.fillStyle = '#3b82f6';
        else mapCtx.fillStyle = '#475569';
        mapCtx.fillRect(toMapX(b.minX), toMapY(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
    });

    // Gateway Arch (Gold)
    mapCtx.fillStyle = '#f59e0b';
    mapCtx.fillRect(toMapX(-16), toMapY(-38), 32 * scale, 12 * scale);

    // Home HQ (Blue)
    mapCtx.fillStyle = '#2563eb';
    mapCtx.fillRect(toMapX(poiHome.x - 11), toMapY(poiHome.z - 10), 22 * scale, 20 * scale);

    // High School (Purple)
    mapCtx.fillStyle = '#9333ea';
    mapCtx.fillRect(toMapX(poiSchool.x - 17), toMapY(poiSchool.z - 12), 34 * scale, 14 * scale);

    // DMCE College (Emerald)
    mapCtx.fillStyle = '#059669';
    mapCtx.fillRect(toMapX(poiCollege.x - 16), toMapY(poiCollege.z - 10), 32 * scale, 16 * scale);

    // 6. Train Marker (Moving orange pill)
    const trainMapX = toMapX(trainState.x);
    const trainMapY = toMapY(trainState.z);
    mapCtx.fillStyle = '#fb923c';
    mapCtx.fillRect(trainMapX - 3, trainMapY - 8, 6, 16);

    // 7. Parked Vehicles (Car & Bike markers)
    mapCtx.fillStyle = '#06b6d4';
    mapCtx.beginPath();
    mapCtx.arc(toMapX(carVehicle.mesh.position.x), toMapY(carVehicle.mesh.position.z), 4, 0, Math.PI * 2);
    mapCtx.fill();

    mapCtx.fillStyle = '#ef4444';
    mapCtx.beginPath();
    mapCtx.arc(toMapX(bikeVehicle.mesh.position.x), toMapY(bikeVehicle.mesh.position.z), 3.5, 0, Math.PI * 2);
    mapCtx.fill();

    // 8. 360° Rotating Radar Sweep Line
    radarAngle += 0.04;
    mapCtx.save();
    mapCtx.translate(cx, cy);
    mapCtx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.moveTo(0, 0);
    mapCtx.lineTo(Math.cos(radarAngle) * 90, Math.sin(radarAngle) * 90);
    mapCtx.stroke();
    mapCtx.restore();

    // 9. Player GPS Navigation Arrow (Red with white border)
    const px = toMapX(playerX);
    const py = toMapY(playerZ);

    mapCtx.save();
    mapCtx.translate(px, py);
    mapCtx.rotate(-playerRot);

    // Pulsing GPS signal ring
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

    // 3. Animated Pedestrian NPCs
    npcs.forEach(npc => {
        npc.group.position.x += npc.speed * npc.dir * delta;
        npc.group.position.y = Math.abs(Math.sin(time * 5)) * 0.12;
        if (npc.group.position.x > npc.maxX) npc.dir = -1;
        if (npc.group.position.x < npc.minX) npc.dir = 1;
    });

    // 4. Mumbai City Express Train Simulation
    const targetZ = trainStationZ[trainState.targetStationIdx];
    if (trainState.isDwelling) {
        trainState.dwellTimer += delta;
        if (trainState.dwellTimer > 4.0) {
            trainState.isDwelling = false;
            trainState.dwellTimer = 0;
            playSound('trainHorn');
            // Advance to next station
            if (trainState.targetStationIdx === trainStationZ.length - 1) trainState.direction = -1;
            else if (trainState.targetStationIdx === 0) trainState.direction = 1;
            trainState.targetStationIdx += trainState.direction;
        }
    } else {
        const dist = targetZ - trainState.z;
        if (Math.abs(dist) < 0.5) {
            trainState.z = targetZ;
            trainState.isDwelling = true;
            playSound('chime');
        } else {
            const step = Math.sign(dist) * trainState.maxSpeed * delta;
            trainState.z += step;
        }
    }
    trainState.mesh.position.z = trainState.z;

    // 5. Superhero Iron Man Landing Sequence
    if (isFlyingIn) {
        characterGroup.position.y -= flightSpeed * delta;
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
        if (activeVehicle === 'train') {
            // Train Passenger Mode
            speedoVal.textContent = Math.round(trainState.isDwelling ? 0 : 54);

            if (cameraMode === 'chase' || cameraMode === 'cinematic') {
                camera.position.x = THREE.MathUtils.lerp(camera.position.x, trainState.x - 14, 0.08);
                camera.position.z = THREE.MathUtils.lerp(camera.position.z, trainState.z - 8, 0.08);
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, 6.5, 0.08);
                camera.lookAt(trainState.x, 2.5, trainState.z + 4);
            }

            updateMiniMap(trainState.x, trainState.z, 0);
            checkTrainProximity();
        } else if (activeVehicle) {
            // Bike or Sports Car Physics
            const v = activeVehicle;
            const isCar = (v.type === 'car');
            const turnSpeed = isCar ? 1.8 : 2.5;

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

            // Tilt & Drift roll
            if (!isCar) {
                const targetRoll = keys.d ? -0.25 : (keys.a ? 0.25 : 0);
                v.mesh.rotation.z = THREE.MathUtils.lerp(v.mesh.rotation.z, targetRoll, 0.2);
            }

            // Spin car wheels
            if (isCar) {
                carVehicle.wheels.forEach(w => w.rotation.x += v.speed * delta * 2.0);
            }

            // Resolve vehicle collisions against world obstacles
            resolveCollision(v.mesh.position, isCar ? 1.6 : 0.85);

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

            // Extract horizontal camera vectors
            const camForward = new THREE.Vector3();
            camera.getWorldDirection(camForward);
            camForward.y = 0;
            if (camForward.lengthSq() < 0.001) camForward.set(0, 0, 1);
            else camForward.normalize();

            const camRight = new THREE.Vector3();
            camRight.crossVectors(new THREE.Vector3(0, 1, 0), camForward).normalize();

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
                characterGroup.position.y = Math.abs(Math.sin(walkCycle)) * 0.18;
            } else {
                characterGroup.position.y = THREE.MathUtils.lerp(characterGroup.position.y, 0, 0.2);
            }

            // Spacebar Thruster Hover Boost
            if (keys.space) {
                characterGroup.position.y = THREE.MathUtils.lerp(characterGroup.position.y, 4.2, 0.1);
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
            if (cameraMode === 'chase' || cameraMode === 'cinematic') {
                camera.position.x = THREE.MathUtils.lerp(camera.position.x, characterGroup.position.x, 0.08);
                camera.position.z = THREE.MathUtils.lerp(camera.position.z, characterGroup.position.z - 14, 0.08);
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, 7.5, 0.08);
                camera.lookAt(characterGroup.position.x, 2.0, characterGroup.position.z + 4);
            }

            updateMiniMap(characterGroup.position.x, characterGroup.position.z, characterGroup.rotation.y);
            checkProximity();
        }
    }

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

    // 2. Check Home PC Desk
    if (p.distanceTo(new THREE.Vector3(poiHome.x, 0, poiHome.z - 6)) < 16) {
        currentInteraction = 'homePC';
        showPrompt('E', 'Sit at Developer PC 💻');
        return;
    }

    // 3. Check High School Board
    if (p.distanceTo(new THREE.Vector3(poiSchool.x, 0, poiSchool.z - 16)) < 18) {
        currentInteraction = 'schoolBoard';
        showPrompt('E', "Inspect St. Xavier's High School 🏫");
        return;
    }

    // 4. Check DMCE College Board
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

    // 7. Check City Express Train
    if (p.distanceTo(trainState.mesh.position) < 6.0) {
        currentInteraction = 'trainRide';
        showPrompt('E', 'Board City Express Train 🚊');
        return;
    }

    hidePrompt();
}

function checkVehicleProximity(v) {
    showPrompt('F', `Dismount ${v.type === 'bike' ? 'Bike' : 'Car'} ⏹️`);
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
    interactionPromptEl.classList.remove('show');
}

// Initial Boot
updateTimeOfDay('sunset');
animate();

// Responsive Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
