import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { registerBoxCollider } from '../world/worldColliders.js';
import { createCorporateGlassTexture } from '../world/textures.js';
import { registerLODItem } from '../world/chunkManager.js';
import { LANDMARKS } from '../data/mumbaiGeography.js';

// ==========================================
// LANDMARK: DEVARSHI'S HOME HQ / STARK TOWER
// (Dharavi Koliwada, Mahim East: X = 0, Y = 8.0, Z = 0)
// 180m Cyber Skyscraper, Grand Atrium Lobby, Luxury Penthouse,
// Cybersecurity Command Lab, and Rooftop Flight Landing Pad
// ==========================================

export const poiHome = {
    x: LANDMARKS.home_hq ? LANDMARKS.home_hq.x : 0,
    y: LANDMARKS.home_hq ? LANDMARKS.home_hq.y : 8.0,
    z: LANDMARKS.home_hq ? LANDMARKS.home_hq.z : 0,
    radius: 25
};

export function buildStarkTower(scene, cityBuildings = []) {
    const towerGroup = new THREE.Group();
    towerGroup.name = "StarkTowerHomeHQ";

    const glassGeoms = [];
    const structGeoms = [];
    const glowGeoms = [];
    const floorGeoms = [];
    const interiorWallGeoms = [];
    const furnitureGeoms = [];

    function addBox(arr, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
        const geom = new THREE.BoxGeometry(w, h, d);
        if (rx !== 0) geom.rotateX(rx);
        if (ry !== 0) geom.rotateY(ry);
        if (rz !== 0) geom.rotateZ(rz);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    function addCyl(arr, x, y, z, rTop, rBot, h, seg = 16, rx = 0, ry = 0, rz = 0) {
        const geom = new THREE.CylinderGeometry(rTop, rBot, h, seg);
        if (rx !== 0) geom.rotateX(rx);
        if (ry !== 0) geom.rotateY(ry);
        if (rz !== 0) geom.rotateZ(rz);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    // Anchor at Dharavi Koliwada Origin
    const tX = poiHome.x;
    const tZ = poiHome.z;

    // ----------------------------------------------------
    // 1. EXTERIOR HIGH-RISE ARCHITECTURE (180m TOTAL HEIGHT)
    // ----------------------------------------------------

    // A. Grand Base Podium Atrium (Y = 0 to 16m)
    for (let a = Math.PI * 0.15; a <= Math.PI * 1.85; a += Math.PI * 0.12) {
        const px = tX + Math.sin(a) * 15.8;
        const pz = tZ + Math.cos(a) * 15.8;
        addBox(glassGeoms, px, 8, pz, 4.2, 16, 0.4, 0, a, 0);
    }

    // 8 Grand Titanium Structural Perimeter Columns
    for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const cx = tX + Math.sin(ang) * 16.2;
        const cz = tZ + Math.cos(ang) * 16.2;
        addCyl(structGeoms, cx, 8, cz, 0.65, 0.75, 16, 8);
    }

    // Grand Entrance Portal at South
    addBox(structGeoms, tX - 4.6, 6, tZ - 15.8, 0.6, 12, 1.2);
    addBox(structGeoms, tX + 4.6, 6, tZ - 15.8, 0.6, 12, 1.2);
    addBox(glowGeoms, tX, 11.8, tZ - 15.8, 9.6, 0.6, 1.3);

    // Cantilevered Grand Entrance Canopy
    addBox(structGeoms, tX, 6.2, tZ - 18.5, 11, 0.4, 6);
    addBox(glassGeoms, tX, 6.5, tZ - 18.5, 10.2, 0.1, 5.4);
    [-3.5, 0, 3.5].forEach(lx => {
        addCyl(glowGeoms, tX + lx, 6.0, tZ - 18.5, 0.4, 0.4, 0.1, 8);
    });

    // B. Aerodynamic Tower Shaft (Y = 16 to 120m)
    const shaftTiers = [
        { yBot: 16,  yTop: 36,  rBot: 15.0, rTop: 14.2, zOff: 0.0 },
        { yBot: 36,  yTop: 56,  rBot: 14.2, rTop: 13.5, zOff: 0.6 },
        { yBot: 56,  yTop: 76,  rBot: 13.5, rTop: 12.8, zOff: 1.2 },
        { yBot: 76,  yTop: 96,  rBot: 12.8, rTop: 12.0, zOff: 1.8 },
        { yBot: 96,  yTop: 116, rBot: 12.0, rTop: 11.2, zOff: 2.4 },
        { yBot: 116, yTop: 122, rBot: 11.2, rTop: 10.8, zOff: 3.0 }
    ];

    shaftTiers.forEach(tier => {
        const h = tier.yTop - tier.yBot;
        const cy = tier.yBot + h / 2;
        const cz = tZ + tier.zOff;
        addCyl(glassGeoms, tX, cy, cz, tier.rTop, tier.rBot, h, 24);
        addCyl(structGeoms, tX, tier.yBot, cz, tier.rBot + 0.25, tier.rBot + 0.25, 0.8, 24);
        addCyl(structGeoms, tX, tier.yTop, cz, tier.rTop + 0.25, tier.rTop + 0.25, 0.8, 24);
    });

    // 4 Titanium Aerodynamic Vertical Spine Ribs
    [-1, 1].forEach(sx => {
        const finGeom = new THREE.BoxGeometry(0.8, 168, 2.5);
        finGeom.translate(tX + sx * 13.2, 84, tZ + 2);
        structGeoms.push(finGeom);

        const neonStrip = new THREE.BoxGeometry(0.18, 168, 0.18);
        neonStrip.translate(tX + sx * 14.5, 84, tZ + 2);
        glowGeoms.push(neonStrip);
    });

    // C. Cantilevered Upper Flight Landing Pad & Armor Deck (Y = 120m)
    const deckY = 120.0;
    const deckLength = 36.0;
    const deckWidth = 30.0;
    const deckCenterZ = tZ - 14.0;

    addBox(structGeoms, tX, deckY - 0.6, deckCenterZ, deckWidth, 1.2, deckLength);
    addBox(floorGeoms, tX, deckY + 0.05, deckCenterZ, deckWidth - 0.8, 0.1, deckLength - 0.8);

    // Diagonal Space-Frame Support Trusses
    [-8, 0, 8].forEach(tx => {
        const truss = new THREE.BoxGeometry(0.8, 0.8, 26);
        truss.rotateX(-0.35);
        truss.translate(tX + tx, 115.5, deckCenterZ + 3);
        structGeoms.push(truss);
    });

    // Arc-Reactor Helipad Target on Deck
    const padOuter = new THREE.TorusGeometry(8.5, 0.25, 6, 32);
    padOuter.rotateX(Math.PI / 2);
    padOuter.translate(tX, deckY + 0.15, deckCenterZ);
    glowGeoms.push(padOuter);

    const padInner = new THREE.TorusGeometry(4.5, 0.2, 6, 32);
    padInner.rotateX(Math.PI / 2);
    padInner.translate(tX, deckY + 0.15, deckCenterZ);
    glowGeoms.push(padInner);

    addBox(glowGeoms, tX, deckY + 0.15, deckCenterZ, 6.0, 0.08, 0.6);
    addBox(glowGeoms, tX, deckY + 0.15, deckCenterZ, 0.6, 0.08, 6.0);

    for (let r = 0; r < 16; r++) {
        const rad = (r / 16) * Math.PI * 2;
        const rx = tX + Math.sin(rad) * 11.5;
        const rz = deckCenterZ + Math.cos(rad) * 11.5;
        addCyl(glowGeoms, rx, deckY + 0.2, rz, 0.25, 0.25, 0.15, 8);
    }

    // Flight Deck Balustrade
    addBox(glassGeoms, tX - deckWidth / 2 + 0.3, deckY + 0.7, deckCenterZ, 0.2, 1.4, deckLength);
    addBox(structGeoms, tX - deckWidth / 2 + 0.3, deckY + 1.4, deckCenterZ, 0.3, 0.1, deckLength);
    addBox(glassGeoms, tX + deckWidth / 2 - 0.3, deckY + 0.7, deckCenterZ, 0.2, 1.4, deckLength);
    addBox(structGeoms, tX + deckWidth / 2 - 0.3, deckY + 1.4, deckCenterZ, 0.3, 0.1, deckLength);
    addBox(glassGeoms, tX, deckY + 0.7, deckCenterZ - deckLength / 2 + 0.3, deckWidth, 1.4, 0.2);
    addBox(structGeoms, tX, deckY + 1.4, deckCenterZ - deckLength / 2 + 0.3, deckWidth, 0.1, 0.3);

    // D. Architectural Tower Crown & Communications Spire Needle (180m)
    const crownFin1 = new THREE.ConeGeometry(9.5, 48, 16);
    crownFin1.rotateX(0.12);
    crownFin1.translate(tX, 144, tZ + 4);
    glassGeoms.push(crownFin1);

    const crownSpandrel = new THREE.CylinderGeometry(4.5, 8.5, 28, 16);
    crownSpandrel.translate(tX, 154, tZ + 3);
    structGeoms.push(crownSpandrel);

    addCyl(structGeoms, tX, 174, tZ + 2.5, 0.08, 0.75, 12, 8);
    addCyl(glowGeoms, tX, 180.1, tZ + 2.5, 0.45, 0.45, 0.6, 8);

    // E. Giant Glowing Cyan Lettermark 'D' (Devarshi Davane)
    addBox(glowGeoms, tX - 4.5, 145, tZ - 4.5, 1.8, 15.0, 0.9);
    addBox(glowGeoms, tX - 0.5, 151.6, tZ - 4.5, 6.2, 1.8, 0.9);
    addBox(glowGeoms, tX - 0.5, 138.4, tZ - 4.5, 6.2, 1.8, 0.9);
    addCyl(glowGeoms, tX + 2.6, 145, tZ - 4.5, 6.5, 6.5, 0.9, 16, Math.PI / 2);

    // F. Collar Sign: "HOME HQ"
    const collarCanvas = document.createElement('canvas');
    collarCanvas.width = 1024;
    collarCanvas.height = 256;
    const colCtx = collarCanvas.getContext('2d');
    colCtx.fillStyle = '#0a0f1d';
    colCtx.fillRect(0, 0, 1024, 256);
    colCtx.strokeStyle = '#06b6d4';
    colCtx.lineWidth = 6;
    colCtx.strokeRect(10, 10, 1004, 236);
    colCtx.fillStyle = '#ffffff';
    colCtx.font = 'bold 96px "JetBrains Mono", sans-serif';
    colCtx.textAlign = 'center';
    colCtx.textBaseline = 'middle';
    colCtx.shadowColor = '#38bdf8';
    colCtx.shadowBlur = 24;
    colCtx.fillText('HOME HQ • DHARAVI', 512, 128);
    const collarTex = new THREE.CanvasTexture(collarCanvas);
    const collarMat = new THREE.MeshBasicMaterial({ map: collarTex, side: THREE.DoubleSide });
    const collarSign = new THREE.Mesh(new THREE.CylinderGeometry(11.2, 11.2, 5.2, 32, 1, true, Math.PI * 0.72, Math.PI * 0.56), collarMat);
    collarSign.position.set(tX, 134, tZ);
    towerGroup.add(collarSign);

    // ----------------------------------------------------
    // 2. COMPLETE WALKABLE INTERIORS & 4 LEVEL ARCHITECTURE
    // ----------------------------------------------------

    // Central Turbo-Lift Shaft
    addBox(interiorWallGeoms, tX, 61, tZ + 9, 8.5, 122, 5.0);
    [0, 40, 80, 120].forEach(alt => {
        addBox(furnitureGeoms, tX - 1.1, alt + 1.8, tZ + 6.6, 1.8, 3.6, 0.2);
        addBox(furnitureGeoms, tX + 1.1, alt + 1.8, tZ + 6.6, 1.8, 3.6, 0.2);
        addBox(glowGeoms, tX, alt + 3.7, tZ + 6.7, 4.2, 0.35, 0.1);
        addBox(glowGeoms, tX - 2.1, alt + 1.8, tZ + 6.7, 0.3, 3.6, 0.1);
        addBox(glowGeoms, tX + 2.1, alt + 1.8, tZ + 6.7, 0.3, 3.6, 0.1);
        addBox(glowGeoms, tX, alt + 4.1, tZ + 6.75, 1.8, 0.45, 0.08);
    });

    // Level 1: Lobby
    addCyl(floorGeoms, tX, 0.06, tZ, 16.0, 16.0, 0.2, 32);
    addBox(furnitureGeoms, tX, 1.1, tZ - 6, 8.4, 1.2, 1.8);
    addBox(glowGeoms, tX, 2.1, tZ - 6, 6.2, 0.7, 0.08);

    [-3, -1, 1, 3].forEach(gx => {
        addBox(furnitureGeoms, tX + gx, 0.8, tZ - 2, 0.35, 1.2, 2.0);
        addBox(glowGeoms, tX + gx, 1.1, tZ - 2, 0.15, 0.6, 1.6);
    });

    [-8, 8].forEach(px => {
        addCyl(furnitureGeoms, tX + px, 0.6, tZ - 4, 2.2, 2.4, 0.9, 16);
        addCyl(furnitureGeoms, tX + px, 3.2, tZ - 4, 0.22, 0.35, 4.5, 8);
        addCyl(furnitureGeoms, tX + px, 5.5, tZ - 4, 2.5, 0.1, 1.4, 8);
        const uplight = new THREE.TorusGeometry(2.3, 0.1, 6, 16);
        uplight.rotateX(Math.PI / 2);
        uplight.translate(tX + px, 0.9, tZ - 4);
        glowGeoms.push(uplight);
    });

    // Register Colliders
    registerBoxCollider(tX - 16.5, tX - 4.5, tZ - 16.5, tZ - 15.0, 'StarkL1FrontWallL', -2, 14);
    registerBoxCollider(tX + 4.5, tX + 16.5, tZ - 16.5, tZ - 15.0, 'StarkL1FrontWallR', -2, 14);
    registerBoxCollider(tX - 16.5, tX - 14.8, tZ - 16.5, tZ + 16.5, 'StarkL1WestWall', -2, 14);
    registerBoxCollider(tX + 14.8, tX + 16.5, tZ - 16.5, tZ + 16.5, 'StarkL1EastWall', -2, 14);
    registerBoxCollider(tX - 16.5, tX + 16.5, tZ + 14.8, tZ + 16.5, 'StarkL1NorthWall', -2, 14);
    registerBoxCollider(tX - 4.5, tX + 4.5, tZ - 7.0, tZ - 5.0, 'StarkL1Desk', -2, 14);
    registerBoxCollider(tX - 4.2, tX + 4.2, tZ + 6.0, tZ + 9.5, 'StarkL1ElevatorShaft', -2, 14);

    // Level 2: Penthouse (Y = 40m)
    const l2Y = 40.0;
    addBox(floorGeoms, tX, l2Y + 0.05, tZ, 24, 0.2, 24);
    addBox(glassGeoms, tX - 12.0, l2Y + 3.0, tZ, 0.2, 6.0, 24);
    addBox(glassGeoms, tX + 12.0, l2Y + 3.0, tZ, 0.2, 6.0, 24);
    addBox(glassGeoms, tX, l2Y + 3.0, tZ - 12.0, 24, 6.0, 0.2);
    addBox(glassGeoms, tX, l2Y + 3.0, tZ + 12.0, 24, 6.0, 0.2);

    registerBoxCollider(tX - 12.5, tX - 11.5, tZ - 12.5, tZ + 12.5, 'StarkL2W', 38, 55);
    registerBoxCollider(tX + 11.5, tX + 12.5, tZ - 12.5, tZ + 12.5, 'StarkL2E', 38, 55);
    registerBoxCollider(tX - 12.5, tX + 12.5, tZ - 12.5, tZ - 11.5, 'StarkL2S', 38, 55);
    registerBoxCollider(tX - 12.5, tX + 12.5, tZ + 11.5, tZ + 12.5, 'StarkL2N', 38, 55);
    registerBoxCollider(tX - 4.2, tX + 4.2, tZ + 6.0, tZ + 9.5, 'StarkL2ElevatorShaft', 38, 55);

    // Level 3: Cyber Lab (Y = 80m)
    const l3Y = 80.0;
    addBox(floorGeoms, tX, l3Y + 0.05, tZ, 24, 0.2, 24);
    addBox(glassGeoms, tX - 12.0, l3Y + 3.0, tZ, 0.2, 6.0, 24);
    addBox(glassGeoms, tX + 12.0, l3Y + 3.0, tZ, 0.2, 6.0, 24);
    addBox(glassGeoms, tX, l3Y + 3.0, tZ - 12.0, 24, 6.0, 0.2);
    addBox(glassGeoms, tX, l3Y + 3.0, tZ + 12.0, 24, 6.0, 0.2);

    addBox(furnitureGeoms, tX, l3Y + 1.0, tZ - 4, 7.2, 1.0, 2.6);
    addBox(glowGeoms, tX, l3Y + 2.2, tZ - 4.9, 2.6, 1.3, 0.08);

    registerBoxCollider(tX - 12.5, tX - 11.5, tZ - 12.5, tZ + 12.5, 'StarkL3W', 78, 95);
    registerBoxCollider(tX + 11.5, tX + 12.5, tZ - 12.5, tZ + 12.5, 'StarkL3E', 78, 95);
    registerBoxCollider(tX - 12.5, tX + 12.5, tZ - 12.5, tZ - 11.5, 'StarkL3S', 78, 95);
    registerBoxCollider(tX - 12.5, tX + 12.5, tZ + 11.5, tZ + 12.5, 'StarkL3N', 78, 95);
    registerBoxCollider(tX - 4.2, tX + 4.2, tZ + 6.0, tZ + 9.5, 'StarkL3ElevatorShaft', 78, 95);

    // Level 4: Flight Pad (Y = 120m)
    addBox(structGeoms, tX, deckY + 2.5, tZ + 6.5, 7.5, 5.0, 4.0);
    addBox(glassGeoms, tX, deckY + 2.0, tZ + 4.4, 4.2, 3.8, 0.2);

    registerBoxCollider(tX - deckWidth / 2 - 0.5, tX - deckWidth / 2 + 0.8, deckCenterZ - deckLength / 2, deckCenterZ + deckLength / 2, 'StarkL4BalustradeW', 118, 135);
    registerBoxCollider(tX + deckWidth / 2 - 0.8, tX + deckWidth / 2 + 0.5, deckCenterZ - deckLength / 2, deckCenterZ + deckLength / 2, 'StarkL4BalustradeE', 118, 135);
    registerBoxCollider(tX - 4.0, tX + 4.0, tZ + 4.5, tZ + 9.0, 'StarkL4Vestibule', 118, 135);

    // Skyscraper Shaft Boundary Colliders
    registerBoxCollider(tX - 16.5, tX - 14.5, tZ - 16.5, tZ + 16.5, 'StarkTowerShaftW', 14, 120);
    registerBoxCollider(tX + 14.5, tX + 16.5, tZ - 16.5, tZ + 16.5, 'StarkTowerShaftE', 14, 120);
    registerBoxCollider(tX - 16.5, tX + 16.5, tZ - 16.5, tZ - 14.5, 'StarkTowerShaftS', 14, 120);
    registerBoxCollider(tX - 16.5, tX + 16.5, tZ + 14.5, tZ + 16.5, 'StarkTowerShaftN', 14, 120);

    // ----------------------------------------------------
    // 3. UNIFIED GEOMETRY MERGE & MESH CREATION
    // ----------------------------------------------------
    const corporateGlassTex = createCorporateGlassTexture();
    corporateGlassTex.repeat.set(4, 18);

    const starkGlassMat = new THREE.MeshStandardMaterial({
        map: corporateGlassTex,
        color: 0x0284c7,
        roughness: 0.12,
        metalness: 0.88
    });

    const starkMetalMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        emissive: 0x0f172a,
        emissiveIntensity: 0.25,
        roughness: 0.35,
        metalness: 0.8
    });

    const starkGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const starkFloorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3 });
    const starkInteriorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.25 });

    if (glassGeoms.length > 0) {
        towerGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(glassGeoms), starkGlassMat));
    }
    if (structGeoms.length > 0) {
        towerGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(structGeoms), starkMetalMat));
    }
    if (glowGeoms.length > 0) {
        towerGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(glowGeoms), starkGlowMat));
    }
    if (floorGeoms.length > 0) {
        towerGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(floorGeoms), starkFloorMat));
    }
    if (interiorWallGeoms.length > 0) {
        const wallMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(interiorWallGeoms), starkMetalMat);
        towerGroup.add(wallMesh);
        registerLODItem(wallMesh, 0, 180);
    }
    if (furnitureGeoms.length > 0) {
        const furnMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(furnitureGeoms), starkInteriorMat);
        towerGroup.add(furnMesh);
        registerLODItem(furnMesh, 0, 140);
    }

    scene.add(towerGroup);
    cityBuildings.push({ minX: tX - 16, maxX: tX + 16, minZ: tZ - 16, maxZ: tZ + 16, type: 'stark_tower' });
    return towerGroup;
}
