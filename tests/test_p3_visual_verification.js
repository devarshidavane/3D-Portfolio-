// tests/test_p3_visual_verification.js
// Dedicated P3 Visual Verification & Headless Chrome CDP Test Suite
// Requirements:
// 1. High-resolution screenshots (1920x1080):
//    - Player character (front view) with flannel, necklace, chinos, sneakers, smartwatch.
//    - Player character (3/4 perspective view).
//    - Mumbai NPC archetypes in crowd.
//    - Fr. Agnel Technical High School in Bandra West.
//    - Datta Meghe College of Engineering (DMCE) in Airoli.
// 2. Metrics & Performance Assertions:
//    - Draw calls <= 150
//    - Triangles <= 1,500,000
//    - 60 FPS performance / HUD badge verification
//    - Zero console errors and zero runtime exceptions

import { Buffer } from "node:buffer";
import * as path from "node:path";
import * as fs from "node:fs";

const PORT = 8152;
const CDP_PORT = 9252;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOT_DIR = path.resolve("./screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

console.log("================================================================================");
console.log(">>> STARTING P3 VISUAL VERIFICATION & CDP AUTOMATED SUITE");
console.log("================================================================================");

// 1. Static HTTP Server
let server = null;
let targetUrl = `http://127.0.0.1:${PORT}/index.html`;

try {
    const probe = await fetch(`http://127.0.0.1:8080/index.html`, { method: 'HEAD', signal: AbortSignal.timeout(1000) });
    if (probe.ok || probe.status === 200 || probe.status === 304) {
        targetUrl = `http://127.0.0.1:8080/index.html`;
        console.log(`[1] Connected to running test server at ${targetUrl}`);
    } else {
        throw new Error(`Status ${probe.status}`);
    }
} catch (e) {
    console.log(`[1] Starting dedicated static server on port ${PORT}...`);
    server = Bun.serve({
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
                else if (urlPath.endsWith('.jpg') || urlPath.endsWith('.jpeg')) contentType = 'image/jpeg';
                else if (urlPath.endsWith('.svg')) contentType = 'image/svg+xml';
                else if (urlPath.endsWith('.glb')) contentType = 'model/gltf-binary';
                else if (urlPath.endsWith('.woff2')) contentType = 'font/woff2';
                else if (urlPath.endsWith('.ico')) contentType = 'image/x-icon';
                return new Response(file, { headers: { 'Content-Type': contentType } });
            }
            return new Response("Not Found: " + urlPath, { status: 404 });
        }
    });
    targetUrl = `http://127.0.0.1:${PORT}/index.html`;
    console.log(`Static server running at ${targetUrl}`);
}

// 2. Launch Headless Chrome
console.log(`[2] Launching Headless Chrome (1920x1080) on CDP port ${CDP_PORT}...`);
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
    'about:blank'
], {
    stdout: 'ignore',
    stderr: 'ignore'
});

async function cleanup() {
    try { chromeProc.kill(); } catch (e) {}
    if (server) {
        try { server.stop(); } catch (e) {}
    }
}

process.on('SIGINT', async () => { await cleanup(); process.exit(1); });
process.on('exit', async () => { await cleanup(); });

// 3. Connect to Chrome CDP WebSocket
let wsUrl = null;
for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
        const data = await res.json();
        const page = Array.isArray(data) ? data.find(t => t.type === 'page') : null;
        if (page && page.webSocketDebuggerUrl) {
            wsUrl = page.webSocketDebuggerUrl;
            break;
        }
    } catch (e) {}
}

if (!wsUrl) {
    console.error("FATAL: Failed to connect to Chrome CDP endpoint.");
    await cleanup();
    process.exit(1);
}

const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
});

let msgId = 1;
const pending = new Map();
const consoleErrors = [];
const runtimeExceptions = [];

function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.addEventListener('message', (event) => {
    try {
        const data = JSON.parse(event.data);
        if (data.id && pending.has(data.id)) {
            const { resolve, reject } = pending.get(data.id);
            pending.delete(data.id);
            if (data.error) reject(data.error);
            else resolve(data.result);
        }
        if (data.method === 'Runtime.consoleAPICalled') {
            const text = data.params.args.map(a => a.value || a.description || '').join(' ');
            if (data.params.type === 'error') {
                consoleErrors.push(text);
                console.error("[Browser Console Error]", text);
            }
        }
        if (data.method === 'Runtime.exceptionThrown') {
            const desc = data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text || 'Exception';
            runtimeExceptions.push(desc);
            console.error("[Browser Runtime Exception]", desc);
        }
    } catch (e) {}
});

