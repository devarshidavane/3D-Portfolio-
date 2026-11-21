// tests/test_ui_clean.js
// Automated Chrome CDP verification for GTA Clean UI Overhaul:
// 1. On-foot tachometer hidden by default
// 2. Collapsed controls card by default with toggle via 'H' / button
// 3. Top-left #btn-mobile-options clean position without overlap
// 4. #interaction-prompt anchored at bottom <= 100px
// 5. Tachometer appears in vehicle mode with speed updates
// 6. Screenshot captured to screenshots/ui_cleaned_preview.png

const PORT = 8132;
const CDP_PORT = 9232;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

console.log(`[1] Starting static HTTP server on port ${PORT}...`);
const serverRequests = [];
const server404s = [];

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        let urlPath = new URL(req.url).pathname;
        if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
        const filePath = `.${urlPath}`;
        serverRequests.push(urlPath);
        
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
        server404s.push(urlPath);
        console.warn(`[HTTP 404] ${urlPath}`);
        return new Response("Not Found: " + urlPath, { status: 404 });
    }
});
console.log(`Server running at http://127.0.0.1:${PORT}/`);

console.log(`[2] Launching Chrome on CDP port ${CDP_PORT}...`);
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
    console.error("Failed to connect to Chrome CDP on port " + CDP_PORT);
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
    } catch (e) {
        console.error("Error parsing CDP message:", e);
    }
};

function send(method, params = {}) {
    return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

await new Promise(r => ws.onopen = r);
console.log(`[3] Connected to Chrome CDP. Initializing listeners and waiting for world load...`);

const runtimeErrors = [];
const consoleErrors = [];
const network404s = [];

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");

ws.addEventListener('message', (ev) => {
    try {
        const data = JSON.parse(ev.data);
        if (data.method === "Runtime.exceptionThrown") {
            const desc = data.params?.exceptionDetails?.text || JSON.stringify(data.params?.exceptionDetails);
            runtimeErrors.push(desc);
            console.error("Runtime Exception:", desc);
        } else if (data.method === "Runtime.consoleAPICalled" && data.params?.type === "error") {
            const text = data.params?.args?.map(a => a.value || a.description || '').join(' ');
            consoleErrors.push(text);
            console.error("Console Error:", text);
        } else if (data.method === "Network.responseReceived") {
            const resp = data.params?.response;
            if (resp && resp.status >= 400) {
                network404s.push({ url: resp.url, status: resp.status, statusText: resp.statusText });
                console.error(`HTTP ${resp.status} Error: ${resp.url}`);
            }
        }
    } catch (e) {}
});

// Wait for Three.js engine and assets to initialize
await new Promise(r => setTimeout(r, 4500));

console.log("\n==================== TEST 1: ON-FOOT TACHOMETER HIDDEN ====================");
const tachoOnFootRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const tacho = document.getElementById('tachometer-card');
        if (!tacho) return { error: 'Tachometer card element missing' };
        const comp = window.getComputedStyle(tacho);
        return {
            elementPresent: true,
            display: comp.display,
            visibility: comp.visibility,
            isHidden: comp.display === 'none'
        };
    })()`,
    returnByValue: true
});
console.log("Tachometer on Foot:", tachoOnFootRes.result?.result?.value);

console.log("\n==================== TEST 2: CONTROLS PANEL COLLAPSED BY DEFAULT ====================");
const controlsDefaultRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const controlsCard = document.getElementById('controls-card');
        const toggleBtn = document.getElementById('controls-toggle-btn');
        if (!controlsCard) return { error: 'controls-card element missing' };
        const cardComp = window.getComputedStyle(controlsCard);
        const btnComp = toggleBtn ? window.getComputedStyle(toggleBtn) : null;
        return {
            cardPresent: true,
            cardDisplay: cardComp.display,
            cardIsCollapsed: cardComp.display === 'none',
            btnPresent: !!toggleBtn,
            btnDisplay: btnComp ? btnComp.display : null,
            btnVisible: btnComp ? (btnComp.display !== 'none') : false
        };
    })()`,
    returnByValue: true
});
console.log("Controls Panel Default:", controlsDefaultRes.result?.result?.value);

