import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Domain Systems Architecture
import { buildEnvironment, updateEnvironment, cycleTimeOfDay, cycleWeather, WORLD_CONFIG, timeOfDay, weatherMode, streetLamps } from './src/world/worldEnvironment.js';
import { buildRoadMeshes } from './src/world/roadMeshes.js';
import { worldColliders, spatialGrid, resolveCollision, getSurfaceElevationAt, currentFloorElevation } from './src/world/worldColliders.js';
import { ChunkManager, registerLODItem, updateLevelOfDetail, lodRegistry } from './src/world/chunkManager.js';

import { buildSchoolDistrict, poiSchool } from './src/landmarks/schoolBuilding.js';
import { buildCollegeDistrict, poiCollege } from './src/landmarks/collegeBuilding.js';
import { buildStarkTower, poiHome } from './src/landmarks/homeSkyscraper.js';
import { buildIconicLandmarks, poiGateway } from './src/landmarks/iconicLandmarks.js';
import { buildAirportDistrict, updateAirportSimulation, poiAirport, atcRadarDish, airportPlanes } from './src/landmarks/airportDistrict.js';
import { buildGenericBuildings, cityBuildings } from './src/landmarks/genericBuildings.js';

import { buildPlayerVehicles, updateVehiclePhysics, bikeVehicle, carVehicle, rickshawVehicle, activeVehicle } from './src/vehicles/playerVehicles.js';
import { buildRoadTrafficSystem, buildPublicTransitSystem, buildTrafficSignalSystem, updateRoadTraffic, updatePublicTransit, updateTrafficSignals, trafficVehicles, trafficSignals, publicTransit } from './src/vehicles/trafficCars.js';
import { buildGatewayMaritime, updateMaritimeFerryBoats, maritimeFerryBoats } from './src/vehicles/maritimeTransit.js';

import { buildRailwaySystem, updateRailwayTrains, checkTrainProximity, allTrains, railwayStations, trainState } from './src/railway/railwaySystem.js';
import { buildPedestrianSimulation, updatePedestrianSimulation, npcs, allPedestrians } from './src/crowd/pedestrians.js';
import { buildAmbientCitizens } from './src/crowd/ambientCitizens.js';

import { buildMumbaiStreetProps, buildStreetActivities, updateStreetActivities, streetActivities, poiVadaPav } from './src/streetLife/streetProps.js';
import { buildEnvironmentalSimulation, updateEnvironmentalSimulation, ambientAgents } from './src/streetLife/urbanFauna.js';

import { buildPlayerCharacter, updatePlayerLocomotion, characterGroup, devChar, ironManSuit, shockRing } from './src/character/playerCharacter.js';
import { enterFlightMode, exitFlightMode, toggleFlightMode, updateFlightPhysics, getIsFlightMode, getFlightSpeed, getFlightVertSpeed, getFlightPitch, getFlightRoll, getFlightHeading, isFlightMode } from './src/character/ironManFlight.js';

import { updateMiniMap, setNavigationDestination, toggleMinimapExpanded } from './src/ui/minimapRadar.js';
import { playSound, toggleAudio, updateTachometerHUD, showPrompt, hidePrompt } from './src/ui/hudOverlay.js';
import { initCyberPhone, toggleCyberPhone, toggleVehicleMount, handleInteraction, checkProximity, currentInteraction, teleportTo } from './src/ui/cyberPhone.js';
import { initWorldMap, toggleWorldMap, openWorldMap, closeWorldMap, isWorldMapOpen, drawWorldMap, setMapLayer, getMapLayer, setOverlayNetwork, fitMapToView } from './src/ui/worldMapInteractive.js';

// ==========================================
// RENDERER, SCENE & CAMERA SETUP
// ==========================================
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1427);
scene.fog = new THREE.FogExp2(0x0c1427, 0.0016);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1400);
camera.position.set(0, 7.5, -42);

const isMobileDevice = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || (window.innerWidth <= 768);
const getOptimalPixelRatio = () => isMobileDevice ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 1.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(getOptimalPixelRatio());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// Camera view mode: 'chase', 'cinematic', 'orbit'
let cameraMode = 'chase';
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.05;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.minDistance = 3;
orbitControls.maxDistance = 140;
orbitControls.enabled = false;

function toggleCameraMode() {
    if (cameraMode === 'chase') {
        cameraMode = 'cinematic';
        orbitControls.enabled = false;
    } else if (cameraMode === 'cinematic') {
        cameraMode = 'orbit';
        orbitControls.enabled = true;
        orbitControls.target.copy(characterGroup.position);
    } else {
        cameraMode = 'chase';
        orbitControls.enabled = false;
    }
}

