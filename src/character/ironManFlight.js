import * as THREE from 'three';
import { characterGroup, devChar, ironManSuit, repulsorLight, jetParticles, shockRing } from './playerCharacter.js';
import { resolveCollision, getSurfaceElevationAt } from '../world/worldColliders.js';

// ==========================================
// 6-DOF IRON MAN SUPERHERO FLIGHT ENGINE
// Supersonic Mach Speed, Aerodynamic Pitch/Roll/Yaw & Repulsor Thrust
// ==========================================

export let isFlightMode = false;
export let flightSpeed = 0;
export let flightVertSpeed = 0;
export let flightPitch = 0;
export let flightRoll = 0;
export let flightHeading = 0;
export let flightBobTimer = 0;

export function getIsFlightMode() { return isFlightMode; }
export function getFlightSpeed() { return flightSpeed; }
export function getFlightVertSpeed() { return flightVertSpeed; }
export function getFlightPitch() { return flightPitch; }
export function getFlightRoll() { return flightRoll; }
export function getFlightHeading() { return flightHeading; }

export function enterFlightMode(playSoundFn) {
    if (isFlightMode) return;
    isFlightMode = true;

    if (devChar) devChar.group.visible = false;
    if (ironManSuit) ironManSuit.visible = true;

    flightHeading = characterGroup.rotation.y;
    flightPitch = 0;
    flightRoll = 0;
    flightSpeed = 16.0;
    flightVertSpeed = 8.0;

    const btnFlight = document.getElementById('btn-toggle-flight');
    if (btnFlight) btnFlight.classList.add('active');

    const flightHud = document.getElementById('flight-hud');
    if (flightHud) flightHud.classList.add('visible');

    if (playSoundFn) playSoundFn('repulsor');
}

export function exitFlightMode(superheroLanding = true, playSoundFn) {
    if (!isFlightMode) return;
    isFlightMode = false;

    if (devChar) devChar.group.visible = true;
    if (ironManSuit) ironManSuit.visible = false;

    characterGroup.rotation.x = 0;
    characterGroup.rotation.z = 0;

    const btnFlight = document.getElementById('btn-toggle-flight');
    if (btnFlight) btnFlight.classList.remove('active');

    const flightHud = document.getElementById('flight-hud');
    if (flightHud) flightHud.classList.remove('visible');

    if (repulsorLight) repulsorLight.intensity = 0.2;
    jetParticles.forEach(p => p.mesh.visible = false);

    if (superheroLanding && shockRing) {
        shockRing.position.set(characterGroup.position.x, characterGroup.position.y + 0.05, characterGroup.position.z);
        shockRing.scale.set(1, 1, 1);
        shockRing.material.opacity = 0.9;
        if (playSoundFn) playSoundFn('landing');
    }
}

export function toggleFlightMode(playSoundFn) {
    if (isFlightMode) exitFlightMode(true, playSoundFn);
    else enterFlightMode(playSoundFn);
}

