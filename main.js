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

import { buildPlayerVehicles, updateVehiclePhysics, bikeVehicle, carVehicle, rickshawVehicle, activeVehicle, setActiveVehicle, getActiveVehicle } from './src/vehicles/playerVehicles.js';
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
import { playSound, toggleAudio, updateTachometerHUD, showPrompt, hidePrompt, initPerformanceHUD, recordFrame } from './src/ui/hudOverlay.js';
import { initCyberPhone, toggleCyberPhone, toggleVehicleMount, handleInteraction, checkProximity, currentInteraction, teleportTo, updateDiegeticPhone, isPhoneOpen, closeCyberPhone, openCyberPhone, phoneGroup, phoneScreenMesh } from './src/ui/cyberPhone.js';
import { initWorldMap, toggleWorldMap, openWorldMap, closeWorldMap, isWorldMapOpen, drawWorldMap, setMapLayer, getMapLayer, setOverlayNetwork, fitMapToView } from './src/ui/worldMapInteractive.js';
import { initMobileControls, updateMobileControls, setMobileControlMode, controlStates, applyCameraLook, getCameraLookDelta } from './src/ui/mobileController.js';
import { initMobileSettings, getMobileSettings, openMobileSettings, closeMobileSettings, setMobileSetting, getMobileSetting } from './src/ui/mobileSettings.js';
import { initMobilePerformance, updateMobilePerformance, isTabSleep, isTouchDevice, applyQualityTier, getQualityTier, setQualityTier } from './src/ui/mobilePerformance.js';

// ==========================================
// RENDERER, SCENE & CAMERA SETUP
// ==========================================
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1427);
scene.fog = new THREE.FogExp2(0x0c1427, 0.0016);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1400);
camera.position.set(0, 7.5, -42);

const isMobileDevice = (typeof navigator !== 'undefined' && ((navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0) || /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)));
const getOptimalPixelRatio = () => isMobileDevice ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 1.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(getOptimalPixelRatio());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// Initialize Real-time Performance HUD (FPS, Calls, Tris)
initPerformanceHUD(renderer);

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
initCyberPhone(camera, scene, renderer);
initWorldMap(camera, characterGroup, teleportTo, chunkManager, setCameraOverride);

// Controls & Keyboard Listeners
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false, c: false, ctrl: false };

