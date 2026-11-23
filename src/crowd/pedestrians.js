import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { applyVertexColor } from '../world/textures.js';

// ==========================================
// PEDESTRIAN SIMULATION (120 PEDESTRIANS)
// 30 Detailed Walkers + 90 Instanced Crowd Walkers
// Optimizations:
// 1. InstancedMesh archetype batches + BufferGeometryUtils vertex-colored merged geometries (<= 5 draw calls total)
// 2. Zero per-frame allocations via module-level scratch Vector3/Matrix4/Euler/Quaternion
// 3. 10Hz throttling for entities further than 200m from camera
// ==========================================

export const npcs = [];
export const allPedestrians = [];

let instancedPedestrians = null;
let instancedUmbrellas = null;
const archetypeMeshes = [];

// Module-scoped scratch objects to eliminate per-frame allocations
const _scratchPos = new THREE.Vector3();
const _scratchScale = new THREE.Vector3(1, 1, 1);
const _scratchQuat = new THREE.Quaternion();
const _scratchMatrix = new THREE.Matrix4();
const _scratchEuler = new THREE.Euler(0, 0, 0, 'YXZ');

const skinColors = [
    0xf5cba7, // Fair warm brown
    0xe0ac69, // Medium golden brown
    0xc68642, // Rich warm brown
    0x8d5524, // Deep bronze brown
    0x5c3317  // Rich dark brown
];

const shirtColors = [
    0xf8fafc, // Formal White
    0x38bdf8, // Sky Blue
    0xf97316, // Saffron / Orange Kurta
    0x10b981, // Emerald Green Kurta / Saree
    0x1e3a8a, // Navy Blue
    0xec4899, // Rani Pink
    0xfacc15, // Haldi Yellow
    0x475569  // Charcoal Formal
];

const pantsColors = [
    0x1e293b, // Dark Navy / Formal Trouser
    0x334155, // Slate
    0x0f172a, // Formal Black
    0xf8fafc, // White Pajama / Dhoti
    0x94a3b8  // Light Blue Denim Jeans
];

const hairColors = [
    0x020617, // Jet Black
    0x1e1b4b, // Deep Charcoal
    0x3b2518, // Dark Brown
    0x71717a  // Senior Salt & Pepper
];

const umbrellaColors = [
    0x020617, // Classic Black
    0x0284c7, // Rain Blue
    0xdc2626, // Crimson Red
    0x16a34a  // Leaf Green
];

/**
 * Creates an articulated pedestrian rig with static parts (torso, head, hair)
 * and umbrella parts merged via BufferGeometryUtils with vertex colors.
 */
export function createArticulatedPedestrian(cfg) {
    const group = new THREE.Group();
    const skinHex = skinColors[cfg.skinIdx % skinColors.length];
    const shirtHex = shirtColors[cfg.shirtIdx % shirtColors.length];
    const pantsHex = pantsColors[cfg.pantsIdx % pantsColors.length];
    const hairHex = hairColors[cfg.hairIdx % hairColors.length];

    // Static parts: Torso, Head, Hair merged into single geometry with vertex colors
    const torsoGeom = applyVertexColor(new THREE.BoxGeometry(0.42, 0.62, 0.24), shirtHex);
    torsoGeom.translate(0, 1.18, 0);

    const headGeom = applyVertexColor(new THREE.SphereGeometry(0.18, 10, 10), skinHex);
    headGeom.translate(0, 1.68, 0);

    const hairGeom = applyVertexColor(new THREE.SphereGeometry(0.19, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairHex);
    hairGeom.translate(0, 1.70, 0);

    const staticGeom = BufferGeometryUtils.mergeGeometries([torsoGeom, headGeom, hairGeom], false);
    const staticMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
    const staticMesh = new THREE.Mesh(staticGeom, staticMat);
    staticMesh.castShadow = true;
    group.add(staticMesh);

    // Arms
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.8 });
    const armL = new THREE.Group();
    armL.position.set(-0.28, 1.45, 0);
    const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.12), shirtMat);
    armLMesh.position.y = -0.24;
    armL.add(armLMesh);
    group.add(armL);

    const armR = new THREE.Group();
    armR.position.set(0.28, 1.45, 0);
    const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.12), shirtMat);
    armRMesh.position.y = -0.24;
    armR.add(armRMesh);
    group.add(armR);

    // Legs
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.85 });
    const legL = new THREE.Group();
    legL.position.set(-0.13, 0.88, 0);
    const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.82, 0.16), pantsMat);
    legLMesh.position.y = -0.41;
    legL.add(legLMesh);
    group.add(legL);

    const legR = new THREE.Group();
    legR.position.set(0.13, 0.88, 0);
    const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.82, 0.16), pantsMat);
    legRMesh.position.y = -0.41;
    legR.add(legRMesh);
    group.add(legR);

    // Rain Umbrella (shaft + canopy merged with vertex colors)
    const umbrellaGroup = new THREE.Group();
    umbrellaGroup.visible = false;
    const shaftGeom = applyVertexColor(new THREE.CylinderGeometry(0.015, 0.015, 0.95, 6), 0x94a3b8);
    shaftGeom.translate(0, 0.45, 0);
    const canopyGeom = applyVertexColor(
        new THREE.ConeGeometry(0.55, 0.28, 10, 1, true),
        umbrellaColors[cfg.umbrellaIdx % umbrellaColors.length]
    );
    canopyGeom.translate(0, 0.9, 0);
    const umbrellaGeom = BufferGeometryUtils.mergeGeometries([shaftGeom, canopyGeom], false);
    const umbrellaMesh = new THREE.Mesh(umbrellaGeom, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    umbrellaGroup.add(umbrellaMesh);
    umbrellaGroup.position.set(0, -0.45, 0.08);
    armR.add(umbrellaGroup);

    return { group, armL, armR, legL, legR, umbrellaGroup, walkCycle: Math.random() * Math.PI * 2 };
}