// 500m Spatial World Chunk Manager
const chunkManager = new ChunkManager(scene, 500);

// ==========================================
// INITIALIZE 5KM MUMBAI WORLD SYSTEMS
// ==========================================
buildEnvironment(scene);
buildRoadMeshes(scene);
buildSchoolDistrict(scene);
buildCollegeDistrict(scene);
buildStarkTower(scene, cityBuildings);
buildIconicLandmarks(scene);
buildAirportDistrict(scene);
buildGenericBuildings(scene);

buildPlayerVehicles(scene);
buildTrafficSignalSystem(scene);
buildRoadTrafficSystem(scene);
buildPublicTransitSystem(scene);
buildGatewayMaritime(scene);

buildRailwaySystem(scene);
buildPedestrianSimulation(scene);
buildAmbientCitizens(scene);

buildMumbaiStreetProps(scene);
buildStreetActivities(scene);
buildEnvironmentalSimulation(scene);

buildPlayerCharacter(scene);
initCyberPhone(camera);
initWorldMap(camera, characterGroup, teleportTo);

// Controls & Keyboard Listeners
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

    if (k === 'f') toggleVehicleMount(scene);
    if (k === 'g') toggleFlightMode(playSound);
    if (k === 'e') handleInteraction();
    if (k === 't') cycleTimeOfDay(scene);
    if (k === 'v') toggleCameraMode();
    if (k === 'm') toggleWorldMap();
    if (k === 'p') toggleCyberPhone();
    if (k === 'z') toggleMinimapExpanded();
    if (e.key === 'Escape') {
        if (isWorldMapOpen) closeWorldMap();
    }
    if (k === 'c') {
        if (isFlightMode) keys.c = true;
        else toggleCameraMode();
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

// UI Buttons Wiring
const btnWorldMap = document.getElementById('btn-toggle-world-map');
if (btnWorldMap) btnWorldMap.addEventListener('click', toggleWorldMap);

const radarCard = document.getElementById('gta-radar-card');
if (radarCard) radarCard.addEventListener('click', (e) => {
    // Only open map if not clicking directly on a child interactive button
    toggleWorldMap();
});

const btnFlight = document.getElementById('btn-toggle-flight');
if (btnFlight) btnFlight.addEventListener('click', () => toggleFlightMode(playSound));

const btnTime = document.getElementById('btn-toggle-time');
if (btnTime) btnTime.addEventListener('click', () => cycleTimeOfDay(scene));

const btnWeather = document.getElementById('btn-toggle-weather');
if (btnWeather) btnWeather.addEventListener('click', () => cycleWeather(playSound));

const btnAudio = document.getElementById('btn-toggle-audio');
if (btnAudio) btnAudio.addEventListener('click', toggleAudio);

const btnCam = document.getElementById('btn-toggle-camera');
if (btnCam) btnCam.addEventListener('click', toggleCameraMode);

// Precompile WebGL shader pipelines upfront to prevent runtime stutter
try {
    renderer.compile(scene, camera);
} catch (e) {}

// Dismiss loading screen
const ls = document.getElementById('loading-screen');
if (ls) {
    ls.style.opacity = '0';
    setTimeout(() => { ls.style.display = 'none'; }, 600);
}

// ==========================================
// 60 FPS MAIN SIMULATION & GAME ENGINE LOOP
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.08);
    const time = performance.now() * 0.001;

    // 1. World streaming & environment
    updateEnvironment(delta, time, camera);
    chunkManager.update(camera.position);
    updateLevelOfDetail(camera.position);

    // 2. Traversal & Player state
    if (isFlightMode) {
        updateFlightPhysics(delta, keys, camera, playSound);
        updateMiniMap(characterGroup.position.x, characterGroup.position.z, characterGroup.rotation.y);
        checkProximity();
    } else if (activeVehicle === 'train') {
        const c1 = trainState.coach1 || { position: characterGroup.position, rotation: { y: 0 } };
        if (cameraMode === 'chase' || cameraMode === 'cinematic') {
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, c1.position.x - 12, 0.08);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, c1.position.z - 8, 0.08);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, 6.5, 0.08);
            camera.lookAt(c1.position.x, 2.5, c1.position.z + 4);
        }
        updateMiniMap(c1.position.x, c1.position.z, c1.rotation.y);
        checkTrainProximity(showPrompt);
    } else if (activeVehicle) {
        updateVehiclePhysics(activeVehicle, delta, keys);
        updateTachometerHUD(activeVehicle.speed, activeVehicle.speed < -0.2);

        if (cameraMode === 'chase' || cameraMode === 'cinematic') {
            const isCar = (activeVehicle.type === 'car');
            const followDist = isCar ? 7.8 : 9.5;
            const camElevation = isCar ? 2.5 : 3.6;
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, activeVehicle.mesh.position.x - Math.sin(activeVehicle.rotation) * followDist, 0.14);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, activeVehicle.mesh.position.z - Math.cos(activeVehicle.rotation) * followDist, 0.14);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, camElevation, 0.14);
            camera.lookAt(activeVehicle.mesh.position.x + Math.sin(activeVehicle.rotation) * 8, 1.4, activeVehicle.mesh.position.z + Math.cos(activeVehicle.rotation) * 8);
        }
        updateMiniMap(activeVehicle.mesh.position.x, activeVehicle.mesh.position.z, activeVehicle.rotation);
    } else {
        updatePlayerLocomotion(delta, keys, camera, keys.shift);
        updateTachometerHUD(keys.w || keys.a || keys.s || keys.d ? (keys.shift ? 16.0 : 9.0) : 0, false);

        if (cameraMode === 'chase') {
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, characterGroup.position.x, 0.08);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, characterGroup.position.z - 14, 0.08);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, characterGroup.position.y + 7.5, 0.08);
            camera.lookAt(characterGroup.position.x, characterGroup.position.y + 2.0, characterGroup.position.z + 4);
        } else if (cameraMode === 'cinematic') {
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, characterGroup.position.x, 0.08);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, characterGroup.position.z - 34, 0.08);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, characterGroup.position.y + 4.5, 0.08);
            camera.lookAt(characterGroup.position.x, characterGroup.position.y + 60.0, characterGroup.position.z + 30);
        }
        updateMiniMap(characterGroup.position.x, characterGroup.position.z, characterGroup.rotation.y);
        checkProximity();
    }

    if (cameraMode === 'orbit') {
        orbitControls.update();
    }

    // 3. Autonomous Living World Subsystems
    updateRailwayTrains(delta, playSound);
    updateTrafficSignals(delta);
    updateRoadTraffic(delta);
    updatePublicTransit(delta);
    updatePedestrianSimulation(delta, weatherMode);
    updateMaritimeFerryBoats(delta, time);
    updateAirportSimulation(delta);
    updateStreetActivities(delta);
    updateEnvironmentalSimulation(delta);

    // 4. Render
    renderer.render(scene, camera);

    // 5. Interactive Tactical World Map Realtime Render
    if (isWorldMapOpen) {
        drawWorldMap();
    }
}
animate();

