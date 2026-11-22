import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { applyVertexColor } from '../world/textures.js';

// ==========================================
// ROAD TRAFFIC AI, SIGNALS & PUBLIC TRANSIT
// 60 Traffic Cars, 12 BEST Red Buses, 8 Kaali-Peeli Taxis
// ==========================================

export const trafficSignals = [];
export const trafficVehicles = [];
export const publicTransit = [];

let instMesh = null;
let detailedCarInstMesh = null;
let busSingleInstMesh = null;
let busDoubleInstMesh = null;
let taxiInstMesh = null;
const trafficDummy = new THREE.Object3D();

export function buildTrafficSignalSystem(scene) {
    trafficSignals.length = 0;
    const signalIntersections = [
        { x: 0, z: 16 },
        { x: 0, z: 42 },
        { x: -180, z: 16 },
        { x: 180, z: 16 },
        { x: 0, z: 240 },
        { x: -180, z: 240 },
        { x: 180, z: 240 },
        { x: 0, z: 380 }
    ];

    signalIntersections.forEach((pos, idx) => {
        trafficSignals.push({
            id: idx,
            x: pos.x,
            z: pos.z,
            state: 'green_ns',
            timer: (idx * 3.5) % 18.0,
            cycleDuration: 18.0,
            isRedFor(vx, vz, dirX, dirZ) {
                if (Math.abs(dirZ) > Math.abs(dirX)) {
                    return this.state !== 'green_ns';
                } else {
                    return this.state !== 'green_ew';
                }
            }
        });
    });
}

export function updateTrafficSignals(delta) {
    for (let i = 0; i < trafficSignals.length; i++) {
        const sig = trafficSignals[i];
        sig.timer = (sig.timer + delta) % sig.cycleDuration;
        if (sig.timer < 8.0) {
            sig.state = 'green_ns';
        } else if (sig.timer < 9.0) {
            sig.state = 'amber';
        } else if (sig.timer < 17.0) {
            sig.state = 'green_ew';
        } else {
            sig.state = 'amber';
        }
    }
}

