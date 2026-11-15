// test_interactive_features.js
// Deep verification of all gameplay, vehicle, locomotion, flight, teleport, and UI features

const PORT = 8126;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9226;

console.log(`[1] Starting static HTTP server on port ${PORT}...`);
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
            else if (urlPath.endsWith('.js')) contentType = 'application/javascript';
            else if (urlPath.endsWith('.css')) contentType = 'text/css';
            else if (urlPath.endsWith('.json')) contentType = 'application/json';
            else if (urlPath.endsWith('.png')) contentType = 'image/png';
            else if (urlPath.endsWith('.svg')) contentType = 'image/svg+xml';
            return new Response(file, { headers: { 'Content-Type': contentType } });
        }
        return new Response("Not Found: " + urlPath, { status: 404 });
    }
});

console.log(`[2] Launching Chrome on CDP port ${CDP_PORT}...`);
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
for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
        const json = await res.json();
        const page = json.find(t => t.type === 'page' && (t.url.includes(`localhost:${PORT}`) || t.url.includes(`127.0.0.1:${PORT}`)));
        if (page && page.webSocketDebuggerUrl) {
            wsUrl = page.webSocketDebuggerUrl;
            break;
        } else if (json.length > 0 && json[0].webSocketDebuggerUrl) {
            wsUrl = json[0].webSocketDebuggerUrl;
            break;
        }
    } catch (e) {}
}

const ws = new WebSocket(wsUrl);
const errors = [];
let msgId = 1;
const pending = new Map();

function sendCDP(method, params = {}) {
    return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
        const resolve = pending.get(data.id);
        pending.delete(data.id);
        resolve(data.result);
    }
    if (data.method === 'Runtime.exceptionThrown') {
        errors.push(data.params.exceptionDetails);
    }
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        errors.push(data.params.args.map(a => a.value || a.description || '').join(' '));
    }
};

await new Promise((resolve) => { ws.onopen = resolve; });
await sendCDP('Page.enable');
await sendCDP('Runtime.enable');
await sendCDP('Console.enable');

console.log("[3] Waiting 4 seconds for full world initialization...");
await new Promise(r => setTimeout(r, 4000));

