// tests/test_collision_physics.js
// Automated verification suite for P1 Collision & Elevation Hardening
// Executable via `bun tests/test_collision_physics.js`
// 
// Tests:
// Test A: SpatialHashGrid numeric keys
// Test B: Anti-roof teleport & step-up elevation
// Test C: Player wall collision & non-penetration
// Test D: Car building collision & velocity damping
// Test E: Street lamp post cylinder colliders & pushback

const PORT = 8135;
const CDP_PORT = 9235;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

console.log("================================================================================");
console.log(">>> STARTING P1 COLLISION & PHYSICS AUTOMATED VERIFICATION SUITE");
console.log("================================================================================");

console.log(`[1] Starting static test server on port ${PORT}...`);
const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        let urlPath = new URL(req.url).pathname;
        if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
        const file = Bun.file(`.${urlPath}`);
        if (await file.exists()) {
            let contentType = 'text/plain';
            if (urlPath.endsWith('.html')) contentType = 'text/html';
            else if (urlPath.endsWith('.js') || urlPath.endsWith('.mjs')) contentType = 'application/javascript';
            else if (urlPath.endsWith('.css')) contentType = 'text/css';
            else if (urlPath.endsWith('.json')) contentType = 'application/json';
            else if (urlPath.endsWith('.png')) contentType = 'image/png';
            else if (urlPath.endsWith('.svg')) contentType = 'image/svg+xml';
            else if (urlPath.endsWith('.glb')) contentType = 'model/gltf-binary';
            else if (urlPath.endsWith('.woff2')) contentType = 'font/woff2';
            else if (urlPath.endsWith('.ico')) contentType = 'image/x-icon';
            return new Response(file, { headers: { 'Content-Type': contentType } });
        }
        return new Response("Not Found: " + urlPath, { status: 404 });
    }
});

console.log(`[2] Spawning headless Chrome on CDP port ${CDP_PORT}...`);
const chromeProc = Bun.spawn([
    CHROME_PATH,
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    `http://127.0.0.1:${PORT}/index.html`
], {
    stdout: 'ignore',
    stderr: 'ignore'
});

// Connect to CDP
let wsUrl = null;
for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
        const data = await res.json();
        const page = data.find(p => p.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
            wsUrl = page.webSocketDebuggerUrl;
            break;
        }
    } catch (e) {}
}

if (!wsUrl) {
    console.error("FATAL: Failed to connect to Chrome CDP endpoint.");
    chromeProc.kill();
    server.stop();
    process.exit(1);
}

const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
});

