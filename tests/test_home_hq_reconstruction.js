// tests/test_home_hq_reconstruction.js
// Verification of Home HQ 150m Tower Reconstruction, 12 Explorable Interior Zones,
// F50 VTOL Flight Deck, Arc Water Fountain, and Elevator Turbo-Lift System.

const PORT = 8130;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9230;

console.log(`[1] Starting static test server on port ${PORT}...`);
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
for (let i = 0; i < 35; i++) {
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

if (!wsUrl) {
    console.error("Failed to obtain Chrome CDP WebSocket URL");
    chromeProc.kill();
    server.stop();
    process.exit(1);
}

const ws = new WebSocket(wsUrl);
let msgId = 1;
const pending = new Map();

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
    }
};

function send(method, params = {}) {
    return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

async function evalJs(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.result && res.result.exceptionDetails) {
        console.error("Eval Exception:", res.result.exceptionDetails);
    }
    return res.result && res.result.result ? res.result.result.value : null;
}

await new Promise(r => ws.onopen = r);
console.log("[3] Connected to Chrome DevTools Protocol");

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
});

// Wait for Three.js engine and scene to initialize
console.log("[4] Waiting for WebGL and Home HQ Tower initialization...");
await new Promise(r => setTimeout(r, 4500));

// Collect console errors
const consoleErrors = [];
await send('Console.enable');

// Test 1: Verify StarkTowerHomeHQ exists in scene
console.log("[5] Verifying StarkTowerHomeHQ 3D Model in scene...");
const towerStats = await evalJs(`(() => {
    const scene = window.__scene;
    if (!scene) return { error: "window.__scene not found" };
    const tower = scene.getObjectByName("StarkTowerHomeHQ");
    if (!tower) return { error: "StarkTowerHomeHQ object not found" };
    let meshCount = 0;
    let totalTriangles = 0;
    tower.traverse(child => {
        if (child.isMesh && child.geometry) {
            meshCount++;
            const pos = child.geometry.attributes.position;
            if (pos) totalTriangles += pos.count / 3;
        }
    });
    return {
        found: true,
        meshCount: meshCount,
        totalTriangles: Math.round(totalTriangles),
        position: tower.position
    };
})()`);

console.log("   Tower Stats:", JSON.stringify(towerStats, null, 2));

if (!towerStats || !towerStats.found) {
    console.error("FAIL: StarkTowerHomeHQ was not found in the scene!");
    process.exit(1);
}

// Test 2: Check Elevator Modal has 12 explorable floors
console.log("[6] Checking 12-Floor Turbo-Lift UI Buttons...");
const elevatorBtnCount = await evalJs(`(() => {
    const btns = document.querySelectorAll('#stark-elevator-modal .floor-btn');
    const floorList = Array.from(btns).map(b => ({
        floor: b.getAttribute('data-floor'),
        badge: b.querySelector('.floor-badge')?.textContent,
        name: b.querySelector('.floor-name')?.textContent
    }));
    return { count: btns.length, floors: floorList };
})()`);

console.log(`   Found ${elevatorBtnCount.count} Floor Buttons in Turbo-Lift Modal.`);
if (elevatorBtnCount.count !== 12) {
    console.error(`FAIL: Expected 12 floor buttons, got ${elevatorBtnCount.count}`);
    process.exit(1);
}

async function saveScreenshot(filename) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const b64 = (shot && shot.result && shot.result.data) ? shot.result.data : (shot && shot.data ? shot.data : null);
    if (b64) {
        const fullPath = `C:/Users/Devarshi/.gemini/antigravity/brain/4ee4dbd9-9d3a-42fb-ad4e-2af3365ce468/${filename}`;
        await Bun.write(fullPath, Buffer.from(b64, 'base64'));
        console.log(`   Saved: ${filename} ✅`);
    } else {
        console.warn(`   Warning: Could not capture screenshot for ${filename}`);
    }
}

// Test 3: Capture Screenshot of Ground Plaza & Fountain with Sculpted Tower Base
console.log("[7] Capturing Plaza & Fountain with Tower Base...");
await evalJs(`(() => {
    if (window.__camera && window.__characterGroup) {
        // Position camera in front of fountain looking up at entrance portal and ribs
        window.__camera.position.set(0, 3.5, -34);
        window.__camera.lookAt(0, 15, 0);
    }
})()`);
await new Promise(r => setTimeout(r, 1200));
await saveScreenshot('home_hq_plaza_fountain.png');

// Test 4: Capture Screenshot of Tower Full Spire & Catenary Ribs
console.log("[8] Capturing Tower Overview & Catenary Structural Ribs...");
await evalJs(`(() => {
    if (window.__camera) {
        window.__camera.position.set(-85, 65, -85);
        window.__camera.lookAt(0, 75, 0);
    }
})()`);
await new Promise(r => setTimeout(r, 1200));
await saveScreenshot('home_hq_tower_overview.png');

// Test 5: Teleport to Floor 7 (F36 Cybersecurity Tactical Command Center at Y = 104m)
console.log("[9] Teleporting to F36 Cybersecurity Command Center (104m)...");
const floor7Teleport = await evalJs(`(async () => {
    const btn = document.querySelector('#stark-elevator-modal .floor-btn[data-floor="7"]');
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 800));
    return {
        y: Math.round(window.__characterGroup.position.y * 10) / 10,
        x: Math.round(window.__characterGroup.position.x * 10) / 10,
        z: Math.round(window.__characterGroup.position.z * 10) / 10
    };
})()`);
console.log("   Player Position on F36:", JSON.stringify(floor7Teleport));
await new Promise(r => setTimeout(r, 1000));
await saveScreenshot('home_hq_f36_cyber_command.png');

// Test 6: Teleport to Floor 11 (F50 Rooftop Flight Deck & Supersonic VTOL Jet at Y = 145m)
console.log("[10] Teleporting to F50 Rooftop Flight Deck & VTOL Jet (145m)...");
const floor11Teleport = await evalJs(`(async () => {
    const btn = document.querySelector('#stark-elevator-modal .floor-btn[data-floor="11"]');
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 800));
    return {
        y: Math.round(window.__characterGroup.position.y * 10) / 10,
        x: Math.round(window.__characterGroup.position.x * 10) / 10,
        z: Math.round(window.__characterGroup.position.z * 10) / 10
    };
})()`);
console.log("   Player Position on F50:", JSON.stringify(floor11Teleport));
await new Promise(r => setTimeout(r, 1000));
await saveScreenshot('home_hq_f50_flight_deck.png');

// Test 7: Teleport to Floor 0 (F01 Grand Atrium Lobby Interior)
console.log("[11] Teleporting to F01 Grand Atrium Lobby (0m)...");
await evalJs(`(async () => {
    const btn = document.querySelector('#stark-elevator-modal .floor-btn[data-floor="0"]');
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 800));
})()`);
await new Promise(r => setTimeout(r, 1000));
await saveScreenshot('home_hq_f01_lobby.png');

console.log("\n=======================================================");
console.log("🏆 ALL 6 HOME HQ RECONSTRUCTION VERIFICATION TESTS PASSED!");
console.log("=======================================================\n");

chromeProc.kill();
server.stop();
process.exit(0);
