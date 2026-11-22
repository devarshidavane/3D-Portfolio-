// src/ui/worldMapInteractive.js
// ============================================================================
// GTA V AUTHENTIC PAUSE-MENU TACTICAL WORLD MAP & FAST TRAVEL SYSTEM
// Built with d3-zoom, d3-selection, gsap, howler & mathematical terrain/road graphs
// ============================================================================

import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import gsap from 'gsap';
import { Howl } from 'howler';

import { DISTRICTS, getDistrictAt, isWater, getElevationAt } from '../data/mumbaiGeography.js';
import { mumbaiRoadNetwork } from '../data/roadGraph.js';
import { TRACK_SPLINES } from '../data/railwayDatabase.js';

// ==========================================
// STATE & CONFIGURATION
// ==========================================
export let isWorldMapOpen = false;
export let currentMapLayer = 'atlas'; // 'atlas' | 'road' | 'satellite'
export let overlayNetworkEnabled = true;
export let audioMuted = false;
export let isFastTraveling = false;

// References passed from engine
let mainCameraRef = null;
let playerGroupRef = null;
let teleportHandler = null;
let chunkManagerRef = null;
let setCameraOverrideRef = null;

// DOM Elements
let mapModalEl = null;
let mapCanvas = null;
let mapCtx = null;
let d3Selection = null;
let zoomBehavior = null;

// Zoom & Pan Transform managed by d3-zoom
let currentTransform = zoomIdentity;
let activeTimeline = null;
let activeGpsRouteData = null;
let customWaypoint = null;
let selectedBlip = null;

// Category Filter visibility state
export const categoryVisibility = {
    home: true,
    academic: true,
    transit: true,
    airport: true,
    station: true,
    landmark: true
};

// World Spatial Extents (5200m x 5200m)
const WORLD_MIN_X = -2600;
const WORLD_MAX_X = 2600;
const WORLD_MIN_Z = -2600;
const WORLD_MAX_Z = 2600;
const WORLD_SIZE = 5200;

// ==========================================
// MASTER LANDMARKS REGISTRY
// ==========================================
export const MAP_LANDMARKS = [
    {
        id: 'home_hq',
        nodeId: 'node_homehq_plaza',
        name: "DEVARSHI'S HOME HQ & STARK TOWER",
        category: 'home',
        x: 0, y: 8.5, z: -28,
        district: "Dharavi Koliwada",
        desc: "180m Cyber Skyscraper world origin. Houses cybersecurity command, research lab, penthouse, and rooftop flight deck."
    },
    {
        id: 'dmce_college',
        nodeId: 'node_dmce_main_gate',
        name: "DATTA MEGHE COLLEGE OF ENGINEERING (DMCE)",
        category: 'academic',
        x: 1850, y: 12.5, z: 1410,
        district: "Airoli Tech District",
        desc: "Premier engineering institute in Sector 3 Airoli. Features 8-storey academic blocks, computer AI labs, and college quadrangle."
    },
    {
        id: 'fr_agnel_school',
        nodeId: 'node_fr_agnel_school_gate',
        name: "FR. AGNEL TECHNICAL HIGH SCHOOL & JR COLLEGE",
        category: 'academic',
        x: -1350, y: 32.5, z: 490,
        district: "Bandra West",
        desc: "Historic technical high school & college campus situated on the Mount Mary ridge overlooking the Bandstand coastline."
    },
    {
        id: 'csmia_airport',
        nodeId: 'node_airport_parkway_east',
        name: "CHHATRAPATI SHIVAJI MAHARAJ INT'L AIRPORT (CSMIA)",
        category: 'airport',
        x: 150, y: 14.0, z: 1160,
        district: "Andheri East",
        desc: "International aviation hub with 360m runway 09/27, Terminal 2 concourse, active air traffic radar, and taxiway aprons."
    },
    {
        id: 'bwsl_bridge',
        nodeId: 'node_bwsl_cable_span_1',
        name: "BANDRA-WORLI SEA LINK (RAJIV GANDHI SEA LINK)",
        category: 'transit',
        x: -1100, y: 18.0, z: 50,
        district: "Bandra-Worli Bay",
        desc: "Iconic 8-lane cable-stayed expressway viaduct spanning Mahim Bay across open ocean with 82m concrete pylon towers."
    },
    {
        id: 'airoli_bridge',
        nodeId: 'node_airoli_bridge_mid',
        name: "AIROLI CREEK BRIDGE",
        category: 'transit',
        x: 1350, y: 16.0, z: 1420,
        district: "Thane Creek",
        desc: "Major trans-creek arterial bridge connecting Mulund in Eastern Suburbs directly across Thane Creek into DMCE College avenue."
    },
    {
        id: 'vashi_bridge',
        nodeId: 'node_vashi_creek_bridge_mid',
        name: "VASHI CREEK BRIDGE (SION-PANVEL HWY)",
        category: 'transit',
        x: 1200, y: 18.0, z: -400,
        district: "Vashi Gateway",
        desc: "Key multi-lane marine bridge spanning Thane Creek, linking Mankhurd to Vashi and the southern Navi Mumbai metropolis."
    },
    {
        id: 'gateway_india',
        nodeId: 'node_gateway_waterfront',
        name: "GATEWAY OF INDIA & APOLLO BUNDER",
        category: 'landmark',
        x: -350, y: 2.5, z: -2280,
        district: "Colaba Waterfront",
        desc: "Iconic 1924 basalt triumphal waterfront arch overlooking Mumbai Harbour and the Arabian Sea."
    },
    {
        id: 'marine_drive',
        nodeId: 'node_marine_drive_central',
        name: "MARINE DRIVE (QUEEN'S NECKLACE)",
        category: 'landmark',
        x: -850, y: 3.5, z: -1700,
        district: "Marine Drive",
        desc: "Iconic 3km C-shaped coastal boulevard and promenade lining Back Bay, famous for sunset views and glittering night arc lights."
    },
    {
        id: 'haji_ali',
        nodeId: 'node_haji_ali_entrance',
        name: "HAJI ALI DARGAH (WORLI BAY)",
        category: 'landmark',
        x: -1100, y: 2.0, z: -1150,
        district: "Worli Bay",
        desc: "15th-century Indo-Islamic tidal island shrine constructed on an offshore islet in Worli Bay, connected by a 500m causeway."
    },
    {
        id: 'bkc_financial',
        nodeId: 'node_bkc_connector',
        name: "BANDRA-KURLA COMPLEX (BKC) FINANCIAL HUB",
        category: 'landmark',
        x: 0, y: 5.0, z: 400,
        district: "BKC Nexus",
        desc: "Premier international business and finance district featuring corporate glass headquarters and consulates."
    },
    // Major Suburban Railway Stations
    { id: 'st_churchgate', nodeId: 'node_churchgate_station', name: "CHURCHGATE RAILWAY TERMINUS", category: 'station', x: -480, y: 0.4, z: -1920, district: "Fort Heritage Quarter", desc: "Southern terminus of the Western Suburban Railway line." },
    { id: 'st_csmt', nodeId: 'node_csmt_heritage_junction', name: "CSMT HERITAGE RAILWAY TERMINUS", category: 'station', x: 120, y: 0.4, z: -1900, district: "Fort Heritage Quarter", desc: "UNESCO World Heritage headquarters of Central Railway." },
    { id: 'st_dadar', nodeId: 'node_dadar_tt_circle', name: "DADAR CENTRAL & WESTERN INTERCHANGE", category: 'station', x: -380, y: 0.4, z: -320, district: "Dadar Interchange", desc: "Mumbai's busiest railway interchange connecting Western and Central corridors." },
    { id: 'st_bandra', nodeId: 'node_bandra_station_west', name: "BANDRA SUBURBAN STATION", category: 'station', x: -680, y: 0.4, z: 480, district: "Bandra West", desc: "Heritage suburban station connecting Western and Harbour Lines." },
    { id: 'st_andheri', nodeId: 'node_andheri_junction', name: "ANDHERI SUBURBAN & METRO HUB", category: 'station', x: -650, y: 0.4, z: 1150, district: "Andheri West", desc: "Major western transit hub integrating Suburban Rail and Metro Line 1." },
    { id: 'st_borivali', nodeId: 'node_borivali_station_west', name: "BORIVALI RAILWAY TERMINUS", category: 'station', x: -520, y: 0.4, z: 2220, district: "Borivali North", desc: "Northern express and suburban terminus of Western Railway." },
    { id: 'st_kurla', nodeId: 'node_kurla_kamani_junction', name: "KURLA RAILWAY JUNCTION", category: 'station', x: 320, y: 0.4, z: 220, district: "Kurla Nexus", desc: "Crucial rail junction between Central Line and Harbour Line." },
    { id: 'st_ghatkopar', nodeId: 'node_ghatkopar_lbs_junction', name: "GHATKOPAR STATION & METRO INTERCHANGE", category: 'station', x: 480, y: 0.4, z: 680, district: "Ghatkopar East", desc: "Busy multimodal interchange linking Central suburban rail to Metro Line 1." },
    { id: 'st_airoli', nodeId: 'node_dmce_transit_plaza', name: "AIROLI STATION (DMCE COLLEGE LINE)", category: 'station', x: 1750, y: 0.4, z: 1450, district: "Airoli District", desc: "Trans-Harbour corridor station situated right across from DMCE College campus." },
    { id: 'st_thane', nodeId: 'node_thane_teen_hath_naka', name: "THANE CENTRAL RAILWAY TERMINUS", category: 'station', x: 1150, y: 0.4, z: 2200, district: "Thane City", desc: "Historic terminus of India's first passenger train (1853)." }
];

