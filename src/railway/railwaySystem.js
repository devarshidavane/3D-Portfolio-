import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { TRACK_SPLINES } from '../data/railwayDatabase.js';
import { createBilingualSignboardTexture } from '../world/textures.js';

// ==========================================
// 5KM MUMBAI SUBURBAN RAILWAY INFRASTRUCTURE
// Western Corridor (Churchgate to Borivali via Bandra / Fr. Agnel)
// Central & Trans-Harbour Corridor (CSMT to Thane & Airoli / DMCE College)
// Dual-Track Broad Gauge (1676mm), Ballast Bed, Stations & 4 EMU Rakes
// ==========================================

export const allTrains = [];
export const railwayStations = [];

export let trainState = {
    spline: null,
    splineLength: 4800,
    coach1: null,
    coach2: null,
    coach3: null,
    mesh: null,
    x: -680,
    z: 480,
    speed: 0,
    maxSpeed: 24.0,
    progress: 0.05,
    targetStationIdx: 0,
    dwellTimer: 0,
    isDwelling: true,
    hornPlayed: false
};

export function buildRailwaySystem(scene) {
    allTrains.length = 0;
    railwayStations.length = 0;

    // 1. Line 1: Western Railway Main Corridor (Churchgate to Borivali & Return)
    const line1Points = [
        new THREE.Vector3(-480, 0.4, -1920), // Churchgate Platform
        new THREE.Vector3(-460, 0.4, -1600), // Marine Lines
        new THREE.Vector3(-420, 0.4, -1350), // Mumbai Central
        new THREE.Vector3(-380, 0.4, -320),  // Dadar Western
        new THREE.Vector3(-320, 0.4, 150),   // Mahim Junction
        new THREE.Vector3(-680, 0.4, 480),   // Bandra (Fr. Agnel School)
        new THREE.Vector3(-660, 0.4, 850),   // Santacruz
        new THREE.Vector3(-650, 0.4, 1150),  // Andheri
        new THREE.Vector3(-620, 0.4, 1500),  // Goregaon
        new THREE.Vector3(-590, 0.4, 1850),  // Malad
        new THREE.Vector3(-520, 0.4, 2220),  // Borivali Terminus
        new THREE.Vector3(-515, 0.4, 2260),  // Borivali Loop North
        new THREE.Vector3(-525, 0.4, 2260),
        new THREE.Vector3(-525, 0.4, 2220),  // Down Line Return
        new THREE.Vector3(-595, 0.4, 1850),
        new THREE.Vector3(-625, 0.4, 1500),
        new THREE.Vector3(-655, 0.4, 1150),
        new THREE.Vector3(-665, 0.4, 850),
        new THREE.Vector3(-685, 0.4, 480),   // Bandra Return
        new THREE.Vector3(-325, 0.4, 150),
        new THREE.Vector3(-385, 0.4, -320),
        new THREE.Vector3(-425, 0.4, -1350),
        new THREE.Vector3(-465, 0.4, -1600),
        new THREE.Vector3(-485, 0.4, -1920),
        new THREE.Vector3(-482, 0.4, -1940)
    ];
    const splineLine1 = new THREE.CatmullRomCurve3(line1Points, true, 'centripetal');
    const splineLen1 = splineLine1.getLength();

    // 2. Line 2: Central & Trans-Harbour Line (CSMT to Airoli DMCE & Thane)
    const line2Points = [
        new THREE.Vector3(120, 0.4, -1900),  // CSMT Heritage Terminus
        new THREE.Vector3(140, 0.4, -1300),  // Byculla
        new THREE.Vector3(160, 0.4, -320),   // Dadar Central
        new THREE.Vector3(320, 0.4, 220),    // Kurla Central
        new THREE.Vector3(480, 0.4, 680),    // Ghatkopar
        new THREE.Vector3(580, 0.4, 1100),   // Vikhroli
        new THREE.Vector3(790, 0.4, 1400),   // Mulund / Airoli Rail Bridge West
        new THREE.Vector3(1350, 4.5, 1420),  // Thane Creek Rail Span
        new THREE.Vector3(1750, 0.4, 1450),  // Airoli Station (DMCE College Campus!)
        new THREE.Vector3(1450, 0.4, 2100),  // Trans-Harbour Curve
        new THREE.Vector3(1150, 0.4, 2200),  // Thane Central Terminus
        new THREE.Vector3(1145, 0.4, 2240),  // Thane Turnaround
        new THREE.Vector3(1155, 0.4, 2240),
        new THREE.Vector3(1455, 0.4, 2100),  // Return loop
        new THREE.Vector3(1755, 0.4, 1450),  // Airoli Return
        new THREE.Vector3(1355, 4.5, 1420),
        new THREE.Vector3(795, 0.4, 1400),
        new THREE.Vector3(585, 0.4, 1100),
        new THREE.Vector3(485, 0.4, 680),
        new THREE.Vector3(325, 0.4, 220),
        new THREE.Vector3(165, 0.4, -320),
        new THREE.Vector3(145, 0.4, -1300),
        new THREE.Vector3(125, 0.4, -1900),
        new THREE.Vector3(122, 0.4, -1925)
    ];
    const splineLine2 = new THREE.CatmullRomCurve3(line2Points, true, 'centripetal');
    const splineLen2 = splineLine2.getLength();

    // 3. Station Definitions along Corridors
    const allStationDefs = [
        // Western Line Stations
        { id: 'st-churchgate', name: "CHURCHGATE TERMINUS", mr: "चर्चगेट", x: -480, z: -1920, line: 1 },
        { id: 'st-dadar-wr', name: "DADAR (WESTERN)", mr: "दादर (प.)", x: -380, z: -320, line: 1 },
        { id: 'st-bandra', name: "BANDRA (FR. AGNEL SCHOOL)", mr: "वांद्रे (फा. आग्नेल)", x: -680, z: 480, line: 1 },
        { id: 'st-andheri', name: "ANDHERI SUBURBAN HUB", mr: "अंधेरी", x: -650, z: 1150, line: 1 },
        { id: 'st-borivali', name: "BORIVALI TERMINUS", mr: "बोरिवली", x: -520, z: 2220, line: 1 },

        // Central & Trans-Harbour Stations
        { id: 'st-csmt', name: "CSMT HERITAGE TERMINUS", mr: "छ.शि.म.ट.", x: 120, z: -1900, line: 2 },
        { id: 'st-dadar-cr', name: "DADAR (CENTRAL)", mr: "दादर (मध्य)", x: 160, z: -320, line: 2 },
        { id: 'st-kurla', name: "KURLA JUNCTION", mr: "कुर्ला", x: 320, z: 220, line: 2 },
        { id: 'st-ghatkopar', name: "GHATKOPAR INTERCHANGE", mr: "घाटकोपर", x: 480, z: 680, line: 2 },
        { id: 'st-airoli', name: "AIROLI (DMCE COLLEGE)", mr: "ऐरोली (डी.एम.सी.ई.)", x: 1750, z: 1450, line: 2 },
        { id: 'st-thane', name: "THANE CENTRAL", mr: "ठाणे", x: 1150, z: 2200, line: 2 }
    ];

    const stationPlatGeoms = [];
    const stationCanopyGeoms = [];
    const stationPillarGeoms = [];

    const platMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.4, metalness: 0.4 });

    allStationDefs.forEach((st) => {
        const plat = new THREE.BoxGeometry(6.5, 0.75, 42);
        plat.translate(st.x - 5.5, 0.375, st.z);
        stationPlatGeoms.push(plat);

        const canopy = new THREE.BoxGeometry(7.2, 0.25, 42);
        canopy.translate(st.x - 5.5, 4.6, st.z);
        stationCanopyGeoms.push(canopy);

        [-16, -5, 5, 16].forEach(pz => {
            const pillar = new THREE.BoxGeometry(0.3, 4.2, 0.3);
            pillar.translate(st.x - 7.5, 2.3, st.z + pz);
            stationPillarGeoms.push(pillar);
        });

        const signTex = createBilingualSignboardTexture(st.mr, st.name);
        const signMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(6.2, 1.4),
            new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
        );
        signMesh.position.set(st.x - 4.5, 3.6, st.z);
        signMesh.rotation.y = Math.PI / 2;
        scene.add(signMesh);

        railwayStations.push(st);
    });

    if (stationPlatGeoms.length > 0) {
        scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stationPlatGeoms), platMat));
        scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stationCanopyGeoms), canopyMat));
        scene.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stationPillarGeoms), platMat));
    }

    // 4. Broad-Gauge Track Rails & Ballast Construction
    function buildCorridorTracks(spline, sampleCount) {
        const leftPts = [], rightPts = [];
        const ballastGeoms = [];
        const sleeperGeoms = [];
        const UP = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i < sampleCount; i++) {
            const t = i / sampleCount;
            const pt = spline.getPointAt(t);
            const tan = spline.getTangentAt(t);
            const norm = new THREE.Vector3().crossVectors(tan, UP).normalize();
            const rotY = Math.atan2(tan.x, tan.z);

            // Left rail (+0.838m) and Right rail (-0.838m) for 1676mm Indian Broad Gauge
            leftPts.push(new THREE.Vector3(pt.x + norm.x * 0.838, pt.y + 0.22, pt.z + norm.z * 0.838));
            rightPts.push(new THREE.Vector3(pt.x - norm.x * 0.838, pt.y + 0.22, pt.z - norm.z * 0.838));

            // Crushed basalt ballast bed slab
            const b = new THREE.BoxGeometry(4.2, 0.22, 16);
            if (rotY !== 0) b.rotateY(rotY);
            b.translate(pt.x, pt.y + 0.08, pt.z);
            ballastGeoms.push(b);

            // Concrete PSC Sleeper every 8 meters of sample
            const sl = new THREE.BoxGeometry(2.7, 0.16, 0.35);
            if (rotY !== 0) sl.rotateY(rotY);
            sl.translate(pt.x, pt.y + 0.18, pt.z);
            sleeperGeoms.push(sl);
        }

        const lGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftPts, true, 'centripetal'), sampleCount, 0.06, 5, true);
        const rGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightPts, true, 'centripetal'), sampleCount, 0.06, 5, true);

        const railsMesh = new THREE.Mesh(
            BufferGeometryUtils.mergeGeometries([lGeom, rGeom]),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.92, roughness: 0.18 })
        );
        scene.add(railsMesh);

        if (ballastGeoms.length > 0) {
            const ballastMesh = new THREE.Mesh(
                BufferGeometryUtils.mergeGeometries(ballastGeoms),
                new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 })
            );
            scene.add(ballastMesh);
        }

        if (sleeperGeoms.length > 0) {
            const sleeperMesh = new THREE.Mesh(
                BufferGeometryUtils.mergeGeometries(sleeperGeoms),
                new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })
            );
            scene.add(sleeperMesh);
        }
    }

    buildCorridorTracks(splineLine1, 380);
    buildCorridorTracks(splineLine2, 380);

    // 5. EMU Coach Set Builder (Siemens / Bombardier 12-Car formations)
    function buildEMUCoachSet(trainName, colorHex) {
        const emuLiveryMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45, metalness: 0.2 });
        const emuCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.55 });
        const emuDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
        const emuWheelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });

        function createCoach(type) {
            const coach = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.7, 7.5), emuCreamMat);
            body.position.set(0, 1.85, 0);
            coach.add(body);

            // Iconic Mumbai suburban stripe
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.6, 7.52), emuLiveryMat);
            stripe.position.set(0, 1.5, 0);
            coach.add(stripe);

            // Bogies & Steel Wheels
            [-2.4, 2.4].forEach(bz => {
                const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 2.4), emuDarkMat);
                bogie.position.set(0, 0.45, bz);
                coach.add(bogie);

                [-0.88, 0.88].forEach(wx => {
                    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 12), emuWheelMat);
                    wheel.rotateZ(Math.PI / 2);
                    wheel.position.set(wx, 0.28, bz);
                    coach.add(wheel);
                });
            });

            if (type === 'lead') {
                const hl = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
                hl.position.set(0, 1.45, 3.77);
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

    // Schedule Calibration
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

    // 4 Active EMU Trains
    const t0 = buildEMUCoachSet("WESTERN FAST UP", 0x7c3aed); // Purple Siemens WR Local
    allTrains.push({
        id: 0,
        name: "Western Express Up (Bandra / Borivali)",
        line: 1,
        spline: splineLine1,
        splineLength: splineLen1,
        schedule: schedLine1,
        targetIdx: 0,
        progress: 0.15,
        speed: 0,
        maxSpeed: 22.0,
        isDwelling: true,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t0.c1,
        coach2: t0.c2,
        coach3: t0.c3
    });

    const t1 = buildEMUCoachSet("WESTERN SLOW DOWN", 0x2563eb); // Blue AC Local
    allTrains.push({
        id: 1,
        name: "Western AC Local (Churchgate)",
        line: 1,
        spline: splineLine1,
        splineLength: splineLen1,
        schedule: schedLine1,
        targetIdx: 2,
        progress: 0.65,
        speed: 0,
        maxSpeed: 22.0,
        isDwelling: true,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t1.c1,
        coach2: t1.c2,
        coach3: t1.c3
    });

    const t2 = buildEMUCoachSet("CENTRAL MAIN FAST", 0xd97706); // Amber/Yellow CR Local
    allTrains.push({
        id: 2,
        name: "Central Express (Thane / CSMT)",
        line: 2,
        spline: splineLine2,
        splineLength: splineLen2,
        schedule: schedLine2,
        targetIdx: 0,
        progress: 0.10,
        speed: 0,
        maxSpeed: 22.0,
        isDwelling: true,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t2.c1,
        coach2: t2.c2,
        coach3: t2.c3
    });

    const t3 = buildEMUCoachSet("TRANS-HARBOUR LOCAL", 0x059669); // Green Trans-Harbour to Airoli DMCE
    allTrains.push({
        id: 3,
        name: "Trans-Harbour (Airoli DMCE / Thane)",
        line: 2,
        spline: splineLine2,
        splineLength: splineLen2,
        schedule: schedLine2,
        targetIdx: 3,
        progress: 0.40,
        speed: 0,
        maxSpeed: 22.0,
        isDwelling: true,
        dwellTimer: 0,
        hornPlayed: false,
        coach1: t3.c1,
        coach2: t3.c2,
        coach3: t3.c3
    });

    // Expose primary train for interaction
    trainState.spline = splineLine1;
    trainState.splineLength = splineLen1;
    trainState.coach1 = t0.c1;
    trainState.coach2 = t0.c2;
    trainState.coach3 = t0.c3;
}

