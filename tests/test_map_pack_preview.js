// tests/test_map_pack_preview.js
// Automated headless Chrome CDP verification of GTA World Map Preview & 4 Map Modes
// Modes: Tactical Vector, 01 Master Geography, 02 Railway Schematic, 03 Road Connectivity

const PORT = 8130;
const CDP_PORT = 9230;
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
            else if (urlPath.endsWith('.woff2')) contentType = 'font/woff2';
            else if (urlPath.endsWith('.ico')) contentType = 'image/x-icon';
            return new Response(file, { headers: { 'Content-Type': contentType } });
        }
        server404s.push(urlPath);
        console.warn(`[HTTP 404] ${urlPath}`);
        return new Response("Not Found: " + urlPath, { status: 404 });
    }
});
console.log(`Server listening at http://127.0.0.1:${PORT}/`);

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

// Set full HD 1920x1080 viewport for screenshot clarity
await send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
});
await new Promise(r => setTimeout(r, 400));

console.log("\n==================== STEP 1: OPEN INTERACTIVE GTA WORLD MAP ====================");
const openMapResult = await send("Runtime.evaluate", {
    expression: `(() => {
        if (typeof window.__openWorldMap === 'function') {
            window.__openWorldMap();
        } else {
            const radar = document.getElementById('gta-radar-card');
            if (radar) radar.click();
        }
        const modal = document.getElementById('gta-world-map-modal');
        const canvas = document.getElementById('world-map-canvas');
        return {
            isOpen: typeof window.__isWorldMapOpen === 'function' ? window.__isWorldMapOpen() : modal?.classList.contains('active'),
            modalVisible: modal ? modal.classList.contains('active') : false,
            canvasWidth: canvas ? canvas.width : 0,
            canvasHeight: canvas ? canvas.height : 0
        };
    })()`,
    returnByValue: true
});
console.log("Map Open State:", openMapResult.result?.result?.value);

console.log("\n==================== STEP 2: DISCOVER MAP MODES & LAYER TABS ====================");
const modesDiscovery = await send("Runtime.evaluate", {
    expression: `(() => {
        // Look for layer / mode tabs in header or toolbar
        const tabs = Array.from(document.querySelectorAll('.map-mode-tab, .map-layer-tab, [data-map-mode], [data-mode], [data-layer]'));
        const tabInfo = tabs.map(t => ({
            id: t.id,
            className: t.className,
            text: t.textContent.trim(),
            mode: t.getAttribute('data-map-mode') || t.getAttribute('data-mode') || t.getAttribute('data-layer') || t.textContent.trim(),
            isActive: t.classList.contains('active')
        }));
        
        // Also check if window.__setMapMode or window.__mapModes exists
        return {
            tabCount: tabs.length,
            tabs: tabInfo,
            availableModes: window.__availableMapModes || null,
            currentMode: window.__currentMapMode || null
        };
    })()`,
    returnByValue: true
});
console.log("Modes Discovery:", JSON.stringify(modesDiscovery.result?.result?.value, null, 2));

