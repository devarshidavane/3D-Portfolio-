import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { createCobblestoneTexture, createGrassTexture } from './textures.js';
import { CORE_WORLD_BOUNDS } from '../data/mumbaiGeography.js';

// ==========================================
// WORLD ENVIRONMENT, LIGHTING, SKY, SEAS & WEATHER
// ==========================================

export const WORLD_CONFIG = {
    bounds: {
        minX: CORE_WORLD_BOUNDS.minX, // -2500
        maxX: CORE_WORLD_BOUNDS.maxX, // 2500
        minZ: CORE_WORLD_BOUNDS.minZ, // -2500
        maxZ: CORE_WORLD_BOUNDS.maxZ  // 2500
    },
    playableLimits: {
        minX: CORE_WORLD_BOUNDS.minX + 20,
        maxX: CORE_WORLD_BOUNDS.maxX - 20,
        minZ: CORE_WORLD_BOUNDS.minZ + 20,
        maxZ: CORE_WORLD_BOUNDS.maxZ - 20
    }
};

export let timeOfDay = 'sunset';
export let weatherMode = 'clear';
export const streetLamps = [];
export const waterUniforms = { uTime: { value: 0 } };

let sunLight, ambientLight, skyDome, skyCtx, skyTex, starsMesh, starMat, celestialMesh;
let rainParticles, rainMat, rainPositions;

export function buildEnvironment(scene) {
    // 1. Sun / Directional Light
    sunLight = new THREE.DirectionalLight(0xff7733, 2.4);
    sunLight.position.set(40, 65, -40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 400;
    sunLight.shadow.camera.left = -160;
    sunLight.shadow.camera.right = 160;
    sunLight.shadow.camera.top = 160;
    sunLight.shadow.camera.bottom = -160;
    scene.add(sunLight);

    // 2. Ambient Light
    ambientLight = new THREE.AmbientLight(0xffa07a, 0.9);
    scene.add(ambientLight);

    // 3. Skybox Dome with dynamic procedural canvas gradient
    const skyGeom = new THREE.SphereGeometry(3800, 32, 16);
    const canvasSky = document.createElement('canvas');
    canvasSky.width = 16;
    canvasSky.height = 256;
    skyCtx = canvasSky.getContext('2d');
    skyTex = new THREE.CanvasTexture(canvasSky);
    skyDome = new THREE.Mesh(skyGeom, new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide }));
    scene.add(skyDome);

    // 4. Stars Particle Field
    const starCount = 1400;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 5500;
        starPositions[i + 1] = 40 + Math.random() * 900;
        starPositions[i + 2] = (Math.random() - 0.5) * 5500;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.1 });
    starsMesh = new THREE.Points(starGeom, starMat);
    scene.add(starsMesh);

    // 5. Celestial Mesh (Sun / Moon)
    const sunGeom = new THREE.CircleGeometry(32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffeedd, side: THREE.DoubleSide });
    celestialMesh = new THREE.Mesh(sunGeom, sunMat);
    celestialMesh.position.set(120, 80, -320);
    scene.add(celestialMesh);

    // 6. Water Surface (Arabian Sea & Thane Creek 6km vast expanse)
    const waterGeom = new THREE.PlaneGeometry(6400, 6400, 80, 80);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0e4466,
        roughness: 0.15,
        metalness: 0.8,
        flatShading: true
    });
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
    seaMesh.position.set(0, -0.6, 0);
    seaMesh.receiveShadow = false;
    scene.add(seaMesh);

    // 7. Main Ground Peninsula Turf (5km x 5km coverage)
    const grassTex = createGrassTexture();
    grassTex.repeat.set(80, 80);
    const groundGeom = new THREE.PlaneGeometry(5200, 5200, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.9 });
    const mainGround = new THREE.Mesh(groundGeom, groundMat);
    mainGround.rotation.x = -Math.PI / 2;
    mainGround.position.set(0, -0.4, 0);
    mainGround.receiveShadow = true;
    scene.add(mainGround);

    // 8. Gateway Waterfront Seawalk & Promenade
    const cobblestoneTex = createCobblestoneTexture();
    cobblestoneTex.repeat.set(16, 6);
    const walkMat = new THREE.MeshStandardMaterial({ map: cobblestoneTex, roughness: 0.75 });
    const promenade = new THREE.Mesh(new THREE.BoxGeometry(860, 0.8, 48), walkMat);
    promenade.position.set(-350, 1.8, -2250);
    promenade.receiveShadow = true;
    scene.add(promenade);

    // 9. Weather: Rain Particles (4,500 drops around camera)
    const rainCount = 4500;
    const rainGeom = new THREE.BufferGeometry();
    rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
        rainPositions[i] = (Math.random() - 0.5) * 850;
        rainPositions[i + 1] = Math.random() * 85;
        rainPositions[i + 2] = (Math.random() - 0.5) * 850;
    }
    rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    rainMat = new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.38, transparent: true, opacity: 0 });
    rainParticles = new THREE.Points(rainGeom, rainMat);
    scene.add(rainParticles);

    // Initial time setting
    updateTimeOfDay('sunset', scene);
}

