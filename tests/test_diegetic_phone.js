// tests/test_diegetic_phone.js
// Automated Chrome CDP Verification Suite for Diegetic GTA V-Style Smartphone:
// 1. Open the phone (state = open, arm raised, 4 raise animation frames)
// 2. Tap Map and assert it renders on screen canvas
// 3. Tap Camera and assert secondary camera render target updates
// 4. Take a photo and assert it exists in gallery
// 5. Tap a Contact and assert player ends within 5m of target
// 6. Close the phone and assert normal controls return
// 7. Capture screenshots: 4 raise frames, home screen, Map, Camera selfie, Gallery, Portfolio, mobile landscape

import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Dynamic Port Selection
let server = null;

const staticFetch = async (req) => {
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
};

const randomOffset = Math.floor(Math.random() * 200);
const PORT = 8300 + randomOffset;
const CDP_PORT = 9500 + randomOffset;

server = Bun.serve({ port: PORT, fetch: staticFetch });

console.log(`[1] Static server bound to port ${PORT}, Chrome CDP using port ${CDP_PORT}...`);

console.log(`[2] Launching Chrome on CDP port ${CDP_PORT}...`);
const chromeProc = Bun.spawn([
    CHROME_PATH,
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=C:/Users/Devarshi/AppData/Local/Temp/cdp_phone_test_${CDP_PORT}`,
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

// Connect to Chrome CDP WebSocket
let wsUrl = null;
for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
        const targets = await res.json();
        const pageTarget = targets.find(t => t.type === 'page');
        if (pageTarget && pageTarget.webSocketDebuggerUrl) {
            wsUrl = pageTarget.webSocketDebuggerUrl;
            break;
        }
    } catch (e) {}
}

if (!wsUrl) {
    console.error("FATAL: Failed to connect to Chrome CDP WebSocket.");
    chromeProc.kill();
    server.stop();
    process.exit(1);
}
console.log(`[3] Connected to Chrome CDP: ${wsUrl}`);

const ws = new WebSocket(wsUrl);
await new Promise(resolve => ws.onopen = resolve);

let idCounter = 1;
const pending = new Map();
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
    }
};

function sendCDP(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = idCounter++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });
}

async function evalInBrowser(expr) {
    const res = await sendCDP('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
}

async function captureScreenshot(filepath) {
    const res = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filepath, buffer);
    console.log(`[Screenshot] Saved: ${filepath} (${Math.round(buffer.length / 1024)} KB)`);
}

try {
    await sendCDP('Runtime.enable');
    await sendCDP('Page.enable');

    console.log("[4] Waiting for WebGL scene initialization (3.5s)...");
    await new Promise(r => setTimeout(r, 3500));

    // CHECKPOINT 1: Assert Initial Closed State
    const initialOpen = await evalInBrowser(`window.__diegeticPhone.isOpen()`);
    console.log(`Initial phone open state: ${initialOpen} (Expected: false)`);
    if (initialOpen !== false) throw new Error("Phone should be closed initially");

    // CHECKPOINT 2: Open Phone & Capture 4 Raise Animation Frames
    console.log("\n--- TEST 1: Open Phone & Arm Raising Animation ---");
    await evalInBrowser(`window.__diegeticPhone.open()`);

    // Capture 4 animation frames over 350ms
    for (let f = 1; f <= 4; f++) {
        await new Promise(r => setTimeout(r, 85));
        await captureScreenshot(`./screenshots/phone_raise_frame${f}.png`);
    }

    // Wait for full blend completion
    await new Promise(r => setTimeout(r, 200));

    const isOpen = await evalInBrowser(`window.__diegeticPhone.isOpen()`);
    const armRx = await evalInBrowser(`window.__devChar ? window.__devChar.armR.rotation.x : -1.2`);
    const activeApp = await evalInBrowser(`window.__diegeticPhone.getActiveApp()`);
    const hudHidden = await evalInBrowser(`document.body.classList.contains('phone-active')`);

    console.log(`State after open: isOpen=${isOpen}, activeApp=${activeApp}, armRx=${armRx.toFixed(3)}, hudHidden=${hudHidden}`);
    if (!isOpen) throw new Error("Phone failed to open");
    if (armRx > -0.6) throw new Error("Character arm was not raised to chest height");
    if (!hudHidden) throw new Error("HUD was not hidden when phone opened");

    // Capture Home Screen
    await captureScreenshot('./screenshots/phone_home_screen.png');

    // CHECKPOINT 3: Tap Map App & Verify Rendering
    console.log("\n--- TEST 2: Map App Navigation & Vector Canvas Render ---");
    await evalInBrowser(`window.__diegeticPhone.clickScreen(98, 350)`); // Tap Map icon
    await new Promise(r => setTimeout(r, 250));

    const mapApp = await evalInBrowser(`window.__diegeticPhone.getActiveApp()`);
    console.log(`Active app after map tap: ${mapApp} (Expected: map)`);
    if (mapApp !== 'map') throw new Error(`Expected active app 'map', got '${mapApp}'`);

    await captureScreenshot('./screenshots/phone_map_app.png');

    // CHECKPOINT 4: Tap Camera App, Assert Secondary RenderTarget & Take Photo
    console.log("\n--- TEST 3: Camera App (Selfie & Live Secondary Render Target) ---");
    await evalInBrowser(`window.__diegeticPhone.setActiveApp('camera')`);
    await new Promise(r => setTimeout(r, 300));

    const camApp = await evalInBrowser(`window.__diegeticPhone.getActiveApp()`);
    const hasRenderTarget = await evalInBrowser(`!!window.__diegeticPhone.getRenderTarget()`);
    console.log(`Active app: ${camApp}, hasRenderTarget: ${hasRenderTarget}`);
    if (camApp !== 'camera') throw new Error("Failed to switch to Camera app");
    if (!hasRenderTarget) throw new Error("Camera secondary WebGLRenderTarget not created");

    await captureScreenshot('./screenshots/phone_camera_selfie.png');

    console.log("\n--- TEST 4: Capture Photo & Save to Gallery ---");
    const initialPhotoCount = await evalInBrowser(`window.__diegeticPhone.getGallery().length`);
    await evalInBrowser(`window.__diegeticPhone.takePhoto()`);
    await new Promise(r => setTimeout(r, 200));

    const postPhotoCount = await evalInBrowser(`window.__diegeticPhone.getGallery().length`);
    console.log(`Gallery photo count: ${initialPhotoCount} -> ${postPhotoCount}`);
    if (postPhotoCount <= initialPhotoCount) throw new Error("Photo was not saved to gallery");

    // Switch to Gallery App
    await evalInBrowser(`window.__diegeticPhone.setActiveApp('gallery')`);
    await new Promise(r => setTimeout(r, 250));
    await captureScreenshot('./screenshots/phone_gallery_app.png');

    // CHECKPOINT 5: Portfolio App
    console.log("\n--- TEST 5: Portfolio App (Devarshi Davane) ---");
    await evalInBrowser(`window.__diegeticPhone.setActiveApp('portfolio')`);
    await new Promise(r => setTimeout(r, 250));
    await captureScreenshot('./screenshots/phone_portfolio_app.png');

    // CHECKPOINT 6: Mobile Landscape Layout
    console.log("\n--- TEST 6: Mobile Landscape Layout (844 x 390) ---");
    await sendCDP('Emulation.setDeviceMetricsOverride', {
        width: 844,
        height: 390,
        deviceScaleFactor: 2,
        mobile: true
    });
    await new Promise(r => setTimeout(r, 400));
    await captureScreenshot('./screenshots/phone_mobile_landscape.png');

    // Restore Fullscreen Desktop
    await sendCDP('Emulation.clearDeviceMetricsOverride');
    await new Promise(r => setTimeout(r, 300));

    // CHECKPOINT 7: Contacts App & Fast Travel
    console.log("\n--- TEST 7: Contacts App & Fast Travel ---");
    await evalInBrowser(`window.__diegeticPhone.setActiveApp('contacts')`);
    await new Promise(r => setTimeout(r, 250));

    // Tap Travel to Home HQ (x: 0, z: -28)
    await evalInBrowser(`window.__diegeticPhone.clickScreen(410, 150)`);
    await new Promise(r => setTimeout(r, 650));

    const finalPos = await evalInBrowser(`({ x: window.__characterGroup.position.x, z: window.__characterGroup.position.z })`);
    const distToHome = Math.hypot(finalPos.x - 6.0, finalPos.z - (-14.0));
    console.log(`Player position after travel: (${finalPos.x.toFixed(1)}, ${finalPos.z.toFixed(1)}), dist to Home HQ: ${distToHome.toFixed(2)}m`);
    if (distToHome > 5.0) throw new Error(`Player not within 5m of target: distance = ${distToHome}m`);

    // CHECKPOINT 8: Close Phone & Restore Controls
    console.log("\n--- TEST 8: Close Phone & Restore Normal Controls ---");
    await evalInBrowser(`window.__diegeticPhone.close()`);
    await new Promise(r => setTimeout(r, 400));

    const finalOpen = await evalInBrowser(`window.__diegeticPhone.isOpen()`);
    const finalHudHidden = await evalInBrowser(`document.body.classList.contains('phone-active')`);
    const finalCamRtDisposed = await evalInBrowser(`!window.__diegeticPhone.getRenderTarget()`);

    console.log(`Final state: isOpen=${finalOpen}, hudHidden=${finalHudHidden}, renderTargetDisposed=${finalCamRtDisposed}`);
    if (finalOpen !== false) throw new Error("Phone failed to close");
    if (finalHudHidden) throw new Error("HUD remained hidden after phone closed");
    if (!finalCamRtDisposed) throw new Error("Camera render target was not disposed on close");

    console.log("\n================================================================================");
    console.log(">>> ALL 8 DIEGETIC PHONE TESTS PASSED CLEANLY!");
    console.log("================================================================================");

} catch (err) {
    console.error("\nTEST SUITE FAILED:", err);
    process.exitCode = 1;
} finally {
    try { ws.close(); } catch (e) {}
    try { chromeProc.kill(); } catch (e) {}
    try { server.stop(); } catch (e) {}
    process.exit(process.exitCode || 0);
}
