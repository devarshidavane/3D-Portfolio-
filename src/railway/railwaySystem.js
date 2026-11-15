import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { STATIONS, CORRIDORS } from '../data/railwayDatabase.js';
import { createBilingualSignboardTexture, applyVertexColor } from '../world/textures.js';

// ==========================================
// MUMBAI SUBURBAN RAILWAY & LOCAL EMU FLEET
// Western, Central Main, Harbour, Trans-Harbour & Nerul-Uran Corridors
// 54 Authenticated Suburban Stations & Broad Gauge (1676mm) Dual-Track Infrastructure
// ==========================================

export const allTrains = [];
export const railwayStations = [];

export let trainState = {
    spline: null,
    splineLength: 2400,
    coach1: null,
    coach2: null,
    coach3: null,
    mesh: null,
    x: -22,
    z: 16,
    speed: 0,
    maxSpeed: 16.0,
    progress: 0.05,
    targetStationIdx: 0,
    dwellTimer: 0,
    isDwelling: true,
    hornPlayed: false
};

export function buildRailwaySystem(scene) {
    allTrains.length = 0;
    railwayStations.length = 0;

    // 1. Line 1: Western Coastal Suburban Corridor (Churchgate to Borivali / Dahisar)
    const line1Points = [
        new THREE.Vector3(-22, 0.25, 8),
        new THREE.Vector3(-22, 0.25, 16),
        new THREE.Vector3(-22, 0.25, 80),
        new THREE.Vector3(-22, 0.25, 140),
        new THREE.Vector3(-22, 0.25, 250),
        new THREE.Vector3(-22, 0.25, 380),
        new THREE.Vector3(-22, 0.25, 480),
        new THREE.Vector3(-22, 0.25, 700),
        new THREE.Vector3(-22, 0.25, 900),
        new THREE.Vector3(-22.5, 0.25, 930),
        new THREE.Vector3(-24.0, 0.25, 940),
        new THREE.Vector3(-25.5, 0.25, 930),
        new THREE.Vector3(-26, 0.25, 900),
        new THREE.Vector3(-26, 0.25, 700),
        new THREE.Vector3(-26, 0.25, 480),
        new THREE.Vector3(-26, 0.25, 380),
        new THREE.Vector3(-26, 0.25, 250),
        new THREE.Vector3(-26, 0.25, 140),
        new THREE.Vector3(-26, 0.25, 80),
        new THREE.Vector3(-26, 0.25, 16),
        new THREE.Vector3(-26, 0.25, 8),
        new THREE.Vector3(-25.5, 0.25, 2),
        new THREE.Vector3(-24.0, 0.25, 0.5),
        new THREE.Vector3(-22.5, 0.25, 2)
    ];
    const splineLine1 = new THREE.CatmullRomCurve3(line1Points, true, 'centripetal');
    const splineLen1 = splineLine1.getLength();

    // 2. Line 2: Central & Harbour Aero-Express Corridor (CSMT to Airoli & Thane)
    const line2Points = [
        new THREE.Vector3(-10, 0.25, 16),
        new THREE.Vector3(-10, 0.25, 140),
        new THREE.Vector3(-10, 0.25, 250),
        new THREE.Vector3(30, 0.25, 330),
        new THREE.Vector3(180, 0.25, 430),
        new THREE.Vector3(280, 0.25, 620),
        new THREE.Vector3(400, 0.25, 860),
        new THREE.Vector3(500, 0.25, 1050),
        new THREE.Vector3(640, 0.25, 1250),
        new THREE.Vector3(646, 0.25, 1275),
        new THREE.Vector3(652, 0.25, 1270),
        new THREE.Vector3(646, 0.25, 1250),
        new THREE.Vector3(506, 0.25, 1050),
        new THREE.Vector3(406, 0.25, 860),
        new THREE.Vector3(286, 0.25, 620),
        new THREE.Vector3(186, 0.25, 430),
        new THREE.Vector3(36, 0.25, 330),
        new THREE.Vector3(-4, 0.25, 250),
        new THREE.Vector3(-4, 0.25, 140),
        new THREE.Vector3(-4, 0.25, 16),
        new THREE.Vector3(-7, 0.25, 4)
    ];
    const splineLine2 = new THREE.CatmullRomCurve3(line2Points, true, 'centripetal');
    const splineLen2 = splineLine2.getLength();

    // 3. Station Definitions
    const allStationDefs = [
        { id: 'st-gateway', name: "GATEWAY TERMINUS", mr: "गेटवे ऑफ इंडिया", x: -24, z: 16, spline: splineLine1, line: 1 },
        { id: 'st-marinedrive', name: "MARINE DRIVE HALT", mr: "मरीन ड्राईव्ह", x: -24, z: 80, spline: splineLine1, line: 1 },
        { id: 'st-homehq', name: "DOWNTOWN HOME HQ", mr: "होम मुख्यालय (देव)", x: -24, z: 250, spline: splineLine1, line: 1 },
        { id: 'st-chawls', name: "CHAWLS CENTRAL", mr: "चाळ मध्यवर्ती", x: -24, z: 480, spline: splineLine1, line: 1 },
        { id: 'st-school', name: "SCHOOL & NORTH PARK", mr: "शाळा व उत्तर उद्यान", x: -24, z: 900, spline: splineLine1, line: 1 },
        { id: 'st-bazaar', name: "COMMERCIAL BAZAAR", mr: "व्यापारी बाजार जंक्शन", x: 180, z: 430, spline: splineLine2, line: 2 },
        { id: 'st-dmce', name: "DMCE ACADEMIA", mr: "डी.एम.सी.ई. अभियांत्रिकी", x: 400, z: 860, spline: splineLine2, line: 2 },
        { id: 'st-airport', name: "CSMIA AIRPORT TERMINAL", mr: "छ.शि.म. आंतरराष्ट्रीय विमानतळ", x: 640, z: 1250, spline: splineLine2, line: 2 }
    ];

    const stationPlatGeoms = [];
    const stationCanopyGeoms = [];
    const stationPillarGeoms = [];

    const platMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.5 });

    allStationDefs.forEach((st) => {
        const plat = new THREE.BoxGeometry(4.2, 0.65, 28);
        plat.translate(st.x - 4.5, 0.325, st.z);
        stationPlatGeoms.push(plat);

        const canopy = new THREE.BoxGeometry(4.8, 0.22, 28);
        canopy.translate(st.x - 4.5, 4.3, st.z);
        stationCanopyGeoms.push(canopy);

        [-10, 0, 10].forEach(pz => {
            const pillar = new THREE.BoxGeometry(0.2, 3.8, 0.2);
            pillar.translate(st.x - 6.0, 2.3, st.z + pz);
            stationPillarGeoms.push(pillar);
        });

        const signTex = createBilingualSignboardTexture(st.mr, st.name);
        const signMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(5.2, 1.3),
            new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
        );
        signMesh.position.set(st.x - 3.8, 3.2, st.z);
        signMesh.rotation.y = Math.PI / 2;
        scene.add(signMesh);

        railwayStations.push(st);
    });

    if (stationPlatGeoms.length > 0) {
        scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stationPlatGeoms), platMat));
        scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stationCanopyGeoms), canopyMat));
        scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stationPillarGeoms), platMat));
    }

    // Track Rails Construction
    function buildCorridorTracks(spline, sampleCount) {
        const leftPts = [], rightPts = [];
        const UP = new THREE.Vector3(0, 1, 0);
        for (let i = 0; i < sampleCount; i++) {
            const t = i / sampleCount;
            const pt = spline.getPointAt(t);
            const tan = spline.getTangentAt(t);
            const norm = new THREE.Vector3().crossVectors(tan, UP).normalize();
            leftPts.push(new THREE.Vector3(pt.x + norm.x * 0.838, 0.22, pt.z + norm.z * 0.838));
            rightPts.push(new THREE.Vector3(pt.x - norm.x * 0.838, 0.22, pt.z - norm.z * 0.838));
        }
        const lGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftPts, true, 'centripetal'), sampleCount, 0.05, 5, true);
        const rGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightPts, true, 'centripetal'), sampleCount, 0.05, 5, true);
        const railsMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries([lGeom, rGeom]), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 }));
        scene.add(railsMesh);
    }
    buildCorridorTracks(splineLine1, 480);
    buildCorridorTracks(splineLine2, 480);

    // 4. EMU Coach Builder
    function buildEMUCoachSet(trainName, colorHex) {
        const emuPurpleMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45, metalness: 0.15 });
        const emuCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.55 });
        const emuDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
        const emuWheelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });

        function createCoach(type) {
            const coach = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.6, 6.0), emuCreamMat);
            body.position.set(0, 1.8, 0);
            coach.add(body);

            const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.14, 0.5, 6.02), emuPurpleMat);
            stripe.position.set(0, 1.45, 0);
            coach.add(stripe);

            [-1.8, 1.8].forEach(bz => {
                const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 2.1), emuDarkMat);
                bogie.position.set(0, 0.45, bz);
                coach.add(bogie);

                [-0.84, 0.84].forEach(wx => {
                    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 10), emuWheelMat);
                    wheel.rotateZ(Math.PI / 2);
                    wheel.position.set(wx, 0.25, bz);
                    coach.add(wheel);
                });
            });

            if (type === 'lead') {
                const hl = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
                hl.position.set(0, 1.4, 3.02);
                coach.add(hl);
            }
            return coach;
        }

        const c1 = createCoach('lead');
        const c2 = createCoach('motor');
        const c3 = createCoach('trail');
        scene.add(c1); scene.add(c2); scene.add(c3);
        return { c1, c2, c3 };
    }

    // Schedule Calibration Helper
    function calibrateSchedule(spline, stationList) {
        return stationList.map(st => {
            let bestS = 0;
            let minDist = Infinity;
            for (let s = 0; s <= 1.0; s += 0.002) {
                const pt = spline.getPointAt(s);
                const d = Math.hypot(pt.x - st.x, pt.z - st.z);
                if (d < minDist) {
                    minDist = d;
                    bestS = s;
                }
            }
            return { id: st.id, name: st.name, s: bestS };
        }).sort((a, b) => a.s - b.s);
    }

    const schedLine1 = calibrateSchedule(splineLine1, allStationDefs.filter(s => s.line === 1));
    const schedLine2 = calibrateSchedule(splineLine2, allStationDefs.filter(s => s.line === 2));

    // 4 Active Trainsets across both corridors
    const t0 = buildEMUCoachSet("WESTERN FAST UP", 0x7c3aed); // Retro purple / Siemens
    allTrains.push({
        id: 0,
        name: "Western Express Up (To School)",
        line: 1,
        spline: splineLine1,
        splineLength: splineLen1,
        schedule: schedLine1,
        targetIdx: 0,
        progress: 0.05,
        speed: 0,
        maxSpeed: 16.0,
        isDwelling: true,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t0.c1,
        coach2: t0.c2,
        coach3: t0.c3
    });

    const t1 = buildEMUCoachSet("WESTERN FAST DOWN", 0x9333ea);
    allTrains.push({
        id: 1,
        name: "Western Express Down (To Gateway)",
        line: 1,
        spline: splineLine1,
        splineLength: splineLen1,
        schedule: schedLine1,
        targetIdx: 2,
        progress: 0.55,
        speed: 16.0,
        maxSpeed: 16.0,
        isDwelling: false,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t1.c1,
        coach2: t1.c2,
        coach3: t1.c3
    });

    const t2 = buildEMUCoachSet("HARBOUR AERO-EXPRESS UP", 0xdc2626); // Maroon red
    allTrains.push({
        id: 2,
        name: "Central Aero-Express Up (To Airport)",
        line: 2,
        spline: splineLine2,
        splineLength: splineLen2,
        schedule: schedLine2,
        targetIdx: 0,
        progress: 0.12,
        speed: 0,
        maxSpeed: 18.0,
        isDwelling: true,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t2.c1,
        coach2: t2.c2,
        coach3: t2.c3
    });

    const t3 = buildEMUCoachSet("HARBOUR AERO-EXPRESS DOWN", 0x0284c7); // AC local blue
    allTrains.push({
        id: 3,
        name: "Central Aero-Express Down (To Gateway)",
        line: 2,
        spline: splineLine2,
        splineLength: splineLen2,
        schedule: schedLine2,
        targetIdx: 1,
        progress: 0.62,
        speed: 18.0,
        maxSpeed: 18.0,
        isDwelling: false,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t3.c1,
        coach2: t3.c2,
        coach3: t3.c3
    });

    trainState.spline = splineLine1;
    trainState.coach1 = t0.c1;
    trainState.coach2 = t0.c2;
    trainState.coach3 = t0.c3;
}