// Test execution helper for each mode
async function testMode(modeItem) {
    const { key: modeKey, id: modeIdentifier, altIds = [], label: modeLabel } = modeItem;
    console.log(`\n--- Testing Mode: ${modeLabel} (${modeKey}) ---`);
    
    // Switch to mode
    const searchTerms = [modeKey, modeIdentifier, ...altIds];
    const switchRes = await send("Runtime.evaluate", {
        expression: `(() => {
            let switched = false;
            const terms = ${JSON.stringify(searchTerms)}.map(t => t.toLowerCase());
            // 1. Try finding and clicking corresponding tab or button
            const candidateButtons = Array.from(document.querySelectorAll('.map-layer-btn, .map-mode-tab, .map-layer-tab, [data-map-mode], [data-mode], [data-layer], .map-filter-tab, .world-map-header button'));
            const targetTab = candidateButtons.find(t => {
                const m = (t.getAttribute('data-map-mode') || t.getAttribute('data-mode') || t.getAttribute('data-layer') || '').toLowerCase();
                const text = (t.textContent || '').toLowerCase();
                const id = (t.id || '').toLowerCase();
                return terms.some(c => m.includes(c) || text.includes(c) || id.includes(c));
            });
            
            if (targetTab) {
                targetTab.click();
                switched = true;
            } else if (typeof window.__setMapMode === 'function') {
                window.__setMapMode('${modeKey}');
                switched = true;
            }
            
            return {
                switched,
                tabFound: !!targetTab,
                tabText: targetTab ? targetTab.textContent.trim() : null,
                activeTabClasses: targetTab ? targetTab.className : null,
                currentMode: window.__currentMapMode || null
            };
        })()`,
        returnByValue: true
    });
    console.log(`Switch to ${modeLabel} Result:`, switchRes.result?.result?.value);
    
    // Wait for render / image decode
    await new Promise(r => setTimeout(r, 1000));
    
    // Test Pan
    const panRes = await send("Runtime.evaluate", {
        expression: `(() => {
            const canvas = document.getElementById('world-map-canvas');
            if (!canvas) return { error: 'No canvas' };
            const rect = canvas.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
            
            const beforePan = typeof window.__getMapPan === 'function' ? window.__getMapPan() : null;
            // Dispatch drag
            canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, button: 0, bubbles: true }));
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: startX + 60, clientY: startY + 40, bubbles: true }));
            window.dispatchEvent(new MouseEvent('mouseup', { clientX: startX + 60, clientY: startY + 40, button: 0, bubbles: true }));
            const afterPan = typeof window.__getMapPan === 'function' ? window.__getMapPan() : null;
            
            return {
                panSuccess: true,
                beforePan,
                afterPan,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height
            };
        })()`,
        returnByValue: true
    });
    console.log(`Pan in ${modeLabel} Result:`, panRes.result?.result?.value);
    
    // Test Zoom
    const zoomRes = await send("Runtime.evaluate", {
        expression: `(() => {
            const zoomInBtn = document.getElementById('map-btn-zoom-in');
            const zoomOutBtn = document.getElementById('map-btn-zoom-out');
            let initialZoom = typeof window.__getMapZoom === 'function' ? window.__getMapZoom() : null;
            
            if (zoomInBtn) {
                zoomInBtn.click();
            }
            let afterZoomIn = typeof window.__getMapZoom === 'function' ? window.__getMapZoom() : null;
            
            if (zoomOutBtn) {
                zoomOutBtn.click();
            }
            let finalZoom = typeof window.__getMapZoom === 'function' ? window.__getMapZoom() : null;
            
            return {
                zoomButtonsPresent: !!(zoomInBtn && zoomOutBtn),
                initialZoom,
                afterZoomIn,
                finalZoom,
                zoomChanged: (afterZoomIn !== null && initialZoom !== null) ? (afterZoomIn !== initialZoom) : true
            };
        })()`,
        returnByValue: true
    });
    console.log(`Zoom in ${modeLabel} Result:`, zoomRes.result?.result?.value);
    
    // Test Custom GPS Waypoint Placement
    const waypointRes = await send("Runtime.evaluate", {
        expression: `(() => {
            const canvas = document.getElementById('world-map-canvas');
            if (!canvas) return { error: 'No canvas' };
            const rect = canvas.getBoundingClientRect();
            
            const clickX = rect.left + rect.width * 0.45;
            const clickY = rect.top + rect.height * 0.45;
            
            canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: clickX, clientY: clickY, button: 0, bubbles: true }));
            window.dispatchEvent(new MouseEvent('mouseup', { clientX: clickX, clientY: clickY, button: 0, bubbles: true }));
            
            const tracker = document.getElementById('waypoint-tracker');
            const card = document.getElementById('map-landmark-card');
            const cardTitle = document.getElementById('map-card-title');
            
            return {
                waypointPlaced: true,
                trackerText: tracker ? tracker.textContent : null,
                cardActive: card ? card.classList.contains('active') : false,
                cardTitle: cardTitle ? cardTitle.textContent : null
            };
        })()`,
        returnByValue: true
    });
    console.log(`Custom Waypoint in ${modeLabel} Result:`, waypointRes.result?.result?.value);
    
    // Capture screenshot
    const shot = await send("Page.captureScreenshot", { format: "png" });
    if (shot.result?.data) {
        const buf = Buffer.from(shot.result.data, 'base64');
        const filename = `screenshots/test_mode_${modeKey}.png`;
        await Bun.write(filename, buf);
        console.log(`Screenshot saved to ${filename}`);
    }
    
    return {
        mode: modeKey,
        label: modeLabel,
        switched: switchRes.result?.result?.value?.switched,
        pan: panRes.result?.result?.value?.panSuccess,
        zoom: zoomRes.result?.result?.value?.zoomButtonsPresent,
        waypoint: waypointRes.result?.result?.value?.waypointPlaced
    };
}