export function updateFlightPhysics(delta, keys, camera, playSoundFn) {
    const isBoosting = keys.shift;

    // 1. Yaw & Steering Control (A turns Left, D turns Right)
    const turnRate = (isBoosting ? 1.6 : 2.4);
    if (keys.a) flightHeading -= turnRate * delta;
    if (keys.d) flightHeading += turnRate * delta;

    // 2. Roll Banking
    let targetRoll = 0;
    if (keys.a) targetRoll = isBoosting ? -0.65 : -0.45;
    if (keys.d) targetRoll = isBoosting ? 0.65 : 0.45;
    flightRoll = THREE.MathUtils.lerp(flightRoll, targetRoll, 0.12);

    // 3. Thrust & Forward Speed
    let targetForward = 0;
    if (keys.w) targetForward = isBoosting ? 68.0 : 34.0;
    else if (keys.s) targetForward = -12.0;

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

    // 7. World Clamps & Altitude Bounds (5km x 5km core world airspace)
    characterGroup.position.x = THREE.MathUtils.clamp(characterGroup.position.x, -2480, 2480);
    characterGroup.position.z = THREE.MathUtils.clamp(characterGroup.position.z, -2480, 2480);
    characterGroup.position.y = THREE.MathUtils.clamp(characterGroup.position.y, 0.2, 550);

    resolveCollision(characterGroup.position, 1.0);

    // 8. Rotation transforms
    characterGroup.rotation.y = flightHeading;
    characterGroup.rotation.x = flightPitch;
    characterGroup.rotation.z = flightRoll;

    // 9. Repulsor Flame Particles & Lighting
    if (repulsorLight) {
        repulsorLight.intensity = isBoosting ? 14.0 : 6.0;
        repulsorLight.color.setHex(isBoosting ? 0x60a5fa : 0x00f2fe);
    }
    const trailLen = isBoosting ? 2.2 : 1.1;
    jetParticles.forEach((p) => {
        p.mesh.visible = true;
        const px = p.offset + (Math.random() - 0.5) * 0.12;
        const py = -0.2 - Math.random() * (isBoosting ? 1.8 : 0.85);
        const pz = (Math.random() - 0.5) * 0.15 - Math.random() * trailLen;
        p.mesh.position.set(px, py, pz);
    });

    // 10. Landing Detection
    const surfaceY = getSurfaceElevationAt(characterGroup.position.x, characterGroup.position.z, characterGroup.position.y);
    if (characterGroup.position.y <= surfaceY + 0.35 && (flightVertSpeed < -1.5 || keys.c)) {
        exitFlightMode(true, playSoundFn);
    }

    // 11. Follow Camera
    const followDist = isBoosting ? 22.0 : 16.0;
    const camTargetX = characterGroup.position.x - fwdX * followDist;
    const camTargetZ = characterGroup.position.z - fwdZ * followDist;
    const camTargetY = characterGroup.position.y + 4.5;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, camTargetX, 0.12);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, camTargetZ, 0.12);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, camTargetY, 0.12);
    camera.lookAt(characterGroup.position.x + fwdX * 16, characterGroup.position.y, characterGroup.position.z + fwdZ * 16);
    camera.rotation.z += flightRoll * 0.18;
    camera.fov = THREE.MathUtils.lerp(camera.fov, isBoosting ? 66 : 52, 0.08);
    camera.updateProjectionMatrix();

    // 12. Flight HUD Telemetry Update
    const flightSpdVal = document.getElementById('hud-speed-val');
    const flightMachVal = document.getElementById('hud-mach-val');
    const flightAltVal = document.getElementById('hud-alt-val');
    const flightAglVal = document.getElementById('hud-agl-val');
    const flightClimbVal = document.getElementById('hud-climb-val');
    const flightHeadingVal = document.getElementById('hud-heading-val');
    const flightBoostBar = document.getElementById('hud-boost-bar');

    if (flightSpdVal) {
        const speedKmh = Math.round(Math.abs(flightSpeed) * 3.6);
        flightSpdVal.textContent = speedKmh;
        if (flightMachVal) flightMachVal.textContent = "MACH " + (speedKmh / 1235).toFixed(2);
        if (flightAltVal) flightAltVal.textContent = characterGroup.position.y.toFixed(1);
        if (flightAglVal) flightAglVal.textContent = "AGL: " + Math.max(0, characterGroup.position.y - surfaceY).toFixed(1) + " M";
        if (flightClimbVal) flightClimbVal.textContent = "V/S: " + (flightVertSpeed > 0 ? "+" : "") + flightVertSpeed.toFixed(1) + " M/S";

        const deg = Math.round(((flightHeading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * (180 / Math.PI));
        const cardinal = deg < 22 ? 'N' : deg < 67 ? 'NE' : deg < 112 ? 'E' : deg < 157 ? 'SE' : deg < 202 ? 'S' : deg < 247 ? 'SW' : deg < 292 ? 'W' : deg < 337 ? 'NW' : 'N';
        if (flightHeadingVal) flightHeadingVal.textContent = "HDG: " + String(deg).padStart(3, '0') + "° " + cardinal;
        if (flightBoostBar) flightBoostBar.style.width = isBoosting ? '100%' : (keys.w ? '60%' : '20%');
    }
}