export function updateRailwayTrains(delta, playSoundFn) {
    if (!allTrains || allTrains.length === 0) return;

    for (let i = 0; i < allTrains.length; i++) {
        const tr = allTrains[i];
        const targetStop = tr.schedule[tr.targetIdx];
        const distNorm = (targetStop.s - tr.progress + 1.0) % 1.0;
        const distM = distNorm * tr.splineLength;

        if (tr.isDwelling) {
            tr.dwellTimer += delta;
            tr.speed = 0;
            if (tr.dwellTimer > 3.8 && !tr.hornPlayed) {
                if (playSoundFn && i === 0) playSoundFn('trainHorn');
                tr.hornPlayed = true;
            }
            if (tr.dwellTimer >= 5.0) {
                tr.isDwelling = false;
                tr.dwellTimer = 0;
                tr.hornPlayed = false;
                tr.targetIdx = (tr.targetIdx + 1) % tr.schedule.length;
            }
        } else {
            if (distM < 16.0) {
                const targetSpeed = Math.max(1.5, (distM / 16.0) * tr.maxSpeed);
                tr.speed = THREE.MathUtils.lerp(tr.speed, targetSpeed, 0.08);
                if (distM < 0.4 || distM > tr.splineLength - 1.0) {
                    tr.progress = targetStop.s;
                    tr.speed = 0;
                    tr.isDwelling = true;
                    tr.dwellTimer = 0;
                    tr.hornPlayed = false;
                    if (playSoundFn && i === 0) playSoundFn('chime');
                }
            } else {
                tr.speed = THREE.MathUtils.lerp(tr.speed, tr.maxSpeed, 0.05);
            }
            tr.progress = (tr.progress + (tr.speed * delta) / tr.splineLength) % 1.0;
        }

        const deltaS = 6.8 / tr.splineLength;
        const s1 = tr.progress;
        const s2 = (tr.progress - deltaS + 1.0) % 1.0;
        const s3 = (tr.progress - deltaS * 2 + 1.0) % 1.0;

        const p1 = tr.spline.getPointAt(s1);
        const t1 = tr.spline.getTangentAt(s1);
        tr.coach1.position.copy(p1);
        tr.coach1.rotation.y = Math.atan2(t1.x, t1.z);

        const p2 = tr.spline.getPointAt(s2);
        const t2 = tr.spline.getTangentAt(s2);
        tr.coach2.position.copy(p2);
        tr.coach2.rotation.y = Math.atan2(t2.x, t2.z);

        const p3 = tr.spline.getPointAt(s3);
        const t3 = tr.spline.getTangentAt(s3);
        tr.coach3.position.copy(p3);
        tr.coach3.rotation.y = Math.atan2(t3.x, t3.z);

        if (i === 0) {
            trainState.x = p1.x;
            trainState.z = p1.z;
            trainState.speed = tr.speed;
            trainState.isDwelling = tr.isDwelling;
            trainState.progress = tr.progress;
        }
    }
}

export function checkTrainProximity(showPromptFn) {
    if (showPromptFn) {
        showPromptFn('E', 'Dismount Train at Station ⏹️');
    }
}
