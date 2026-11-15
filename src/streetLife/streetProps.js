import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { registerBoxCollider } from '../world/worldColliders.js';
import { createBilingualSignboardTexture } from '../world/textures.js';

// ==========================================
// MUMBAI STREET-LEVEL PROPS & STREET LIFE
// Cutting Chai Stalls, Chetak Scooters, BEST Bus Stops,
// Fruit Thelas, MSEB Feeder Boxes, Vada Pav Carts
// ==========================================

export const streetActivities = [];
export const poiVadaPav = { x: 12, z: 242, radius: 4.5 };

export function buildMumbaiStreetProps(scene) {
    const woodGeoms = [];
    const metalGeoms = [];
    const msebGeoms = [];
    const mcgmGeoms = [];
    const scooterGeoms = [];
    const wheelGeoms = [];
    const awningGeoms = [];
    const samovarGeoms = [];
    const glassCaddyGeoms = [];
    const hlGeoms = [];

    const msebMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.6, metalness: 0.3 });
    const mcgmMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5, metalness: 0.2 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
    const scooterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.5 });
    const scooterWheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const awningMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.8 });

    // 1. Mumbai Cutting Chai Stalls
    const chaiLocations = [
        { x: 6.2, z: 39.5, rotY: -Math.PI / 2 },
        { x: 14.5, z: -3.5, rotY: 0 }
    ];

    chaiLocations.forEach(loc => {
        const table = new THREE.BoxGeometry(1.8, 0.9, 0.9);
        table.translate(loc.x, 0.45, loc.z);
        woodGeoms.push(table);

        [-0.8, 0.8].forEach(px => {
            const pole = new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6);
            pole.translate(loc.x + px, 1.15, loc.z + 0.4);
            metalGeoms.push(pole);
        });

        const awning = new THREE.BoxGeometry(2.1, 0.08, 1.2);
        awning.rotateX(0.15);
        awning.translate(loc.x, 2.3, loc.z + 0.1);
        awningGeoms.push(awning);

        const samovar = new THREE.CylinderGeometry(0.18, 0.22, 0.65, 10);
        samovar.translate(loc.x - 0.4, 1.22, loc.z);
        samovarGeoms.push(samovar);

        const caddy = new THREE.BoxGeometry(0.45, 0.22, 0.3);
        caddy.translate(loc.x + 0.35, 1.02, loc.z);
        glassCaddyGeoms.push(caddy);

        const signTex = createBilingualSignboardTexture("मुंबई कटिंग चाय", "CUTTING CHAI ₹10", "#1e1b4b", "#facc15");
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.45), new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }));
        sign.position.set(loc.x, 1.9, loc.z + 0.42);
        scene.add(sign);

        registerBoxCollider(loc.x - 1.1, loc.x + 1.1, loc.z - 0.6, loc.z + 0.6, 'ChaiStall');
    });

    // 2. Parked Retro Scooters
    const scooterLocs = [
        { x: -6.8, z: 26.0, rotY: Math.PI / 2 },
        { x: 18.0, z: 38.5, rotY: 0 },
        { x: -43.0, z: 52.0, rotY: -Math.PI / 2 },
        { x: -12.0, z: 2.0, rotY: 0.4 }
    ];

    scooterLocs.forEach(loc => {
        const frame = new THREE.BoxGeometry(0.38, 0.55, 1.4);
        frame.rotateY(loc.rotY);
        frame.translate(loc.x, 0.45, loc.z);
        scooterGeoms.push(frame);

        const legshield = new THREE.BoxGeometry(0.55, 0.65, 0.12);
        legshield.rotateY(loc.rotY);
        legshield.translate(loc.x + Math.sin(loc.rotY) * 0.4, 0.65, loc.z + Math.cos(loc.rotY) * 0.4);
        scooterGeoms.push(legshield);

        const seat = new THREE.BoxGeometry(0.32, 0.12, 0.55);
        seat.rotateY(loc.rotY);
        seat.translate(loc.x - Math.sin(loc.rotY) * 0.2, 0.78, loc.z - Math.cos(loc.rotY) * 0.2);
        scooterGeoms.push(seat);

        [-0.45, 0.45].forEach(wz => {
            const w = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12);
            w.rotateZ(Math.PI / 2);
            w.rotateY(loc.rotY);
            w.translate(loc.x + Math.sin(loc.rotY) * wz, 0.22, loc.z + Math.cos(loc.rotY) * wz);
            wheelGeoms.push(w);
        });

        const hl = new THREE.SphereGeometry(0.1, 8, 8);
        hl.translate(loc.x + Math.sin(loc.rotY) * 0.42, 0.95, loc.z + Math.cos(loc.rotY) * 0.42);
        hlGeoms.push(hl);

        registerBoxCollider(loc.x - 0.4, loc.x + 0.4, loc.z - 0.7, loc.z + 0.7, 'ParkedScooter');
    });

    // 3. BEST Bus Stop Shelter
    const busStopX = 7.0;
    const busStopZ = 28.0;

    [-1.6, 1.6].forEach(px => {
        const p = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8);
        p.translate(busStopX, 1.6, busStopZ + px);
        metalGeoms.push(p);
    });

    const busCanopy = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.14, 3.8),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
    );
    busCanopy.position.set(busStopX - 0.4, 3.1, busStopZ);
    busCanopy.rotation.z = -0.1;
    scene.add(busCanopy);

    const busBench = new THREE.BoxGeometry(0.5, 0.1, 2.8);
    busBench.translate(busStopX + 0.1, 0.5, busStopZ);
    woodGeoms.push(busBench);

    const bestTex = createBilingualSignboardTexture("बृहन्मुंबई विद्युत पुरवठा आणि परिवहन", "BEST BUS STOP — ROUTE 123", "#b91c1c", "#facc15");
    const bestSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.65), new THREE.MeshBasicMaterial({ map: bestTex }));
    bestSign.position.set(busStopX - 0.45, 2.7, busStopZ);
    bestSign.rotation.y = -Math.PI / 2;
    scene.add(bestSign);

    registerBoxCollider(busStopX - 0.8, busStopX + 0.8, busStopZ - 1.8, busStopZ + 1.8, 'BusStop');

    // 4. MSEB Feeder Boxes
    const msebLocations = [
        { x: -6.8, z: 46.0 },
        { x: 6.8, z: 74.0 },
        { x: -43.0, z: 32.0 },
        { x: 35.0, z: 44.0 }
    ];
    msebLocations.forEach(loc => {
        const box = new THREE.BoxGeometry(0.65, 1.2, 0.9);
        box.translate(loc.x, 0.6, loc.z);
        msebGeoms.push(box);
        registerBoxCollider(loc.x - 0.4, loc.x + 0.4, loc.z - 0.55, loc.z + 0.55, 'MSEBBox');
    });

    // 5. MCGM Blue Trash Cans
    const binLocations = [
        { x: -6.2, z: 22.0 },
        { x: 6.2, z: 50.0 },
        { x: -6.2, z: 70.0 },
        { x: 6.2, z: 80.0 },
        { x: -18.0, z: -2.0 },
        { x: 18.0, z: -2.0 }
    ];
    binLocations.forEach(loc => {
        const bin = new THREE.CylinderGeometry(0.24, 0.22, 0.8, 10);
        bin.translate(loc.x, 0.4, loc.z);
        mcgmGeoms.push(bin);
    });

    // Merge Geometries
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.5 });

    if (woodGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(woodGeoms), woodMat));
    if (metalGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(metalGeoms), metalMat));
    if (msebGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(msebGeoms), msebMat));
    if (mcgmGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(mcgmGeoms), mcgmMat));
    if (scooterGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(scooterGeoms), scooterMat));
    if (wheelGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(wheelGeoms), scooterWheelMat));
    if (awningGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(awningGeoms), awningMat));
    if (samovarGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(samovarGeoms), brassMat));
    if (glassCaddyGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(glassCaddyGeoms), glassMat));
    if (hlGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(hlGeoms), new THREE.MeshBasicMaterial({ color: 0xfffbeb })));
}

