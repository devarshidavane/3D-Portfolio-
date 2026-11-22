import * as THREE from 'three';
import { playSound, showPrompt, hidePrompt } from './hudOverlay.js';
import { characterGroup } from '../character/playerCharacter.js';
import { isFlightMode, exitFlightMode } from '../character/ironManFlight.js';
import { bikeVehicle, carVehicle, rickshawVehicle, activeVehicle, setActiveVehicle } from '../vehicles/playerVehicles.js';
import { allTrains, trainState, railwayStations } from '../railway/railwaySystem.js';
import { poiSchool } from '../landmarks/schoolBuilding.js';
import { poiCollege } from '../landmarks/collegeBuilding.js';
import { poiHome } from '../landmarks/homeSkyscraper.js';
import { poiGateway } from '../landmarks/iconicLandmarks.js';
import { poiAirport } from '../landmarks/airportDistrict.js';

// Diegetic GTA V-Style 3D Phone Subsystem
import {
    buildDiegeticPhone,
    updateDiegeticPhone,
    openDiegeticPhone,
    closeDiegeticPhone,
    toggleDiegeticPhone,
    isPhoneOpen,
    activeApp,
    phoneGroup,
    phoneScreenMesh,
    playPhoneSound
} from './diegeticPhone.js';

export {
    buildDiegeticPhone,
    updateDiegeticPhone,
    openDiegeticPhone,
    closeDiegeticPhone,
    toggleDiegeticPhone,
    isPhoneOpen,
    activeApp,
    phoneGroup,
    phoneScreenMesh,
    playPhoneSound
};

// ==========================================
// CYBERPHONE / DIEGETIC GTA V SMARTPHONE INTEGRATION
// ==========================================

export let currentInteraction = null;
let boardableTrain = null;
let mainCameraRef = null;

export function openCyberPhone() {
    openDiegeticPhone();
}

export function closeCyberPhone() {
    closeDiegeticPhone();
}

export function toggleCyberPhone() {
    toggleDiegeticPhone();
}

export function initCyberPhone(camera, scene, renderer) {
    mainCameraRef = camera;

    // Build 3D Diegetic Phone in scene if scene & renderer are provided
    if (scene && renderer) {
        buildDiegeticPhone(scene, camera, renderer, (x, z, name, y) => {
            teleportTo(x, z, name, y, camera);
        });
    }

    const btnMobileOptions = document.getElementById('btn-mobile-options');
    if (btnMobileOptions) {
        btnMobileOptions.addEventListener('click', toggleDiegeticPhone);
    }

    // Modal Close Handlers (for backward compatibility)
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            const interactiveModalEl = document.getElementById('interactive-modal');
            if (interactiveModalEl) interactiveModalEl.classList.remove('active');
        });
    }

    const landmarkCloseBtn = document.getElementById('landmark-close-btn');
    if (landmarkCloseBtn) {
        landmarkCloseBtn.addEventListener('click', () => {
            const landmarkModal = document.getElementById('landmark-modal');
            const landmarkBackdrop = document.getElementById('landmark-modal-backdrop');
            if (landmarkModal) landmarkModal.classList.remove('active');
            if (landmarkBackdrop) landmarkBackdrop.classList.remove('active');
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const interactiveModalEl = document.getElementById('interactive-modal');
            if (interactiveModalEl) interactiveModalEl.classList.remove('active');
            const landmarkModal = document.getElementById('landmark-modal');
            const landmarkBackdrop = document.getElementById('landmark-modal-backdrop');
            if (landmarkModal) landmarkModal.classList.remove('active');
            if (landmarkBackdrop) landmarkBackdrop.classList.remove('active');
            if (isPhoneOpen) closeDiegeticPhone();
        }
    });
}

export function teleportTo(x, z, name, y = 0, camera) {
    const fade = document.getElementById('fade-overlay');
    if (fade) fade.style.opacity = '1';
    playSound('chime');

    const cam = camera || mainCameraRef;
    setTimeout(() => {
        characterGroup.position.set(x, y + 0.5, z);
        if (cam) {
            cam.position.set(x, y + 6.5, z - 14);
            cam.lookAt(x, y + 2, z + 4);
        }
        if (fade) fade.style.opacity = '0';
    }, 450);
}

export function toggleVehicleMount(scene) {
    if (isFlightMode) exitFlightMode(false);
    if (activeVehicle) {
        dismountVehicle(scene);
    } else {
        const p = characterGroup.position;
        if (bikeVehicle.mesh && p.distanceTo(bikeVehicle.mesh.position) < 4.5) {
            mountVehicle(bikeVehicle);
            return;
        }
        if (carVehicle.mesh && p.distanceTo(carVehicle.mesh.position) < 5.0) {
            mountVehicle(carVehicle);
            return;
        }
        if (rickshawVehicle.mesh && p.distanceTo(rickshawVehicle.mesh.position) < 4.8) {
            mountVehicle(rickshawVehicle);
            return;
        }

        // Check Trains
        for (let t = 0; t < allTrains.length; t++) {
            const tr = allTrains[t];
            if (tr.coach1 && p.distanceTo(tr.coach1.position) < 6.0) {
                boardableTrain = tr;
                mountTrain(tr);
                return;
            }
        }
    }
}