export function buildRoadTrafficSystem(scene) {
    trafficVehicles.length = 0;
    if (instMesh && scene) {
        scene.remove(instMesh);
        if (instMesh.geometry) instMesh.geometry.dispose();
        instMesh = null;
    }

    const carMatColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xf59e0b, 0x9333ea, 0x0f172a, 0xf8fafc];
    const laneConfigs = [
        { startX: -3.5, startZ: 20, dirX: 0, dirZ: 1, minZ: 20, maxZ: 1350 },
        { startX: 3.5, startZ: 1350, dirX: 0, dirZ: -1, minZ: 20, maxZ: 1350 },
        { startX: -183.5, startZ: 20, dirX: 0, dirZ: 1, minZ: 20, maxZ: 480 },
        { startX: -176.5, startZ: 480, dirX: 0, dirZ: -1, minZ: 20, maxZ: 480 },
        { startX: 176.5, startZ: 20, dirX: 0, dirZ: 1, minZ: 20, maxZ: 480 },
        { startX: 183.5, startZ: 480, dirX: 0, dirZ: -1, minZ: 20, maxZ: 480 },
        { startX: -350, startZ: 18, dirX: 1, dirZ: 0, minX: -350, maxX: 350 },
        { startX: 350, startZ: 14, dirX: -1, dirZ: 0, minX: -350, maxX: 350 },
        { startX: -350, startZ: 242, dirX: 1, dirZ: 0, minX: -350, maxX: 350 },
        { startX: 350, startZ: 238, dirX: -1, dirZ: 0, minX: -350, maxX: 350 }
    ];

    // Shared material for detailed cars
    const detailedCarMat = new THREE.MeshStandardMaterial({
        roughness: 0.35,
        metalness: 0.3
    });

    // Base car geometry for 12 detailed cars
    const bodyGeom = new THREE.BoxGeometry(1.9, 0.7, 4.2);
    bodyGeom.translate(0, 0.55, 0);

    const cabinGeom = new THREE.BoxGeometry(1.7, 0.65, 2.2);
    cabinGeom.translate(0, 1.15, -0.2);

    const carParts = [bodyGeom, cabinGeom];
    const wheelOffsetsX = [-1.0, 1.0];
    const wheelOffsetsZ = [-1.3, 1.3];

    for (let wx = 0; wx < 2; wx++) {
        for (let wz = 0; wz < 2; wz++) {
            const wheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 10);
            wheelGeom.rotateZ(Math.PI / 2);
            wheelGeom.translate(wheelOffsetsX[wx], 0.38, wheelOffsetsZ[wz]);
            carParts.push(wheelGeom);
        }
    }

    const mergedCarGeom = BufferGeometryUtils.mergeGeometries(carParts, false);
    detailedCarInstMesh = new THREE.InstancedMesh(mergedCarGeom, detailedCarMat, 12);
    detailedCarInstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(detailedCarInstMesh);

    // 12 Detailed Cars - batched into 1 InstancedMesh (cutting 12 draw calls to 1)
    for (let i = 0; i < 12; i++) {
        const lane = laneConfigs[i % laneConfigs.length];
        const bodyColor = carMatColors[i % carMatColors.length];
        detailedCarInstMesh.setColorAt(i, new THREE.Color(bodyColor));

        const offsetAlongLane = (i * 90.0) % 700;
        const curX = lane.dirX !== 0 ? (lane.startX + lane.dirX * offsetAlongLane) : lane.startX;
        const curZ = lane.dirZ !== 0 ? (lane.startZ + lane.dirZ * offsetAlongLane) : lane.startZ;

        trafficDummy.position.set(curX, 0, curZ);
        trafficDummy.rotation.y = Math.atan2(lane.dirX, lane.dirZ);
        trafficDummy.updateMatrix();
        detailedCarInstMesh.setMatrixAt(i, trafficDummy.matrix);

        trafficVehicles.push({
            id: i,
            isDetailed: true,
            wheels: [],
            lane,
            x: curX,
            z: curZ,
            dirX: lane.dirX,
            dirZ: lane.dirZ,
            speed: 12.0 + (i % 4) * 1.5,
            targetSpeed: 12.0,
            _accumDelta: 0
        });
    }
    detailedCarInstMesh.instanceMatrix.needsUpdate = true;
    if (detailedCarInstMesh.instanceColor) detailedCarInstMesh.instanceColor.needsUpdate = true;

    // 48 Instanced Cars (Total 60 Traffic Cars) - 1 single InstancedMesh call
    const instGeom = new THREE.BoxGeometry(1.9, 0.85, 3.8);
    const instMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
    instMesh = new THREE.InstancedMesh(instGeom, instMat, 48);
    instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instMesh);

    for (let k = 0; k < 48; k++) {
        const lane = laneConfigs[(k + 12) % laneConfigs.length];
        const offset = (k * 45.0) % 900;
        const curX = lane.dirX !== 0 ? (lane.startX + lane.dirX * offset) : lane.startX;
        const curZ = lane.dirZ !== 0 ? (lane.startZ + lane.dirZ * offset) : lane.startZ;

        trafficDummy.position.set(curX, 0.5, curZ);
        trafficDummy.rotation.y = Math.atan2(lane.dirX, lane.dirZ);
        trafficDummy.updateMatrix();
        instMesh.setMatrixAt(k, trafficDummy.matrix);

        trafficVehicles.push({
            id: 12 + k,
            isDetailed: false,
            instIndex: k,
            lane,
            x: curX,
            z: curZ,
            dirX: lane.dirX,
            dirZ: lane.dirZ,
            speed: 11.0 + (k % 3) * 1.2,
            targetSpeed: 11.0,
            _accumDelta: 0
        });
    }
    instMesh.instanceMatrix.needsUpdate = true;
}