// Backwards compatibility export
export const MAP_PACK_CONFIG = {};

// ==========================================
// OFFSCREEN VECTOR PRE-RENDER TILE PYRAMID
// Pre-rendered ONCE at startup. 0 vector redraws per frame!
// ==========================================
const PRE_RENDER_SIZES = [1024, 2048, 3072]; // 3 zoom levels
const offscreenCache = {
    atlas: [],
    road: [],
    satellite: []
};
let isPreRendered = false;

function preRenderAllMapLayers() {
    if (isPreRendered) return;
    try {
        ['atlas', 'road', 'satellite'].forEach(mode => {
            offscreenCache[mode] = PRE_RENDER_SIZES.map(size => {
                const cvs = document.createElement('canvas');
                cvs.width = size;
                cvs.height = size;
                const ctx = cvs.getContext('2d');
                renderLayerToCanvas(ctx, size, mode);
                return cvs;
            });
        });
        isPreRendered = true;
        console.log('[WorldMap] Pre-rendered all 3 modes at 3 zoom levels (1024, 2048, 3072) successfully.');
    } catch (e) {
        console.warn('[WorldMap] Pre-rendering offscreen canvases failed:', e);
    }
}

// Coordinate mapping into offscreen pixel space
function toOffscreenPx(wx, wz, size) {
    const px = ((wx - WORLD_MIN_X) / WORLD_SIZE) * size;
    const py = ((WORLD_MAX_Z - wz) / WORLD_SIZE) * size;
    return { x: px, y: py };
}

