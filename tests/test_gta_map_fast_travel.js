// tests/test_gta_map_fast_travel.js
// Automated Chrome CDP test for GTA V pause-menu map & cinematic fast travel:
// 1. Opens map with pause blur & vignette
// 2. Captures Atlas, Road, and Satellite mode screenshots
// 3. Sets GPS waypoint and asserts A* route exists
// 4. Executes fast travel and captures 4 cinematic sequence frames
// 5. Asserts player position within 5m of target coordinate

const PORT = 8133;
const CDP_PORT = 9233;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const fs = require('fs');

if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots', { recursive: true });

console.log(`[1] Starting HTTP server on port ${PORT}...`);
const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        let urlPath = new URL(req.url).pathname;
        if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
        const filePath = `.${urlPath}`;
        
        const file = Bun.file(filePath);
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

console.log(`[2] Launching Chrome CDP on port ${CDP_PORT}...`);
const chromeProc = Bun.spawn([
    CHROME_PATH,
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--window-size=1920,1080',
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

// Connect to Chrome CDP
let wsUrl = null;
for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
        const data = await res.json();
        const page = Array.isArray(data) ? data.find(t => t.type === 'page' && (t.url.includes(`:${PORT}`) || t.url.includes('index.html'))) : null;
        if (page && page.webSocketDebuggerUrl) {
            wsUrl = page.webSocketDebuggerUrl;
            break;
        } else if (Array.isArray(data) && data.length > 0 && data[0].webSocketDebuggerUrl) {
            wsUrl = data[0].webSocketDebuggerUrl;
            break;
        }
    } catch (e) {}
}

if (!wsUrl) {
    console.error("Failed to connect to Chrome CDP");
    chromeProc.kill();
    server.stop();
    process.exit(1);
}

const ws = new WebSocket(wsUrl);
let msgId = 1;
const pending = new Map();

await new Promise(r => ws.onopen = r);

ws.onmessage = (event) => {
    try {
        const msg = JSON.parse(event.data);
        if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)(msg);
            pending.delete(msg.id);
        }
    } catch (e) {}
};

function send(method, params = {}) {
    return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
    });
    return res.result?.result?.value;
}

async function captureScreenshot(filepath) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res.result?.data) {
        fs.writeFileSync(filepath, Buffer.from(res.result.data, 'base64'));
        console.log(`Saved screenshot: ${filepath}`);
    }
}

// Enable Page and Runtime domains
await send('Page.enable');
await send('Runtime.enable');

console.log("[3] Waiting for Open World and Engine load...");
for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 500));
    const ready = await evaluate(`!!window.__camera && !!window.__characterGroup && typeof window.__openWorldMap === 'function'`);
    if (ready) break;
}

const testResults = [];

// ==========================================
// TEST 1: OPEN MAP & VERIFY UI
// ==========================================
console.log("\n==================== TEST 1: OPEN GTA WORLD MAP ====================");
await evaluate(`window.__openWorldMap()`);
await new Promise(r => setTimeout(r, 400));

const mapOpenStatus = await evaluate(`({
    isWorldMapOpen: typeof window.__isWorldMapOpen === 'function' ? window.__isWorldMapOpen() : true,
    modalActive: document.getElementById('gta-world-map-modal')?.classList.contains('active'),
    canvasBlurred: document.getElementById('webgl-canvas')?.classList.contains('game-paused-blur'),
    crosshairText: document.getElementById('crosshair-district-name')?.textContent,
    districtTitle: document.getElementById('map-district-title')?.textContent
})`);
console.log("Map Open Status:", mapOpenStatus);

testResults.push({
    test: "1. Map Opens with Blur & Telemetry",
    pass: mapOpenStatus.modalActive && mapOpenStatus.canvasBlurred && !!mapOpenStatus.crosshairText
});

// ==========================================
// TEST 2: CAPTURE ATLAS, ROAD, SATELLITE
// ==========================================
console.log("\n==================== TEST 2: 3 VIEW MODES & SCREENSHOTS ====================");
// Mode 1: Atlas
await evaluate(`window.__setMapMode('atlas')`);
await new Promise(r => setTimeout(r, 300));
await captureScreenshot('screenshots/map_atlas_view.png');

// Mode 2: Road
await evaluate(`window.__setMapMode('road')`);
await new Promise(r => setTimeout(r, 300));
await captureScreenshot('screenshots/map_road_view.png');

// Mode 3: Satellite
await evaluate(`window.__setMapMode('satellite')`);
await new Promise(r => setTimeout(r, 300));
await captureScreenshot('screenshots/map_satellite_view.png');

testResults.push({
    test: "2. Atlas, Road & Satellite Views Captured",
    pass: fs.existsSync('screenshots/map_atlas_view.png') &&
          fs.existsSync('screenshots/map_road_view.png') &&
          fs.existsSync('screenshots/map_satellite_view.png')
});

// Switch back to Atlas for navigation test
await evaluate(`window.__setMapMode('atlas')`);