// Pre-create helper for bus geometries
function createBusGeometry(isDoubleDecker) {
    const busRed = 0xdc2626;
    const cream = 0xfef08a;
    const tireColor = 0x18181b;

    const lower = applyVertexColor(new THREE.BoxGeometry(2.6, 1.8, 8.4), busRed);
    lower.translate(0, 1.1, 0);

    const height = isDoubleDecker ? 1.6 : 0.3;
    const upperColor = isDoubleDecker ? busRed : cream;
    const upperY = isDoubleDecker ? 2.8 : 2.15;
    const upper = applyVertexColor(new THREE.BoxGeometry(2.55, height, 8.2), upperColor);
    upper.translate(0, upperY, 0);

    const busParts = [lower, upper];
    const wheelOffsetsX = [-1.25, 1.25];
    const wheelOffsetsZ = [-2.6, 2.6];

    for (let wx = 0; wx < 2; wx++) {
        for (let wz = 0; wz < 2; wz++) {
            const wheel = applyVertexColor(new THREE.CylinderGeometry(0.48, 0.48, 0.28, 10), tireColor);
            wheel.rotateZ(Math.PI / 2);
            wheel.translate(wheelOffsetsX[wx], 0.48, wheelOffsetsZ[wz]);
            busParts.push(wheel);
        }
    }

    return BufferGeometryUtils.mergeGeometries(busParts, false);
}

// Pre-create helper for taxi geometry
function createTaxiGeometry() {
    const taxiBlack = 0x09090b;
    const taxiYellow = 0xfacc15;

    const lower = applyVertexColor(new THREE.BoxGeometry(1.9, 0.65, 3.8), taxiBlack);
    lower.translate(0, 0.52, 0);

    const upper = applyVertexColor(new THREE.BoxGeometry(1.65, 0.55, 2.0), taxiYellow);
    upper.translate(0, 1.05, -0.15);

    return BufferGeometryUtils.mergeGeometries([lower, upper], false);
}

export function buildPublicTransitSystem(scene) {
    publicTransit.length = 0;

    // Materials using vertex colors
    const busMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
    const taxiMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 });

    // Pre-create merged geometries once
    const singleDeckerGeom = createBusGeometry(false);
    const doubleDeckerGeom = createBusGeometry(true);
    const taxiGeom = createTaxiGeometry();

    // 12 BEST Buses: 8 single deckers (b % 3 !== 0) and 4 double deckers (b % 3 === 0)
    // InstancedMesh: 8 single decker + 4 double decker = 2 draw calls!
    busSingleInstMesh = new THREE.InstancedMesh(singleDeckerGeom, busMat, 8);
    busSingleInstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(busSingleInstMesh);

    busDoubleInstMesh = new THREE.InstancedMesh(doubleDeckerGeom, busMat, 4);
    busDoubleInstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(busDoubleInstMesh);

    // 8 Kaali-Peeli Taxis - 1 InstancedMesh (1 draw call)
    taxiInstMesh = new THREE.InstancedMesh(taxiGeom, taxiMat, 8);
    taxiInstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(taxiInstMesh);

    let singleIdx = 0;
    let doubleIdx = 0;

    for (let b = 0; b < 12; b++) {
        const isDoubleDecker = (b % 3 === 0);
        const route = (b < 6) ? 1 : 2;
        const startZ = 20 + b * 110;
        const posX = route === 1 ? -6 : 6;
        const rotY = (route === 1) ? Math.PI : 0;
        const instIndex = isDoubleDecker ? doubleIdx++ : singleIdx++;
        const targetInstMesh = isDoubleDecker ? busDoubleInstMesh : busSingleInstMesh;

        trafficDummy.position.set(posX, 0, startZ);
        trafficDummy.rotation.y = rotY;
        trafficDummy.updateMatrix();
        targetInstMesh.setMatrixAt(instIndex, trafficDummy.matrix);

        publicTransit.push({
            id: `bus_${b}`,
            type: 'bus',
            isDoubleDecker,
            instIndex,
            route,
            x: posX,
            z: startZ,
            dirX: 0,
            dirZ: route === 1 ? -1 : 1,
            speed: 10.0,
            targetSpeed: 10.0,
            dwellTimer: 0,
            isDwelling: false,
            _accumDelta: 0
        });
    }
    busSingleInstMesh.instanceMatrix.needsUpdate = true;
    busDoubleInstMesh.instanceMatrix.needsUpdate = true;

    for (let tx = 0; tx < 8; tx++) {
        const laneZ = 40 + tx * 160;
        trafficDummy.position.set(-174, 0, laneZ);
        trafficDummy.rotation.y = 0;
        trafficDummy.updateMatrix();
        taxiInstMesh.setMatrixAt(tx, trafficDummy.matrix);

        publicTransit.push({
            id: `taxi_${tx}`,
            type: 'taxi',
            instIndex: tx,
            x: -174,
            z: laneZ,
            dirX: 0,
            dirZ: 1,
            speed: 13.5,
            targetSpeed: 13.5,
            _accumDelta: 0
        });
    }
    taxiInstMesh.instanceMatrix.needsUpdate = true;
}