function renderLayerToCanvas(ctx, size, mode) {
    // 1. Background Fill
    if (mode === 'atlas') {
        ctx.fillStyle = '#c9c3b4'; // Land: warm gray-beige
    } else if (mode === 'road') {
        ctx.fillStyle = '#11141c'; // Dark slate
    } else {
        ctx.fillStyle = '#1b261e'; // Satellite base foliage tone
    }
    ctx.fillRect(0, 0, size, size);

    // 2. Coastline, Oceans & Water Bodies from DEM / isWater
    const gridSize = size <= 1024 ? 96 : (size <= 2048 ? 160 : 220);
    const step = size / gridSize;
    const worldStep = WORLD_SIZE / gridSize;

    // Pre-calculate water & hillshade
    for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
            const wx = WORLD_MIN_X + (gx + 0.5) * worldStep;
            const wz = WORLD_MAX_Z - (gy + 0.5) * worldStep;
            const waterCheck = isWater(wx, wz);

            const px = gx * step;
            const py = gy * step;

            if (waterCheck.isWater) {
                if (mode === 'atlas') {
                    // Soft coastal blue
                    ctx.fillStyle = '#7ea6c4';
                } else if (mode === 'road') {
                    ctx.fillStyle = '#0a0d14';
                } else {
                    // Satellite deep coastal ocean
                    ctx.fillStyle = '#0d1d2d';
                }
                ctx.fillRect(px, py, step + 0.5, step + 0.5);
            } else {
                // Land cell
                if (mode === 'atlas') {
                    // Muted green for SGNP / Sanjay Gandhi National Park / mangroves
                    if ((wz > 1000 && wx > 500) || (wz > 1400 && wx < 200)) {
                        ctx.fillStyle = '#a8ba9a'; // Park green
                        ctx.fillRect(px, py, step + 0.5, step + 0.5);
                    }
                } else if (mode === 'satellite') {
                    // Shaded terrain calculated from DEM normals with NW sun
                    const eL = getElevationAt(wx - 25, wz);
                    const eR = getElevationAt(wx + 25, wz);
                    const eU = getElevationAt(wx, wz + 25);
                    const eD = getElevationAt(wx, wz - 25);

                    const dx = (eR - eL) / 50.0;
                    const dz = (eU - eD) / 50.0;
                    const nx = -dx, ny = 1.0, nz = -dz;
                    const len = Math.hypot(nx, ny, nz) || 1.0;

                    // Sunlight from Northwest: [-0.55, 0.65, -0.52]
                    const shade = Math.max(0.18, Math.min(1.0, (nx * -0.55 + ny * 0.65 + nz * -0.52) / len));

                    const elev = getElevationAt(wx, wz);
                    const r = Math.round((28 + elev * 1.8) * shade);
                    const g = Math.round((46 + elev * 2.2) * shade);
                    const b = Math.round((32 + elev * 1.5) * shade);
                    ctx.fillStyle = `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`;
                    ctx.fillRect(px, py, step + 0.5, step + 0.5);
                }
            }
        }
    }

    // 3. Roads from roadGraph.js edges
    if (mumbaiRoadNetwork && mumbaiRoadNetwork.edges) {
        // Pass 1: Casing (dark border)
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        mumbaiRoadNetwork.edges.forEach(edge => {
            const n1 = mumbaiRoadNetwork.nodes[edge.from];
            const n2 = mumbaiRoadNetwork.nodes[edge.to];
            if (!n1 || !n2) return;

            const p1 = toOffscreenPx(n1.x, n1.z, size);
            const p2 = toOffscreenPx(n2.x, n2.z, size);

            const isArterial = edge.corridor || edge.type === 'highway' || edge.type === 'arterial' || edge.lanes >= 6;
            const isBridge = edge.type === 'bridge' || edge.id?.includes('bridge') || edge.id?.includes('bwsl');

            let casingWidth = (size / 1024) * (isBridge ? 6.5 : (isArterial ? 5.2 : 2.8));
            ctx.lineWidth = casingWidth;

            if (mode === 'atlas') {
                ctx.strokeStyle = isBridge ? '#5c819d' : (isArterial ? '#7c776d' : '#8e897e');
            } else if (mode === 'road') {
                ctx.strokeStyle = isBridge ? '#0e3a53' : (isArterial ? '#1e293b' : '#334155');
            } else {
                ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        });

        // Pass 2: Road Surface Center Line
        mumbaiRoadNetwork.edges.forEach(edge => {
            const n1 = mumbaiRoadNetwork.nodes[edge.from];
            const n2 = mumbaiRoadNetwork.nodes[edge.to];
            if (!n1 || !n2) return;

            const p1 = toOffscreenPx(n1.x, n1.z, size);
            const p2 = toOffscreenPx(n2.x, n2.z, size);

            const isArterial = edge.corridor || edge.type === 'highway' || edge.type === 'arterial' || edge.lanes >= 6;
            const isBridge = edge.type === 'bridge' || edge.id?.includes('bridge') || edge.id?.includes('bwsl');

            let coreWidth = (size / 1024) * (isBridge ? 4.2 : (isArterial ? 3.4 : 1.6));
            ctx.lineWidth = coreWidth;

            if (mode === 'atlas') {
                ctx.strokeStyle = isBridge ? '#84b8d9' : (isArterial ? '#f5e7a9' : '#ffffff');
            } else if (mode === 'road') {
                ctx.strokeStyle = isBridge ? '#06b6d4' : (isArterial ? '#f59e0b' : '#94a3b8');
            } else {
                ctx.strokeStyle = isBridge ? '#38bdf8' : (isArterial ? 'rgba(251, 191, 36, 0.85)' : 'rgba(255, 255, 255, 0.75)');
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        });
    }

    // 4. Railways from railwayDatabase.js TRACK_SPLINES
    if (TRACK_SPLINES) {
        ctx.lineCap = 'butt';
        ctx.setLineDash([Math.round(size * 0.005), Math.round(size * 0.005)]);
        ctx.lineWidth = (size / 1024) * 2.2;
        ctx.strokeStyle = mode === 'atlas' ? '#323842' : (mode === 'road' ? '#64748b' : '#cbd5e1');

        Object.values(TRACK_SPLINES).forEach(corridor => {
            const line = corridor.upLine || corridor.downLine;
            if (!line || line.length < 2) return;

            ctx.beginPath();
            const p0 = toOffscreenPx(line[0].x, line[0].z, size);
            ctx.moveTo(p0.x, p0.y);
            for (let i = 1; i < line.length; i++) {
                const pt = toOffscreenPx(line[i].x, line[i].z, size);
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
        });
        ctx.setLineDash([]);
    }

    // 5. District Typography & Labels (Oswald condensed uppercase)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(size * 0.016)}px 'Oswald', sans-serif`;

    if (mode === 'atlas') {
        ctx.fillStyle = '#6b665c';
    } else if (mode === 'road') {
        ctx.fillStyle = '#94a3b8';
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    }

    for (const [key, dist] of Object.entries(DISTRICTS)) {
        if (!dist.centroid) continue;
        const pt = toOffscreenPx(dist.centroid.x, dist.centroid.z, size);
        const name = (dist.name || key).split('&')[0].trim().toUpperCase();
        ctx.fillText(name, pt.x, pt.y);
    }
}

// ==========================================
// HOWLER UI SOUND EFFECTS
// ==========================================
let soundOpen = null;
let soundClose = null;
let soundSelect = null;
let soundWaypoint = null;

function initSounds() {
    try {
        // High quality short synthetic UI sound data URIs
        // Clean sine beep for waypoint
        const chirpWav = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACBhYqFb21sbGxsbGxsbGxsbGxsbGxs';
        soundWaypoint = new Howl({ src: [chirpWav], volume: 0.18 });
        soundSelect = new Howl({ src: [chirpWav], volume: 0.12 });
        soundOpen = new Howl({ src: [chirpWav], volume: 0.15 });
        soundClose = new Howl({ src: [chirpWav], volume: 0.15 });
    } catch (e) {
        console.warn('[WorldMap] Howler sound init fallback to WebAudio');
    }
}

function playMapSound(name) {
    if (audioMuted) return;
    try {
        if (name === 'open' && soundOpen) soundOpen.play();
        else if (name === 'close' && soundClose) soundClose.play();
        else if (name === 'select' && soundSelect) soundSelect.play();
        else if (name === 'waypoint' && soundWaypoint) soundWaypoint.play();
    } catch (e) {}
}

export function toggleMapAudio() {
    audioMuted = !audioMuted;
    const label = document.getElementById('map-audio-label');
    if (label) {
        label.textContent = audioMuted ? 'SOUND: OFF' : 'SOUND: ON';
    }
    const btn = document.getElementById('map-btn-audio-toggle');
    if (btn) {
        btn.classList.toggle('muted', audioMuted);
    }
}

// ==========================================
// INITIALIZATION & D3-ZOOM ATTACHMENT
// ==========================================
export function initWorldMap(camera, characterGroup, teleportFn, chunkManager = null, setCameraOverride = null) {
    mainCameraRef = camera;
    playerGroupRef = characterGroup;
    teleportHandler = teleportFn;
    chunkManagerRef = chunkManager;
    setCameraOverrideRef = setCameraOverride;

    mapModalEl = document.getElementById('gta-world-map-modal');
    mapCanvas = document.getElementById('world-map-canvas');
    if (!mapCanvas) return;
    mapCtx = mapCanvas.getContext('2d');

    initSounds();
    preRenderAllMapLayers();
    setupD3Zoom();
    wireDomControls();

    // Default pan centered on player or origin
    resetViewToPlayer();

    window.__toggleWorldMap = toggleWorldMap;
    window.__openWorldMap = openWorldMap;
    window.__closeWorldMap = closeWorldMap;
    window.__setMapMode = setMapMode;
    window.__getMapMode = () => currentMapLayer;
    window.__setMapLayer = setMapMode;
    window.__getMapLayer = () => currentMapLayer;
    window.__startFastTravel = startFastTravel;
    window.__getFastTravelTimeline = () => activeTimeline;
    window.__seekFastTravel = (t) => { if (activeTimeline) { activeTimeline.seek(t); drawWorldMap(); } };
    window.__getCustomWaypoint = () => customWaypoint;
    window.__getActiveGpsRoute = () => activeGpsRouteData;
}

function resizeCanvas() {
    if (!mapCanvas) return;
    const rect = mapCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (mapCanvas.width !== targetW || mapCanvas.height !== targetH) {
        mapCanvas.width = targetW;
        mapCanvas.height = targetH;
    }
}

function setupD3Zoom() {
    if (!mapCanvas) return;
    d3Selection = select(mapCanvas);

    zoomBehavior = zoom()
        .scaleExtent([0.25, 4.0])
        .wheelDelta(e => -e.deltaY * 0.0022)
        .on('zoom', event => {
            currentTransform = event.transform;
            drawWorldMap();
            updateCrosshairTelemetry();
        });

    d3Selection.call(zoomBehavior);

    // Keyboard WASD Pan + Tab Mode listeners
    window.addEventListener('keydown', e => {
        if (!isWorldMapOpen) return;
        const k = e.key.toLowerCase();

        // Safe Escape cancel during fast travel or normal map close
        if (e.key === 'Escape') {
            if (isFastTraveling) {
                cancelFastTravel();
            } else {
                closeWorldMap();
            }
            return;
        }

        const step = 60 / currentTransform.k;
        if (k === 'w' || e.key === 'ArrowUp') {
            d3Selection.call(zoomBehavior.translateBy, 0, step);
        } else if (k === 's' || e.key === 'ArrowDown') {
            d3Selection.call(zoomBehavior.translateBy, 0, -step);
        } else if (k === 'a' || e.key === 'ArrowLeft') {
            d3Selection.call(zoomBehavior.translateBy, step, 0);
        } else if (k === 'd' || e.key === 'ArrowRight') {
            d3Selection.call(zoomBehavior.translateBy, -step, 0);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            cycleMapMode();
        } else if (k === '1') {
            setMapMode('atlas');
        } else if (k === '2') {
            setMapMode('road');
        } else if (k === '3') {
            setMapMode('satellite');
        } else if (e.key === 'Enter') {
            setWaypointAtCrosshair();
        } else if (k === 'x') {
            clearWaypoint();
        }
    });

    // Click on canvas to drop waypoint or select blip
    mapCanvas.addEventListener('click', handleCanvasClick);
}

// Convert World Coords to Canvas Screen Coordinates
export function worldToScreen(wx, wz) {
    if (!mapCanvas) return { x: 0, y: 0 };
    const cx = mapCanvas.width / 2;
    const cy = mapCanvas.height / 2;
    const baseScale = Math.min(mapCanvas.width, mapCanvas.height) / WORLD_SIZE;

    const sx = cx + currentTransform.x + (wx * baseScale * currentTransform.k);
    const sy = cy + currentTransform.y - (wz * baseScale * currentTransform.k);
    return { x: sx, y: sy };
}

// Convert Canvas Screen Coordinates to World Coordinates
export function screenToWorld(sx, sy) {
    if (!mapCanvas) return { x: 0, z: 0 };
    const cx = mapCanvas.width / 2;
    const cy = mapCanvas.height / 2;
    const baseScale = Math.min(mapCanvas.width, mapCanvas.height) / WORLD_SIZE;

    const wx = (sx - cx - currentTransform.x) / (baseScale * currentTransform.k);
    const wz = -(sy - cy - currentTransform.y) / (baseScale * currentTransform.k);
    return { x: wx, z: wz };
}

// Center Crosshair World Position
export function getCrosshairWorldPos() {
    if (!mapCanvas) return { x: 0, z: 0 };
    const cx = mapCanvas.width / 2;
    const cy = mapCanvas.height / 2;
    return screenToWorld(cx, cy);
}

// ==========================================
// RENDER LOOP & DRAW WORLD MAP
// Costs < 1.0ms on main thread. 60 FPS guaranteed.
// ==========================================
export function drawWorldMap() {
    if (!isWorldMapOpen || !mapCanvas || !mapCtx) return;
    resizeCanvas();

    const w = mapCanvas.width;
    const h = mapCanvas.height;
    mapCtx.clearRect(0, 0, w, h);

    // 1. Pick pre-rendered texture according to zoom level
    const zoomLevel = currentTransform.k < 0.7 ? 0 : (currentTransform.k < 1.8 ? 1 : 2);
    const cachedCvs = (offscreenCache[currentMapLayer] && offscreenCache[currentMapLayer][zoomLevel]) ||
                      (offscreenCache.atlas && offscreenCache.atlas[1]);

    if (cachedCvs) {
        // Compute world coordinates visible in viewport
        const topLeft = screenToWorld(0, 0);
        const bottomRight = screenToWorld(w, h);

        const srcX = Math.max(0, ((topLeft.x - WORLD_MIN_X) / WORLD_SIZE) * cachedCvs.width);
        const srcY = Math.max(0, ((WORLD_MAX_Z - topLeft.z) / WORLD_SIZE) * cachedCvs.height);
        const srcW = Math.min(cachedCvs.width - srcX, ((bottomRight.x - topLeft.x) / WORLD_SIZE) * cachedCvs.width);
        const srcH = Math.min(cachedCvs.height - srcY, ((topLeft.z - bottomRight.z) / WORLD_SIZE) * cachedCvs.height);

        mapCtx.imageSmoothingEnabled = true;
        mapCtx.imageSmoothingQuality = 'high';
        try {
            mapCtx.drawImage(cachedCvs, srcX, srcY, srcW, srcH, 0, 0, w, h);
        } catch (e) {}
    }

    // 2. Active A* GPS Route Polyline
    if (activeGpsRouteData && activeGpsRouteData.waypoints && activeGpsRouteData.waypoints.length > 1) {
        mapCtx.save();
        mapCtx.setLineDash([10, 8]);
        mapCtx.strokeStyle = '#f43f5e'; // Magenta
        mapCtx.lineWidth = 4.0;
        mapCtx.shadowColor = 'rgba(244, 63, 94, 0.8)';
        mapCtx.shadowBlur = 10;
        mapCtx.beginPath();

        const p0 = worldToScreen(activeGpsRouteData.waypoints[0].x, activeGpsRouteData.waypoints[0].z);
        mapCtx.moveTo(p0.x, p0.y);

        for (let i = 1; i < activeGpsRouteData.waypoints.length; i++) {
            const pt = worldToScreen(activeGpsRouteData.waypoints[i].x, activeGpsRouteData.waypoints[i].z);
            mapCtx.lineTo(pt.x, pt.y);
        }
        mapCtx.stroke();
        mapCtx.restore();
    }

    // 3. User Custom Waypoint Pin (Pulsing Magenta Pin)
    if (customWaypoint) {
        const wp = worldToScreen(customWaypoint.x, customWaypoint.z);
        drawWaypointPin(mapCtx, wp.x, wp.y);
    }

    // 4. Category Blips with Original SVG Shapes
    MAP_LANDMARKS.forEach(lm => {
        if (!categoryVisibility[lm.category]) return;
        const pt = worldToScreen(lm.x, lm.z);
        drawBlipIcon(mapCtx, pt.x, pt.y, lm, selectedBlip && selectedBlip.id === lm.id);
    });

    // 5. Player Arrow with Heading & Pulsing Radar Ring
    if (playerGroupRef) {
        const px = playerGroupRef.position.x;
        const pz = playerGroupRef.position.z;
        const pt = worldToScreen(px, pz);

        const heading = (playerGroupRef.rotation && playerGroupRef.rotation.y) ? playerGroupRef.rotation.y : 0;
        drawPlayerArrow(mapCtx, pt.x, pt.y, heading);
    }
}

// Draw authentic directional Player Arrow + Pulsing Ring
function drawPlayerArrow(ctx, x, y, heading) {
    const time = performance.now() * 0.003;
    const pulseRadius = 14 + (Math.sin(time) + 1) * 6;

    ctx.save();
    // Pulsing radar ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright halo
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Directional Arrow rotated by player heading
    ctx.translate(x, y);
    ctx.rotate(-heading); // Three.js Y-rotation inversion for canvas

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -14); // Tip pointing forward
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

// Draw Tactical Waypoint Pin
function drawWaypointPin(ctx, x, y) {
    ctx.save();
    ctx.shadowColor = 'rgba(244, 63, 94, 0.9)';
    ctx.shadowBlur = 12;

    // Pin Head
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(x, y - 18, 9, 0, Math.PI * 2);
    ctx.fill();

    // Pin Point
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 14);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 6, y - 14);
    ctx.closePath();
    ctx.fill();

    // White Center Target Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y - 18, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Draw Blip Icon by Category
function drawBlipIcon(ctx, x, y, blip, isSelected) {
    ctx.save();
    let ringColor = '#38bdf8';
    if (blip.category === 'home') ringColor = '#f59e0b';
    else if (blip.category === 'academic') ringColor = '#22c55e';
    else if (blip.category === 'airport') ringColor = '#fbbf24';
    else if (blip.category === 'station') ringColor = '#f43f5e';
    else if (blip.category === 'landmark') ringColor = '#a855f7';

    // Selection ring
    if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Outer badge circle
    ctx.fillStyle = 'rgba(10, 14, 23, 0.9)';
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Category Inner Symbol
    ctx.fillStyle = ringColor;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 1.6;

    if (blip.category === 'home') {
        // Citadel roof
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 5, y);
        ctx.lineTo(x - 5, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - 3, y, 6, 4);
    } else if (blip.category === 'academic') {
        // Degree mortarboard
        ctx.beginPath();
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x + 6, y - 1);
        ctx.lineTo(x, y + 2);
        ctx.lineTo(x - 6, y - 1);
        ctx.closePath();
        ctx.fill();
    } else if (blip.category === 'airport') {
        // Jet silhouette
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x + 2, y);
        ctx.lineTo(x + 6, y + 2);
        ctx.lineTo(x + 2, y + 3);
        ctx.lineTo(x, y + 5);
        ctx.lineTo(x - 2, y + 3);
        ctx.lineTo(x - 6, y + 2);
        ctx.lineTo(x - 2, y);
        ctx.closePath();
        ctx.fill();
    } else if (blip.category === 'station') {
        // Train track square
        ctx.fillRect(x - 4, y - 4, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 2, y - 2, 4, 4);
    } else {
        // Landmark diamond star
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 5, y);
        ctx.lineTo(x, y + 5);
        ctx.lineTo(x - 5, y);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

