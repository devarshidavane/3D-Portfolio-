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

// ==========================================
// CYBER-SMARTPHONE DRAWER, FAST TRAVEL & MODALS
// ==========================================

export let currentInteraction = null;
let boardableTrain = null;

export function openCyberPhone() {
    const phoneOverlay = document.getElementById('cyber-phone-overlay');
    if (phoneOverlay) phoneOverlay.classList.add('open');
    const phoneClock = document.getElementById('phone-clock');
    if (phoneClock) {
        const d = new Date();
        phoneClock.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    playSound('chime');
}

export function closeCyberPhone() {
    const phoneOverlay = document.getElementById('cyber-phone-overlay');
    if (phoneOverlay) phoneOverlay.classList.remove('open');
}

export function toggleCyberPhone() {
    const phoneOverlay = document.getElementById('cyber-phone-overlay');
    if (phoneOverlay && phoneOverlay.classList.contains('open')) {
        closeCyberPhone();
    } else {
        openCyberPhone();
    }
}

export function initCyberPhone(camera) {
    const btnMobileOptions = document.getElementById('btn-mobile-options');
    const btnPhoneClose = document.getElementById('btn-phone-close');
    const phoneTabs = document.querySelectorAll('.phone-tab-btn');
    const phoneTabContents = document.querySelectorAll('.phone-tab-content');

    if (btnMobileOptions) btnMobileOptions.addEventListener('click', toggleCyberPhone);
    if (btnPhoneClose) btnPhoneClose.addEventListener('click', closeCyberPhone);

    phoneTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            phoneTabs.forEach(b => b.classList.remove('active'));
            phoneTabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
            playSound('chime');
        });
    });

    // Fast travel cards
    document.querySelectorAll('.transit-card').forEach(card => {
        card.addEventListener('click', () => {
            const x = parseFloat(card.getAttribute('data-x'));
            const z = parseFloat(card.getAttribute('data-z'));
            const y = parseFloat(card.getAttribute('data-y') || 0);
            const name = card.getAttribute('data-name');
            closeCyberPhone();
            teleportTo(x, z, name, y, camera);
        });
    });

    // Stark elevator buttons
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const fIdx = parseInt(btn.getAttribute('data-floor'), 10);
            teleportToFloor(fIdx, camera);
        });
    });
}

export function teleportTo(x, z, name, y = 0, camera) {
    const fade = document.getElementById('fade-overlay');
    if (fade) fade.style.opacity = '1';
    playSound('chime');

    setTimeout(() => {
        characterGroup.position.set(x, y + 0.5, z);
        if (camera) {
            camera.position.set(x, y + 6.5, z - 14);
            camera.lookAt(x, y + 2, z + 4);
        }
        if (fade) fade.style.opacity = '0';
    }, 450);
}