console.log("\n==================== TEST 3: CONTROLS TOGGLE VIA 'H' KEY & BUTTON ====================");
const controlsToggleRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const controlsCard = document.getElementById('controls-card');
        const toggleBtn = document.getElementById('controls-toggle-btn');
        
        // 1. Dispatch keydown 'h'
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
        const afterKeyH_classOpen = controlsCard.classList.contains('open');
        const afterKeyH_display = window.getComputedStyle(controlsCard).display;
        
        // 2. Dispatch keydown 'h' again to collapse
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
        const afterKeyH2_classOpen = controlsCard.classList.contains('open');
        const afterKeyH2_display = window.getComputedStyle(controlsCard).display;
        
        // 3. Click toggle button
        if (toggleBtn) toggleBtn.click();
        const afterBtn_classOpen = controlsCard.classList.contains('open');
        const afterBtn_display = window.getComputedStyle(controlsCard).display;
        
        // 4. Click toggle button again
        if (toggleBtn) toggleBtn.click();
        const afterBtn2_classOpen = controlsCard.classList.contains('open');
        const afterBtn2_display = window.getComputedStyle(controlsCard).display;
        
        return {
            afterKeyH_classOpen,
            afterKeyH_display,
            afterKeyH2_classOpen,
            afterKeyH2_display,
            afterBtn_classOpen,
            afterBtn_display,
            afterBtn2_classOpen,
            afterBtn2_display,
            toggleWorks: (afterKeyH_display === 'flex' || afterKeyH_classOpen) && (afterKeyH2_display === 'none' || !afterKeyH2_classOpen)
        };
    })()`,
    returnByValue: true
});
console.log("Controls Toggle Result:", controlsToggleRes.result?.result?.value);

console.log("\n==================== TEST 4: TOP-LEFT HEADER OVERLAP AUDIT ====================");
const overlapAuditRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const btnOptions = document.getElementById('btn-mobile-options');
        const districtPills = document.querySelectorAll('.gta-district-pill, .district-pill');
        const rect = btnOptions ? btnOptions.getBoundingClientRect() : null;
        
        // Check if any element in top bar overlaps btnOptions
        let overlappingElement = null;
        if (rect) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const topEl = document.elementFromPoint(centerX, centerY);
            if (topEl && topEl !== btnOptions && !btnOptions.contains(topEl)) {
                overlappingElement = topEl.tagName + (topEl.id ? '#' + topEl.id : '') + (topEl.className ? '.' + topEl.className : '');
            }
        }
        
        return {
            btnOptionsPresent: !!btnOptions,
            btnOptionsRect: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null,
            districtPillsInTopBarCount: districtPills.length,
            overlappingElement,
            hasZeroOverlap: overlappingElement === null
        };
    })()`,
    returnByValue: true
});
console.log("Top-Left Overlap Audit:", overlapAuditRes.result?.result?.value);

