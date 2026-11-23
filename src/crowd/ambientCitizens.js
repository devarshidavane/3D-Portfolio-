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
    // Saree Aunty, Influencer, Bhau, Commuters enjoying sea breeze
    [-60, -42, -18, 16, 38, 55].forEach((px, i) => {
        const skins = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d];
        const shirts = [0xdb2777, 0xc084fc, 0xeab308, 0x10b981, 0x1e3a8a]; // Magenta saree, lavender hoodie, gold silk, green kurta, navy blazer
        const pants = [0xdb2777, 0xf1f5f9, 0x1e3a8a, 0xf8fafc, 0x334155];
        addSeatedCitizen(px, 0.6, -21.4, Math.PI, skins[i % skins.length], shirts[i % shirts.length], pants[i % pants.length], 0x0f172a);
    });

    // 2. Chai Tapri Vendors & Citizens chatting at Chai Addas
    [[-19, 0, -2.5, 0.8], [19, 0, -2.5, 0.5]].forEach(p => {
        // Chaiwala in sky blue shirt with rust apron
        addStandingCitizen(p[0], p[1], p[2], p[3], 0xc68642, 0x38bdf8, 0x334155, 0x0f172a);
        const apron = applyVertexColor(new THREE.BoxGeometry(0.43, 0.35, 0.25), 0xb45309);
        apron.rotateY(p[3]);
        apron.translate(p[0], p[1] + 1.0, p[2]);
        ambientGeoms.push(apron);
    });
    [[-21, 0, -2.5, -0.6], [21, 0, -2.5, -0.7]].forEach(p => {
        // Local Bhau / patron
        addStandingCitizen(p[0], p[1], p[2], p[3], 0xe0ac69, 0xeab308, 0x1e3a8a, 0x020617);
    });

    // 3. Commuters & Police Havildar waiting at BEST Bus Stops
    [[-10.2, 0, 24.5, 0], [9.8, 0, 24.5, Math.PI]].forEach(p => {
        // Office commuter with laptop sling
        addStandingCitizen(p[0], p[1], p[2], p[3], 0xe0ac69, 0xbae6fd, 0x1e293b, 0x1e1b4b);
    });
    [[-9.8, 0, 25.5, 0], [10.2, 0, 25.5, Math.PI]].forEach(p => {
        // Mumbai Police Havildar on duty
        addStandingCitizen(p[0], p[1], p[2], p[3], 0x8d5524, 0xc28846, 0xb4793b, 0x020617);
        const cap = applyVertexColor(new THREE.CylinderGeometry(0.20, 0.20, 0.08, 8), 0x1e3a8a);
        cap.translate(p[0], p[1] + 1.77, p[2]);
        ambientGeoms.push(cap);
    });

    // 4. Old-School Dabbawalas & Commuters on Railway Platforms
    [-24, 180, 400].forEach(sx => {
        // Dabbawala in all-white kurta with Gandhi Topi & tiffin stack
        addStandingCitizen(sx - 4.2, 0.35, 12, 0, 0x8d5524, 0xf8fafc, 0xf8fafc, 0x020617);
        const topi = applyVertexColor(new THREE.BoxGeometry(0.14, 0.09, 0.24), 0xffffff);
        topi.translate(sx - 4.2, 0.35 + 1.79, 12);
        const dabba = applyVertexColor(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 8), 0xcbd5e1);
        dabba.translate(sx - 4.2 + 0.32, 0.35 + 0.76, 12);
        ambientGeoms.push(topi, dabba);

        // Tech-Tinkerer commuter with olive vest
        addStandingCitizen(sx - 4.5, 0.35, 20, Math.PI, 0xf5cba7, 0x4d7c0f, 0x334155, 0x3b2518);
    });

    if (ambientGeoms.length > 0) {
        const merged = BufferGeometryUtils.mergeGeometries(ambientGeoms, false);
        const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }
}
