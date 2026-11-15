/**
 * ============================================================================
 * MUMBAI SUBURBAN RAILWAY NETWORK - MASTER DATABASE & KINEMATICS ENGINE
 * ============================================================================
 * System: Mumbai 3D Open World Portfolio Simulation
 * Coordinate Space: 5,000m x 5,000m World centered at Dharavi Origin (0, 8.0, 0)
 * Corridors: 5 Master Corridors (Western, Central, Harbour, Trans-Harbour, Uran)
 * Total Stations: 54 Structured Stations
 * Kinematics: Linear Dual-Track Shuttles, Broad Gauge (1,676mm), Up/Down Opposing Lines
 * 
 * Synchronized with:
 * - src/data/mumbaiGeography.js (WGS84 GPS: 19.0402°N, 72.8524°E)
 * - src/data/roadGraph.js (Arterials, Airoli Bridge, BWSL, SCLR, JVLR)
 * - MUMBAI_WORLD_CHUNK_ARCHITECTURE.md (500m chunks, 50m spatial-hash buckets)
 * 
 * Target Coordinates Range: X in [-2500, +2500], Z in [-2500, +2500], Y in [0, +50]
 * ============================================================================
 */

// ============================================================================
// 1. KINEMATICS & INFRASTRUCTURE CONFIGURATION
// ============================================================================
export const KINEMATICS_CONFIG = {
    gauge: 1.676,                    // Indian Broad Gauge (1,676 mm / 5'6")
    trackSpacing: 4.8,               // Center-to-center track distance (meters)
    upTrackOffset: 2.4,              // Lateral offset from corridor center for Up Line (+X / right-hand)
    downTrackOffset: -2.4,           // Lateral offset from corridor center for Down Line (-X / left-hand)
    ballastWidth: 9.2,               // Total width of dual-track crushed basalt ballast bed
    ballastDepth: 0.35,              // Depth of ballast layer
    sleeperWidth: 2.75,              // Pre-stressed concrete (PSC) sleeper width
    sleeperSpacing: 0.60,            // Spacing between sleeper centers (60 cm)
    catenaryHeight: 5.5,             // OHE 25 kV AC contact wire height above rail
    catenaryGantrySpacing: 50.0,     // Distance between overhead mast structures

    // Motion Dynamics (Suburban EMU Rakes)
    maxSpeedMs: 27.78,               // 100 km/h (Mainline tangent maximum)
    maxSpeedKmh: 100.0,
    normalCruisingSpeedMs: 22.22,    // 80 km/h (Standard operational cruising)
    terminalApproachSpeedMs: 4.17,   // 15 km/h (Terminal throat / scissors crossover)
    bufferStopSpeedMs: 1.39,         // 5 km/h (Final platform buffer approach)

    // Acceleration & Braking Dynamics
    initialAcceleration: 0.54,       // m/s^2 (0 - 45 km/h high torque traction)
    taperedAcceleration: 0.28,       // m/s^2 (45 - 80 km/h field weakening)
    highSpeedAcceleration: 0.15,     // m/s^2 (80 - 100 km/h)
    normalDeceleration: 0.70,        // m/s^2 (Standard electro-pneumatic regenerative braking)
    stationApproachDeceleration: 0.55, // m/s^2 (Smooth passenger approach)
    emergencyDeceleration: 1.10,     // m/s^2 (Full pneumatic emergency application)
    maxJerk: 0.75,                   // m/s^3 (Jerk rate limit for passenger comfort)

    // Station Dwell & Turnaround Times (seconds)
    minorStationDwell: 20.0,         // Nominal suburban station dwell
    majorHubDwell: 32.0,             // Dadar, Kurla, Thane, Andheri, Vashi
    terminalTurnaroundTime: 65.0,    // Motorman cab switch & signal clearing
    crossoverSpeedLimitKmh: 15.0     // Turnout speed limit
};

// ============================================================================
// 2. ROLLING STOCK SPECIFICATIONS (MUMBAI SUBURBAN EMUs)
// ============================================================================
export const ROLLING_STOCK_SPECS = {
    rakeTypes: {
        '12car_non_ac': {
            name: '12-Car Suburban EMU (Siemens / Bombardier / Medha)',
            totalCars: 12,
            totalLength: 254.8,
            coachLength: 20.84,
            coachWidth: 3.66,
            coachHeight: 3.88,
            bogieWheelbase: 2.89,
            bogieCenters: 14.63,
            emptyWeightTonnes: 495,
            crushLoadWeightTonnes: 785,
            seatingCapacity: 1168,
            crushCapacity: 3800,
            superDenseCrushCapacity: 4500,
            motorCoaches: 4,         // 4 Driving/Motor trailer units (3-car units x 4)
            trailerCoaches: 8,
            tractionVoltage: '25 kV AC 50 Hz'
        },
        '15car_high_capacity': {
            name: '15-Car High-Capacity Suburban EMU (WR / CR Mainline)',
            totalCars: 15,
            totalLength: 318.5,
            coachLength: 20.84,
            coachWidth: 3.66,
            coachHeight: 3.88,
            bogieWheelbase: 2.89,
            bogieCenters: 14.63,
            emptyWeightTonnes: 620,
            crushLoadWeightTonnes: 980,
            seatingCapacity: 1460,
            crushCapacity: 4800,
            superDenseCrushCapacity: 5600,
            motorCoaches: 5,
            trailerCoaches: 10,
            tractionVoltage: '25 kV AC 50 Hz'
        },
        '12car_ac_local': {
            name: '12-Car Air-Conditioned Suburban EMU (Blue/Silver livery)',
            totalCars: 12,
            totalLength: 254.8,
            coachLength: 20.84,
            coachWidth: 3.66,
            coachHeight: 3.88,
            automaticDoors: true,
            vestibuled: true,
            seatingCapacity: 1028,
            crushCapacity: 3200,
            tractionVoltage: '25 kV AC 50 Hz'
        }
    }
};

// ============================================================================
// 3. 4-ASPECT AUTOMATIC BLOCK SIGNALING SYSTEM
// ============================================================================
export const SIGNAL_ASPECTS = {
    RED: { code: 'R', name: 'Danger (Stop)', maxSpeedKmh: 0, colorHex: '#ef4444' },
    YELLOW: { code: 'Y', name: 'Caution (Be prepared to stop at next signal)', maxSpeedKmh: 30, colorHex: '#f59e0b' },
    DOUBLE_YELLOW: { code: 'YY', name: 'Attention (Pass next signal at restricted speed)', maxSpeedKmh: 60, colorHex: '#eab308' },
    GREEN: { code: 'G', name: 'Clear (Proceed at authorized track speed)', maxSpeedKmh: 100, colorHex: '#10b981' }
};

// ============================================================================
// 4. THE 5 SUBURBAN RAILWAY CORRIDORS
// ============================================================================
export const CORRIDORS = {
    wr: {
        id: 'wr',
        code: 'WR',
        name: 'Western Railway',
        marathiName: 'पश्चिम रेल्वे',
        hindiName: 'पश्चिम रेलवे',
        color: '#2455A4',              // Royal Blue (Official WR suburban brand)
        colorHex: 0x2455a4,
        lengthKm: 123.8,
        trackGauge: 'Broad Gauge (1,676 mm)',
        electrification: '25 kV AC OHE',
        headwayMinutes: 3.5,
        directionUp: 'Northbound (Towards Dahanu Road / Borivali)',
        directionDown: 'Southbound (Towards Churchgate)',
        terminals: {
            south: 'ST01', // Churchgate
            north: 'ST14'  // Dahanu Road
        },
        totalStations: 14,
        stationIds: [
            'ST01', 'ST02', 'ST03', 'ST04', 'ST05', 'ST06', 'ST07',
            'ST08', 'ST09', 'ST10', 'ST11', 'ST12', 'ST13', 'ST14'
        ],
        description: 'The arterial western coastal spine connecting Churchgate in South Mumbai to Dahanu Road, servicing Bandra (Fr. Agnel Technical High School), Andheri, and Borivali.'
    },
    cr: {
        id: 'cr',
        code: 'CR',
        name: 'Central Railway Main Line',
        marathiName: 'मध्य रेल्वे मुख्य मार्ग',
        hindiName: 'मध्य रेलवे मेन लाइन',
        color: '#C62828',              // Crimson Red (Official CR suburban brand)
        colorHex: 0xc62828,
        lengthKm: 120.6,
        trackGauge: 'Broad Gauge (1,676 mm)',
        electrification: '25 kV AC OHE',
        headwayMinutes: 4.0,
        directionUp: 'Northbound / Northeast (Towards Kasara / Kalyan)',
        directionDown: 'Southbound (Towards CSMT)',
        terminals: {
            south: 'ST15', // CSMT
            north: 'ST28'  // Kasara
        },
        totalStations: 14,
        stationIds: [
            'ST15', 'ST16', 'ST17', 'ST18', 'ST19', 'ST20', 'ST21',
            'ST22', 'ST23', 'ST24', 'ST25', 'ST26', 'ST27', 'ST28'
        ],
        description: 'The central spine originating from UNESCO World Heritage CSMT, passing through Kurla, Thane, and Kalyan before climbing the Sahyadri foothills towards Kasara.'
    },
    hr: {
        id: 'hr',
        code: 'HR',
        name: 'Harbour Line',
        marathiName: 'हार्बर मार्ग',
        hindiName: 'हार्बर लाइन',
        color: '#159447',              // Emerald Green
        colorHex: 0x159447,
        lengthKm: 49.0,
        trackGauge: 'Broad Gauge (1,676 mm)',
        electrification: '25 kV AC OHE',
        headwayMinutes: 5.0,
        directionUp: 'Eastbound / South-East (Towards Panvel via Vashi & Belapur)',
        directionDown: 'Westbound / South (Towards CSMT)',
        terminals: {
            west: 'ST29', // CSMT Harbour
            east: 'ST40'  // Panvel
        },
        totalStations: 12,
        stationIds: [
            'ST29', 'ST30', 'ST31', 'ST32', 'ST33', 'ST34',
            'ST35', 'ST36', 'ST37', 'ST38', 'ST39', 'ST40'
        ],
        description: 'Trans-bay suburban lifeline linking South Mumbai (CSMT) across the 2km Thane Creek Bridge to Navi Mumbai satellite cities (Vashi, Nerul, Belapur, Panvel).'
    },
    thr: {
        id: 'thr',
        code: 'THR',
        name: 'Trans-Harbour Line',
        marathiName: 'ट्रान्स-हार्बर मार्ग',
        hindiName: 'ट्रांस-हार्बर लाइन',
        color: '#8E44AD',              // Royal Purple
        colorHex: 0x8e44ad,
        lengthKm: 20.8,
        trackGauge: 'Broad Gauge (1,676 mm)',
        electrification: '25 kV AC OHE',
        headwayMinutes: 7.0,
        directionUp: 'Northbound (Towards Thane via Airoli)',
        directionDown: 'Southbound (Towards Vashi / Nerul)',
        terminals: {
            north: 'ST41', // Thane
            south: 'ST48'  // Vashi
        },
        totalStations: 8,
        stationIds: [
            'ST41', 'ST42', 'ST43', 'ST44', 'ST45', 'ST46', 'ST47', 'ST48'
        ],
        description: 'Key North-South Navi Mumbai industrial and tech corridor connecting Thane to Vashi/Nerul via Airoli (Datta Meghe College of Engineering - DMCE), Rabale, and Turbhe.'
    },
    ur: {
        id: 'ur',
        code: 'UR',
        name: 'Nerul-Uran Corridor',
        marathiName: 'नेरुळ-उरण मार्ग',
        hindiName: 'नेरुल-उरण कॉरिडोर',
        color: '#0284C7',              // Cerulean Blue / Sky Blue
        colorHex: 0x0284c7,
        lengthKm: 27.0,
        trackGauge: 'Broad Gauge (1,676 mm)',
        electrification: '25 kV AC OHE',
        headwayMinutes: 15.0,
        directionUp: 'Northbound (Towards Nerul / Belapur)',
        directionDown: 'Southbound (Towards Uran / JNPT Port)',
        terminals: {
            north: 'ST49', // Nerul
            south: 'ST54'  // Uran
        },
        totalStations: 6,
        stationIds: [
            'ST49', 'ST50', 'ST51', 'ST52', 'ST53', 'ST54'
        ],
        description: 'Modern southern coastal corridor connecting Nerul and Belapur to Targhar (Navi Mumbai International Airport - NMIA), Bamandongri, and the Uran/JNPT port terminals.'
    }
};

