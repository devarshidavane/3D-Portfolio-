import { DISTRICTS, getDistrictAt, LANDMARKS } from '../data/mumbaiGeography.js';
import { mumbaiRoadNetwork } from '../data/roadGraph.js';
import { TRACK_SPLINES } from '../data/railwayDatabase.js';
import { playSound } from './hudOverlay.js';
import { setNavigationDestination, setCustomWaypoint, clearCustomWaypoint, customWaypoint, activeGpsRoute } from './minimapRadar.js';

// ==========================================
// GTA-STYLE INTERACTIVE FULLSCREEN WORLD MAP
// Satellite Vector Tactical Map, Pan, Zoom, Landmark Teleport,
// Real-time Player Beacon & Click-to-Place Custom GPS Waypoints
// ==========================================

export let isWorldMapOpen = false;

// Master Landmark Registry for GTA Map & Directory
export const MAP_LANDMARKS = [
    {
        id: 'school',
        nodeId: 'node_fr_agnel_school_gate',
        name: "Fr. Agnel Technical High School & Junior College",
        mr: "फादर आग्नेल तांत्रिक विद्यालय व कनिष्ठ महाविद्यालय",
        category: 'academic',
        icon: '🏫',
        color: '#06b6d4',
        x: -1350, y: 32.5, z: 490,
        district: "Bandra (West & East)",
        desc: "Historic technical high school & college campus situated on the Mount Mary ridge overlooking the Bandstand coastline and Arabian Sea."
    },
    {
        id: 'college',
        nodeId: 'node_dmce_main_gate',
        name: "Datta Meghe College of Engineering (DMCE)",
        mr: "दत्ता मेघे अभियांत्रिकी महाविद्यालय • ऐरोली",
        category: 'academic',
        icon: '🎓',
        color: '#22c55e',
        x: 1850, y: 12.5, z: 1410,
        district: "Airoli (Tech & Academic District)",
        desc: "Premier engineering institute in Sector 3 Airoli, Navi Mumbai. Features 8-storey academic blocks, computer AI labs, and college quadrangle."
    },
    {
        id: 'home',
        nodeId: 'node_homehq_plaza',
        name: "Devarshi's Home HQ & Stark Tower",
        mr: "स्टार्क टॉवर • धारावी कोळीवाडा (माहिम पूर्व)",
        category: 'landmark',
        icon: '🏠',
        color: '#f59e0b',
        x: 0, y: 8.5, z: -28,
        district: "Dharavi Koliwada & Mahim East",
        desc: "180m Cyber Skyscraper world origin (0,0). Houses cybersecurity lab, multi-floor tech command center, luxury penthouse, and 120m rooftop helipad."
    },
    {
        id: 'gateway',
        nodeId: 'node_gateway_waterfront',
        name: "Gateway of India & Apollo Bunder",
        mr: "गेटवे ऑफ इंडिया • कुलाबा",
        category: 'landmark',
        icon: '🏛️',
        color: '#a855f7',
        x: -350, y: 2.5, z: -2280,
        district: "Colaba & Apollo Bunder",
        desc: "Iconic 1924 basalt triumphal waterfront arch overlooking Mumbai Harbour and the Arabian Sea, adjacent to the historic Taj Mahal Palace."
    },
    {
        id: 'airport',
        nodeId: 'node_airport_parkway_east',
        name: "Chhatrapati Shivaji Maharaj International Airport (CSMIA)",
        mr: "छत्रपती शिवाजी महाराज आंतरराष्ट्रीय विमानतळ (T2)",
        category: 'transit',
        icon: '✈️',
        color: '#fbbf24',
        x: 150, y: 14.0, z: 1160,
        district: "Andheri (East & West)",
        desc: "International aviation hub with 360m runway 09/27, Terminal 2 concourse, active air traffic radar dish, and taxiway aprons."
    },
    {
        id: 'marine_drive',
        nodeId: 'node_marine_drive_central',
        name: "Marine Drive (Queen's Necklace)",
        mr: "मरीन ड्राईव्ह (राणीचा हार)",
        category: 'landmark',
        icon: '🌊',
        color: '#38bdf8',
        x: -850, y: 3.5, z: -1700,
        district: "Marine Drive & Nariman Point",
        desc: "Iconic 3km C-shaped coastal boulevard and promenade lining Back Bay, famous for sunset views and glittering night arc lights."
    },
    {
        id: 'haji_ali',
        nodeId: 'node_haji_ali_entrance',
        name: "Haji Ali Dargah (Worli Bay)",
        mr: "हाजी अली दर्गाह • वरळी",
        category: 'landmark',
        icon: '🕌',
        color: '#10b981',
        x: -1100, y: 2.0, z: -1150,
        district: "Worli & Lower Parel",
        desc: "15th-century Indo-Islamic tidal island shrine constructed on an offshore islet in Worli Bay, connected by a 500m causeway."
    },
    {
        id: 'bkc',
        nodeId: 'node_bkc_connector',
        name: "Bandra-Kurla Complex (BKC) Financial Hub",
        mr: "वांद्रे-कुर्ला संकुल (बी.के.सी.)",
        category: 'landmark',
        icon: '🏢',
        color: '#6366f1',
        x: 0, y: 5.0, z: 400,
        district: "Bandra (West & East)",
        desc: "Premier international business and finance district featuring corporate glass headquarters, luxury conventions, and diplomatic consulates."
    },
    {
        id: 'bwsl',
        nodeId: 'node_bwsl_cable_span_1',
        name: "Bandra-Worli Sea Link (Rajiv Gandhi Sea Link)",
        mr: "वांद्रे-वरळी सागरी सेतू",
        category: 'transit',
        icon: '🌉',
        color: '#0ea5e9',
        x: -1100, y: 18.0, z: 50,
        district: "Bandra (West & East)",
        desc: "Iconic 8-lane cable-stayed expressway viaduct spanning Mahim Bay across open ocean, supported by dual 82m diamond concrete pylon towers."
    },
    {
        id: 'airoli_bridge',
        nodeId: 'node_airoli_bridge_mid',
        name: "Airoli Bridge (Over Thane Creek)",
        mr: "ऐरोली पूल (ठाणे खाडी)",
        category: 'transit',
        icon: '🌉',
        color: '#38bdf8',
        x: 1350, y: 16.0, z: 1420,
        district: "Airoli (Tech & Academic District)",
        desc: "Major trans-creek arterial bridge connecting Mulund in Eastern Suburbs directly across Thane Creek into DMCE College avenue."
    },
    {
        id: 'vashi_bridge',
        nodeId: 'node_vashi_creek_bridge_mid',
        name: "Vashi Bridge (Sion-Panvel Highway)",
        mr: "वाशी पूल (सायन-पनवेल महामार्ग)",
        category: 'transit',
        icon: '🌉',
        color: '#38bdf8',
        x: 1200, y: 18.0, z: -400,
        district: "Vashi (Commercial & Harbor Gateway)",
        desc: "Key multi-lane marine bridge spanning Thane Creek, linking Mankhurd to Vashi and the southern Navi Mumbai metropolis."
    },
    // Major Suburban Railway Stations
    { id: 'st_churchgate', nodeId: 'node_churchgate_station', name: "Churchgate Railway Terminus", mr: "चर्चगेट", category: 'transit', icon: '🚆', color: '#f43f5e', x: -480, y: 0.4, z: -1920, district: "Fort & Heritage Quarter", desc: "Southern terminus of the Western Suburban Railway line." },
    { id: 'st_csmt', nodeId: 'node_csmt_heritage_junction', name: "CSMT Heritage Railway Terminus", mr: "छ.शि.म.ट.", category: 'transit', icon: '🚆', color: '#f43f5e', x: 120, y: 0.4, z: -1900, district: "Fort & Heritage Quarter", desc: "UNESCO World Heritage headquarters of Central Railway." },
    { id: 'st_dadar', nodeId: 'node_dadar_tt_circle', name: "Dadar Central & Western Interchange", mr: "दादर जंक्शन", category: 'transit', icon: '🚆', color: '#f43f5e', x: -380, y: 0.4, z: -320, district: "Dadar (Central Interchange)", desc: "Mumbai's busiest railway interchange connecting Western and Central corridors." },
    { id: 'st_bandra', nodeId: 'node_bandra_station_west', name: "Bandra Suburban Station", mr: "वांद्रे", category: 'transit', icon: '🚆', color: '#f43f5e', x: -680, y: 0.4, z: 480, district: "Bandra (West & East)", desc: "Heritage suburban station connecting Western and Harbour Lines." },
    { id: 'st_andheri', nodeId: 'node_andheri_junction', name: "Andheri Suburban & Metro Hub", mr: "अंधेरी", category: 'transit', icon: '🚆', color: '#f43f5e', x: -650, y: 0.4, z: 1150, district: "Andheri (East & West)", desc: "Major western transit hub integrating Suburban Rail and Metro Line 1." },
    { id: 'st_borivali', nodeId: 'node_borivali_station_west', name: "Borivali Railway Terminus", mr: "बोरिवली", category: 'transit', icon: '🚆', color: '#f43f5e', x: -520, y: 0.4, z: 2220, district: "Borivali & Gorai", desc: "Northern express and suburban terminus of Western Railway." },
    { id: 'st_kurla', nodeId: 'node_kurla_kamani_junction', name: "Kurla Railway Junction", mr: "कुर्ला", category: 'transit', icon: '🚆', color: '#f43f5e', x: 320, y: 0.4, z: 220, district: "Kurla & Chunabhatti", desc: "Crucial rail junction between Central Line and Harbour Line." },
    { id: 'st_ghatkopar', nodeId: 'node_ghatkopar_lbs_junction', name: "Ghatkopar Station & Metro Interchange", mr: "घाटकोपर", category: 'transit', icon: '🚆', color: '#f43f5e', x: 480, y: 0.4, z: 680, district: "Ghatkopar & Pant Nagar", desc: "Busy multimodal interchange linking Central suburban rail to Metro 1." },
    { id: 'st_airoli', nodeId: 'node_dmce_transit_plaza', name: "Airoli Station (DMCE College Line)", mr: "ऐरोली (डी.एम.सी.ई.)", category: 'transit', icon: '🚆', color: '#f43f5e', x: 1750, y: 0.4, z: 1450, district: "Airoli (Tech & Academic District)", desc: "Trans-Harbour corridor station situated right across from DMCE College campus." },
    { id: 'st_thane', nodeId: 'node_thane_teen_hath_naka', name: "Thane Central Railway Terminus", mr: "ठाणे", category: 'transit', icon: '🚆', color: '#f43f5e', x: 1150, y: 0.4, z: 2200, district: "Thane City (Historic Hub)", desc: "Historic terminus of India's first passenger train (1853)." }
];