function getCameraPosition(camera) {
    if (camera && camera.position) {
        return camera.position;
    }
    if (typeof window !== 'undefined') {
        if (window.__camera && window.__camera.position) {
            return window.__camera.position;
        }
        if (window.__characterGroup && window.__characterGroup.position) {
            return window.__characterGroup.position;
        }
    }
    return null;
}

export function updateRoadTraffic(delta, camera = null) {
    if (!trafficVehicles || trafficVehicles.length === 0) return;
    let instNeedsUpdate = false;
    let detailedCarNeedsUpdate = false;

    const camPos = getCameraPosition(camera);
    const hasCam = !!camPos;
    const camX = hasCam ? camPos.x : 0;
    const camZ = hasCam ? camPos.z : 0;

    for (let i = 0; i < trafficVehicles.length; i++) {
        const v = trafficVehicles[i];

        v._accumDelta = (v._accumDelta || 0) + delta;

        // Throttling distant vehicles (> 200m) to 10Hz (0.1s update rate)
        if (hasCam) {
            const dx = v.x - camX;
            const dz = v.z - camZ;
            if (dx * dx + dz * dz > 40000) { // > 200m
                if (v._accumDelta < 0.1) {
                    continue;
                }
            }
        }

        const stepDelta = v._accumDelta;
        v._accumDelta = 0;

        let targetSpeed = 12.0;

        for (let s = 0; s < trafficSignals.length; s++) {
            const sig = trafficSignals[s];
            const dx = sig.x - v.x;
            const dz = sig.z - v.z;
            const dist = Math.hypot(dx, dz);
            if (dist < 16.0) {
                const dot = dx * v.dirX + dz * v.dirZ;
                if (dot > 0 && dot < 14.0) {
                    if (sig.isRedFor(v.x, v.z, v.dirX, v.dirZ)) {
                        targetSpeed = 0;
                        break;
                    }
                }
            }
        }

        v.speed = THREE.MathUtils.lerp(v.speed, targetSpeed, Math.min(1.0, stepDelta * 3.5));

        if (v.dirZ !== 0) {
            v.z += v.dirZ * v.speed * stepDelta;
            if (v.lane.maxZ !== undefined && v.lane.minZ !== undefined) {
                if (v.z > v.lane.maxZ) v.z = v.lane.minZ;
                else if (v.z < v.lane.minZ) v.z = v.lane.maxZ;
            }
        } else if (v.dirX !== 0) {
            v.x += v.dirX * v.speed * stepDelta;
            if (v.lane.maxX !== undefined && v.lane.minX !== undefined) {
                if (v.x > v.lane.maxX) v.x = v.lane.minX;
                else if (v.x < v.lane.minX) v.x = v.lane.maxX;
            }
        }

        if (v.isDetailed) {
            trafficDummy.position.set(v.x, 0, v.z);
            trafficDummy.rotation.y = Math.atan2(v.dirX, v.dirZ);
            trafficDummy.updateMatrix();
            if (detailedCarInstMesh) {
                detailedCarInstMesh.setMatrixAt(v.id, trafficDummy.matrix);
                detailedCarNeedsUpdate = true;
            }
        } else if (instMesh && trafficDummy) {
            trafficDummy.position.set(v.x, 0.5, v.z);
            trafficDummy.rotation.y = Math.atan2(v.dirX, v.dirZ);
            trafficDummy.updateMatrix();
            instMesh.setMatrixAt(v.instIndex, trafficDummy.matrix);
            instNeedsUpdate = true;
        }
    }

    if (detailedCarNeedsUpdate && detailedCarInstMesh) {
        detailedCarInstMesh.instanceMatrix.needsUpdate = true;
    }
    if (instNeedsUpdate && instMesh) {
        instMesh.instanceMatrix.needsUpdate = true;
    }
}