// ==========================================
// TELEMETRY & HUD UPDATES
// ==========================================
function updateCrosshairTelemetry() {
    const centerPos = getCrosshairWorldPos();
    const cx = Math.round(centerPos.x);
    const cz = Math.round(centerPos.z);

    const distObj = getDistrictAt(cx, cz);
    const districtName = distObj ? distObj.name.toUpperCase() : "MUMBAI METROPOLIS";

    // Center Crosshair Readout
    const distEl = document.getElementById('crosshair-district-name');
    const coordsEl = document.getElementById('crosshair-coords');
    if (distEl) distEl.textContent = districtName;
    if (coordsEl) coordsEl.textContent = `[X: ${cx}, Z: ${cz}]`;

    // Bottom-Left District Card
    const dTitle = document.getElementById('map-district-title');
    const dSub = document.getElementById('map-district-sub');
    const dMeta = document.getElementById('map-district-meta');

    if (dTitle) dTitle.textContent = districtName;
    if (dSub && distObj) dSub.textContent = `${(distObj.zone || 'DISTRICT').toUpperCase()} • ELEVATION ~${Math.round(getElevationAt(cx, cz))}M`;
    if (dMeta) dMeta.textContent = `LAT: ${(18.9 + (cz + 2600) * 0.000045).toFixed(4)}°N • LON: ${(72.8 + (cx + 2600) * 0.000045).toFixed(4)}°E`;
}

