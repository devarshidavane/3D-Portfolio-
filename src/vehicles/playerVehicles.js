import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { resolveCollision, getSurfaceElevationAt } from '../world/worldColliders.js';

// ==========================================
// PLAYER DRIVEABLE VEHICLES & VEHICLE DYNAMICS
// 1. Cyber Motorbike
// 2. Cyber Sports Car
// 3. Bajaj RE Kaali-Peeli Auto-Rickshaw
// ==========================================

export let bikeVehicle = {
    type: 'bike',
    mesh: null,
    x: -6,
    z: -24,
    rotation: 0,
    speed: 0,
    maxSpeed: 26,
    light: null
};

export let carVehicle = {
    type: 'car',
    mesh: null,
    x: 6,
    z: -24,
    rotation: 0,
    speed: 0,
    maxSpeed: 38,
    wheels: [],
    light: null
};

export let rickshawVehicle = {
    type: 'rickshaw',
    mesh: null,
    x: 12,
    z: -24,
    rotation: 0,
    speed: 0,
    maxSpeed: 32,
    wheels: [],
    light: null
};

export let activeVehicle = null;

export function buildPlayerVehicles(scene) {
    buildCyberBike(scene);
    buildCyberCar(scene);
    buildAutoRickshaw(scene);
}

function buildCyberBike(scene) {
    const bikeGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.85, roughness: 0.2 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 2.8), frameMat);
    chassis.position.y = 0.9;
    chassis.castShadow = true;
    bikeGroup.add(chassis);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 1.2), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    seat.position.set(0, 1.35, -0.2);
    bikeGroup.add(seat);

    [-1.4, 1.4].forEach(wz => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.4, 16), tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0.65, wz);
        bikeGroup.add(wheel);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.42, 16), chromeMat);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(0, 0.65, wz);
        bikeGroup.add(rim);
    });

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), chromeMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.6, 0.8);
    bikeGroup.add(bar);

    const headlamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    headlamp.position.set(0, 1.3, 1.5);
    bikeGroup.add(headlamp);

    const headlight = new THREE.SpotLight(0x38bdf8, 4.0, 40, Math.PI / 4, 0.5);
    headlight.position.set(0, 1.3, 1.5);
    headlight.target.position.set(0, 0, 15);
    bikeGroup.add(headlight);
    bikeGroup.add(headlight.target);

    bikeGroup.position.set(bikeVehicle.x, 0, bikeVehicle.z);
    scene.add(bikeGroup);

    bikeVehicle.mesh = bikeGroup;
    bikeVehicle.light = headlight;
}

function buildCyberCar(scene) {
    const carGroup = new THREE.Group();
    const carMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.88, roughness: 0.18 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1, transparent: true, opacity: 0.82 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 });

    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 5.2), carMat);
    lowerBody.position.y = 0.7;
    lowerBody.castShadow = true;
    carGroup.add(lowerBody);

    const underglow = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 4.6), new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.75 }));
    underglow.position.y = 0.2;
    carGroup.add(underglow);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 2.6), glassMat);
    cabin.position.set(0, 1.45, -0.3);
    carGroup.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 2.4), darkMat);
    roof.position.set(0, 1.85, -0.3);
    carGroup.add(roof);

    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.6), darkMat);
    spoiler.position.set(0, 1.5, -2.4);
    carGroup.add(spoiler);

    [-1.3, 1.3].forEach(wx => {
        [-1.6, 1.6].forEach(wz => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), tireMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.55, wz);
            carGroup.add(wheel);

            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.42, 8), rimMat);
            rim.rotation.z = Math.PI / 2;
            rim.position.set(wx, 0.55, wz);
            carGroup.add(rim);

            carVehicle.wheels.push(wheel);
        });
    });

    [-0.8, 0.8].forEach(hx => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.18, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        hl.position.set(hx, 0.8, 2.6);
        carGroup.add(hl);
    });

    const carSpot = new THREE.SpotLight(0xffffff, 7.5, 65, Math.PI / 4, 0.35);
    carSpot.position.set(0, 0.9, 2.7);
    carSpot.target.position.set(0, 0, 25);
    carGroup.add(carSpot);
    carGroup.add(carSpot.target);

    carGroup.position.set(carVehicle.x, 0, carVehicle.z);
    scene.add(carGroup);

    carVehicle.mesh = carGroup;
    carVehicle.light = carSpot;
}

