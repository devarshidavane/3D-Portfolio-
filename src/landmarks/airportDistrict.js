import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { registerBoxCollider } from '../world/worldColliders.js';
import { applyVertexColor } from '../world/textures.js';
import { LANDMARKS } from '../data/mumbaiGeography.js';

// ==========================================
// LANDMARK: CSMIA INTERNATIONAL AIRPORT DISTRICT
// (Chhatrapati Shivaji Maharaj International Airport)
// Runways 09/27 & 14/32, ATC Radar Tower & 6-Aircraft Fleet
// ==========================================

export const poiAirport = {
    x: LANDMARKS.airport_csmia ? LANDMARKS.airport_csmia.x : 150,
    y: LANDMARKS.airport_csmia ? LANDMARKS.airport_csmia.y : 14.0,
    z: LANDMARKS.airport_csmia ? LANDMARKS.airport_csmia.z : 1200,
    radius: 75
};

export let atcRadarDish = null;
export const airportPlanes = [];

function createJetlinerModel(fuselageHex = 0xf8fafc, tailHex = 0xea580c, engineHex = 0x1e293b) {
    const jetGeoms = [];
    const fuselage = applyVertexColor(new THREE.CylinderGeometry(1.6, 1.6, 32, 14), fuselageHex);
    fuselage.rotateX(Math.PI / 2);
    fuselage.translate(0, 3.5, 0);
    jetGeoms.push(fuselage);

    const nose = applyVertexColor(new THREE.ConeGeometry(1.6, 6.0, 14), fuselageHex);
    nose.rotateX(Math.PI / 2);
    nose.translate(0, 3.5, 19.0);
    jetGeoms.push(nose);

    const wingL = applyVertexColor(new THREE.BoxGeometry(16, 0.25, 4.2), fuselageHex);
    wingL.rotateY(-0.35);
    wingL.translate(-9.5, 3.2, -1.0);
    jetGeoms.push(wingL);

    const wingR = applyVertexColor(new THREE.BoxGeometry(16, 0.25, 4.2), fuselageHex);
    wingR.rotateY(0.35);
    wingR.translate(9.5, 3.2, -1.0);
    jetGeoms.push(wingR);

    const hStabL = applyVertexColor(new THREE.BoxGeometry(5.5, 0.18, 1.8), fuselageHex);
    hStabL.rotateY(-0.3);
    hStabL.translate(-3.2, 5.0, -15.0);
    jetGeoms.push(hStabL);

    const hStabR = applyVertexColor(new THREE.BoxGeometry(5.5, 0.18, 1.8), fuselageHex);
    hStabR.rotateY(0.3);
    hStabR.translate(3.2, 5.0, -15.0);
    jetGeoms.push(hStabR);

    const vFinGeom = applyVertexColor(new THREE.BoxGeometry(0.24, 5.5, 3.6), tailHex);
    vFinGeom.translate(0, 6.5, -14.5);
    jetGeoms.push(vFinGeom);

    [-6.5, 6.5].forEach(ex => {
        const nacelle = applyVertexColor(new THREE.CylinderGeometry(0.9, 0.9, 4.2, 12), engineHex);
        nacelle.rotateX(Math.PI / 2);
        nacelle.translate(ex, 2.3, 0.5);
        jetGeoms.push(nacelle);

        const spinner = applyVertexColor(new THREE.ConeGeometry(0.4, 1.2, 10), 0x94a3b8);
        spinner.rotateX(Math.PI / 2);
        spinner.translate(ex, 2.3, 2.7);
        jetGeoms.push(spinner);
    });

    const nWheel = applyVertexColor(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 8), 0x020617);
    nWheel.rotateZ(Math.PI / 2);
    nWheel.translate(0, 0.45, 14.0);
    jetGeoms.push(nWheel);

    [-4.5, 4.5].forEach(gx => {
        const mW = applyVertexColor(new THREE.CylinderGeometry(0.65, 0.65, 0.45, 8), 0x020617);
        mW.rotateZ(Math.PI / 2);
        mW.translate(gx, 0.65, -1.0);
        jetGeoms.push(mW);
    });

    const mesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(jetGeoms), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }));
    mesh.castShadow = false;
    const grp = new THREE.Group();
    grp.add(mesh);

    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    strobe.position.set(0, 9.3, -15.5);
    grp.add(strobe);

    return { group: grp, strobe };
}

