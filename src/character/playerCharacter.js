import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { applyVertexColor } from '../world/textures.js';
import { resolveCollision, getSurfaceElevationAt, currentFloorElevation } from '../world/worldColliders.js';

// ==========================================
// PLAYER CHARACTER & ARTICULATED DEVELOPER
// Devarshi Davane Stylized 3D Rig with Locomotion State Machine
// ==========================================

export const characterGroup = new THREE.Group();
characterGroup.name = "PlayerCharacter";

export let devChar = null;
export let ironManSuit = null;
export let repulsorLight = null;
export const jetParticles = [];
export let shockRing = null;

let walkCycle = 0;
let idleTimer = 0;

export function buildPlayerCharacter(scene) {
    // 1. Iron Man Armor Suit Mesh (Visible during flight & superhero maneuvers)
    ironManSuit = new THREE.Group();
    ironManSuit.name = "IronManSuit";

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

    // Faceplate & Shoulder Pads (Gold Armor)
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

    // Glowing Arc Reactor & Eyes
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

    // 2. Repulsor Flame Particles
    const jetMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), jetMat);
        p.visible = false;
        characterGroup.add(p);
        jetParticles.push({ mesh: p, offset: (i % 2 === 0 ? 0.26 : -0.26) });
    }

    repulsorLight = new THREE.PointLight(0x00f2fe, 5.0, 14);
    repulsorLight.position.set(0, 0.2, 0);
    characterGroup.add(repulsorLight);

    // 3. Ground Shockwave Ring
    const shockRingGeom = new THREE.RingGeometry(0.1, 0.6, 32);
    const shockRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    shockRing = new THREE.Mesh(shockRingGeom, shockRingMat);
    shockRing.rotation.x = -Math.PI / 2;
    shockRing.position.y = 0.05;
    scene.add(shockRing);

    // 4. Articulated Developer Mesh (Casual Devarshi avatar)
    devChar = createArticulatedDeveloper();
    characterGroup.add(devChar.group);
    devChar.group.visible = true;
    ironManSuit.visible = false;

    // Spawn at Home HQ Plaza (outside canopy facing plaza)
    characterGroup.position.set(0, 0.1, -28);
    scene.add(characterGroup);
}