let msgId = 1;
function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === id) {
                ws.removeEventListener('message', handler);
                if (data.error) reject(data.error);
                else resolve(data.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

// Wait 2.5s for world to load and initialize
console.log("[3] Connected to Chrome CDP. Waiting for world initialization...");
await new Promise(r => setTimeout(r, 2500));

console.log("\n[4] Executing collision & physics test assertions in browser runtime...\n");

const evalResult = await sendCommand('Runtime.evaluate', {
    expression: `(async () => {
        const collidersMod = await import('./src/world/worldColliders.js');
        const vehiclesMod = await import('./src/vehicles/playerVehicles.js');
        const characterMod = await import('./src/character/playerCharacter.js');
        const roadMeshesMod = await import('./src/world/roadMeshes.js');

        const { SpatialHashGrid, registerBoxCollider, registerCylinderCollider, getSurfaceElevationAt, resolveCollision, worldColliders, spatialGrid } = collidersMod;
        const { updateVehiclePhysics } = vehiclesMod;
        const { updatePlayerLocomotion, characterGroup } = characterMod;

        const results = [];

        // -------------------------------------------------------------
        // TEST A: SpatialHashGrid numeric keys & allocation-free queries
        // -------------------------------------------------------------
        {
            const testGrid = new SpatialHashGrid(50);
            const key1 = testGrid._key(0, 0);
            const key2 = testGrid._key(10, -5);
            const key3 = testGrid._key(-100, 200);

            const isKey1Int = Number.isInteger(key1) && typeof key1 === 'number';
            const isKey2Int = Number.isInteger(key2) && typeof key2 === 'number';
            const isKey3Int = Number.isInteger(key3) && typeof key3 === 'number';

            // Insert single-cell and multi-cell colliders
            const colA = { type: 'box', minX: 10, maxX: 40, minZ: 10, maxZ: 40, label: 'SingleCell' };
            const colB = { type: 'box', minX: 45, maxX: 105, minZ: -30, maxZ: 60, label: 'MultiCell' };
            const colC = { type: 'cylinder', x: -120, z: -80, radius: 2.0, label: 'CylNeg' };
            testGrid.insert(colA);
            testGrid.insert(colB);
            testGrid.insert(colC);

            const cellKeys = Array.from(testGrid.cells.keys());
            const allKeysNumeric = cellKeys.length > 0 && cellKeys.every(k => Number.isInteger(k) && typeof k === 'number');

            // Query colliders
            const qA = testGrid.query(25, 25, 5);
            const hasColA = qA.some(c => c.label === 'SingleCell');

            const qB = testGrid.query(90, 50, 5);
            const hasColB = qB.some(c => c.label === 'MultiCell');

            const qC = testGrid.query(-120, -80, 5);
            const hasColC = qC.some(c => c.label === 'CylNeg');

            const passA = isKey1Int && isKey2Int && isKey3Int && allKeysNumeric && hasColA && hasColB && hasColC;
            results.push({
                test: 'Test A: SpatialHashGrid Numeric Keys & Queries',
                pass: passA,
                details: {
                    sampleKeys: [key1, key2, key3],
                    allKeysNumeric,
                    cellsCount: cellKeys.length,
                    foundSingleCell: hasColA,
                    foundMultiCell: hasColB,
                    foundCylinderNeg: hasColC
                }
            });
        }

        // -------------------------------------------------------------
        // TEST B: Anti-roof teleport & step-up elevation
        // -------------------------------------------------------------
        {
            // At coastal sea/water level coordinates (X: -1550, Z: 100), natural ground elevation is 0.0m
            // Register a tall building (roofY = 10.0m) at X: -1540..-1500, Z: 80..120
            const bldg10 = registerBoxCollider(-1540, -1500, 80, 120, 'TestHighRoofBuilding', 0, 10.0, 10.0);
            // Register a medium building (roofY = 4.0m) at X: -1600..-1560, Z: 80..120
            const bldg4 = registerBoxCollider(-1600, -1560, 80, 120, 'TestMidRoofBuilding', 0, 4.0, 4.0);
            // Register a small curb / step (roofY = 0.5m) at X: -1660..-1620, Z: 80..120
            const curbStep = registerBoxCollider(-1660, -1620, 80, 120, 'TestCurbStep', 0, 0.5, 0.5);

            // Ground player with currentY = 0.2
            const elevHigh = getSurfaceElevationAt(-1520, 100, 0.2);
            const elevMid = getSurfaceElevationAt(-1580, 100, 0.2);
            const elevCurb = getSurfaceElevationAt(-1640, 100, 0.2);

            // High and mid roofs must NEVER teleport the player (returns ground elevation <= 0.8m)
            const noTeleportHigh = elevHigh <= 0.8 && elevHigh !== 10.0;
            const noTeleportMid = elevMid <= 0.8 && elevMid !== 4.0;
            // Small curb step (0.5m <= 0.2 + 0.6 = 0.8m) MUST step up
            const stepUpCurb = elevCurb >= 0.45 && elevCurb <= 0.55;

            // Player already on roof (currentY = 10.0) SHOULD remain on roof
            const elevStayOnHigh = getSurfaceElevationAt(-1520, 100, 10.0);
            const stayOnHigh = elevStayOnHigh >= 9.9;

            const passB = noTeleportHigh && noTeleportMid && stepUpCurb && stayOnHigh;
            results.push({
                test: 'Test B: Anti-Roof Teleport & Step-Up Elevation',
                pass: passB,
                details: {
                    highRoofElevationAt0_2: elevHigh,
                    midRoofElevationAt0_2: elevMid,
                    curbElevationAt0_2: elevCurb,
                    highRoofElevationAt10_0: elevStayOnHigh,
                    noTeleportHigh,
                    noTeleportMid,
                    stepUpCurb,
                    stayOnHigh
                }
            });
        }

        // -------------------------------------------------------------
        // TEST C: Player wall collision & non-penetration
        // -------------------------------------------------------------
        {
            // Register building wall at minX: 10, maxX: 30, minZ: 10, maxZ: 30
            const wallBldg = registerBoxCollider(10, 30, 10, 30, 'TestWallBuilding', 0, 12, 12);
            const playerRadius = 0.6;
            const stopBoundary = 10 - playerRadius; // 9.4

            // Subtest C1: Direct resolveCollision when penetrating west wall
            const testPos = { x: 9.8, y: 1.0, z: 20.0 };
            resolveCollision(testPos, playerRadius);
            const posWestClean = testPos.x <= stopBoundary + 0.001;

            // Subtest C2: Continuous walk forward directly into west wall
            let walkPos = { x: 8.0, y: 1.0, z: 20.0 };
            let penetrated = false;
            for (let step = 0; step < 20; step++) {
                walkPos.x += 0.3; // move forward towards wall
                resolveCollision(walkPos, playerRadius);
                if (walkPos.x > stopBoundary + 0.001) {
                    penetrated = true;
                    break;
                }
            }

            // Subtest C3: Penetrating east wall from inside/right
            const testPosEast = { x: 30.2, y: 1.0, z: 20.0 };
            resolveCollision(testPosEast, playerRadius);
            const posEastClean = testPosEast.x >= 30 + playerRadius - 0.001;

            const passC = posWestClean && !penetrated && posEastClean;
            results.push({
                test: 'Test C: Player Wall Collision & Non-Penetration',
                pass: passC,
                details: {
                    expectedStopX: stopBoundary,
                    actualStopWestX: testPos.x,
                    actualStopEastX: testPosEast.x,
                    walkSimulationPenetrated: penetrated,
                    posWestClean,
                    posEastClean
                }
            });
        }

        // -------------------------------------------------------------
        // TEST D: Car building collision & velocity damping
        // -------------------------------------------------------------
        {
            // Register building obstacle at minX: 100, maxX: 120, minZ: 100, maxZ: 120
            registerBoxCollider(100, 120, 100, 120, 'TestCarObstacle', 0, 10, 10);

            const carColRadius = 1.6;
            const expectedStopX = 100 - carColRadius; // 98.4

            // Create a mock car vehicle object with mesh
            const carObj = {
                type: 'car',
                x: 95.0,
                z: 110.0,
                rotation: Math.PI / 2, // Facing +X into wall
                speed: 25.0, // moving fast towards wall
                mesh: {
                    position: { x: 95.0, y: 0.2, z: 110.0 },
                    rotation: { x: 0, y: Math.PI / 2, z: 0 }
                },
                wheels: []
            };

            let carPenetrated = false;
            let initialSpeed = carObj.speed;
            let finalSpeed = carObj.speed;

            // Simulate 30 frames of driving forward directly into the wall
            for (let f = 0; f < 30; f++) {
                updateVehiclePhysics(carObj, 0.033, { w: true });
                if (carObj.mesh.position.x > expectedStopX + 0.01) {
                    carPenetrated = true;
                }
            }
            finalSpeed = carObj.speed;

            const speedDamped = finalSpeed < initialSpeed * 0.2;
            const stoppedAtWall = carObj.mesh.position.x <= expectedStopX + 0.01;

            const passD = !carPenetrated && stoppedAtWall && speedDamped;
            results.push({
                test: 'Test D: Car Building Collision & Speed Damping',
                pass: passD,
                details: {
                    initialSpeed,
                    finalSpeed,
                    expectedStopX,
                    finalCarX: carObj.mesh.position.x,
                    carPenetrated,
                    stoppedAtWall,
                    speedDamped
                }
            });
        }

        // -------------------------------------------------------------
        // TEST E: Street lamp post cylinder colliders & pushback
        // -------------------------------------------------------------
        {
            // 1. Check existing registered cylinder colliders for lamp posts
            const lampPosts = worldColliders.filter(c => c.type === 'cylinder' && (c.label === 'StreetLampPost' || c.label?.includes('Lamp')));

            // 2. Test collision resolution against a lamp post cylinder collider
            const testPoleX = 300.0;
            const testPoleZ = 300.0;
            const poleRadius = 0.25;
            registerCylinderCollider(testPoleX, testPoleZ, poleRadius, 'StreetLampPost', 0, 8.5);

            // Place an entity colliding with pole
            const entityRadius = 0.5;
            const minAllowedDist = poleRadius + entityRadius; // 0.75m
            const entityPos = { x: testPoleX + 0.1, y: 1.0, z: testPoleZ };

            resolveCollision(entityPos, entityRadius);
            const distAfter = Math.hypot(entityPos.x - testPoleX, entityPos.z - testPoleZ);
            const pushedBackCleanly = distAfter >= minAllowedDist - 0.001;

            const passE = lampPosts.length > 0 && pushedBackCleanly;
            results.push({
                test: 'Test E: Street Lamp Post Cylinder Colliders & Pushback',
                pass: passE,
                details: {
                    registeredLampPostsCount: lampPosts.length,
                    minAllowedDist,
                    actualDistAfterCollision: distAfter,
                    pushedBackCleanly
                }
            });
        }

        return results;
    })()`,
    awaitPromise: true,
    returnByValue: true
});

ws.close();
chromeProc.kill();
server.stop();

if (!evalResult || !evalResult.result || !evalResult.result.value) {
    console.error("Test execution failed or returned invalid result:", evalResult);
    process.exit(1);
}

const testList = evalResult.result.value;
let allPassed = true;

console.log("--------------------------------------------------------------------------------");
console.log("TEST RESULTS TABLE:");
console.log("--------------------------------------------------------------------------------");

testList.forEach((t, idx) => {
    const mark = t.pass ? "PASS [OK]" : "FAIL [X]";
    console.log(`[${idx + 1}] ${t.test}: ${mark}`);
    console.log(`    Details:`, JSON.stringify(t.details, null, 2));
    if (!t.pass) allPassed = false;
});

console.log("--------------------------------------------------------------------------------");
if (allPassed) {
    console.log(">>> ALL P1 COLLISION & PHYSICS TESTS PASSED SUCCESSFULLY! <<<");
    process.exit(0);
} else {
    console.error(">>> SOME TESTS FAILED. See details above. <<<");
    process.exit(1);
}