export function buildAirportDistrict(scene) {
    const airport = new THREE.Group();
    airport.name = "AirportDistrictCSMIA";

    const apX = poiAirport.x;
    const apY = poiAirport.y;
    const apZ = poiAirport.z;

    // 1. Main Runway 27/09 (360m L x 36m W)
    const runwayMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    const runwayMesh = new THREE.Mesh(new THREE.BoxGeometry(360, 0.2, 36), runwayMat);
    runwayMesh.position.set(0, 0.1, 0);
    runwayMesh.receiveShadow = true;
    airport.add(runwayMesh);

    // Centerline and Piano Keys
    const markGeoms = [];
    for (let cx = -160; cx <= 160; cx += 20) {
        const dash = new THREE.PlaneGeometry(10, 1.2);
        dash.rotateX(-Math.PI / 2);
        dash.translate(cx, 0.22, 0);
        markGeoms.push(dash);
    }
    [-170, 170].forEach(tx => {
        for (let k = -14; k <= 14; k += 2.5) {
            const bar = new THREE.PlaneGeometry(12, 1.4);
            bar.rotateX(-Math.PI / 2);
            bar.translate(tx, 0.22, k);
            markGeoms.push(bar);
        }
    });
    airport.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(markGeoms), lineMat));

    // 2. ATC Radar Tower (Height = 36m)
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
    const cabGlassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, transparent: true, opacity: 0.8 });
    const towerGeoms = [];

    const shaft = new THREE.CylinderGeometry(4.0, 5.0, 30, 12);
    shaft.translate(-70, 15, -40);
    towerGeoms.push(shaft);

    const platform = new THREE.CylinderGeometry(7.5, 6.5, 2.0, 12);
    platform.translate(-70, 30, -40);
    towerGeoms.push(platform);

    const roof = new THREE.ConeGeometry(7.0, 2.5, 12);
    roof.translate(-70, 35, -40);
    towerGeoms.push(roof);

    airport.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(towerGeoms), towerMat));

    const cab = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 3.5, 12, 1, true), cabGlassMat);
    cab.position.set(-70, 32.2, -40);
    airport.add(cab);

    // Rotating Radar Dish
    const dishGroup = new THREE.Group();
    dishGroup.position.set(-70, 37.0, -40);
    const dishMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 0.5, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
    dishMesh.rotation.x = Math.PI / 3;
    dishGroup.add(dishMesh);
    airport.add(dishGroup);
    atcRadarDish = dishGroup;

    // 3. Passenger Terminal 2 (T2) Concourse
    const termSolidGeoms = [];
    const termHall = applyVertexColor(new THREE.BoxGeometry(90, 16, 26), 0x94a3b8);
    termHall.translate(85, 8, -45);
    termSolidGeoms.push(termHall);

    // Modern Curved Canopy Roof
    const roofBase = applyVertexColor(new THREE.BoxGeometry(98, 1.4, 32), 0xe2e8f0);
    roofBase.translate(85, 16.8, -45);
    termSolidGeoms.push(roofBase);

    // Signboard
    const signBoard = applyVertexColor(new THREE.BoxGeometry(40, 2.5, 0.5), 0xf97316);
    signBoard.translate(85, 16.5, -31.8);
    termSolidGeoms.push(signBoard);

    airport.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(termSolidGeoms, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 })));

    airport.position.set(apX, apY, apZ);
    registerBoxCollider(apX - 76, apX - 64, apZ - 46, apZ - 34, 'ATCRadarTower');
    registerBoxCollider(apX + 40, apX + 130, apZ - 60, apZ - 30, 'AirportTerminalBuilding', apY - 5, apY + 22);

    scene.add(airport);

    // Build 6 Aircraft Fleet
    buildAircraftFleet(scene, apX, apY, apZ);
}

