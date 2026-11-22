// tests/test_mobile_hud_suite.js
// Verification suite for Mobile Platform & HUD tasks:
// 1. PWA meta tags & manifest link
// 2. Portrait orientation overlay screen (visible in portrait, hidden in landscape)
// 3. Safe-area insets applied to HUD
// 4. Mobile circular radar (~90px) top-left with HP/Armor bars underneath
// 5. Top-right bar with compact PAUSE, PHONE, and SETTINGS buttons
// 6. Driving speedometer compact bottom-center-left
// 7. Desktop keyboard hints cleaned up on touch
// 8. Mobile Settings > Controls sheet & LocalStorage persistence

const PORT = 8136;
const CDP_PORT = 9236;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

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
            else if (urlPath.endsWith('.js') || urlPath.endsWith('.mjs')) contentType = 'application/javascript';
            else if (urlPath.endsWith('.css')) contentType = 'text/css';
            else if (urlPath.endsWith('.json')) contentType = 'application/json';
            else if (urlPath.endsWith('.png')) contentType = 'image/png';
            else if (urlPath.endsWith('.svg')) contentType = 'image/svg+xml';
            else if (urlPath.endsWith('.glb')) contentType = 'model/gltf-binary';
            else if (urlPath.endsWith('.woff2')) contentType = 'font/woff2';
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
    '--window-size=844,390', // iPhone Notch landscape
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

await new Promise(r => ws.onopen = r);
await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

// Set mobile landscape emulation (844 x 390)
await send("Emulation.setDeviceMetricsOverride", {
    width: 844,
    height: 390,
    deviceScaleFactor: 3,
    mobile: true,
    screenOrientation: { angle: 90, type: "landscapePrimary" }
});

// Wait for engine and DOM to initialize
await new Promise(r => setTimeout(r, 4500));

const results = [];

// TEST 1: PWA Meta Tags & Manifest Link
console.log("\n==================== TEST 1: PWA META TAGS & MANIFEST ====================");
const pwaRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const vp = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
        const appleMobile = document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.getAttribute('content');
        const mobileWeb = document.querySelector('meta[name="mobile-web-app-capable"]')?.getAttribute('content');
        const manifest = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
        return {
            hasViewportCover: vp.includes('viewport-fit=cover') && vp.includes('user-scalable=no'),
            appleMobile: appleMobile === 'yes',
            mobileWeb: mobileWeb === 'yes',
            manifestValid: manifest === './manifest.json'
        };
    })()`,
    returnByValue: true
});
const pwaData = pwaRes.result?.result?.value;
console.log("PWA Meta Data:", pwaData);
results.push({
    test: "1. PWA Meta Tags & Manifest Link",
    pass: !!(pwaData?.hasViewportCover && pwaData?.appleMobile && pwaData?.mobileWeb && pwaData?.manifestValid)
});

// TEST 2: Portrait Orientation Overlay in Landscape
console.log("\n==================== TEST 2: PORTRAIT OVERLAY ====================");
const landscapeOverlayRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const el = document.getElementById('rotate-device-screen');
        const comp = el ? window.getComputedStyle(el) : null;
        return {
            present: !!el,
            display: comp ? comp.display : null,
            hiddenInLandscape: comp ? comp.display === 'none' : false,
            textContainsNotice: el ? el.textContent.includes('PLEASE ROTATE YOUR DEVICE TO LANDSCAPE FOR MUMBAI 3D') : false
        };
    })()`,
    returnByValue: true
});
console.log("Overlay in Landscape:", landscapeOverlayRes.result?.result?.value);

// Emulate portrait (390 x 844)
await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
    screenOrientation: { angle: 0, type: "portraitPrimary" }
});
await new Promise(r => setTimeout(r, 600));

const portraitOverlayRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const el = document.getElementById('rotate-device-screen');
        const comp = el ? window.getComputedStyle(el) : null;
        return {
            display: comp ? comp.display : null,
            visibleInPortrait: comp ? comp.display === 'flex' : false
        };
    })()`,
    returnByValue: true
});
console.log("Overlay in Portrait:", portraitOverlayRes.result?.result?.value);
results.push({
    test: "2. Portrait Orientation Screen (Hidden in landscape, visible in portrait)",
    pass: !!(landscapeOverlayRes.result?.result?.value?.hiddenInLandscape &&
             landscapeOverlayRes.result?.result?.value?.textContainsNotice &&
             portraitOverlayRes.result?.result?.value?.visibleInPortrait)
});

// Restore landscape (844 x 390)
await send("Emulation.setDeviceMetricsOverride", {
    width: 844,
    height: 390,
    deviceScaleFactor: 3,
    mobile: true,
    screenOrientation: { angle: 90, type: "landscapePrimary" }
});
await new Promise(r => setTimeout(r, 600));

// TEST 3: Mobile Top-Right Bar & Buttons
console.log("\n==================== TEST 3: MOBILE TOP-RIGHT BAR ====================");
const topBarRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const bar = document.getElementById('mobile-top-bar');
        const pauseBtn = document.getElementById('btn-mobile-pause');
        const phoneBtn = document.getElementById('btn-mobile-phone');
        const settingsBtn = document.getElementById('btn-mobile-settings');
        const barComp = bar ? window.getComputedStyle(bar) : null;
        const barRect = bar ? bar.getBoundingClientRect() : null;
        return {
            barPresent: !!bar,
            barDisplay: barComp ? barComp.display : null,
            barVisible: barComp ? barComp.display === 'flex' : false,
            hasPauseBtn: !!pauseBtn,
            hasPhoneBtn: !!phoneBtn,
            hasSettingsBtn: !!settingsBtn,
            barRightAnchored: barRect ? (window.innerWidth - barRect.right) < 80 : false,
            pauseTargetSize: pauseBtn ? { w: pauseBtn.offsetWidth, h: pauseBtn.offsetHeight } : null
        };
    })()`,
    returnByValue: true
});
const topBarData = topBarRes.result?.result?.value;
console.log("Top-Right Bar:", topBarData);
results.push({
    test: "3. Top-Right Bar (PAUSE, PHONE, SETTINGS buttons >= 44px)",
    pass: !!(topBarData?.barVisible && topBarData?.hasPauseBtn && topBarData?.hasPhoneBtn &&
             topBarData?.hasSettingsBtn && topBarData?.barRightAnchored &&
             topBarData?.pauseTargetSize?.w >= 44)
});

// TEST 4: Mobile Circular Minimap Radar
console.log("\n==================== TEST 4: CIRCULAR MINIMAP RADAR ====================");
const radarRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const radar = document.getElementById('gta-radar-card');
        const box = radar ? radar.querySelector('.radar-canvas-box') : null;
        const bars = radar ? radar.querySelector('.radar-bars') : null;
        const comp = radar ? window.getComputedStyle(radar) : null;
        const boxComp = box ? window.getComputedStyle(box) : null;
        const rect = radar ? radar.getBoundingClientRect() : null;
        return {
            radarPresent: !!radar,
            isTopLeft: rect ? (rect.left < 50 && rect.top < 50) : false,
            width: rect ? rect.width : 0,
            isApprox90px: rect ? (rect.width >= 80 && rect.width <= 110) : false,
            isBoxCircular: boxComp ? boxComp.borderRadius === '50%' : false,
            hasAttachedBars: !!bars
        };
    })()`,
    returnByValue: true
});
const radarData = radarRes.result?.result?.value;
console.log("Circular Radar:", radarData);
results.push({
    test: "4. Mobile Radar (~90px circular top-left with HP/Armor bars)",
    pass: !!(radarData?.isTopLeft && radarData?.isApprox90px && radarData?.isBoxCircular && radarData?.hasAttachedBars)
});

// TEST 5: Driving Speedometer Position
console.log("\n==================== TEST 5: DRIVING SPEEDOMETER POSITION ====================");
const speedoRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const tacho = document.getElementById('tachometer-card');
        if (!tacho) return { error: 'Tachometer missing' };
        tacho.style.display = 'flex';
        const rect = tacho.getBoundingClientRect();
        const screenW = window.innerWidth;
        const centerOffsetRatio = rect.left / screenW;
        return {
            left: rect.left,
            bottom: window.innerHeight - rect.bottom,
            centerOffsetRatio,
            isBottomCenterLeft: centerOffsetRatio < 0.45 && rect.left > 80
        };
    })()`,
    returnByValue: true
});
const speedoData = speedoRes.result?.result?.value;
console.log("Speedometer Position:", speedoData);
results.push({
    test: "5. Driving Speedometer (Compact display bottom-center-left away from pedals)",
    pass: !!speedoData?.isBottomCenterLeft
});