await sendCommand('Runtime.enable');
await sendCommand('Page.enable');
await sendCommand('Network.enable');

console.log(`[3] Navigating to ${targetUrl}...`);
await sendCommand('Page.navigate', { url: targetUrl });

console.log("[4] Waiting 4.5s for 3D world warmup & procedural geometry generation...");
await new Promise(r => setTimeout(r, 4500));

// 4. Measure Performance & WebGL rendering pipeline metrics
console.log("[5] Evaluating WebGL render metrics and FPS badge...");

const metricsEval = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
        const renderer = window.__renderer || window.renderer;
        if (!renderer) return { error: "Renderer not found" };

        if (typeof window.updatePerformanceHUD === 'function') {
            window.updatePerformanceHUD();
        }

        const badge = document.getElementById('fps-badge');
        const badgeText = badge ? (badge.innerText || badge.textContent || '').trim() : '';

        return {
            calls: renderer.info ? renderer.info.render.calls : 0,
            triangles: renderer.info ? renderer.info.render.triangles : 0,
            geometries: renderer.info ? renderer.info.memory.geometries : 0,
            textures: renderer.info ? renderer.info.memory.textures : 0,
            badgeText: badgeText,
            hasFPS: /fps/i.test(badgeText),
            hasCalls: /call/i.test(badgeText),
            hasTris: /tri/i.test(badgeText)
        };
    })()`,
    returnByValue: true
});

const perfMetrics = metricsEval?.result?.value;
console.log("Performance Metrics:", perfMetrics);

async function captureSceneShot(fileName, setupCode) {
    console.log(`\n--- Capturing ${fileName} ---`);
    await sendCommand('Runtime.evaluate', {
        expression: `(() => {
            ${setupCode}
            const renderer = window.__renderer || window.renderer;
            const scene = window.__scene;
            const camera = window.__camera;
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        })()`,
        returnByValue: true
    });

    await new Promise(r => setTimeout(r, 600));

    const shotResult = await sendCommand('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
    });

    if (shotResult?.data) {
        const filePath = path.join(SCREENSHOT_DIR, fileName);
        const buf = Buffer.from(shotResult.data, 'base64');
        fs.writeFileSync(filePath, buf);
        const sizeKb = Math.round(buf.length / 1024);
        console.log(`[PASS] Saved ${fileName} (${sizeKb} KB)`);
        return { success: true, sizeKb, path: filePath };
    } else {
        console.error(`[FAIL] Could not capture screenshot for ${fileName}`);
        return { success: false, sizeKb: 0 };
    }
}

// 5. Screenshot A: Player Character Front View
// Front view: facing +Z from z = -25.6 looking back at -28
const shotA = await captureSceneShot('p3_player_front.png', `
    const cam = window.__camera;
    const char = window.__characterGroup;
    if (cam && char) {
        cam.position.set(char.position.x, char.position.y + 1.25, char.position.z + 2.3);
        cam.lookAt(char.position.x, char.position.y + 1.22, char.position.z);
    }
`);

// 6. Screenshot B: Player Character 3/4 Perspective View
// Front-left perspective showing smartwatch on left wrist, silver chain necklace, flannel pattern, khaki chinos, sneakers
const shotB = await captureSceneShot('p3_player_three_quarter.png', `
    const cam = window.__camera;
    const char = window.__characterGroup;
    if (cam && char) {
        cam.position.set(char.position.x - 1.5, char.position.y + 1.35, char.position.z + 1.9);
        cam.lookAt(char.position.x, char.position.y + 1.15, char.position.z);
    }
`);

// 7. Screenshot C: Mumbai NPC Archetypes Crowd
// Frame the Gateway Waterfront Promenade or Midtown Plaza where diverse archetypes walk
const shotC = await captureSceneShot('p3_npc_archetypes.png', `
    const cam = window.__camera;
    if (cam) {
        cam.position.set(4.0, 2.5, -15.0);
        cam.lookAt(0, 1.2, -5.0);
    }