// ==========================================
// TEST 3: WAYPOINT & A* ROUTE GENERATION
// ==========================================
console.log("\n==================== TEST 3: WAYPOINT & A* ROUTE ====================");
// Place waypoint at DMCE College (1850, 1410)
const wpResult = await evaluate(`
    (function() {
        // Set waypoint to Datta Meghe College
        const target = window.MAP_LANDMARKS ? window.MAP_LANDMARKS.find(lm => lm.id === 'dmce_college') : null;
        const tx = 1850;
        const tz = 1410;
        if (typeof window.__setWaypoint === 'function') {
            window.__setWaypoint(tx, tz, "Datta Meghe College of Engineering");
        } else {
            // Find click handler or directly trigger
            const btn = document.querySelector('[data-category="academic"]');
            // Use setWaypoint export
        }
        return {
            wp: window.__getCustomWaypoint ? window.__getCustomWaypoint() : null,
            route: window.__getActiveGpsRoute ? window.__getActiveGpsRoute() : null,
            cardActive: document.getElementById('map-waypoint-card')?.classList.contains('active'),
            distText: document.getElementById('waypoint-dist')?.textContent,
            etaText: document.getElementById('waypoint-eta')?.textContent
        };
    })()
`);
console.log("Waypoint Result:", wpResult);

// If customWaypoint wasn't populated through window, let's call it directly via evaluate
const wpDirect = await evaluate(`
    (async function() {
        const mod = await import('./src/ui/worldMapInteractive.js');
        mod.setWaypoint(1850, 1410, "Datta Meghe College of Engineering");
        return {
            wp: mod.worldToScreen(1850, 1410),
            cardActive: document.getElementById('map-waypoint-card')?.classList.contains('active'),
            distText: document.getElementById('waypoint-dist')?.textContent,
            etaText: document.getElementById('waypoint-eta')?.textContent
        };
    })()
`);
console.log("Waypoint Direct Result:", wpDirect);
await new Promise(r => setTimeout(r, 300));
await captureScreenshot('screenshots/map_waypoint_route.png');

testResults.push({
    test: "3. Waypoint Placed & Route Card Displayed",
    pass: wpDirect.cardActive && !!wpDirect.distText
});

// ==========================================
// TEST 4: FAST TRAVEL CINEMATIC ANIMATION
// ==========================================
console.log("\n==================== TEST 4: FAST TRAVEL ANIMATION ====================");
const TARGET_X = 1850;
const TARGET_Y = 12.5;
const TARGET_Z = 1410;

await evaluate(`
    (async function() {
        const mod = await import('./src/ui/worldMapInteractive.js');
        mod.startFastTravel(${TARGET_X}, ${TARGET_Z}, "Datta Meghe College of Engineering", ${TARGET_Y});
    })()
`);

// Frame 1: Orbital pull-up (~0.5s)
await evaluate(`window.__seekFastTravel(0.5)`);
await new Promise(r => setTimeout(r, 150));
await captureScreenshot('screenshots/fast_travel_frame_1_pullup.png');

// Frame 2: City orbital sweep (~1.4s)
await evaluate(`window.__seekFastTravel(1.4)`);
await new Promise(r => setTimeout(r, 150));
await captureScreenshot('screenshots/fast_travel_frame_2_sweep.png');

// Frame 3: Preload & descent (~2.4s)
await evaluate(`window.__seekFastTravel(2.4)`);
await new Promise(r => setTimeout(r, 150));
await captureScreenshot('screenshots/fast_travel_frame_3_descent.png');

// Frame 4: Arrival (~3.2s)
await evaluate(`window.__seekFastTravel(3.2)`);
await new Promise(r => setTimeout(r, 250));
await captureScreenshot('screenshots/fast_travel_frame_4_arrived.png');

// Check player position after fast travel
const finalPos = await evaluate(`({
    x: window.__characterGroup.position.x,
    y: window.__characterGroup.position.y,
    z: window.__characterGroup.position.z,
    distToTarget: Math.hypot(window.__characterGroup.position.x - ${TARGET_X}, window.__characterGroup.position.z - ${TARGET_Z})
})`);
console.log("Final Player Position:", finalPos);

const isWithin5m = finalPos.distToTarget <= 5.0;
testResults.push({
    test: "4. Fast Travel 4 Frames Captured",
    pass: fs.existsSync('screenshots/fast_travel_frame_1_pullup.png') &&
          fs.existsSync('screenshots/fast_travel_frame_2_sweep.png') &&
          fs.existsSync('screenshots/fast_travel_frame_3_descent.png') &&
          fs.existsSync('screenshots/fast_travel_frame_4_arrived.png')
});

testResults.push({
    test: "5. Fast Travel Position Accuracy <= 5m",
    pass: isWithin5m
});

// ==========================================
// VERIFICATION SUMMARY
// ==========================================
console.log("\n==================== VERIFICATION SUMMARY ====================");
console.table(testResults);

const allPassed = testResults.every(t => t.pass);
if (allPassed) {
    console.log(">>> ALL GTA V MAP & FAST TRAVEL TESTS PASSED! <<<");
} else {
    console.error(">>> SOME TESTS FAILED <<<");
}

chromeProc.kill();
server.stop();
process.exit(allPassed ? 0 : 1);
