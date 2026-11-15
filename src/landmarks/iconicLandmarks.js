import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { registerBoxCollider, registerCylinderCollider } from '../world/worldColliders.js';
import { applyVertexColor } from '../world/textures.js';
import { LANDMARKS } from '../data/mumbaiGeography.js';

// ==========================================
// ICONIC MUMBAI HERITAGE LANDMARKS
// 1. Gateway of India (South Coastal Waterfront)
// 2. Marine Drive Promenade & Tetrapods
// 3. Haji Ali Dargah & Tidal Causeway
// 4. Asiatic Society Town Hall & Steps
// 5. Art Deco Cinema ("Art Regal")
// ==========================================

export const poiGateway = {
    x: LANDMARKS.gateway_of_india ? LANDMARKS.gateway_of_india.x : -350,
    y: LANDMARKS.gateway_of_india ? LANDMARKS.gateway_of_india.y : 2.5,
    z: LANDMARKS.gateway_of_india ? LANDMARKS.gateway_of_india.z : -2250,
    radius: 35
};

export function buildIconicLandmarks(scene) {
    buildGatewayOfIndia(scene);
    buildHajiAliDargah(scene);
    buildAsiaticLibrary(scene);
    buildArtDecoCinema(scene);
}

// ------------------------------------------
// 1. GATEWAY OF INDIA MONUMENT
// ------------------------------------------
export function buildGatewayOfIndia(scene) {
    const gx = poiGateway.x;
    const gy = poiGateway.y;
    const gz = poiGateway.z;

    registerBoxCollider(gx - 17, gx - 5.5, gz - 6, gz + 6, 'GatewayArchLeftPier', gy - 5, gy + 28);
    registerBoxCollider(gx + 5.5, gx + 17, gz - 6, gz + 6, 'GatewayArchRightPier', gy - 5, gy + 28);
    registerBoxCollider(gx - 5.5, gx + 5.5, gz - 6, gz + 6, 'GatewayArchRoof', gy + 14, gy + 28);

    const monument = new THREE.Group();
    monument.name = "GatewayOfIndia";

    const basaltMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.85, metalness: 0.08 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0xb58452, roughness: 0.9 });

    const basaltGeoms = [];
    const darkStoneGeoms = [];

    // Left and Right Piers
    const pierLeft = new THREE.BoxGeometry(10.5, 20, 12);
    pierLeft.translate(-10.75, 10, 0);
    basaltGeoms.push(pierLeft);

    const pierRight = new THREE.BoxGeometry(10.5, 20, 12);
    pierRight.translate(10.75, 10, 0);
    basaltGeoms.push(pierRight);

    // Archway Top Span
    const archTopSpan = new THREE.BoxGeometry(11, 6, 12);
    archTopSpan.translate(0, 17, 0);
    basaltGeoms.push(archTopSpan);

    // Attic & Parapet Cornice
    const cornice = new THREE.BoxGeometry(34, 2.5, 13);
    cornice.translate(0, 21.2, 0);
    darkStoneGeoms.push(cornice);

    const upperAttic = new THREE.BoxGeometry(24, 4, 9);
    upperAttic.translate(0, 24, 0);
    basaltGeoms.push(upperAttic);

    // 4 Corner Turrets with Mini Domes
    [[-15, -5], [15, -5], [-15, 5], [15, 5]].forEach(([tx, tz]) => {
        const turret = new THREE.CylinderGeometry(1.5, 1.7, 14, 16);
        turret.translate(tx, 25, tz);
        darkStoneGeoms.push(turret);

        const dome = new THREE.SphereGeometry(1.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        dome.translate(tx, 32, tz);
        basaltGeoms.push(dome);

        const spire = new THREE.ConeGeometry(0.4, 3, 8);
        spire.translate(tx, 34.5, tz);
        darkStoneGeoms.push(spire);
    });

    if (basaltGeoms.length > 0) {
        monument.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(basaltGeoms), basaltMat));
    }
    if (darkStoneGeoms.length > 0) {
        monument.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(darkStoneGeoms), darkStoneMat));
    }

    // Indian National Flag
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 }));
    mast.position.set(0, 30, 0);
    monument.add(mast);

    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 64; flagCanvas.height = 36;
    const fCtx = flagCanvas.getContext('2d');
    fCtx.fillStyle = '#ff9933'; fCtx.fillRect(0, 0, 64, 12);
    fCtx.fillStyle = '#ffffff'; fCtx.fillRect(0, 12, 64, 12);
    fCtx.fillStyle = '#138808'; fCtx.fillRect(0, 24, 64, 12);
    fCtx.fillStyle = '#000080'; fCtx.beginPath(); fCtx.arc(32, 18, 4, 0, Math.PI * 2); fCtx.fill();
    const flagMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(flagCanvas), side: THREE.DoubleSide }));
    flagMesh.position.set(1.8, 33, 0);
    monument.add(flagMesh);

    monument.position.set(gx, gy, gz);
    scene.add(monument);
}

