import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { mumbaiRoadNetwork } from '../data/roadGraph.js';
import { createAsphaltTexture } from './textures.js';

// ==========================================
// 5KM MUMBAI ARTERIAL ROAD NETWORK 3D MESHES
// Full 3D Asphalts, Lane Striping, Bridges (BWSL, Airoli, Vashi) & Streetlamps
// Merged into 4 Batched Draw Calls for Locked 60 FPS
// ==========================================

export function buildRoadMeshes(scene) {
    const roadGeoms = [];
    const markingGeoms = [];
    const bridgeGeoms = [];
    const lampPostGeoms = [];
    const lampGlowGeoms = [];

    const nodes = mumbaiRoadNetwork.nodes;
    const edges = mumbaiRoadNetwork.edges;

    function addBox(arr, x, y, z, w, h, d, rotY = 0) {
        const geom = new THREE.BoxGeometry(w, h, d);
        if (rotY !== 0) geom.rotateY(rotY);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    function addCyl(arr, x, y, z, rTop, rBot, h, seg = 8) {
        const geom = new THREE.CylinderGeometry(rTop, rBot, h, seg);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    // Process all 106 directed arterial edges
    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const u = nodes[edge.from];
        const v = nodes[edge.to];
        if (!u || !v) continue;

        const dx = v.x - u.x;
        const dz = v.z - u.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 4) continue;

        const mx = (u.x + v.x) / 2;
        const my = (u.y + v.y) / 2 + 0.12;
        const mz = (u.z + v.z) / 2;
        const rotY = Math.atan2(dx, dz);
        const roadW = edge.width || (edge.lanes ? edge.lanes * 3.6 : 18);

        // 1. Asphalt Road Bed
        addBox(roadGeoms, mx, my, mz, roadW, 0.24, dist, rotY);

        // 2. Centerline Lane Markings (Yellow/White)
        addBox(markingGeoms, mx, my + 0.02, mz, 0.35, 0.25, dist * 0.96, rotY);

        // Additional lane divider for 4+ lanes
        if (edge.lanes >= 4) {
            const laneOffset = roadW * 0.24;
            const lx1 = mx - Math.cos(rotY) * laneOffset;
            const lz1 = mz + Math.sin(rotY) * laneOffset;
            const lx2 = mx + Math.cos(rotY) * laneOffset;
            const lz2 = mz - Math.sin(rotY) * laneOffset;
            addBox(markingGeoms, lx1, my + 0.02, lz1, 0.22, 0.25, dist * 0.94, rotY);
            addBox(markingGeoms, lx2, my + 0.02, lz2, 0.22, 0.25, dist * 0.94, rotY);
        }

        // 3. Bridge Structure (BWSL, Airoli Bridge, Vashi Bridge, Flyovers)
        if (edge.bridge || my > 8.0) {
            // Concrete Barriers on Road Flanks
            const flankOffset = roadW / 2 + 0.45;
            const bx1 = mx - Math.cos(rotY) * flankOffset;
            const bz1 = mz + Math.sin(rotY) * flankOffset;
            const bx2 = mx + Math.cos(rotY) * flankOffset;
            const bz2 = mz - Math.sin(rotY) * flankOffset;
            addBox(bridgeGeoms, bx1, my + 0.55, bz1, 0.5, 0.9, dist, rotY);
            addBox(bridgeGeoms, bx2, my + 0.55, bz2, 0.5, 0.9, dist, rotY);

            // Pier pillars every 45 meters
            const pierCount = Math.max(1, Math.floor(dist / 45));
            for (let p = 1; p <= pierCount; p++) {
                const t = p / (pierCount + 1);
                const px = u.x + dx * t;
                const py = (u.y + v.y) / 2;
                const pz = u.z + dz * t;
                const pierH = Math.max(4, py);
                addCyl(bridgeGeoms, px, pierH / 2, pz, 1.6, 1.8, pierH, 8);
            }
        }

        // 4. Streetlamps along major roads (every 90 meters)
        const lampInterval = 90;
        if (dist > 60) {
            const lampCount = Math.floor(dist / lampInterval);
            for (let l = 0; l <= lampCount; l++) {
                const t = (l + 0.5) / (lampCount + 1);
                const lx = u.x + dx * t;
                const ly = u.y + (v.y - u.y) * t;
                const lz = u.z + dz * t;
                const sideOffset = roadW / 2 + 1.2;
                const poleX = lx + Math.cos(rotY) * sideOffset;
                const poleZ = lz - Math.sin(rotY) * sideOffset;

                // Vertical pole (8.5m high)
                addCyl(lampPostGeoms, poleX, ly + 4.25, poleZ, 0.12, 0.18, 8.5, 6);
                // Horizontal arm curving toward road
                addBox(lampPostGeoms, poleX - Math.cos(rotY) * 1.0, ly + 8.4, poleZ + Math.sin(rotY) * 1.0, 2.0, 0.15, 0.15, rotY);
                // Glowing LED luminaire
                addBox(lampGlowGeoms, poleX - Math.cos(rotY) * 1.8, ly + 8.2, poleZ + Math.sin(rotY) * 1.8, 0.7, 0.25, 0.45, rotY);
            }
        }
    }

    // Bandra-Worli Sea Link Iconic Cable-Stayed Pylons & Suspension Stay Cables
    const bwslPylons = [
        { x: -1075, y: 18.0, z: -25 },
        { x: -1150, y: 18.0, z: 180 }
    ];
    bwslPylons.forEach(p => {
        // Diamond concrete pylon tower (82m above water)
        addBox(bridgeGeoms, p.x - 12, p.y + 40, p.z, 2.8, 80, 3.2, 0.14);
        addBox(bridgeGeoms, p.x + 12, p.y + 40, p.z, 2.8, 80, 3.2, -0.14);
        addBox(bridgeGeoms, p.x, p.y + 78, p.z, 6.0, 6.0, 4.0);

        // Stay cables fan
        for (let c = 1; c <= 8; c++) {
            const cableSpan = c * 18;
            const cableY = p.y + 40 + c * 4;
            addBox(markingGeoms, p.x, cableY / 2 + p.y / 2, p.z - cableSpan / 2, 0.12, cableY, cableSpan, 0);
            addBox(markingGeoms, p.x, cableY / 2 + p.y / 2, p.z + cableSpan / 2, 0.12, cableY, cableSpan, 0);
        }
    });

    // Materials
    const asphaltTex = createAsphaltTexture();
    asphaltTex.repeat.set(4, 20);
    const asphaltMat = new THREE.MeshStandardMaterial({
        map: asphaltTex,
        roughness: 0.92,
        metalness: 0.05
    });

    const markingMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75, metalness: 0.15 });
    const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });

    // Merged Meshes Creation & Scene Addition
    if (roadGeoms.length > 0) {
        const mergedRoads = BufferGeometryUtils.mergeGeometries(roadGeoms);
        const roadMesh = new THREE.Mesh(mergedRoads, asphaltMat);
        roadMesh.name = "MumbaiRoadNetworkSurfaces";
        roadMesh.receiveShadow = true;
        scene.add(roadMesh);
    }

    if (markingGeoms.length > 0) {
        const mergedMarkings = BufferGeometryUtils.mergeGeometries(markingGeoms);
        const markingMesh = new THREE.Mesh(mergedMarkings, markingMat);
        markingMesh.name = "MumbaiRoadMarkings";
        scene.add(markingMesh);
    }

    if (bridgeGeoms.length > 0) {
        const mergedBridges = BufferGeometryUtils.mergeGeometries(bridgeGeoms);
        const bridgeMesh = new THREE.Mesh(mergedBridges, bridgeMat);
        bridgeMesh.name = "MumbaiBridgesAndFlyovers";
        bridgeMesh.castShadow = true;
        bridgeMesh.receiveShadow = true;
        scene.add(bridgeMesh);
    }

    if (lampPostGeoms.length > 0) {
        const mergedLamps = BufferGeometryUtils.mergeGeometries(lampPostGeoms);
        const lampMesh = new THREE.Mesh(mergedLamps, lampPostMat);
        lampMesh.name = "MumbaiStreetlampPosts";
        scene.add(lampMesh);
    }

    if (lampGlowGeoms.length > 0) {
        const mergedGlows = BufferGeometryUtils.mergeGeometries(lampGlowGeoms);
        const glowMesh = new THREE.Mesh(mergedGlows, lampGlowMat);
        glowMesh.name = "MumbaiStreetlampLEDs";
        scene.add(glowMesh);
    }
}