function buildAircraftFleet(scene, apX, apY, apZ) {
    airportPlanes.length = 0;

    // Gate 1: Air India AI-101
    const p0 = createJetlinerModel(0xf8fafc, 0xea580c, 0x1e293b);
    p0.group.position.set(apX + 50, apY, apZ - 30);
    p0.group.rotation.y = -Math.PI / 6;
    scene.add(p0.group);
    airportPlanes.push({ id: 0, name: "Air India AI-101 (Gate 1)", state: 'parked', group: p0.group, strobe: p0.strobe, x: apX + 50, y: apY, z: apZ - 30 });

    // Gate 2: IndiGo 6E-404
    const p1 = createJetlinerModel(0xf8fafc, 0x1d4ed8, 0x0f172a);
    p1.group.position.set(apX + 110, apY, apZ - 30);
    p1.group.rotation.y = -Math.PI / 6;
    scene.add(p1.group);
    airportPlanes.push({ id: 1, name: "IndiGo 6E-404 (Gate 2)", state: 'parked', group: p1.group, strobe: p1.strobe, x: apX + 110, y: apY, z: apZ - 30 });

    // Taxiing: Vistara UK-920
    const p2 = createJetlinerModel(0xf8fafc, 0x701a75, 0x1e293b);
    p2.group.position.set(apX - 30, apY, apZ + 25);
    scene.add(p2.group);
    airportPlanes.push({
        id: 2,
        name: "Vistara UK-920 (Taxiing)",
        state: 'taxiing',
        group: p2.group,
        strobe: p2.strobe,
        x: apX - 30,
        y: apY,
        z: apZ + 25,
        speed: 6.5,
        progress: 0.1
    });

    // Takeoff: Akasa Air QP-112
    const p3 = createJetlinerModel(0xf8fafc, 0xd97706, 0x1e293b);
    p3.group.position.set(apX - 110, apY, apZ);
    scene.add(p3.group);
    airportPlanes.push({
        id: 3,
        name: "Akasa Air QP-112 (Takeoff / Climb)",
        state: 'takeoff',
        group: p3.group,
        strobe: p3.strobe,
        x: apX - 110,
        y: apY,
        z: apZ,
        timer: 0
    });

    // Landing: SpiceJet SG-303
    const p4 = createJetlinerModel(0xf8fafc, 0x059669, 0x1e293b);
    p4.group.position.set(apX - 320, apY + 65, apZ);
    scene.add(p4.group);
    airportPlanes.push({
        id: 4,
        name: "SpiceJet SG-303 (Landing / Approach)",
        state: 'landing',
        group: p4.group,
        strobe: p4.strobe,
        x: apX - 320,
        y: apY + 65,
        z: apZ,
        timer: 0
    });

    // Cruising: Emirates EK-500
    const p5 = createJetlinerModel(0xf8fafc, 0xdc2626, 0x1e293b);
    p5.group.position.set(-600, apY + 195, 400);
    p5.group.rotation.y = Math.PI / 2;
    scene.add(p5.group);
    airportPlanes.push({
        id: 5,
        name: "Emirates EK-500 (Cruising Flight)",
        state: 'cruising',
        group: p5.group,
        strobe: p5.strobe,
        x: -600,
        y: apY + 195,
        z: 400,
        speed: 38.0
    });
}

export function updateAirportSimulation(delta) {
    if (atcRadarDish) {
        atcRadarDish.rotation.y += delta * 1.8;
    }

    const apX = poiAirport.x;
    const apY = poiAirport.y;
    const apZ = poiAirport.z;
    const nowSec = performance.now() * 0.001;

    for (let i = 0; i < airportPlanes.length; i++) {
        const plane = airportPlanes[i];
        if (plane.strobe) {
            plane.strobe.visible = (nowSec * 3.0 % 1.0) < 0.15;
        }

        if (plane.state === 'taxiing') {
            plane.progress = (plane.progress + (plane.speed * delta) / 400.0) % 1.0;
            const ang = plane.progress * Math.PI * 2;
            plane.x = apX + Math.cos(ang) * 60;
            plane.z = apZ + 25 + Math.sin(ang) * 18;
            plane.group.position.set(plane.x, apY, plane.z);
            plane.group.rotation.y = -ang + Math.PI / 2;
        } else if (plane.state === 'takeoff') {
            plane.timer += delta;
            if (plane.timer < 8.0) {
                plane.x += delta * 25.0;
                plane.y = apY;
                plane.group.rotation.set(0, Math.PI / 2, 0);
            } else if (plane.timer < 16.0) {
                plane.x += delta * 35.0;
                plane.y += delta * 8.0;
                plane.group.rotation.set(0, Math.PI / 2, 0.22);
            } else if (plane.timer < 28.0) {
                const turnFrac = (plane.timer - 16.0) / 12.0;
                const turnAng = Math.PI / 2 + turnFrac * Math.PI;
                plane.x += Math.cos(turnAng) * 40.0 * delta;
                plane.z += Math.sin(turnAng) * 40.0 * delta;
                plane.group.rotation.set(0, turnAng, 0.35);
            } else {
                plane.timer = 0;
                plane.x = apX - 110;
                plane.y = apY;
                plane.z = apZ;
            }
            plane.group.position.set(plane.x, plane.y, plane.z);
        } else if (plane.state === 'landing') {
            plane.timer += delta;
            if (plane.timer < 10.0) {
                const f = plane.timer / 10.0;
                plane.x = apX - 320 + f * 220;
                plane.y = THREE.MathUtils.lerp(apY + 65, apY, f);
                plane.group.rotation.set(0, Math.PI / 2, -0.08);
            } else if (plane.timer < 18.0) {
                plane.x += (18.0 - plane.timer) * 3.5 * delta;
                plane.y = apY;
                plane.group.rotation.set(0, Math.PI / 2, 0);
            } else {
                plane.timer = 0;
                plane.x = apX - 320;
                plane.y = apY + 65;
            }
            plane.group.position.set(plane.x, plane.y, plane.z);
        } else if (plane.state === 'cruising') {
            plane.x += plane.speed * delta;
            if (plane.x > 2500) plane.x = -2500;
            plane.group.position.set(plane.x, plane.y, plane.z);
        }
    }
}
