import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { registerBoxCollider } from '../world/worldColliders.js';
import {
    createChawlFacadeTexture,
    createApartmentFacadeTexture,
    createCorporateGlassTexture
} from '../world/textures.js';
import { registerLODItem } from '../world/chunkManager.js';

// ==========================================
// PROCEDURAL MUMBAI URBAN ARCHITECTURE BATCH
// 4 Building Families (Chawls, Art-Deco Apartments, Corporate Glass, Kirana Shops)
// Highly Batched Draw-Call Optimization
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

    function buildBatchedApartment(x, z, w, d, storeys) {
        const storeyH = 3.2;
        const totalH = storeys * storeyH;
        addBox(batchedWallsApartments, x, totalH / 2, z, w, totalH, d);
        addBox(batchedConcreteTrim, x, totalH + 0.4, z, w + 0.4, 0.8, d + 0.4);
        addCylinder(batchedMetal, x - w / 4, totalH + 1.2, z - d / 4, 1.1, 1.1, 2.0);
        addCylinder(batchedMetal, x + w / 4, totalH + 1.2, z + d / 4, 1.1, 1.1, 2.0);

        const minX = x - w / 2;
        const maxX = x + w / 2;
        const minZ = z - d / 2;
        const maxZ = z + d / 2;
        registerBoxCollider(minX, maxX, minZ, maxZ, 'Apartment', -5, totalH + 1.5);
        cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'apartment' });
    }

    function buildBatchedCorporateTower(x, z, w, d, storeys) {
        const storeyH = 4.0;
        const totalH = storeys * storeyH;
        addBox(batchedWallsCorporate, x, totalH / 2, z, w, totalH, d);
        addBox(batchedGlass, x, totalH / 2, z, w + 0.2, totalH - 0.4, d + 0.2);
        addBox(batchedConcreteTrim, x, totalH + 0.5, z, w + 0.4, 1.0, d + 0.4);

        const minX = x - w / 2;
        const maxX = x + w / 2;
        const minZ = z - d / 2;
        const maxZ = z + d / 2;
        registerBoxCollider(minX, maxX, minZ, maxZ, 'CorporateTower', -5, totalH + 2.0);
        cityBuildings.push({ minX, maxX, minZ, maxZ, type: 'corporate' });
    }

    // Grid placements across suburban Mumbai districts
    // Bandra East & Dharavi Koliwada residential chawls
    [[-80, 180], [-120, 220], [80, 180], [120, 220], [-60, 260], [60, 260]].forEach(([bx, bz]) => {
        buildBatchedChawl(bx, bz, 18, 10, 3);
    });

    // Lower Parel / Dadar residential apartments
    [[-160, -180], [-220, -220], [160, -180], [220, -220], [-180, 480], [180, 480]].forEach(([ax, az]) => {
        buildBatchedApartment(ax, az, 22, 14, 6);
    });

    // BKC / Worli corporate glass towers
    [[-140, 360], [-200, 400], [140, 360], [200, 400], [-80, -320], [80, -320]].forEach(([cx, cz]) => {
        buildBatchedCorporateTower(cx, cz, 26, 20, 12);
    });

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

    if (batchedWallsPlaster.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedWallsPlaster), plasterMat));
    if (batchedWallsApartments.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedWallsApartments), aptMat));
    if (batchedWallsCorporate.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedWallsCorporate), corpMat));
    if (batchedConcreteTrim.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedConcreteTrim), trimMat));
    if (batchedMetal.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedMetal), metalMat));
    if (batchedRoofs.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedRoofs), roofMat));
    if (batchedGlass.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(batchedGlass), glassMat));
}