let mapCanvas = null;
let mapCtx = null;
let teleportHandler = null;
let mainCameraRef = null;
let playerGroupRef = null;

// Map Viewport state
let mapPanX = 0;
let mapPanZ = 0;
let mapZoom = 0.17; // Initial zoom scale
let isDragging = false;
let dragStartX = 0;
let dragStartZ = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let selectedItem = null;
let activeFilter = 'all';
let searchQuery = '';

export function initWorldMap(camera, characterGroup, teleportFn) {
    mainCameraRef = camera;
    playerGroupRef = characterGroup;
    teleportHandler = teleportFn;

    mapCanvas = document.getElementById('world-map-canvas');
    if (!mapCanvas) return;
    mapCtx = mapCanvas.getContext('2d');

    // Default pan centered on player
    if (playerGroupRef) {
        mapPanX = playerGroupRef.position.x;
        mapPanZ = playerGroupRef.position.z;
    }

    setupMapEventListeners();
    renderLandmarkDirectory();
}

function resizeMapCanvas() {
    if (!mapCanvas) return;
    const rect = mapCanvas.parentElement.getBoundingClientRect();
    mapCanvas.width = rect.width * (window.devicePixelRatio > 1.2 ? 1.5 : 1);
    mapCanvas.height = rect.height * (window.devicePixelRatio > 1.2 ? 1.5 : 1);
}