export function updateRailwayTrains(delta, playSound) {
    for (let i = 0; i < allTrains.length; i++) {
        const tr = allTrains[i];
        if (!tr.spline) continue;

        if (tr.isDwelling) {
            tr.dwellTimer += delta;
            tr.speed = THREE.MathUtils.lerp(tr.speed, 0, 0.15);
            if (tr.dwellTimer > 4.5) {
                tr.isDwelling = false;
                tr.dwellTimer = 0;
                tr.hornPlayed = false;
                tr.targetIdx = (tr.targetIdx + 1) % tr.schedule.length;
            }
        } else {
            tr.speed = THREE.MathUtils.lerp(tr.speed, tr.maxSpeed, 0.05);
            const targetS = tr.schedule[tr.targetIdx].s;
            let distToTarget = (targetS - tr.progress) * tr.splineLength;
            if (distToTarget < 0) distToTarget += tr.splineLength;

            if (distToTarget < 35) {
                tr.isDwelling = true;
                tr.dwellTimer = 0;
                if (!tr.hornPlayed && playSound) {
                    playSound('trainHorn');
                    tr.hornPlayed = true;
                }
            }
        }

        tr.progress = (tr.progress + (tr.speed * delta) / tr.splineLength) % 1.0;

        // Position Coaches with accurate realistic coupling spacing
        const c1Pt = tr.spline.getPointAt(tr.progress);
        const c1Tan = tr.spline.getTangentAt(tr.progress);
        const rotY1 = Math.atan2(c1Tan.x, c1Tan.z);

        tr.coach1.position.set(c1Pt.x, c1Pt.y, c1Pt.z);
        tr.coach1.rotation.y = rotY1;

        const s2 = (tr.progress - 8.2 / tr.splineLength + 1.0) % 1.0;
        const c2Pt = tr.spline.getPointAt(s2);
        const c2Tan = tr.spline.getTangentAt(s2);
        tr.coach2.position.set(c2Pt.x, c2Pt.y, c2Pt.z);
        tr.coach2.rotation.y = Math.atan2(c2Tan.x, c2Tan.z);

        const s3 = (tr.progress - 16.4 / tr.splineLength + 1.0) % 1.0;
        const c3Pt = tr.spline.getPointAt(s3);
        const c3Tan = tr.spline.getTangentAt(s3);
        tr.coach3.position.set(c3Pt.x, c3Pt.y, c3Pt.z);
        tr.coach3.rotation.y = Math.atan2(c3Tan.x, c3Tan.z);
    }
}

export function checkTrainProximity(showPrompt) {
    if (showPrompt) showPrompt('F', 'Dismount Train at Station ⏹️');
}