export function buildStreetActivities(scene) {
    streetActivities.length = 0;
    const stallWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const stallCanopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const metalBrassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });
    const greenProduceMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });

    const activityDefs = [
        { id: 'act_gw_chai', name: "Gateway Cutting Chai Stall", x: -12, z: -5, type: 'chai' },
        { id: 'act_gw_coco', name: "Marine Drive Coconut Vendor", x: 14, z: -6, type: 'coconut' },
        { id: 'act_gw_photo', name: "Waterfront Souvenir Kiosk", x: -26, z: -2, type: 'kiosk' },
        { id: 'act_gw_bhutta', name: "Roasted Bhutta & Corn Cart", x: 28, z: -4, type: 'bhutta' },
        { id: 'act_md_tapri', name: "Marine Drive Chai Tapri", x: -18, z: 75, type: 'chai' },
        { id: 'act_md_kulfi', name: "Chowpatty Kulfi Cart", x: -15, z: 85, type: 'kulfi' },
        { id: 'act_md_news', name: "Marine Newsstand & Books", x: -32, z: 78, type: 'kiosk' },
        { id: 'act_hq_cyber', name: "Stark Plaza Cyber-Chai Bar", x: -8, z: 238, type: 'chai' },
        { id: 'act_hq_vada', name: "Downtown Mumbai Vada Pav Thela", x: poiVadaPav.x, z: poiVadaPav.z, type: 'vadapav' },
        { id: 'act_hq_fruit', name: "Fresh Fruit Cart", x: -12, z: 262, type: 'fruit' },
        { id: 'act_ch_chai', name: "Chawl Corner Chai Tapri", x: -190, z: 475, type: 'chai' },
        { id: 'act_ch_garland', name: "Marigold Flower Garland Stall", x: -170, z: 485, type: 'flower' },
        { id: 'act_ch_veg', name: "Chawl Vegetable Thela", x: -185, z: 505, type: 'produce' },
        { id: 'act_bz_spice', name: "Spice & Sacks Market", x: 175, z: 425, type: 'spice' },
        { id: 'act_bz_pav', name: "Sizzling Pav Bhaji Tawa", x: 185, z: 435, type: 'pavbhaji' },
        { id: 'act_bz_textile', name: "Textile & Saree Kiosk", x: 168, z: 445, type: 'kiosk' },
        { id: 'act_sc_candy', name: "Fr. Agnel Stationery & Candy Cart", x: -1335, z: 510, type: 'kiosk' },
        { id: 'act_sc_bhel', name: "Bandstand Bhelpuri & Chana Cart", x: -1360, z: 530, type: 'snack' },
        { id: 'act_dmce_canteen', name: "DMCE Engineering Canteen Adda", x: 1840, z: 1460, type: 'chai' },
        { id: 'act_dmce_print', name: "DMCE Blueprint & Xerox Kiosk", x: 1865, z: 1445, type: 'kiosk' }
    ];

    const staticWoodGeoms = [];
    const staticMetalGeoms = [];
    const staticCanopyGeoms = [];
    const staticProduceGeoms = [];
    const staticFlowerGeoms = [];

    activityDefs.forEach((act, idx) => {
        const table = new THREE.BoxGeometry(1.8, 0.85, 0.9);
        table.translate(act.x, 0.425, act.z);
        staticWoodGeoms.push(table);

        const roof = new THREE.BoxGeometry(2.2, 0.12, 1.3);
        roof.translate(act.x, 2.2, act.z);
        staticCanopyGeoms.push(roof);

        if (act.type === 'chai' || act.type === 'pavbhaji') {
            const samovar = new THREE.CylinderGeometry(0.22, 0.22, 0.55, 10);
            samovar.translate(act.x - 0.4, 0.95, act.z);
            staticMetalGeoms.push(samovar);
        } else if (act.type === 'coconut' || act.type === 'produce') {
            const stack = new THREE.CylinderGeometry(0.35, 0.45, 0.4, 8);
            stack.translate(act.x + 0.3, 0.95, act.z);
            staticProduceGeoms.push(stack);
        } else if (act.type === 'flower') {
            const garlands = new THREE.TorusGeometry(0.35, 0.08, 6, 12);
            garlands.rotateX(Math.PI / 2);
            garlands.translate(act.x, 1.8, act.z);
            staticFlowerGeoms.push(garlands);
        }

        registerBoxCollider(act.x - 1.2, act.x + 1.2, act.z - 0.8, act.z + 0.8, `StreetAct_${act.id}`, -2, 2.5);

        let steamQuad = null;
        if (act.type === 'chai' || act.type === 'pavbhaji') {
            const steamMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.45 });
            steamQuad = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.6), steamMat);
            steamQuad.position.set(act.x - 0.4, 1.45, act.z);
            scene.add(steamQuad);
        }

        streetActivities.push({
            id: act.id,
            name: act.name,
            x: act.x,
            z: act.z,
            type: act.type,
            steamQuad,
            timer: idx * 0.8
        });
    });

    if (staticWoodGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(staticWoodGeoms), stallWoodMat));
    if (staticMetalGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(staticMetalGeoms), metalBrassMat));
    if (staticCanopyGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(staticCanopyGeoms), stallCanopyMat));
    if (staticProduceGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(staticProduceGeoms), greenProduceMat));
    if (staticFlowerGeoms.length > 0) scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(staticFlowerGeoms), flowerMat));
}

export function updateStreetActivities(delta) {
    if (!streetActivities || streetActivities.length === 0) return;
    const now = performance.now() * 0.001;

    for (let i = 0; i < streetActivities.length; i++) {
        const act = streetActivities[i];
        if (act.steamQuad) {
            const phase = (now + act.timer) % 1.0;
            act.steamQuad.position.y = 1.45 + phase * 0.35;
            act.steamQuad.scale.set(1.0 + phase * 0.5, 1.0 + phase * 0.5, 1.0);
            act.steamQuad.material.opacity = (1.0 - phase) * 0.45;
        }
    }
}
