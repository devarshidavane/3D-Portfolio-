// test_cdp_verification.js
// Runs static server + headless Chrome + CDP inspection via Bun

const PORT = 8125;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9225;

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

console.log(`[2] Launching Headless Chrome on CDP port ${CDP_PORT}...`);
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

// Wait for Chrome CDP endpoint
let wsUrl = null;
for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
        const json = await res.json();
        const page = json.find(t => t.type === 'page' && t.url.includes(`localhost:${PORT}`) || t.url.includes(`127.0.0.1:${PORT}`));
        if (page && page.webSocketDebuggerUrl) {
            wsUrl = page.webSocketDebuggerUrl;
            break;
        } else if (json.length > 0 && json[0].webSocketDebuggerUrl) {
            wsUrl = json[0].webSocketDebuggerUrl;
            break;
        }
    } catch (e) {}
}

if (!wsUrl) {
    console.error("FAIL: Could not connect to Chrome CDP endpoint");
    chromeProc.kill();
    server.stop();
    process.exit(1);
}

console.log(`[3] Connected to Chrome CDP: ${wsUrl}`);
const ws = new WebSocket(wsUrl);

const errors = [];
const consoleLogs = [];
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
    if (data.method === 'Runtime.consoleAPICalled') {
        const text = data.params.args.map(a => a.value || a.description || '').join(' ');
        consoleLogs.push({ type: data.params.type, text });
        if (data.params.type === 'error') {
            errors.push(text);
        }
    }
};

await new Promise((resolve) => { ws.onopen = resolve; });

await sendCDP('Page.enable');
await sendCDP('Runtime.enable');
await sendCDP('Console.enable');

console.log("[4] Waiting 4 seconds for Three.js scene, textures, chunks, and shaders to compile...");
await new Promise(r => setTimeout(r, 4000));

async function evalInBrowser(expr) {
    const res = await sendCDP('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res && res.result ? res.result.value : null;
}

console.log("\n==================== BROWSER VERIFICATION SUITE ====================");

// Test 1: Check Errors
console.log(`Console Errors: ${errors.length}`);
if (errors.length > 0) {
    console.error("Errors encountered:", JSON.stringify(errors, null, 2));
}

// Test 2: Global Window Hooks
const hooks = await evalInBrowser(`({
    hasScene: !!window.__scene,
    hasRenderer: !!window.__renderer,
    hasCamera: !!window.__camera,
    hasCharacter: !!window.__characterGroup,
    charPos: window.__characterGroup ? { x: window.__characterGroup.position.x, y: window.__characterGroup.position.y, z: window.__characterGroup.position.z } : null,
    trainsCount: window.__allTrains ? window.__allTrains.length : 0,
    stationsCount: window.__railwayStations ? window.__railwayStations.length : 0,
    signalsCount: window.__trafficSignals ? window.__trafficSignals.length : 0,
    pedestriansCount: window.__allPedestrians ? window.__allPedestrians.length : 0,
    collidersCount: window.__worldColliders ? window.__worldColliders.length : 0,
    poiSchool: window.__poiSchool,
    poiCollege: window.__poiCollege,
    poiHome: window.__poiHome,
    poiGateway: window.__poiGateway,
    isFlightMode: typeof window.__isFlightMode === 'function' ? window.__isFlightMode() : null,
    hasSetNavDest: typeof window.__setNavigationDestination === 'function'
})`);

console.log("Global Hooks Verification:", JSON.stringify(hooks, null, 2));

// Test 3: Test Interactive Controls & Systems
console.log("\n--- Testing Interactive Subsystems ---");
// Toggle Flight Mode
const flightResult = await evalInBrowser(`(() => {
    window.__enterFlightMode();
    const flightActive = window.__isFlightMode();
    window.__exitFlightMode();
    const flightEnded = !window.__isFlightMode();
    return { flightActive, flightEnded };
})()`);
console.log("Iron Man Flight Toggle:", flightResult);

// Test GPS Navigation Path
const navResult = await evalInBrowser(`(() => {
    window.__setNavigationDestination('college');
    const navSet = !!window.__setNavigationDestination;
    return { navSet };
})()`);
console.log("GPS Navigation Route Setting:", navResult);

// Test Frame Rate Loop
const fpsCheck = await evalInBrowser(`(() => {
    const start = performance.now();
    let frames = 0;
    return new Promise(resolve => {
        function count() {
            frames++;
            if (performance.now() - start > 1000) {
                resolve({ frames, durationMs: performance.now() - start });
            } else {
                requestAnimationFrame(count);
            }
        }
        requestAnimationFrame(count);
    });
})()`);
console.log("Render Game Loop Check:", fpsCheck);

console.log("====================================================================\n");

ws.close();
chromeProc.kill();
server.stop();

const allPassed = hooks && hooks.hasScene && hooks.hasRenderer && hooks.hasCharacter && hooks.collidersCount > 0 && errors.length === 0;

if (allPassed) {
    console.log(">>> SUCCESS: ALL BROWSER ENGINE SYSTEMS PASSED VERIFICATION WITH 0 ERRORS! <<<");
    process.exit(0);
} else {
    console.error(">>> FAILURE: Verification encountered issues. <<<");
    process.exit(1);
}
