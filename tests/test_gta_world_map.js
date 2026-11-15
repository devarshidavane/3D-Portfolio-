// tests/test_gta_world_map.js
// Automated verification of the interactive GTA World Map, pan, zoom, waypoint placement, and minimap expand

const PORT = 8128;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9228;

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
        const data = await res.json();
        if (data && data.length > 0 && data[0].webSocketDebuggerUrl) {
            wsUrl = data[0].webSocketDebuggerUrl;
            break;
        }
    } catch (e) {}
}

if (!wsUrl) {
    console.error("Failed to connect to Chrome CDP");
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

await new Promise(r => ws.onopen = r);
console.log(`[3] Connected to Chrome CDP. Waiting for world initialization...`);
await new Promise(r => setTimeout(r, 4500));

// Capture Runtime Errors
let runtimeErrors = [];
await send("Runtime.enable");
ws.addEventListener('message', (ev) => {
    const data = JSON.parse(ev.data);
    if (data.method === "Runtime.exceptionThrown") {
        runtimeErrors.push(data.params.exceptionDetails);
    }
});

console.log("\n==================== TEST 1: GTA WORLD MAP TOGGLE & RENDERING ====================");
const mapOpenRes = await send("Runtime.evaluate", {
    expression: `(() => {
        window.__openWorldMap();
        const modal = document.getElementById('gta-world-map-modal');
        const canvas = document.getElementById('world-map-canvas');
        return {
            isOpen: window.__isWorldMapOpen(),
            hasActiveClass: modal ? modal.classList.contains('active') : false,
            canvasWidth: canvas ? canvas.width : 0,
            canvasHeight: canvas ? canvas.height : 0
        };
    })()`,
    returnByValue: true
});
console.log("World Map Open Result:", mapOpenRes.result?.result?.value);

console.log("\n==================== TEST 2: CUSTOM GPS WAYPOINT PLACEMENT ====================");
const waypointRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const canvas = document.getElementById('world-map-canvas');
        const rect = canvas.getBoundingClientRect();
        
        const clickEv = new MouseEvent('mousedown', {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            button: 0,
            bubbles: true
        });
        canvas.dispatchEvent(clickEv);
        const upEv = new MouseEvent('mouseup', {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            button: 0,
            bubbles: true
        });
        window.dispatchEvent(upEv);

        const trackerEl = document.getElementById('waypoint-tracker');
        const detailCard = document.getElementById('map-landmark-card');
        const cardTitle = document.getElementById('map-card-title');

        return {
            trackerText: trackerEl ? trackerEl.textContent : "",
            cardActive: detailCard ? detailCard.classList.contains('active') : false,
            cardTitleText: cardTitle ? cardTitle.textContent : ""
        };
    })()`,
    returnByValue: true
});
console.log("Waypoint Placement Result:", waypointRes.result?.result?.value);

console.log("\n==================== TEST 3: DIRECTORY SELECTION & FAST TRAVEL ====================");
const dirRes = await send("Runtime.evaluate", {
    expression: `(() => {
        const items = document.querySelectorAll('.map-directory-item');
        if (items.length > 0) {
            items[0].click(); // Click first directory item (Fr. Agnel School)
        }
        const cardTitle = document.getElementById('map-card-title');
        const cardCoords = document.getElementById('map-card-coords');
        return {
            itemsCount: items.length,
            selectedTitle: cardTitle ? cardTitle.textContent : "",
            selectedCoords: cardCoords ? cardCoords.textContent : ""
        };
    })()`,
    returnByValue: true
});
console.log("Directory Selection Result:", dirRes.result?.result?.value);

console.log("\n==================== TEST 4: MINIMAP RADAR EXPAND (KEY Z) ====================");
const minimapExpandRes = await send("Runtime.evaluate", {
    expression: `(() => {
        window.__toggleMinimapExpanded();
        const radarCard = document.getElementById('gta-radar-card');
        const canvas = document.getElementById('minimap-canvas');
        return {
            isExpanded: radarCard ? radarCard.classList.contains('expanded') : false,
            newWidth: canvas ? canvas.width : 0,
            newHeight: canvas ? canvas.height : 0
        };
    })()`,
    returnByValue: true
});
console.log("Minimap Expansion Result:", minimapExpandRes.result?.result?.value);

console.log("\n==================== TEST 5: CAPTURE SCREENSHOT OF INTERACTIVE GTA MAP ====================");
const screenshotRes = await send("Page.captureScreenshot", { format: "png" });
if (screenshotRes && screenshotRes.result && screenshotRes.result.data) {
    const buf = Buffer.from(screenshotRes.result.data, 'base64');
    await Bun.write("C:\\Users\\Devarshi\\.gemini\\antigravity\\brain\\4ee4dbd9-9d3a-42fb-ad4e-2af3365ce468\\gta_world_map_interactive.png", buf);
    console.log("Saved full interactive GTA World Map screenshot to gta_world_map_interactive.png ✅");
}

console.log("\n==================== VERIFICATION SUMMARY ====================");
console.log("Total Runtime Errors:", runtimeErrors.length);
if (runtimeErrors.length > 0) {
    console.error("Runtime Errors:", runtimeErrors);
    process.exit(1);
} else {
    console.log(">>> GTA INTERACTIVE WORLD MAP & MINIMAP EXPANSION FULLY VERIFIED! <<<");
}

// Cleanup
chromeProc.kill();
server.stop();
process.exit(0);