function setupMapEventListeners() {
    if (!mapCanvas) return;

    // 1. Mouse Drag (Pan)
    mapCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 || e.button === 2) {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartZ = e.clientY;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isWorldMapOpen || !isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        // Translate pan based on zoom
        mapPanX -= dx / mapZoom;
        mapPanZ += dy / mapZoom; // Invert Z for world coordinate convention
        drawWorldMap();
    });

    window.addEventListener('mouseup', (e) => {
        if (!isWorldMapOpen) return;
        if (isDragging) {
            const dragDist = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartZ);
            isDragging = false;
            // If moved less than 5px, treat as click
            if (dragDist < 5) {
                handleMapClick(e);
            }
        }
    });

    // Prevent context menu on right click to allow setting waypoints
    mapCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleMapClick(e);
    });

    // 2. Mouse Wheel (Zoom centered on cursor)
    mapCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = mapCanvas.getBoundingClientRect();
        const mouseCanvasX = (e.clientX - rect.left) * (mapCanvas.width / rect.width);
        const mouseCanvasY = (e.clientY - rect.top) * (mapCanvas.height / rect.height);

        const worldBeforeX = mapPanX + (mouseCanvasX - mapCanvas.width / 2) / mapZoom;
        const worldBeforeZ = mapPanZ - (mouseCanvasY - mapCanvas.height / 2) / mapZoom;

        const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
        mapZoom = Math.max(0.065, Math.min(1.2, mapZoom * zoomFactor));

        // Adjust pan to keep world point under cursor fixed
        mapPanX = worldBeforeX - (mouseCanvasX - mapCanvas.width / 2) / mapZoom;
        mapPanZ = worldBeforeZ + (mouseCanvasY - mapCanvas.height / 2) / mapZoom;

        drawWorldMap();
    }, { passive: false });

    // 3. Touch Support for mobile / touchpads
    let touchStartX = 0, touchStartZ = 0;
    mapCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            touchStartX = e.touches[0].clientX;
            touchStartZ = e.touches[0].clientY;
            lastMouseX = touchStartX;
            lastMouseY = touchStartZ;
        }
    }, { passive: true });

    mapCanvas.addEventListener('touchmove', (e) => {
        if (!isWorldMapOpen || !isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - lastMouseX;
        const dy = e.touches[0].clientY - lastMouseY;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;

        mapPanX -= dx / mapZoom;
        mapPanZ += dy / mapZoom;
        drawWorldMap();
    }, { passive: true });

    mapCanvas.addEventListener('touchend', (e) => {
        if (isDragging) {
            isDragging = false;
        }
    });

    // 4. UI Controls (Zoom buttons, Re-center, Clear)
    const btnZoomIn = document.getElementById('map-btn-zoom-in');
    if (btnZoomIn) btnZoomIn.addEventListener('click', () => {
        mapZoom = Math.min(1.2, mapZoom * 1.25);
        drawWorldMap();
    });

    const btnZoomOut = document.getElementById('map-btn-zoom-out');
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => {
        mapZoom = Math.max(0.065, mapZoom * 0.8);
        drawWorldMap();
    });

    const btnRecenter = document.getElementById('map-btn-recenter');
    if (btnRecenter) btnRecenter.addEventListener('click', () => {
        if (playerGroupRef) {
            mapPanX = playerGroupRef.position.x;
            mapPanZ = playerGroupRef.position.z;
            mapZoom = 0.22;
            playSound('chime');
            drawWorldMap();
        }
    });

    const btnClearWp = document.getElementById('map-btn-clear-waypoint');
    if (btnClearWp) btnClearWp.addEventListener('click', () => {
        clearCustomWaypoint();
        selectedItem = null;
        hideLandmarkDetailCard();
        playSound('chime');
        drawWorldMap();
    });

    // Close button
    const btnClose = document.getElementById('world-map-close-btn');
    if (btnClose) btnClose.addEventListener('click', closeWorldMap);

    // Search bar
    const searchInput = document.getElementById('map-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderLandmarkDirectory();
        });
    }

    // Filter tabs
    const filterTabs = document.querySelectorAll('.map-filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.getAttribute('data-filter') || 'all';
            renderLandmarkDirectory();
            drawWorldMap();
        });
    });

    // Detail card action buttons
    const btnSetGps = document.getElementById('map-card-set-gps-btn');
    if (btnSetGps) {
        btnSetGps.addEventListener('click', () => {
            if (selectedItem) {
                if (selectedItem.isCustom) {
                    setCustomWaypoint(selectedItem.x, selectedItem.z, selectedItem.name);
                } else {
                    setNavigationDestination(selectedItem.nodeId || selectedItem.id);
                }
                playSound('waypoint');
                drawWorldMap();
            }
        });
    }

    const btnFastTravel = document.getElementById('map-card-fast-travel-btn');
    if (btnFastTravel) {
        btnFastTravel.addEventListener('click', () => {
            if (selectedItem && teleportHandler) {
                playSound('teleport');
                teleportHandler(selectedItem.x, selectedItem.z, selectedItem.name, selectedItem.y || 2.0, mainCameraRef);
                closeWorldMap();
            }
        });
    }
}