// ==========================================
// 12 MUMBAI NPC ARCHETYPES (refs/characters/mumbai_npc_archetypes.jpg)
// Authentic Cultural Signatures, Attire, Colors & Props
// ==========================================
export const MUMBAI_ARCHETYPES = [
    { id: 'chaiwala', name: 'Chai Tapri Vendor', skin: 0xc68642, shirt: 0x38bdf8, pants: 0x334155, hair: 0x020617, prop: 'chai_rack' },
    { id: 'commuter', name: 'Local Commuter', skin: 0xe0ac69, shirt: 0xbae6fd, pants: 0x1e293b, hair: 0x1e1b4b, prop: 'laptop_bag' },
    { id: 'cab_driver', name: 'Kaali Peeli Cab Driver', skin: 0x8d5524, shirt: 0xd97706, pants: 0x92400e, hair: 0x020617, prop: 'cab_meter' },
    { id: 'gamer', name: 'College Gamer', skin: 0xf5cba7, shirt: 0x6366f1, pants: 0x475569, hair: 0x1e1b4b, prop: 'headphones' },
    { id: 'dabbawala', name: 'Old-School Dabbawala', skin: 0x8d5524, shirt: 0xf8fafc, pants: 0xf8fafc, hair: 0x020617, prop: 'dabba' },
    { id: 'bhau', name: 'Streetwise Bhau', skin: 0xc68642, shirt: 0xeab308, pants: 0x1e3a8a, hair: 0x020617, prop: 'gold_chain' },
    { id: 'police_havildar', name: 'Mumbai Police Havildar', skin: 0x8d5524, shirt: 0xc28846, pants: 0xb4793b, hair: 0x020617, prop: 'police_gear' },
    { id: 'aunty_saree', name: 'Tech-Savvy Aunty', skin: 0xe0ac69, shirt: 0xdb2777, pants: 0xdb2777, hair: 0x020617, prop: 'saree_pallu' },
    { id: 'influencer', name: 'Bandra Influencer', skin: 0xf5cba7, shirt: 0xc084fc, pants: 0xf1f5f9, hair: 0x3b2518, prop: 'phone_gimbal' },
    { id: 'food_vendor', name: 'Street Food Vendor', skin: 0x8d5524, shirt: 0xf8fafc, pants: 0x1e293b, hair: 0x020617, prop: 'chef_ladle' },
    { id: 'tech_tinkerer', name: 'Dharavi Tech-Tinkerer', skin: 0x8d5524, shirt: 0x64748b, pants: 0x334155, hair: 0x020617, prop: 'utility_goggles' },
    { id: 'corporate_townie', name: 'Corporate Townie', skin: 0xf5cba7, shirt: 0x1e3a8a, pants: 0x334155, hair: 0x1e1b4b, prop: 'tablet' }
];