// ============================================================================
// 5. MASTER DATABASE OF ALL 54 STATIONS
// ============================================================================
// Synchronized with mumbaiGeography.js GPS anchor and roadGraph.js nodes
// ============================================================================

export const STATIONS = [
    // ------------------------------------------------------------------------
    // CORRIDOR 1: WESTERN RAILWAY (ST01 - ST14) - 14 Stations
    // ------------------------------------------------------------------------
    {
        id: 'ST01',
        code: 'CCG',
        name: 'Churchgate',
        marathiName: 'चर्चगेट',
        hindiName: 'चर्चगेट',
        corridor: 'wr',
        corridors: ['wr'],
        sequence: 1,
        corridorSequences: { wr: 1 },
        coordinates: { x: -480.0, y: 4.0, z: -1920.0 },
        chunkId: [-1, -4],
        isInterchange: false,
        interchangeWith: ['City Bus Depot', 'Marine Drive Walkway'],
        platforms: 4,
        platformType: 'double_discharge',
        platformLength: 320.0,
        elevation: 4.0,
        zone: 'South Mumbai (Fort & Marine Lines)',
        nearbyLandmarks: ['Marine Drive Promenade', 'Wankhede Stadium', 'Brabourne Stadium', 'High Court'],
        dwellTimeSec: 65.0, // Southern Terminus turnaround
        tracks: { upX: -477.6, downX: -482.4 }
    },
    {
        id: 'ST02',
        code: 'BCT',
        name: 'Mumbai Central',
        marathiName: 'मुंबई सेंट्रल',
        hindiName: 'मुंबई सेंट्रल',
        corridor: 'wr',
        corridors: ['wr'],
        sequence: 2,
        corridorSequences: { wr: 2 },
        coordinates: { x: -420.0, y: 5.0, z: -1350.0 },
        chunkId: [-1, -3],
        isInterchange: true,
        interchangeWith: ['Indian Railways Long Distance', 'Metro Line 3 Underground'],
        platforms: 5,
        platformType: 'island',
        platformLength: 320.0,
        elevation: 5.0,
        zone: 'South-Central Mumbai (Tardeo / Byculla West)',
        nearbyLandmarks: ['Long Distance Terminus', 'Maratha Mandir', 'Haji Ali Dargah Approach'],
        dwellTimeSec: 28.0,
        tracks: { upX: -417.6, downX: -422.4 }
    },
    {
        id: 'ST03',
        code: 'DDR_WR',
        name: 'Dadar Western',
        marathiName: 'दादर पश्चिम',
        hindiName: 'दादर पश्चिम',
        corridor: 'wr',
        corridors: ['wr', 'cr'],
        sequence: 3,
        corridorSequences: { wr: 3 },
        coordinates: { x: -380.0, y: 6.0, z: -320.0 },
        chunkId: [-1, -1],
        isInterchange: true,
        interchangeWith: ['cr', 'Central Railway Main Line Transfer FOB', 'Shivaji Park'],
        platforms: 7,
        platformType: 'double_discharge',
        platformLength: 330.0,
        elevation: 6.0,
        zone: 'Central Mumbai (Dadar)',
        nearbyLandmarks: ['Dadar Flower Market', 'Shivaji Park', 'Plaza Cinema', 'Central Railway Interchange'],
        dwellTimeSec: 35.0, // Mega Interchange Dwell
        tracks: { upX: -377.6, downX: -382.4 }
    },
    {
        id: 'ST04',
        code: 'MM_WR',
        name: 'Mahim Junction',
        marathiName: 'माहीम जंक्शन',
        hindiName: 'माहिम जंक्शन',
        corridor: 'wr',
        corridors: ['wr', 'hr'],
        sequence: 4,
        corridorSequences: { wr: 4 },
        coordinates: { x: -320.0, y: 6.0, z: 150.0 },
        chunkId: [-1, 0],
        isInterchange: true,
        interchangeWith: ['Harbour Line Bandra Branch', 'Dharavi Koliwada Home HQ Nexus'],
        platforms: 6,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 6.0,
        zone: 'Central Nexus (Mahim Bay & Dharavi West)',
        nearbyLandmarks: ['Dharavi Koliwada (HOME HQ TOWER @ 0,8,0)', 'Mahim Dargah', 'Mahim Fort', 'Mithi River Basin'],
        dwellTimeSec: 25.0,
        tracks: { upX: -317.6, downX: -322.4 }
    },
    {
        id: 'ST05',
        code: 'BA',
        name: 'Bandra',
        marathiName: 'वांद्रे',
        hindiName: 'बांद्रा',
        corridor: 'wr',
        corridors: ['wr', 'hr'],
        sequence: 5,
        corridorSequences: { wr: 5 },
        coordinates: { x: -680.0, y: 7.0, z: 480.0 },
        chunkId: [-2, 0],
        isInterchange: true,
        interchangeWith: ['Harbour Line Terminating Platforms', 'Bandra-Kurla Complex Connector'],
        platforms: 8,
        platformType: 'island',
        platformLength: 330.0,
        elevation: 7.0,
        zone: 'Western Suburbs (Bandra West & East)',
        nearbyLandmarks: [
            'Fr. Agnel Technical High School (Bandra West Ridge near Bandstand at -1350, 32, 520)',
            'Bandstand Coastal Promenade',
            'Mount Mary Basilica Ridge',
            'Bandra-Worli Sea Link North Landing'
        ],
        dwellTimeSec: 32.0,
        tracks: { upX: -677.6, downX: -682.4 }
    },
    {
        id: 'ST06',
        code: 'ADH',
        name: 'Andheri',
        marathiName: 'अंधेरी',
        hindiName: 'अंधेरी',
        corridor: 'wr',
        corridors: ['wr', 'hr'],
        sequence: 6,
        corridorSequences: { wr: 6 },
        coordinates: { x: -650.0, y: 8.0, z: 1150.0 },
        chunkId: [-2, 2],
        isInterchange: true,
        interchangeWith: ['Metro Line 1 (Versova-Andheri-Ghatkopar)', 'Harbour Line Extension'],
        platforms: 9,
        platformType: 'double_discharge',
        platformLength: 330.0,
        elevation: 8.0,
        zone: 'Western Suburbs (Andheri Commercial Hub)',
        nearbyLandmarks: ['Metro 1 Skywalk', 'Lokhandwala Complex', 'MIDC Tech Zone', 'CSMIA West Approach'],
        dwellTimeSec: 35.0,
        tracks: { upX: -647.6, downX: -652.4 }
    },
    {
        id: 'ST07',
        code: 'GMN',
        name: 'Goregaon',
        marathiName: 'गोरेगाव',
        hindiName: 'गोरेगांव',
        corridor: 'wr',
        corridors: ['wr', 'hr'],
        sequence: 7,
        corridorSequences: { wr: 7 },
        coordinates: { x: -620.0, y: 8.0, z: 1500.0 },
        chunkId: [-2, 3],
        isInterchange: true,
        interchangeWith: ['Harbour Line WR Terminus Platforms 1-2'],
        platforms: 7,
        platformType: 'island',
        platformLength: 300.0,
        elevation: 8.0,
        zone: 'Western Suburbs (Goregaon)',
        nearbyLandmarks: ['Film City Approach', 'Aarey Colony Western Edge', 'Oberoi Mall Skywalk'],
        dwellTimeSec: 24.0,
        tracks: { upX: -617.6, downX: -622.4 }
    },
    {
        id: 'ST08',
        code: 'MDD',
        name: 'Malad',
        marathiName: 'मालाड',
        hindiName: 'मलाड',
        corridor: 'wr',
        corridors: ['wr'],
        sequence: 8,
        corridorSequences: { wr: 8 },
        coordinates: { x: -590.0, y: 8.0, z: 1750.0 },
        chunkId: [-2, 3],
        isInterchange: false,
        interchangeWith: ['Link Road Metro Transfer'],
        platforms: 4,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 8.0,
        zone: 'Western Suburbs (Malad)',
        nearbyLandmarks: ['Inorbit Mall', 'Mindspace Malad Tech Hub', 'Marve Road Corridor'],
        dwellTimeSec: 20.0,
        tracks: { upX: -587.6, downX: -592.4 }
    },
    {
        id: 'ST09',
        code: 'KILE',
        name: 'Kandivali',
        marathiName: 'कांदिवली',
        hindiName: 'कांदिवली',
        corridor: 'wr',
        corridors: ['wr'],
        sequence: 9,
        corridorSequences: { wr: 9 },
        coordinates: { x: -560.0, y: 8.0, z: 1980.0 },
        chunkId: [-2, 3],
        isInterchange: false,
        interchangeWith: ['Western Express Highway Connector'],
        platforms: 4,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 8.0,
        zone: 'Western Suburbs (Kandivali)',
        nearbyLandmarks: ['Mahindra & Mahindra Complex', 'Poisar Depot', 'Akurli Road'],
        dwellTimeSec: 20.0,
        tracks: { upX: -557.6, downX: -562.4 }
    },
    {
        id: 'ST10',
        code: 'BVI',
        name: 'Borivali',
        marathiName: 'बोरिवली',
        hindiName: 'बोरीवली',
        corridor: 'wr',
        corridors: ['wr'],
        sequence: 10,
        corridorSequences: { wr: 10 },
        coordinates: { x: -520.0, y: 9.0, z: 2220.0 },
        chunkId: [-2, 4],
        isInterchange: true,
        interchangeWith: ['Suburban Northern Terminus', 'Long Distance Express Stoppage'],
        platforms: 10,
        platformType: 'double_discharge',
        platformLength: 330.0,
        elevation: 9.0,
        zone: 'Western Suburbs (Borivali)',
        nearbyLandmarks: ['Sanjay Gandhi National Park (Main Western Safari Gate)', 'Kanheri Caves Highway', 'Gorai Creek Ferry'],
        dwellTimeSec: 32.0,
        tracks: { upX: -517.6, downX: -522.4 }
    },
    {
        id: 'ST11',
        code: 'BSR',
        name: 'Vasai Road',
        marathiName: 'वसई रोड',
        hindiName: 'वसई रोड',
        corridor: 'wr',
        corridors: ['wr'],
        sequence: 11,
        corridorSequences: { wr: 11 },
        coordinates: { x: -500.0, y: 7.0, z: 2350.0 },
        chunkId: [-1, 4],
        isInterchange: true,
        interchangeWith: ['Vasai-Diva-Panvel Chord Line', 'Konkan Railway Freight Route'],
        platforms: 7,
        platformType: 'island',
        platformLength: 320.0,
        elevation: 7.0,
        zone: 'Palghar District (Vasai-Virar)',
        nearbyLandmarks: ['Vasai Creek Bridges', 'Vasai Fort Heritage Zone', 'Diva Cross-Connection Yard'],
        dwellTimeSec: 28.0,
        tracks: { upX: -497.6, downX: -502.4 }
    },
    {
        id: 'ST12',
        code: 'VR',
        name: 'Virar',
        marathiName: 'विरार',
        hindiName: 'विरार',
        corridor: 'wr',
        corridors: ['wr'],
        sequence: 12,
        corridorSequences: { wr: 12 },
        coordinates: { x: -480.0, y: 6.0, z: 2420.0 },
        chunkId: [-1, 4],
        isInterchange: true,
        interchangeWith: ['Suburban High-Density Terminus', 'Virar EMU Car Shed'],
        platforms: 8,
        platformType: 'island',
        platformLength: 330.0,
        elevation: 6.0,
        zone: 'Palghar District (Virar)',
        nearbyLandmarks: ['Virar EMU Car Shed & Yard', 'Jivdani Devi Temple Funicular', 'Arnala Coastal Belt'],
        dwellTimeSec: 30.0,
        tracks: { upX: -477.6, downX: -482.4 }
    },
    {
        id: 'ST13',
        code: 'BOR',
        name: 'Boisar',
        marathiName: 'बोईसर',
        hindiName: 'बोईसर',
        corridor: 'wr',
        corridors: ['wr'],
        sequence: 13,
        corridorSequences: { wr: 13 },
        coordinates: { x: -460.0, y: 5.0, z: 2465.0 },
        chunkId: [-1, 4],
        isInterchange: false,
        interchangeWith: ['Tarapur Atomic Power Station Shuttle'],
        platforms: 3,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 5.0,
        zone: 'Palghar District (Boisar Industrial Zone)',
        nearbyLandmarks: ['Tarapur MIDC Industrial Estate', 'BARC / NPCIL Nuclear Facility Area'],
        dwellTimeSec: 20.0,
        tracks: { upX: -457.6, downX: -462.4 }
    },
    {
        id: 'ST14',
        code: 'DRD',
        name: 'Dahanu Road',
        marathiName: 'डहाणू रोड',
        hindiName: 'डहाणू रोड',
        corridor: 'wr',
        corridors: ['wr'],
        sequence: 14,
        corridorSequences: { wr: 14 },
        coordinates: { x: -440.0, y: 4.0, z: 2490.0 },
        chunkId: [-1, 4],
        isInterchange: false,
        interchangeWith: ['WR Suburban Northern Limit', 'Gujarat Intercity Expresses'],
        platforms: 4,
        platformType: 'island',
        platformLength: 320.0,
        elevation: 4.0,
        zone: 'Outer Metropolitan Rim (Dahanu)',
        nearbyLandmarks: ['Dahanu Beach', 'Chiku Orchards Hub', 'Thermal Power Station'],
        dwellTimeSec: 65.0, // Northern Terminus turnaround
        tracks: { upX: -437.6, downX: -442.4 }
    },

    // ------------------------------------------------------------------------
    // CORRIDOR 2: CENTRAL RAILWAY MAIN LINE (ST15 - ST28) - 14 Stations
    // ------------------------------------------------------------------------
    {
        id: 'ST15',
        code: 'CSMT_CR',
        name: 'Chhatrapati Shivaji Maharaj Terminus (Main Line)',
        marathiName: 'छत्रपती शिवाजी महाराज टर्मिनस (मुख्य मार्ग)',
        hindiName: 'छत्रपति शिवाजी महाराज टर्मिनस',
        corridor: 'cr',
        corridors: ['cr', 'hr'],
        sequence: 1,
        corridorSequences: { cr: 1 },
        coordinates: { x: 120.0, y: 4.0, z: -1900.0 },
        chunkId: [0, -4],
        isInterchange: true,
        interchangeWith: ['hr', 'Harbour Line Platforms 1-2', 'Indian Railways Long Distance', 'Gateway Waterfront'],
        platforms: 18,
        platformType: 'double_discharge',
        platformLength: 340.0,
        elevation: 4.0,
        zone: 'South Mumbai (Fort / Heritage Precinct)',
        nearbyLandmarks: ['UNESCO Heritage Victorian Gothic Headquarters', 'Gateway of India Promenade', 'BMC Headquarters', 'General Post Office'],
        dwellTimeSec: 65.0, // Southern Terminus turnaround
        tracks: { upX: 122.4, downX: 117.6 }
    },
    {
        id: 'ST16',
        code: 'BY',
        name: 'Byculla',
        marathiName: 'भायखळा',
        hindiName: 'बायखला',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 2,
        corridorSequences: { cr: 2 },
        coordinates: { x: 140.0, y: 5.0, z: -1300.0 },
        chunkId: [0, -3],
        isInterchange: false,
        interchangeWith: ['Eastern Freeway Feeder'],
        platforms: 4,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 5.0,
        zone: 'South-Central Mumbai (Byculla)',
        nearbyLandmarks: ['Jijamata Udyan (Byculla Zoo)', 'Dr. Bhau Daji Lad Museum', 'Mustafa Bazaar'],
        dwellTimeSec: 20.0,
        tracks: { upX: 142.4, downX: 137.6 }
    },
    {
        id: 'ST17',
        code: 'SIN',
        name: 'Sion',
        marathiName: 'शीव',
        hindiName: 'सायन',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 3,
        corridorSequences: { cr: 3 },
        coordinates: { x: 180.0, y: 7.0, z: -150.0 },
        chunkId: [0, -1],
        isInterchange: false,
        interchangeWith: ['Dharavi East Bus Link', 'Sion Circle Arterial'],
        platforms: 4,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 7.0,
        zone: 'Central Nexus (Sion / Dharavi East)',
        nearbyLandmarks: ['Historic Sion Fort Hillock', 'Somaiya Vidyanagar Campus', 'LTMG Sion Hospital'],
        dwellTimeSec: 22.0,
        tracks: { upX: 182.4, downX: 177.6 }
    },
    {
        id: 'ST18',
        code: 'CLA_CR',
        name: 'Kurla Central',
        marathiName: 'कुर्ला मध्य',
        hindiName: 'कुर्ला सेंट्रल',
        corridor: 'cr',
        corridors: ['cr', 'hr'],
        sequence: 4,
        corridorSequences: { cr: 4 },
        coordinates: { x: 320.0, y: 7.0, z: 220.0 },
        chunkId: [0, 0],
        isInterchange: true,
        interchangeWith: ['hr', 'Harbour Line Elevated Platforms 7-8', 'Lokmanya Tilak Terminus (LTT)'],
        platforms: 8,
        platformType: 'island',
        platformLength: 320.0,
        elevation: 7.0,
        zone: 'Eastern Suburbs Nexus (Kurla West & East)',
        nearbyLandmarks: ['LTT Long Distance Terminus', 'SCLR (Santacruz-Chembur Link Road)', 'Phoenix Marketcity Mall'],
        dwellTimeSec: 35.0, // High-traffic interchange
        tracks: { upX: 322.4, downX: 317.6 }
    },
    {
        id: 'ST19',
        code: 'GC',
        name: 'Ghatkopar',
        marathiName: 'घाटकोपर',
        hindiName: 'घाटकोपर',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 5,
        corridorSequences: { cr: 5 },
        coordinates: { x: 480.0, y: 8.0, z: 680.0 },
        chunkId: [0, 1],
        isInterchange: true,
        interchangeWith: ['Metro Line 1 Eastern Terminus (Direct Elevated Concourse Transfer)'],
        platforms: 5,
        platformType: 'double_discharge',
        platformLength: 320.0,
        elevation: 8.0,
        zone: 'Eastern Suburbs (Ghatkopar)',
        nearbyLandmarks: ['Metro 1 Interchange Hub', 'R-City Mall', 'LBS Marg Commercial Spine'],
        dwellTimeSec: 32.0,
        tracks: { upX: 482.4, downX: 477.6 }
    },
    {
        id: 'ST20',
        code: 'VK',
        name: 'Vikhroli',
        marathiName: 'विक्रोळी',
        hindiName: 'विक्रोली',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 6,
        corridorSequences: { cr: 6 },
        coordinates: { x: 580.0, y: 9.0, z: 1100.0 },
        chunkId: [1, 2],
        isInterchange: false,
        interchangeWith: ['JVLR (Jogeshwari-Vikhroli Link Road) Eastern Terminus'],
        platforms: 4,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 9.0,
        zone: 'Eastern Suburbs (Vikhroli)',
        nearbyLandmarks: ['Godrej & Boyce Industrial Complex', 'Pirojshanagar Mangrove Park', 'Eastern Express Highway Flyover'],
        dwellTimeSec: 20.0,
        tracks: { upX: 582.4, downX: 577.6 }
    },
    {
        id: 'ST21',
        code: 'BND',
        name: 'Bhandup',
        marathiName: 'भांडुप',
        hindiName: 'भांडुप',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 7,
        corridorSequences: { cr: 7 },
        coordinates: { x: 690.0, y: 11.0, z: 1550.0 },
        chunkId: [1, 3],
        isInterchange: false,
        interchangeWith: ['Eastern Industrial Bus Terminal'],
        platforms: 4,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 11.0,
        zone: 'Eastern Suburbs (Bhandup)',
        nearbyLandmarks: ['Bhandup Water Treatment Complex (Asia largest)', 'Ceat Tyres Area'],
        dwellTimeSec: 20.0,
        tracks: { upX: 692.4, downX: 687.6 }
    },
    {
        id: 'ST22',
        code: 'MLND',
        name: 'Mulund',
        marathiName: 'मुलुंड',
        hindiName: 'मुलुंड',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 8,
        corridorSequences: { cr: 8 },
        coordinates: { x: 790.0, y: 14.0, z: 2040.0 },
        chunkId: [1, 4],
        isInterchange: false,
        interchangeWith: ['Thane District Boundary Toll Gateway', 'Airoli Bridge West'],
        platforms: 4,
        platformType: 'island',
        platformLength: 300.0,
        elevation: 14.0,
        zone: 'Eastern Suburbs Rim (Mulund)',
        nearbyLandmarks: ['SGNP Eastern Foothills', 'Nirmal Lifestyle', 'LBS Marg Mulund Check Naka'],
        dwellTimeSec: 22.0,
        tracks: { upX: 792.4, downX: 787.6 }
    },
    {
        id: 'ST23',
        code: 'TNA_CR',
        name: 'Thane Central',
        marathiName: 'ठाणे मध्य',
        hindiName: 'ठाणे सेंट्रल',
        corridor: 'cr',
        corridors: ['cr', 'thr'],
        sequence: 9,
        corridorSequences: { cr: 9 },
        coordinates: { x: 1150.0, y: 12.0, z: 2200.0 },
        chunkId: [2, 4],
        isInterchange: true,
        interchangeWith: ['thr', 'Trans-Harbour Line Platforms 9-10', 'Bhiwandi / Diva Bypass'],
        platforms: 11,
        platformType: 'double_discharge',
        platformLength: 330.0,
        elevation: 12.0,
        zone: 'Thane Metropolitan Hub',
        nearbyLandmarks: ['Historic 1853 Indian Railways 1st Station', 'Talao Pali Lake', 'Thane Municipal Headquarters'],
        dwellTimeSec: 35.0, // Mega Interchange Dwell
        tracks: { upX: 1152.4, downX: 1147.6 }
    },
    {
        id: 'ST24',
        code: 'THK',
        name: 'Thakurli',
        marathiName: 'ठाकुर्ली',
        hindiName: 'ठाकुर्ली',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 10,
        corridorSequences: { cr: 10 },
        coordinates: { x: 1480.0, y: 10.0, z: 2300.0 },
        chunkId: [2, 4],
        isInterchange: false,
        interchangeWith: ['Kalyan Bypass Link'],
        platforms: 3,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 10.0,
        zone: 'Thane Outer Ring (Thakurli)',
        nearbyLandmarks: ['Railway Thermal Powerhouse Site', 'Dombivli-Thakurli Residential Belt'],
        dwellTimeSec: 20.0,
        tracks: { upX: 1482.4, downX: 1477.6 }
    },
    {
        id: 'ST25',
        code: 'DI',
        name: 'Dombivli',
        marathiName: 'डोंबिवली',
        hindiName: 'डोंबिवली',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 11,
        corridorSequences: { cr: 11 },
        coordinates: { x: 1750.0, y: 10.0, z: 2360.0 },
        chunkId: [3, 4],
        isInterchange: false,
        interchangeWith: ['MIDC Dombivli Industrial Shuttle'],
        platforms: 5,
        platformType: 'island',
        platformLength: 320.0,
        elevation: 10.0,
        zone: 'Thane Outer Ring (Dombivli)',
        nearbyLandmarks: ['Highest Commuter Density Hub', 'Dombivli Gymkhana', 'Ulhas River Bridge Approach'],
        dwellTimeSec: 30.0,
        tracks: { upX: 1752.4, downX: 1747.6 }
    },
    {
        id: 'ST26',
        code: 'KYN',
        name: 'Kalyan',
        marathiName: 'कल्याण',
        hindiName: 'कल्याण',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 12,
        corridorSequences: { cr: 12 },
        coordinates: { x: 2050.0, y: 11.0, z: 2410.0 },
        chunkId: [4, 4],
        isInterchange: true,
        interchangeWith: ['Kasara Northeast Route', 'Karjat Southeast Route', 'Diesel/Electric Loco Shed'],
        platforms: 8,
        platformType: 'double_discharge',
        platformLength: 330.0,
        elevation: 11.0,
        zone: 'Kalyan-Dombivli Metropolitan Corporation',
        nearbyLandmarks: ['Major Rail Bifurcation Nexus', 'Kalyan Creek Bridge', 'Historic Durgadi Fort'],
        dwellTimeSec: 35.0,
        tracks: { upX: 2052.4, downX: 2047.6 }
    },
    {
        id: 'ST27',
        code: 'ASO',
        name: 'Asangaon',
        marathiName: 'आसनगाव',
        hindiName: 'आसनगांव',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 13,
        corridorSequences: { cr: 13 },
        coordinates: { x: 2280.0, y: 14.0, z: 2460.0 },
        chunkId: [4, 4],
        isInterchange: false,
        interchangeWith: ['Shahapur Agro-Transit Hub'],
        platforms: 3,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 14.0,
        zone: 'Thane Rural Foothills (Shahapur)',
        nearbyLandmarks: ['Shahapur Valley', 'Manas Mandir Complex', 'Bhatsa Dam Approach'],
        dwellTimeSec: 20.0,
        tracks: { upX: 2282.4, downX: 2277.6 }
    },
    {
        id: 'ST28',
        code: 'KSRA',
        name: 'Kasara',
        marathiName: 'कसारा',
        hindiName: 'कसारा',
        corridor: 'cr',
        corridors: ['cr'],
        sequence: 14,
        corridorSequences: { cr: 14 },
        coordinates: { x: 2460.0, y: 28.0, z: 2490.0 },
        chunkId: [4, 4],
        isInterchange: false,
        interchangeWith: ['Thal Ghat Banker Locomotive Station', 'Nashik Road Express Link'],
        platforms: 4,
        platformType: 'island',
        platformLength: 320.0,
        elevation: 28.0, // Sahyadri foothills incline
        zone: 'Sahyadri Mountain Rim (Kasara Ghats)',
        nearbyLandmarks: ['Thal Ghat Mountain Incline Base', 'WAG-9 Banker Loco Siding', 'Kasara Waterfalls Pass'],
        dwellTimeSec: 65.0, // Northern Terminus turnaround
        tracks: { upX: 2462.4, downX: 2457.6 }
    },

    // ------------------------------------------------------------------------
    // CORRIDOR 3: HARBOUR LINE (ST29 - ST40) - 12 Stations
    // ------------------------------------------------------------------------
    {
        id: 'ST29',
        code: 'CSMT_HR',
        name: 'CSMT Harbour Terminal',
        marathiName: 'छत्रपती शिवाजी महाराज टर्मिनस (हार्बर)',
        hindiName: 'छत्रपति शिवाजी महाराज टर्मिनस (हार्बर)',
        corridor: 'hr',
        corridors: ['hr', 'cr'],
        sequence: 1,
        corridorSequences: { hr: 1 },
        coordinates: { x: 130.0, y: 4.0, z: -1885.0 },
        chunkId: [0, -4],
        isInterchange: true,
        interchangeWith: ['cr', 'Central Main Line Platforms', 'Southern Waterfront Walkway'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 4.0,
        zone: 'South Mumbai (Fort)',
        nearbyLandmarks: ['Heritage Terminus Platforms 1-2', 'P. D Mello Road Waterfront', 'Carnac Bunder'],
        dwellTimeSec: 65.0, // Western/Southern Terminus turnaround
        tracks: { upX: 132.4, downX: 127.6 }
    },
    {
        id: 'ST30',
        code: 'VDLR',
        name: 'Vadala Road',
        marathiName: 'वडाळा रोड',
        hindiName: 'वडाला रोड',
        corridor: 'hr',
        corridors: ['hr'],
        sequence: 2,
        corridorSequences: { hr: 2 },
        coordinates: { x: 240.0, y: 6.0, z: -600.0 },
        chunkId: [0, -2],
        isInterchange: true,
        interchangeWith: ['Harbour Branch to Bandra/Goregaon (WR)', 'Mumbai Monorail Wadala Depot'],
        platforms: 4,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 6.0,
        zone: 'South-Central Port Zone (Wadala)',
        nearbyLandmarks: ['Monorail Master Operations Depot', 'BPT (Bombay Port Trust) Lands', 'Bandra Branch Flyover'],
        dwellTimeSec: 28.0,
        tracks: { upX: 242.4, downX: 237.6 }
    },
    {
        id: 'ST31',
        code: 'CLA_HR',
        name: 'Kurla Harbour',
        marathiName: 'कुर्ला हार्बर',
        hindiName: 'कुर्ला हार्बर',
        corridor: 'hr',
        corridors: ['hr', 'cr'],
        sequence: 3,
        corridorSequences: { hr: 3 },
        coordinates: { x: 335.0, y: 12.5, z: 235.0 },
        chunkId: [0, 0],
        isInterchange: true,
        interchangeWith: ['cr', 'Central Main Line Platforms 1-6', 'SCLR Elevated Viaduct'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 12.5, // Elevated Flyover Station crossing Central tracks
        zone: 'Eastern Suburbs Nexus (Kurla)',
        nearbyLandmarks: ['Elevated Kurla Rail Flyover', 'SCLR Express Connector', 'Tilak Nagar East Interchange'],
        dwellTimeSec: 32.0,
        tracks: { upX: 337.4, downX: 332.6 }
    },
    {
        id: 'ST32',
        code: 'CMBR',
        name: 'Chembur',
        marathiName: 'चेंबर',
        hindiName: 'चेंबूर',
        corridor: 'hr',
        corridors: ['hr'],
        sequence: 4,
        corridorSequences: { hr: 4 },
        coordinates: { x: 580.0, y: 7.0, z: 200.0 },
        chunkId: [1, 0],
        isInterchange: true,
        interchangeWith: ['Mumbai Monorail Chembur Station (Direct Concourse Bridge)'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 7.0,
        zone: 'Eastern Suburbs (Chembur)',
        nearbyLandmarks: ['Chembur Monorail Terminus', 'Diamond Garden', 'RCF Trombay Industrial Corridor'],
        dwellTimeSec: 22.0,
        tracks: { upX: 582.4, downX: 577.6 }
    },
    {
        id: 'ST33',
        code: 'GV',
        name: 'Govandi',
        marathiName: 'गोवंडी',
        hindiName: 'गोवंडी',
        corridor: 'hr',
        corridors: ['hr'],
        sequence: 5,
        corridorSequences: { hr: 5 },
        coordinates: { x: 760.0, y: 6.0, z: 180.0 },
        chunkId: [1, 0],
        isInterchange: false,
        interchangeWith: ['Eastern Express Highway Extension'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 6.0,
        zone: 'Eastern Suburbs (Govandi / Deonar)',
        nearbyLandmarks: ['TISS (Tata Institute of Social Sciences)', 'Deonar Abattoir Precinct'],
        dwellTimeSec: 20.0,
        tracks: { upX: 762.4, downX: 757.6 }
    },
    {
        id: 'ST34',
        code: 'MNKD',
        name: 'Mankhurd',
        marathiName: 'मानखुर्द',
        hindiName: 'मानखुर्द',
        corridor: 'hr',
        corridors: ['hr'],
        sequence: 6,
        corridorSequences: { hr: 6 },
        coordinates: { x: 960.0, y: 5.0, z: 160.0 },
        chunkId: [1, 0],
        isInterchange: false,
        interchangeWith: ['Sion-Panvel Highway Western Abutment'],
        platforms: 3,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 5.0,
        zone: 'Eastern Island Rim (Mankhurd)',
        nearbyLandmarks: ['Thane Creek Railway Bridge Western Pier', 'BARC Mumbai Colony', 'Mudflat Salt Pans'],
        dwellTimeSec: 22.0,
        tracks: { upX: 962.4, downX: 957.6 }
    },
    {
        id: 'ST35',
        code: 'VSH_HR',
        name: 'Vashi Harbour',
        marathiName: 'वाशी हार्बर',
        hindiName: 'वाशी हार्बर',
        corridor: 'hr',
        corridors: ['hr', 'thr'],
        sequence: 7,
        corridorSequences: { hr: 7 },
        coordinates: { x: 1620.0, y: 8.5, z: 120.0 },
        chunkId: [3, 0],
        isInterchange: true,
        interchangeWith: ['thr', 'Trans-Harbour Line Connector', 'Vashi Bus Terminus'],
        platforms: 4,
        platformType: 'island',
        platformLength: 300.0,
        elevation: 8.5, // Integrated Commercial Superstructure Station
        zone: 'Navi Mumbai Gateway (Sector 30A Vashi)',
        nearbyLandmarks: ['Thane Creek Rail Bridge Eastern Landing', 'CIDCO International Infotech Park', 'Inorbit Mall Vashi', 'APMC Grain Market'],
        dwellTimeSec: 32.0,
        tracks: { upX: 1622.4, downX: 1617.6 }
    },
    {
        id: 'ST36',
        code: 'SNCR_HR',
        name: 'Sanpada',
        marathiName: 'सानपाडा',
        hindiName: 'सानपाड़ा',
        corridor: 'hr',
        corridors: ['hr', 'thr'],
        sequence: 8,
        corridorSequences: { hr: 8 },
        coordinates: { x: 1780.0, y: 9.0, z: 320.0 },
        chunkId: [3, 0],
        isInterchange: true,
        interchangeWith: ['thr', 'Sanpada EMU Maintenance Car Shed'],
        platforms: 4,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 9.0,
        zone: 'Navi Mumbai (Sanpada)',
        nearbyLandmarks: ['Sanpada EMU Master Car Shed & Overhaul Depot', 'Palm Beach Road Flyover'],
        dwellTimeSec: 22.0,
        tracks: { upX: 1782.4, downX: 1777.6 }
    },
    {
        id: 'ST37',
        code: 'JNJ_HR',
        name: 'Juinagar',
        marathiName: 'जुईनगर',
        hindiName: 'जुईनगर',
        corridor: 'hr',
        corridors: ['hr', 'thr'],
        sequence: 9,
        corridorSequences: { hr: 9 },
        coordinates: { x: 1840.0, y: 8.0, z: 80.0 },
        chunkId: [3, 0],
        isInterchange: true,
        interchangeWith: ['thr', 'Trans-Harbour Bifurcation to Nerul'],
        platforms: 4,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 8.0,
        zone: 'Navi Mumbai (Juinagar / Shiravane)',
        nearbyLandmarks: ['Trans-Harbour Grade Separation Flyover', 'Siemens India Complex'],
        dwellTimeSec: 24.0,
        tracks: { upX: 1842.4, downX: 1837.6 }
    },
    {
        id: 'ST38',
        code: 'NEU_HR',
        name: 'Nerul Harbour Junction',
        marathiName: 'नेरुळ हार्बर जंक्शन',
        hindiName: 'नेरुल हार्बर जंक्शन',
        corridor: 'hr',
        corridors: ['hr', 'thr', 'ur'],
        sequence: 10,
        corridorSequences: { hr: 10 },
        coordinates: { x: 1880.0, y: 8.0, z: -320.0 },
        chunkId: [3, -1],
        isInterchange: true,
        interchangeWith: ['thr', 'ur', 'Trans-Harbour Southern Terminus', 'Nerul-Uran Corridor Origin'],
        platforms: 6,
        platformType: 'island',
        platformLength: 320.0,
        elevation: 8.0,
        zone: 'Navi Mumbai Core (Nerul)',
        nearbyLandmarks: ['DY Patil Sports Stadium', 'Tri-Corridor Tri-Track Junction', 'Wonders Park Navi Mumbai'],
        dwellTimeSec: 35.0, // Mega Interchange Dwell
        tracks: { upX: 1882.4, downX: 1877.6 }
    },
    {
        id: 'ST39',
        code: 'BEPR_HR',
        name: 'CBD Belapur',
        marathiName: 'सी.बी.डी. बेलापूर',
        hindiName: 'सीबीडी बेलापूर',
        corridor: 'hr',
        corridors: ['hr', 'ur'],
        sequence: 11,
        corridorSequences: { hr: 11 },
        coordinates: { x: 1940.0, y: 10.0, z: -780.0 },
        chunkId: [3, -2],
        isInterchange: true,
        interchangeWith: ['ur', 'Navi Mumbai Metro Line 1 Terminus', 'Uran Branch Chord'],
        platforms: 4,
        platformType: 'island',
        platformLength: 300.0,
        elevation: 10.0, // Elevated CIDCO Complex
        zone: 'Navi Mumbai Financial Center (CBD Belapur)',
        nearbyLandmarks: ['Navi Mumbai Municipal Corporation (NMMC) HQ', 'RBI Belapur Towers', 'CIDCO Bhavan', 'Kalyan Creek Bridge'],
        dwellTimeSec: 30.0,
        tracks: { upX: 1942.4, downX: 1937.6 }
    },
    {
        id: 'ST40',
        code: 'PNVL',
        name: 'Panvel Terminus',
        marathiName: 'पनवेल टर्मिनस',
        hindiName: 'पनवेल टर्मिनस',
        corridor: 'hr',
        corridors: ['hr'],
        sequence: 12,
        corridorSequences: { hr: 12 },
        coordinates: { x: 2150.0, y: 6.0, z: -1820.0 },
        chunkId: [4, -4],
        isInterchange: true,
        interchangeWith: ['Konkan Railway Intercity Hub', 'Central Railway Diva-Panvel Chord', 'Vasai-Diva-Panvel EMU'],
        platforms: 7,
        platformType: 'double_discharge',
        platformLength: 330.0,
        elevation: 6.0,
        zone: 'Raigad Rim (Panvel)',
        nearbyLandmarks: ['Konkan Railway Gateway Terminus', 'Kalamboli Freight Yard', 'Panvel Bus Stand', 'NMIA Airport Southern Expressway'],
        dwellTimeSec: 65.0, // Eastern Terminus turnaround
        tracks: { upX: 2152.4, downX: 2147.6 }
    },

    // ------------------------------------------------------------------------
    // CORRIDOR 4: TRANS-HARBOUR LINE (ST41 - ST48) - 8 Stations
    // ------------------------------------------------------------------------
    {
        id: 'ST41',
        code: 'TNA_THR',
        name: 'Thane Trans-Harbour Terminal',
        marathiName: 'ठाणे ट्रान्स-हार्बर टर्मिनस',
        hindiName: 'ठाणे ट्रांस-हार्बर टर्मिनस',
        corridor: 'thr',
        corridors: ['thr', 'cr'],
        sequence: 1,
        corridorSequences: { thr: 1 },
        coordinates: { x: 1170.0, y: 12.0, z: 2210.0 },
        chunkId: [2, 4],
        isInterchange: true,
        interchangeWith: ['cr', 'Central Main Line Platforms 1-8', 'Kalyan Route'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 12.0,
        zone: 'Thane City (Platforms 9-10)',
        nearbyLandmarks: ['Dedicated Trans-Harbour Surface Platforms', 'Thane East SATIS Deck', 'Kopri Bridge Approach'],
        dwellTimeSec: 65.0, // Northern Terminus turnaround
        tracks: { upX: 1172.4, downX: 1167.6 }
    },
    {
        id: 'ST42',
        code: 'DIGHA',
        name: 'Digha Gaon',
        marathiName: 'दिघा गाव',
        hindiName: 'दीघा गांव',
        corridor: 'thr',
        corridors: ['thr'],
        sequence: 2,
        corridorSequences: { thr: 2 },
        coordinates: { x: 1450.0, y: 11.0, z: 1820.0 },
        chunkId: [2, 3],
        isInterchange: false,
        interchangeWith: ['Thane-Belapur Road Feeder'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 11.0,
        zone: 'Navi Mumbai North Border (Digha)',
        nearbyLandmarks: ['Airoli-Thane Elevated Link Connection', 'Digha Lake', 'MIDC Border Gate'],
        dwellTimeSec: 20.0,
        tracks: { upX: 1452.4, downX: 1447.6 }
    },
    {
        id: 'ST43',
        code: 'AIRL',
        name: 'Airoli',
        marathiName: 'ऐरोली',
        hindiName: 'ऐरोली',
        corridor: 'thr',
        corridors: ['thr'],
        sequence: 3,
        corridorSequences: { thr: 3 },
        coordinates: { x: 1700.0, y: 12.0, z: 1420.0 },
        chunkId: [3, 2],
        isInterchange: true,
        interchangeWith: ['Airoli Bridge to Eastern Suburbs (Mulund/Bhandup)', 'Tech Campus Arterial'],
        platforms: 2,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 12.0,
        zone: 'Navi Mumbai Academic & Tech Sector (Airoli Sector 3)',
        nearbyLandmarks: [
            'Datta Meghe College of Engineering (DMCE College) at 1850, 12, 1450 (150m Direct Walkway)',
            'Mindspace IT Park Airoli East',
            'Airoli Knowledge Park',
            'Airoli Bridge across Thane Creek to Eastern Express Highway'
        ],
        dwellTimeSec: 28.0,
        tracks: { upX: 1702.4, downX: 1697.6 }
    },
    {
        id: 'ST44',
        code: 'RABE',
        name: 'Rabale',
        marathiName: 'रबाळे',
        hindiName: 'रबाले',
        corridor: 'thr',
        corridors: ['thr'],
        sequence: 4,
        corridorSequences: { thr: 4 },
        coordinates: { x: 1740.0, y: 10.0, z: 1100.0 },
        chunkId: [3, 2],
        isInterchange: false,
        interchangeWith: ['Thane-Belapur Industrial Expressway'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 10.0,
        zone: 'Navi Mumbai Industrial Corridor (Rabale MIDC)',
        nearbyLandmarks: ['Rabale MIDC Chemical & Manufacturing Belt', 'Rabale Police Station'],
        dwellTimeSec: 20.0,
        tracks: { upX: 1742.4, downX: 1737.6 }
    },
    {
        id: 'ST45',
        code: 'GNSL',
        name: 'Ghansoli',
        marathiName: 'घणसोली',
        hindiName: 'घनसौली',
        corridor: 'thr',
        corridors: ['thr'],
        sequence: 5,
        corridorSequences: { thr: 5 },
        coordinates: { x: 1760.0, y: 9.0, z: 820.0 },
        chunkId: [3, 1],
        isInterchange: false,
        interchangeWith: ['Reliance Corporate Park Shuttle Terminal'],
        platforms: 2,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 9.0,
        zone: 'Navi Mumbai Tech Sector (Ghansoli)',
        nearbyLandmarks: ['Reliance Corporate Park (RCP 500-acre HQ)', 'Aurum Q-Parc IT SEZ', 'Ghansoli Coastal Mangrove'],
        dwellTimeSec: 24.0,
        tracks: { upX: 1762.4, downX: 1757.6 }
    },
    {
        id: 'ST46',
        code: 'KOPR',
        name: 'Koparkhairane',
        marathiName: 'कोपरखैरणे',
        hindiName: 'कोपरखैरने',
        corridor: 'thr',
        corridors: ['thr'],
        sequence: 6,
        corridorSequences: { thr: 6 },
        coordinates: { x: 1780.0, y: 9.0, z: 560.0 },
        chunkId: [3, 1],
        isInterchange: false,
        interchangeWith: ['D-Mart Central Concourse Link'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 9.0,
        zone: 'Navi Mumbai (Koparkhairane)',
        nearbyLandmarks: ['Koparkhairane High Street', 'Sector 14 Residential Hub', 'Mahape Millennium Business Park Approach'],
        dwellTimeSec: 20.0,
        tracks: { upX: 1782.4, downX: 1777.6 }
    },
    {
        id: 'ST47',
        code: 'TUH',
        name: 'Turbhe',
        marathiName: 'तुर्भे',
        hindiName: 'तुर्भे',
        corridor: 'thr',
        corridors: ['thr'],
        sequence: 7,
        corridorSequences: { thr: 7 },
        coordinates: { x: 1800.0, y: 8.0, z: 280.0 },
        chunkId: [3, 0],
        isInterchange: true,
        interchangeWith: ['Vashi Branch / Nerul Branch Bifurcation Flyover', 'Turbhe Freight Yard'],
        platforms: 4,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 8.0,
        zone: 'Navi Mumbai Freight & Agro Core (Turbhe)',
        nearbyLandmarks: ['APMC Wholesale Agricultural Market', 'Turbhe Railway Freight Goods Shed', 'Sion-Panvel Highway Grade Separator'],
        dwellTimeSec: 25.0,
        tracks: { upX: 1802.4, downX: 1797.6 }
    },
    {
        id: 'ST48',
        code: 'VSH_THR',
        name: 'Vashi Trans-Harbour Terminal',
        marathiName: 'वाशी ट्रान्स-हार्बर टर्मिनस',
        hindiName: 'वाशी ट्रांस-हार्बर टर्मिनस',
        corridor: 'thr',
        corridors: ['thr', 'hr'],
        sequence: 8,
        corridorSequences: { thr: 8 },
        coordinates: { x: 1630.0, y: 8.5, z: 130.0 },
        chunkId: [3, 0],
        isInterchange: true,
        interchangeWith: ['hr', 'Harbour Line Main Platforms', 'Sion-Panvel Highway Bus Nexus'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 8.5,
        zone: 'Navi Mumbai Gateway (Vashi)',
        nearbyLandmarks: ['CIDCO Commercial Station Complex', 'Vashi Creek Waterfront', 'Navi Mumbai Central Plaza'],
        dwellTimeSec: 65.0, // Southern Terminus turnaround
        tracks: { upX: 1632.4, downX: 1627.6 }
    },

    // ------------------------------------------------------------------------
    // CORRIDOR 5: NERUL-URAN CORRIDOR (ST49 - ST54) - 6 Stations
    // ------------------------------------------------------------------------
    {
        id: 'ST49',
        code: 'NEU_UR',
        name: 'Nerul Uran Branch',
        marathiName: 'नेरुळ उरण शाखा',
        hindiName: 'नेरुल उरण शाखा',
        corridor: 'ur',
        corridors: ['ur', 'hr', 'thr'],
        sequence: 1,
        corridorSequences: { ur: 1 },
        coordinates: { x: 1890.0, y: 8.0, z: -330.0 },
        chunkId: [3, -1],
        isInterchange: true,
        interchangeWith: ['hr', 'thr', 'Harbour Main Tracks', 'Trans-Harbour Terminus'],
        platforms: 2,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 8.0,
        zone: 'Navi Mumbai Junction (Nerul)',
        nearbyLandmarks: ['Nerul North Junction Flyover', 'LP Bus Stand', 'DY Patil University Campus'],
        dwellTimeSec: 65.0, // Northern Terminus turnaround
        tracks: { upX: 1892.4, downX: 1887.6 }
    },
    {
        id: 'ST50',
        code: 'SWDV',
        name: 'Seawoods-Darave',
        marathiName: 'सीवूड्स-दारावे',
        hindiName: 'सीवूड्स-दारावे',
        corridor: 'ur',
        corridors: ['ur', 'hr'],
        sequence: 2,
        corridorSequences: { ur: 2 },
        coordinates: { x: 1910.0, y: 8.0, z: -560.0 },
        chunkId: [3, -2],
        isInterchange: true,
        interchangeWith: ['hr', 'Harbour Line Tracks', 'Grand Central Mall Integrated Transit Concourse'],
        platforms: 4,
        platformType: 'island',
        platformLength: 300.0,
        elevation: 8.0,
        zone: 'Navi Mumbai (Seawoods)',
        nearbyLandmarks: ['Seawoods Grand Central Mall (India 1st Transit-Oriented Development TOD)', 'NRI Seawoods Coastal Belt', 'Jewel of Navi Mumbai Lake'],
        dwellTimeSec: 25.0,
        tracks: { upX: 1912.4, downX: 1907.6 }
    },
    {
        id: 'ST51',
        code: 'BEPR_UR',
        name: 'CBD Belapur (Uran Link)',
        marathiName: 'सी.बी.डी. बेलापूर (उरण मार्ग)',
        hindiName: 'सीबीडी बेलापूर (उरण लिंक)',
        corridor: 'ur',
        corridors: ['ur', 'hr'],
        sequence: 3,
        corridorSequences: { ur: 3 },
        coordinates: { x: 1950.0, y: 10.0, z: -790.0 },
        chunkId: [3, -2],
        isInterchange: true,
        interchangeWith: ['hr', 'Harbour Line Main Platforms', 'Belapur-Uran Flyover Junction'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 10.0,
        zone: 'Navi Mumbai Financial Center (Belapur)',
        nearbyLandmarks: ['Sagarsangam Viaduct Interchange', 'Belapur Fort Promontory', 'Panvel Creek Mangrove Reserve'],
        dwellTimeSec: 25.0,
        tracks: { upX: 1952.4, downX: 1947.6 }
    },
    {
        id: 'ST52',
        code: 'TRGR',
        name: 'Targhar',
        marathiName: 'तारघर',
        hindiName: 'तारघर',
        corridor: 'ur',
        corridors: ['ur'],
        sequence: 4,
        corridorSequences: { ur: 4 },
        coordinates: { x: 1920.0, y: 14.0, z: -1180.0 },
        chunkId: [3, -3],
        isInterchange: true,
        interchangeWith: ['Navi Mumbai International Airport (NMIA) Terminal Shuttle / Automated People Mover'],
        platforms: 2,
        platformType: 'island',
        platformLength: 280.0,
        elevation: 14.0, // Elevated Dedicated Airport Viaduct
        zone: 'Navi Mumbai Airport Zone (NMIA)',
        nearbyLandmarks: ['Navi Mumbai International Airport (NMIA Terminals 1 & 2)', 'Ulwe River Canal Bridge', 'Airport Coastal Roadway'],
        dwellTimeSec: 32.0,
        tracks: { upX: 1922.4, downX: 1917.6 }
    },
    {
        id: 'ST53',
        code: 'BMDR',
        name: 'Bamandongri',
        marathiName: 'बामणडोंगरी',
        hindiName: 'बामनडोंगरी',
        corridor: 'ur',
        corridors: ['ur'],
        sequence: 5,
        corridorSequences: { ur: 5 },
        coordinates: { x: 1860.0, y: 6.0, z: -1540.0 },
        chunkId: [3, -4],
        isInterchange: false,
        interchangeWith: ['Ulwe Coastal Boulevard Feeder'],
        platforms: 2,
        platformType: 'side',
        platformLength: 280.0,
        elevation: 6.0,
        zone: 'Navi Mumbai Coastal Node (Ulwe Sector 19)',
        nearbyLandmarks: ['Ulwe High-Density Residential City', 'MTHL (Atal Setu) Southern Interchange Approach'],
        dwellTimeSec: 20.0,
        tracks: { upX: 1862.4, downX: 1857.6 }
    },
    {
        id: 'ST54',
        code: 'URAN',
        name: 'Uran City Terminus',
        marathiName: 'उरण शहर टर्मिनस',
        hindiName: 'उरण शहर टर्मिनस',
        corridor: 'ur',
        corridors: ['ur'],
        sequence: 6,
        corridorSequences: { ur: 6 },
        coordinates: { x: 1780.0, y: 4.0, z: -1950.0 },
        chunkId: [3, -4],
        isInterchange: false,
        interchangeWith: ['JNPT Port Container Terminal Feeder', 'Mora Coastal Passenger Ferry to Ferry Wharf (Bhaucha Dhakka)'],
        platforms: 4,
        platformType: 'double_discharge',
        platformLength: 300.0,
        elevation: 4.0,
        zone: 'Raigad Coastal Hub (Uran & JNPT)',
        nearbyLandmarks: [
            'Jawaharlal Nehru Port Trust (JNPT Container Port - Largest in India)',
            'Mora Jetty (Passenger Ferries to Mumbai Harbor)',
            'ONGC Uran Gas Processing Plant',
            'Dronagiri Mountain Fort Ridge'
        ],
        dwellTimeSec: 65.0, // Southern Coastal Terminus turnaround
        tracks: { upX: 1782.4, downX: 1777.6 }
    }
];

// Compute normalized coordinates [0, 1] relative to [-2500, +2500]
STATIONS.forEach(st => {
    st.normalizedCoords = {
        nx: Number(((st.coordinates.x + 2500) / 5000).toFixed(4)),
        nz: Number(((st.coordinates.z + 2500) / 5000).toFixed(4))
    };
});

// ============================================================================
// 6. MASTER INTERCHANGES MATRIX & WALKING TRANSFERS
// ============================================================================
export const MASTER_INTERCHANGES = {
    'DADAR': {
        name: 'Dadar Mega Nexus',
        stations: ['ST03', 'ST18'], // Dadar WR <-> Dadar CR (shared precinct)
        connectingCorridors: ['wr', 'cr'],
        transferType: 'Multi-level Foot-Overbridge (FOB) with High-Capacity Skywalks',
        transferDistanceMeters: 85.0,
        averageTransferMinutes: 3.5,
        description: 'The premier north-south transit exchange of Mumbai connecting Western Railway to Central Railway Main Line.'
    },
    'KURLA': {
        name: 'Kurla Central & Harbour Nexus',
        stations: ['ST18', 'ST31'], // Kurla CR (ground) <-> Kurla HR (elevated)
        connectingCorridors: ['cr', 'hr'],
        transferType: 'Elevated Deck Stairwells & Escalator Banks',
        transferDistanceMeters: 60.0,
        averageTransferMinutes: 2.5,
        description: 'Crucial interchange between Central Railway main line tracks (platforms 1-6) and elevated Harbour line cross-platforms (7-8).'
    },
    'THANE': {
        name: 'Thane City Junction',
        stations: ['ST23', 'ST41'], // Thane CR <-> Thane Trans-Harbour
        connectingCorridors: ['cr', 'thr'],
        transferType: 'Direct Platform Concourse (FOB & Subways)',
        transferDistanceMeters: 75.0,
        averageTransferMinutes: 3.0,
        description: 'Direct suburban transfer from Central Railway mainline trains to Trans-Harbour suburban shuttles servicing Airoli and Navi Mumbai.'
    },
    'VASHI': {
        name: 'Vashi Gateway Interchange',
        stations: ['ST35', 'ST48'], // Vashi HR <-> Vashi Trans-Harbour
        connectingCorridors: ['hr', 'thr'],
        transferType: 'Island Platform Cross-Platform Transfer',
        transferDistanceMeters: 25.0,
        averageTransferMinutes: 1.0,
        description: 'Cross-platform passenger interchange connecting Harbour trains from CSMT with Trans-Harbour trains to Thane.'
    },
    'NERUL': {
        name: 'Nerul Tri-Corridor Nexus',
        stations: ['ST38', 'ST49'], // Nerul HR <-> Nerul Uran
        connectingCorridors: ['hr', 'thr', 'ur'],
        transferType: 'Multi-platform Covered Concourse Overbridge',
        transferDistanceMeters: 45.0,
        averageTransferMinutes: 2.0,
        description: 'Tri-junction where Harbour Line, Trans-Harbour Line, and the newly operational Nerul-Uran Coastal Corridor converge.'
    },
    'CBD_BELAPUR': {
        name: 'CBD Belapur Commercial Interchange',
        stations: ['ST39', 'ST51'],
        connectingCorridors: ['hr', 'ur'],
        transferType: 'CIDCO Superstructure Concourse Bridge',
        transferDistanceMeters: 40.0,
        averageTransferMinutes: 2.0,
        description: 'Transfer hub connecting Panvel-bound Harbour trains with the southern branch to Targhar NMIA Airport and Uran.'
    },
    'CSMT': {
        name: 'CSMT South Mumbai Terminal Nexus',
        stations: ['ST15', 'ST29'],
        connectingCorridors: ['cr', 'hr'],
        transferType: 'Heritage Concourse Walkway',
        transferDistanceMeters: 65.0,
        averageTransferMinutes: 2.5,
        description: 'Direct connection between Central Main Line express platforms and Harbour Line local platforms 1 & 2.'
    },
    'MAHIM': {
        name: 'Mahim / Dharavi Central Nexus',
        stations: ['ST04'],
        connectingCorridors: ['wr', 'hr'],
        transferType: 'Direct Island Platform Transfer',
        transferDistanceMeters: 20.0,
        averageTransferMinutes: 1.0,
        description: 'Junction where the Harbour Line Bandra branch rejoins the Western Railway corridor, adjacent to Home HQ (0,8,0).'
    }
};

// ============================================================================
// 7. TRACK SPLINES FOR 3D RENDERING & KINEMATICS SIMULATION
// ============================================================================
export const TRACK_SPLINES = {
    wr: {
        upLine: [
            { x: -477.6, y: 4.0, z: -1920.0 }, // Churchgate Platform 3/4
            { x: -457.6, y: 4.5, z: -1600.0 }, // Marine Lines / Charni Rd
            { x: -417.6, y: 5.0, z: -1350.0 }, // Mumbai Central
            { x: -397.6, y: 5.5, z: -800.0 },  // Lower Parel / Prabhadevi
            { x: -377.6, y: 6.0, z: -320.0 },  // Dadar Western
            { x: -317.6, y: 6.0, z: 150.0 },   // Mahim Junction
            { x: -677.6, y: 7.0, z: 480.0 },   // Bandra (Fr. Agnel)
            { x: -657.6, y: 7.5, z: 850.0 },   // Santacruz / Vile Parle
            { x: -647.6, y: 8.0, z: 1150.0 },  // Andheri
            { x: -617.6, y: 8.0, z: 1500.0 },  // Goregaon
            { x: -587.6, y: 8.0, z: 1750.0 },  // Malad
            { x: -557.6, y: 8.0, z: 1980.0 },  // Kandivali
            { x: -517.6, y: 9.0, z: 2220.0 },  // Borivali
            { x: -497.6, y: 7.0, z: 2350.0 },  // Vasai Road
            { x: -477.6, y: 6.0, z: 2420.0 },  // Virar
            { x: -457.6, y: 5.0, z: 2465.0 },  // Boisar
            { x: -437.6, y: 4.0, z: 2490.0 }   // Dahanu Road Terminus
        ],
        downLine: [
            { x: -442.4, y: 4.0, z: 2490.0 },  // Dahanu Road Return
            { x: -462.4, y: 5.0, z: 2465.0 },  // Boisar Return
            { x: -482.4, y: 6.0, z: 2420.0 },  // Virar Return
            { x: -502.4, y: 7.0, z: 2350.0 },  // Vasai Road Return
            { x: -522.4, y: 9.0, z: 2220.0 },  // Borivali Return
            { x: -562.4, y: 8.0, z: 1980.0 },  // Kandivali Return
            { x: -592.4, y: 8.0, z: 1750.0 },  // Malad Return
            { x: -622.4, y: 8.0, z: 1500.0 },  // Goregaon Return
            { x: -652.4, y: 8.0, z: 1150.0 },  // Andheri Return
            { x: -662.4, y: 7.5, z: 850.0 },   // Santacruz Return
            { x: -682.4, y: 7.0, z: 480.0 },   // Bandra Return
            { x: -322.4, y: 6.0, z: 150.0 },   // Mahim Return
            { x: -382.4, y: 6.0, z: -320.0 },  // Dadar Return
            { x: -402.4, y: 5.5, z: -800.0 },  // Lower Parel Return
            { x: -422.4, y: 5.0, z: -1350.0 }, // Mumbai Central Return
            { x: -462.4, y: 4.5, z: -1600.0 }, // Marine Lines Return
            { x: -482.4, y: 4.0, z: -1920.0 }  // Churchgate Platform 1/2
        ],
        turnaroundLoopSouth: {
            crossoverZ: -1870.0,
            bufferZ: -1940.0,
            radius: 4.8,
            motormanWalkSec: 65.0
        },
        turnaroundLoopNorth: {
            crossoverZ: 2460.0,
            bufferZ: 2505.0,
            radius: 4.8,
            motormanWalkSec: 65.0
        }
    },

    cr: {
        upLine: [
            { x: 122.4, y: 4.0, z: -1900.0 },  // CSMT Platform 5/6
            { x: 142.4, y: 5.0, z: -1300.0 },  // Byculla
            { x: 162.4, y: 6.0, z: -700.0 },   // Parel / Currey Road
            { x: 182.4, y: 7.0, z: -150.0 },   // Sion
            { x: 322.4, y: 7.0, z: 220.0 },    // Kurla Central
            { x: 482.4, y: 8.0, z: 680.0 },    // Ghatkopar
            { x: 582.4, y: 9.0, z: 1100.0 },   // Vikhroli
            { x: 692.4, y: 11.0, z: 1550.0 },  // Bhandup
            { x: 792.4, y: 14.0, z: 2040.0 },  // Mulund
            { x: 1152.4, y: 12.0, z: 2200.0 }, // Thane Central
            { x: 1482.4, y: 10.0, z: 2300.0 }, // Thakurli
            { x: 1752.4, y: 10.0, z: 2360.0 }, // Dombivli
            { x: 2052.4, y: 11.0, z: 2410.0 }, // Kalyan
            { x: 2282.4, y: 14.0, z: 2460.0 }, // Asangaon
            { x: 2462.4, y: 28.0, z: 2490.0 }  // Kasara
        ],
        downLine: [
            { x: 2457.6, y: 28.0, z: 2490.0 }, // Kasara Return
            { x: 2277.6, y: 14.0, z: 2460.0 }, // Asangaon Return
            { x: 2047.6, y: 11.0, z: 2410.0 }, // Kalyan Return
            { x: 1747.6, y: 10.0, z: 2360.0 }, // Dombivli Return
            { x: 1477.6, y: 10.0, z: 2300.0 }, // Thakurli Return
            { x: 1147.6, y: 12.0, z: 2200.0 }, // Thane Return
            { x: 787.6, y: 14.0, z: 2040.0 },  // Mulund Return
            { x: 687.6, y: 11.0, z: 1550.0 },  // Bhandup Return
            { x: 577.6, y: 9.0, z: 1100.0 },   // Vikhroli Return
            { x: 477.6, y: 8.0, z: 680.0 },    // Ghatkopar Return
            { x: 317.6, y: 7.0, z: 220.0 },    // Kurla Return
            { x: 177.6, y: 7.0, z: -150.0 },   // Sion Return
            { x: 157.6, y: 6.0, z: -700.0 },   // Parel Return
            { x: 137.6, y: 5.0, z: -1300.0 },  // Byculla Return
            { x: 117.6, y: 4.0, z: -1900.0 }   // CSMT Return
        ],
        turnaroundLoopSouth: {
            crossoverZ: -1850.0,
            bufferZ: -1920.0,
            radius: 4.8,
            motormanWalkSec: 65.0
        },
        turnaroundLoopNorth: {
            crossoverZ: 2465.0,
            bufferZ: 2505.0,
            radius: 4.8,
            motormanWalkSec: 65.0
        }
    },

    hr: {
        upLine: [
            { x: 132.4, y: 4.0, z: -1885.0 },  // CSMT Harbour Platform 1
            { x: 182.4, y: 5.0, z: -1250.0 },  // Dockyard / Cotton Green
            { x: 242.4, y: 6.0, z: -600.0 },   // Vadala Road
            { x: 282.4, y: 9.0, z: -180.0 },   // Chunabhatti
            { x: 337.4, y: 12.5, z: 235.0 },   // Kurla Harbour Elevated
            { x: 582.4, y: 7.0, z: 200.0 },    // Chembur
            { x: 762.4, y: 6.0, z: 180.0 },    // Govandi
            { x: 962.4, y: 5.0, z: 160.0 },    // Mankhurd
            { x: 1290.0, y: 7.0, z: 140.0 },   // Thane Creek Rail Bridge
            { x: 1622.4, y: 8.5, z: 120.0 },   // Vashi Harbour
            { x: 1782.4, y: 9.0, z: 320.0 },   // Sanpada
            { x: 1842.4, y: 8.0, z: 80.0 },    // Juinagar
            { x: 1882.4, y: 8.0, z: -320.0 },  // Nerul
            { x: 1942.4, y: 10.0, z: -780.0 }, // CBD Belapur
            { x: 2042.4, y: 8.0, z: -1300.0 }, // Kharghar / Mansarovar
            { x: 2152.4, y: 6.0, z: -1820.0 }  // Panvel Terminus
        ],
        downLine: [
            { x: 2147.6, y: 6.0, z: -1820.0 }, // Panvel Return
            { x: 2037.6, y: 8.0, z: -1300.0 }, // Kharghar Return
            { x: 1937.6, y: 10.0, z: -780.0 }, // Belapur Return
            { x: 1877.6, y: 8.0, z: -320.0 },  // Nerul Return
            { x: 1837.6, y: 8.0, z: 80.0 },    // Juinagar Return
            { x: 1777.6, y: 9.0, z: 320.0 },   // Sanpada Return
            { x: 1617.6, y: 8.5, z: 120.0 },   // Vashi Return
            { x: 1290.0, y: 7.0, z: 140.0 },   // Bridge Return
            { x: 957.6, y: 5.0, z: 160.0 },    // Mankhurd Return
            { x: 757.6, y: 6.0, z: 180.0 },    // Govandi Return
            { x: 577.6, y: 7.0, z: 200.0 },    // Chembur Return
            { x: 332.6, y: 12.5, z: 235.0 },   // Kurla Elevated Return
            { x: 277.6, y: 9.0, z: -180.0 },   // Chunabhatti Return
            { x: 237.6, y: 6.0, z: -600.0 },   // Vadala Return
            { x: 177.6, y: 5.0, z: -1250.0 },  // Dockyard Return
            { x: 127.6, y: 4.0, z: -1885.0 }   // CSMT Platform 2 Return
        ],
        turnaroundLoopWest: {
            crossoverZ: -1840.0,
            bufferZ: -1905.0,
            radius: 4.8,
            motormanWalkSec: 65.0
        },
        turnaroundLoopEast: {
            crossoverZ: -1780.0,
            bufferZ: -1840.0,
            radius: 4.8,
            motormanWalkSec: 65.0
        }
    },

    thr: {
        upLine: [
            { x: 1172.4, y: 12.0, z: 2210.0 }, // Thane Platform 9
            { x: 1452.4, y: 11.0, z: 1820.0 }, // Digha Gaon
            { x: 1702.4, y: 12.0, z: 1420.0 }, // Airoli (DMCE College)
            { x: 1742.4, y: 10.0, z: 1100.0 }, // Rabale
            { x: 1762.4, y: 9.0, z: 820.0 },   // Ghansoli
            { x: 1782.4, y: 9.0, z: 560.0 },   // Koparkhairane
            { x: 1802.4, y: 8.0, z: 280.0 },   // Turbhe
            { x: 1632.4, y: 8.5, z: 130.0 }    // Vashi Terminus Platform
        ],
        downLine: [
            { x: 1627.6, y: 8.5, z: 130.0 },   // Vashi Return
            { x: 1797.6, y: 8.0, z: 280.0 },   // Turbhe Return
            { x: 1777.6, y: 9.0, z: 560.0 },   // Koparkhairane Return
            { x: 1757.6, y: 9.0, z: 820.0 },   // Ghansoli Return
            { x: 1737.6, y: 10.0, z: 1100.0 }, // Rabale Return
            { x: 1697.6, y: 12.0, z: 1420.0 }, // Airoli Return
            { x: 1447.6, y: 11.0, z: 1820.0 }, // Digha Return
            { x: 1167.6, y: 12.0, z: 2210.0 }  // Thane Platform 10 Return
        ],
        turnaroundLoopNorth: {
            crossoverZ: 2180.0,
            bufferZ: 2225.0,
            radius: 4.8,
            motormanWalkSec: 65.0
        },
        turnaroundLoopSouth: {
            crossoverZ: 150.0,
            bufferZ: 115.0,
            radius: 4.8,
            motormanWalkSec: 65.0
        }
    },

    ur: {
        upLine: [
            { x: 1892.4, y: 8.0, z: -330.0 },  // Nerul Platform
            { x: 1912.4, y: 8.0, z: -560.0 },  // Seawoods-Darave
            { x: 1952.4, y: 10.0, z: -790.0 }, // CBD Belapur Uran Link
            { x: 1922.4, y: 14.0, z: -1180.0 },// Targhar (NMIA Airport)
            { x: 1862.4, y: 6.0, z: -1540.0 }, // Bamandongri
            { x: 1782.4, y: 4.0, z: -1950.0 }  // Uran City Terminus
        ],
        downLine: [
            { x: 1777.6, y: 4.0, z: -1950.0 }, // Uran Return
            { x: 1857.6, y: 6.0, z: -1540.0 }, // Bamandongri Return
            { x: 1917.6, y: 14.0, z: -1180.0 },// Targhar Return
            { x: 1947.6, y: 10.0, z: -790.0 }, // Belapur Return
            { x: 1907.6, y: 8.0, z: -560.0 },  // Seawoods Return
            { x: 1887.6, y: 8.0, z: -330.0 }   // Nerul Return
        ],
        turnaroundLoopNorth: {
            crossoverZ: -310.0,
            bufferZ: -345.0,
            radius: 4.8,
            motormanWalkSec: 65.0
        },
        turnaroundLoopSouth: {
            crossoverZ: -1920.0,
            bufferZ: -1975.0,
            radius: 4.8,
            motormanWalkSec: 65.0
        }
    }
};

// ============================================================================
// 8. QUERY & KINEMATICS HELPER FUNCTIONS
// ============================================================================

export function getStationById(id) {
    if (!id) return null;
    return STATIONS.find(st => st.id === id) || null;
}

export function getStationByCode(code) {
    if (!code) return null;
    const upper = code.toUpperCase();
    return STATIONS.find(st => st.code.toUpperCase() === upper) || null;
}

export function getStationsForCorridor(corridorId) {
    if (!corridorId) return [];
    const cid = corridorId.toLowerCase();
    return STATIONS.filter(st => st.corridors.includes(cid))
        .sort((a, b) => (a.corridorSequences[cid] || 0) - (b.corridorSequences[cid] || 0));
}

export function getInterchangeStations() {
    return STATIONS.filter(st => st.isInterchange);
}

export function getCorridorById(corridorId) {
    if (!corridorId) return null;
    return CORRIDORS[corridorId.toLowerCase()] || null;
}

export function findNearestStation(x, z, maxDist = 3000.0) {
    let bestDistSq = maxDist * maxDist;
    let nearest = null;

    for (let i = 0; i < STATIONS.length; i++) {
        const st = STATIONS[i];
        const dx = st.coordinates.x - x;
        const dz = st.coordinates.z - z;
        const distSq = dx * dx + dz * dz;
        if (distSq < bestDistSq) {
            bestDistSq = distSq;
            nearest = st;
        }
    }

    return nearest ? {
        station: nearest,
        distanceMeters: Math.sqrt(bestDistSq)
    } : null;
}

/**
 * Dijkstra Multi-Corridor Route Finder across the 54 Suburban Stations
 */
export function calculateJourney(originId, destinationId) {
    const origin = getStationById(originId);
    const destination = getStationById(destinationId);

    if (!origin || !destination) {
        return { error: 'Invalid origin or destination station ID' };
    }

    if (originId === destinationId) {
        return {
            origin,
            destination,
            totalDistanceMeters: 0,
            estimatedMinutes: 0,
            interchangeCount: 0,
            path: [origin]
        };
    }

    // Build adjacency graph with travel times in seconds
    const adjacency = {};
    STATIONS.forEach(st => { adjacency[st.id] = []; });

    // Intra-corridor consecutive links
    Object.keys(CORRIDORS).forEach(cid => {
        const list = getStationsForCorridor(cid);
        for (let i = 0; i < list.length - 1; i++) {
            const s1 = list[i];
            const s2 = list[i + 1];
            const dx = s1.coordinates.x - s2.coordinates.x;
            const dz = s1.coordinates.z - s2.coordinates.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            // Approx 55 km/h avg speed = 15.27 m/s + 20s dwell
            const timeSec = (dist / 15.27) + s2.dwellTimeSec;

            adjacency[s1.id].push({ target: s2.id, corridor: cid, timeSec, distance: dist });
            adjacency[s2.id].push({ target: s1.id, corridor: cid, timeSec, distance: dist });
        }
    });

    // Inter-station pedestrian transfer links for interchanges
    Object.keys(MASTER_INTERCHANGES).forEach(key => {
        const hub = MASTER_INTERCHANGES[key];
        const sIds = hub.stations;
        for (let i = 0; i < sIds.length; i++) {
            for (let j = i + 1; j < sIds.length; j++) {
                const idA = sIds[i];
                const idB = sIds[j];
                if (adjacency[idA] && adjacency[idB]) {
                    const transferSec = hub.averageTransferMinutes * 60;
                    adjacency[idA].push({ target: idB, corridor: 'TRANSFER', timeSec: transferSec, distance: hub.transferDistanceMeters });
                    adjacency[idB].push({ target: idA, corridor: 'TRANSFER', timeSec: transferSec, distance: hub.transferDistanceMeters });
                }
            }
        }
    });

    // Dijkstra shortest time search
    const dist = {};
    const prev = {};
    const unvisited = new Set();

    STATIONS.forEach(st => {
        dist[st.id] = Infinity;
        prev[st.id] = null;
        unvisited.add(st.id);
    });

    dist[originId] = 0;

    while (unvisited.size > 0) {
        let u = null;
        let lowest = Infinity;
        unvisited.forEach(id => {
            if (dist[id] < lowest) {
                lowest = dist[id];
                u = id;
            }
        });

        if (!u || dist[u] === Infinity || u === destinationId) break;
        unvisited.delete(u);

        adjacency[u].forEach(edge => {
            if (unvisited.has(edge.target)) {
                const alt = dist[u] + edge.timeSec;
                if (alt < dist[edge.target]) {
                    dist[edge.target] = alt;
                    prev[edge.target] = { from: u, edge };
                }
            }
        });
    }

    // Reconstruct path
    const path = [];
    let curr = destinationId;
    let totalDistance = 0;
    let interchanges = 0;
    let lastCorridor = null;

    while (curr) {
        path.unshift(getStationById(curr));
        const step = prev[curr];
        if (step) {
            totalDistance += step.edge.distance;
            if (lastCorridor && step.edge.corridor !== lastCorridor && step.edge.corridor !== 'TRANSFER') {
                interchanges++;
            }
            lastCorridor = step.edge.corridor;
            curr = step.from;
        } else {
            break;
        }
    }

    return {
        origin,
        destination,
        totalDistanceMeters: Math.round(totalDistance),
        estimatedMinutes: Math.round(dist[destinationId] / 60),
        interchangeCount: interchanges,
        path
    };
}

/**
 * Linear Shuttle Kinematics State Solver for Train Updates
 * Computes realistic S-curve acceleration, deceleration, and braking profile.
 */
export function updateTrainKinematics(state, dt) {
    if (state.isDwelling) {
        state.speed = 0;
        state.dwellTimer -= dt;
        if (state.dwellTimer <= 0) {
            state.isDwelling = false;
            state.dwellTimer = 0;
            state.targetSpeed = KINEMATICS_CONFIG.normalCruisingSpeedMs;
        }
        return state;
    }

    // Acceleration or Deceleration
    if (state.speed < state.targetSpeed) {
        let accel = KINEMATICS_CONFIG.initialAcceleration;
        if (state.speed > 12.5) accel = KINEMATICS_CONFIG.taperedAcceleration;
        if (state.speed > 22.2) accel = KINEMATICS_CONFIG.highSpeedAcceleration;

        state.speed = Math.min(state.targetSpeed, state.speed + accel * dt);
    } else if (state.speed > state.targetSpeed) {
        const decel = KINEMATICS_CONFIG.normalDeceleration;
        state.speed = Math.max(state.targetSpeed, state.speed - decel * dt);
    }

    return state;
}

export function getTrackSplinePoints(corridorId, direction = 'up') {
    const cid = corridorId.toLowerCase();
    const corridor = TRACK_SPLINES[cid];
    if (!corridor) return [];
    return direction.toLowerCase() === 'up' ? corridor.upLine : corridor.downLine;
}

export function getStationSignboardText(stationId) {
    const st = getStationById(stationId);
    if (!st) return { english: 'STATION', marathi: 'स्थानक' };
    return {
        english: st.name.toUpperCase(),
        marathi: st.marathiName
    };
}

export function worldToNormalized(x, z) {
    return {
        nx: Number(((x + 2500) / 5000).toFixed(4)),
        nz: Number(((z + 2500) / 5000).toFixed(4))
    };
}

export function normalizedToWorld(nx, nz) {
    return {
        x: nx * 5000 - 2500,
        z: nz * 5000 - 2500
    };
}

// Global browser window attachment
if (typeof window !== 'undefined') {
    window.MUMBAI_RAILWAY = {
        KINEMATICS_CONFIG,
        ROLLING_STOCK_SPECS,
        SIGNAL_ASPECTS,
        CORRIDORS,
        STATIONS,
        MASTER_INTERCHANGES,
        TRACK_SPLINES,
        getStationById,
        getStationByCode,
        getStationsForCorridor,
        getInterchangeStations,
        getCorridorById,
        findNearestStation,
        calculateJourney,
        updateTrainKinematics,
        getTrackSplinePoints,
        getStationSignboardText,
        worldToNormalized,
        normalizedToWorld
    };
}

export default {
    KINEMATICS_CONFIG,
    ROLLING_STOCK_SPECS,
    SIGNAL_ASPECTS,
    CORRIDORS,
    STATIONS,
    MASTER_INTERCHANGES,
    TRACK_SPLINES,
    getStationById,
    getStationByCode,
    getStationsForCorridor,
    getInterchangeStations,
    getCorridorById,
    findNearestStation,
    calculateJourney,
    updateTrainKinematics,
    getTrackSplinePoints,
    getStationSignboardText,
    worldToNormalized,
    normalizedToWorld
};
