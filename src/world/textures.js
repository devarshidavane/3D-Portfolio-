import * as THREE from 'three';

// ==========================================
// PROCEDURAL CANVAS TEXTURES FACTORY
// ==========================================

export function applyVertexColor(geom, hexColor) {
    const count = geom.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color(hexColor);
    for (let i = 0; i < count; i++) {
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
}

export function createCobblestoneTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 256, 256);

    const stoneSize = 32;
    for (let y = 0; y < 256; y += stoneSize) {
        const offset = (y / stoneSize) % 2 === 0 ? 0 : stoneSize / 2;
        for (let x = -stoneSize; x < 256 + stoneSize; x += stoneSize) {
            const shade = 100 + Math.floor(Math.random() * 40);
            ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 10})`;
            ctx.beginPath();
            ctx.roundRect(x + offset + 2, y + 2, stoneSize - 4, stoneSize - 4, 4);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createAsphaltTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle grain
    for (let i = 0; i < 4000; i++) {
        const gx = Math.random() * 512;
        const gy = Math.random() * 512;
        const alpha = Math.random() * 0.12;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(gx, gy, 2, 2);
    }

    // Yellow center double dashed lines
    ctx.fillStyle = '#f59e0b';
    for (let y = 16; y < 512; y += 64) {
        ctx.fillRect(250, y, 5, 40);
        ctx.fillRect(258, y, 5, 40);
    }

    // White outer shoulder lines
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(20, 0, 8, 512);
    ctx.fillRect(484, 0, 8, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createGrassTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 3500; i++) {
        const gx = Math.random() * 256;
        const gy = Math.random() * 256;
        const g = 110 + Math.floor(Math.random() * 60);
        ctx.fillStyle = `rgb(22, ${g}, 45)`;
        ctx.fillRect(gx, gy, 2, 4);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createBrickTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e2e8f0'; // Mortar
    ctx.fillRect(0, 0, 256, 256);

    const bh = 16;
    const bw = 32;
    for (let y = 0; y < 256; y += bh) {
        const off = (y / bh) % 2 === 0 ? 0 : bw / 2;
        for (let x = -bw; x < 256 + bw; x += bw) {
            const r = 160 + Math.floor(Math.random() * 35);
            ctx.fillStyle = `rgb(${r}, 45, 38)`;
            ctx.fillRect(x + off + 1.5, y + 1.5, bw - 3, bh - 3);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createModernFacadeTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 256, 256);

    // Glowing architectural grid windows
    for (let y = 12; y < 256; y += 40) {
        for (let x = 12; x < 256; x += 40) {
            ctx.fillStyle = Math.random() > 0.3 ? '#38bdf8' : '#1e293b';
            ctx.fillRect(x, y, 26, 24);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, 26, 24);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createRailwayTrackTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const ctx = c.getContext('2d');
    // Ballast gravel
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 128, 256);

    // Wooden sleepers
    ctx.fillStyle = '#3b2518';
    for (let y = 10; y < 256; y += 32) {
        ctx.fillRect(10, y, 108, 14);
    }

    // Steel rails
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(28, 0, 8, 256);
    ctx.fillRect(92, 0, 8, 256);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(30, 0, 3, 256);
    ctx.fillRect(94, 0, 3, 256);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createSidewalkTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 256, 256);

    const tileSize = 32;
    for (let y = 0; y < 256; y += tileSize) {
        for (let x = 0; x < 256; x += tileSize) {
            const shade = 180 + Math.floor(Math.random() * 28);
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 4})`;
            ctx.fillRect(x + 1.5, y + 1.5, tileSize - 3, tileSize - 3);
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1.5, y + 1.5, tileSize - 3, tileSize - 3);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createChawlFacadeTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 8) {
        const alpha = 0.04 + Math.random() * 0.12;
        ctx.fillStyle = `rgba(69, 26, 3, ${alpha})`;
        ctx.fillRect(0, y, 256, 4);
    }
    for (let i = 0; i < 2000; i++) {
        const gx = Math.random() * 256;
        const gy = Math.random() * 256;
        const shade = 140 + Math.floor(Math.random() * 50);
        ctx.fillStyle = `rgba(${shade}, ${Math.floor(shade * 0.55)}, 20, 0.22)`;
        ctx.fillRect(gx, gy, 3, 3);
    }
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 85); ctx.lineTo(256, 85);
    ctx.moveTo(0, 170); ctx.lineTo(256, 170);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createApartmentFacadeTexture(baseColor = '#fef3c7') {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 2500; i++) {
        const gx = Math.random() * 256;
        const gy = Math.random() * 256;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(gx, gy, 2, 2);
    }
    for (let y = 14; y < 256; y += 64) {
        for (let x = 14; x < 256; x += 64) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x, y, 34, 38);
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(x + 3, y + 3, 28, 32);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(x - 2, y + 38, 38, 4);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createCorporateGlassTexture(glassHue = '#0284c7') {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 4; y < 256; y += 32) {
        for (let x = 4; x < 256; x += 32) {
            const grad = ctx.createLinearGradient(x, y, x + 28, y + 28);
            grad.addColorStop(0, glassHue);
            grad.addColorStop(0.5, '#38bdf8');
            grad.addColorStop(1, '#0369a1');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, 28, 28);
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, 28, 28);
        }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function createBilingualSignboardTexture(mrText, enText, bgColor = '#0f172a', textColor = '#f8fafc') {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mrText, 256, 48);

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(enText, 256, 92);

    return new THREE.CanvasTexture(c);
}

export function createTrainDestinationTexture(mrText, enText) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 250, 58);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mrText, 128, 26);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(enText, 128, 52);

    return new THREE.CanvasTexture(c);
}

// Lazy-initialized shared material cache
export const sharedMaterials = {
    _cache: {},
    get(name, factory) {
        if (!this._cache[name]) {
            this._cache[name] = factory();
        }
        return this._cache[name];
    }
};