// TEST 6: Desktop Keyboard Hints Cleanup
console.log("\n==================== TEST 6: KEYBOARD HINTS CLEANUP ====================");
const hintsRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const prompt = document.getElementById('interaction-prompt');
        const keyBadge = prompt ? prompt.querySelector('.key-badge') : null;
        const keyComp = keyBadge ? window.getComputedStyle(keyBadge) : null;
        const controlsWrapper = document.querySelector('.controls-wrapper');
        const controlsComp = controlsWrapper ? window.getComputedStyle(controlsWrapper) : null;
        const actionBtns = Array.from(document.querySelectorAll('.touch-btn')).map(b => b.textContent + (b.getAttribute('title') || ''));
        const hasZeroWASDH = !actionBtns.some(t => t.includes('[H]') || t.includes('WASD') || t.includes('Press E'));
        return {
            keyBadgeHidden: keyComp ? keyComp.display === 'none' : true,
            desktopControlsHidden: controlsComp ? controlsComp.display === 'none' : true,
            hasZeroWASDH
        };
    })()`,
    returnByValue: true
});
const hintsData = hintsRes.result?.result?.value;
console.log("Keyboard Hints Cleanup:", hintsData);
results.push({
    test: "6. Keyboard Hints Cleaned Up on Touch (0 'Press E', '[H]', 'WASD')",
    pass: !!(hintsData?.keyBadgeHidden && hintsData?.desktopControlsHidden && hintsData?.hasZeroWASDH)
});

// TEST 7: Settings > Controls Sheet & LocalStorage Persistence
console.log("\n==================== TEST 7: CONTROLS SHEET & LOCALSTORAGE ====================");
const settingsRes = await send("Runtime.evaluate", {
    expression: `(() => {
        if (!window.mobileSettings) return { error: 'mobileSettings API missing' };
        
        // 1. Open settings
        window.mobileSettings.open();
        const sheet = document.getElementById('mobile-settings-sheet');
        const isOpen = sheet && sheet.classList.contains('open');

        // 2. Modify settings
        window.mobileSettings.set('buttonSize', 'large');
        window.mobileSettings.set('opacity', 65);
        window.mobileSettings.set('leftHanded', true);
        window.mobileSettings.set('cameraSensitivity', 1.8);
        window.mobileSettings.set('steeringMode', 'tilt');
        window.mobileSettings.set('haptics', false);

        // 3. Read back from localStorage
        const stored = JSON.parse(localStorage.getItem('mumbai3d_mobile_settings') || '{}');
        const root = document.documentElement;
        const opacityProp = root.style.getPropertyValue('--mobile-controls-opacity');
        const touchControls = document.getElementById('mobile-touch-controls');
        const isLeftHandedClass = touchControls && touchControls.classList.contains('left-handed');

        // 4. Close settings
        window.mobileSettings.close();
        const isClosed = sheet && !sheet.classList.contains('open');

        return {
            isOpen,
            isClosed,
            storedSize: stored.buttonSize === 'large',
            storedOpacity: stored.opacity === 65,
            storedLeftHanded: stored.leftHanded === true,
            storedCam: stored.cameraSensitivity === 1.8,
            storedSteer: stored.steeringMode === 'tilt',
            storedHaptics: stored.haptics === false,
            opacityApplied: opacityProp === '0.65',
            leftHandedApplied: isLeftHandedClass
        };
    })()`,
    returnByValue: true
});
const settingsData = settingsRes.result?.result?.value;
console.log("Mobile Settings:", settingsData);
results.push({
    test: "7. Controls Sheet & LocalStorage Persistence (Size, Opacity, Left-Handed, Cam, Steering, Haptics)",
    pass: !!(settingsData?.isOpen && settingsData?.isClosed && settingsData?.storedSize &&
             settingsData?.storedOpacity && settingsData?.storedLeftHanded &&
             settingsData?.storedCam && settingsData?.storedSteer &&
             settingsData?.storedHaptics && settingsData?.opacityApplied && settingsData?.leftHandedApplied)
});

// TEST 8: Safe-Area Insets Respected
console.log("\n==================== TEST 8: SAFE-AREA INSETS ====================");
const safeAreaRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const topBar = document.getElementById('mobile-top-bar');
        const radar = document.getElementById('gta-radar-card');
        const touchControls = document.getElementById('mobile-touch-controls');
        
        const topBarRect = topBar ? topBar.getBoundingClientRect() : null;
        const radarRect = radar ? radar.getBoundingClientRect() : null;
        const touchRect = touchControls ? touchControls.getBoundingClientRect() : null;
        
        return {
            topBarTop: topBarRect?.top >= 8,
            radarTop: radarRect?.top >= 8,
            radarLeft: radarRect?.left >= 8,
            touchBottom: (window.innerHeight - (touchRect?.bottom || 0)) >= 0
        };
    })()`,
    returnByValue: true
});
const safeAreaData = safeAreaRes.result?.result?.value;
console.log("Safe Area Audit:", safeAreaData);
results.push({
    test: "8. Safe-Area Insets (HUD elements respect screen safe margins)",
    pass: !!(safeAreaData?.topBarTop && safeAreaData?.radarTop && safeAreaData?.radarLeft && safeAreaData?.touchBottom)
});

console.log("\n==================== VERIFICATION SUMMARY ====================");
console.table(results);
const allPassed = results.every(r => r.pass);

chromeProc.kill();
server.stop();

if (allPassed) {
    console.log("\n>>> ALL MOBILE PLATFORM & HUD REQUIREMENTS VERIFIED AND PASSED! <<<");
    process.exit(0);
} else {
    console.error("\n>>> SOME TESTS FAILED! <<<");
    process.exit(1);
}