console.log("\n==================== TEST 5: INTERACTION PROMPT BOTTOM ANCHOR ====================");
const promptAnchorRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const prompt = document.getElementById('interaction-prompt');
        if (!prompt) return { error: 'interaction-prompt element missing' };
        const comp = window.getComputedStyle(prompt);
        const bottomPx = parseFloat(comp.bottom);
        return {
            promptPresent: true,
            bottomValue: comp.bottom,
            bottomPx,
            isAnchoredCleanly: bottomPx <= 100
        };
    })()`,
    returnByValue: true
});
console.log("Interaction Prompt Anchor:", promptAnchorRes.result?.result?.value);

console.log("\n==================== TEST 6: VEHICLE MODE TACHOMETER APPEARANCE ====================");
const vehicleTachoRes = await send("Runtime.evaluate", {
    expression: `(async () => {
        const tacho = document.getElementById('tachometer-card');
        const speedVal = document.getElementById('tacho-speed-value');
        
        // Mount vehicle to trigger vehicle mode in render loop
        if (window.__carVehicle && typeof window.__setActiveVehicle === 'function') {
            const car = window.__carVehicle;
            car.speed = 15;
            window.__setActiveVehicle(car);
        }
        if (typeof window.__updateTachometerHUD === 'function') {
            window.__updateTachometerHUD(15, false, true);
        }
        
        // Wait 150ms
        await new Promise(r => setTimeout(r, 150));
        
        const compInVehicle = tacho ? window.getComputedStyle(tacho) : null;
        const speedTextInVehicle = speedVal ? speedVal.textContent.trim() : null;
        const displayInVehicle = compInVehicle ? compInVehicle.display : null;
        
        // Return to on foot
        if (typeof window.__setActiveVehicle === 'function') {
            window.__setActiveVehicle(null);
        }
        if (typeof window.__updateTachometerHUD === 'function') {
            window.__updateTachometerHUD(0, false, false);
        }
        
        await new Promise(r => setTimeout(r, 150));
        const compAfterExit = tacho ? window.getComputedStyle(tacho) : null;
        const displayAfterExit = compAfterExit ? compAfterExit.display : null;
        
        return {
            tachoPresent: !!tacho,
            displayInVehicle,
            speedTextInVehicle,
            isShownInVehicle: displayInVehicle === 'flex',
            displayAfterExit,
            hidesOnExit: displayAfterExit === 'none'
        };
    })()`,
    awaitPromise: true,
    returnByValue: true
});
console.log("Vehicle Tachometer Appearance:", vehicleTachoRes.result?.result?.value);

console.log("\n==================== TEST 7: SCREENSHOT CAPTURE ====================");
const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot.result?.data) {
    const buf = Buffer.from(shot.result.data, 'base64');
    const filename = "screenshots/ui_cleaned_preview.png";
    await Bun.write(filename, buf);
    console.log(`Saved screenshot to ${filename} ✅`);
}

console.log("\n==================== VERIFICATION SUMMARY ====================");
console.log("Network 404s:", network404s.length);
console.log("Server 404s:", server404s.length);
console.log("Console Errors:", consoleErrors.length);
console.log("Runtime Exceptions:", runtimeErrors.length);

const t1 = tachoOnFootRes.result?.result?.value?.isHidden;
const t2 = controlsDefaultRes.result?.result?.value?.cardIsCollapsed && controlsDefaultRes.result?.result?.value?.btnVisible;
const t3 = controlsToggleRes.result?.result?.value?.toggleWorks;
const t4 = overlapAuditRes.result?.result?.value?.hasZeroOverlap;
const t5 = promptAnchorRes.result?.result?.value?.isAnchoredCleanly;
const t6 = vehicleTachoRes.result?.result?.value?.isShownInVehicle;

console.table([
    { Test: "1. On-Foot Tachometer Hidden", Pass: !!t1 },
    { Test: "2. Controls Card Collapsed by Default", Pass: !!t2 },
    { Test: "3. 'H' Key / Button Toggle Controls", Pass: !!t3 },
    { Test: "4. Zero Header Overlap with #btn-mobile-options", Pass: !!t4 },
    { Test: "5. Interaction Prompt Anchored <= 100px", Pass: !!t5 },
    { Test: "6. Vehicle Tachometer Visible in Driving Mode", Pass: !!t6 }
]);

const allPassed = t1 && t2 && t3 && t4 && t5 && t6 && network404s.length === 0 && server404s.length === 0 && consoleErrors.length === 0 && runtimeErrors.length === 0;

chromeProc.kill();
server.stop();

if (allPassed) {
    console.log("\n>>> ALL UI CLEANING REQUIREMENTS VERIFIED AND PASSED! <<<");
    process.exit(0);
} else {
    console.warn("\n>>> SOME CHECKS DID NOT PASS - REVIEW LOGS ABOVE <<<");
    process.exit(allPassed ? 0 : 1);
}
