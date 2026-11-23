import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { registerBoxCollider, registerCylinderCollider } from '../world/worldColliders.js';
import { applyVertexColor } from '../world/textures.js';
import { LANDMARKS } from '../data/mumbaiGeography.js';

// ==========================================
// LANDMARK: FR. AGNEL TECHNICAL HIGH SCHOOL
// (Bandra West Bandstand Coastal Mountain Ridge: X = -1350, Y = 32.0, Z = 520)
// Architectural Reference Model & Academic Foundation
// ==========================================

export const poiSchool = {
    x: LANDMARKS.school_fr_agnel ? LANDMARKS.school_fr_agnel.x : -1350,
    y: LANDMARKS.school_fr_agnel ? LANDMARKS.school_fr_agnel.y : 32.0,
    z: LANDMARKS.school_fr_agnel ? LANDMARKS.school_fr_agnel.z : 520,
    radius: 25
};

export function buildSchoolDistrict(scene) {
    const sx = poiSchool.x;
    const sy = poiSchool.y;
    const sz = poiSchool.z;

    // Register colliders relative to Bandra ridge elevation
    registerBoxCollider(sx - 24, sx + 24, sz - 14, sz + 12, 'FrAgnelAcademicBlock', sy - 5, sy + 28);
    registerBoxCollider(sx + 26, sx + 50, sz - 10, sz + 10, 'FrAgnelTechnicalWorkshops', sy - 5, sy + 14);
    registerBoxCollider(sx - 28, sx - 22, sz - 8, sz + 4, 'FrAgnelSchoolBus', sy - 5, sy + 4.5);

    const school = new THREE.Group();
    school.name = "FrAgnelTechnicalSchool";

    // 1. Materials (Terraced Coastal Red Brick & Yellow Brise-Soleil from refs/school/)
    const redBrickMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.85 }); // Coastal weathered red brick
    const yellowLouverMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 }); // Yellow solar louvers / brise-soleil
    const stoneBaseMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 }); // Coastal ridge basalt stone foundation
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x450a0a, roughness: 0.7 }); // Deep maroon architectural trim
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 }); // Ocean-reflecting blue glass

    // 2. Foundation Terrace on Bandra Coastal Mountain Ridge
    const terraceGeoms = [];
    const mainTerrace = new THREE.BoxGeometry(112, 3, 72);
    mainTerrace.translate(10, 1.5, 0);
    terraceGeoms.push(mainTerrace);

    // Stepped Entrance Ridge Stairs
    for (let st = 0; st < 6; st++) {
        const step = new THREE.BoxGeometry(18, 0.5, 1.5);
        step.translate(0, 0.25 + st * 0.4, -20 - st * 1.4);
        terraceGeoms.push(step);
    }
    const terraceMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(terraceGeoms), stoneBaseMat);
    terraceMesh.receiveShadow = true;
    school.add(terraceMesh);

    // 3. Main Academic High School Hall (Terraced Red Brick Facade)
    const facadeGeoms = [];
    const mainHall = new THREE.BoxGeometry(44, 20, 18);
    mainHall.translate(0, 13, 0);
    facadeGeoms.push(mainHall);

    // Central Symmetrical Bell Tower / Administration Spire
    const tower = new THREE.BoxGeometry(10, 28, 12);
    tower.translate(0, 17, -4);
    facadeGeoms.push(tower);

    // Portico Colonnade Entrance
    const portico = new THREE.BoxGeometry(14, 10, 4);
    portico.translate(0, 8, -11);
    facadeGeoms.push(portico);

    // Quadrangle Courtyard Enclosure Classroom Wings (East & West wings)
    const westWing = new THREE.BoxGeometry(8, 16, 26);
    westWing.translate(-18, 11, 14);
    facadeGeoms.push(westWing);

    const eastWing = new THREE.BoxGeometry(8, 16, 26);
    eastWing.translate(18, 11, 14);
    facadeGeoms.push(eastWing);

    const mergedFacade = BufferGeometryUtils.mergeGeometries(facadeGeoms);
    const fMesh = new THREE.Mesh(mergedFacade, redBrickMat);
    fMesh.castShadow = true;
    fMesh.receiveShadow = true;
    school.add(fMesh);

    // 4. Iconic Yellow Brise-Soleil / Solar Louver Fins (refs/school/school_main_facade.jpg)
    const louverGeoms = [];
    // Vertical sun louvers on North & South classroom facades
    [-17, -15, -13, -11, 11, 13, 15, 17].forEach(lx => {
        [6.5, 13.5, 19.5].forEach(ly => {
            const louver = new THREE.BoxGeometry(0.35, 3.4, 0.9);
            louver.translate(lx, ly, -9.3);
            louverGeoms.push(louver);
        });
    });
    // Courtyard inner louvers
    [-14, -10, -6, 6, 10, 14].forEach(cx => {
        [8, 14].forEach(cy => {
            const cLouver = new THREE.BoxGeometry(0.35, 3.2, 0.8);
            cLouver.translate(cx, cy, 9.2);
            louverGeoms.push(cLouver);
        });
    });
    const lMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(louverGeoms), yellowLouverMat);
    lMesh.castShadow = true;
    school.add(lMesh);

    // 4. Heritage Cross Emblem atop Administration Spire
    const crossGeoms = [];
    const crossV = new THREE.BoxGeometry(0.8, 4.0, 0.8);
    crossV.translate(0, 33, -4);
    crossGeoms.push(crossV);
    const crossH = new THREE.BoxGeometry(2.6, 0.8, 0.8);
    crossH.translate(0, 33.6, -4);
    crossGeoms.push(crossH);
    const crossMesh = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(crossGeoms),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.2 })
    );
    school.add(crossMesh);

    // 5. Technical Workshops Wing (Engineering vocational section)
    const workshopGeoms = [];
    const wsBuilding = new THREE.BoxGeometry(22, 10, 20);
    wsBuilding.translate(36, 8, 0);
    workshopGeoms.push(wsBuilding);

    // Saw-tooth roof profile
    for (let rx = 27; rx <= 45; rx += 6) {
        const shed = new THREE.ConeGeometry(3.5, 2.5, 4);
        shed.rotateY(Math.PI / 4);
        shed.translate(rx, 14.25, 0);
        workshopGeoms.push(shed);
    }
    const wsMesh = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(workshopGeoms),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 })
    );
    wsMesh.castShadow = true;
    school.add(wsMesh);

    // 6. Cornices & Maroon Roof Trim
    const trimGeoms = [];
    [10, 16.5, 23.2].forEach(by => {
        const band = new THREE.BoxGeometry(44.4, 0.5, 18.4);
        band.translate(0, by, 0);
        trimGeoms.push(band);
    });
    // Tower roof cornice
    const towerCornice = new THREE.BoxGeometry(10.6, 0.8, 12.6);
    towerCornice.translate(0, 31.4, -4);
    trimGeoms.push(towerCornice);

    const mergedTrim = BufferGeometryUtils.mergeGeometries(trimGeoms);
    school.add(new THREE.Mesh(mergedTrim, trimMat));

    // 7. Academic Arched & Ribbon Windows
    const glassGeoms = [];
    [6.5, 13.5, 19.5].forEach(wy => {
        [-15, 15].forEach(wx => {
            const win = new THREE.PlaneGeometry(10, 2.4);
            win.rotateY(Math.PI);
            win.translate(wx, wy, -9.05);
            glassGeoms.push(win);
        });
    });
    const mergedGlass = BufferGeometryUtils.mergeGeometries(glassGeoms);
    school.add(new THREE.Mesh(mergedGlass, glassMat));

    // 8. Authentic Bilingual Entrance Signboard
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#7f1d1d'; // Crimson background
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("फादर एग्नेल टेक्निकल हायस्कूल • वांद्रे (पश्चिम)", 256, 44);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText("FR. AGNEL TECHNICAL HIGH SCHOOL", 256, 80);

    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 15px monospace';
    ctx.fillText("BANDRA WEST, MUMBAI • EST. 1957", 256, 110);

    const signBoard = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 3.0),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    signBoard.position.set(0, 13.5, -13.1);
    signBoard.rotation.y = Math.PI;
    school.add(signBoard);

    // 9. Interactive Academic Credential Showcase Monument
    const monumentMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const monBase = new THREE.CylinderGeometry(1.4, 1.6, 1.2, 16);
    monBase.translate(0, 3.6, -18);
    const monColumn = new THREE.BoxGeometry(2.4, 3.0, 0.4);
    monColumn.translate(0, 5.7, -18);
    school.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries([monBase, monColumn]), monumentMat));
    registerCylinderCollider(sx, sz - 18, 1.8, 'FrAgnelShowcaseMonument');

    // 10. School Sports Playground, Courtyard Quad Assembly Ground & Yellow School Bus
    // Courtyard Quad Assembly Ground & Flagpole (refs/school/school_courtyard_quad.jpg)
    const quadFloor = applyVertexColor(new THREE.BoxGeometry(26, 0.2, 24), 0x94a3b8);
    quadFloor.translate(0, 1.6, 14);
    const flagBase = applyVertexColor(new THREE.CylinderGeometry(0.8, 1.0, 0.6, 8), 0xffffff);
    flagBase.translate(0, 1.9, 14);
    const flagPole = applyVertexColor(new THREE.CylinderGeometry(0.06, 0.06, 10, 8), 0xe2e8f0);
    flagPole.translate(0, 7.0, 14);
    const quadMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([quadFloor, flagBase, flagPole], false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    school.add(quadMesh);

    // Front Stepped Entrance Gate (refs/school/school_front_gate.jpg)
    const gatePillarL = applyVertexColor(new THREE.BoxGeometry(1.8, 6.5, 1.8), 0x991b1b);
    gatePillarL.translate(-8, 3.5, -24);
    const gatePillarR = applyVertexColor(new THREE.BoxGeometry(1.8, 6.5, 1.8), 0x991b1b);
    gatePillarR.translate(8, 3.5, -24);
    const gateLintel = applyVertexColor(new THREE.BoxGeometry(18, 1.4, 2.0), 0x991b1b);
    gateLintel.translate(0, 7.2, -24);
    const gateMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([gatePillarL, gatePillarR, gateLintel], false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
    school.add(gateMesh);

    // Yellow School Bus
    const busBody = applyVertexColor(new THREE.BoxGeometry(4.2, 2.8, 9.5), 0xf59e0b);
    busBody.translate(-25, 4.4, -2);
    const busRoof = applyVertexColor(new THREE.BoxGeometry(4.2, 0.4, 9.5), 0xffffff);
    busRoof.translate(-25, 5.9, -2);
    const busMesh = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries([busBody, busRoof], false),
        new THREE.MeshStandardMaterial({ roughness: 0.6, vertexColors: true })
    );
    school.add(busMesh);

    school.position.set(sx, sy, sz);
    scene.add(school);
    return school;
}