// ==========================================
// GLOBAL WINDOW HOOKS (Full Backwards Compatibility)
// ==========================================
window.__renderer = renderer;
window.__scene = scene;
window.THREE = THREE;
window.__camera = camera;
window.__characterGroup = characterGroup;
window.__toggleWorldMap = toggleWorldMap;
window.__openWorldMap = openWorldMap;
window.__closeWorldMap = closeWorldMap;
window.__isWorldMapOpen = () => isWorldMapOpen;
window.__setMapLayer = setMapLayer;
window.__getMapLayer = getMapLayer;
window.__setOverlayNetwork = setOverlayNetwork;
window.__fitMapToView = fitMapToView;
window.__toggleMinimapExpanded = toggleMinimapExpanded;
window.__allTrains = allTrains;
window.__railwayStations = railwayStations;
window.__trafficSignals = trafficSignals;
window.__trafficVehicles = trafficVehicles;
window.__publicTransit = publicTransit;
window.__allPedestrians = allPedestrians;
window.__airportPlanes = airportPlanes;
window.__streetActivities = streetActivities;
window.__ambientAgents = ambientAgents;
window.__poiSchool = poiSchool;
window.__poiCollege = poiCollege;
window.__poiHome = poiHome;
window.__poiGateway = poiGateway;
window.__poiAirport = poiAirport;
window.__poiVadaPav = poiVadaPav;
window.__worldColliders = worldColliders;
window.__isFlightMode = getIsFlightMode;
window.__getIsFlightMode = getIsFlightMode;
window.__enterFlightMode = enterFlightMode;
window.__exitFlightMode = exitFlightMode;
window.__toggleFlightMode = toggleFlightMode;
window.__flightSpeed = getFlightSpeed;
window.__flightVertSpeed = getFlightVertSpeed;
window.__flightPitch = getFlightPitch;
window.__flightRoll = getFlightRoll;
window.__flightHeading = getFlightHeading;
window.__keys = keys;
window.__updateMiniMap = updateMiniMap;
window.__setNavigationDestination = setNavigationDestination;
window.__bikeVehicle = bikeVehicle;
window.__carVehicle = carVehicle;
window.__rickshawVehicle = rickshawVehicle;
window.__maritimeFerryBoats = maritimeFerryBoats;
window.__atcRadarDish = atcRadarDish;

// Responsive Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(getOptimalPixelRatio());
});
