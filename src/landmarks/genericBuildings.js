import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { registerBoxCollider } from '../world/worldColliders.js';
import { DISTRICTS } from '../data/mumbaiGeography.js';
import {
    createChawlFacadeTexture,
    createApartmentFacadeTexture,
    createCorporateGlassTexture
} from '../world/textures.js';

// ==========================================
// PROCEDURAL 5KM MUMBAI METROPOLITAN URBAN ARCHITECTURE
// Comprehensive City Districts (South Mumbai, Central, Western, Eastern, Thane & Navi Mumbai)
// Over 350+ Authentically Batched Buildings in 7 Unified Draw Calls
// ==========================================

export const cityBuildings = [];

export function buildGenericBuildings(scene) {
    const batchedWallsPlaster = [];
    const batchedWallsApartments = [];
    const batchedWallsCorporate = [];
    const batchedConcreteTrim = [];
    const batchedGlass = [];
    const batchedMetal = [];
    const batchedRoofs = [];

    function addBox(arr, x, y, z, w, h, d, rotY = 0) {
        const geom = new THREE.BoxGeometry(w, h, d);
        if (rotY !== 0) geom.rotateY(rotY);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    function addCylinder(arr, x, y, z, rTop, rBot, h, seg = 8) {
        const geom = new THREE.CylinderGeometry(rTop, rBot, h, seg);
        geom.translate(x, y, z);
        arr.push(geom);
    }

    function buildBatchedChawl(x, z, w, d, storeys, rotY = 0) {
        const storeyH = 3.4;
        const totalH = storeys * storeyH;
        addBox(batchedWallsPlaster, x, totalH / 2, z, w, totalH, d, rotY);
        addBox(batchedConcreteTrim, x, 0.175, z + d / 2 + 0.65, w + 0.4, 0.35, 1.3, rotY);
        for (let dx = -w / 2 + 2.2; dx <= w / 2 - 2.2; dx += 3.8) {
            addBox(batchedRoofs, x + dx, 1.1, z + d / 2 + 0.06, 1.2, 2.2, 0.1, rotY);
            addBox(batchedMetal, x + dx - 0.9, 1.4, z + d / 2 + 0.06, 0.7, 0.9, 0.08, rotY);
            addBox(batchedMetal, x + dx + 0.9, 1.4, z + d / 2 + 0.06, 0.7, 0.9, 0.08, rotY);
        }
        for (let s = 1; s < storeys; s++) {
            const fy = s * storeyH;
            addBox(batchedConcreteTrim, x, fy, z + d / 2 + 0.65, w + 0.4, 0.32, 1.3, rotY);
            addBox(batchedMetal, x, fy + 0.55, z + d / 2 + 1.3, w + 0.4, 0.9, 0.08, rotY);
        }
        addBox(batchedRoofs, x, totalH + 0.2, z + 0.4, w + 0.8, 0.35, d + 1.6, rotY);
        addCylinder(batchedMetal, x - w / 4, totalH + 1.1, z, 0.9, 0.9, 1.8);
        addCylinder(batchedMetal, x + w / 4, totalH + 1.1, z, 0.9, 0.9, 1.8);

        const minX = x - (w + 0.6) / 2;
        const maxX = x + (w + 0.6) / 2;
        const minZ = z - d / 2;
        const maxZ = z + d / 2 + 1.4;
        registerBoxCollider(minX, maxX, minZ, maxZ, 'Chawl', -5, totalH + 1.5);
        cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'chawl' });
    }

    function buildBatchedApartment(x, z, w, d, storeys, rotY = 0) {
        const storeyH = 3.2;
        const totalH = storeys * storeyH;
        addBox(batchedWallsApartments, x, totalH / 2, z, w, totalH, d, rotY);
        addBox(batchedConcreteTrim, x, totalH + 0.4, z, w + 0.4, 0.8, d + 0.4, rotY);
        addCylinder(batchedMetal, x - w / 4, totalH + 1.2, z - d / 4, 1.1, 1.1, 2.0);
        addCylinder(batchedMetal, x + w / 4, totalH + 1.2, z + d / 4, 1.1, 1.1, 2.0);

        // Window frames / balconies
        for (let s = 1; s < storeys; s++) {
            const fy = s * storeyH;
            addBox(batchedConcreteTrim, x, fy, z + d / 2 + 0.2, w * 0.8, 0.2, 0.5, rotY);
        }

        const minX = x - w / 2;
        const maxX = x + w / 2;
        const minZ = z - d / 2;
        const maxZ = z + d / 2;
        registerBoxCollider(minX, maxX, minZ, maxZ, 'Apartment', -5, totalH + 1.5);
        cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'apartment' });
    }

    function buildBatchedCorporateTower(x, z, w, d, storeys, rotY = 0) {
        const storeyH = 4.0;
        const totalH = storeys * storeyH;
        addBox(batchedWallsCorporate, x, totalH / 2, z, w, totalH, d, rotY);
        addBox(batchedGlass, x, totalH / 2, z, w + 0.3, totalH - 0.4, d + 0.3, rotY);
        addBox(batchedConcreteTrim, x, totalH + 0.5, z, w + 0.4, 1.0, d + 0.4, rotY);
        // Rooftop antenna spire
        addCylinder(batchedMetal, x, totalH + 4.0, z, 0.15, 0.35, 8.0);

        const minX = x - w / 2;
        const maxX = x + w / 2;
        const minZ = z - d / 2;
        const maxZ = z + d / 2;
        registerBoxCollider(minX, maxX, minZ, maxZ, 'CorporateTower', -5, totalH + 2.0);
        cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'corporate' });
    }

    // ====================================================
    // DISTRICT-BY-DISTRICT PROCEDURAL URBAN POPULATION
    // ====================================================
    for (const [key, d] of Object.entries(DISTRICTS)) {
        if (key === 'sgnp_highlands') continue; // Protected national park forest reserve

        const cx = d.centroid.x;
        const cz = d.centroid.z;
        const zone = d.zone;

        // Skip exact world origin (Home HQ Plaza already has Stark Tower)
        const isHomeHQ = Math.hypot(cx, cz) < 60;

        // Generate street blocks based on zone character
        if (zone === 'south_mumbai') {
            // Victorian Gothic, colonial stone blocks and Art-Deco waterfront apartments
            const offsets = [
                [-80, -60], [-80, 60], [80, -60], [80, 60],
                [-140, 0], [140, 0], [-100, -120], [100, 120]
            ];
            offsets.forEach(([ox, oz], idx) => {
                const bx = cx + ox;
                const bz = cz + oz;
                if (idx % 2 === 0) {
                    buildBatchedApartment(bx, bz, 24, 16, 5 + (idx % 3));
                } else {
                    buildBatchedChawl(bx, bz, 20, 12, 4);
                }
            });
        } else if (zone === 'central_nexus') {
            // High-density mix: mill towers, chawl settlements, artisan workshops
            const offsets = [
                [-90, -90], [-90, 90], [90, -90], [90, 90],
                [-150, -40], [150, 40], [-50, 160], [50, -160]
            ];
            offsets.forEach(([ox, oz], idx) => {
                const bx = cx + ox;
                const bz = cz + oz;
                if (Math.hypot(bx, bz) < 45) return; // Keep Home HQ Plaza clear
                if (idx % 3 === 0) {
                    buildBatchedCorporateTower(bx, bz, 26, 22, 10 + (idx % 4));
                } else if (idx % 3 === 1) {
                    buildBatchedApartment(bx, bz, 22, 15, 6);
                } else {
                    buildBatchedChawl(bx, bz, 18, 12, 3);
                }
            });
        } else if (zone === 'western_suburbs') {
            // High-rise apartments, commercial retail boulevards, Bandra/Andheri towers
            const offsets = [
                [-100, -80], [-100, 80], [100, -80], [100, 80],
                [-160, -30], [160, 30], [-70, 140], [70, -140],
                [-140, 110], [140, -110]
            ];
            offsets.forEach(([ox, oz], idx) => {
                const bx = cx + ox;
                const bz = cz + oz;
                // Leave buffer around Fr. Agnel school gate
                if (Math.hypot(bx - (-1350), bz - 520) < 45) return;
                if (idx % 3 === 0) {
                    buildBatchedCorporateTower(bx, bz, 28, 20, 11 + (idx % 5));
                } else {
                    buildBatchedApartment(bx, bz, 24, 16, 7 + (idx % 4));
                }
            });
        } else if (zone === 'eastern_suburbs') {
            // Industrial tech parks, housing colonies, chawls along LBS & EEH
            const offsets = [
                [-85, -75], [-85, 75], [85, -75], [85, 75],
                [-130, -30], [130, 30], [-60, 130], [60, -130],
                [-120, 100], [120, -100]
            ];
            offsets.forEach(([ox, oz], idx) => {
                const bx = cx + ox;
                const bz = cz + oz;
                if (idx % 3 === 0) {
                    buildBatchedCorporateTower(bx, bz, 25, 20, 9 + (idx % 4));
                } else if (idx % 3 === 1) {
                    buildBatchedApartment(bx, bz, 22, 14, 6);
                } else {
                    buildBatchedChawl(bx, bz, 19, 11, 4);
                }
            });
        } else if (zone === 'navi_mumbai') {
            // Sprawling Mindspace IT campuses (surrounding DMCE College in Airoli), Vashi commercial sectors
            const offsets = [
                [-110, -90], [-110, 90], [110, -90], [110, 90],
                [-160, -40], [160, 40], [-70, 150], [70, -150],
                [-150, 120], [150, -120], [-60, -160], [60, 160]
            ];
            offsets.forEach(([ox, oz], idx) => {
                const bx = cx + ox;
                const bz = cz + oz;
                // Leave clear buffer around DMCE college campus (1850, 1450)
                if (Math.hypot(bx - 1850, bz - 1450) < 55) return;
                if (idx % 2 === 0) {
                    // Modern sprawling glass IT campus tower
                    buildBatchedCorporateTower(bx, bz, 32, 24, 12 + (idx % 6));
                } else {
                    // Planned residential tower
                    buildBatchedApartment(bx, bz, 26, 18, 8 + (idx % 4));
                }
            });
        } else if (zone === 'thane') {
            // Thane lakeside high-rises and commercial towers
            const offsets = [
                [-95, -80], [-95, 80], [95, -80], [95, 80],
                [-140, 0], [140, 0], [-80, 130], [80, -130]
            ];
            offsets.forEach(([ox, oz], idx) => {
                const bx = cx + ox;
                const bz = cz + oz;
                if (idx % 2 === 0) {
                    buildBatchedCorporateTower(bx, bz, 28, 22, 10 + (idx % 4));
                } else {
                    buildBatchedApartment(bx, bz, 24, 16, 7);
                }
            });
        }
    }

    // Materials
    const chawlTex = createChawlFacadeTexture();
    chawlTex.repeat.set(3, 2);
    const plasterMat = new THREE.MeshStandardMaterial({ map: chawlTex, roughness: 0.85 });

    const aptTex = createApartmentFacadeTexture('#fde2e4');
    aptTex.repeat.set(2, 2);
    const aptMat = new THREE.MeshStandardMaterial({ map: aptTex, roughness: 0.8 });

    const corpTex = createCorporateGlassTexture();
    corpTex.repeat.set(4, 12);
    const corpMat = new THREE.MeshStandardMaterial({ map: corpTex, roughness: 0.2, metalness: 0.8 });

    const trimMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.7 });

    if (batchedWallsPlaster.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedWallsPlaster), plasterMat);
        m.name = "MumbaiBatchedChawls";
        scene.add(m);
    }
    if (batchedWallsApartments.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedWallsApartments), aptMat);
        m.name = "MumbaiBatchedApartments";
        scene.add(m);
    }
    if (batchedWallsCorporate.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedWallsCorporate), corpMat);
        m.name = "MumbaiBatchedCorporateTowers";
        scene.add(m);
    }
    if (batchedConcreteTrim.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedConcreteTrim), trimMat);
        scene.add(m);
    }
    if (batchedMetal.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedMetal), metalMat);
        scene.add(m);
    }
    if (batchedRoofs.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedRoofs), roofMat);
        scene.add(m);
    }
    if (batchedGlass.length > 0) {
        const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedGlass), glassMat);
        scene.add(m);
    }
}