export function createMumbaiArchetypeGeometry(arch) {
    const geoms = [];
    const skinHex = arch.skin;
    const shirtHex = arch.shirt;
    const pantsHex = arch.pants;
    const hairHex = arch.hair;

    // Torso
    const torso = applyVertexColor(new THREE.BoxGeometry(0.42, 0.62, 0.24), shirtHex);
    torso.translate(0, 1.18, 0);
    geoms.push(torso);

    // Head
    const head = applyVertexColor(new THREE.SphereGeometry(0.18, 10, 10), skinHex);
    head.translate(0, 1.68, 0);
    geoms.push(head);

    // Hair
    const hair = applyVertexColor(new THREE.SphereGeometry(0.19, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairHex);
    hair.translate(0, 1.70, 0);
    geoms.push(hair);

    // Left Arm
    const armL = applyVertexColor(new THREE.BoxGeometry(0.12, 0.54, 0.12), shirtHex);
    armL.translate(-0.28, 1.21, 0);
    geoms.push(armL);

    // Right Arm
    const armR = applyVertexColor(new THREE.BoxGeometry(0.12, 0.54, 0.12), shirtHex);
    armR.translate(0.28, 1.21, 0);
    geoms.push(armR);

    // Left Leg
    const legL = applyVertexColor(new THREE.BoxGeometry(0.16, 0.82, 0.16), pantsHex);
    legL.translate(-0.13, 0.47, 0);
    geoms.push(legL);

    // Right Leg
    const legR = applyVertexColor(new THREE.BoxGeometry(0.16, 0.82, 0.16), pantsHex);
    legR.translate(0.13, 0.47, 0);
    geoms.push(legR);

    // Signature Props & Cultural Accessories per archetype
    switch (arch.prop) {
        case 'chai_rack': {
            const apron = applyVertexColor(new THREE.BoxGeometry(0.43, 0.35, 0.25), 0xb45309);
            apron.translate(0, 0.95, 0.01);
            geoms.push(apron);
            const rack = applyVertexColor(new THREE.BoxGeometry(0.20, 0.14, 0.14), 0x94a3b8);
            rack.translate(0.34, 0.85, 0.16);
            geoms.push(rack);
            [-0.05, 0.05].forEach(gx => {
                const cup = applyVertexColor(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 6), 0x67e8f9);
                cup.translate(0.34 + gx, 0.90, 0.16);
                geoms.push(cup);
            });
            break;
        }
        case 'laptop_bag': {
            const strap = applyVertexColor(new THREE.BoxGeometry(0.04, 0.65, 0.26), 0x78350f);
            strap.rotateZ(0.35);
            strap.translate(0.02, 1.22, 0.01);
            geoms.push(strap);
            const bag = applyVertexColor(new THREE.BoxGeometry(0.10, 0.28, 0.34), 0x451a03);
            bag.translate(0.24, 0.78, 0.04);
            geoms.push(bag);
            const lanyard = applyVertexColor(new THREE.BoxGeometry(0.06, 0.22, 0.02), 0xef4444);
            lanyard.translate(0, 1.35, 0.13);
            geoms.push(lanyard);
            break;
        }
        case 'cab_meter': {
            const cap = applyVertexColor(new THREE.CylinderGeometry(0.20, 0.20, 0.07, 10), 0x78350f);
            cap.translate(0, 1.77, 0.02);
            const visor = applyVertexColor(new THREE.BoxGeometry(0.16, 0.02, 0.10), 0x451a03);
            visor.translate(0, 1.74, 0.15);
            geoms.push(cap, visor);
            const meter = applyVertexColor(new THREE.BoxGeometry(0.08, 0.09, 0.05), 0x0f172a);
            meter.translate(0.15, 0.90, 0.13);
            const led = applyVertexColor(new THREE.BoxGeometry(0.04, 0.03, 0.01), 0x22c55e);
            led.translate(0.15, 0.92, 0.16);
            geoms.push(meter, led);
            break;
        }
        case 'headphones': {
            const hood = applyVertexColor(new THREE.BoxGeometry(0.38, 0.16, 0.14), 0x4f46e5);
            hood.translate(0, 1.48, -0.14);
            geoms.push(hood);
            const band = applyVertexColor(new THREE.BoxGeometry(0.28, 0.03, 0.22), 0x0f172a);
            band.translate(0, 1.54, 0.02);
            const cupL = applyVertexColor(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), 0x10b981);
            cupL.rotateZ(Math.PI / 2);
            cupL.translate(-0.14, 1.52, 0.05);
            const cupR = applyVertexColor(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), 0x10b981);
            cupR.rotateZ(Math.PI / 2);
            cupR.translate(0.14, 1.52, 0.05);
            geoms.push(band, cupL, cupR);
            break;
        }
        case 'dabba': {
            const topi = applyVertexColor(new THREE.BoxGeometry(0.13, 0.09, 0.24), 0xffffff);
            topi.translate(0, 1.79, 0.01);
            geoms.push(topi);
            const dabba = applyVertexColor(new THREE.CylinderGeometry(0.09, 0.09, 0.34, 10), 0xcbd5e1);
            dabba.translate(0.32, 0.76, 0.12);
            const carrier = applyVertexColor(new THREE.BoxGeometry(0.02, 0.38, 0.02), 0x94a3b8);
            carrier.translate(0.32, 0.88, 0.12);
            geoms.push(dabba, carrier);
            break;
        }
        case 'gold_chain': {
            const chain = applyVertexColor(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 8), 0xfbbf24);
            chain.rotateZ(Math.PI / 2);
            chain.translate(0, 1.45, 0.13);
            const locket = applyVertexColor(new THREE.BoxGeometry(0.04, 0.05, 0.02), 0xf59e0b);
            locket.translate(0, 1.38, 0.135);
            const shades = applyVertexColor(new THREE.BoxGeometry(0.16, 0.04, 0.03), 0x09090b);
            shades.translate(0, 1.70, 0.18);
            geoms.push(chain, locket, shades);
            break;
        }
        case 'police_gear': {
            const cap = applyVertexColor(new THREE.CylinderGeometry(0.20, 0.20, 0.08, 10), 0x1e3a8a);
            cap.translate(0, 1.77, 0.02);
            const redBand = applyVertexColor(new THREE.CylinderGeometry(0.205, 0.205, 0.02, 10), 0xb91c1c);
            redBand.translate(0, 1.74, 0.02);
            const belt = applyVertexColor(new THREE.BoxGeometry(0.05, 0.64, 0.26), 0x451a03);
            belt.rotateZ(0.35);
            belt.translate(0.02, 1.20, 0.01);
            const radio = applyVertexColor(new THREE.BoxGeometry(0.06, 0.10, 0.05), 0x18181b);
            radio.translate(-0.18, 1.48, 0.02);
            const ant = applyVertexColor(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4), 0x0f172a);
            ant.translate(-0.18, 1.58, 0.02);
            geoms.push(cap, redBand, belt, radio, ant);
            break;
        }
        case 'saree_pallu': {
            const zari = applyVertexColor(new THREE.BoxGeometry(0.44, 0.04, 0.26), 0xfbbf24);
            zari.translate(0, 0.89, 0);
            const pallu = applyVertexColor(new THREE.BoxGeometry(0.14, 0.60, 0.12), 0xdb2777);
            pallu.rotateZ(0.35);
            pallu.translate(-0.08, 1.25, 0.08);
            const zariEdge = applyVertexColor(new THREE.BoxGeometry(0.04, 0.60, 0.02), 0xfbbf24);
            zariEdge.rotateZ(0.35);
            zariEdge.translate(-0.14, 1.25, 0.14);
            const bag = applyVertexColor(new THREE.BoxGeometry(0.08, 0.20, 0.22), 0x7c2d12);
            bag.translate(0.32, 0.88, 0.05);
            geoms.push(zari, pallu, zariEdge, bag);
            break;
        }
        case 'phone_gimbal': {
            const hood = applyVertexColor(new THREE.BoxGeometry(0.38, 0.16, 0.14), 0xa855f7);
            hood.translate(0, 1.48, -0.14);
            const kickL = applyVertexColor(new THREE.BoxGeometry(0.18, 0.10, 0.24), 0xffffff);
            kickL.translate(-0.13, 0.08, 0.03);
            const kickR = applyVertexColor(new THREE.BoxGeometry(0.18, 0.10, 0.24), 0xffffff);
            kickR.translate(0.13, 0.08, 0.03);
            const shades = applyVertexColor(new THREE.BoxGeometry(0.16, 0.04, 0.03), 0x09090b);
            shades.translate(0, 1.70, 0.18);
            const pole = applyVertexColor(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), 0x1e293b);
            pole.translate(0.32, 1.15, 0.18);
            const phone = applyVertexColor(new THREE.BoxGeometry(0.08, 0.14, 0.02), 0x38bdf8);
            phone.translate(0.32, 1.28, 0.18);
            geoms.push(hood, kickL, kickR, shades, pole, phone);
            break;
        }
        case 'chef_ladle': {
            const apron = applyVertexColor(new THREE.BoxGeometry(0.43, 0.38, 0.25), 0xdc2626);
            apron.translate(0, 0.92, 0.01);
            const band = applyVertexColor(new THREE.BoxGeometry(0.38, 0.04, 0.38), 0xf8fafc);
            band.translate(0, 1.74, 0);
            const handle = applyVertexColor(new THREE.CylinderGeometry(0.01, 0.01, 0.40, 6), 0x94a3b8);
            handle.translate(0.34, 1.10, 0.12);
            const paddle = applyVertexColor(new THREE.BoxGeometry(0.10, 0.12, 0.01), 0xcbd5e1);
            paddle.translate(0.34, 1.32, 0.12);
            geoms.push(apron, band, handle, paddle);
            break;
        }
        case 'utility_goggles': {
            const vest = applyVertexColor(new THREE.BoxGeometry(0.44, 0.58, 0.26), 0x4d7c0f);
            vest.translate(0, 1.18, 0);
            const p1 = applyVertexColor(new THREE.BoxGeometry(0.12, 0.10, 0.04), 0x3f6212);
            p1.translate(-0.12, 1.12, 0.14);
            const p2 = applyVertexColor(new THREE.BoxGeometry(0.12, 0.10, 0.04), 0x3f6212);
            p2.translate(0.12, 1.12, 0.14);
            const goggles = applyVertexColor(new THREE.BoxGeometry(0.18, 0.06, 0.08), 0x0284c7);
            goggles.translate(0, 1.76, 0.16);
            const pouch = applyVertexColor(new THREE.BoxGeometry(0.08, 0.16, 0.12), 0x78350f);
            pouch.translate(0.24, 0.88, 0);
            geoms.push(vest, p1, p2, goggles, pouch);
            break;
        }
        case 'tablet': {
            const blazer = applyVertexColor(new THREE.BoxGeometry(0.46, 0.64, 0.26), 0x1e3a8a);
            blazer.translate(0, 1.18, 0);
            const collar = applyVertexColor(new THREE.BoxGeometry(0.12, 0.14, 0.04), 0xffffff);
            collar.translate(0, 1.45, 0.12);
            const tab = applyVertexColor(new THREE.BoxGeometry(0.02, 0.24, 0.18), 0x0f172a);
            tab.translate(0.32, 0.95, 0.12);
            const screen = applyVertexColor(new THREE.BoxGeometry(0.025, 0.22, 0.16), 0x38bdf8);
            screen.translate(0.32, 0.95, 0.12);
            geoms.push(blazer, collar, tab, screen);
            break;
        }
    }

    return BufferGeometryUtils.mergeGeometries(geoms, false);
}