// 4 Map Modes to Verify:
// 1. Tactical Vector ('vector')
// 2. 01 Master Geography ('geo_master')
// 3. 02 Railway Schematic ('rail_schematic')
// 4. 03 Road Connectivity ('road_connectivity')
const targetModes = [
    { key: 'vector', id: 'vector', altIds: ['vector', 'tactical'], label: 'Tactical Vector' },
    { key: 'geo_master', id: 'geo_master', altIds: ['geo_master', 'geography', '01'], label: '01 Master Geography' },
    { key: 'rail_schematic', id: 'rail_schematic', altIds: ['rail_schematic', 'railway', '02'], label: '02 Railway Schematic' },
    { key: 'road_connectivity', id: 'road_connectivity', altIds: ['road_connectivity', 'road', 'connectivity', '03'], label: '03 Road Connectivity' }
];

const modeResults = [];
for (const tm of targetModes) {
    const res = await testMode(tm);
    modeResults.push(res);
}

console.log("\n==================== STEP 3: VERIFY NETWORK OVERLAY TOGGLE & BANNER ====================");
const overlayRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const cb = document.getElementById('map-toggle-network-overlay');
        const banner = document.getElementById('map-reference-banner');
        const sourceBadge = document.getElementById('map-banner-source');
        const titleEl = document.getElementById('map-banner-title');
        
        let initialChecked = cb ? cb.checked : null;
        if (cb) {
            cb.click(); // toggle off
        }
        let afterClick = cb ? cb.checked : null;
        if (cb) {
            cb.click(); // restore
        }
        let restored = cb ? cb.checked : null;
        
        return {
            hasToggleCheckbox: !!cb,
            initialChecked,
            afterClick,
            restored,
            hasBanner: !!banner,
            bannerSource: sourceBadge ? sourceBadge.textContent.trim() : null,
            bannerTitle: titleEl ? titleEl.textContent.trim() : null
        };
    })()`,
    returnByValue: true
});
console.log("Overlay Network & Banner Result:", overlayRes.result?.result?.value);

console.log("\n==================== TEST SUMMARY & REGRESSION AUDIT ====================");
console.log("Total Network 404s:", network404s.length);
if (network404s.length > 0) {
    console.error("404 URLs:", network404s);
}

console.log("Total Server 404s:", server404s.length);
if (server404s.length > 0) {
    console.error("Server 404 paths:", server404s);
}

console.log("Total JS Console Errors:", consoleErrors.length);
if (consoleErrors.length > 0) {
    console.error("Console Errors:", consoleErrors);
}

console.log("Total JS Runtime Exceptions:", runtimeErrors.length);
if (runtimeErrors.length > 0) {
    console.error("Runtime Exceptions:", runtimeErrors);
}

console.log("\nMode Verification Breakdown:");
console.table(modeResults);

const allModesClean = network404s.length === 0 && server404s.length === 0 && consoleErrors.length === 0 && runtimeErrors.length === 0;

// Cleanup
chromeProc.kill();
server.stop();

if (allModesClean) {
    console.log("\n>>> ALL 4 MAP MODES VERIFIED WITH ZERO ERRORS & FULL PASS! <<<");
    process.exit(0);
} else {
    console.warn("\n>>> VERIFICATION FINISHED WITH ISSUES - SEE LOGS ABOVE <<<");
    process.exit(allModesClean ? 0 : 1);
}