// Convert World Coords to Canvas Screen Coords
function worldToScreen(wx, wz) {
    const cx = mapCanvas.width / 2;
    const cy = mapCanvas.height / 2;
    return {
        x: cx + (wx - mapPanX) * mapZoom,
        y: cy - (wz - mapPanZ) * mapZoom // Inverted Z
    };
}

// Convert Canvas Screen Coords to World Coords
function screenToWorld(sx, sy) {
    const cx = mapCanvas.width / 2;
    const cy = mapCanvas.height / 2;
    return {
        x: mapPanX + (sx - cx) / mapZoom,
        z: mapPanZ - (sy - cy) / mapZoom
    };
}

function handleMapClick(e) {
    const rect = mapCanvas.getBoundingClientRect();
    const clickCanvasX = (e.clientX - rect.left) * (mapCanvas.width / rect.width);
    const clickCanvasY = (e.clientY - rect.top) * (mapCanvas.height / rect.height);
    const clickedWorld = screenToWorld(clickCanvasX, clickCanvasY);

    // 1. Check if clicked near an existing landmark blip (within 24px radius)
    let clickedBlip = null;
    let minDist = 26;

    MAP_LANDMARKS.forEach(lm => {
        if (activeFilter !== 'all' && lm.category !== activeFilter) return;
        const pt = worldToScreen(lm.x, lm.z);
        const dist = Math.hypot(pt.x - clickCanvasX, pt.y - clickCanvasY);
        if (dist < minDist) {
            minDist = dist;
            clickedBlip = lm;
        }
    });

    if (clickedBlip) {
        selectedItem = clickedBlip;
        showLandmarkDetailCard(clickedBlip);
        playSound('chime');
        drawWorldMap();
        return;
    }

    // 2. Otherwise: Left-Click or Right-Click drops a CUSTOM GPS WAYPOINT!
    setCustomWaypoint(clickedWorld.x, clickedWorld.z, "Custom GPS Waypoint");
    selectedItem = {
        name: "Custom GPS Waypoint",
        mr: "कस्टम जीपीएस वेपॉइंट",
        category: 'waypoint',
        icon: '📍',
        color: '#f43f5e',
        x: clickedWorld.x,
        y: 2.0,
        z: clickedWorld.z,
        district: getDistrictAt(clickedWorld.x, clickedWorld.z)?.name || "Mumbai Metropolitan",
        desc: `Custom user-placed navigation waypoint at world coordinates (${Math.round(clickedWorld.x)}, ${Math.round(clickedWorld.z)}). Active A* GPS route calculated to the nearest road network node.`,
        isCustom: true
    };
    showLandmarkDetailCard(selectedItem);
    playSound('waypoint');
    drawWorldMap();
}

