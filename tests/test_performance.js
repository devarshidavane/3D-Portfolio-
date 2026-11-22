// tests/test_performance.js
// Automated Headless Chrome CDP Verification for P2 Performance & Draw Call Optimization
// Requirements:
// 1. Connect to http://127.0.0.1:8080/ (or fallback to dedicated static test server).
// 2. Let world render for 3-4 seconds.
// 3. Evaluate renderer.info.render.calls: Assert <= 150 (Target <= 150 active draw calls, down from ~400).
// 4. Evaluate renderer.info.render.triangles: Assert <= 1,500,000 (Target <= 1.5M).
// 5. Verify #fps-badge is visible and contains text with FPS, calls, and triangles.
// 6. Zero runtime errors or exceptions.

const PRIMARY_PORT = 8080;
const FALLBACK_PORT = 8142;
const CDP_PORT = 9242;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

console.log("================================================================================");
console.log(">>> STARTING P2 PERFORMANCE & DRAW CALL AUTOMATED VERIFICATION SUITE");
console.log("================================================================================");

let server = null;
let targetUrl = `http://127.0.0.1:${PRIMARY_PORT}/index.html`;

// 1. Check if 8080 is accessible, otherwise spin up static server on FALLBACK_PORT
try {
    const probe = await fetch(`http://127.0.0.1:${PRIMARY_PORT}/index.html`, { method: 'HEAD', signal: AbortSignal.timeout(1000) });
    if (probe.ok || probe.status === 200 || probe.status === 304) {
        console.log(`[1] Connected to active test server at http://127.0.0.1:${PRIMARY_PORT}/`);
    } else {
        throw new Error(`Status ${probe.status}`);
    }
} catch (e) {
    console.log(`[1] Primary port ${PRIMARY_PORT} not responding (${e.message}). Starting static server on port ${FALLBACK_PORT}...`);
    server = Bun.serve({
        port: FALLBACK_PORT,
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
                else if (urlPath.endsWith('.svg')) contentType = 'image/svg+xml';
                else if (urlPath.endsWith('.glb')) contentType = 'model/gltf-binary';
                else if (urlPath.endsWith('.woff2')) contentType = 'font/woff2';
                else if (urlPath.endsWith('.ico')) contentType = 'image/x-icon';
                return new Response(file, { headers: { 'Content-Type': contentType } });
            }
            return new Response("Not Found: " + urlPath, { status: 404 });
        }
    });
    targetUrl = `http://127.0.0.1:${FALLBACK_PORT}/index.html`;
    console.log(`Static server running at ${targetUrl}`);
}

console.log(`[2] Launching headless Chrome on CDP port ${CDP_PORT}...`);
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

// 3. Connect to CDP
let wsUrl = null;
for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
        const data = await res.json();
        const page = Array.isArray(data) ? data.find(t => t.type === 'page' && (t.url.includes(`${CDP_PORT}`) || t.url.includes('index.html') || t.url.includes(`:${PRIMARY_PORT}`) || t.url.includes(`:${FALLBACK_PORT}`))) : null;
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
const consoleErrors = [];
const runtimeExceptions = [];