// ==========================================
// MOBILE SUBSYSTEMS INITIALIZATION
// Controls, Settings & Performance Benchmark
// ==========================================
initMobileSettings();
initMobilePerformance({ renderer, scene, camera });
initMobileControls({
    canvas,
    camera,
    characterGroup,
    keys,
    forceTouch: isMobileDevice,
    onInteraction: handleInteraction,
    onVehicleMount: () => toggleVehicleMount(scene),
    onFlightToggle: () => toggleFlightMode(playSound),
    getActiveVehicle,
    getIsFlightMode,
    playSound
});

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!isPhoneOpen || activeVehicle) {
        if (k === 'w' || (k === 'arrowup' && !isPhoneOpen)) keys.w = true;
        if (k === 's' || (k === 'arrowdown' && !isPhoneOpen)) keys.s = true;
        if (k === 'a' || (k === 'arrowleft' && !isPhoneOpen)) keys.a = true;
        if (k === 'd' || (k === 'arrowright' && !isPhoneOpen)) keys.d = true;
    }
    if (k === ' ' || e.key === 'Spacebar') { if (!isPhoneOpen) { keys.space = true; e.preventDefault(); } }
    if (e.key === 'Shift') keys.shift = true;
    if (e.key === 'Control') keys.ctrl = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();

    if (e.key === 'ArrowUp' && !isPhoneOpen && !keys.w && !activeVehicle) {
        openCyberPhone();
    }
    if (k === 'f') toggleVehicleMount(scene);
    if (k === 'g') toggleFlightMode(playSound);
    if (k === 'e') handleInteraction();
    if (k === 't') cycleTimeOfDay(scene);
    if (k === 'v') toggleCameraMode();
    if (k === 'm') toggleWorldMap();
    if (k === 'p') toggleCyberPhone();
    if (k === 'z') toggleMinimapExpanded();
    if (k === 'h') {
        const controlsCard = document.getElementById('controls-card');
        if (controlsCard) controlsCard.classList.toggle('open');
    }
    if (e.key === 'Escape') {
        if (isPhoneOpen) closeCyberPhone();
        else if (isWorldMapOpen) closeWorldMap();
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

const controlsToggleBtn = document.getElementById('controls-toggle-btn');
if (controlsToggleBtn) {
    controlsToggleBtn.addEventListener('click', () => {
        const controlsCard = document.getElementById('controls-card');
        if (controlsCard) controlsCard.classList.toggle('open');
    });
}

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
const _scratchCamLookAt = new THREE.Vector3();
const _fallbackTrainCoach = { position: new THREE.Vector3(), rotation: { y: 0 } };

let cameraOverrideActive = false;
export function setCameraOverride(active) {
    cameraOverrideActive = !!active;
}

let currentControlMode = 'foot';

function animate() {
    requestAnimationFrame(animate);

    // Tab sleep: pause Three.js requestAnimationFrame rendering when document.hidden === true
    if (document.hidden) {
        return;
    }

    recordFrame();
    const delta = Math.min(clock.getDelta(), 0.08);
    const time = performance.now() * 0.001;

    // Mobile systems update (touch controls, camera inertia & dynamic resolution scaling)
    updateMobileControls(delta);
    updateMobilePerformance(delta);

    // If external cinematic camera controller (e.g. GSAP fast travel) owns camera
    if (cameraOverrideActive) {
        updateEnvironment(delta, time, camera);
        chunkManager.update(camera.position);
        updateLevelOfDetail(camera.position);
        renderer.render(scene, camera);
        return;
    }

    // 1. World streaming & environment
    updateEnvironment(delta, time, camera);
    chunkManager.update(camera.position);
    updateLevelOfDetail(camera.position);

    // 2. Traversal & Player state
    const curVehicle = getActiveVehicle();

    // Auto-swap mobile control layouts between on-foot, vehicle, and flight
    let desiredControlMode = isFlightMode ? 'flight' : (curVehicle ? 'vehicle' : (controlStates.mode === 'flight' ? 'flight' : 'foot'));
    if (currentControlMode !== desiredControlMode) {
        currentControlMode = desiredControlMode;
        setMobileControlMode(currentControlMode);
    }
    if (isFlightMode) {
        updateFlightPhysics(delta, keys, camera, playSound);
        updateTachometerHUD(0, false, false);
        updateMiniMap(characterGroup.position.x, characterGroup.position.z, characterGroup.rotation.y);
        checkProximity();
    } else if (curVehicle === 'train') {
        let c1 = trainState.coach1;
        if (!c1) {
            _fallbackTrainCoach.position.copy(characterGroup.position);
            c1 = _fallbackTrainCoach;
        }
        if (cameraMode === 'chase' || cameraMode === 'cinematic') {
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, c1.position.x - 12, 0.08);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, c1.position.z - 8, 0.08);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, 6.5, 0.08);
            _scratchCamLookAt.set(c1.position.x, 2.5, c1.position.z + 4);
            camera.lookAt(_scratchCamLookAt);
        }
        updateTachometerHUD(0, false, false);
        updateMiniMap(c1.position.x, c1.position.z, c1.rotation.y);
        checkTrainProximity(showPrompt);
    } else if (curVehicle) {
        updateVehiclePhysics(curVehicle, delta, keys);
        updateTachometerHUD(curVehicle.speed, curVehicle.speed < -0.2, true);

        if (cameraMode === 'chase' || cameraMode === 'cinematic') {
            const isCar = (curVehicle.type === 'car');
            const followDist = isCar ? 7.8 : 9.5;
            const camElevation = isCar ? 2.5 : 3.6;
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, curVehicle.mesh.position.x - Math.sin(curVehicle.rotation) * followDist, 0.14);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, curVehicle.mesh.position.z - Math.cos(curVehicle.rotation) * followDist, 0.14);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, camElevation, 0.14);
            _scratchCamLookAt.set(curVehicle.mesh.position.x + Math.sin(curVehicle.rotation) * 8, 1.4, curVehicle.mesh.position.z + Math.cos(curVehicle.rotation) * 8);
            camera.lookAt(_scratchCamLookAt);
        }
        updateMiniMap(curVehicle.mesh.position.x, curVehicle.mesh.position.z, curVehicle.rotation);
    } else {
        if (!isPhoneOpen) {
            updatePlayerLocomotion(delta, keys, camera, keys.shift);
        }
        updateTachometerHUD(0, false, false);

        if (!isPhoneOpen) {
            if (cameraMode === 'chase') {
                const followDist = 14.0;
                const camHeight = 7.5;
                const lookAhead = 4.0;

                const lookDelta = getCameraLookDelta();
                if (lookDelta && (lookDelta.orbitYaw !== 0 || lookDelta.orbitPitch !== 0)) {
                    applyCameraLook(camera, characterGroup.position, followDist, camHeight);
                } else {
                    camera.position.x = THREE.MathUtils.lerp(camera.position.x, characterGroup.position.x, 0.12);
                    camera.position.z = THREE.MathUtils.lerp(camera.position.z, characterGroup.position.z - followDist, 0.12);
                    camera.position.y = THREE.MathUtils.lerp(camera.position.y, characterGroup.position.y + camHeight, 0.12);
                    _scratchCamLookAt.set(characterGroup.position.x, characterGroup.position.y + 2.0, characterGroup.position.z + lookAhead);
                    camera.lookAt(_scratchCamLookAt);
                }
            } else if (cameraMode === 'cinematic') {
                camera.position.x = THREE.MathUtils.lerp(camera.position.x, characterGroup.position.x, 0.08);
                camera.position.z = THREE.MathUtils.lerp(camera.position.z, characterGroup.position.z - 34, 0.08);
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, characterGroup.position.y + 4.5, 0.08);
                _scratchCamLookAt.set(characterGroup.position.x, characterGroup.position.y + 60.0, characterGroup.position.z + 30);
                camera.lookAt(_scratchCamLookAt);
            }
        }
        updateMiniMap(characterGroup.position.x, characterGroup.position.z, characterGroup.rotation.y);
        checkProximity();
    }

    if (cameraMode === 'orbit') {
        orbitControls.update();
    }

    // Update Diegetic 3D CyberPhone (Animation & Screen Render)
    updateDiegeticPhone(delta, camera, curVehicle !== null);

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
window.__toggleCyberPhone = toggleCyberPhone;
window.__openCyberPhone = openCyberPhone;
window.__closeCyberPhone = closeCyberPhone;
window.__isPhoneOpen = () => isPhoneOpen;
window.__phoneGroup = phoneGroup;
window.__phoneScreenMesh = phoneScreenMesh;
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
window.__getSurfaceElevationAt = getSurfaceElevationAt;
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
window.setMobileControlMode = setMobileControlMode;
window.__setMobileControlMode = setMobileControlMode;
window.openMobileSettings = openMobileSettings;
window.closeMobileSettings = closeMobileSettings;
window.setMobileSetting = setMobileSetting;
window.getMobileSetting = getMobileSetting;
window.__setActiveVehicle = setActiveVehicle;
window.__getActiveVehicle = getActiveVehicle;
window.__mobileController = {
    setMobileControlMode,
    updateMobileControls,
    controlStates
};
window.__mobileSettings = {
    get: getMobileSettings
};
window.__mobilePerformance = {
    isTouchDevice,
    isTabSleep,
    getQualityTier,
    setQualityTier,
    applyQualityTier,
    updateMobilePerformance
};
window.updateTachometerHUD = updateTachometerHUD;
window.__updateTachometerHUD = updateTachometerHUD;
window.initPerformanceHUD = initPerformanceHUD;
window.__initPerformanceHUD = initPerformanceHUD;
window.recordFrame = recordFrame;
window.__recordFrame = recordFrame;

// Responsive Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(getOptimalPixelRatio());
});
