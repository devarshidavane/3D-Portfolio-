import * as THREE from 'three';

// ==========================================
// URBAN FAUNA & ENVIRONMENTAL SIMULATION
// 20 Coastal Seagulls + 10 Thermalling Black Kites (30 Birds Fleet)
// ==========================================

export const ambientAgents = [];

function createBirdMesh(colorHex = 0xf8fafc, span = 1.4) {
    const birdGeom = new THREE.BufferGeometry();
    const half = span / 2;
    const vertices = new Float32Array([
        // Left Wing
        0, 0, 0.4,
        -half, 0, 0,
        0, 0, -0.4,
        // Right Wing
        0, 0, 0.4,
        0, 0, -0.4,
        half, 0, 0
    ]);
    birdGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    birdGeom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(birdGeom, mat);
    const grp = new THREE.Group();
    grp.add(mesh);
    return { group: grp, mesh };
}

export function buildEnvironmentalSimulation(scene) {
    ambientAgents.length = 0;

    // 20 Coastal Seagulls wheeling above Gateway of India & Arabian Sea
    for (let i = 0; i < 20; i++) {
        const bird = createBirdMesh(0xf8fafc, 1.2);
        const radius = 25.0 + (i % 5) * 14.0;
        const startAngle = (i / 20.0) * Math.PI * 2;
        const startY = 18.0 + (i % 4) * 4.5;
        const cx = -350, cz = -2250; // Gateway waterfront

        bird.group.position.set(cx + Math.cos(startAngle) * radius, startY, cz + Math.sin(startAngle) * radius);
        scene.add(bird.group);

        ambientAgents.push({
            id: `seagull_${i}`,
            type: 'seagull',
            group: bird.group,
            mesh: bird.mesh,
            radius,
            angle: startAngle,
            altitude: startY,
            speed: 0.8 + (i % 3) * 0.2,
            flapSpeed: 10.0 + (i % 4) * 1.5,
            center: { x: cx, z: cz }
        });
    }

    // 10 Thermalling Black Kites high above central skyline
    for (let k = 0; k < 10; k++) {
        const kite = createBirdMesh(0x78350f, 2.2);
        const radius = 70.0 + (k % 4) * 30.0;
        const startAngle = (k / 10.0) * Math.PI * 2;
        const startY = 95.0 + (k % 3) * 25.0;
        const cx = 0, cz = 140;

        kite.group.position.set(cx + Math.cos(startAngle) * radius, startY, cz + Math.sin(startAngle) * radius);
        scene.add(kite.group);

        ambientAgents.push({
            id: `kite_${k}`,
            type: 'kite',
            group: kite.group,
            mesh: kite.mesh,
            radius,
            angle: startAngle,
            altitude: startY,
            speed: 0.35 + (k % 3) * 0.1,
            flapSpeed: 2.5 + (k % 2) * 0.8,
            center: { x: cx, z: cz }
        });
    }
}

export function updateEnvironmentalSimulation(delta) {
    if (!ambientAgents || ambientAgents.length === 0) return;

    for (let i = 0; i < ambientAgents.length; i++) {
        const ag = ambientAgents[i];
        ag.angle += (ag.speed * delta * 20.0) / ag.radius;

        const nx = ag.center.x + Math.cos(ag.angle) * ag.radius;
        const nz = ag.center.z + Math.sin(ag.angle) * ag.radius;

        ag.group.position.set(nx, ag.altitude, nz);
        ag.group.rotation.y = -ag.angle;

        const flap = Math.sin(performance.now() * 0.001 * ag.flapSpeed) * 0.35;
        ag.mesh.rotation.z = flap;
    }
}