function sendCommand(method, params = {}) {
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

ws.addEventListener('message', (event) => {
    try {
        const data = JSON.parse(event.data);
        if (data.method === 'Runtime.consoleAPICalled') {
            const text = data.params.args.map(a => a.value || a.description || '').join(' ');
            if (data.params.type === 'error') {
                consoleErrors.push(text);
                console.error("[Browser Error]", text);
            }
        }
        if (data.method === 'Runtime.exceptionThrown') {
            const desc = data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text || 'Exception';
            runtimeExceptions.push(desc);
            console.error("[Browser Exception]", desc);
        }
    } catch (e) {}
});

await sendCommand('Runtime.enable');
await sendCommand('Page.enable');
await sendCommand('Network.enable');

console.log(`[3] Navigating to ${targetUrl}...`);
await sendCommand('Page.navigate', { url: targetUrl });

console.log("[4] Waiting 4.0s for world simulation & render warmup...");
await new Promise(r => setTimeout(r, 4000));

console.log("[5] Evaluating rendering performance metrics & HUD FPS badge in browser runtime...");

const evalResult = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
        const renderer = window.renderer || window.__renderer;
        if (!renderer) {
            return {
                error: 'WebGLRenderer instance not found on window (window.renderer / window.__renderer)'
            };
        }

        const renderInfo = renderer.info ? {
            calls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            points: renderer.info.render.points,
            lines: renderer.info.render.lines,
            frame: renderer.info.render.frame,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures
        } : null;

        if (typeof window.updatePerformanceHUD === 'function') {
            window.updatePerformanceHUD();
        }

        const fpsBadge = document.getElementById('fps-badge');
        let badgeInfo = null;
        if (fpsBadge) {
            const style = window.getComputedStyle(fpsBadge);
            const isDisplayed = style.display !== 'none';
            const isVisible = style.visibility !== 'hidden';
            const rect = fpsBadge.getBoundingClientRect();
            const text = fpsBadge.innerText || fpsBadge.textContent || '';
            badgeInfo = {
                present: true,
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                isDisplayed,
                isVisible,
                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                textContent: text.trim(),
                hasFPS: /fps/i.test(text),
                hasCalls: /call/i.test(text),
                hasTris: /tri/i.test(text)
            };
        } else {
            badgeInfo = { present: false };
        }

        return {
            renderInfo,
            badgeInfo
        };
    })()`,
    returnByValue: true
});

console.log("\n================================================================================");
console.log(">>> EVALUATION RESULTS");
console.log("================================================================================");

const res = evalResult?.result?.value || evalResult?.value;
if (!res || res.error) {
    console.error("FATAL ERROR: Failed to evaluate render metrics in browser context:", res?.error || evalResult);
    await cleanup();
    process.exit(1);
}

const renderInfo = res.renderInfo;
const badgeInfo = res.badgeInfo;

console.log(`Render Calls:     ${renderInfo?.calls}`);
console.log(`Render Triangles: ${renderInfo?.triangles?.toLocaleString()}`);
console.log(`Geometries:       ${renderInfo?.geometries}`);
console.log(`Textures:         ${renderInfo?.textures}`);
console.log(`Frame Count:      ${renderInfo?.frame}`);
console.log("--------------------------------------------------------------------------------");
console.log(`FPS Badge Present: ${badgeInfo?.present}`);
console.log(`FPS Badge Display: ${badgeInfo?.display}`);
console.log(`FPS Badge Text:    "${badgeInfo?.textContent}"`);
console.log("--------------------------------------------------------------------------------");

const MAX_CALLS = 150;
const MAX_TRIANGLES = 1500000;

const assertions = [
    {
        name: `Active Draw Calls <= ${MAX_CALLS}`,
        actual: renderInfo?.calls,
        passed: typeof renderInfo?.calls === 'number' && renderInfo.calls <= MAX_CALLS
    },
    {
        name: `Triangles Rendered <= ${MAX_TRIANGLES.toLocaleString()}`,
        actual: renderInfo?.triangles,
        passed: typeof renderInfo?.triangles === 'number' && renderInfo.triangles <= MAX_TRIANGLES
    },
    {
        name: "FPS Badge Visible (#fps-badge display != 'none')",
        actual: badgeInfo?.display,
        passed: badgeInfo?.present && badgeInfo.isDisplayed && badgeInfo.isVisible
    },
    {
        name: "FPS Badge Contains 'FPS'",
        actual: badgeInfo?.textContent,
        passed: badgeInfo?.hasFPS === true
    },
    {
        name: "FPS Badge Contains Calls Metric",
        actual: badgeInfo?.textContent,
        passed: badgeInfo?.hasCalls === true
    },
    {
        name: "FPS Badge Contains Triangles Metric",
        actual: badgeInfo?.textContent,
        passed: badgeInfo?.hasTris === true
    },
    {
        name: "Zero Runtime Console Errors",
        actual: consoleErrors.length,
        passed: consoleErrors.length === 0
    }
];

let allPassed = true;
console.log("TEST ASSERTIONS TABLE:");
console.log("--------------------------------------------------------------------------------");
for (const a of assertions) {
    const status = a.passed ? "PASS [OK]" : "FAIL [X]";
    if (!a.passed) allPassed = false;
    console.log(`- ${a.name.padEnd(52)} : ${status} (Actual: ${JSON.stringify(a.actual)})`);
}
console.log("--------------------------------------------------------------------------------");

if (consoleErrors.length > 0) {
    console.warn("Console Errors Encountered:", consoleErrors);
}
if (runtimeExceptions.length > 0) {
    console.warn("Runtime Exceptions Encountered:", runtimeExceptions);
}

await cleanup();

if (allPassed) {
    console.log(">>> ALL P2 PERFORMANCE & DRAW CALL TESTS PASSED! <<<");
    process.exit(0);
} else {
    console.error(">>> SOME P2 PERFORMANCE TESTS FAILED <<<");
    process.exit(1);
}
