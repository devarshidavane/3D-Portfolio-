// tests/test_capture_fixed_world.js
// Capture screenshot of Home HQ Plaza and the fixed ground roads

const PORT = 8129;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9229;

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
await new Promise(r => setTimeout(r, 4500));

// Position camera high looking down over Stark Tower and the plaza
await send("Runtime.evaluate", {
    expression: `(() => {
        const cam = window.__camera;
        if (cam) {
            cam.position.set(0, 35, -75);
            cam.lookAt(0, 10, 0);
        }
    })()`
});
await new Promise(r => setTimeout(r, 800));

const shot = await send("Page.captureScreenshot", { format: "png" });
if (shot && shot.result && shot.result.data) {
    const buf = Buffer.from(shot.result.data, 'base64');
    await Bun.write("C:\\Users\\Devarshi\\.gemini\\antigravity\\brain\\4ee4dbd9-9d3a-42fb-ad4e-2af3365ce468\\fixed_roads_homehq.png", buf);
    console.log("Saved fixed_roads_homehq.png ✅");
}

chromeProc.kill();
server.stop();
process.exit(0);
