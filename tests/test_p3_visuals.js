// tests/test_p3_visuals.js
// Automated Visual Verification Suite for P3: Hero 3D Assets
// Captures high-res screenshots of:
// 1. Upgraded Player Character Model (Front & 3/4 Perspective)
// 2. 12 Mumbai NPC Archetypes with Cultural Accessories
// 3. Fr. Agnel Technical High School (Terraced Red Brick & Yellow Louvers)
// 4. Datta Meghe College of Engineering (DMCE Airoli Academic Facade & Steps)

import fs from 'fs';
import path from 'path';

const PORT = 8189;
const CDP_PORT = 9289;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOT_DIR = path.resolve("./screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

console.log("================================================================================");
console.log(">>> STARTING P3 HERO 3D ASSETS VISUAL VERIFICATION SUITE");
console.log("================================================================================");

// 1. Static HTTP Server
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
            else if (urlPath.endsWith('.jpg') || urlPath.endsWith('.jpeg')) contentType = 'image/jpeg';
            else if (urlPath.endsWith('.svg')) contentType = 'image/svg+xml';
            else if (urlPath.endsWith('.glb')) contentType = 'model/gltf-binary';
            return new Response(file, { headers: { 'Content-Type': contentType } });
        }
        return new Response("Not Found: " + urlPath, { status: 404 });
    }
});
console.log(`[1] Static server running at http://127.0.0.1:${PORT}/index.html`);

// 2. Spawn Chrome
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

async function cleanup() {
    try { chromeProc.kill(); } catch (e) {}
    try { server.stop(); } catch (e) {}
}

process.on('SIGINT', async () => { await cleanup(); process.exit(1); });
process.on('exit', async () => { await cleanup(); });

// 3. Connect to CDP
let wsUrl = null;
for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
        const data = await res.json();
        const page = Array.isArray(data) ? data.find(t => t.type === 'page' && t.url.includes(`${PORT}`)) : null;
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
    console.error("FAIL: Could not connect to Chrome CDP endpoint.");
    await cleanup();
    process.exit(1);
}

const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
});

let msgId = 1;
function sendCDP(method, params = {}) {
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

await sendCDP('Runtime.enable');
await sendCDP('Page.enable');

console.log("[2] Waiting 4.0s for world simulation & 3D textures warmup...");
await new Promise(r => setTimeout(r, 4000));

async function captureScreenshot(filename) {
    const res = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`[Screenshot] Saved: ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

// ----------------------------------------------------------------------------
// 1. Player Character Frontal View
// ----------------------------------------------------------------------------
console.log("\n--- CAPTURING PLAYER CHARACTER MODEL (FRONT VIEW) ---");
await sendCDP('Runtime.evaluate', {
    expression: `(() => {
        if (window.__camera && window.__characterGroup) {
            const p = window.__characterGroup.position;
            window.__camera.position.set(p.x, p.y + 1.25, p.z + 2.5);
            window.__camera.lookAt(p.x, p.y + 1.15, p.z);
        }
    })()`
});
await new Promise(r => setTimeout(r, 500));
await captureScreenshot('p3_player_avatar_front.png');

// ----------------------------------------------------------------------------
// 2. Player Character 3/4 Perspective (Flannel, Chain, Chinos, Sneakers, Watch)
// ----------------------------------------------------------------------------
console.log("\n--- CAPTURING PLAYER CHARACTER MODEL (3/4 PERSPECTIVE) ---");
await sendCDP('Runtime.evaluate', {
    expression: `(() => {
        if (window.__camera && window.__characterGroup) {
            const p = window.__characterGroup.position;
            window.__camera.position.set(p.x + 1.8, p.y + 1.35, p.z + 2.2);
            window.__camera.lookAt(p.x, p.y + 1.05, p.z);
        }
    })()`
});
await new Promise(r => setTimeout(r, 500));
await captureScreenshot('p3_player_avatar_three_quarter.png');

// ----------------------------------------------------------------------------
// 3. Mumbai NPC Archetypes Crowd
// ----------------------------------------------------------------------------
console.log("\n--- CAPTURING MUMBAI NPC ARCHETYPES ---");
await sendCDP('Runtime.evaluate', {
    expression: `(() => {
        if (window.__camera) {
            window.__camera.position.set(-20, 2.2, -10);
            window.__camera.lookAt(-20, 1.2, -2);
        }
    })()`
});
await new Promise(r => setTimeout(r, 600));
await captureScreenshot('p3_mumbai_npc_crowd.png');

// ----------------------------------------------------------------------------
// 4. Fr. Agnel Technical High School (Bandra West)
// ----------------------------------------------------------------------------
console.log("\n--- CAPTURING FR. AGNEL TECHNICAL HIGH SCHOOL (BANDRA WEST) ---");
await sendCDP('Runtime.evaluate', {
    expression: `(() => {
        if (window.__camera) {
            // Position in front of Fr. Agnel main block looking at facade and brise-soleil
            window.__camera.position.set(-1350, 42.0, 480);
            window.__camera.lookAt(-1350, 44.0, 520);
        }
    })()`
});
await new Promise(r => setTimeout(r, 800));
await captureScreenshot('p3_school_fr_agnel.png');

// ----------------------------------------------------------------------------
// 5. Datta Meghe College of Engineering (DMCE Airoli)
// ----------------------------------------------------------------------------
console.log("\n--- CAPTURING DATTA MEGHE COLLEGE OF ENGINEERING (DMCE AIROLI) ---");
await sendCDP('Runtime.evaluate', {
    expression: `(() => {
        if (window.__camera) {
            // Position in front of DMCE academic main block looking at entrance steps & atrium
            window.__camera.position.set(1850, 22.0, 1495);
            window.__camera.lookAt(1850, 20.0, 1450);
        }
    })()`
});
await new Promise(r => setTimeout(r, 800));
await captureScreenshot('p3_college_dmce.png');

console.log("\n================================================================================");
console.log(">>> ALL P3 VISUAL ARTIFACTS CAPTURED SUCCESSFULLY!");
console.log("================================================================================");

await cleanup();
process.exit(0);
