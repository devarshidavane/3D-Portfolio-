import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { registerBoxCollider } from '../world/worldColliders.js';
import { LANDMARKS } from '../data/mumbaiGeography.js';

// ============================================================================
// LANDMARK: DEVARSHI'S HOME HQ (HIGH-FIDELITY 3D CYBER SKYSCRAPER)
// Anchor: Dharavi Koliwada, Mahim East (X: 6, Y: 0.15, Z: -14)
// High-fidelity GLB asset from sample.glb cleanly integrated as Home HQ.
// Calibrated footprint with zero road overlap and no procedural internal clipping.
// ============================================================================

export const poiHome = {
    x: 6.0,
    y: 0.15,
    z: -14.0,
    radius: 22
};

export function buildStarkTower(scene, cityBuildings = []) {
    const towerGroup = new THREE.Group();
    towerGroup.name = "StarkTowerHomeHQ";

    const tX = poiHome.x; // 6.0m (shifted to provide ample clearance from western road)
    const tY = poiHome.y; // 0.15m ground elevation
    const tZ = poiHome.z; // -14.0m (centered safely away from north and south roads)

    // 1. Ground Concourse Plaza
    // Sized to fit cleanly within the courtyard with generous road clearance on all sides
    const plazaGeom = new THREE.BoxGeometry(24, 0.1, 38);
    const plazaMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.75,
        metalness: 0.25
    });
    const plazaMesh = new THREE.Mesh(plazaGeom, plazaMat);
    plazaMesh.position.set(tX, tY + 0.05, tZ);
    plazaMesh.receiveShadow = true;
    towerGroup.add(plazaMesh);

    // Subtle Cyan LED Inlay Perimeter Border
    const borderGeom = new THREE.BoxGeometry(24.8, 0.04, 38.8);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const borderMesh = new THREE.Mesh(borderGeom, borderMat);
    borderMesh.position.set(tX, tY + 0.02, tZ);
    towerGroup.add(borderMesh);

    // South Entrance Approach Pedestrian Walkway connecting towards Dharavi Koliwada Boulevard
    const walkwayGeom = new THREE.BoxGeometry(6, 0.08, 9);
    const walkwayMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.7,
        metalness: 0.3
    });
    const walkwayMesh = new THREE.Mesh(walkwayGeom, walkwayMat);
    walkwayMesh.position.set(tX, tY + 0.04, tZ - 23);
    walkwayMesh.receiveShadow = true;
    towerGroup.add(walkwayMesh);

    // 2. Load and Integrate High-Fidelity Home HQ GLB Model
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('./public/models/homeHQ.glb', (gltf) => {
        const hqModel = gltf.scene;
        hqModel.name = "HomeHQ_GLB_Structure";

        // Orient model so its illuminated glass curtain facade faces the South approach
        hqModel.rotation.y = -Math.PI * 0.5;
        hqModel.updateMatrixWorld(true);

        // Measure rotated dimensions and scale to 95m skyscraper height
        const box = new THREE.Box3().setFromObject(hqModel);
        const size = box.getSize(new THREE.Vector3());
        const targetHeight = 95.0;
        const scale = targetHeight / size.y;
        hqModel.scale.set(scale, scale, scale);

        // Recompute scaled bounding box
        box.setFromObject(hqModel);
        const scaledMin = box.min;
        const scaledCenter = box.getCenter(new THREE.Vector3());

        // Center on concourse coordinates (tX: 6, tZ: -14) and align base to tY (0.15)
        hqModel.position.x = tX - scaledCenter.x;
        hqModel.position.y = tY - scaledMin.y;
        hqModel.position.z = tZ - scaledCenter.z;

        // Tune PBR materials and enable shadows
        hqModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    child.material.metalness = 0.15;
                    child.material.roughness = 0.55;
                    child.material.needsUpdate = true;
                }
            }
        });

        towerGroup.add(hqModel);

        // Register solid box collider around tower perimeter to prevent character walk-through
        const bFinal = new THREE.Box3().setFromObject(hqModel);
        registerBoxCollider(
            bFinal.min.x + 1.2, bFinal.max.x - 1.2,
            bFinal.min.z + 1.2, bFinal.max.z - 1.2,
            'HomeHQ_Tower_Main',
            -2.0, targetHeight
        );

        console.log(`⚡ [Home HQ] Clean GLB model loaded at (${tX}, ${tZ}), height: ${targetHeight}m. Zero road overlap.`);
    }, undefined, (err) => {
        console.warn("[Home HQ] GLTF load error for homeHQ.glb:", err);
    });

    // 3. Dedicated Architectural Facade Uplights
    [-12, 12].forEach(lx => {
        const uplight = new THREE.DirectionalLight(0x38bdf8, 1.2);
        uplight.position.set(tX + lx, tY + 4, tZ - 18);
        uplight.target.position.set(tX, 45, tZ);
        towerGroup.add(uplight);
        towerGroup.add(uplight.target);
    });
    const backLight = new THREE.DirectionalLight(0xffeedd, 0.9);
    backLight.position.set(tX, tY + 4, tZ + 18);
    backLight.target.position.set(tX, 45, tZ);
    towerGroup.add(backLight);
    towerGroup.add(backLight.target);

    // Warm entrance path lights
    [-3.5, 3.5].forEach(px => {
        const pLight = new THREE.PointLight(0x06b6d4, 1.8, 18);
        pLight.position.set(tX + px, tY + 2.0, tZ - 23);
        towerGroup.add(pLight);
    });

    scene.add(towerGroup);
    cityBuildings.push({ minX: tX - 15, maxX: tX + 15, minZ: tZ - 23, maxZ: tZ + 23, type: 'home_hq' });

    console.log("⚡ [Home HQ] Clean Home HQ initialized with GLB asset and dedicated concourse.");
    return towerGroup;
}