export function openWorldMap() {
    isWorldMapOpen = true;
    const modal = document.getElementById('gta-world-map-modal');
    if (modal) modal.classList.add('active');

    if (playerGroupRef) {
        mapPanX = playerGroupRef.position.x;
        mapPanZ = playerGroupRef.position.z;
    }

    resizeMapCanvas();
    updateMapHeaderInfo();
    drawWorldMap();
    playSound('chime');
}

export function closeWorldMap() {
    isWorldMapOpen = false;
    const modal = document.getElementById('gta-world-map-modal');
    if (modal) modal.classList.remove('active');
    hideLandmarkDetailCard();
}

export function toggleWorldMap() {
    if (isWorldMapOpen) closeWorldMap();
    else openWorldMap();
}

function updateMapHeaderInfo() {
    if (!playerGroupRef) return;
    const px = Math.round(playerGroupRef.position.x);
    const py = (playerGroupRef.position.y).toFixed(1);
    const pz = Math.round(playerGroupRef.position.z);

    const distObj = getDistrictAt(px, pz);
    const distName = distObj ? distObj.name : "Mumbai Metropolitan";

    const coordsEl = document.getElementById('map-header-coords');
    if (coordsEl) coordsEl.textContent = `📍 ${distName} • X: ${px} | Y: ${py}m | Z: ${pz}`;
}