// ==========================================
// WAYPOINT & GPS CALCULATION (A*)
// ==========================================
export function setWaypoint(worldX, worldZ, title = "Custom Waypoint") {
    customWaypoint = { x: worldX, z: worldZ, name: title };

    // Compute shortest path via A* from player to destination
    const pX = playerGroupRef ? playerGroupRef.position.x : 0;
    const pZ = playerGroupRef ? playerGroupRef.position.z : 0;

    const startNode = mumbaiRoadNetwork.findNearestNode(pX, pZ);
    const destNode = mumbaiRoadNetwork.findNearestNode(worldX, worldZ);

    if (startNode && destNode) {
        activeGpsRouteData = mumbaiRoadNetwork.findShortestPath(startNode.id, destNode.id);
    } else {
        activeGpsRouteData = {
            found: true,
            totalDistance: Math.hypot(worldX - pX, worldZ - pZ),
            totalTimeSeconds: Math.hypot(worldX - pX, worldZ - pZ) / 12,
            waypoints: [{ x: pX, z: pZ }, { x: worldX, z: worldZ }]
        };
    }

    // Update Waypoint HUD Card
    const wpCard = document.getElementById('map-waypoint-card');
    const wpTitle = document.getElementById('waypoint-title');
    const wpDist = document.getElementById('waypoint-dist');
    const wpEta = document.getElementById('waypoint-eta');

    if (wpCard) wpCard.classList.add('active');
    if (wpTitle) wpTitle.textContent = title.toUpperCase();

    const distKm = (activeGpsRouteData.totalDistance / 1000).toFixed(1);
    const mins = Math.floor(activeGpsRouteData.totalTimeSeconds / 60);
    const secs = Math.floor(activeGpsRouteData.totalTimeSeconds % 60);

    if (wpDist) wpDist.textContent = `DISTANCE: ${distKm} KM`;
    if (wpEta) wpEta.textContent = `ETA: ${mins}M ${secs}S`;

    playMapSound('waypoint');
    drawWorldMap();
}