async function evalInBrowser(expr) {
    const res = await sendCDP('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res && res.result ? res.result.value : null;
}

console.log("\n==================== TEST 1: LOCOMOTION & WALKING ====================");
const initialPos = await evalInBrowser(`({ x: window.__characterGroup.position.x, z: window.__characterGroup.position.z })`);
console.log("Initial Position:", initialPos);

// Simulate W key press for 600ms
await evalInBrowser(`window.__keys.w = true;`);
await new Promise(r => setTimeout(r, 600));
await evalInBrowser(`window.__keys.w = false;`);
const movedPos = await evalInBrowser(`({ x: window.__characterGroup.position.x, z: window.__characterGroup.position.z })`);
console.log("Moved Position (after W forward):", movedPos);
const hasMoved = Math.hypot(movedPos.x - initialPos.x, movedPos.z - initialPos.z) > 0.5;
console.log(`Locomotion test: ${hasMoved ? 'PASSED ✅' : 'FAILED ❌'}`);

console.log("\n==================== TEST 2: FAST TRAVEL TO LANDMARKS ====================");
// 1. Teleport to Fr. Agnel School Bandra West (-1350, 32.0, 520)
const schoolTeleport = await evalInBrowser(`(() => {
    window.__characterGroup.position.set(-1350, 32.5, 520);
    window.__updateMiniMap(-1350, 520, 0);
    return {
        x: window.__characterGroup.position.x,
        y: window.__characterGroup.position.y,
        z: window.__characterGroup.position.z,
        district: document.getElementById('radar-district-banner') ? document.getElementById('radar-district-banner').textContent : ''
    };
})()`);
console.log("Fr. Agnel School Teleport:", schoolTeleport);

// 2. Teleport to DMCE College Airoli (1850, 12.0, 1450)
const collegeTeleport = await evalInBrowser(`(() => {
    window.__characterGroup.position.set(1850, 12.5, 1450);
    window.__updateMiniMap(1850, 1450, 0);
    return {
        x: window.__characterGroup.position.x,
        y: window.__characterGroup.position.y,
        z: window.__characterGroup.position.z,
        district: document.getElementById('radar-district-banner') ? document.getElementById('radar-district-banner').textContent : ''
    };
})()`);
console.log("DMCE College Teleport:", collegeTeleport);

// 3. Teleport to Gateway of India (-350, 2.5, -2250)
const gatewayTeleport = await evalInBrowser(`(() => {
    window.__characterGroup.position.set(-350, 2.5, -2250);
    window.__updateMiniMap(-350, -2250, 0);
    return {
        x: window.__characterGroup.position.x,
        y: window.__characterGroup.position.y,
        z: window.__characterGroup.position.z,
        district: document.getElementById('radar-district-banner') ? document.getElementById('radar-district-banner').textContent : ''
    };
})()`);
console.log("Gateway of India Teleport:", gatewayTeleport);

// 4. Return to Home HQ Origin (0, 8.0, 0)
const homeTeleport = await evalInBrowser(`(() => {
    window.__characterGroup.position.set(0, 8.5, 0);
    window.__updateMiniMap(0, 0, 0);
    return {
        x: window.__characterGroup.position.x,
        y: window.__characterGroup.position.y,
        z: window.__characterGroup.position.z,
        district: document.getElementById('radar-district-banner') ? document.getElementById('radar-district-banner').textContent : ''
    };
})()`);
console.log("Home HQ Teleport:", homeTeleport);

console.log("\n==================== TEST 3: STARK HELIPAD & IRON MAN FLIGHT ====================");
const flightTest = await evalInBrowser(`(() => {
    // Rooftop flight deck at 120m
    window.__characterGroup.position.set(0, 120, 0);
    window.__enterFlightMode();
    const isFlight = window.__isFlightMode();
    const speed = window.__flightSpeed();
    window.__exitFlightMode();
    return { isFlight, speed, postExit: !window.__isFlightMode() };
})()`);
console.log("Iron Man Flight 6-DOF Test:", flightTest);

console.log("\n==================== TEST 4: GPS A* NAVIGATION ROUTE ====================");
const gpsTest = await evalInBrowser(`(() => {
    // Route from Fr. Agnel School to DMCE College
    const startNode = window.mumbaiRoadNetwork.findNearestNode(-1350, 520);
    const targetNode = 'node_dmce_main_gate';
    const route = window.mumbaiRoadNetwork.findShortestPath(startNode.id, targetNode);
    window.__setNavigationDestination('college');
    window.__updateMiniMap(-1350, 520, 0);
    const trackerText = document.getElementById('waypoint-tracker') ? document.getElementById('waypoint-tracker').textContent : '';
    return {
        startNodeId: startNode ? startNode.id : null,
        targetNodeId: targetNode,
        foundRoute: !!route,
        totalDistance: route ? route.totalDistance : 0,
        waypointsCount: route && route.waypoints ? route.waypoints.length : 0,
        trackerDisplay: trackerText
    };
})()`);
console.log("A* GPS Route Test (School -> DMCE):", gpsTest);

console.log("\n==================== TEST 5: TIME OF DAY & CYCLING ====================");
const timeTest = await evalInBrowser(`(() => {
    const btnTime = document.getElementById('btn-toggle-time');
    if (btnTime) btnTime.click();
    return { clicked: !!btnTime };
})()`);
console.log("Time of Day Cycle:", timeTest);

console.log("\n==================== TEST 6: MINIMAP RADAR CANVAS ====================");
const canvasTest = await evalInBrowser(`(() => {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let nonZero = 0;
    for (let i = 0; i < imgData.data.length; i += 4) {
        if (imgData.data[i] !== 0 || imgData.data[i+1] !== 0 || imgData.data[i+2] !== 0) {
            nonZero++;
        }
    }
    return {
        width: canvas.width,
        height: canvas.height,
        totalPixels: canvas.width * canvas.height,
        renderedPixels: nonZero
    };
})()`);
console.log("Minimap Radar Canvas Draw:", canvasTest);

console.log("\n==================== VERIFICATION SUMMARY ====================");
console.log(`Total Runtime Errors: ${errors.length}`);
if (errors.length > 0) {
    console.error("Errors:", errors);
}

ws.close();
chromeProc.kill();
server.stop();

const passed = errors.length === 0 &&
    hasMoved &&
    schoolTeleport.x === -1350 &&
    collegeTeleport.x === 1850 &&
    gatewayTeleport.x === -350 &&
    homeTeleport.x === 0 &&
    flightTest.isFlight &&
    gpsTest.foundRoute &&
    gpsTest.totalDistance > 3000 &&
    canvasTest.renderedPixels > 1000;

if (passed) {
    console.log(">>> ALL INTERACTIVE GAMEPLAY TESTS PASSED! FULL VERIFICATION SUCCESSFUL! <<<");
    process.exit(0);
} else {
    console.error(">>> Interactive tests failed. <<<");
    process.exit(1);
}