function buildAutoRickshaw(scene) {
    const rickGroup = new THREE.Group();
    const kaaliBlackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.4 });
    const peeliYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });

    const bodyGeoms = [];
    const floor = new THREE.BoxGeometry(1.6, 0.25, 2.7);
    floor.translate(0, 0.45, 0);
    bodyGeoms.push(floor);

    const nose = new THREE.BoxGeometry(1.1, 0.75, 0.9);
    nose.translate(0, 0.85, 1.0);
    bodyGeoms.push(nose);

    const rearBack = new THREE.BoxGeometry(1.6, 0.8, 0.15);
    rearBack.translate(0, 0.9, -1.3);
    bodyGeoms.push(rearBack);

    const bodyMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(bodyGeoms), kaaliBlackMat);
    bodyMesh.castShadow = true;
    rickGroup.add(bodyMesh);

    const roofGeoms = [];
    const canopyTop = new THREE.BoxGeometry(1.65, 0.12, 2.2);
    canopyTop.translate(0, 1.95, -0.2);
    roofGeoms.push(canopyTop);

    const canopyLip = new THREE.BoxGeometry(1.4, 0.1, 0.6);
    canopyLip.rotateX(-0.35);
    canopyLip.translate(0, 1.85, 0.9);
    roofGeoms.push(canopyLip);

    const canopyRear = new THREE.BoxGeometry(1.65, 0.65, 0.1);
    canopyRear.translate(0, 1.55, -1.3);
    roofGeoms.push(canopyRear);

    const roofMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(roofGeoms), peeliYellowMat);
    rickGroup.add(roofMesh);

    const poleGeoms = [];
    [-0.78, 0.78].forEach(px => {
        [-1.25, 0.35].forEach(pz => {
            const pole = new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6);
            pole.translate(px, 1.4, pz);
            poleGeoms.push(pole);
        });
    });
    [-0.55, 0.55].forEach(fx => {
        const fPole = new THREE.CylinderGeometry(0.025, 0.025, 0.95, 6);
        fPole.translate(fx, 1.4, 0.85);
        poleGeoms.push(fPole);
    });

    const column = new THREE.CylinderGeometry(0.035, 0.035, 0.7, 6);
    column.rotateX(0.25);
    column.translate(0, 1.05, 0.7);
    poleGeoms.push(column);
    const hBar = new THREE.BoxGeometry(0.8, 0.05, 0.05);
    hBar.translate(0, 1.35, 0.62);
    poleGeoms.push(hBar);

    rickGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(poleGeoms), metalMat));

    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), glassMat);
    windshield.position.set(0, 1.45, 0.88);
    rickGroup.add(windshield);

    const dGeom = new THREE.BoxGeometry(0.65, 0.25, 0.45);
    dGeom.translate(0, 0.8, 0.2);
    const pGeom = new THREE.BoxGeometry(1.5, 0.28, 0.65);
    pGeom.translate(0, 0.75, -0.85);
    rickGroup.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries([dGeom, pGeom]), seatMat));

    const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 14), tireMat);
    fWheel.rotation.z = Math.PI / 2;
    fWheel.position.set(0, 0.38, 1.15);
    rickGroup.add(fWheel);
    rickshawVehicle.wheels.push(fWheel);

    [-0.72, 0.72].forEach(rx => {
        const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 14), tireMat);
        rWheel.rotation.z = Math.PI / 2;
        rWheel.position.set(rx, 0.38, -0.65);
        rickGroup.add(rWheel);
        rickshawVehicle.wheels.push(rWheel);
    });

    const hlGeom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
    hlGeom.rotation.x = Math.PI / 2;
    hlGeom.position.set(0, 0.88, 1.48);
    rickGroup.add(hlGeom);

    const rickSpot = new THREE.SpotLight(0xfffae6, 3.8, 38, Math.PI / 3.5, 0.4);
    rickSpot.position.set(0, 0.88, 1.55);
    rickSpot.target.position.set(0, 0, 18);
    rickGroup.add(rickSpot);
    rickGroup.add(rickSpot.target);

    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 128; plateCanvas.height = 48;
    const pCtx = plateCanvas.getContext('2d');
    pCtx.fillStyle = '#facc15'; pCtx.fillRect(0, 0, 128, 48);
    pCtx.strokeStyle = '#0f172a'; pCtx.lineWidth = 3; pCtx.strokeRect(2, 2, 124, 44);
    pCtx.fillStyle = '#0f172a'; pCtx.font = 'bold 15px monospace'; pCtx.textAlign = 'center';
    pCtx.fillText("MH 01 EA 4021", 64, 30);
    const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.24), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(plateCanvas) }));
    plateMesh.position.set(0, 0.52, -1.38);
    plateMesh.rotation.y = Math.PI;
    rickGroup.add(plateMesh);

    rickGroup.position.set(rickshawVehicle.x, 0, rickshawVehicle.z);
    scene.add(rickGroup);

    rickshawVehicle.mesh = rickGroup;
    rickshawVehicle.light = rickSpot;
}