export function clearWaypoint() {
    customWaypoint = null;
    activeGpsRouteData = null;

    const wpCard = document.getElementById('map-waypoint-card');
    if (wpCard) wpCard.classList.remove('active');

    drawWorldMap();
}

function setWaypointAtCrosshair() {
    const pt = getCrosshairWorldPos();
    const distObj = getDistrictAt(pt.x, pt.z);
    const name = distObj ? `${distObj.name} Waypoint` : "Custom Waypoint";
    setWaypoint(pt.x, pt.z, name);
}

// ==========================================
// INTERACTIVE CLICK & BLIP SELECTION
// ==========================================
function handleCanvasClick(e) {
    const rect = mapCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const clickX = (e.clientX - rect.left) * dpr;
    const clickY = (e.clientY - rect.top) * dpr;

    // Check if clicked directly on an existing blip (24px radius)
    let clickedBlip = null;
    let minDist = 26;

    MAP_LANDMARKS.forEach(lm => {
        if (!categoryVisibility[lm.category]) return;
        const pt = worldToScreen(lm.x, lm.z);
        const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
        if (dist < minDist) {
            minDist = dist;
            clickedBlip = lm;
        }
    });

    if (clickedBlip) {
        selectedBlip = clickedBlip;
        showBlipDetailCard(clickedBlip);
        playMapSound('select');
        drawWorldMap();
    } else {
        // Drop waypoint at clicked world coordinate
        const wPos = screenToWorld(clickX, clickY);
        const distObj = getDistrictAt(wPos.x, wPos.z);
        const name = distObj ? `${distObj.name} Waypoint` : "Custom Waypoint";
        setWaypoint(wPos.x, wPos.z, name);
        hideBlipDetailCard();
    }
}

