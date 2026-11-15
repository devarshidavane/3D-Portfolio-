import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { applyVertexColor } from '../world/textures.js';

// ==========================================
// PEDESTRIAN SIMULATION (120 PEDESTRIANS)
// 30 Detailed Bi-Pedal Articulated Rigs + 90 Instanced Crowd Walkers
// ==========================================

export const npcs = [];
export const allPedestrians = [];

let instancedPedestrians = null;
let pedDummy = null;

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

function createArticulatedPedestrian(cfg) {
    const group = new THREE.Group();
    const skinHex = skinColors[cfg.skinIdx % skinColors.length];
    const shirtHex = shirtColors[cfg.shirtIdx % shirtColors.length];
    const pantsHex = pantsColors[cfg.pantsIdx % pantsColors.length];
    const hairHex = hairColors[cfg.hairIdx % hairColors.length];

    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsHex, roughness: 0.85 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.9 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.24), shirtMat);
    torso.position.y = 1.18;
    torso.castShadow = true;
    group.add(torso);

    // Head & Hair
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
    head.position.y = 1.68;
    head.castShadow = true;
    group.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.y = 1.70;
    group.add(hair);

    // Arms
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

    // Rain Umbrella
    const umbrellaGroup = new THREE.Group();
    umbrellaGroup.visible = false;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.95, 6), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    shaft.position.y = 0.45;
    umbrellaGroup.add(shaft);

    const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 0.28, 10, 1, true),
        new THREE.MeshStandardMaterial({ color: umbrellaColors[cfg.umbrellaIdx % umbrellaColors.length], side: THREE.DoubleSide })
    );
    canopy.position.y = 0.9;
    umbrellaGroup.add(canopy);

    umbrellaGroup.position.set(0, -0.45, 0.08);
    armR.add(umbrellaGroup);

    return { group, armL, armR, legL, legR, umbrellaGroup, walkCycle: Math.random() * Math.PI * 2 };
}

export function buildPedestrianSimulation(scene) {
    npcs.length = 0;
    allPedestrians.length = 0;

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
        scene.add(p.group);

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
            speed: 1.1 + (idx % 5) * 0.18
        };
        npcs.push(npcObj);
        allPedestrians.push(npcObj);
    });

    // 2. 90 Instanced Crowd Walkers
    const instGeom = new THREE.BoxGeometry(0.42, 1.68, 0.24);
    const instMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.65 });
    instancedPedestrians = new THREE.InstancedMesh(instGeom, instMat, 90);
    instancedPedestrians.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedPedestrians);

    pedDummy = new THREE.Object3D();
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

        pedDummy.position.set(curX, 0, curZ);
        pedDummy.rotation.y = Math.atan2(circ.dirX, circ.dirZ);
        pedDummy.updateMatrix();
        instancedPedestrians.setMatrixAt(k, pedDummy.matrix);

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
            walkPhase: Math.random() * Math.PI * 2
        });
    }
    instancedPedestrians.instanceMatrix.needsUpdate = true;
}

export function updatePedestrianSimulation(delta, weatherMode = 'clear') {
    if (!allPedestrians || allPedestrians.length === 0) return;
    const isRaining = (weatherMode === 'rain' || weatherMode === 'storm');

    for (let i = 0; i < npcs.length; i++) {
        const npc = npcs[i];
        const target = npc.waypoints[npc.wpIdx];
        const dx = target.x - npc.group.position.x;
        const dz = target.z - npc.group.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.8) {
            npc.wpIdx = (npc.wpIdx + 1) % npc.waypoints.length;
        } else {
            const nx = dx / dist;
            const nz = dz / dist;
            npc.group.position.x += nx * npc.speed * delta;
            npc.group.position.z += nz * npc.speed * delta;

            const targetRot = Math.atan2(nx, nz);
            let diff = (targetRot - npc.group.rotation.y) % (Math.PI * 2);
            if (diff < -Math.PI) diff += Math.PI * 2;
            if (diff > Math.PI) diff -= Math.PI * 2;
            npc.group.rotation.y += diff * 0.15;
        }

        npc.walkCycle += delta * npc.speed * 4.4;
        const swing = Math.sin(npc.walkCycle);
        if (npc.legL) npc.legL.rotation.x = -swing * 0.52;
        if (npc.legR) npc.legR.rotation.x = swing * 0.52;
        npc.group.position.y = Math.abs(Math.sin(npc.walkCycle * 2)) * 0.06;

        if (npc.umbrellaGroup) npc.umbrellaGroup.visible = isRaining;
        if (isRaining) {
            if (npc.armR) { npc.armR.rotation.x = -Math.PI / 3; npc.armR.rotation.z = -0.15; }
            if (npc.armL) npc.armL.rotation.x = swing * 0.35;
        } else {
            if (npc.armL) npc.armL.rotation.x = swing * 0.45;
            if (npc.armR) { npc.armR.rotation.x = -swing * 0.45; npc.armR.rotation.z = 0; }
        }
    }

    if (instancedPedestrians && pedDummy) {
        for (let k = 0; k < 90; k++) {
            const p = allPedestrians[30 + k];
            if (!p) continue;
            if (p.dirZ !== 0) {
                p.z += p.dirZ * p.speed * delta;
                if (p.z > p.circuit.maxZ) p.z = p.circuit.minZ;
                else if (p.z < p.circuit.minZ) p.z = p.circuit.maxZ;
            } else if (p.dirX !== 0) {
                p.x += p.dirX * p.speed * delta;
                if (p.x > p.circuit.maxX) p.x = p.circuit.minX;
                else if (p.x < p.circuit.minX) p.x = p.circuit.maxX;
            }

            p.walkPhase += p.speed * delta * 6.0;
            const bob = Math.abs(Math.sin(p.walkPhase)) * 0.04;

            pedDummy.position.set(p.x, bob, p.z);
            pedDummy.rotation.y = Math.atan2(p.dirX, p.dirZ);
            pedDummy.updateMatrix();
            instancedPedestrians.setMatrixAt(k, pedDummy.matrix);
        }
        instancedPedestrians.instanceMatrix.needsUpdate = true;
    }
}
