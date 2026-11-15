import { getDistrictAt, LANDMARKS } from '../data/mumbaiGeography.js';
import { mumbaiRoadNetwork } from '../data/roadGraph.js';
import { TRACK_SPLINES } from '../data/railwayDatabase.js';

// ==========================================
// GTA-INSPIRED 5KM GPS MINIMAP RADAR ENGINE
// Coastlines, Water Bodies, Arterials, Railway Tracks, GPS Route & Landmark Blips
// ==========================================

export let currentNavDestination = null;
export let activeGpsRoute = null;

const DESTINATION_NODE_MAP = {
    'school': 'node_fr_agnel_school_gate',
    'college': 'node_dmce_main_gate',
    'home': 'node_homehq_plaza',
    'gateway': 'node_gateway_waterfront',
    'airport': 'node_airport_parkway_east',
    'node_fr_agnel_school_gate': 'node_fr_agnel_school_gate',
    'node_dmce_main_gate': 'node_dmce_main_gate',
    'node_homehq_plaza': 'node_homehq_plaza',
    'node_gateway_waterfront': 'node_gateway_waterfront',
    'node_airport_parkway_east': 'node_airport_parkway_east'
};

export function setNavigationDestination(destId) {
    const mapped = DESTINATION_NODE_MAP[destId] || destId;
    if (mumbaiRoadNetwork && mumbaiRoadNetwork.nodes[mapped]) {
        currentNavDestination = mapped;
        activeGpsRoute = mapped;
    } else {
        currentNavDestination = null;
        activeGpsRoute = null;
    }
}

export function clearNavigationDestination() {
    currentNavDestination = null;
    activeGpsRoute = null;
}

// Master Waypoint Locations
const WAYPOINTS = [
    { id: 'school', name: "Fr. Agnel School (Bandra West)", x: -1350, z: 520, color: '#06b6d4', icon: '🏫', nodeId: 'node_fr_agnel_school_gate' },
    { id: 'college', name: "DMCE College (Airoli)", x: 1850, z: 1450, color: '#22c55e', icon: '🎓', nodeId: 'node_dmce_main_gate' },
    { id: 'home', name: "Home HQ (Dharavi Koliwada)", x: 0, z: 0, color: '#f59e0b', icon: '🏠', nodeId: 'node_homehq_plaza' },
    { id: 'gateway', name: "Gateway of India (Colaba)", x: -350, z: -2250, color: '#a855f7', icon: '🏛️', nodeId: 'node_gateway_waterfront' },
    { id: 'airport', name: "CSMIA International Airport", x: 150, z: 1200, color: '#fbbf24', icon: '✈️', nodeId: 'node_airport_parkway_east' }
];

let lastRouteCalcTime = 0;
let cachedRouteData = null;