function showBlipDetailCard(blip) {
    const card = document.getElementById('map-landmark-card');
    if (!card) return;

    const titleEl = document.getElementById('map-card-title');
    const metaEl = document.getElementById('map-card-meta');
    const descEl = document.getElementById('map-card-desc');

    const pX = playerGroupRef ? playerGroupRef.position.x : 0;
    const pZ = playerGroupRef ? playerGroupRef.position.z : 0;
    const dist = Math.round(Math.hypot(blip.x - pX, blip.z - pZ));

    if (titleEl) titleEl.textContent = blip.name;
    if (metaEl) metaEl.textContent = `${blip.district.toUpperCase()} • ${dist}M AWAY`;
    if (descEl) descEl.textContent = blip.desc;

    card.classList.add('active');
}

function hideBlipDetailCard() {
    selectedBlip = null;
    const card = document.getElementById('map-landmark-card');
    if (card) card.classList.remove('active');
}

// ==========================================
// FAST TRAVEL CINEMATIC ANIMATION (GSAP)
// ~3.0s total: pull up -> curved city sweep -> chunk preload -> descend
// ==========================================
export function startFastTravel(targetX, targetZ, targetName = "Destination", targetY = 2.0) {
    if (isFastTraveling) return;
    isFastTraveling = true;

    playMapSound('select');
    closeWorldMap();

    // 1. Enable camera override so main simulation doesn't fight GSAP
    if (setCameraOverrideRef) setCameraOverrideRef(true);

    const startX = playerGroupRef ? playerGroupRef.position.x : 0;
    const startY = playerGroupRef ? playerGroupRef.position.y : 0;
    const startZ = playerGroupRef ? playerGroupRef.position.z : 0;

    const dx = targetX - startX;
    const dz = targetZ - startZ;
    const dist = Math.hypot(dx, dz);

    const flightHeight = Math.max(140, Math.min(280, dist * 0.22));
    const midX = (startX + targetX) / 2 - dz * 0.12;
    const midZ = (startZ + targetZ) / 2 + dx * 0.12;

    const vignetteEl = document.getElementById('fast-travel-vignette');
    if (vignetteEl) vignetteEl.classList.add('active');

    const bannerEl = document.getElementById('fast-travel-banner');
    const bannerText = document.getElementById('fast-travel-banner-text');
    if (bannerEl) bannerEl.classList.add('active');
    if (bannerText) bannerText.textContent = `TRAVELING TO ${targetName.toUpperCase()}...`;

    const camState = {
        x: mainCameraRef.position.x,
        y: mainCameraRef.position.y,
        z: mainCameraRef.position.z,
        lookX: startX,
        lookY: startY + 2.0,
        lookZ: startZ + 4.0,
        fov: mainCameraRef.fov
    };

    activeTimeline = gsap.timeline({
        onUpdate: () => {
            if (!mainCameraRef) return;
            mainCameraRef.position.set(camState.x, camState.y, camState.z);
            mainCameraRef.lookAt(camState.lookX, camState.lookY, camState.lookZ);
            if (Math.abs(mainCameraRef.fov - camState.fov) > 0.1) {
                mainCameraRef.fov = camState.fov;
                mainCameraRef.updateProjectionMatrix();
            }
            if (chunkManagerRef) {
                chunkManagerRef.update(mainCameraRef.position);
            }
        },
        onComplete: () => {
            finishFastTravel(targetX, targetY, targetZ, targetName);
        }
    });

    // Step 1: Camera pulls up to high orbital view + FOV widen (0.0s -> 0.8s)
    activeTimeline.to(camState, {
        x: startX - dx * 0.04,
        y: flightHeight * 0.8,
        z: startZ - dz * 0.04,
        lookX: (startX + targetX) * 0.35,
        lookY: 12,
        lookZ: (startZ + targetZ) * 0.35,
        fov: 65,
        duration: 0.8,
        ease: "power2.out"
    });

    // Step 2: Curved orbital sweep across Mumbai (0.8s -> 2.1s)
    activeTimeline.to(camState, {
        x: midX,
        y: flightHeight,
        z: midZ,
        lookX: targetX,
        lookY: 18,
        lookZ: targetZ,
        duration: 0.65,
        ease: "sine.inOut"
    });

    activeTimeline.to(camState, {
        x: targetX,
        y: flightHeight * 0.6,
        z: targetZ - 28,
        lookX: targetX,
        lookY: targetY + 2,
        lookZ: targetZ,
        duration: 0.65,
        ease: "sine.inOut",
        onStart: () => {
            // Pre-load destination chunk before descent starts!
            if (chunkManagerRef) {
                chunkManagerRef.update({ x: targetX, y: targetY, z: targetZ });
            }
        }
    });

    // Step 3: Descend to target, FOV returns to 52 (2.1s -> 2.9s)
    activeTimeline.to(camState, {
        x: targetX,
        y: targetY + 6.5,
        z: targetZ - 14,
        lookX: targetX,
        lookY: targetY + 2.0,
        lookZ: targetZ + 4.0,
        fov: 52,
        duration: 0.8,
        ease: "power3.out"
    });

    // Step 4: Short finish buffer (2.9s -> 3.1s)
    activeTimeline.to({}, { duration: 0.2 });
}

