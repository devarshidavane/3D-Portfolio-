import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// ==========================================
// ROAD TRAFFIC AI, SIGNALS & PUBLIC TRANSIT
// 60 Traffic Cars, 12 BEST Red Buses, 8 Kaali-Peeli Taxis
// ==========================================

export const trafficSignals = [];
export const trafficVehicles = [];
export const publicTransit = [];

let instMesh = null;
let trafficDummy = null;

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
    const carMatColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xf59e0b, 0x9333ea, 0x0f172a, 0xf8fafc];
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 });

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

    // 12 Detailed Cars
    for (let i = 0; i < 12; i++) {
        const lane = laneConfigs[i % laneConfigs.length];
        const vGroup = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: carMatColors[i % carMatColors.length], roughness: 0.35, metalness: 0.3 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.8 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 4.2), bodyMat);
        body.position.y = 0.55;
        body.castShadow = true;
        vGroup.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), glassMat);
        cabin.position.set(0, 1.15, -0.2);
        vGroup.add(cabin);

        const wheels = [];
        [-1.0, 1.0].forEach(wx => {
            [-1.3, 1.3].forEach(wz => {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 10), tireMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(wx, 0.38, wz);
                vGroup.add(wheel);
                wheels.push(wheel);
            });
        });

        const offsetAlongLane = (i * 90.0) % 700;
        const curX = lane.dirX !== 0 ? (lane.startX + lane.dirX * offsetAlongLane) : lane.startX;
        const curZ = lane.dirZ !== 0 ? (lane.startZ + lane.dirZ * offsetAlongLane) : lane.startZ;

        vGroup.position.set(curX, 0, curZ);
        vGroup.rotation.y = Math.atan2(lane.dirX, lane.dirZ);
        scene.add(vGroup);

        trafficVehicles.push({
            id: i,
            isDetailed: true,
            group: vGroup,
            wheels,
            lane,
            x: curX,
            z: curZ,
            dirX: lane.dirX,
            dirZ: lane.dirZ,
            speed: 12.0 + (i % 4) * 1.5,
            targetSpeed: 12.0
        });
    }

    // 48 Instanced Cars (Total 60 Traffic Cars)
    const instGeom = new THREE.BoxGeometry(1.9, 0.85, 3.8);
    const instMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
    instMesh = new THREE.InstancedMesh(instGeom, instMat, 48);
    instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instMesh);

    trafficDummy = new THREE.Object3D();
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
            targetSpeed: 11.0
        });
    }
    instMesh.instanceMatrix.needsUpdate = true;
}

export function buildPublicTransitSystem(scene) {
    publicTransit.length = 0;
    const busMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
    const taxiBlackMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.35 });
    const taxiYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

    // 12 BEST Red Buses (Single and Double Decker)
    for (let b = 0; b < 12; b++) {
        const busGroup = new THREE.Group();
        const isDoubleDecker = (b % 3 === 0);

        const lower = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 8.4), busMat);
        lower.position.y = 1.1;
        busGroup.add(lower);

        const height = isDoubleDecker ? 1.6 : 0.3;
        const upper = new THREE.Mesh(new THREE.BoxGeometry(2.55, height, 8.2), isDoubleDecker ? busMat : creamMat);
        upper.position.y = isDoubleDecker ? 2.8 : 2.15;
        busGroup.add(upper);

        [-1.25, 1.25].forEach(wx => {
            [-2.6, 2.6].forEach(wz => {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.28, 10), new THREE.MeshStandardMaterial({ color: 0x18181b }));
                wheel.rotateZ(Math.PI / 2);
                wheel.position.set(wx, 0.48, wz);
                busGroup.add(wheel);
            });
        });

        const route = (b < 6) ? 1 : 2;
        const startZ = 20 + b * 110;
        const posX = route === 1 ? -6 : 6;
        busGroup.position.set(posX, 0, startZ);
        busGroup.rotation.y = (route === 1) ? Math.PI : 0;
        scene.add(busGroup);

        publicTransit.push({
            id: `bus_${b}`,
            type: 'bus',
            group: busGroup,
            route,
            x: posX,
            z: startZ,
            dirX: 0,
            dirZ: route === 1 ? -1 : 1,
            speed: 10.0,
            targetSpeed: 10.0,
            dwellTimer: 0,
            isDwelling: false
        });
    }

    // 8 Kaali-Peeli Taxis
    for (let tx = 0; tx < 8; tx++) {
        const taxiGroup = new THREE.Group();
        const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 3.8), taxiBlackMat);
        lower.position.y = 0.52;
        taxiGroup.add(lower);

        const upper = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 2.0), taxiYellowMat);
        upper.position.set(0, 1.05, -0.15);
        taxiGroup.add(upper);

        const laneZ = 40 + tx * 160;
        taxiGroup.position.set(-174, 0, laneZ);
        scene.add(taxiGroup);

        publicTransit.push({
            id: `taxi_${tx}`,
            type: 'taxi',
            group: taxiGroup,
            x: -174,
            z: laneZ,
            dirX: 0,
            dirZ: 1,
            speed: 13.5,
            targetSpeed: 13.5
        });
    }
}

export function updateRoadTraffic(delta) {
    if (!trafficVehicles || trafficVehicles.length === 0) return;
    let instNeedsUpdate = false;

    for (let i = 0; i < trafficVehicles.length; i++) {
        const v = trafficVehicles[i];
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

        v.speed = THREE.MathUtils.lerp(v.speed, targetSpeed, delta * 3.5);

        if (v.dirZ !== 0) {
            v.z += v.dirZ * v.speed * delta;
            if (v.lane.maxZ !== undefined && v.lane.minZ !== undefined) {
                if (v.z > v.lane.maxZ) v.z = v.lane.minZ;
                else if (v.z < v.lane.minZ) v.z = v.lane.maxZ;
            }
        } else if (v.dirX !== 0) {
            v.x += v.dirX * v.speed * delta;
            if (v.lane.maxX !== undefined && v.lane.minX !== undefined) {
                if (v.x > v.lane.maxX) v.x = v.lane.minX;
                else if (v.x < v.lane.minX) v.x = v.lane.maxX;
            }
        }

        if (v.isDetailed) {
            v.group.position.set(v.x, 0, v.z);
            if (v.wheels) {
                v.wheels.forEach(w => {
                    w.rotation.x += v.speed * delta * 2.5;
                });
            }
        } else if (instMesh && trafficDummy) {
            trafficDummy.position.set(v.x, 0.5, v.z);
            trafficDummy.rotation.y = Math.atan2(v.dirX, v.dirZ);
            trafficDummy.updateMatrix();
            instMesh.setMatrixAt(v.instIndex, trafficDummy.matrix);
            instNeedsUpdate = true;
        }
    }

    if (instNeedsUpdate && instMesh) {
        instMesh.instanceMatrix.needsUpdate = true;
    }
}

export function updatePublicTransit(delta) {
    if (!publicTransit || publicTransit.length === 0) return;

    for (let i = 0; i < publicTransit.length; i++) {
        const pt = publicTransit[i];

        if (pt.type === 'bus') {
            if (pt.isDwelling) {
                pt.dwellTimer += delta;
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
                pt.speed = THREE.MathUtils.lerp(pt.speed, targetSpeed, delta * 3.0);
                pt.z += pt.dirZ * pt.speed * delta;

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
            pt.group.position.set(pt.x, 0, pt.z);
        } else if (pt.type === 'taxi') {
            pt.z += pt.dirZ * pt.speed * delta;
            if (pt.z > 470) pt.z = 20;
            pt.group.position.set(pt.x, 0, pt.z);
        }
    }
}
