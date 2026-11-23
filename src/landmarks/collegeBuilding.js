import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { registerBoxCollider, registerCylinderCollider } from '../world/worldColliders.js';
import { createModernFacadeTexture } from '../world/textures.js';
import { LANDMARKS } from '../data/mumbaiGeography.js';

// ==========================================
// LANDMARK: DATTA MEGHE COLLEGE OF ENGINEERING (DMCE)
// (Airoli, Navi Mumbai: X = 1850, Y = 12.0, Z = 1450)
// Higher Education & Engineering Credentials
// ==========================================

export const poiCollege = {
    x: LANDMARKS.college_dmce ? LANDMARKS.college_dmce.x : 1850,
    y: LANDMARKS.college_dmce ? LANDMARKS.college_dmce.y : 12.0,
    z: LANDMARKS.college_dmce ? LANDMARKS.college_dmce.z : 1450,
    radius: 25
};

export function buildCollegeDistrict(scene) {
    const cx = poiCollege.x;
    const cy = poiCollege.y;
    const cz = poiCollege.z;

    registerBoxCollider(cx - 22, cx + 22, cz - 16, cz + 4, 'DmceMainBuilding', cy - 5, cy + 24);
    registerBoxCollider(cx - 45, cx - 25, cz - 12, cz + 10, 'DmceWorkshopBlock', cy - 5, cy + 12);
    registerBoxCollider(cx + 25, cx + 45, cz - 12, cz + 10, 'DmceLibraryAndLabs', cy - 5, cy + 18);

    const college = new THREE.Group();
    college.name = "DmceEngineeringCollege";

    const modernFacadeTex = createModernFacadeTexture();
    modernFacadeTex.repeat.set(5, 3);

    // 1. Grand 4-Story Engineering Campus Building Facade (White Plaster with Architectural Brown Accents)
    // Matches refs/college/college_main_block_facade.jpg
    const mainBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(44, 20, 16),
        new THREE.MeshStandardMaterial({ map: modernFacadeTex, roughness: 0.65 })
    );
    mainBuilding.position.set(0, 10, -6);
    mainBuilding.receiveShadow = true;
    college.add(mainBuilding);

    // Architectural Warm Brown Trim & Horizontal Bands (DMCE Airoli signature aesthetic)
    const brownTrimGeoms = [];
    [5.0, 10.0, 15.0, 19.8].forEach(by => {
        const hBand = new THREE.BoxGeometry(44.4, 0.6, 16.4);
        hBand.translate(0, by, -6);
        brownTrimGeoms.push(hBand);
    });
    // Vertical facade accent columns flanking the entrance
    [-7.2, 7.2].forEach(vx => {
        const vCol = new THREE.BoxGeometry(0.8, 19.5, 16.6);
        vCol.translate(vx, 10, -6);
        brownTrimGeoms.push(vCol);
    });
    const brownTrimMesh = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(brownTrimGeoms),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
    );
    college.add(brownTrimMesh);

    // Grand Central Entrance Concrete Steps (refs/college/college_main_block_facade.jpg)
    const stepsGeoms = [];
    for (let st = 0; st < 6; st++) {
        const step = new THREE.BoxGeometry(16 - st * 0.4, 0.4, 2.0);
        step.translate(0, 0.2 + st * 0.35, 2.0 - st * 1.2);
        stepsGeoms.push(step);
    }
    const stepsMesh = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(stepsGeoms),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 })
    );
    stepsMesh.receiveShadow = true;
    college.add(stepsMesh);

    // 2. Central Glass Atrium & Grand Portico
    const atrium = new THREE.Mesh(
        new THREE.BoxGeometry(14, 22, 18),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.85 })
    );
    atrium.position.set(0, 11, -5);
    college.add(atrium);

    // Archway entrance
    const arch = new THREE.Mesh(
        new THREE.BoxGeometry(10, 12, 18.2),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    arch.position.set(0, 6, -5);
    college.add(arch);

    // 3. Computer Engineering & IT Labs Wing (East Wing - refs/college/college_campus_annex.jpg)
    const itWingGeoms = [];
    const itBlock = new THREE.BoxGeometry(22, 16, 20);
    itBlock.translate(34, 8, -2);
    itWingGeoms.push(itBlock);
    // Server room roof HVAC units
    [-4, 4].forEach(hx => {
        const hvac = new THREE.BoxGeometry(3.5, 2.0, 4.0);
        hvac.translate(34 + hx, 17, -2);
        itWingGeoms.push(hvac);
    });
    const itWing = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(itWingGeoms),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
    );
    college.add(itWing);

    // 4. Mechanical & Civil Engineering Workshop Shed (West Wing - high clearance)
    const wsGeoms = [];
    const workshopBlock = new THREE.BoxGeometry(20, 10, 22);
    workshopBlock.translate(-34, 5, -2);
    wsGeoms.push(workshopBlock);
    // Industrial roof monitors / clerestory ventilators
    for (let rx = -41; rx <= -27; rx += 5) {
        const vent = new THREE.BoxGeometry(2.5, 2.0, 18);
        vent.translate(rx, 11, -2);
        wsGeoms.push(vent);
    }
    const workshop = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(wsGeoms),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 })
    );
    college.add(workshop);

    // Sector 3 Airoli Campus Perimeter Boundary & Entrance Gate (refs/college/college_entrance_gate_approach.jpg)
    const gateGeoms = [];
    // Boundary wall
    const wallL = new THREE.BoxGeometry(28, 2.4, 0.8);
    wallL.translate(-26, 1.2, 34);
    const wallR = new THREE.BoxGeometry(28, 2.4, 0.8);
    wallR.translate(26, 1.2, 34);
    gateGeoms.push(wallL, wallR);
    // Gate pillars with light lanterns
    [-12, 12].forEach(px => {
        const pillar = new THREE.BoxGeometry(2.2, 4.8, 2.2);
        pillar.translate(px, 2.4, 34);
        const lantern = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        lantern.translate(px, 5.2, 34);
        gateGeoms.push(pillar, lantern);
    });
    const gateMesh = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(gateGeoms),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 })
    );
    college.add(gateMesh);

    // 5. Authentic Bilingual Grand Signboard
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.strokeStyle = '#38bdf8';
    sCtx.lineWidth = 4;
    sCtx.strokeRect(4, 4, 504, 120);

    sCtx.fillStyle = '#f8fafc';
    sCtx.font = 'bold 20px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText("दत्ता मेघे अभियांत्रिकी महाविद्यालय • ऐरोली (नवी मुंबई)", 256, 38);

    sCtx.fillStyle = '#fef08a';
    sCtx.font = 'bold 22px sans-serif';
    sCtx.fillText("DATTA MEGHE COLLEGE OF ENGINEERING", 256, 74);

    sCtx.fillStyle = '#38bdf8';
    sCtx.font = 'bold 16px monospace';
    sCtx.fillText("B.E. Computer Engineering • AI & Systems Lab", 256, 106);

    const board = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 4.5),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    board.position.set(0, 17, 3.2);
    college.add(board);

    // 6. Cherry Blossom & Ashoka Campus Trees
    const trunkGeoms = [];
    const leavesGeoms = [];
    [-24, 24, -40, 40].forEach(tx => {
        const trunk = new THREE.CylinderGeometry(0.5, 0.7, 5, 8);
        trunk.translate(tx, 2.5, 12);
        trunkGeoms.push(trunk);

        const leaves = new THREE.SphereGeometry(3.6, 12, 12);
        leaves.translate(tx, 6.5, 12);
        leavesGeoms.push(leaves);
    });
    college.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(trunkGeoms), new THREE.MeshStandardMaterial({ color: 0x5c4033 })));
    college.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(leavesGeoms), new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 })));

    // 7. Graduation Cap & Engineering Tech Fest Monument
    const capMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const capBoard = new THREE.BoxGeometry(3.2, 0.22, 3.2);
    capBoard.rotateY(Math.PI / 4);
    capBoard.translate(0, 3.2, 14);
    const capSkull = new THREE.CylinderGeometry(1.1, 1.1, 1.1, 16);
    capSkull.translate(0, 2.6, 14);
    const capPedestal = new THREE.CylinderGeometry(1.8, 2.2, 1.6, 16);
    capPedestal.translate(0, 0.8, 14);
    college.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries([capBoard, capSkull, capPedestal]), capMat));
    registerCylinderCollider(cx, cz + 14, 2.2, 'DmceGradMonument');

    // 8. Canteen Adda Pavilion with Student Benches
    const canteen = new THREE.Mesh(
        new THREE.BoxGeometry(16, 0.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x78716c })
    );
    canteen.position.set(0, 0.2, 26);
    college.add(canteen);

    college.position.set(cx, cy, cz);
    scene.add(college);
    return college;
}