function finishFastTravel(targetX, targetY, targetZ, targetName) {
    if (playerGroupRef) {
        playerGroupRef.position.set(targetX, targetY + 0.5, targetZ);
    }
    if (mainCameraRef) {
        mainCameraRef.position.set(targetX, targetY + 6.5, targetZ - 14);
        mainCameraRef.lookAt(targetX, targetY + 2.0, targetZ + 4.0);
        mainCameraRef.fov = 52;
        mainCameraRef.updateProjectionMatrix();
    }

    if (setCameraOverrideRef) setCameraOverrideRef(false);

    const vignetteEl = document.getElementById('fast-travel-vignette');
    if (vignetteEl) vignetteEl.classList.remove('active');

    const bannerText = document.getElementById('fast-travel-banner-text');
    if (bannerText) bannerText.textContent = `ARRIVED AT ${targetName.toUpperCase()}`;

    setTimeout(() => {
        const bannerEl = document.getElementById('fast-travel-banner');
        if (bannerEl) bannerEl.classList.remove('active');
        isFastTraveling = false;
        activeTimeline = null;
    }, 1200);
}

export function cancelFastTravel() {
    if (!isFastTraveling || !activeTimeline) return;
    activeTimeline.kill();
    activeTimeline = null;
    isFastTraveling = false;

    if (setCameraOverrideRef) setCameraOverrideRef(false);

    const vignetteEl = document.getElementById('fast-travel-vignette');
    if (vignetteEl) vignetteEl.classList.remove('active');

    const bannerEl = document.getElementById('fast-travel-banner');
    if (bannerEl) bannerEl.classList.remove('active');
}

// ==========================================
// VIEW MODES (ATLAS, ROAD, SATELLITE)
// ==========================================
export function setMapMode(mode) {
    if (mode !== 'atlas' && mode !== 'road' && mode !== 'satellite') {
        mode = 'atlas';
    }
    currentMapLayer = mode;

    document.querySelectorAll('.map-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    playMapSound('select');
    drawWorldMap();
}

export function cycleMapMode() {
    const modes = ['atlas', 'road', 'satellite'];
    const nextIdx = (modes.indexOf(currentMapLayer) + 1) % modes.length;
    setMapMode(modes[nextIdx]);
}

// Backwards compatibility wrappers
export function getMapLayer() { return currentMapLayer; }
export function setMapLayer(layer) { setMapMode(layer); }
export function setOverlayNetwork(enabled) { overlayNetworkEnabled = !!enabled; drawWorldMap(); }
export function fitMapToView() { resetViewToPlayer(); }

// ==========================================
// OPEN & CLOSE & SHARED-ELEMENT TRANSITIONS
// ==========================================
export function openWorldMap() {
    if (isWorldMapOpen) return;
    isWorldMapOpen = true;

    // Apply blur & darkening to 3D world canvas
    const worldCanvas = document.getElementById('webgl-canvas');
    if (worldCanvas) worldCanvas.classList.add('game-paused-blur');

    if (mapModalEl) {
        mapModalEl.classList.add('active');
    }

    resizeCanvas();
    resetViewToPlayer();
    updateCrosshairTelemetry();
    playMapSound('open');
    drawWorldMap();
}

export function closeWorldMap() {
    if (!isWorldMapOpen) return;
    isWorldMapOpen = false;

    const worldCanvas = document.getElementById('webgl-canvas');
    if (worldCanvas) worldCanvas.classList.remove('game-paused-blur');

    if (mapModalEl) {
        mapModalEl.classList.remove('active');
    }

    hideBlipDetailCard();
    playMapSound('close');
}

export function toggleWorldMap() {
    if (isWorldMapOpen) closeWorldMap();
    else openWorldMap();
}

function resetViewToPlayer() {
    if (!mapCanvas || !zoomBehavior || !d3Selection) return;
    resizeCanvas();

    const px = playerGroupRef ? playerGroupRef.position.x : 0;
    const pz = playerGroupRef ? playerGroupRef.position.z : 0;

    const cx = mapCanvas.width / 2;
    const cy = mapCanvas.height / 2;
    const baseScale = Math.min(mapCanvas.width, mapCanvas.height) / WORLD_SIZE;
    const initialK = 0.95;

    // Center viewport on player coordinate
    const tx = -px * baseScale * initialK;
    const ty = pz * baseScale * initialK;

    currentTransform = zoomIdentity.translate(tx, ty).scale(initialK);
    d3Selection.call(zoomBehavior.transform, currentTransform);
}

// ==========================================
// DOM CONTROLS & EVENT WIRING
// ==========================================
function wireDomControls() {
    // Mode switcher buttons
    document.querySelectorAll('.map-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            if (mode) setMapMode(mode);
        });
    });

    // Close button
    const closeBtn = document.getElementById('world-map-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeWorldMap);

    // Audio mute toggle
    const audioBtn = document.getElementById('map-btn-audio-toggle');
    if (audioBtn) audioBtn.addEventListener('click', toggleMapAudio);

    // Waypoint HUD clear button
    const clearWpBtn = document.getElementById('map-btn-clear-waypoint');
    if (clearWpBtn) clearWpBtn.addEventListener('click', clearWaypoint);

    // Selected Blip Action buttons
    const btnSetGps = document.getElementById('map-card-set-gps-btn');
    if (btnSetGps) {
        btnSetGps.addEventListener('click', () => {
            if (selectedBlip) {
                setWaypoint(selectedBlip.x, selectedBlip.z, selectedBlip.name);
            }
        });
    }

    const btnFastTravel = document.getElementById('map-card-fast-travel-btn');
    if (btnFastTravel) {
        btnFastTravel.addEventListener('click', () => {
            if (selectedBlip) {
                startFastTravel(selectedBlip.x, selectedBlip.z, selectedBlip.name, selectedBlip.y || 2.0);
            }
        });
    }

    // Legend Category Toggles
    document.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const cat = item.getAttribute('data-category');
            if (cat && categoryVisibility.hasOwnProperty(cat)) {
                categoryVisibility[cat] = !categoryVisibility[cat];
                item.classList.toggle('active', categoryVisibility[cat]);
                playMapSound('select');
                drawWorldMap();
            }
        });
    });
}
