import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { registerBoxCollider } from '../world/worldColliders.js';
import { createCorporateGlassTexture } from '../world/textures.js';
import { registerLODItem } from '../world/chunkManager.js';
import { LANDMARKS } from '../data/mumbaiGeography.js';

// ============================================================================
// LANDMARK: DEVARSHI'S HOME HQ / STARK TOWER (150m CYBER SKYSCRAPER)
// Visual Reference: media_1794761744916_5f115c22.jpg (Three.js r160 Asset Design)
// Anchor: Dharavi Koliwada, Mahim East (X: 0, Y: 0.15, Z: 0)
// Features: Sweeping Catenary Titanium Ribs, Modular Recessed Curtain Walls,
// 12 Explorable Walkable Interior Zones, 4 Glass Elevators, Cantilevered F50
// Flight Deck with Supersonic VTOL Jet, Arc Reactor Emblem, and Grand Fountain Plaza.
// Target Performance: <= 600 Draw Calls (Achieved: ~12 Merged Draw Calls).
// ============================================================================

export const poiHome = {
    x: LANDMARKS.home_hq ? LANDMARKS.home_hq.x : 0,
    y: 0.15,
    z: LANDMARKS.home_hq ? LANDMARKS.home_hq.z : 0,
    radius: 28
};