export function teleportToFloor(floorIdx, camera) {
    const altitudes = [0, 40, 80, 120];
    const alt = altitudes[floorIdx] || 0;
    const fade = document.getElementById('fade-overlay');
    if (fade) fade.style.opacity = '1';
    playSound('chime');

    setTimeout(() => {
        characterGroup.position.set(poiHome.x, alt + 0.5, poiHome.z + 4);
        characterGroup.rotation.set(0, Math.PI, 0);
        if (camera) {
            camera.position.set(poiHome.x, alt + 6.5, poiHome.z - 10);
            camera.lookAt(poiHome.x, alt + 2, poiHome.z + 4);
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
    const modalTitleEl = document.getElementById('modal-title');
    const modalBodyEl = document.getElementById('modal-body');
    const modalCodePreviewEl = document.getElementById('modal-code-preview');
    const interactiveModalEl = document.getElementById('interactive-modal');

    if (!currentInteraction) return;
    playSound('chime');

    if (currentInteraction === 'schoolBoard') {
        if (modalTitleEl) modalTitleEl.innerHTML = "🏫 Fr. Agnel Technical High School & Junior College";
        if (modalBodyEl) modalBodyEl.innerHTML = `
            <strong>Academic Foundation & Technical Education:</strong><br><br>
            • <strong>Campus:</strong> Bandra West, Mount Mary Bandstand Ridge (Mumbai)<br>
            • <strong>Stream:</strong> Science, Mathematics & Technical Vocational Stream (Engineering Drawing, Fitting, Workshop Technology & Electronics)<br>
            • <strong>Credentials:</strong> SSC with Distinction<br>
            • <strong>Legacy:</strong> Early foundations in technical computing, electronics, and rigorous engineering discipline.
        `;
        if (modalCodePreviewEl) modalCodePreviewEl.style.display = 'none';
        if (interactiveModalEl) interactiveModalEl.classList.add('active');
    } else if (currentInteraction === 'collegeBoard') {
        if (modalTitleEl) modalTitleEl.innerHTML = "🎓 Datta Meghe College of Engineering (DMCE)";
        if (modalBodyEl) modalBodyEl.innerHTML = `
            <strong>Higher Education & Engineering Degree:</strong><br><br>
            • <strong>Degree:</strong> Bachelor of Engineering (B.E.) in Computer Engineering (2019 – 2023)<br>
            • <strong>Campus:</strong> Airoli, Navi Mumbai (Near Airoli Creek & Mindspace)<br>
            • <strong>Core Focus:</strong> Distributed Operating Systems, Network Security & Cryptography, Analysis of Algorithms, Artificial Intelligence & WebGL Graphics.<br>
            • <strong>Leadership:</strong> Cybersecurity Core Team Lead, Tech Fest Hackathon Finalist, Open-Source WebGL Developer.
        `;
        if (modalCodePreviewEl) modalCodePreviewEl.style.display = 'none';
        if (interactiveModalEl) interactiveModalEl.classList.add('active');
    } else if (currentInteraction === 'homeHQ') {
        if (modalTitleEl) modalTitleEl.innerHTML = "💻 Devarshi Davane — Home HQ & Research Lab";
        if (modalBodyEl) modalBodyEl.innerHTML = `
            <strong>Dharavi Koliwada (Mahim East) Cyber Command Skyscraper</strong><br><br>
            • <strong>Level 1:</strong> Grand Public Atrium & Portfolio Terminal<br>
            • <strong>Level 2:</strong> Executive Cyber Penthouse Suite<br>
            • <strong>Level 3:</strong> Security Penetration Research Lab & Battlestation<br>
            • <strong>Level 4:</strong> 120m Rooftop Helipad & Iron Man Flight Deck
        `;
        if (modalCodePreviewEl) {
            modalCodePreviewEl.style.display = 'block';
            modalCodePreviewEl.innerHTML = `
const developer = {
    name: "Devarshi Davane",
    role: "Computer Engineer & Full-Stack 3D / Systems Developer",
    school: "Fr. Agnel Technical High School (Bandra West)",
    college: "Datta Meghe College of Engineering (Airoli)",
    homeHQ: "Dharavi Koliwada (Mahim East)",
    stack: ["Three.js", "WebGL", "TypeScript", "Python", "Docker", "Linux Kernel"]
};
            `;
        }
        if (interactiveModalEl) interactiveModalEl.classList.add('active');
    } else if (currentInteraction === 'vadapav') {
        if (modalTitleEl) modalTitleEl.innerHTML = "🍔 Dev's Mumbai Vada Pav Cart";
        if (modalBodyEl) modalBodyEl.innerHTML = `
            <strong>The fuel behind every late-night coding session!</strong><br><br>
            Fresh Mumbai batata vada golden-fried with mustard seeds and curry leaves, tucked into warm pav with fiery dry garlic chutney.
        `;
        if (modalCodePreviewEl) modalCodePreviewEl.style.display = 'none';
        if (interactiveModalEl) interactiveModalEl.classList.add('active');
    }
}

export function checkProximity() {
    currentInteraction = null;
    const p = characterGroup.position;

    // 1. Fr. Agnel School Check (-1350, 32.0, 520)
    if (Math.hypot(p.x - poiSchool.x, p.z - poiSchool.z) < 25) {
        currentInteraction = 'schoolBoard';
        showPrompt('E', 'Inspect Fr. Agnel School 🏫');
        return;
    }

    // 2. DMCE College Check (1850, 12.0, 1450)
    if (Math.hypot(p.x - poiCollege.x, p.z - poiCollege.z) < 25) {
        currentInteraction = 'collegeBoard';
        showPrompt('E', 'Inspect DMCE College 🎓');
        return;
    }

    // 3. Home HQ Check (0, 8.0, 0)
    if (Math.hypot(p.x - poiHome.x, p.z - poiHome.z) < 24) {
        currentInteraction = 'homeHQ';
        showPrompt('E', 'Access Home HQ Terminal 💻');
        return;
    }

    // 4. Vada Pav Cart Check
    if (Math.hypot(p.x - 12, p.z - 242) < 5) {
        currentInteraction = 'vadapav';
        showPrompt('E', 'Order Vada Pav 🍔');
        return;
    }

    // 5. Vehicles Proximity Check
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