function createArticulatedDeveloper() {
    const group = new THREE.Group();
    group.name = "ArticulatedDeveloper";

    // Palette locked to refs/characters/player_character_sheet.jpg
    const skinColor = 0xc68652;          // Warm Indian skin tone
    const flannelPrimary = 0x7f1d1d;     // Maroon flannel overshirt
    const flannelPlaidDark = 0x450a0a;   // Deep maroon check stripes
    const flannelPlaidLight = 0x991b1b;  // Crimson check stripes
    const innerTeeColor = 0x18181b;      // Black crewneck tee
    const chainSilver = 0xe2e8f0;        // Metallic silver chain necklace
    const pantsKhaki = 0xa38c6b;         // Khaki chinos
    const sneakersNavy = 0x1e3a8a;       // Navy blue sneakers
    const sneakersSole = 0xf8fafc;       // Crisp white sole base
    const sneakersAccent = 0xffffff;     // White side slash
    const watchCasing = 0x0f172a;        // Smartwatch casing
    const watchFace = 0x38bdf8;          // Cyan smartwatch glass
    const wristband = 0x18181b;          // Black woven wristband
    const hairColor = 0x171717;          // Styled fade hair, mustache, beard

    const devMat = new THREE.MeshStandardMaterial({ roughness: 0.65, vertexColors: true });

    // 1. Torso, Flannel Overshirt, Inner Tee, Silver Chain, Neck, Head & Face Hair
    const bodyGeoms = [];

    // Inner Black Crewneck Tee
    const innerTee = applyVertexColor(new THREE.BoxGeometry(0.26, 0.46, 0.22), innerTeeColor);
    innerTee.translate(0, 1.28, 0.03);
    bodyGeoms.push(innerTee);

    // Maroon Flannel Overshirt - Back & Side Panels
    const flannelBack = applyVertexColor(new THREE.BoxGeometry(0.48, 0.65, 0.12), flannelPrimary);
    flannelBack.translate(0, 1.25, -0.07);
    bodyGeoms.push(flannelBack);

    const flannelLeft = applyVertexColor(new THREE.BoxGeometry(0.13, 0.65, 0.16), flannelPrimary);
    flannelLeft.translate(-0.18, 1.25, 0.05);
    bodyGeoms.push(flannelLeft);

    const flannelRight = applyVertexColor(new THREE.BoxGeometry(0.13, 0.65, 0.16), flannelPrimary);
    flannelRight.translate(0.18, 1.25, 0.05);
    bodyGeoms.push(flannelRight);

    // Flannel Plaid Accent Lines (Horizontal and Vertical check stripes)
    const plaidH1 = applyVertexColor(new THREE.BoxGeometry(0.49, 0.04, 0.27), flannelPlaidDark);
    plaidH1.translate(0, 1.36, 0);
    bodyGeoms.push(plaidH1);

    const plaidH2 = applyVertexColor(new THREE.BoxGeometry(0.49, 0.04, 0.27), flannelPlaidLight);
    plaidH2.translate(0, 1.12, 0);
    bodyGeoms.push(plaidH2);

    const plaidV1 = applyVertexColor(new THREE.BoxGeometry(0.04, 0.654, 0.27), flannelPlaidDark);
    plaidV1.translate(-0.13, 1.25, 0);
    bodyGeoms.push(plaidV1);

    const plaidV2 = applyVertexColor(new THREE.BoxGeometry(0.04, 0.654, 0.27), flannelPlaidDark);
    plaidV2.translate(0.13, 1.25, 0);
    bodyGeoms.push(plaidV2);

    // Open Flannel V-Collar Lapels
    const lapelL = applyVertexColor(new THREE.BoxGeometry(0.08, 0.14, 0.05), flannelPlaidDark);
    lapelL.rotateZ(0.25);
    lapelL.translate(-0.09, 1.54, 0.10);
    bodyGeoms.push(lapelL);

    const lapelR = applyVertexColor(new THREE.BoxGeometry(0.08, 0.14, 0.05), flannelPlaidDark);
    lapelR.rotateZ(-0.25);
    lapelR.translate(0.09, 1.54, 0.10);
    bodyGeoms.push(lapelR);

    // Flannel Bottom Tail Hem
    const flannelHem = applyVertexColor(new THREE.BoxGeometry(0.49, 0.06, 0.27), flannelPrimary);
    flannelHem.translate(0, 0.94, 0);
    bodyGeoms.push(flannelHem);

    // Silver Chain Necklace & Pendant
    const chain = applyVertexColor(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), chainSilver);
    chain.rotateZ(Math.PI / 2);
    chain.translate(0, 1.48, 0.12);
    bodyGeoms.push(chain);

    const pendant = applyVertexColor(new THREE.BoxGeometry(0.025, 0.035, 0.015), chainSilver);
    pendant.translate(0, 1.42, 0.125);
    bodyGeoms.push(pendant);

    // Neck
    const neck = applyVertexColor(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 10), skinColor);
    neck.translate(0, 1.62, 0);
    bodyGeoms.push(neck);

    // Head, Nose, Mustache, Beard, Hair Fade
    const head = applyVertexColor(new THREE.SphereGeometry(0.18, 14, 14), skinColor);
    head.translate(0, 1.76, 0);
    bodyGeoms.push(head);

    const nose = applyVertexColor(new THREE.BoxGeometry(0.035, 0.06, 0.04), skinColor);
    nose.translate(0, 1.74, 0.18);
    bodyGeoms.push(nose);

    const mustache = applyVertexColor(new THREE.BoxGeometry(0.10, 0.025, 0.03), hairColor);
    mustache.translate(0, 1.68, 0.178);
    bodyGeoms.push(mustache);

    const beardJaw = applyVertexColor(new THREE.BoxGeometry(0.24, 0.07, 0.22), hairColor);
    beardJaw.translate(0, 1.65, 0.04);
    bodyGeoms.push(beardJaw);

    const beardChin = applyVertexColor(new THREE.BoxGeometry(0.07, 0.04, 0.05), hairColor);
    beardChin.translate(0, 1.63, 0.17);
    bodyGeoms.push(beardChin);

    // Styled Pompadour & Side Fade
    const hairTop = applyVertexColor(new THREE.SphereGeometry(0.195, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), hairColor);
    hairTop.rotateX(-0.15);
    hairTop.translate(0, 1.81, 0.02);
    bodyGeoms.push(hairTop);

    const hairQuiff = applyVertexColor(new THREE.BoxGeometry(0.19, 0.08, 0.12), hairColor);
    hairQuiff.translate(0, 1.89, 0.07);
    bodyGeoms.push(hairQuiff);

    const hairFade = applyVertexColor(new THREE.BoxGeometry(0.38, 0.14, 0.26), hairColor);
    hairFade.translate(0, 1.76, -0.02);
    bodyGeoms.push(hairFade);

    group.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(bodyGeoms, false), devMat));

    // 2. Left Arm (Flannel sleeve, forearm, smartwatch, hand)
    const armL = new THREE.Group();
    armL.position.set(-0.30, 1.50, 0);
    const sleeveL = applyVertexColor(new THREE.CylinderGeometry(0.078, 0.072, 0.26, 10), flannelPrimary);
    sleeveL.translate(0, -0.13, 0);
    const cuffL = applyVertexColor(new THREE.CylinderGeometry(0.082, 0.082, 0.04, 10), flannelPlaidDark);
    cuffL.translate(0, -0.25, 0);
    const forearmL = applyVertexColor(new THREE.CylinderGeometry(0.062, 0.054, 0.28, 10), skinColor);
    forearmL.translate(0, -0.39, 0);
    const watchBandL = applyVertexColor(new THREE.CylinderGeometry(0.066, 0.066, 0.05, 10), watchCasing);
    watchBandL.translate(0, -0.49, 0);
    const watchDialL = applyVertexColor(new THREE.BoxGeometry(0.055, 0.055, 0.03), watchFace);
    watchDialL.translate(-0.04, -0.49, 0);
    const handL = applyVertexColor(new THREE.SphereGeometry(0.056, 8, 8), skinColor);
    handL.translate(0, -0.58, 0);
    const thumbL = applyVertexColor(new THREE.BoxGeometry(0.025, 0.045, 0.025), skinColor);
    thumbL.translate(0.04, -0.56, 0.03);
    const mergedArmL = BufferGeometryUtils.mergeGeometries([sleeveL, cuffL, forearmL, watchBandL, watchDialL, handL, thumbL], false);
    armL.add(new THREE.Mesh(mergedArmL, devMat));
    group.add(armL);

    // 3. Right Arm (Flannel sleeve, forearm, black wristband, hand)
    const armR = new THREE.Group();
    armR.position.set(0.30, 1.50, 0);
    const sleeveR = applyVertexColor(new THREE.CylinderGeometry(0.078, 0.072, 0.26, 10), flannelPrimary);
    sleeveR.translate(0, -0.13, 0);
    const cuffR = applyVertexColor(new THREE.CylinderGeometry(0.082, 0.082, 0.04, 10), flannelPlaidDark);
    cuffR.translate(0, -0.25, 0);
    const forearmR = applyVertexColor(new THREE.CylinderGeometry(0.062, 0.054, 0.28, 10), skinColor);
    forearmR.translate(0, -0.39, 0);
    const wristbandR = applyVertexColor(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 10), wristband);
    wristbandR.translate(0, -0.49, 0);
    const handR = applyVertexColor(new THREE.SphereGeometry(0.056, 8, 8), skinColor);
    handR.translate(0, -0.58, 0);
    const thumbR = applyVertexColor(new THREE.BoxGeometry(0.025, 0.045, 0.025), skinColor);
    thumbR.translate(-0.04, -0.56, 0.03);
    const mergedArmR = BufferGeometryUtils.mergeGeometries([sleeveR, cuffR, forearmR, wristbandR, handR, thumbR], false);
    armR.add(new THREE.Mesh(mergedArmR, devMat));
    group.add(armR);

    // 4. Left Leg (Khaki chinos, navy sneakers with white sole & side slash)
    const legL = new THREE.Group();
    legL.position.set(-0.13, 0.90, 0);
    const pantsL = applyVertexColor(new THREE.BoxGeometry(0.18, 0.74, 0.20), pantsKhaki);
    pantsL.translate(0, -0.37, 0);
    const cuffLegL = applyVertexColor(new THREE.BoxGeometry(0.19, 0.05, 0.21), pantsKhaki);
    cuffLegL.translate(0, -0.71, 0);
    const shoeL = applyVertexColor(new THREE.BoxGeometry(0.16, 0.09, 0.26), sneakersNavy);
    shoeL.translate(0, -0.76, 0.03);
    const slashL = applyVertexColor(new THREE.BoxGeometry(0.17, 0.03, 0.14), sneakersAccent);
    slashL.translate(0, -0.76, 0.03);
    const soleL = applyVertexColor(new THREE.BoxGeometry(0.165, 0.035, 0.28), sneakersSole);
    soleL.translate(0, -0.81, 0.03);
    legL.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries([pantsL, cuffLegL, shoeL, slashL, soleL], false), devMat));
    group.add(legL);

    // 5. Right Leg (Khaki chinos, navy sneakers with white sole & side slash)
    const legR = new THREE.Group();
    legR.position.set(0.13, 0.90, 0);
    const pantsR = applyVertexColor(new THREE.BoxGeometry(0.18, 0.74, 0.20), pantsKhaki);
    pantsR.translate(0, -0.37, 0);
    const cuffLegR = applyVertexColor(new THREE.BoxGeometry(0.19, 0.05, 0.21), pantsKhaki);
    cuffLegR.translate(0, -0.71, 0);
    const shoeR = applyVertexColor(new THREE.BoxGeometry(0.16, 0.09, 0.26), sneakersNavy);
    shoeR.translate(0, -0.76, 0.03);
    const slashR = applyVertexColor(new THREE.BoxGeometry(0.17, 0.03, 0.14), sneakersAccent);
    slashR.translate(0, -0.76, 0.03);
    const soleR = applyVertexColor(new THREE.BoxGeometry(0.165, 0.035, 0.28), sneakersSole);
    soleR.translate(0, -0.81, 0.03);
    legR.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries([pantsR, cuffLegR, shoeR, slashR, soleR], false), devMat));
    group.add(legR);

    return { group, armL, armR, legL, legR };
}