// ------------------------------------------
// 2. HAJI ALI DARGAH COASTAL SHRINE & CAUSEWAY
// ------------------------------------------
export function buildHajiAliDargah(scene) {
    const hajiAliGroup = new THREE.Group();
    hajiAliGroup.name = "HajiAliDargah";
    const hajiAliGeoms = [];

    // Causeway Walkway Deck
    const deck = applyVertexColor(new THREE.BoxGeometry(6.4, 0.6, 120), 0xd6d3d1);
    deck.translate(-180, 0.3, -80);
    hajiAliGeoms.push(deck);

    // Parapet Walls
    [-3.0, 3.0].forEach(ox => {
        const wall = applyVertexColor(new THREE.BoxGeometry(0.3, 0.9, 120), 0xffffff);
        wall.translate(-180 + ox, 0.75, -80);
        hajiAliGeoms.push(wall);
    });

    // Islet Foundation Platform
    const isletRock = applyVertexColor(new THREE.CylinderGeometry(26, 29, 2.2, 24), 0x44403c);
    isletRock.translate(-180, 0.0, -160);
    hajiAliGeoms.push(isletRock);

    // Marble Courtyard
    const courtyard = applyVertexColor(new THREE.CylinderGeometry(24, 24, 0.4, 32), 0xf8fafc);
    courtyard.translate(-180, 1.2, -160);
    hajiAliGeoms.push(courtyard);

    // Main Sanctuary Hall
    const hall = applyVertexColor(new THREE.BoxGeometry(18, 5.5, 18), 0xf8fafc);
    hall.translate(-180, 4.4, -162);
    hajiAliGeoms.push(hall);

    // Central Pure White Dome
    const drum = applyVertexColor(new THREE.CylinderGeometry(5.2, 5.4, 1.2, 24), 0xffffff);
    drum.translate(-180, 7.8, -162);
    hajiAliGeoms.push(drum);

    const dome = applyVertexColor(new THREE.SphereGeometry(5.2, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2), 0xffffff);
    dome.translate(-180, 8.4, -162);
    hajiAliGeoms.push(dome);

    const domeFinial = applyVertexColor(new THREE.ConeGeometry(0.35, 2.4, 8), 0xf59e0b);
    domeFinial.translate(-180, 14.8, -162);
    hajiAliGeoms.push(domeFinial);

    // Slender Minaret Tower
    const minShaft = applyVertexColor(new THREE.CylinderGeometry(1.6, 2.0, 20, 16), 0xffffff);
    minShaft.translate(-168, 12.0, -148);
    hajiAliGeoms.push(minShaft);

    const minDome = applyVertexColor(new THREE.SphereGeometry(1.7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0xffffff);
    minDome.translate(-168, 23.0, -148);
    hajiAliGeoms.push(minDome);

    const minSpire = applyVertexColor(new THREE.ConeGeometry(0.25, 2.5, 8), 0xf59e0b);
    minSpire.translate(-168, 25.5, -148);
    hajiAliGeoms.push(minSpire);

    const hajiAliMesh = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(hajiAliGeoms, false),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 })
    );
    hajiAliMesh.receiveShadow = true;
    hajiAliGroup.add(hajiAliMesh);
    scene.add(hajiAliGroup);

    registerBoxCollider(-184.0, -176.0, -142, -20, 'HajiAliCauseway', -2, 0.6, 0.6);
    registerBoxCollider(-204, -156, -182, -138, 'HajiAliIslet', -2, 1.0, 1.0);
    registerBoxCollider(-192, -168, -172, -152, 'HajiAliSanctuary', -2, 17.0, 8.7);
    registerBoxCollider(-170.5, -165.5, -150.5, -145.5, 'HajiAliMinaret', -2, 28.0, 26.0);
}