export function updatePublicTransit(delta, camera = null) {
    if (!publicTransit || publicTransit.length === 0) return;

    const camPos = getCameraPosition(camera);
    const hasCam = !!camPos;
    const camX = hasCam ? camPos.x : 0;
    const camZ = hasCam ? camPos.z : 0;

    let busSingleNeedsUpdate = false;
    let busDoubleNeedsUpdate = false;
    let taxiNeedsUpdate = false;

    for (let i = 0; i < publicTransit.length; i++) {
        const pt = publicTransit[i];

        pt._accumDelta = (pt._accumDelta || 0) + delta;

        // Throttling distant transit vehicles (> 200m) to 10Hz (0.1s update rate)
        if (hasCam) {
            const dx = pt.x - camX;
            const dz = pt.z - camZ;
            if (dx * dx + dz * dz > 40000) { // > 200m
                if (pt._accumDelta < 0.1) {
                    continue;
                }
            }
        }

        const stepDelta = pt._accumDelta;
        pt._accumDelta = 0;

        if (pt.type === 'bus') {
            if (pt.isDwelling) {
                pt.dwellTimer += stepDelta;
                pt.speed = 0;
                if (pt.dwellTimer >= 4.0) {
                    pt.isDwelling = false;
                    pt.dwellTimer = 0;
                }
            } else {
                let targetSpeed = 10.0;
                for (let s = 0; s < trafficSignals.length; s++) {
                    const sig = trafficSignals[s];
                    const dz = sig.z - pt.z;
                    if (Math.abs(sig.x - pt.x) < 8 && dz * pt.dirZ > 0 && Math.abs(dz) < 14.0) {
                        if (sig.isRedFor(pt.x, pt.z, pt.dirX, pt.dirZ)) {
                            targetSpeed = 0;
                            break;
                        }
                    }
                }
                pt.speed = THREE.MathUtils.lerp(pt.speed, targetSpeed, Math.min(1.0, stepDelta * 3.0));
                pt.z += pt.dirZ * pt.speed * stepDelta;

                if (pt.route === 1) {
                    if (pt.z < 20) pt.z = 1350;
                } else {
                    if (pt.z > 1350) pt.z = 20;
                }

                if (Math.floor(pt.z) % 220 < 2 && pt.speed > 4.0) {
                    pt.isDwelling = true;
                    pt.dwellTimer = 0;
                }
            }

            trafficDummy.position.set(pt.x, 0, pt.z);
            trafficDummy.rotation.y = (pt.route === 1) ? Math.PI : 0;
            trafficDummy.updateMatrix();

            if (pt.isDoubleDecker && busDoubleInstMesh) {
                busDoubleInstMesh.setMatrixAt(pt.instIndex, trafficDummy.matrix);
                busDoubleNeedsUpdate = true;
            } else if (busSingleInstMesh) {
                busSingleInstMesh.setMatrixAt(pt.instIndex, trafficDummy.matrix);
                busSingleNeedsUpdate = true;
            }
        } else if (pt.type === 'taxi') {
            pt.z += pt.dirZ * pt.speed * stepDelta;
            if (pt.z > 470) pt.z = 20;

            if (taxiInstMesh) {
                trafficDummy.position.set(pt.x, 0, pt.z);
                trafficDummy.rotation.y = 0;
                trafficDummy.updateMatrix();
                taxiInstMesh.setMatrixAt(pt.instIndex, trafficDummy.matrix);
                taxiNeedsUpdate = true;
            }
        }
    }

    if (busSingleNeedsUpdate && busSingleInstMesh) {
        busSingleInstMesh.instanceMatrix.needsUpdate = true;
    }
    if (busDoubleNeedsUpdate && busDoubleInstMesh) {
        busDoubleInstMesh.instanceMatrix.needsUpdate = true;
    }
    if (taxiNeedsUpdate && taxiInstMesh) {
        taxiInstMesh.instanceMatrix.needsUpdate = true;
    }
}