export function updatePlayerLocomotion(delta, keys, camera, isSprinting) {
    const dt = Math.min(delta, 1 / 30);
    const moveSpeed = isSprinting ? 16.0 : 9.0;

    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    camForward.y = 0;
    if (camForward.lengthSq() < 0.001) camForward.set(0, 0, 1);
    else camForward.normalize();

    const camRight = camForward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();

    const inputVec = new THREE.Vector3();
    if (keys.w) inputVec.add(camForward);
    if (keys.s) inputVec.sub(camForward);
    if (keys.d) inputVec.add(camRight);
    if (keys.a) inputVec.sub(camRight);

    const moving = inputVec.lengthSq() > 0.001;
    if (moving) {
        inputVec.normalize();
        characterGroup.position.x += inputVec.x * moveSpeed * dt;
        characterGroup.position.z += inputVec.z * moveSpeed * dt;

        resolveCollision(characterGroup.position, 0.6);

        const targetRot = Math.atan2(inputVec.x, inputVec.z) + Math.PI;
        let diff = (targetRot - characterGroup.rotation.y) % (Math.PI * 2);
        if (diff < -Math.PI) diff += Math.PI * 2;
        if (diff > Math.PI) diff -= Math.PI * 2;
        characterGroup.rotation.y += diff * 0.25;

        walkCycle += dt * (isSprinting ? 9.5 : 6.5);
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
        const targetFloor = getSurfaceElevationAt(characterGroup.position.x, characterGroup.position.z, characterGroup.position.y);
        characterGroup.position.y = targetFloor + gaitBob;

        const targetRoll = Math.sin(walkCycle) * 0.035;
        const targetPitch = isSprinting ? 0.09 : 0.04;
        characterGroup.rotation.z = THREE.MathUtils.lerp(characterGroup.rotation.z, targetRoll, 0.15);
        characterGroup.rotation.x = THREE.MathUtils.lerp(characterGroup.rotation.x, targetPitch, 0.15);
    } else {
        idleTimer += dt * 2.2;
        if (devChar) {
            devChar.legL.rotation.x = THREE.MathUtils.lerp(devChar.legL.rotation.x, 0, 0.2);
            devChar.legR.rotation.x = THREE.MathUtils.lerp(devChar.legR.rotation.x, 0, 0.2);
            devChar.armL.rotation.x = THREE.MathUtils.lerp(devChar.armL.rotation.x, Math.sin(idleTimer) * 0.03, 0.15);
            devChar.armR.rotation.x = THREE.MathUtils.lerp(devChar.armR.rotation.x, -Math.sin(idleTimer) * 0.03, 0.15);
        }

        const targetFloor = getSurfaceElevationAt(characterGroup.position.x, characterGroup.position.z, characterGroup.position.y);
        characterGroup.position.y = THREE.MathUtils.lerp(characterGroup.position.y, targetFloor, 0.2);
        characterGroup.rotation.z = THREE.MathUtils.lerp(characterGroup.rotation.z, 0, 0.18);
        characterGroup.rotation.x = THREE.MathUtils.lerp(characterGroup.rotation.x, 0, 0.18);
    }

    // Spacebar Jump / Repulsor Hover Boost
    if (keys.space) {
        const floorY = getSurfaceElevationAt(characterGroup.position.x, characterGroup.position.z, characterGroup.position.y);
        characterGroup.position.y = THREE.MathUtils.lerp(characterGroup.position.y, floorY + 4.2, 0.1);
        if (repulsorLight) repulsorLight.intensity = 4.2;
        jetParticles.forEach(p => {
            p.mesh.visible = true;
            p.mesh.position.set(p.offset, -0.3 - Math.random() * 0.6, (Math.random() - 0.5) * 0.2);
        });
    } else {
        if (repulsorLight) repulsorLight.intensity = 0.2;
        jetParticles.forEach(p => p.mesh.visible = false);
    }

    resolveCollision(characterGroup.position, 0.6);
}