export function drawWorldMap() {
    if (!mapCanvas || !mapCtx || !isWorldMapOpen) return;
    const w = mapCanvas.width;
    const h = mapCanvas.height;

    mapCtx.clearRect(0, 0, w, h);

    // 1. Tactical Military Dark Navy Base
    mapCtx.fillStyle = '#050914';
    mapCtx.fillRect(0, 0, w, h);

    // 2. Coordinate Grid Lines
    mapCtx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    mapCtx.lineWidth = 1;
    const gridSpacing = 500; // 500m grid squares
    const startX = Math.floor((mapPanX - (w / 2) / mapZoom) / gridSpacing) * gridSpacing;
    const endX = Math.ceil((mapPanX + (w / 2) / mapZoom) / gridSpacing) * gridSpacing;
    const startZ = Math.floor((mapPanZ - (h / 2) / mapZoom) / gridSpacing) * gridSpacing;
    const endZ = Math.ceil((mapPanZ + (h / 2) / mapZoom) / gridSpacing) * gridSpacing;

    for (let gx = startX; gx <= endX; gx += gridSpacing) {
        const pt = worldToScreen(gx, 0);
        mapCtx.beginPath();
        mapCtx.moveTo(pt.x, 0);
        mapCtx.lineTo(pt.x, h);
        mapCtx.stroke();
    }
    for (let gz = startZ; gz <= endZ; gz += gridSpacing) {
        const pt = worldToScreen(0, gz);
        mapCtx.beginPath();
        mapCtx.moveTo(0, pt.y);
        mapCtx.lineTo(w, pt.y);
        mapCtx.stroke();
    }

    // 3. Water Bodies (Arabian Sea & Thane Creek)
    // Arabian Sea (West coast: x < -950)
    const seaScreen = worldToScreen(-950, 0);
    if (seaScreen.x > 0) {
        mapCtx.fillStyle = '#0b1e38';
        mapCtx.fillRect(0, 0, Math.min(w, Math.max(0, seaScreen.x)), h);

        // Coastline Shoreline Glow
        mapCtx.strokeStyle = '#0284c7';
        mapCtx.lineWidth = 2.5;
        mapCtx.beginPath();
        mapCtx.moveTo(seaScreen.x, 0);
        mapCtx.lineTo(seaScreen.x, h);
        mapCtx.stroke();
    }

    // Thane Creek (East waterway: x > 1150)
    const creekScreen = worldToScreen(1150, 0);
    if (creekScreen.x < w) {
        mapCtx.fillStyle = '#0b1e38';
        mapCtx.fillRect(Math.max(0, creekScreen.x), 0, w - Math.max(0, creekScreen.x), h);

        mapCtx.strokeStyle = '#0284c7';
        mapCtx.lineWidth = 2.5;
        mapCtx.beginPath();
        mapCtx.moveTo(creekScreen.x, 0);
        mapCtx.lineTo(creekScreen.x, h);
        mapCtx.stroke();
    }

    // 4. District Boundary Regions & Names
    if (DISTRICTS) {
        for (const [key, d] of Object.entries(DISTRICTS)) {
            const cen = worldToScreen(d.centroid.x, d.centroid.z);
            if (cen.x > -200 && cen.x < w + 200 && cen.y > -200 && cen.y < h + 200) {
                // Subtle district boundary box
                if (d.bounds) {
                    const tl = worldToScreen(d.bounds.minX, d.bounds.maxZ);
                    const br = worldToScreen(d.bounds.maxX, d.bounds.minZ);
                    mapCtx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
                    mapCtx.lineWidth = 1;
                    mapCtx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
                }

                // District Name Typography
                const fontSize = Math.max(10, Math.min(18, Math.round(14 * (mapZoom / 0.17))));
                mapCtx.font = `bold ${fontSize}px sans-serif`;
                mapCtx.fillStyle = 'rgba(226, 232, 240, 0.45)';
                mapCtx.textAlign = 'center';
                mapCtx.fillText(d.name.toUpperCase(), cen.x, cen.y);
            }
        }
    }

    // 5. Road Network Arterials & Bridges
    if (mumbaiRoadNetwork && mumbaiRoadNetwork.edges) {
        const edges = mumbaiRoadNetwork.edges;
        const nodes = mumbaiRoadNetwork.nodes;

        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];
            const u = nodes[edge.from];
            const v = nodes[edge.to];
            if (!u || !v) continue;

            const p1 = worldToScreen(u.x, u.z);
            const p2 = worldToScreen(v.x, v.z);

            // Culling
            if ((p1.x < 0 && p2.x < 0) || (p1.x > w && p2.x > w) || (p1.y < 0 && p2.y < 0) || (p1.y > h && p2.y > h)) continue;

            const isBridge = edge.bridge || edge.surface === 'sea_bridge' || edge.corridor === 'coastal_bridge';

            if (isBridge) {
                // Marine Bridge (Cyan glow)
                mapCtx.strokeStyle = '#38bdf8';
                mapCtx.lineWidth = Math.max(3, 4.5 * mapZoom * 4);
            } else if (edge.lanes >= 4) {
                // Major Expressway / Freeway (Gold)
                mapCtx.strokeStyle = '#f59e0b';
                mapCtx.lineWidth = Math.max(2, 3.5 * mapZoom * 4);
            } else {
                // Arterial / Local Street (Slate)
                mapCtx.strokeStyle = '#475569';
                mapCtx.lineWidth = Math.max(1.2, 2.2 * mapZoom * 4);
            }

            mapCtx.beginPath();
            mapCtx.moveTo(p1.x, p1.y);
            mapCtx.lineTo(p2.x, p2.y);
            mapCtx.stroke();
        }
    }

    // 6. Railway Corridors (Western, Central & Harbour Lines)
    mapCtx.strokeStyle = '#f43f5e';
    mapCtx.lineWidth = Math.max(1.8, 2.5 * mapZoom * 4);
    mapCtx.setLineDash([6, 4]);
    if (TRACK_SPLINES) {
        ['wr', 'cr', 'hr'].forEach(lineKey => {
            const spline = TRACK_SPLINES[lineKey];
            if (spline && spline.upLine && spline.upLine.length > 0) {
                mapCtx.beginPath();
                const p0 = worldToScreen(spline.upLine[0].x, spline.upLine[0].z);
                mapCtx.moveTo(p0.x, p0.y);
                for (let i = 1; i < spline.upLine.length; i++) {
                    const pt = worldToScreen(spline.upLine[i].x, spline.upLine[i].z);
                    mapCtx.lineTo(pt.x, pt.y);
                }
                mapCtx.stroke();
            }
        });
    }
    mapCtx.setLineDash([]);

    // 7. Active GPS Route Ribbon (Glowing Magenta Line)
    if (activeGpsRoute && mumbaiRoadNetwork && playerGroupRef) {
        try {
            // Find path from player nearest node to activeGpsRoute
            const pathResult = mumbaiRoadNetwork.findPathNearest(
                playerGroupRef.position.x,
                playerGroupRef.position.z,
                activeGpsRoute
            );
            if (pathResult && pathResult.waypoints && pathResult.waypoints.length > 1) {
                const pts = pathResult.waypoints;

                // Outer Magenta Route Glow
                mapCtx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
                mapCtx.lineWidth = 8;
                mapCtx.beginPath();
                const startScreen = worldToScreen(pts[0].x, pts[0].z);
                mapCtx.moveTo(startScreen.x, startScreen.y);
                for (let i = 1; i < pts.length; i++) {
                    const p = worldToScreen(pts[i].x, pts[i].z);
                    mapCtx.lineTo(p.x, p.y);
                }
                mapCtx.stroke();

                // Core Solid Magenta GPS Route
                mapCtx.strokeStyle = '#ec4899';
                mapCtx.lineWidth = 4;
                mapCtx.stroke();
            }
        } catch (e) {}
    }

    // 8. Custom GPS Waypoint Marker (if placed)
    if (customWaypoint) {
        const wpPt = worldToScreen(customWaypoint.x, customWaypoint.z);
        // Beacon pulse ring
        const timeNow = performance.now() * 0.003;
        const pulseR = 12 + (Math.sin(timeNow * 4) + 1) * 8;

        mapCtx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        mapCtx.lineWidth = 2;
        mapCtx.beginPath();
        mapCtx.arc(wpPt.x, wpPt.y, pulseR, 0, Math.PI * 2);
        mapCtx.stroke();

        // Diamond pin
        mapCtx.fillStyle = '#f43f5e';
        mapCtx.beginPath();
        mapCtx.moveTo(wpPt.x, wpPt.y - 14);
        mapCtx.lineTo(wpPt.x + 9, wpPt.y);
        mapCtx.lineTo(wpPt.x, wpPt.y + 14);
        mapCtx.lineTo(wpPt.x - 9, wpPt.y);
        mapCtx.closePath();
        mapCtx.fill();

        mapCtx.strokeStyle = '#ffffff';
        mapCtx.lineWidth = 2;
        mapCtx.stroke();

        // Waypoint Label
        mapCtx.font = 'bold 12px sans-serif';
        mapCtx.fillStyle = '#fef08a';
        mapCtx.textAlign = 'center';
        mapCtx.fillText("CUSTOM GPS WAYPOINT", wpPt.x, wpPt.y - 18);
    }

    // 9. Landmark Blips & Icons
    MAP_LANDMARKS.forEach(lm => {
        if (activeFilter !== 'all' && lm.category !== activeFilter) return;

        const pt = worldToScreen(lm.x, lm.z);
        if (pt.x < -30 || pt.x > w + 30 || pt.y < -30 || pt.y > h + 30) return;

        const isSelected = selectedItem && (selectedItem.id === lm.id);

        // Blip Outer Ring
        mapCtx.fillStyle = isSelected ? '#ffffff' : lm.color;
        mapCtx.beginPath();
        mapCtx.arc(pt.x, pt.y, isSelected ? 9 : 7, 0, Math.PI * 2);
        mapCtx.fill();

        mapCtx.strokeStyle = '#050914';
        mapCtx.lineWidth = 2;
        mapCtx.stroke();

        // Icon Emoji
        mapCtx.font = `${isSelected ? 16 : 13}px sans-serif`;
        mapCtx.textAlign = 'center';
        mapCtx.fillText(lm.icon, pt.x, pt.y - 10);

        // Text Label
        if (mapZoom > 0.14 || isSelected) {
            mapCtx.font = `bold ${isSelected ? 13 : 11}px sans-serif`;
            mapCtx.fillStyle = isSelected ? '#38bdf8' : '#f8fafc';
            mapCtx.fillText(lm.name.split('(')[0].trim(), pt.x, pt.y + 18);
        }
    });

    // 10. Player Position & Heading Arrow
    if (playerGroupRef) {
        const pPt = worldToScreen(playerGroupRef.position.x, playerGroupRef.position.z);
        const pRot = playerGroupRef.rotation.y;

        // Player Pulsing Radar Aura
        const pulse = 10 + (Math.sin(performance.now() * 0.005) + 1) * 6;
        mapCtx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        mapCtx.lineWidth = 2;
        mapCtx.beginPath();
        mapCtx.arc(pPt.x, pPt.y, pulse, 0, Math.PI * 2);
        mapCtx.stroke();

        mapCtx.save();
        mapCtx.translate(pPt.x, pPt.y);
        mapCtx.rotate(-pRot + Math.PI);

        // Cyan Player Heading Chevron
        mapCtx.fillStyle = '#06b6d4';
        mapCtx.beginPath();
        mapCtx.moveTo(0, -14);
        mapCtx.lineTo(9, 10);
        mapCtx.lineTo(0, 5);
        mapCtx.lineTo(-9, 10);
        mapCtx.closePath();
        mapCtx.fill();

        mapCtx.strokeStyle = '#ffffff';
        mapCtx.lineWidth = 2;
        mapCtx.stroke();
        mapCtx.restore();

        // Player Label
        mapCtx.font = 'bold 11px sans-serif';
        mapCtx.fillStyle = '#38bdf8';
        mapCtx.textAlign = 'center';
        mapCtx.fillText("YOU (DEVARSHI)", pPt.x, pPt.y - 20);
    }
}