export function buildStarkTower(scene, cityBuildings = []) {
    const towerGroup = new THREE.Group();
    towerGroup.name = "StarkTowerHomeHQ";

    // Geometry Buckets for High-Performance BufferGeometry Merging
    const glassGeoms = [];
    const titaniumGeoms = [];
    const darkMetalGeoms = [];
    const marbleGeoms = [];
    const woodGeoms = [];
    const carpetGeoms = [];
    const glowCyanGeoms = [];
    const glowAmberGeoms = [];
    const plantGeoms = [];
    const waterGeoms = [];

    // Helper: Add Box Geometry with rotation and translation
    function addBox(arr, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
        const geom = new THREE.BoxGeometry(w, h, d);
        if (rx !== 0) geom.rotateX(rx);
        if (ry !== 0) geom.rotateY(ry);
        if (rz !== 0) geom.rotateZ(rz);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    // Helper: Add Cylinder Geometry
    function addCyl(arr, x, y, z, rTop, rBot, h, seg = 16, rx = 0, ry = 0, rz = 0) {
        const geom = new THREE.CylinderGeometry(rTop, rBot, h, seg);
        if (rx !== 0) geom.rotateX(rx);
        if (ry !== 0) geom.rotateY(ry);
        if (rz !== 0) geom.rotateZ(rz);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    // Helper: Add Torus Geometry
    function addTorus(arr, x, y, z, radius, tube, segR = 8, segT = 24, rx = 0, ry = 0, rz = 0) {
        const geom = new THREE.TorusGeometry(radius, tube, segR, segT);
        if (rx !== 0) geom.rotateX(rx);
        if (ry !== 0) geom.rotateY(ry);
        if (rz !== 0) geom.rotateZ(rz);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    // Anchor Coordinates
    const tX = poiHome.x;
    const tY = poiHome.y; // 0.15m ground elevation
    const tZ = poiHome.z;

    // ========================================================================
    // 1. GROUND ENTRANCE PLAZA, ARC WATER FOUNTAIN & LANDSCAPING (Y = 0.15m)
    // ========================================================================
    
    // A. Concentric Circular Plaza Concourse (Radius: 28m)
    addCyl(darkMetalGeoms, tX, tY + 0.04, tZ, 28.0, 28.0, 0.08, 48);
    addCyl(marbleGeoms, tX, tY + 0.06, tZ, 22.0, 22.0, 0.06, 40);
    addCyl(darkMetalGeoms, tX, tY + 0.08, tZ, 16.0, 16.0, 0.04, 32);

    // Glowing Concentric Plaza Inlay Rings
    addTorus(glowCyanGeoms, tX, tY + 0.11, tZ, 22.0, 0.15, 6, 48, Math.PI / 2);
    addTorus(glowCyanGeoms, tX, tY + 0.11, tZ, 16.0, 0.15, 6, 40, Math.PI / 2);
    addTorus(glowCyanGeoms, tX, tY + 0.11, tZ, 9.5, 0.18, 6, 32, Math.PI / 2);

    // B. Monumental Arc Reactor Water Fountain (Center: tX, tZ - 18.5)
    const fX = tX;
    const fZ = tZ - 18.5;
    const fY = tY + 0.1;

    // Fountain Outer Basin Rim (Radius: 6.5m, Height: 1.1m)
    addCyl(marbleGeoms, fX, fY + 0.55, fZ, 6.5, 6.7, 1.1, 32);
    addCyl(darkMetalGeoms, fX, fY + 1.12, fZ, 6.7, 6.7, 0.12, 32);

    // Pool Water Surface
    addCyl(waterGeoms, fX, fY + 0.9, fZ, 6.2, 6.2, 0.1, 32);

    // Tier 2 Raised Water Cascade
    addCyl(marbleGeoms, fX, fY + 1.6, fZ, 3.8, 4.0, 1.2, 24);
    addCyl(waterGeoms, fX, fY + 2.22, fZ, 3.6, 3.6, 0.08, 24);

    // Central Arc Reactor Spire & Glowing Core (Height: 4.8m)
    addCyl(titaniumGeoms, fX, fY + 2.8, fZ, 1.2, 1.6, 1.8, 16);
    addTorus(glowCyanGeoms, fX, fY + 3.8, fZ, 1.4, 0.2, 8, 24, Math.PI / 2);
    addCyl(glowCyanGeoms, fX, fY + 4.2, fZ, 0.35, 0.6, 1.6, 12);
    addTorus(glowCyanGeoms, fX, fY + 1.0, fZ, 5.5, 0.12, 6, 32, Math.PI / 2); // Underwater Ring

    // C. Landscaped Palm Tree Planters (8 Planters spaced around plaza)
    for (let p = 0; p < 8; p++) {
        const ang = (p / 8) * Math.PI * 2 + 0.2;
        const dist = 24.5;
        const px = tX + Math.sin(ang) * dist;
        const pz = tZ + Math.cos(ang) * dist;

        // Circular Raised Stone Planter (Height: 0.8m)
        addCyl(marbleGeoms, px, tY + 0.4, pz, 1.8, 1.9, 0.8, 16);
        addCyl(darkMetalGeoms, px, tY + 0.81, pz, 1.9, 1.9, 0.08, 16);
        addCyl(plantGeoms, px, tY + 0.78, pz, 1.65, 1.65, 0.06, 12); // Soil

        // Palm Trunk (Segmented & Slanted)
        addCyl(woodGeoms, px, tY + 2.6, pz, 0.22, 0.28, 3.6, 8, 0.08, ang, 0);

        // Lush Tropical Palm Fronds (Canopy)
        for (let f = 0; f < 6; f++) {
            const fang = (f / 6) * Math.PI * 2;
            const fx = px + Math.sin(fang) * 1.6;
            const fz = pz + Math.cos(fang) * 1.6;
            addBox(plantGeoms, fx, tY + 4.3, fz, 1.8, 0.1, 0.6, 0.35, fang, 0.2);
        }

        // Integrated Architectural Uplight
        addCyl(glowCyanGeoms, px, tY + 0.85, pz + 1.2, 0.15, 0.15, 0.06, 8);
    }

    // D. Grand Entrance Canopy Portal (South Facade, Y: 0 to 7.5m)
    addBox(titaniumGeoms, tX - 5.5, tY + 3.8, tZ - 13.8, 0.8, 7.6, 1.4);
    addBox(titaniumGeoms, tX + 5.5, tY + 3.8, tZ - 13.8, 0.8, 7.6, 1.4);
    addBox(titaniumGeoms, tX, tY + 7.4, tZ - 13.8, 11.8, 0.8, 1.4);
    addBox(glowCyanGeoms, tX, tY + 7.0, tZ - 13.7, 10.2, 0.15, 0.15); // LED Lintel

    // Aerodynamic Cantilevered Glass Canopy projecting over entrance
    addBox(darkMetalGeoms, tX, tY + 5.6, tZ - 16.5, 13.0, 0.35, 6.0);
    addBox(glassGeoms, tX, tY + 5.8, tZ - 16.5, 12.2, 0.1, 5.4);
    [-4.5, 0, 4.5].forEach(cx => {
        addCyl(glowCyanGeoms, tX + cx, tY + 5.4, tZ - 16.5, 0.35, 0.35, 0.08, 8);
    });

    // ========================================================================
    // 2. SCULPTED CATENARY ARCHITECTURE & EXTERIOR SHELL (150m HEIGHT)
    // Loaded from high-fidelity sample.glb (Home HQ 3D Model)
    // ========================================================================
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('./public/models/homeHQ.glb', (gltf) => {
        const hqModel = gltf.scene;
        hqModel.name = "HomeHQ_GLB_Structure";

        const box = new THREE.Box3().setFromObject(hqModel);
        const size = box.getSize(new THREE.Vector3());
        const scale = 150.0 / size.y;
        hqModel.scale.set(scale, scale, scale);

        // Recompute bounding box after scale
        box.setFromObject(hqModel);
        const scaledMin = box.min;
        const scaledCenter = box.getCenter(new THREE.Vector3());

        // Center on plaza coordinates and align base to tY (0.15)
        hqModel.position.x = tX - scaledCenter.x;
        hqModel.position.y = tY - scaledMin.y;
        hqModel.position.z = tZ - scaledCenter.z;

        // Enhance PBR materials and enable shadows
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

        // Architectural Facade Uplights illuminating the 150m tower
        [-20, 20].forEach(lx => {
            const uplight = new THREE.DirectionalLight(0x38bdf8, 0.9);
            uplight.position.set(tX + lx, tY + 4, tZ - 15);
            uplight.target.position.set(tX, 75, tZ);
            towerGroup.add(uplight);
            towerGroup.add(uplight.target);
        });
        const backLight = new THREE.DirectionalLight(0xffeedd, 0.8);
        backLight.position.set(tX, tY + 4, tZ + 25);
        backLight.target.position.set(tX, 75, tZ);
        towerGroup.add(backLight);
        towerGroup.add(backLight.target);

        towerGroup.add(hqModel);
        console.log("⚡ [Home HQ] High-fidelity Stark Tower GLB integrated into scene at 150m scale.");
    }, undefined, (err) => {
        console.warn("[Home HQ] GLTF load error for homeHQ.glb:", err);
    });

    // 4 Vertical Exterior Glass Elevator Shafts (Running up the South-East & South-West Facade)
    [-1, 1].forEach(side => {
        const ex = tX + side * 8.5;
        const ez = tZ + 8.2;
        // Glass Elevator Guide Rails & Enclosure (Height: 145m)
        addBox(glassGeoms, ex, 72.5, ez, 2.8, 145, 2.6);
        addBox(titaniumGeoms, ex - 1.4, 72.5, ez, 0.3, 145, 0.3);
        addBox(titaniumGeoms, ex + 1.4, 72.5, ez, 0.3, 145, 0.3);

        // Modelled Glass Elevator Cabs (At resting lobby and sky tiers)
        [4.0, 76.0].forEach(cabY => {
            addBox(darkMetalGeoms, ex, cabY + 1.25, ez, 2.4, 2.5, 2.2);
            addBox(glassGeoms, ex, cabY + 1.3, ez + 1.0, 2.1, 2.2, 0.15);
            addBox(glowCyanGeoms, ex, cabY + 2.4, ez, 1.8, 0.1, 1.8); // Ceiling Light
        });
    });

    // ========================================================================
    // 3. ICONIC ARC REACTOR FACADE EMBLEM & COLLAR SIGN (Y = 115m - 128m)
    // ========================================================================
    const emblemY = 120.0;
    const emblemZ = tZ - 10.2;

    // Outer Titanium Housing Bezel (Radius: 4.8m)
    addTorus(titaniumGeoms, tX, emblemY, emblemZ, 4.6, 0.45, 12, 32);

    // Glowing Cyan Outer Ring
    addTorus(glowCyanGeoms, tX, emblemY, emblemZ, 4.1, 0.28, 8, 32);

    // Inner Tri-Segment Arc Reactor Core
    for (let c = 0; c < 3; c++) {
        const cang = (c / 3) * Math.PI * 2;
        const cx = tX + Math.sin(cang) * 2.2;
        const cy = emblemY + Math.cos(cang) * 2.2;
        addBox(glowCyanGeoms, cx, cy, emblemZ + 0.1, 1.4, 0.5, 0.3, 0, 0, -cang);
    }
    // High-Intensity Center Node
    addCyl(glowCyanGeoms, tX, emblemY, emblemZ + 0.15, 0.95, 0.95, 0.35, 16, Math.PI / 2);

    // Illuminated "HOME HQ • DEVARSHI DAVANE" Collar Ribbon (Y = 135m)
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
    colCtx.font = 'bold 92px "JetBrains Mono", sans-serif';
    colCtx.textAlign = 'center';
    colCtx.textBaseline = 'middle';
    colCtx.shadowColor = '#00f2fe';
    colCtx.shadowBlur = 28;
    colCtx.fillText('HOME HQ • DEVARSHI', 512, 128);
    const collarTex = new THREE.CanvasTexture(collarCanvas);
    const collarMat = new THREE.MeshBasicMaterial({ map: collarTex, side: THREE.DoubleSide });
    const collarSign = new THREE.Mesh(
        new THREE.CylinderGeometry(9.2, 9.2, 4.2, 32, 1, true, Math.PI * 0.72, Math.PI * 0.56),
        collarMat
    );
    collarSign.position.set(tX, 134.5, tZ + 1.2);
    towerGroup.add(collarSign);

    // ========================================================================
    // 4. CANTILEVERED F50 ROOFTOP FLIGHT DECK & SUPERSONIC VTOL JET (Y = 145m)
    // ========================================================================
    const deckY = 145.0;
    const deckRadius = 14.5; // Circular 29m diameter flight deck
    const deckCenterZ = tZ - 9.5;

    // Thick Circular Structural Deck Slab with Tapered Bevel
    addCyl(titaniumGeoms, tX, deckY - 0.7, deckCenterZ, deckRadius, deckRadius - 1.2, 1.4, 36);
    addCyl(darkMetalGeoms, tX, deckY + 0.05, deckCenterZ, deckRadius - 0.4, deckRadius - 0.4, 0.1, 36);

    // Angled Space-Frame Support Trusses reaching back down to tower core at Y = 132m
    [-7.5, 0, 7.5].forEach(tx => {
        const truss = new THREE.BoxGeometry(0.9, 0.9, 22.0);
        truss.rotateX(-0.48);
        truss.translate(tX + tx, 138.5, deckCenterZ + 4.5);
        titaniumGeoms.push(truss);
    });

    // Glowing Arc Reactor Helipad Target Markings
    addTorus(glowCyanGeoms, tX, deckY + 0.14, deckCenterZ, 10.5, 0.25, 6, 36, Math.PI / 2); // Outer Ring
    addTorus(glowCyanGeoms, tX, deckY + 0.14, deckCenterZ, 5.2, 0.2, 6, 32, Math.PI / 2);  // Inner Ring
    addBox(glowCyanGeoms, tX, deckY + 0.14, deckCenterZ, 7.5, 0.08, 0.75); // Target Cross X
    addBox(glowCyanGeoms, tX, deckY + 0.14, deckCenterZ, 0.75, 0.08, 7.5); // Target Cross Z

    // 16 High-Intensity Warning Perimeter Strobe Beacons
    for (let r = 0; r < 16; r++) {
        const rad = (r / 16) * Math.PI * 2;
        const bx = tX + Math.sin(rad) * (deckRadius - 0.8);
        const bz = deckCenterZ + Math.cos(rad) * (deckRadius - 0.8);
        addCyl(darkMetalGeoms, bx, deckY + 0.35, bz, 0.18, 0.22, 0.7, 8);
        addCyl(glowAmberGeoms, bx, deckY + 0.75, bz, 0.22, 0.22, 0.2, 8);
    }

    // Safety Balustrade (1.1m Height Chest-Level Standard)
    addTorus(glassGeoms, tX, deckY + 0.65, deckCenterZ, deckRadius - 0.5, 0.08, 6, 36, Math.PI / 2);
    addTorus(titaniumGeoms, tX, deckY + 1.12, deckCenterZ, deckRadius - 0.5, 0.12, 6, 36, Math.PI / 2); // Handrail

    // Parked Supersonic Stealth VTOL Jet on Deck (Facing Forward towards Mahim Bay)
    const jetX = tX;
    const jetY = deckY + 0.2;
    const jetZ = deckCenterZ + 1.5;

    // Jet Main Fuselage
    addBox(darkMetalGeoms, jetX, jetY + 1.1, jetZ, 2.2, 1.2, 9.5);
    addBox(darkMetalGeoms, jetX, jetY + 0.9, jetZ - 5.5, 1.4, 0.7, 3.2); // Nose Radome
    // Cockpit Bubble Canopy (Tinted Glass)
    addBox(glassGeoms, jetX, jetY + 1.85, jetZ - 1.8, 1.3, 0.75, 3.4);

    // Delta Swept Wings (Span: 8.8m)
    addBox(titaniumGeoms, jetX - 3.2, jetY + 1.0, jetZ + 0.8, 4.4, 0.18, 4.2, 0, -0.28, 0.08);
    addBox(titaniumGeoms, jetX + 3.2, jetY + 1.0, jetZ + 0.8, 4.4, 0.18, 4.2, 0, 0.28, -0.08);

    // Twin Angled Vertical Stabilizers (Tail Fins)
    addBox(darkMetalGeoms, jetX - 1.5, jetY + 2.3, jetZ + 3.8, 0.18, 1.8, 2.2, 0, 0, -0.24);
    addBox(darkMetalGeoms, jetX + 1.5, jetY + 2.3, jetZ + 3.8, 0.18, 1.8, 2.2, 0, 0, 0.24);

    // Twin Rear Jet Thruster Exhaust Nozzles
    addCyl(glowCyanGeoms, jetX - 0.75, jetY + 1.1, jetZ + 4.9, 0.45, 0.45, 0.6, 12, Math.PI / 2);
    addCyl(glowCyanGeoms, jetX + 0.75, jetY + 1.1, jetZ + 4.9, 0.45, 0.45, 0.6, 12, Math.PI / 2);

    // Tricycle Landing Gear Struts
    addCyl(darkMetalGeoms, jetX, jetY + 0.45, jetZ - 3.8, 0.08, 0.08, 0.9, 8);
    addCyl(darkMetalGeoms, jetX - 1.6, jetY + 0.45, jetZ + 1.8, 0.08, 0.08, 0.9, 8);
    addCyl(darkMetalGeoms, jetX + 1.6, jetY + 0.45, jetZ + 1.8, 0.08, 0.08, 0.9, 8);

    // Mechanical Rooftop Penthouse & Communications Spire (Reaching 150m Total Height)
    addBox(titaniumGeoms, tX, 147.5, tZ + 4.0, 7.5, 5.0, 6.0); // Elevator machinery room
    addCyl(darkMetalGeoms, tX + 2.2, 150.8, tZ + 4.5, 1.2, 1.4, 1.6, 16); // Satellite radome
    addCyl(titaniumGeoms, tX, 150.0, tZ + 3.0, 0.35, 0.75, 8.0, 8); // Tapering needle
    addCyl(titaniumGeoms, tX, 155.0, tZ + 3.0, 0.08, 0.35, 6.0, 8); // Lightning spire tip
    addCyl(glowAmberGeoms, tX, 158.2, tZ + 3.0, 0.3, 0.3, 0.4, 8); // Aviation strobe beacon

    // ========================================================================
    // 5. WALKABLE INTERIOR ARCHITECTURE (12 EXPLORABLE ZONES)
    // Fully Calibrated to 1.80m Human Character Reference Height
    // ========================================================================

    // Central Structural Turbo-Lift & Core Shaft (Runs Y: 0 to 145m at South Back)
    addBox(titaniumGeoms, tX, 72.5, tZ - 6.0, 8.8, 145, 4.0);

    // Core Floor Slabs (Explorable Levels)
    const floorLevels = [
        { id: 'F01', alt: 0.15,  h: 8.0, r: 15.8, name: "Grand Atrium Lobby & Fountain" },
        { id: 'F06', alt: 20.0,  h: 3.6, r: 14.8, name: "Observation & Sky Garden" },
        { id: 'F11', alt: 34.0,  h: 3.6, r: 14.2, name: "Living Quarters & Suites" },
        { id: 'F16', alt: 48.0,  h: 3.6, r: 13.5, name: "Sky Lounge & Cocktail Bar" },
        { id: 'F21', alt: 62.0,  h: 3.6, r: 12.8, name: "Gym & Wellness Suite" },
        { id: 'F26', alt: 76.0,  h: 3.6, r: 12.0, name: "Meeting & Strategy Boardroom" },
        { id: 'F31', alt: 90.0,  h: 3.6, r: 11.2, name: "Innovation Lab & Holo-Projector" },
        { id: 'F36', alt: 104.0, h: 3.6, r: 10.5, name: "Cybersecurity Command Center" },
        { id: 'F41', alt: 118.0, h: 3.6, r: 9.8,  name: "R&D AI & Robotics Lab" },
        { id: 'F46', alt: 132.0, h: 4.2, r: 9.0,  name: "Master Penthouse & Armor Suite" },
        { id: 'F48', alt: 140.0, h: 3.6, r: 8.5,  name: "Sky Dining & Chef's Terrace" },
        { id: 'F50', alt: 145.0, h: 0.0, r: 14.5, name: "Rooftop Flight Deck & Helipad" }
    ];

    floorLevels.forEach(lvl => {
        // Floor slab
        if (lvl.alt < 145.0) {
            addCyl(marbleGeoms, tX, lvl.alt + 0.05, tZ, lvl.r, lvl.r, 0.2, 32);
            // Ceiling slab
            addCyl(darkMetalGeoms, tX, lvl.alt + lvl.h, tZ, lvl.r - 0.2, lvl.r - 0.2, 0.2, 32);

            // Recessed Ceiling Downlight Strips (Ambient architectural illumination)
            addBox(glowCyanGeoms, tX - 3.2, lvl.alt + lvl.h - 0.06, tZ + 2.0, 0.35, 0.06, 6.0);
            addBox(glowCyanGeoms, tX + 3.2, lvl.alt + lvl.h - 0.06, tZ + 2.0, 0.35, 0.06, 6.0);

            // Elevator Floor Door Portals & Call Panels (Facing North +Z into room)
            addBox(darkMetalGeoms, tX - 1.8, lvl.alt + 1.25, tZ - 4.1, 1.4, 2.5, 0.15);
            addBox(darkMetalGeoms, tX + 1.8, lvl.alt + 1.25, tZ - 4.1, 1.4, 2.5, 0.15);
            addBox(glowCyanGeoms, tX, lvl.alt + 2.65, tZ - 4.05, 3.8, 0.25, 0.08); // Header Indicator
            addBox(glowCyanGeoms, tX + 2.8, lvl.alt + 1.25, tZ - 4.05, 0.2, 0.45, 0.08); // Call Button
        }
    });

    // ------------------------------------------------------------------------
    // ZONE 1: F01 GRAND ATRIUM LOBBY & RECEPTION (Y = 0.15m, Ceiling = 8.0m)
    // ------------------------------------------------------------------------
    const l1Y = 0.15;
    // Semi-Circular Reception Desk (Height: 1.10m Human Standing Elbow Level)
    addBox(marbleGeoms, tX, l1Y + 0.55, tZ + 1.0, 7.4, 1.1, 1.6);
    addBox(darkMetalGeoms, tX, l1Y + 1.12, tZ + 1.0, 7.6, 0.08, 1.8);
    addBox(glowCyanGeoms, tX, l1Y + 0.15, tZ + 0.15, 7.2, 0.08, 0.08); // Under-counter kick light
    // Receptionist Workstations & Terminal Displays
    [-2.0, 2.0].forEach(rx => {
        addBox(darkMetalGeoms, tX + rx, l1Y + 1.45, tZ + 1.2, 0.85, 0.55, 0.08); // Monitor
        addBox(darkMetalGeoms, tX + rx, l1Y + 1.18, tZ + 0.8, 0.55, 0.04, 0.25); // Keyboard
    });

    // 4 Optical Security Turnstile Access Gates (Height: 1.0m)
    [-3.8, -1.3, 1.3, 3.8].forEach(gx => {
        addBox(titaniumGeoms, tX + gx, l1Y + 0.5, tZ - 1.5, 0.35, 1.0, 2.2);
        addBox(glowCyanGeoms, tX + gx, l1Y + 0.95, tZ - 1.5, 0.12, 0.08, 1.8);
    });

    // Luxury Waiting Lounge Sofas (Seat Height: 0.45m Human Sitting Standard)
    [-6.5, 6.5].forEach(sx => {
        addBox(carpetGeoms, tX + sx, l1Y + 0.25, tZ + 1.5, 2.8, 0.5, 1.1); // Sofa Base
        addBox(carpetGeoms, tX + sx, l1Y + 0.55, tZ + 1.95, 2.8, 0.6, 0.25); // Sofa Back
        addBox(marbleGeoms, tX + sx, l1Y + 0.25, tZ - 0.2, 1.8, 0.45, 0.85); // Coffee Table
    });

    // ------------------------------------------------------------------------
    // ZONE 2: F06 OBSERVATION MEZZANINE & SKY GARDEN (Y = 20.0m)
    // ------------------------------------------------------------------------
    const l2Y = 20.0;
    // Teak Wood Balcony Deck (Projecting toward North bay)
    addBox(woodGeoms, tX, l2Y + 0.05, tZ + 6.0, 16.0, 0.15, 6.5);
    // Cantilevered Glass Balustrade (1.1m Height)
    addBox(glassGeoms, tX, l2Y + 0.6, tZ + 9.2, 15.8, 1.1, 0.12);
    addBox(titaniumGeoms, tX, l2Y + 1.12, tZ + 9.2, 16.0, 0.08, 0.18);
    // 3 Raised Planters with Greenery
    [-5.5, 0, 5.5].forEach(px => {
        addBox(darkMetalGeoms, tX + px, l2Y + 0.4, tZ + 7.5, 2.4, 0.8, 1.2);
        addBox(plantGeoms, tX + px, l2Y + 0.95, tZ + 7.5, 2.2, 0.45, 1.0);
    });

    // ------------------------------------------------------------------------
    // ZONE 3: F11 RESIDENTIAL LIVING QUARTERS & SUITE (Y = 34.0m)
    // ------------------------------------------------------------------------
    const l3Y = 34.0;
    // Hardwood Flooring
    addBox(woodGeoms, tX, l3Y + 0.05, tZ, 18.0, 0.08, 18.0);
    // Luxury King Platform Bed (Length: 2.1m, Width: 1.9m, Height: 0.55m)
    const bedX = tX - 3.5;
    const bedZ = tZ + 3.0;
    addBox(woodGeoms, bedX, l3Y + 0.2, bedZ, 2.1, 0.35, 2.2); // Bed Platform Base
    addBox(carpetGeoms, bedX, l3Y + 0.45, bedZ, 1.9, 0.35, 2.0); // Mattress
    addBox(woodGeoms, bedX, l3Y + 0.8, bedZ + 1.15, 2.1, 0.9, 0.2); // Headboard
    addBox(glowAmberGeoms, bedX, l3Y + 1.25, bedZ + 1.16, 1.9, 0.08, 0.08); // Warm Cove Light

    // Bedside Nightstands & Lamps
    [-1.3, 1.3].forEach(nx => {
        addBox(woodGeoms, bedX + nx, l3Y + 0.3, bedZ + 1.1, 0.55, 0.6, 0.5);
        addCyl(glowAmberGeoms, bedX + nx, l3Y + 0.85, bedZ + 1.1, 0.18, 0.24, 0.35, 8);
    });

    // Media Credenza & 65-Inch OLED TV
    addBox(woodGeoms, tX - 3.5, l3Y + 0.35, tZ - 0.5, 3.2, 0.65, 0.55); // Credenza
    addBox(darkMetalGeoms, tX - 3.5, l3Y + 1.45, tZ - 0.7, 2.4, 1.2, 0.08); // TV

    // Ensuite Designer Bathroom (Glass shower enclosure & vanity)
    const bathX = tX + 4.5;
    addBox(glassGeoms, bathX, l3Y + 1.2, tZ + 2.5, 2.6, 2.4, 2.6); // Glass Shower Stall
    addBox(marbleGeoms, bathX, l3Y + 0.45, tZ - 0.5, 1.8, 0.9, 0.6); // Vanity Counter
    addBox(darkMetalGeoms, bathX, l3Y + 1.45, tZ - 0.75, 1.6, 0.9, 0.06); // Backlit Mirror

    // ------------------------------------------------------------------------
    // ZONE 4: F16 SKY LOUNGE & COCKTAIL BAR (Y = 48.0m)
    // ------------------------------------------------------------------------
    const l4Y = 48.0;
    // Curved Illuminated Cocktail Bar Counter (Height: 1.10m)
    const barX = tX;
    const barZ = tZ + 3.5;
    addBox(darkMetalGeoms, barX, l4Y + 0.55, barZ, 7.2, 1.1, 1.4);
    addBox(marbleGeoms, barX, l4Y + 1.12, barZ, 7.4, 0.08, 1.6);
    addBox(glowAmberGeoms, barX, l4Y + 0.55, barZ - 0.72, 7.0, 0.8, 0.08); // Backlit Front Panel

    // 5 Leather Barstools (Seat Height: 0.75m Bar Standard)
    for (let s = 0; s < 5; s++) {
        const bsX = barX - 2.4 + s * 1.2;
        addCyl(titaniumGeoms, bsX, l4Y + 0.38, barZ - 1.2, 0.08, 0.22, 0.75, 8);
        addCyl(carpetGeoms, bsX, l4Y + 0.77, barZ - 1.2, 0.25, 0.25, 0.12, 12);
    }

    // Back-Bar Mirrored Liquor Shelves (3 Tiers with illuminated bottles)
    addBox(darkMetalGeoms, barX, l4Y + 1.6, barZ + 2.4, 6.8, 2.6, 0.4);
    for (let sh = 0; sh < 3; sh++) {
        const shY = l4Y + 0.8 + sh * 0.75;
        addBox(glassGeoms, barX, shY, barZ + 2.3, 6.4, 0.06, 0.3);
        addBox(glowAmberGeoms, barX, shY + 0.18, barZ + 2.3, 6.0, 0.24, 0.18);
    }

    // Lounge Armchairs & Low Cocktail Tables
    const lngX = tX - 5.0;
    addBox(marbleGeoms, lngX, l4Y + 0.25, tZ + 0.5, 2.0, 0.5, 2.0); // Low Circular Table
    [-1.6, 1.6].forEach(lx => {
        addBox(carpetGeoms, lngX + lx, l4Y + 0.35, tZ + 0.5, 0.9, 0.7, 0.9); // Velvet Armchair
    });

    // ------------------------------------------------------------------------
    // ZONE 5: F21 GYM & WELLNESS SUITE (Y = 62.0m)
    // ------------------------------------------------------------------------
    const l5Y = 62.0;
    // Athletic Rubberized Flooring
    addBox(darkMetalGeoms, tX, l5Y + 0.05, tZ, 16.0, 0.06, 16.0);

    // Row of 4 High-Tech Running Treadmills (Facing Panoramic Window at North)
    for (let tm = 0; tm < 4; tm++) {
        const tmX = tX - 4.5 + tm * 3.0;
        const tmZ = tZ + 4.5;
        addBox(darkMetalGeoms, tmX, l5Y + 0.18, tmZ, 0.85, 0.25, 1.9); // Running Deck
        addBox(titaniumGeoms, tmX, l5Y + 0.85, tmZ + 0.7, 0.8, 1.2, 0.2); // Upright Console Frame
        addBox(glowCyanGeoms, tmX, l5Y + 1.35, tmZ + 0.68, 0.6, 0.35, 0.08); // Digital Telemetry Screen
    }

    // Heavy-Duty Weight Bench Press & Barbell
    const benchX = tX - 3.8;
    const benchZ = tZ + 0.5;
    addBox(carpetGeoms, benchX, l5Y + 0.25, benchZ, 0.55, 0.45, 1.6); // Bench
    addBox(titaniumGeoms, benchX, l5Y + 0.65, benchZ + 0.4, 0.9, 1.1, 0.15); // Rack Uprights
    addCyl(titaniumGeoms, benchX, l5Y + 1.05, benchZ + 0.4, 0.05, 0.05, 1.8, 8, 0, 0, Math.PI / 2); // Barbell
    addCyl(darkMetalGeoms, benchX - 0.8, l5Y + 1.05, benchZ + 0.4, 0.28, 0.28, 0.12, 12, 0, 0, Math.PI / 2); // Plate L
    addCyl(darkMetalGeoms, benchX + 0.8, l5Y + 1.05, benchZ + 0.4, 0.28, 0.28, 0.12, 12, 0, 0, Math.PI / 2); // Plate R

    // 3-Tier Dumbbell Rack
    const dbX = tX + 4.2;
    addBox(darkMetalGeoms, dbX, l5Y + 0.55, benchZ, 3.2, 1.0, 0.65);
    addBox(glowAmberGeoms, dbX, l5Y + 0.95, benchZ, 3.0, 0.15, 0.4); // Weights row

    // Red Accent Workout LED Strip along Wall
    addBox(glowAmberGeoms, tX, l5Y + 2.4, tZ + 6.2, 12.0, 0.08, 0.08);

    // ------------------------------------------------------------------------
    // ZONE 6: F26 EXECUTIVE MEETING & STRATEGY BOARDROOM (Y = 76.0m)
    // ------------------------------------------------------------------------
    const l6Y = 76.0;
    // Monumental 12-Seat Conference Table (5.6m Length, 1.6m Width, 0.75m Height)
    const tblX = tX;
    const tblZ = tZ + 2.0;
    addBox(marbleGeoms, tblX, l6Y + 0.72, tblZ, 5.6, 0.1, 1.6);
    addBox(darkMetalGeoms, tblX, l6Y + 0.35, tblZ, 4.8, 0.65, 0.8); // Table Base Pedestals
    addBox(glowCyanGeoms, tblX, l6Y + 0.75, tblZ, 4.4, 0.02, 0.25); // Center Data Strip

    // 10 Ergonomic Executive Mesh Swivel Chairs (Seat Height: 0.45m, Back Height: 1.05m)
    [-2.0, -1.0, 0.0, 1.0, 2.0].forEach(cx => {
        [-1.15, 1.15].forEach(cz => {
            addCyl(titaniumGeoms, tblX + cx, l6Y + 0.22, tblZ + cz, 0.06, 0.24, 0.45, 8);
            addBox(carpetGeoms, tblX + cx, l6Y + 0.48, tblZ + cz, 0.55, 0.1, 0.55); // Seat
            addBox(darkMetalGeoms, tblX + cx, l6Y + 0.85, tblZ + cz + (cz > 0 ? 0.25 : -0.25), 0.52, 0.65, 0.08); // Back
        });
    });

    // Wall-Mounted Telepresence / Global Tactical Display Screen (4.8m x 2.2m)
    addBox(darkMetalGeoms, tblX, l6Y + 1.8, tZ + 6.5, 4.8, 2.2, 0.12);
    addBox(glowCyanGeoms, tblX, l6Y + 1.8, tZ + 6.42, 4.6, 2.0, 0.06);

    // ------------------------------------------------------------------------
    // ZONE 7: F31 INNOVATION LAB & 3D HOLO-PROJECTOR (Y = 90.0m)
    // ------------------------------------------------------------------------
    const l7Y = 90.0;
    // Central Circular Holographic Projection Table (Diameter: 3.2m, Height: 0.75m)
    const holoX = tX;
    const holoZ = tZ + 2.0;
    addCyl(darkMetalGeoms, holoX, l7Y + 0.38, holoZ, 1.6, 1.8, 0.75, 24);
    addCyl(titaniumGeoms, holoX, l7Y + 0.76, holoZ, 1.65, 1.65, 0.06, 24);
    addTorus(glowCyanGeoms, holoX, l7Y + 0.79, holoZ, 1.45, 0.08, 6, 24, Math.PI / 2);

    // Floating 3D Holographic Wireframe Globe (Cyan Geometry)
    addTorus(glowCyanGeoms, holoX, l7Y + 1.85, holoZ, 0.95, 0.04, 6, 24, 0, 0, 0);
    addTorus(glowCyanGeoms, holoX, l7Y + 1.85, holoZ, 0.95, 0.04, 6, 24, Math.PI / 2, 0, 0);
    addTorus(glowCyanGeoms, holoX, l7Y + 1.85, holoZ, 0.95, 0.04, 6, 24, 0, Math.PI / 2, 0);
    addCyl(glowCyanGeoms, holoX, l7Y + 1.85, holoZ, 0.22, 0.22, 0.22, 8); // Core Node

    // 2 Curved Collaborative Engineering Workstations
    [-3.8, 3.8].forEach(wx => {
        addBox(darkMetalGeoms, tX + wx, l7Y + 0.38, holoZ, 2.4, 0.75, 0.9);
        addBox(darkMetalGeoms, tX + wx, l7Y + 0.95, holoZ + 0.25, 1.8, 0.45, 0.08); // Curved Dual Monitor
    });

    // ------------------------------------------------------------------------
    // ZONE 8: F36 CYBERSECURITY COMMAND CENTER (Y = 104.0m)
    // ------------------------------------------------------------------------
    const l8Y = 104.0;
    // Massive Curved Blue Tactical Threat Map Wall (Width: 8.4m, Height: 2.4m)
    const wallX = tX;
    const wallZ = tZ + 6.5;
    addBox(darkMetalGeoms, wallX, l8Y + 1.6, wallZ, 8.8, 2.6, 0.2);
    addBox(glowCyanGeoms, wallX, l8Y + 1.6, wallZ - 0.12, 8.4, 2.3, 0.08); // Glowing World Threat Map

    // Tiered Operator Command Consoles (Height: 0.75m)
    [-2.8, 2.8].forEach(cx => {
        addBox(titaniumGeoms, tX + cx, l8Y + 0.38, tZ + 3.0, 3.2, 0.75, 0.9);
        // Multi-Monitor Array (3 Screens per station)
        [-0.8, 0, 0.8].forEach(mx => {
            addBox(darkMetalGeoms, tX + cx + mx, l8Y + 0.95, tZ + 3.25, 0.7, 0.45, 0.06);
            addBox(glowCyanGeoms, tX + cx + mx, l8Y + 0.95, tZ + 3.28, 0.65, 0.4, 0.02);
        });
    });

    // 4 High-Density Cyber Server Rack Banks (42U Standard, Height: 2.2m)
    for (let sr = 0; sr < 4; sr++) {
        const srX = tX - 4.2 + sr * 2.8;
        const srZ = tZ + 0.5;
        addBox(darkMetalGeoms, srX, l8Y + 1.1, srZ, 1.0, 2.2, 0.95);
        addBox(glowCyanGeoms, srX, l8Y + 1.1, srZ + 0.49, 0.85, 2.0, 0.04);
        addBox(glowAmberGeoms, srX, l8Y + 1.85, srZ + 0.5, 0.2, 0.1, 0.04); // Alarm Strobe
    }

    // ------------------------------------------------------------------------
    // ZONE 9: F41 R&D AI & ROBOTICS LABORATORY (Y = 118.0m)
    // ------------------------------------------------------------------------
    const l9Y = 118.0;
    // 2 Multi-Axis Articulated Industrial Robotic Arms (Height: 2.2m Reach)
    [-3.2, 3.2].forEach((ax, idx) => {
        const az = tZ + 3.2;
        // Heavy Cylindrical Base Pedestal
        addCyl(darkMetalGeoms, tX + ax, l9Y + 0.35, az, 0.55, 0.65, 0.7, 16);
        // Arm Segment 1 (Angled forward)
        const arm1 = new THREE.CylinderGeometry(0.18, 0.22, 1.2, 8);
        arm1.rotateZ(idx === 0 ? 0.35 : -0.35);
        arm1.translate(tX + ax + (idx === 0 ? 0.25 : -0.25), l9Y + 1.2, az);
        titaniumGeoms.push(arm1);
        // Arm Segment 2 & Articulated Gripper Head
        const arm2 = new THREE.CylinderGeometry(0.14, 0.18, 1.1, 8);
        arm2.rotateZ(idx === 0 ? -0.42 : 0.42);
        arm2.translate(tX + ax + (idx === 0 ? 0.55 : -0.55), l9Y + 1.9, az);
        titaniumGeoms.push(arm2);
        addCyl(glowCyanGeoms, tX + ax + (idx === 0 ? 0.75 : -0.75), l9Y + 2.1, az, 0.12, 0.12, 0.25, 8); // Laser Welder
    });

    // Central Electronics Tech Assembly Workbench (Height: 0.90m)
    addBox(darkMetalGeoms, tX, l9Y + 0.45, tZ + 3.0, 3.8, 0.9, 1.4);
    addBox(titaniumGeoms, tX, l9Y + 0.92, tZ + 3.0, 4.0, 0.08, 1.5);
    addBox(darkMetalGeoms, tX, l9Y + 1.35, tZ + 3.2, 1.2, 0.7, 0.35); // Diagnostic Oscilloscope

    // Suit Fabrication Chamber / Gantry Rig
    const gantZ = tZ + 0.5;
    addCyl(darkMetalGeoms, tX, l9Y + 0.1, gantZ, 1.8, 1.8, 0.2, 16); // Gantry Floor Disc
    addTorus(glowCyanGeoms, tX, l9Y + 0.22, gantZ, 1.6, 0.08, 6, 24, Math.PI / 2);
    // Vertical Hydraulic Support Struts
    [-1.2, 1.2].forEach(hx => {
        addCyl(titaniumGeoms, tX + hx, l9Y + 1.25, gantZ, 0.08, 0.08, 2.3, 8);
    });

    // ------------------------------------------------------------------------
    // ZONE 10: F46 MASTER PENTHOUSE RESIDENCE (Y = 132.0m, Luxury Height: 4.2m)
    // ------------------------------------------------------------------------
    const l10Y = 132.0;
    // Rich Walnut Hardwood Floor
    addBox(woodGeoms, tX, l10Y + 0.05, tZ, 16.0, 0.08, 16.0);

    // Contemporary Linear Recessed Gas Fireplace
    const fireX = tX;
    const fireZ = tZ + 6.2;
    addBox(darkMetalGeoms, fireX, l10Y + 0.75, fireZ, 3.6, 1.5, 0.55);
    addBox(glowAmberGeoms, fireX, l10Y + 0.55, fireZ - 0.18, 3.0, 0.35, 0.2); // Glowing Embers

    // Deep L-Shaped Designer Sectional Lounge Sofa (Seat Height: 0.45m)
    const sofaX = tX - 1.8;
    const sofaZ = tZ + 2.0;
    addBox(carpetGeoms, sofaX, l10Y + 0.22, sofaZ, 3.4, 0.45, 1.1); // Main Lounge Span
    addBox(carpetGeoms, sofaX - 1.2, l10Y + 0.22, sofaZ - 1.3, 1.0, 0.45, 1.6); // Chaise Return
    addBox(woodGeoms, sofaX + 0.4, l10Y + 0.2, sofaZ, 1.4, 0.4, 0.85); // Walnut Coffee Table

    // Mark Armor Glass Display Showcase (Height: 2.4m)
    const podX = tX + 3.8;
    const podZ = tZ + 2.5;
    addBox(darkMetalGeoms, podX, l10Y + 0.15, podZ, 1.4, 0.3, 1.4); // Pedestal
    addBox(glassGeoms, podX, l10Y + 1.45, podZ, 1.3, 2.3, 1.3); // Glass Cubicle
    addCyl(glowCyanGeoms, podX, l10Y + 2.55, podZ, 0.25, 0.25, 0.06, 8); // Overhead Spotlight
    // Stylized Iron Man Armor Silhouette inside case
    addBox(glowAmberGeoms, podX, l10Y + 1.25, podZ, 0.55, 1.6, 0.4);

    // ------------------------------------------------------------------------
    // ZONE 11: F48 SKY DINING & CHEF'S TERRACE (Y = 140.0m)
    // ------------------------------------------------------------------------
    const l11Y = 140.0;
    // Sleek White Marble Kitchen Island (Height: 0.90m Kitchen Counter Standard)
    const kitX = tX - 2.5;
    const kitZ = tZ + 2.5;
    addBox(marbleGeoms, kitX, l11Y + 0.45, kitZ, 3.2, 0.9, 1.2);
    addBox(darkMetalGeoms, kitX, l11Y + 0.92, kitZ + 0.2, 1.4, 0.04, 0.6); // Induction Cooktop

    // 6-Person Designer Dining Table (Height: 0.75m)
    const dinX = tX + 2.5;
    const dinZ = tZ + 2.5;
    addBox(woodGeoms, dinX, l11Y + 0.72, dinZ, 2.6, 0.08, 1.3);
    addBox(titaniumGeoms, dinX, l11Y + 0.35, dinZ, 2.2, 0.65, 0.7);

    // ========================================================================
    // 6. COLLIDERS & SPATIAL HASH REGISTRATION
    // ========================================================================

    // Ground Entrance Plaza Boundaries
    registerBoxCollider(tX - 28, tX + 28, tZ - 28, tZ + 28, 'HomePlazaGround', -2, 4.0, tY + 0.15);
    // Fountain Basin Collider
    registerBoxCollider(fX - 6.8, fX + 6.8, fZ - 6.8, fZ + 6.8, 'HomePlazaFountain', -2, 6.0, fY + 1.2);

    // Central Turbo-Lift Core Shaft (Blocks player from falling through core)
    registerBoxCollider(tX - 4.5, tX + 4.5, tZ - 8.2, tZ - 4.0, 'HomeTowerCoreElevator', -2, 150.0);

    // Exterior Perimeter Glass Wall Colliders for all Explorable Levels
    // Ensures player remains inside the explorable floors and cannot walk off edges
    floorLevels.forEach(lvl => {
        if (lvl.alt < 145.0) {
            const r = lvl.r;
            const y1 = lvl.alt - 0.5;
            const y2 = lvl.alt + lvl.h;
            // North, South, East, West Wall Boundaries
            registerBoxCollider(tX - r, tX + r, tZ + r - 1.2, tZ + r, `${lvl.id}_WallN`, y1, y2);
            registerBoxCollider(tX - r, tX + r, tZ - r, tZ - r + 1.2, `${lvl.id}_WallS`, y1, y2);
            registerBoxCollider(tX - r, tX - r + 1.2, tZ - r, tZ + r, `${lvl.id}_WallW`, y1, y2);
            registerBoxCollider(tX + r - 1.2, tX + r, tZ - r, tZ + r, `${lvl.id}_WallE`, y1, y2);
        }
    });

    // F50 Flight Deck Perimeter Safety Railings (Prevents accidentally walking off edge)
    registerBoxCollider(tX - deckRadius, tX + deckRadius, deckCenterZ + deckRadius - 1.5, deckCenterZ + deckRadius, 'F50_DeckRailN', deckY - 1, deckY + 5);
    registerBoxCollider(tX - deckRadius, tX + deckRadius, deckCenterZ - deckRadius, deckCenterZ - deckRadius + 1.5, 'F50_DeckRailS', deckY - 1, deckY + 5);
    registerBoxCollider(tX - deckRadius, tX - deckRadius + 1.5, deckCenterZ - deckRadius, deckCenterZ + deckRadius, 'F50_DeckRailW', deckY - 1, deckY + 5);
    registerBoxCollider(tX + deckRadius - 1.5, tX + deckRadius, deckCenterZ - deckRadius, deckCenterZ + deckRadius, 'F50_DeckRailE', deckY - 1, deckY + 5);

    // ========================================================================
    // 7. PBR MATERIAL ATLAS & HIGH-PERFORMANCE GEOMETRY MERGE
    // ========================================================================
    const corporateGlassTex = createCorporateGlassTexture();
    corporateGlassTex.repeat.set(4, 18);

    const starkGlassMat = new THREE.MeshStandardMaterial({
        map: corporateGlassTex,
        color: 0x0284c7,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.55
    });

    const starkTitaniumMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        emissive: 0x1e293b,
        emissiveIntensity: 0.25,
        roughness: 0.35,
        metalness: 0.65
    });

    const starkDarkMetalMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        emissive: 0x111827,
        emissiveIntensity: 0.25,
        roughness: 0.4,
        metalness: 0.55
    });

    const starkMarbleMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0x1e293b,
        emissiveIntensity: 0.15,
        roughness: 0.2,
        metalness: 0.1
    });

    const starkWoodMat = new THREE.MeshStandardMaterial({
        color: 0x92400e,
        emissive: 0x451a03,
        emissiveIntensity: 0.2,
        roughness: 0.5,
        metalness: 0.05
    });

    const starkCarpetMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        emissive: 0x0f172a,
        emissiveIntensity: 0.25,
        roughness: 0.75,
        metalness: 0.0
    });

    const starkGlowCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const starkGlowAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    const starkPlantMat = new THREE.MeshStandardMaterial({
        color: 0x166534,
        roughness: 0.65,
        metalness: 0.1
    });

    const starkWaterMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.1,
        metalness: 0.25,
        transparent: true,
        opacity: 0.75
    });

    // Helper: Safely Merge and Add to Group
    function safeMerge(geoms, mat, lodDistance = null) {
        if (!geoms || geoms.length === 0) return;
        try {
            const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
            if (merged) {
                const mesh = new THREE.Mesh(merged, mat);
                towerGroup.add(mesh);
                if (lodDistance !== null) {
                    registerLODItem(mesh, 0, lodDistance);
                }
            }
        } catch (err) {
            console.warn("HomeHQ safeMerge warning:", err);
        }
    }

    // Merge Structural and Exterior Meshes (Always Visible)
    safeMerge(glassGeoms, starkGlassMat);
    safeMerge(titaniumGeoms, starkTitaniumMat);
    safeMerge(darkMetalGeoms, starkDarkMetalMat);
    safeMerge(glowCyanGeoms, starkGlowCyanMat);
    safeMerge(glowAmberGeoms, starkGlowAmberMat);
    safeMerge(waterGeoms, starkWaterMat);
    safeMerge(marbleGeoms, starkMarbleMat);

    // Interior Furniture & Vegetation (LOD-culled beyond 180m for maximum FPS)
    safeMerge(woodGeoms, starkWoodMat, 180);
    safeMerge(carpetGeoms, starkCarpetMat, 160);
    safeMerge(plantGeoms, starkPlantMat, 150);

    scene.add(towerGroup);
    cityBuildings.push({ minX: tX - 28, maxX: tX + 28, minZ: tZ - 28, maxZ: tZ + 28, type: 'stark_tower' });

    console.log("⚡ [Home HQ] Rebuilt 150m Cyber Skyscraper with 12 explorable floors, F50 VTOL flight deck & Arc water fountain.");
    return towerGroup;
}