export function updateMiniMap(playerX, playerZ, playerRot) {
    const mapCanvas = document.getElementById('minimap-canvas');
    if (!mapCanvas) return;
    const mapCtx = mapCanvas.getContext('2d');
    if (!mapCtx) return;

    const gpsCoordsEl = document.getElementById('gps-coords');
    if (gpsCoordsEl) {
        gpsCoordsEl.textContent = `X: ${Math.round(playerX)} | Z: ${Math.round(playerZ)}`;
    }

    // Dynamic District Name Lookup
    const currentDistrict = getDistrictAt(playerX, playerZ);
    const districtTitle = currentDistrict ? currentDistrict.name : "Mumbai Metropolitan";
    const radarBanner = document.getElementById('radar-district-banner');
    if (radarBanner) radarBanner.textContent = districtTitle;
    const districtNameEl = document.getElementById('gta-district-name');
    if (districtNameEl) districtNameEl.textContent = districtTitle;

    // Nearest Waypoint Tracker
    let nearest = WAYPOINTS[0];
    let minDist = Infinity;
    WAYPOINTS.forEach(wp => {
        const d = Math.hypot(wp.x - playerX, wp.z - playerZ);
        if (d < minDist) { minDist = d; nearest = wp; }
    });

    const waypointTrackerEl = document.getElementById('waypoint-tracker');

    // Canvas Dimensions & Scaling
    const width = mapCanvas.width || 220;
    const height = mapCanvas.height || 140;
    mapCtx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const scale = 0.085; // ~1.5km radar radius view

    function toMapX(wx) { return cx + (wx - playerX) * scale; }
    function toMapY(wz) { return cy - (wz - playerZ) * scale; }

    // 1. Radar Background (Dark Navy)
    mapCtx.fillStyle = '#080d1a';
    mapCtx.fillRect(0, 0, width, height);

    // 2. Water Bodies
    // Arabian Sea (Western Coastline x < -1000)
    const seaScreenX = toMapX(-950);
    if (seaScreenX > 0) {
        mapCtx.fillStyle = '#0f274a';
        mapCtx.fillRect(0, 0, Math.min(width, Math.max(0, seaScreenX)), height);
    }
    // Thane Creek (Eastern Waterway x > 1100)
    const creekScreenX = toMapX(1100);
    if (creekScreenX < width) {
        mapCtx.fillStyle = '#0f274a';
        mapCtx.fillRect(Math.max(0, creekScreenX), 0, width - Math.max(0, creekScreenX), height);
    }

    // Concentric Radar Distance Rings
    mapCtx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    mapCtx.lineWidth = 1;
    [30, 60, 90].forEach(r => {
        mapCtx.beginPath();
        mapCtx.arc(cx, cy, r, 0, Math.PI * 2);
        mapCtx.stroke();
    });

    // 3. Arterial Road Network Edges
    mapCtx.strokeStyle = '#334155';
    mapCtx.lineWidth = 2.0;
    try {
        const edges = mumbaiRoadNetwork.edges;
        for (let i = 0; i < Math.min(edges.length, 120); i++) {
            const edge = edges[i];
            const u = mumbaiRoadNetwork.nodes[edge.from];
            const v = mumbaiRoadNetwork.nodes[edge.to];
            if (u && v) {
                mapCtx.beginPath();
                mapCtx.moveTo(toMapX(u.x), toMapY(u.z));
                mapCtx.lineTo(toMapX(v.x), toMapY(v.z));
                mapCtx.stroke();
            }
        }
    } catch (e) {}

    // 4. Suburban Railway Corridors (Western, Central & Harbour Lines)
    mapCtx.strokeStyle = '#e11d48';
    mapCtx.lineWidth = 1.6;
    mapCtx.setLineDash([4, 3]);
    try {
        if (TRACK_SPLINES) {
            ['wr', 'cr', 'hr'].forEach(lineKey => {
                const spline = TRACK_SPLINES[lineKey];
                if (spline && spline.upLine && spline.upLine.length > 0) {
                    mapCtx.beginPath();
                    mapCtx.moveTo(toMapX(spline.upLine[0].x), toMapY(spline.upLine[0].z));
                    for (let s = 1; s < spline.upLine.length; s++) {
                        mapCtx.lineTo(toMapX(spline.upLine[s].x), toMapY(spline.upLine[s].z));
                    }
                    mapCtx.stroke();
                }
            });
        }
    } catch (e) {}
    mapCtx.setLineDash([]); // Reset dash

    // 5. Active GPS Route Pathfinding & Line Rendering
    if (activeGpsRoute) {
        const now = performance.now();
        if (now - lastRouteCalcTime > 1200 || !cachedRouteData) {
            lastRouteCalcTime = now;
            const startNode = mumbaiRoadNetwork.findNearestNode(playerX, playerZ, 2000);
            if (startNode && mumbaiRoadNetwork.nodes[activeGpsRoute]) {
                cachedRouteData = mumbaiRoadNetwork.findShortestPath(startNode.id, activeGpsRoute);
            }
        }

        if (cachedRouteData && cachedRouteData.waypoints && cachedRouteData.waypoints.length > 1) {
            // Draw Glowing GPS Path Line
            mapCtx.strokeStyle = '#38bdf8';
            mapCtx.lineWidth = 3.5;
            mapCtx.lineCap = 'round';
            mapCtx.lineJoin = 'round';
            mapCtx.shadowColor = '#0284c7';
            mapCtx.shadowBlur = 6;

            mapCtx.beginPath();
            mapCtx.moveTo(toMapX(playerX), toMapY(playerZ));
            for (let i = 0; i < cachedRouteData.waypoints.length; i++) {
                const wp = cachedRouteData.waypoints[i];
                mapCtx.lineTo(toMapX(wp.x), toMapY(wp.z));
            }
            mapCtx.stroke();

            // Reset shadow
            mapCtx.shadowBlur = 0;

            // Target Pulse Circle
            const destNode = mumbaiRoadNetwork.nodes[activeGpsRoute];
            if (destNode) {
                const pulseR = 5 + Math.sin(now * 0.006) * 2;
                mapCtx.fillStyle = '#38bdf8';
                mapCtx.beginPath();
                mapCtx.arc(toMapX(destNode.x), toMapY(destNode.z), pulseR, 0, Math.PI * 2);
                mapCtx.fill();
            }

            if (waypointTrackerEl) {
                const destName = destNode ? (destNode.name || activeGpsRoute) : "Destination";
                waypointTrackerEl.textContent = `📍 GPS: ${destName} • ${cachedRouteData.totalDistance}m (${cachedRouteData.totalTimeMinutes}m)`;
            }
        }
    } else {
        if (waypointTrackerEl) {
            waypointTrackerEl.textContent = `🎯 Nearest: ${nearest.name} (${Math.round(minDist)}m)`;
        }
    }

    // 6. Major Landmark Blips
    WAYPOINTS.forEach(wp => {
        const blipX = toMapX(wp.x);
        const blipY = toMapY(wp.z);

        // Draw Landmark Marker Circle
        mapCtx.fillStyle = wp.color;
        mapCtx.beginPath();
        mapCtx.arc(blipX, blipY, 4.5, 0, Math.PI * 2);
        mapCtx.fill();

        // Subtle white border
        mapCtx.strokeStyle = '#ffffff';
        mapCtx.lineWidth = 1.0;
        mapCtx.beginPath();
        mapCtx.arc(blipX, blipY, 4.5, 0, Math.PI * 2);
        mapCtx.stroke();
    });

    // 7. Player Heading Arrow at Center
    mapCtx.save();
    mapCtx.translate(cx, cy);
    mapCtx.rotate(-playerRot + Math.PI);

    // Player Direction Arrow
    mapCtx.fillStyle = '#ef4444';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -9);
    mapCtx.lineTo(6, 6);
    mapCtx.lineTo(0, 3);
    mapCtx.lineTo(-6, 6);
    mapCtx.closePath();
    mapCtx.fill();

    // Player Arrow Stroke
    mapCtx.strokeStyle = '#ffffff';
    mapCtx.lineWidth = 1.2;
    mapCtx.stroke();
    mapCtx.restore();

    // 8. Radar Border Ring
    mapCtx.strokeStyle = '#38bdf8';
    mapCtx.lineWidth = 1.5;
    mapCtx.strokeRect(2, 2, width - 4, height - 4);
}