// Side Directory Population
function renderLandmarkDirectory() {
    const listEl = document.getElementById('map-directory-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const filtered = MAP_LANDMARKS.filter(lm => {
        const matchesCategory = (activeFilter === 'all') || (lm.category === activeFilter);
        const matchesSearch = !searchQuery ||
                              lm.name.toLowerCase().includes(searchQuery) ||
                              lm.mr.toLowerCase().includes(searchQuery) ||
                              lm.district.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    filtered.forEach(lm => {
        const item = document.createElement('div');
        item.className = 'map-directory-item';
        if (selectedItem && selectedItem.id === lm.id) item.classList.add('selected');

        item.innerHTML = `
            <span class="directory-icon">${lm.icon}</span>
            <div class="directory-info">
                <strong>${lm.name}</strong>
                <small>${lm.district}</small>
            </div>
            <span class="directory-category-badge" style="color: ${lm.color};">${lm.category.toUpperCase()}</span>
        `;

        item.addEventListener('click', () => {
            selectedItem = lm;
            mapPanX = lm.x;
            mapPanZ = lm.z;
            mapZoom = Math.max(mapZoom, 0.28); // Zoom in on selection
            showLandmarkDetailCard(lm);
            renderLandmarkDirectory();
            drawWorldMap();
            playSound('chime');
        });

        listEl.appendChild(item);
    });
}

function showLandmarkDetailCard(item) {
    const cardEl = document.getElementById('map-landmark-card');
    if (!cardEl) return;

    const titleEl = document.getElementById('map-card-title');
    const mrEl = document.getElementById('map-card-mr');
    const districtEl = document.getElementById('map-card-district');
    const coordsEl = document.getElementById('map-card-coords');
    const descEl = document.getElementById('map-card-desc');

    if (titleEl) titleEl.textContent = `${item.icon} ${item.name}`;
    if (mrEl) mrEl.textContent = item.mr || '';
    if (districtEl) districtEl.textContent = `📍 ${item.district}`;
    if (coordsEl) coordsEl.textContent = `GPS: X: ${Math.round(item.x)} | Y: ${item.y || 2}m | Z: ${Math.round(item.z)}`;
    if (descEl) descEl.textContent = item.desc || '';

    cardEl.classList.add('active');
}

function hideLandmarkDetailCard() {
    const cardEl = document.getElementById('map-landmark-card');
    if (cardEl) cardEl.classList.remove('active');
}