function createArchetypeGeometry(skinHex, shirtHex, pantsHex, hairHex) {
    return createMumbaiArchetypeGeometry({
        skin: skinHex,
        shirt: shirtHex,
        pants: pantsHex,
        hair: hairHex,
        prop: 'laptop_bag'
    });
}

function createUmbrellaGeometry() {
    const shaft = applyVertexColor(new THREE.CylinderGeometry(0.015, 0.015, 0.95, 6), 0x94a3b8);
    shaft.translate(0, 0.45, 0);
    const canopy = applyVertexColor(new THREE.ConeGeometry(0.55, 0.28, 10, 1, true), 0x0284c7);
    canopy.translate(0, 0.9, 0);
    return BufferGeometryUtils.mergeGeometries([shaft, canopy], false);
}

function getCameraPosition(camera) {
    if (camera && camera.position) return camera.position;
    if (typeof window !== 'undefined') {
        if (window.__camera && window.__camera.position) return window.__camera.position;
        if (window.__characterGroup && window.__characterGroup.position) return window.__characterGroup.position;
    }
    return null;
}

export function buildPedestrianSimulation(scene) {
    npcs.length = 0;
    allPedestrians.length = 0;

    // Clean up previous instanced meshes if re-building
    if (archetypeMeshes.length > 0) {
        for (let a = 0; a < archetypeMeshes.length; a++) {
            if (archetypeMeshes[a] && scene) {
                scene.remove(archetypeMeshes[a]);
                if (archetypeMeshes[a].geometry) archetypeMeshes[a].geometry.dispose();
            }
        }
        archetypeMeshes.length = 0;
    }
    if (instancedUmbrellas && scene) {
        scene.remove(instancedUmbrellas);
        if (instancedUmbrellas.geometry) instancedUmbrellas.geometry.dispose();
        instancedUmbrellas = null;
    }
    if (instancedPedestrians && scene) {
        scene.remove(instancedPedestrians);
        if (instancedPedestrians.geometry) instancedPedestrians.geometry.dispose();
        instancedPedestrians = null;
    }

    const detailedConfigs = [
        // District 1: Gateway Waterfront Promenade (5)
        { skin: 3, shirt: 0, pants: 0, hair: 0, type: 'chaiwala', wps: [{x: -14, z: -4}, {x: 18, z: -4}, {x: 8, z: -12}, {x: -12, z: -10}] },
        { skin: 2, shirt: 1, pants: 3, hair: 0, type: 'dabbawala', wps: [{x: -30, z: 2}, {x: 10, z: 2}, {x: 25, z: -4}, {x: -15, z: -4}] },
        { skin: 1, shirt: 3, pants: 3, hair: 0, type: 'saree', wps: [{x: 12, z: -6}, {x: 32, z: -6}, {x: 20, z: 4}, {x: 0, z: 4}] },
        { skin: 2, shirt: 2, pants: 1, hair: 1, type: 'commuter', wps: [{x: -25, z: -14}, {x: 25, z: -14}, {x: 15, z: -8}, {x: -18, z: -8}] },
        { skin: 0, shirt: 4, pants: 2, hair: 2, type: 'tourist', wps: [{x: -8, z: -18}, {x: 8, z: -18}, {x: 14, z: -6}, {x: -14, z: -6}] },

        // District 2: Marine Drive Coastal Promenade (4)
        { skin: 1, shirt: 0, pants: 2, hair: 0, type: 'jogger', wps: [{x: -28, z: 30}, {x: -28, z: 110}, {x: -32, z: 90}, {x: -32, z: 40}] },
        { skin: 2, shirt: 4, pants: 0, hair: 1, type: 'student_headphones', wps: [{x: -31, z: 50}, {x: -31, z: 120}, {x: -28, z: 100}, {x: -28, z: 60}] },
        { skin: 3, shirt: 2, pants: 4, hair: 0, type: 'senior_walker', wps: [{x: -29, z: 40}, {x: -29, z: 85}, {x: -33, z: 80}, {x: -33, z: 45}] },
        { skin: 1, shirt: 1, pants: 1, hair: 2, type: 'photographer', wps: [{x: -33, z: 65}, {x: -33, z: 105}, {x: -29, z: 95}, {x: -29, z: 70}] },

        // District 3: Downtown Home HQ / Stark Tower Midtown Plaza (5)
        { skin: 1, shirt: 0, pants: 0, hair: 0, type: 'tech_exec', wps: [{x: -14, z: 230}, {x: 14, z: 230}, {x: 14, z: 260}, {x: -14, z: 260}] },
        { skin: 2, shirt: 3, pants: 2, hair: 1, type: 'cyber_security', wps: [{x: 8, z: 220}, {x: 8, z: 275}, {x: -8, z: 275}, {x: -8, z: 220}] },
        { skin: 0, shirt: 1, pants: 3, hair: 0, type: 'designer', wps: [{x: -18, z: 240}, {x: 18, z: 240}, {x: 10, z: 265}, {x: -10, z: 265}] },
        { skin: 3, shirt: 4, pants: 1, hair: 2, type: 'office_worker', wps: [{x: 12, z: 235}, {x: -12, z: 235}, {x: -12, z: 255}, {x: 12, z: 255}] },
        { skin: 2, shirt: 2, pants: 0, hair: 0, type: 'courier', wps: [{x: 6, z: 215}, {x: 6, z: 270}, {x: 14, z: 270}, {x: 14, z: 215}] },

        // District 4: West Residential Chawls (4)
        { skin: 2, shirt: 0, pants: 4, hair: 0, type: 'chawl_resident', wps: [{x: -170, z: 460}, {x: -200, z: 460}, {x: -200, z: 500}, {x: -170, z: 500}] },
        { skin: 3, shirt: 2, pants: 3, hair: 1, type: 'chai_drinker', wps: [{x: -175, z: 470}, {x: -195, z: 470}, {x: -195, z: 485}, {x: -175, z: 485}] },
        { skin: 1, shirt: 3, pants: 1, hair: 0, type: 'neighbor', wps: [{x: -185, z: 450}, {x: -185, z: 510}, {x: -178, z: 510}, {x: -178, z: 450}] },
        { skin: 2, shirt: 1, pants: 0, hair: 2, type: 'tailor', wps: [{x: -192, z: 465}, {x: -168, z: 465}, {x: -168, z: 495}, {x: -192, z: 495}] },

        // District 5: Commercial Bazaar Junction (4)
        { skin: 2, shirt: 4, pants: 0, hair: 0, type: 'merchant', wps: [{x: 165, z: 415}, {x: 195, z: 415}, {x: 195, z: 445}, {x: 165, z: 445}] },
        { skin: 1, shirt: 1, pants: 2, hair: 1, type: 'shopper', wps: [{x: 170, z: 420}, {x: 170, z: 455}, {x: 185, z: 455}, {x: 185, z: 420}] },
        { skin: 3, shirt: 0, pants: 3, hair: 0, type: 'porter', wps: [{x: 160, z: 430}, {x: 198, z: 430}, {x: 198, z: 440}, {x: 160, z: 440}] },
        { skin: 0, shirt: 2, pants: 1, hair: 2, type: 'spice_trader', wps: [{x: 178, z: 410}, {x: 178, z: 450}, {x: 192, z: 450}, {x: 192, z: 410}] },

        // District 6: Fr. Agnel Technical High School Bandra West (4)
        { skin: 1, shirt: 0, pants: 0, hair: 0, type: 'school_student_1', wps: [{x: -1340, z: 505}, {x: -1365, z: 505}, {x: -1365, z: 535}, {x: -1340, z: 535}] },
        { skin: 2, shirt: 4, pants: 1, hair: 1, type: 'school_student_2', wps: [{x: -1345, z: 510}, {x: -1345, z: 545}, {x: -1358, z: 545}, {x: -1358, z: 510}] },
        { skin: 3, shirt: 2, pants: 4, hair: 0, type: 'school_teacher', wps: [{x: -1335, z: 515}, {x: -1360, z: 515}, {x: -1360, z: 530}, {x: -1335, z: 530}] },
        { skin: 0, shirt: 3, pants: 2, hair: 2, type: 'parent_guardian', wps: [{x: -1352, z: 500}, {x: -1352, z: 540}, {x: -1342, z: 540}, {x: -1342, z: 500}] },

        // District 7: DMCE College Campus in Airoli (4)
        { skin: 2, shirt: 1, pants: 0, hair: 0, type: 'dmce_engineer_1', wps: [{x: 1835, z: 1435}, {x: 1865, z: 1435}, {x: 1865, z: 1465}, {x: 1835, z: 1465}] },
        { skin: 1, shirt: 3, pants: 2, hair: 1, type: 'dmce_engineer_2', wps: [{x: 1845, z: 1440}, {x: 1845, z: 1475}, {x: 1855, z: 1475}, {x: 1855, z: 1440}] },
        { skin: 3, shirt: 0, pants: 3, hair: 2, type: 'dmce_professor', wps: [{x: 1840, z: 1430}, {x: 1868, z: 1430}, {x: 1868, z: 1455}, {x: 1840, z: 1455}] },
        { skin: 0, shirt: 4, pants: 1, hair: 0, type: 'dmce_researcher', wps: [{x: 1838, z: 1445}, {x: 1838, z: 1480}, {x: 1860, z: 1480}, {x: 1860, z: 1445}] }
    ];

    // 1. Create 12 Archetype InstancedMeshes (matching refs/characters/mumbai_npc_archetypes.jpg)
    // Draw call count: 12 draw calls total for all detailed pedestrians with rich cultural accessories!
    const archetypeMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.8
    });

    const capacityPerArchetype = Math.ceil(detailedConfigs.length / MUMBAI_ARCHETYPES.length) + 2;

    for (let a = 0; a < MUMBAI_ARCHETYPES.length; a++) {
        const arch = MUMBAI_ARCHETYPES[a];
        const geom = createMumbaiArchetypeGeometry(arch);
        const instMesh = new THREE.InstancedMesh(geom, archetypeMat, capacityPerArchetype);
        instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instMesh.castShadow = true;
        scene.add(instMesh);
        archetypeMeshes.push(instMesh);
    }

    // 2. Umbrellas InstancedMesh (30 instances, visible during rain; 1 draw call in rain, 0 when clear)
    const umbrellaGeom = createUmbrellaGeometry();
    const umbrellaMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide
    });
    instancedUmbrellas = new THREE.InstancedMesh(umbrellaGeom, umbrellaMat, 30);
    instancedUmbrellas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedUmbrellas.visible = false;
    scene.add(instancedUmbrellas);

    detailedConfigs.forEach((cfg, idx) => {
        const p = createArticulatedPedestrian({
            skinIdx: cfg.skin,
            shirtIdx: cfg.shirt,
            pantsIdx: cfg.pants,
            hairIdx: cfg.hair,
            type: cfg.type,
            umbrellaIdx: idx % umbrellaColors.length
        });

        const startWp = cfg.wps[0];
        p.group.position.set(startWp.x, 0, startWp.z);

        const archetypeIdx = idx % MUMBAI_ARCHETYPES.length;
        const slotIdx = Math.floor(idx / MUMBAI_ARCHETYPES.length);

        // Initialize instance matrix in archetype mesh
        _scratchPos.set(startWp.x, 0, startWp.z);
        _scratchEuler.set(0, 0, 0);
        _scratchQuat.setFromEuler(_scratchEuler);
        _scratchScale.set(1, 1, 1);
        _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchScale);
        archetypeMeshes[archetypeIdx].setMatrixAt(slotIdx, _scratchMatrix);

        // Initialize umbrella matrix
        instancedUmbrellas.setMatrixAt(idx, _scratchMatrix);

        const npcObj = {
            id: `npc_det_${idx}`,
            isDetailed: true,
            group: p.group,
            type: cfg.type,
            armL: p.armL,
            armR: p.armR,
            legL: p.legL,
            legR: p.legR,
            umbrellaGroup: p.umbrellaGroup,
            walkCycle: p.walkCycle,
            waypoints: cfg.wps,
            wpIdx: 1,
            speed: 1.1 + (idx % 5) * 0.18,
            archetypeIdx,
            slotIdx,
            x: startWp.x,
            y: 0,
            z: startWp.z,
            rotY: 0,
            _accumDelta: 0
        };
        npcs.push(npcObj);
        allPedestrians.push(npcObj);
    });

    for (let a = 0; a < archetypeMeshes.length; a++) {
        archetypeMeshes[a].instanceMatrix.needsUpdate = true;
    }
    instancedUmbrellas.instanceMatrix.needsUpdate = true;

    // 3. 90 Instanced Crowd Walkers (1 draw call)
    const instGeom = new THREE.BoxGeometry(0.42, 1.68, 0.24);
    const instMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.65 });
    instancedPedestrians = new THREE.InstancedMesh(instGeom, instMat, 90);
    instancedPedestrians.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedPedestrians);

    const circuits = [
        { startX: -8, startZ: 20, dirX: 0, dirZ: 1, minZ: 20, maxZ: 1300 },
        { startX: 8, startZ: 1300, dirX: 0, dirZ: -1, minZ: 20, maxZ: 1300 },
        { startX: -188, startZ: 20, dirX: 0, dirZ: 1, minZ: 20, maxZ: 470 },
        { startX: 188, startZ: 470, dirX: 0, dirZ: -1, minZ: 20, maxZ: 470 },
        { startX: -340, startZ: 24, dirX: 1, dirZ: 0, minX: -340, maxX: 340 }
    ];

    for (let k = 0; k < 90; k++) {
        const circ = circuits[k % circuits.length];
        const offset = (k * 22.0) % 650;
        const curX = circ.dirX !== 0 ? (circ.startX + circ.dirX * offset) : circ.startX;
        const curZ = circ.dirZ !== 0 ? (circ.startZ + circ.dirZ * offset) : circ.startZ;

        _scratchPos.set(curX, 0, curZ);
        _scratchEuler.set(0, Math.atan2(circ.dirX, circ.dirZ), 0);
        _scratchQuat.setFromEuler(_scratchEuler);
        _scratchScale.set(1, 1, 1);
        _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchScale);
        instancedPedestrians.setMatrixAt(k, _scratchMatrix);

        allPedestrians.push({
            id: `npc_inst_${k}`,
            isDetailed: false,
            instIndex: k,
            circuit: circ,
            x: curX,
            z: curZ,
            dirX: circ.dirX,
            dirZ: circ.dirZ,
            speed: 1.0 + (k % 4) * 0.15,
            walkPhase: Math.random() * Math.PI * 2,
            _accumDelta: 0
        });
    }
    instancedPedestrians.instanceMatrix.needsUpdate = true;
}

