import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { applyVertexColor } from '../world/textures.js';
import { poiGateway } from '../landmarks/iconicLandmarks.js';

// ==========================================
// MARITIME TOURIST FERRY BOATS & HARBOR JETTY
// Gateway of India Harbor Corridor
// ==========================================

export const maritimeFerryBoats = [];

export function buildGatewayMaritime(scene) {
    maritimeFerryBoats.length = 0;
    const gx = poiGateway.x;
    const gy = poiGateway.y;
    const gz = poiGateway.z;

    // 1. Basalt Stone Jetty Pier & Steps
    const jettyMat = new THREE.MeshStandardMaterial({ color: 0xb58452, roughness: 0.85 });
    const jettyGeoms = [];

    const pier = new THREE.BoxGeometry(16, 0.6, 26);
    pier.translate(0, -0.3, -20);
    jettyGeoms.push(pier);

    for (let st = 0; st < 6; st++) {
        const step = new THREE.BoxGeometry(16, 0.15, 0.8);
        step.translate(0, -st * 0.1 - 0.05, -31.0 - st * 0.8);
        jettyGeoms.push(step);
    }

    [-7.5, 7.5].forEach(bx => {
        [-12, -18, -24, -30].forEach(bz => {
            const bollard = new THREE.CylinderGeometry(0.18, 0.22, 0.7, 8);
            bollard.translate(bx, 0.35, bz);
            jettyGeoms.push(bollard);
        });
    });

    const jettyMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(jettyGeoms), jettyMat);
    jettyMesh.position.set(gx, gy, gz);
    jettyMesh.receiveShadow = true;
    scene.add(jettyMesh);

    // 2. Iconic Mumbai Wooden Tourist Ferry Boats
    function createTouristFerryBoat(x, z, rotY, phase) {
        const boatParts = [];
        const baseHull = applyVertexColor(new THREE.BoxGeometry(3.6, 1.4, 7.5), 0xf8fafc);
        baseHull.translate(0, 0.7, 0);
        boatParts.push(baseHull);

        const bow = applyVertexColor(new THREE.CylinderGeometry(0.1, 1.8, 2.2, 4), 0xf8fafc);
        bow.rotateY(Math.PI / 4);
        bow.scale(1.0, 0.65, 1.4);
        bow.translate(0, 0.7, 4.6);
        boatParts.push(bow);

        const stripe = applyVertexColor(new THREE.BoxGeometry(3.7, 0.28, 9.0), 0x0284c7);
        stripe.translate(0, 0.5, 0);
        boatParts.push(stripe);

        const deck = applyVertexColor(new THREE.BoxGeometry(3.8, 0.15, 8.6), 0x78350f);
        deck.translate(0, 1.45, 0);
        boatParts.push(deck);

        const canopy = applyVertexColor(new THREE.BoxGeometry(3.8, 0.2, 7.2), 0xf59e0b);
        canopy.translate(0, 3.2, -0.4);
        boatParts.push(canopy);

        const mergedBoat = BufferGeometryUtils.mergeGeometries(boatParts, false);
        const boatMesh = new THREE.Mesh(mergedBoat, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
        const grp = new THREE.Group();
        grp.add(boatMesh);
        grp.position.set(x, -0.4, z);
        grp.rotation.y = rotY;
        scene.add(grp);

        maritimeFerryBoats.push({
            group: grp,
            baseX: x,
            baseZ: z,
            baseY: -0.4,
            baseRotY: rotY,
            phase,
            pitchSpeed: 1.8 + Math.random() * 0.4,
            rollSpeed: 2.2 + Math.random() * 0.5
        });
    }

    createTouristFerryBoat(gx - 18, gz - 35, 0.45, 0.2);
    createTouristFerryBoat(gx + 18, gz - 40, -0.38, 1.4);
    createTouristFerryBoat(gx - 45, gz - 70, 0.15, 2.7);
    createTouristFerryBoat(gx + 55, gz - 85, -0.22, 3.9);
}

export function updateMaritimeFerryBoats(delta, time) {
    for (let i = 0; i < maritimeFerryBoats.length; i++) {
        const boat = maritimeFerryBoats[i];
        const t = time + boat.phase;
        boat.group.position.y = boat.baseY + Math.sin(t * 2.0) * 0.18;
        boat.group.rotation.x = Math.sin(t * boat.pitchSpeed) * 0.045;
        boat.group.rotation.z = Math.cos(t * boat.rollSpeed) * 0.065;
    }
}