export function updateVehiclePhysics(v, delta, keys) {
    if (!v || !v.mesh) return;

    const isCar = (v.type === 'car');
    const isRickshaw = (v.type === 'rickshaw');
    const isBike = (v.type === 'bike');

    const maxSpeed = isCar ? 32.0 : (isRickshaw ? 18.0 : 26.0);
    const maxReverse = isCar ? -8.0 : (isRickshaw ? -5.0 : -6.5);
    const accelRate = isCar ? 0.045 : (isRickshaw ? 0.035 : 0.060);
    const brakeRate = isCar ? 0.080 : (isRickshaw ? 0.070 : 0.090);
    const naturalDrag = isCar ? 0.035 : (isRickshaw ? 0.045 : 0.040);
    const baseTurnSpeed = isCar ? 1.85 : (isRickshaw ? 2.35 : 2.55);
    const colRadius = isCar ? 1.6 : (isRickshaw ? 1.25 : 0.85);
    const wheelRadius = isCar ? 0.45 : (isRickshaw ? 0.35 : 0.40);

    if (keys.w) {
        v.speed = THREE.MathUtils.lerp(v.speed, maxSpeed, accelRate);
    } else if (keys.s) {
        if (v.speed > 0.4) {
            v.speed = THREE.MathUtils.lerp(v.speed, 0, brakeRate);
        } else {
            v.speed = THREE.MathUtils.lerp(v.speed, maxReverse, accelRate * 0.8);
        }
    } else {
        v.speed = THREE.MathUtils.lerp(v.speed, 0, naturalDrag);
        if (Math.abs(v.speed) < 0.05) v.speed = 0;
    }

    let steerInput = 0;
    if (keys.d) steerInput += 1;
    if (keys.a) steerInput -= 1;

    const speedRatio = Math.min(1, Math.abs(v.speed) / maxSpeed);
    const minAuthority = isBike ? 0.35 : (isRickshaw ? 0.30 : 0.12);
    const steerAuthority = Math.min(1, minAuthority + (Math.abs(v.speed) / 3.5) * (1 - minAuthority));
    const steerDamping = 1 / (1 + speedRatio * 0.72);
    const effectiveTurn = baseTurnSpeed * steerAuthority * steerDamping;

    const steerDir = (v.speed >= 0 ? 1 : -1);
    v.rotation += steerInput * effectiveTurn * steerDir * delta;

    const prevX = v.mesh.position.x;
    const prevZ = v.mesh.position.z;
    v.mesh.position.x += Math.sin(v.rotation) * v.speed * delta;
    v.mesh.position.z += Math.cos(v.rotation) * v.speed * delta;
    v.mesh.rotation.y = v.rotation;

    // Follow natural ground terrain elevation
    const targetElevation = getSurfaceElevationAt(v.mesh.position.x, v.mesh.position.z);
    v.mesh.position.y = THREE.MathUtils.lerp(v.mesh.position.y, targetElevation, 0.2);

    if (isBike) {
        const targetRoll = -steerInput * 0.32 * (0.35 + speedRatio * 0.65);
        v.mesh.rotation.z = THREE.MathUtils.lerp(v.mesh.rotation.z, targetRoll, 0.22);
    } else if (isRickshaw) {
        const targetRoll = -steerInput * (0.05 + speedRatio * 0.08);
        v.mesh.rotation.z = THREE.MathUtils.lerp(v.mesh.rotation.z, targetRoll, 0.16);
    } else if (isCar) {
        const targetRoll = -steerInput * speedRatio * 0.05;
        v.mesh.rotation.z = THREE.MathUtils.lerp(v.mesh.rotation.z, targetRoll, 0.14);
    }

    if (v.wheels && v.wheels.length > 0) {
        const angularDelta = (v.speed / wheelRadius) * delta;
        for (let i = 0; i < v.wheels.length; i++) {
            v.wheels[i].rotation.x += angularDelta;
        }
    }

    resolveCollision(v.mesh.position, colRadius);
    const movedDist = Math.hypot(v.mesh.position.x - prevX, v.mesh.position.z - prevZ);
    const expectedDist = Math.abs(v.speed * delta);
    if (expectedDist > 0.06 && movedDist < expectedDist * 0.3) {
        v.speed *= 0.5;
    }
}

export function setActiveVehicle(v) {
    activeVehicle = v;
}