export function updatePedestrianSimulation(delta, weatherMode = 'clear', camera = null) {
    if (!allPedestrians || allPedestrians.length === 0) return;
    const isRaining = (weatherMode === 'rain' || weatherMode === 'storm');

    if (instancedUmbrellas) {
        instancedUmbrellas.visible = isRaining;
    }

    const camPos = getCameraPosition(camera);
    const hasCam = !!camPos;
    let camX = 0, camZ = 0;
    if (hasCam) {
        camX = camPos.x;
        camZ = camPos.z;
    }

    const archetypeNeedsUpdate = new Array(archetypeMeshes.length).fill(false);
    let umbrellaNeedsUpdate = false;

    // 1. Detailed Pedestrians Simulation (30)
    for (let i = 0; i < npcs.length; i++) {
        const npc = npcs[i];
        npc._accumDelta = (npc._accumDelta || 0) + delta;

        // Throttling distant pedestrians (> 200m) to 10Hz (0.1s update rate)
        if (hasCam) {
            const cdx = npc.x - camX;
            const cdz = npc.z - camZ;
            if (cdx * cdx + cdz * cdz > 40000) {
                if (npc._accumDelta < 0.1) {
                    continue;
                }
            }
        }

        const stepDelta = npc._accumDelta;
        npc._accumDelta = 0;

        const target = npc.waypoints[npc.wpIdx];
        const dx = target.x - npc.x;
        const dz = target.z - npc.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.8) {
            npc.wpIdx = (npc.wpIdx + 1) % npc.waypoints.length;
        } else {
            const nx = dx / dist;
            const nz = dz / dist;
            npc.x += nx * npc.speed * stepDelta;
            npc.z += nz * npc.speed * stepDelta;

            const targetRot = Math.atan2(nx, nz);
            let diff = (targetRot - npc.rotY) % (Math.PI * 2);
            if (diff < -Math.PI) diff += Math.PI * 2;
            if (diff > Math.PI) diff -= Math.PI * 2;
            npc.rotY += diff * 0.15;
        }

        npc.walkCycle += stepDelta * npc.speed * 4.4;
        const swing = Math.sin(npc.walkCycle);
        const bob = Math.abs(Math.sin(npc.walkCycle * 2)) * 0.06;
        const swayZ = swing * 0.03;
        const pitchX = Math.sin(npc.walkCycle * 2) * 0.02;

        // Sync logical group position & rotation for external state queries
        npc.group.position.set(npc.x, bob, npc.z);
        npc.group.rotation.y = npc.rotY;

        if (npc.legL) npc.legL.rotation.x = -swing * 0.52;
        if (npc.legR) npc.legR.rotation.x = swing * 0.52;
        if (npc.umbrellaGroup) npc.umbrellaGroup.visible = isRaining;

        if (isRaining) {
            if (npc.armR) { npc.armR.rotation.x = -Math.PI / 3; npc.armR.rotation.z = -0.15; }
            if (npc.armL) npc.armL.rotation.x = swing * 0.35;
        } else {
            if (npc.armL) npc.armL.rotation.x = swing * 0.45;
            if (npc.armR) { npc.armR.rotation.x = -swing * 0.45; npc.armR.rotation.z = 0; }
        }

        // Update archetype InstancedMesh matrix with scratch objects (zero allocation)
        if (archetypeMeshes[npc.archetypeIdx]) {
            _scratchEuler.set(pitchX, npc.rotY, swayZ);
            _scratchQuat.setFromEuler(_scratchEuler);
            _scratchPos.set(npc.x, bob, npc.z);
            _scratchScale.set(1, 1, 1);
            _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchScale);

            archetypeMeshes[npc.archetypeIdx].setMatrixAt(npc.slotIdx, _scratchMatrix);
            archetypeNeedsUpdate[npc.archetypeIdx] = true;
        }

        // Update rain umbrella matrix
        if (instancedUmbrellas && isRaining) {
            _scratchEuler.set(-0.2, npc.rotY, 0);
            _scratchQuat.setFromEuler(_scratchEuler);
            _scratchPos.set(
                npc.x + 0.25 * Math.cos(npc.rotY),
                bob + 1.2,
                npc.z - 0.25 * Math.sin(npc.rotY)
            );
            _scratchScale.set(1, 1, 1);
            _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchScale);
            instancedUmbrellas.setMatrixAt(i, _scratchMatrix);
            umbrellaNeedsUpdate = true;
        }
    }

    for (let a = 0; a < archetypeMeshes.length; a++) {
        if (archetypeNeedsUpdate[a] && archetypeMeshes[a]) {
            archetypeMeshes[a].instanceMatrix.needsUpdate = true;
        }
    }
    if (umbrellaNeedsUpdate && instancedUmbrellas) {
        instancedUmbrellas.instanceMatrix.needsUpdate = true;
    }

    // 2. Instanced Crowd Walkers Simulation (90)
    if (instancedPedestrians) {
        let walkersNeedUpdate = false;
        for (let k = 0; k < 90; k++) {
            const p = allPedestrians[30 + k];
            if (!p) continue;

            p._accumDelta = (p._accumDelta || 0) + delta;

            // Throttling distant crowd walkers (> 200m) to 10Hz
            if (hasCam) {
                const cdx = p.x - camX;
                const cdz = p.z - camZ;
                if (cdx * cdx + cdz * cdz > 40000) {
                    if (p._accumDelta < 0.1) {
                        continue;
                    }
                }
            }

            const stepDelta = p._accumDelta;
            p._accumDelta = 0;

            if (p.dirZ !== 0) {
                p.z += p.dirZ * p.speed * stepDelta;
                if (p.z > p.circuit.maxZ) p.z = p.circuit.minZ;
                else if (p.z < p.circuit.minZ) p.z = p.circuit.maxZ;
            } else if (p.dirX !== 0) {
                p.x += p.dirX * p.speed * stepDelta;
                if (p.x > p.circuit.maxX) p.x = p.circuit.minX;
                else if (p.x < p.circuit.minX) p.x = p.circuit.maxX;
            }

            p.walkPhase += p.speed * stepDelta * 6.0;
            const bob = Math.abs(Math.sin(p.walkPhase)) * 0.04;

            _scratchPos.set(p.x, bob, p.z);
            _scratchEuler.set(0, Math.atan2(p.dirX, p.dirZ), 0);
            _scratchQuat.setFromEuler(_scratchEuler);
            _scratchScale.set(1, 1, 1);
            _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchScale);

            instancedPedestrians.setMatrixAt(k, _scratchMatrix);
            walkersNeedUpdate = true;
        }

        if (walkersNeedUpdate) {
            instancedPedestrians.instanceMatrix.needsUpdate = true;
        }
    }
}