function mountVehicle(v) {
    setActiveVehicle(v);
    const speedoMode = document.getElementById('speedo-mode');
    const speedoCard = document.getElementById('speedo-card');
    if (speedoCard) speedoCard.style.display = 'none';

    if (v.type === 'bike') {
        if (speedoMode) speedoMode.textContent = '🏍️ CYBER BIKE';
        characterGroup.visible = true;
        characterGroup.scale.set(0.70, 0.70, 0.70);
        characterGroup.position.set(0, 0.45, -0.15);
        characterGroup.rotation.set(0, 0, 0);
        v.mesh.add(characterGroup);
    } else if (v.type === 'rickshaw') {
        if (speedoMode) speedoMode.textContent = '🛺 KAALI-PEELI AUTO';
        characterGroup.visible = true;
        characterGroup.scale.set(0.65, 0.65, 0.65);
        characterGroup.position.set(0, 0.35, 0.25);
        characterGroup.rotation.set(0, 0, 0);
        v.mesh.add(characterGroup);
    } else {
        if (speedoMode) speedoMode.textContent = '🏎️ CYBER CAR';
        characterGroup.visible = false;
        v.mesh.add(characterGroup);
    }
    playSound('engine');
}

function mountTrain(tr) {
    setActiveVehicle('train');
    const speedoCard = document.getElementById('speedo-card');
    const speedoMode = document.getElementById('speedo-mode');
    if (speedoCard) speedoCard.style.display = 'flex';
    if (speedoMode) speedoMode.textContent = `🚆 ${tr.name ? tr.name.toUpperCase() : 'MUMBAI LOCAL'}`;
    playSound('trainHorn');
}

function dismountVehicle(scene) {
    characterGroup.scale.set(1, 1, 1);
    characterGroup.visible = true;
    const speedoCard = document.getElementById('speedo-card');
    if (speedoCard) speedoCard.style.display = 'none';

    if (activeVehicle === 'train') {
        setActiveVehicle(null);
        scene.add(characterGroup);
        characterGroup.position.set(-28, 0.65, characterGroup.position.z);
    } else if (activeVehicle) {
        const v = activeVehicle;
        setActiveVehicle(null);
        scene.add(characterGroup);
        characterGroup.position.set(v.mesh.position.x - 2.5, 0, v.mesh.position.z);
    }
    playSound('chime');
}

export function handleInteraction() {
    // Open Portfolio app on Home HQ or landmark trigger
    if (!currentInteraction) return;
    playSound('chime');

    if (currentInteraction === 'schoolBoard') {
        openDiegeticPhone();
    } else if (currentInteraction === 'collegeBoard') {
        openDiegeticPhone();
    } else if (currentInteraction === 'homeHQ') {
        openDiegeticPhone();
    } else if (currentInteraction === 'gatewayArch') {
        openDiegeticPhone();
    } else if (currentInteraction === 'vadapav') {
        openDiegeticPhone();
    }
}

export function checkProximity() {
    currentInteraction = null;
    const p = characterGroup.position;

    // 1. Fr. Agnel School Check (-1350, 32.0, 520)
    if (Math.hypot(p.x - poiSchool.x, p.z - poiSchool.z) < 42) {
        currentInteraction = 'schoolBoard';
        showPrompt('E', 'Inspect Fr. Agnel School 🏫');
        return;
    }

    // 2. DMCE College Check (1850, 12.0, 1450)
    if (Math.hypot(p.x - poiCollege.x, p.z - poiCollege.z) < 45) {
        currentInteraction = 'collegeBoard';
        showPrompt('E', 'Inspect DMCE College 🎓');
        return;
    }

    // 3. Home HQ Terminal Check
    if (Math.hypot(p.x - poiHome.x, p.z - poiHome.z) < 26) {
        currentInteraction = 'homeHQ';
        showPrompt('E', 'Access Home HQ Terminal 💻');
        return;
    }

    // 4. Gateway of India Check (-350, 2.5, -2250)
    if (Math.hypot(p.x - poiGateway.x, p.z - poiGateway.z) < 45) {
        currentInteraction = 'gatewayArch';
        showPrompt('E', 'Inspect Gateway of India 🏛️');
        return;
    }

    // 5. Vada Pav Cart Check
    if (Math.hypot(p.x - 12, p.z - 242) < 5) {
        currentInteraction = 'vadapav';
        showPrompt('E', 'Order Vada Pav 🍔');
        return;
    }

    // 6. Vehicles Proximity Check
    if (bikeVehicle.mesh && p.distanceTo(bikeVehicle.mesh.position) < 4.5) {
        showPrompt('F', 'Ride Cyber Motorbike 🏍️');
        return;
    }
    if (carVehicle.mesh && p.distanceTo(carVehicle.mesh.position) < 5.0) {
        showPrompt('F', 'Drive Cyber Sports Car 🏎️');
        return;
    }
    if (rickshawVehicle.mesh && p.distanceTo(rickshawVehicle.mesh.position) < 4.8) {
        showPrompt('F', 'Drive Kaali-Peeli Auto 🛺');
        return;
    }

    hidePrompt();
}
