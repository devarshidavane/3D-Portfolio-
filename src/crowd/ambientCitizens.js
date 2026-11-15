import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { applyVertexColor } from '../world/textures.js';

// ==========================================
// AMBIENT MUMBAI CITIZENS (1 UNIFIED DRAW CALL)
// Seated on Promenade Sea Wall, Chai Addas, Bus Stops,
// Railway Platforms & Asiatic Library Steps
// ==========================================

export function buildAmbientCitizens(scene) {
    const ambientGeoms = [];

    function addSeatedCitizen(x, y, z, rotY, skinHex, shirtHex, pantsHex, hairHex) {
        const torso = applyVertexColor(new THREE.BoxGeometry(0.42, 0.58, 0.24), shirtHex);
        torso.rotateY(rotY);
        torso.translate(x, y + 0.65, z);
        ambientGeoms.push(torso);

        const head = applyVertexColor(new THREE.SphereGeometry(0.18, 8, 8), skinHex);
        head.translate(x, y + 1.1, z);
        ambientGeoms.push(head);

        const hair = applyVertexColor(new THREE.SphereGeometry(0.19, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairHex);
        hair.translate(x, y + 1.12, z);
        ambientGeoms.push(hair);

        const forwardX = Math.sin(rotY);
        const forwardZ = Math.cos(rotY);
        const thighs = applyVertexColor(new THREE.BoxGeometry(0.38, 0.16, 0.44), pantsHex);
        thighs.rotateY(rotY);
        thighs.translate(x + forwardX * 0.15, y + 0.36, z + forwardZ * 0.15);
        ambientGeoms.push(thighs);

        const shins = applyVertexColor(new THREE.BoxGeometry(0.36, 0.42, 0.16), pantsHex);
        shins.rotateY(rotY);
        shins.translate(x + forwardX * 0.32, y + 0.16, z + forwardZ * 0.32);
        ambientGeoms.push(shins);
    }

    function addStandingCitizen(x, y, z, rotY, skinHex, shirtHex, pantsHex, hairHex) {
        const torso = applyVertexColor(new THREE.BoxGeometry(0.42, 0.60, 0.24), shirtHex);
        torso.rotateY(rotY);
        torso.translate(x, y + 1.25, z);
        ambientGeoms.push(torso);

        const head = applyVertexColor(new THREE.SphereGeometry(0.19, 8, 8), skinHex);
        head.translate(x, y + 1.72, z);
        ambientGeoms.push(head);

        const hair = applyVertexColor(new THREE.SphereGeometry(0.20, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairHex);
        hair.translate(x, y + 1.74, z);
        ambientGeoms.push(hair);

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

    // 2. Citizens chatting at Chai Stalls
    [[-19, 0, -2.5, 0.8], [-21, 0, -2.5, -0.6], [19, 0, -2.5, 0.5], [21, 0, -2.5, -0.7]].forEach(p => {
        addStandingCitizen(p[0], p[1], p[2], p[3], 0xc68642, 0xf8fafc, 0x334155, 0x0f172a);
    });

    // 3. Commuters waiting at BEST Bus Stops
    [[-10.2, 0, 24.5, 0], [-9.8, 0, 25.5, 0], [9.8, 0, 24.5, Math.PI], [10.2, 0, 25.5, Math.PI]].forEach(p => {
        addStandingCitizen(p[0], p[1], p[2], p[3], 0xe0ac69, 0x0284c7, 0x1e293b, 0x1e1b4b);
    });

    // 4. Commuters on Railway Platforms
    [-24, 180, 400].forEach(sx => {
        addStandingCitizen(sx - 4.2, 0.35, 12, 0, 0x8d5524, 0xf97316, 0x0f172a, 0x020617);
        addStandingCitizen(sx - 4.5, 0.35, 20, Math.PI, 0xf5cba7, 0x10b981, 0xf8fafc, 0x3b2518);
    });

    if (ambientGeoms.length > 0) {
        const merged = BufferGeometryUtils.mergeGeometries(ambientGeoms, false);
        const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }
}