export function updateTimeOfDay(mode, scene) {
    timeOfDay = mode;
    const timeLabel = document.getElementById('time-label');
    const timeIcon = document.getElementById('time-icon');
    if (!skyCtx) return;
    const grad = skyCtx.createLinearGradient(0, 0, 0, 256);

    if (mode === 'sunset') {
        if (timeIcon) timeIcon.textContent = '🌇';
        if (timeLabel) timeLabel.textContent = '18:30 Sunset';
        grad.addColorStop(0, '#160f29');
        grad.addColorStop(0.35, '#6b21a8');
        grad.addColorStop(0.65, '#ea580c');
        grad.addColorStop(0.85, '#f59e0b');
        grad.addColorStop(1.0, '#fef08a');
        if (sunLight) {
            sunLight.color.setHex(0xff7733);
            sunLight.intensity = 2.4;
            sunLight.position.set(40, 45, -50);
        }
        if (ambientLight) {
            ambientLight.color.setHex(0xffa07a);
            ambientLight.intensity = 0.9;
        }
        if (scene && scene.fog) scene.fog.color.setHex(0x1e152d);
        if (starMat) starMat.opacity = 0.1;
        if (celestialMesh) celestialMesh.material.color.setHex(0xffeedd);
        streetLamps.forEach(l => { if (l.light) l.light.intensity = 2.2; });
    } else if (mode === 'night') {
        if (timeIcon) timeIcon.textContent = '🌙';
        if (timeLabel) timeLabel.textContent = '22:00 Cyber Night';
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.4, '#0b132b');
        grad.addColorStop(1.0, '#1c2541');
        if (sunLight) {
            sunLight.color.setHex(0x38bdf8);
            sunLight.intensity = 0.6;
            sunLight.position.set(-30, 65, -30);
        }
        if (ambientLight) {
            ambientLight.color.setHex(0x1e293b);
            ambientLight.intensity = 0.5;
        }
        if (scene && scene.fog) scene.fog.color.setHex(0x060913);
        if (starMat) starMat.opacity = 0.95;
        if (celestialMesh) celestialMesh.material.color.setHex(0x93c5fd);
        streetLamps.forEach(l => { if (l.light) l.light.intensity = 4.2; });
    } else if (mode === 'sunrise') {
        if (timeIcon) timeIcon.textContent = '🌅';
        if (timeLabel) timeLabel.textContent = '06:15 Sunrise';
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.4, '#db2777');
        grad.addColorStop(0.7, '#fb923c');
        grad.addColorStop(1.0, '#fed7aa');
        if (sunLight) {
            sunLight.color.setHex(0xfb923c);
            sunLight.intensity = 2.0;
            sunLight.position.set(-60, 30, -50);
        }
        if (ambientLight) {
            ambientLight.color.setHex(0xf472b6);
            ambientLight.intensity = 0.8;
        }
        if (scene && scene.fog) scene.fog.color.setHex(0x2e1065);
        if (starMat) starMat.opacity = 0.12;
        if (celestialMesh) celestialMesh.material.color.setHex(0xffedd5);
        streetLamps.forEach(l => { if (l.light) l.light.intensity = 1.0; });
    } else if (mode === 'day') {
        if (timeIcon) timeIcon.textContent = '☀️';
        if (timeLabel) timeLabel.textContent = '12:00 Clear Noon';
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(0.5, '#38bdf8');
        grad.addColorStop(1.0, '#bae6fd');
        if (sunLight) {
            sunLight.color.setHex(0xffffff);
            sunLight.intensity = 2.8;
            sunLight.position.set(0, 85, -20);
        }
        if (ambientLight) {
            ambientLight.color.setHex(0xffffff);
            ambientLight.intensity = 1.0;
        }
        if (scene && scene.fog) scene.fog.color.setHex(0xbae6fd);
        if (starMat) starMat.opacity = 0.0;
        if (celestialMesh) celestialMesh.material.color.setHex(0xfffae6);
        streetLamps.forEach(l => { if (l.light) l.light.intensity = 0.2; });
    }

    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 16, 256);
    if (skyTex) skyTex.needsUpdate = true;
}

export function cycleTimeOfDay(scene) {
    const modes = ['sunset', 'night', 'sunrise', 'day'];
    const next = modes[(modes.indexOf(timeOfDay) + 1) % modes.length];
    updateTimeOfDay(next, scene);
}

export function setWeatherMode(mode, playSoundFn) {
    weatherMode = mode;
    const btn = document.getElementById('btn-toggle-weather');

    if (weatherMode === 'clear') {
        if (btn) {
            btn.textContent = '☀️ Clear';
            btn.classList.remove('active');
        }
        if (rainMat) rainMat.opacity = 0;
    } else if (weatherMode === 'rain') {
        if (btn) {
            btn.textContent = '🌧️ Rain: ON';
            btn.classList.add('active');
        }
        if (rainMat) rainMat.opacity = 0.65;
    } else if (weatherMode === 'storm') {
        if (btn) {
            btn.textContent = '⚡ Storm';
            btn.classList.add('active');
        }
        if (rainMat) rainMat.opacity = 0.9;
        if (playSoundFn) playSoundFn('thunder');
    }
}

export function cycleWeather(playSoundFn) {
    const modes = ['clear', 'rain', 'storm'];
    const next = modes[(modes.indexOf(weatherMode) + 1) % modes.length];
    setWeatherMode(next, playSoundFn);
}

export function updateEnvironment(delta, time, camera) {
    // 1. Advance water wave shader time
    waterUniforms.uTime.value = time;

    // 2. Center sky dome and rain field on player camera
    if (camera) {
        if (skyDome) skyDome.position.copy(camera.position);
        if (starsMesh) starsMesh.position.copy(camera.position);

        if (rainParticles && weatherMode !== 'clear') {
            rainParticles.position.x = camera.position.x;
            rainParticles.position.z = camera.position.z;

            const posAttr = rainParticles.geometry.attributes.position;
            const arr = posAttr.array;
            for (let i = 1; i < arr.length; i += 3) {
                arr[i] -= delta * 75.0; // Fall downward
                if (arr[i] < -5.0) {
                    arr[i] = 80.0 + Math.random() * 10;
                }
            }
            posAttr.needsUpdate = true;
        }
    }
}