// ------------------------------------------
// 3. ASIATIC SOCIETY TOWN HALL & LIBRARY
// ------------------------------------------
export function buildAsiaticLibrary(scene) {
    const asiaticGroup = new THREE.Group();
    asiaticGroup.name = "AsiaticLibrary";
    const stoneGeoms = [];

    // 30 Classical Steps
    for (let i = 0; i < 8; i++) {
        const step = applyVertexColor(new THREE.BoxGeometry(32 - i * 0.4, 0.45, 1.3), 0xf8fafc);
        step.translate(100, 0.225 + i * 0.45, 96.5 + i * 1.3);
        stoneGeoms.push(step);
    }

    // Grand Portico Colonnade (8 Doric Columns)
    for (let c = -14; c <= 14; c += 4.0) {
        const col = applyVertexColor(new THREE.CylinderGeometry(0.65, 0.75, 9.5, 16), 0xffffff);
        col.translate(100 + c, 8.5, 108);
        stoneGeoms.push(col);
    }

    // Greek Triangular Pediment
    const pediment = applyVertexColor(new THREE.ConeGeometry(17, 3.8, 3), 0xffffff);
    pediment.rotateZ(Math.PI / 2);
    pediment.rotateX(Math.PI / 2);
    pediment.translate(100, 15.0, 108);
    stoneGeoms.push(pediment);

    // Main Town Hall
    const hall = applyVertexColor(new THREE.BoxGeometry(36, 14, 20), 0xf1f5f9);
    hall.translate(100, 10.5, 118);
    stoneGeoms.push(hall);

    const asiaticMesh = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries(stoneGeoms, false),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 })
    );
    asiaticGroup.add(asiaticMesh);
    scene.add(asiaticGroup);

    registerBoxCollider(83, 117, 95, 107, 'AsiaticLibrarySteps', -2, 5.0, 3.6);
    registerBoxCollider(81, 119, 107, 131, 'AsiaticLibraryHall', -5, 18.0, 14.6);
}

// ------------------------------------------
// 4. ART DECO CINEMA ("ART REGAL")
// ------------------------------------------
export function buildArtDecoCinema(scene) {
    const artDecoGroup = new THREE.Group();
    artDecoGroup.name = "ArtDecoCinema";

    const cinema = applyVertexColor(new THREE.BoxGeometry(20, 16, 20), 0xfde047);
    cinema.translate(-90, 8, 60);

    const spire = applyVertexColor(new THREE.CylinderGeometry(0.4, 0.8, 8, 8), 0x06b6d4);
    spire.translate(-90, 19, 60);

    const mesh = new THREE.Mesh(
        BufferGeometryUtils.mergeGeometries([cinema, spire], false),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })
    );
    artDecoGroup.add(mesh);
    scene.add(artDecoGroup);

    registerBoxCollider(-101, -79, 49, 71, 'ArtDecoRegalCinema', -5, 20.0, 17.6);
}