`);

// 8. Screenshot D: Fr. Agnel Technical High School Bandra West
const shotD = await captureSceneShot('p3_fr_agnel_school.png', `
    const cam = window.__camera;
    const char = window.__characterGroup;
    const poi = window.__poiSchool || { x: -1350, y: 32, z: 520 };
    if (char) {
        char.position.set(poi.x, poi.y + 1.0, poi.z + 45);
    }
    if (cam) {
        cam.position.set(poi.x - 18, poi.y + 16, poi.z + 55);
        cam.lookAt(poi.x, poi.y + 12, poi.z);
    }
`);

// 9. Screenshot E: Datta Meghe College of Engineering (DMCE) Airoli
const shotE = await captureSceneShot('p3_dmce_college.png', `
    const cam = window.__camera;
    const char = window.__characterGroup;
    const poi = window.__poiCollege || { x: 1850, y: 12, z: 1450 };
    if (char) {
        char.position.set(poi.x, poi.y + 1.0, poi.z + 55);
    }
    if (cam) {
        cam.position.set(poi.x - 22, poi.y + 18, poi.z + 58);
        cam.lookAt(poi.x, poi.y + 12, poi.z - 4);
    }
`);

console.log("\n================================================================================");
console.log(">>> VERIFICATION SUMMARY & ASSERTIONS");
console.log("================================================================================");

const assertions = [
    {
        name: "Draw Calls <= 150",
        actual: perfMetrics?.calls,
        passed: typeof perfMetrics?.calls === 'number' && perfMetrics.calls <= 150
    },
    {
        name: "Triangles <= 1,500,000",
        actual: perfMetrics?.triangles,
        passed: typeof perfMetrics?.triangles === 'number' && perfMetrics.triangles <= 1500000
    },
    {
        name: "FPS Telemetry Badge Active",
        actual: perfMetrics?.badgeText,
        passed: perfMetrics?.hasFPS && perfMetrics?.hasCalls && perfMetrics?.hasTris
    },
    {
        name: "Zero Console Errors",
        actual: consoleErrors.length,
        passed: consoleErrors.length === 0
    },
    {
        name: "Zero Runtime Exceptions",
        actual: runtimeExceptions.length,
        passed: runtimeExceptions.length === 0
    },
    {
        name: "Screenshot: Player Front View (p3_player_front.png)",
        actual: `${shotA.sizeKb} KB`,
        passed: shotA.success && shotA.sizeKb > 50
    },
    {
        name: "Screenshot: Player 3/4 View (p3_player_three_quarter.png)",
        actual: `${shotB.sizeKb} KB`,
        passed: shotB.success && shotB.sizeKb > 50
    },
    {
        name: "Screenshot: NPC Archetypes (p3_npc_archetypes.png)",
        actual: `${shotC.sizeKb} KB`,
        passed: shotC.success && shotC.sizeKb > 50
    },
    {
        name: "Screenshot: Fr. Agnel School (p3_fr_agnel_school.png)",
        actual: `${shotD.sizeKb} KB`,
        passed: shotD.success && shotD.sizeKb > 50
    },
    {
        name: "Screenshot: DMCE College (p3_dmce_college.png)",
        actual: `${shotE.sizeKb} KB`,
        passed: shotE.success && shotE.sizeKb > 50
    }
];

let allPassed = true;
for (const a of assertions) {
    const status = a.passed ? "PASS [OK]" : "FAIL [X]";
    if (!a.passed) allPassed = false;
    console.log(`- ${a.name.padEnd(58)} : ${status} (Actual: ${JSON.stringify(a.actual)})`);
}

await cleanup();

if (allPassed) {
    console.log("\n================================================================================");
    console.log(">>> ALL P3 VISUAL VERIFICATION & PERFORMANCE ASSERTIONS PASSED! <<<");
    console.log("================================================================================");
    process.exit(0);
} else {
    console.error("\n================================================================================");
    console.error(">>> SOME P3 ASSERTIONS FAILED <<<");
    console.error("================================================================================");
    process.exit(1);
}
