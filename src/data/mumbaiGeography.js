/**
 * Mumbai Metropolitan World — Master Geographical Data & Spatial Engine
 * ======================================================================
 * Target World: 5km x 5km Core Engine Grid ([-2500, 2500]), expandable to 10km ([-5000, 5000]).
 * Origin (0,0): Dharavi Koliwada (Mahim East), Central Nexus.
 *
 * Coordinates Convention (Right-Hand Cartesian):
 *   +X: East  (Thane Creek, Airoli, Navi Mumbai, Mainland)
 *   -X: West  (Arabian Sea, Bandra Bandstand, Mahim Bay)
 *   +Z: North (Andheri, Borivali, SGNP, Thane)
 *   -Z: South (Dadar, Worli, Lower Parel, Fort, Colaba, Gateway of India)
 *   +Y: Up    (Elevation in meters above Mean Sea Level, sea surface = 0.0m)
 *
 * @module mumbaiGeography
 */

// ============================================================================
// 1. WORLD CONFIGURATION & SPATIAL BOUNDS
// ============================================================================
export const WORLD_CONFIG = {
    name: "Mumbai Metropolitan World",
    version: "1.0.0",
    units: "meters",
    scale: 1.0, // 1 unit = 1 meter

    // 5km x 5km Core Engine Grid
    bounds: {
        minX: -2500,
        maxX: 2500,
        minZ: -2500,
        maxZ: 2500,
        width: 5000,
        depth: 5000
    },

    // 10km x 10km Expanded Outer Metropolitan Envelope
    expandedBounds: {
        minX: -5000,
        maxX: 5000,
        minZ: -5000,
        maxZ: 5000,
        width: 10000,
        depth: 10000
    },

    // World Origin (0, 0, 0)
    origin: {
        x: 0,
        y: 8.0,
        z: 0,
        name: "Dharavi Koliwada (Mahim East)",
        description: "Central Nexus connecting Island City, Western Suburbs, Eastern Suburbs, and Navi Mumbai"
    },

    seaLevel: 0.0,
    maxElevation: 140.0 // Peak of Kanheri Massif in SGNP
};

export const CORE_WORLD_BOUNDS = WORLD_CONFIG.bounds;

// ============================================================================
// 2. WGS84 GPS PROJECTION ANCHORS & TRANSFORMS
// ============================================================================
export const GPS_ANCHOR = {
    originLat: 19.040200, // Dharavi Koliwada Latitude
    originLon: 72.852400, // Dharavi Koliwada Longitude

    // Scale factors mapping degrees to engine meters (compressed city scale)
    latScale: 18321.44, // Z axis scale
    lonScale: 12706.04  // X axis scale
};

/**
 * Converts engine Cartesian (x, z) to real-world WGS84 GPS (latitude, longitude).
 * @param {number} x - East(+) / West(-) in meters
 * @param {number} z - North(+) / South(-) in meters
 * @returns {{ latitude: number, longitude: number }}
 */
export function worldToGps(x, z) {
    return {
        latitude: parseFloat((GPS_ANCHOR.originLat + (z / GPS_ANCHOR.latScale)).toFixed(6)),
        longitude: parseFloat((GPS_ANCHOR.originLon + (x / GPS_ANCHOR.lonScale)).toFixed(6))
    };
}

/**
 * Converts real-world WGS84 GPS (latitude, longitude) to engine Cartesian (x, z).
 * @param {number} latitude
 * @param {number} longitude
 * @returns {{ x: number, z: number }}
 */
export function gpsToWorld(latitude, longitude) {
    return {
        x: Math.round((longitude - GPS_ANCHOR.originLon) * GPS_ANCHOR.lonScale),
        z: Math.round((latitude - GPS_ANCHOR.originLat) * GPS_ANCHOR.latScale)
    };
}

// ============================================================================
// 3. MASTER DISTRICT CATALOG
// ============================================================================
export const DISTRICTS = {
    // --- CENTRAL NEXUS ---
    dharavi_koliwada: {
        id: "dharavi_koliwada",
        name: "Dharavi Koliwada & Mahim East",
        zone: "central_nexus",
        bounds: { minX: -250, maxX: 350, minZ: -150, maxZ: 250 },
        centroid: { x: 0, y: 8.0, z: 0 },
        elevationRange: [4.0, 12.0],
        theme: "Dense artisan settlement, maker workshops, multi-tiered chawl rooftops, canal boat slips",
        landmarks: ["home_hq_dharavi", "kumbharwada_pottery", "koliwada_wharf"],
        tags: ["headquarters", "crafts", "recycling", "central_origin"]
    },
    mahim: {
        id: "mahim",
        name: "Mahim",
        zone: "central_nexus",
        bounds: { minX: -650, maxX: -200, minZ: -200, maxZ: 300 },
        centroid: { x: -400, y: 5.0, z: 50 },
        elevationRange: [2.0, 8.0],
        theme: "Historic coastal gate, wooded Portuguese villas, Sufi shrines, bay shoreline",
        landmarks: ["mahim_dargah", "mahim_fort", "mahim_stn"],
        tags: ["heritage", "coastal", "transit"]
    },
    sion: {
        id: "sion",
        name: "Sion",
        zone: "central_nexus",
        bounds: { minX: 200, maxX: 650, minZ: -200, maxZ: 300 },
        centroid: { x: 400, y: 10.0, z: 50 },
        elevationRange: [5.0, 30.0],
        theme: "Colonial hill watchtower, trauma medical college, transit gateway to eastern corridor",
        landmarks: ["sion_fort", "sion_hospital", "sion_circle"],
        tags: ["fort", "medical", "transit_junction"]
    },

    // --- SOUTH MUMBAI (SOBO) ---
    colaba: {
        id: "colaba",
        name: "Colaba & Apollo Bunder",
        zone: "south_mumbai",
        bounds: { minX: -600, maxX: 0, minZ: -2500, maxZ: -2100 },
        centroid: { x: -300, y: 2.5, z: -2300 },
        elevationRange: [1.5, 6.0],
        theme: "Colonial cantonment, basalt monuments, tourist boat wharves, vibrant street bazaars",
        landmarks: ["gateway_of_india", "taj_palace", "colaba_causeway", "sassoon_docks"],
        tags: ["heritage", "waterfront", "tourism", "naval"]
    },
    fort_csmt: {
        id: "fort_csmt",
        name: "Fort & CSMT Heritage Precinct",
        zone: "south_mumbai",
        bounds: { minX: -450, maxX: 150, minZ: -2100, maxZ: -1700 },
        centroid: { x: -150, y: 6.0, z: -1900 },
        elevationRange: [4.0, 10.0],
        theme: "Victorian Gothic stone institutions, banking capital, broad tree-lined avenues",
        landmarks: ["csmt_terminus", "bmc_hq", "flora_fountain", "bse_tower", "asiatic_library"],
        tags: ["financial", "heritage_gothic", "rail_terminus"]
    },
    churchgate_marine_drive: {
        id: "churchgate_marine_drive",
        name: "Churchgate & Marine Drive",
        zone: "south_mumbai",
        bounds: { minX: -900, maxX: -350, minZ: -2200, maxZ: -1500 },
        centroid: { x: -650, y: 3.5, z: -1800 },
        elevationRange: [2.5, 6.0],
        theme: "Art Deco residential sweep, sweeping coastal promenade, cricket maidans",
        landmarks: ["marine_drive", "churchgate_stn", "wankhede_stadium", "oval_maidan"],
        tags: ["promenade", "art_deco", "cricket", "rail_terminus"]
    },
    malabar_hill: {
        id: "malabar_hill",
        name: "Malabar Hill & Walkeshwar",
        zone: "south_mumbai",
        bounds: { minX: -1100, maxX: -600, minZ: -1600, maxZ: -1150 },
        centroid: { x: -850, y: 35.0, z: -1400 },
        elevationRange: [10.0, 48.0],
        theme: "Elite coastal promontory, terraced cliff gardens, historic sacred spring tanks",
        landmarks: ["hanging_gardens", "banganga_tank", "girgaon_chowpatty"],
        tags: ["promontory", "gardens", "luxury_residential"]
    },

    // --- CENTRAL MUMBAI ---
    worli: {
        id: "worli",
        name: "Worli",
        zone: "central_mumbai",
        bounds: { minX: -1100, maxX: -400, minZ: -900, maxZ: -300 },
        centroid: { x: -750, y: 8.0, z: -600 },
        elevationRange: [2.0, 24.0],
        theme: "Sea Face promenade, cable-stayed bridge landing, luxury towers, tidal island shrine",
        landmarks: ["worli_sea_face", "haji_ali", "worli_fort", "nehru_centre", "sea_link_south"],
        tags: ["coastal", "bridgehead", "high_rise"]
    },
    lower_parel: {
        id: "lower_parel",
        name: "Lower Parel & Prabhadevi",
        zone: "central_mumbai",
        bounds: { minX: -450, maxX: 200, minZ: -1000, maxZ: -400 },
        centroid: { x: -150, y: 7.0, z: -700 },
        elevationRange: [4.0, 12.0],
        theme: "Historic textile mills transformed into glass corporate hubs, rooftop dining, temples",
        landmarks: ["phoenix_palladium", "siddhivinayak_temple", "peninsula_park"],
        tags: ["corporate", "mills", "temple", "retail"]
    },
    dadar: {
        id: "dadar",
        name: "Dadar (Central & West)",
        zone: "central_mumbai",
        bounds: { minX: -400, maxX: 300, minZ: -500, maxZ: -100 },
        centroid: { x: -50, y: 6.0, z: -300 },
        elevationRange: [4.0, 9.0],
        theme: "Cultural heartbeat, mega-interchange railway hub, dawn flower markets, cricket cradle",
        landmarks: ["dadar_interchange", "shivaji_park", "chaityabhoomi", "dadar_flower_market"],
        tags: ["interchange", "cricket", "market", "culture"]
    },

    // --- WESTERN SUBURBS ---
    bandra: {
        id: "bandra",
        name: "Bandra (West & East)",
        zone: "western_suburbs",
        bounds: { minX: -1500, maxX: -300, minZ: 200, maxZ: 800 },
        centroid: { x: -900, y: 14.0, z: 500 },
        elevationRange: [2.0, 38.0],
        theme: "Queen of Suburbs; coastal hill ridges, academic institutions, celebrity promenades, glass CBD",
        landmarks: ["school_fr_agnel", "mount_mary", "bandstand_promenade", "bandra_stn", "bkc_diamond_bourse", "bkc_jio_centre"],
        tags: ["academic_school", "hill_ridge", "coastal", "cbd"]
    },
    santacruz_vileparle: {
        id: "santacruz_vileparle",
        name: "Santacruz & Vile Parle",
        zone: "western_suburbs",
        bounds: { minX: -1400, maxX: -200, minZ: 800, maxZ: 1300 },
        centroid: { x: -700, y: 8.0, z: 1050 },
        elevationRange: [4.0, 14.0],
        theme: "Suburban residential lanes, collegiate campuses, domestic airport, beach promenade",
        landmarks: ["juhu_beach", "mithibai_college", "csmia_terminal_1"],
        tags: ["beach", "academic", "domestic_aviation"]
    },
    andheri_csmia: {
        id: "andheri_csmia",
        name: "Andheri & CSMIA International Aero-Hub",
        zone: "western_suburbs",
        bounds: { minX: -1400, maxX: 500, minZ: 1300, maxZ: 1800 },
        centroid: { x: -450, y: 10.0, z: 1550 },
        elevationRange: [5.0, 22.0],
        theme: "Massive commercial crossroads, international aviation hub, metro interchange, studios",
        landmarks: ["csmia_terminal_2", "csmia_runway", "andheri_metro", "lokhandwala_market"],
        tags: ["international_airport", "aviation", "metro", "commercial"]
    },
    goregaon: {
        id: "goregaon",
        name: "Goregaon",
        zone: "western_suburbs",
        bounds: { minX: -1300, maxX: -100, minZ: 1800, maxZ: 2150 },
        centroid: { x: -600, y: 12.0, z: 1975 },
        elevationRange: [6.0, 28.0],
        theme: "Film City studio sets, convention centers, woodland forest border",
        landmarks: ["film_city", "nesco_expo", "oberoi_mall"],
        tags: ["entertainment", "studios", "expo"]
    },
    malad_kandivali: {
        id: "malad_kandivali",
        name: "Malad & Kandivali",
        zone: "western_suburbs",
        bounds: { minX: -1300, maxX: -100, minZ: 2150, maxZ: 2400 },
        centroid: { x: -600, y: 10.0, z: 2275 },
        elevationRange: [5.0, 18.0],
        theme: "IT/BPO software campuses, mangrove backwaters, bustling suburban markets",
        landmarks: ["mindspace_malad", "infiniti_mall", "marve_connector"],
        tags: ["tech", "suburban", "creek"]
    },
    borivali: {
        id: "borivali",
        name: "Borivali",
        zone: "western_suburbs",
        bounds: { minX: -1200, maxX: 100, minZ: 2400, maxZ: 2500 },
        centroid: { x: -500, y: 14.0, z: 2480 },
        elevationRange: [8.0, 25.0],
        theme: "Northern railway terminal, national park gateway, golden pagoda ferry access",
        landmarks: ["borivali_terminus", "sgnp_west_gate", "gorai_pagoda"],
        tags: ["rail_terminus", "park_gate", "pagoda"]
    },

    // --- EASTERN SUBURBS ---
    kurla: {
        id: "kurla",
        name: "Kurla",
        zone: "eastern_suburbs",
        bounds: { minX: 350, maxX: 900, minZ: 200, maxZ: 750 },
        centroid: { x: 600, y: 8.0, z: 480 },
        elevationRange: [4.0, 12.0],
        theme: "Major Central/Harbour railway junction, mega shopping mall, double-decker flyover",
        landmarks: ["kurla_junction", "phoenix_marketcity", "sclr_flyover"],
        tags: ["rail_junction", "retail", "freeway"]
    },
    chembur: {
        id: "chembur",
        name: "Chembur",
        zone: "eastern_suburbs",
        bounds: { minX: 600, maxX: 1200, minZ: -300, maxZ: 300 },
        centroid: { x: 850, y: 9.0, z: 0 },
        elevationRange: [5.0, 20.0],
        theme: "Lush residential garden suburb, monorail line, refinery border, Eastern Freeway access",
        landmarks: ["diamond_garden", "chembur_monorail", "trombay_hill"],
        tags: ["residential", "garden", "freeway"]
    },
    ghatkopar: {
        id: "ghatkopar",
        name: "Ghatkopar",
        zone: "eastern_suburbs",
        bounds: { minX: 350, maxX: 950, minZ: 750, maxZ: 1250 },
        centroid: { x: 650, y: 10.0, z: 1000 },
        elevationRange: [6.0, 16.0],
        theme: "Bustling retail strip, Metro 1 eastern terminus, world-famous street food enclave",
        landmarks: ["ghatkopar_metro", "r_city_mall", "khau_galli_ghatkopar"],
        tags: ["metro_terminus", "retail", "food"]
    },
    vikhroli_bhandup: {
        id: "vikhroli_bhandup",
        name: "Vikhroli & Bhandup",
        zone: "eastern_suburbs",
        bounds: { minX: 400, maxX: 1050, minZ: 1250, maxZ: 1800 },
        centroid: { x: 750, y: 12.0, z: 1520 },
        elevationRange: [6.0, 32.0],
        theme: "Industrial engineering campuses, mangrove sanctuary, connector to Powai Lake and JVLR",
        landmarks: ["godrej_campus", "jvlr_east", "powai_lake", "iit_bombay"],
        tags: ["industrial", "academic_iit", "lake"]
    },
    mulund: {
        id: "mulund",
        name: "Mulund",
        zone: "eastern_suburbs",
        bounds: { minX: 450, maxX: 1100, minZ: 1800, maxZ: 2250 },
        centroid: { x: 780, y: 14.0, z: 2020 },
        elevationRange: [8.0, 24.0],
        theme: "Well-planned green residential suburb, Airoli Bridge western bridgehead",
        landmarks: ["mulund_stn", "airoli_bridge_west", "kalidas_theatre"],
        tags: ["residential", "bridgehead", "transit"]
    },

    // --- NORTHERN HIGHLANDS ---
    sgnp_highlands: {
        id: "sgnp_highlands",
        name: "Sanjay Gandhi National Park & Kanheri",
        zone: "northern_highlands",
        bounds: { minX: 0, maxX: 1400, minZ: 1800, maxZ: 2500 },
        centroid: { x: 650, y: 65.0, z: 2200 },
        elevationRange: [25.0, 140.0],
        theme: "Towering basalt mountains, ancient Buddhist caves, freshwater lake reservoirs, leopard jungle",
        landmarks: ["kanheri_caves", "vihar_lake", "sgnp_safari"],
        tags: ["mountain", "national_park", "caves", "lake"]
    },

    // --- THANE DISTRICT ---
    thane_city: {
        id: "thane_city",
        name: "Thane City & Lakes",
        zone: "thane",
        bounds: { minX: 800, maxX: 1500, minZ: 2100, maxZ: 2500 },
        centroid: { x: 1150, y: 15.0, z: 2350 },
        elevationRange: [8.0, 35.0],
        theme: "City of Lakes; historic railway junction, Trans-Harbour terminal, lakeside promenade",
        landmarks: ["thane_junction", "talao_pali", "viviana_mall"],
        tags: ["rail_mega_hub", "lakes", "historic"]
    },

    // --- NAVI MUMBAI (ACROSS THANE CREEK) ---
    airoli: {
        id: "airoli",
        name: "Airoli (Tech & Academic District)",
        zone: "navi_mumbai",
        bounds: { minX: 1500, maxX: 2200, minZ: 1200, maxZ: 1700 },
        centroid: { x: 1850, y: 12.0, z: 1450 },
        elevationRange: [4.0, 20.0],
        theme: "High-tech academic corridor, sprawling IT parks, engineering college campus, creek crossing",
        landmarks: ["college_dmce", "mindspace_airoli", "airoli_stn", "airoli_bridge_east"],
        tags: ["academic_college", "engineering", "tech_park", "bridgehead"]
    },
    vashi: {
        id: "vashi",
        name: "Vashi",
        zone: "navi_mumbai",
        bounds: { minX: 1400, maxX: 2100, minZ: -500, maxZ: 200 },
        centroid: { x: 1750, y: 8.0, z: -150 },
        elevationRange: [3.0, 15.0],
        theme: "Commercial capital of Navi Mumbai; massive railway station commercial tower, APMC markets",
        landmarks: ["vashi_stn_complex", "inorbit_vashi", "apmc_market", "vashi_bridge_east"],
        tags: ["commercial", "wholesale", "bridgehead", "retail"]
    },
    sanpada_juinagar: {
        id: "sanpada_juinagar",
        name: "Sanpada & Juinagar",
        zone: "navi_mumbai",
        bounds: { minX: 1500, maxX: 2100, minZ: 200, maxZ: 800 },
        centroid: { x: 1800, y: 9.0, z: 500 },
        elevationRange: [4.0, 16.0],
        theme: "Trans-Harbour rail corridor, EMU railcar maintenance sheds, modern residential towers",
        landmarks: ["sanpada_stn", "juinagar_carshed"],
        tags: ["rail_ops", "residential", "transit"]
    },
    nerul: {
        id: "nerul",
        name: "Nerul",
        zone: "navi_mumbai",
        bounds: { minX: 1500, maxX: 2200, minZ: 800, maxZ: 1300 },
        centroid: { x: 1850, y: 10.0, z: 1050 },
        elevationRange: [5.0, 25.0],
        theme: "Grand international sports stadium, hilltop Balaji temple, Palm Beach Road promenade",
        landmarks: ["dy_patil_stadium", "nerul_balaji", "palm_beach_road"],
        tags: ["sports_stadium", "temple", "boulevard"]
    },
    cbd_belapur: {
        id: "cbd_belapur",
        name: "CBD Belapur",
        zone: "navi_mumbai",
        bounds: { minX: 1600, maxX: 2300, minZ: -1200, maxZ: -500 },
        centroid: { x: 1950, y: 14.0, z: -850 },
        elevationRange: [6.0, 45.0],
        theme: "Administrative and financial nerve center, CIDCO headquarters, Parsik hill ridge",
        landmarks: ["cidco_bhavan", "belapur_fort", "parsik_hill"],
        tags: ["administrative", "financial", "hill_ridge"]
    },
    panvel: {
        id: "panvel",
        name: "Panvel & NMIA Aerotropolis",
        zone: "navi_mumbai",
        bounds: { minX: 1800, maxX: 2500, minZ: -2500, maxZ: -1300 },
        centroid: { x: 2150, y: 12.0, z: -1750 },
        elevationRange: [6.0, 30.0],
        theme: "Southern railway terminus to Konkan/Goa, greenfield international airport construction",
        landmarks: ["panvel_terminus", "nmia_airport"],
        tags: ["rail_terminus", "airport_construction", "konkan_gateway"]
    }
};

// ============================================================================
// 4. MASTER LANDMARKS DATABASE (60+ SPATIAL NODES)
// ============================================================================
export const LANDMARKS = [
    // --- STORY ANCHORS (SCHOOL, COLLEGE, HOME HQ, WATERFRONT) ---
    {
        id: "school_fr_agnel",
        name: "Fr. Agnel Technical High School & Complex",
        district: "bandra",
        category: "academic",
        role: "school",
        x: -1350,
        y: 32.0, // Mountain / Hill ridge elevation
        z: 520,
        gps: { lat: 19.048500, lon: 72.819000 },
        footprint: { width: 140, depth: 110, height: 28 },
        description: "School campus perched on the Mount Mary/Bandstand rocky coastal ridge overlooking Arabian Sea. Features technical engineering workshop hangars, sports quad, bell tower, and switchback hill descent.",
        specialFeatures: ["hill_promontory", "sea_vista", "technical_workshops", "chapel_terrace", "cliff_staircase"]
    },
    {
        id: "college_dmce",
        name: "DMCE College of Engineering (Datta Meghe)",
        district: "airoli",
        category: "academic",
        role: "college",
        x: 1850,
        y: 12.0,
        z: 1450,
        gps: { lat: 19.163000, lon: 72.998000 },
        footprint: { width: 160, depth: 130, height: 32 },
        description: "Premier engineering college campus located in Sector 3, Airoli, Navi Mumbai. Features 8-storey academic block, robotics labs, collegiate quadrangle, solar-canopied roof, and transit loop connecting to Airoli station and bridge.",
        specialFeatures: ["robotics_lab", "collegiate_atrium", "bus_transit_loop", "solar_arrays", "creek_connection"]
    },
    {
        id: "home_hq_dharavi",
        name: "Protagonist Home HQ & Workshop",
        district: "dharavi_koliwada",
        category: "headquarters",
        role: "home_hq",
        x: 0,
        y: 8.0, // Ground level
        roofY: 52.0, // Stealth command roof elevation
        z: 0,
        gps: { lat: 19.040200, lon: 72.852400 },
        footprint: { width: 85, depth: 70, height: 44 },
        description: "Central world origin (0,0) in Dharavi Koliwada (Mahim East). Concealed artisanal maker workshop at base with high-tech stealth command center and landing pad atop multi-tier chawl rooftop.",
        specialFeatures: ["world_origin", "rooftop_helipad", "surveillance_array", "secret_tunnel", "fast_travel_hub"]
    },
    {
        id: "gateway_of_india",
        name: "Gateway of India & Apollo Bunder",
        district: "colaba",
        category: "heritage",
        role: "waterfront_monument",
        x: -350,
        y: 2.5,
        z: -2250,
        gps: { lat: 18.922000, lon: 72.834700 },
        footprint: { width: 60, depth: 50, height: 26 },
        description: "Indo-Saracenic basalt arch monument on the eastern waterfront facing Mumbai Harbour. Features ceremonial sea steps, tourist boat docks, and historic gathering plaza.",
        specialFeatures: ["monument_arch", "boat_jetties", "harbour_view", "sea_steps"]
    },
    {
        id: "marine_drive",
        name: "Marine Drive Promenade & Queen's Necklace",
        district: "churchgate_marine_drive",
        category: "waterfront",
        role: "waterfront_promenade",
        x: -850,
        y: 3.5,
        z: -1700,
        gps: { lat: 18.947000, lon: 72.823500 },
        footprint: { width: 45, depth: 3600, height: 4 },
        description: "Iconic 3.6km C-shaped coastal boulevard arcing along Back Bay with concrete interlocking tetrapods, Art Deco apartment blocks, and curved sodium-vapor streetlights.",
        specialFeatures: ["tetrapod_seawall", "queens_necklace_lights", "art_deco_facades", "cricket_maidan_flank"]
    },

    // --- SOUTH MUMBAI (SOBO) ---
    {
        id: "taj_palace",
        name: "Taj Mahal Palace Hotel",
        district: "colaba",
        category: "hospitality",
        x: -320,
        y: 3.0,
        z: -2200,
        gps: { lat: 18.921700, lon: 72.833100 },
        footprint: { width: 110, depth: 85, height: 65 },
        description: "1903 heritage luxury hotel with Florentine dome and stone arches overlooking Apollo Bunder."
    },
    {
        id: "colaba_causeway",
        name: "Colaba Causeway Street Market",
        district: "colaba",
        category: "commercial",
        x: -380,
        y: 4.0,
        z: -2350,
        gps: { lat: 18.913500, lon: 72.831000 },
        footprint: { width: 25, depth: 400, height: 16 },
        description: "Vibrant shopping arcade with artisanal trinket stalls, vintage book kiosks, and Leopold Cafe."
    },
    {
        id: "sassoon_docks",
        name: "Sassoon Docks Fishing Port",
        district: "colaba",
        category: "maritime",
        x: -240,
        y: 2.0,
        z: -2420,
        gps: { lat: 18.908000, lon: 72.838000 },
        footprint: { width: 160, depth: 120, height: 12 },
        description: "Historic 1875 wet dock, morning fish auction halls, and wooden fishing trawler docks."
    },
    {
        id: "csmt_terminus",
        name: "Chhatrapati Shivaji Maharaj Terminus (CSMT)",
        district: "fort_csmt",
        category: "transit",
        x: -200,
        y: 6.0,
        z: -1950,
        gps: { lat: 18.939800, lon: 72.835400 },
        footprint: { width: 180, depth: 140, height: 68 },
        description: "UNESCO World Heritage Victorian Gothic railway headquarters with colossal dome and 18 platforms."
    },
    {
        id: "bmc_hq",
        name: "Brihanmumbai Municipal Corporation (BMC) HQ",
        district: "fort_csmt",
        category: "civic",
        x: -220,
        y: 6.0,
        z: -1910,
        gps: { lat: 18.941200, lon: 72.834800 },
        footprint: { width: 95, depth: 80, height: 77 },
        description: "Grand civic stone palace with central tower and bronze statues fronting CSMT."
    },
    {
        id: "flora_fountain",
        name: "Flora Fountain & Hutatma Chowk",
        district: "fort_csmt",
        category: "heritage",
        x: -280,
        y: 5.0,
        z: -2020,
        gps: { lat: 18.932200, lon: 72.831800 },
        footprint: { width: 40, depth: 40, height: 12 },
        description: "1864 neo-classical carved stone fountain surrounded by heritage banking institutions."
    },
    {
        id: "bse_tower",
        name: "Bombay Stock Exchange (BSE)",
        district: "fort_csmt",
        category: "financial",
        x: -260,
        y: 5.5,
        z: -2060,
        gps: { lat: 18.929800, lon: 72.833500 },
        footprint: { width: 60, depth: 60, height: 120 },
        description: "29-storey Phiroze Jeejeebhoy financial spire with digital live stock market ticker ribbon."
    },
    {
        id: "asiatic_library",
        name: "Asiatic Society & Town Hall",
        district: "fort_csmt",
        category: "heritage",
        x: -160,
        y: 5.0,
        z: -2040,
        gps: { lat: 18.931500, lon: 72.836000 },
        footprint: { width: 85, depth: 60, height: 22 },
        description: "Grand neoclassical Doric building with 30 broad exterior flight steps fronting Horniman Circle."
    },
    {
        id: "churchgate_stn",
        name: "Churchgate Western Railway Terminus",
        district: "churchgate_marine_drive",
        category: "transit",
        x: -480,
        y: 4.0,
        z: -1920,
        gps: { lat: 18.935200, lon: 72.827200 },
        footprint: { width: 140, depth: 90, height: 25 },
        description: "Southern terminus of the Western Railway suburban corridor with high-volume concourses."
    },
    {
        id: "wankhede_stadium",
        name: "Wankhede Cricket Stadium",
        district: "churchgate_marine_drive",
        category: "sports",
        x: -600,
        y: 4.5,
        z: -1880,
        gps: { lat: 18.938800, lon: 72.825800 },
        footprint: { width: 170, depth: 160, height: 38 },
        description: "33,000-capacity international cricket stadium with floodlight towers beside Marine Drive."
    },
    {
        id: "oval_maidan",
        name: "Oval Maidan",
        district: "churchgate_marine_drive",
        category: "civic",
        x: -420,
        y: 4.0,
        z: -1850,
        gps: { lat: 18.933000, lon: 72.829000 },
        footprint: { width: 180, depth: 320, height: 2 },
        description: "Sprawling cricket maidan separating the Gothic University Clock Tower from Art Deco sea avenues."
    },
    {
        id: "girgaon_chowpatty",
        name: "Girgaon Chowpatty Beach",
        district: "malabar_hill",
        category: "waterfront",
        x: -950,
        y: 2.0,
        z: -1300,
        gps: { lat: 18.954200, lon: 72.816000 },
        footprint: { width: 120, depth: 350, height: 3 },
        description: "Golden sand beach at the northern bend of Marine Drive; famous street food and Ganesh immersion."
    },
    {
        id: "hanging_gardens",
        name: "Hanging Gardens (Pherozeshah Mehta)",
        district: "malabar_hill",
        category: "park",
        x: -880,
        y: 42.0, // Mountain ridge
        z: -1420,
        gps: { lat: 18.956500, lon: 72.805000 },
        footprint: { width: 160, depth: 140, height: 15 },
        description: "Hilltop botanical terraces atop Malabar Hill overlooking the Arabian Sea and Back Bay."
    },
    {
        id: "banganga_tank",
        name: "Banganga Sacred Water Tank",
        district: "malabar_hill",
        category: "heritage",
        x: -960,
        y: 16.0,
        z: -1520,
        gps: { lat: 18.945000, lon: 72.793000 },
        footprint: { width: 60, depth: 40, height: 10 },
        description: "12th-century stepped stone water reservoir surrounded by ancient shrines and temple bells."
    },

    // --- CENTRAL MUMBAI ---
    {
        id: "haji_ali",
        name: "Haji Ali Dargah",
        district: "worli",
        category: "religious",
        x: -950,
        y: 1.5,
        z: -920,
        gps: { lat: 18.982700, lon: 72.808900 },
        footprint: { width: 50, depth: 50, height: 24 },
        description: "Historic 1431 marble mosque and tomb set on an offshore reef, linked by a 1km tidal causeway."
    },
    {
        id: "worli_sea_face",
        name: "Worli Sea Face Promenade",
        district: "worli",
        category: "waterfront",
        x: -880,
        y: 4.0,
        z: -650,
        gps: { lat: 19.004000, lon: 72.813000 },
        footprint: { width: 30, depth: 1400, height: 4 },
        description: "Arabian Sea coastal walk with crashing waves, luxury apartments, and Sea Link access."
    },
    {
        id: "worli_fort",
        name: "Worli Fort",
        district: "worli",
        category: "heritage",
        x: -980,
        y: 18.0, // Coastal knoll
        z: -520,
        gps: { lat: 19.023000, lon: 72.817000 },
        footprint: { width: 55, depth: 45, height: 18 },
        description: "1675 British stone watchtower fort overlooking Mahim Bay entrance."
    },
    {
        id: "nehru_centre",
        name: "Nehru Centre & Planetarium",
        district: "worli",
        category: "educational",
        x: -620,
        y: 6.0,
        z: -820,
        gps: { lat: 18.990000, lon: 72.818500 },
        footprint: { width: 90, depth: 90, height: 45 },
        description: "Distinctive cylindrical geodesic astronomical planetarium dome and science pavilion."
    },
    {
        id: "phoenix_palladium",
        name: "High Street Phoenix & Palladium Mall",
        district: "lower_parel",
        category: "commercial",
        x: -180,
        y: 6.5,
        z: -720,
        gps: { lat: 18.995000, lon: 72.824500 },
        footprint: { width: 220, depth: 180, height: 50 },
        description: "Sprawling luxury lifestyle retail and dining district developed on historic textile mill grounds."
    },
    {
        id: "peninsula_park",
        name: "Peninsula Corporate Park",
        district: "lower_parel",
        category: "commercial",
        x: -240,
        y: 7.0,
        z: -650,
        gps: { lat: 19.001000, lon: 72.828000 },
        footprint: { width: 140, depth: 110, height: 85 },
        description: "Twin modern corporate office towers housing technology incubators and financial firms."
    },
    {
        id: "siddhivinayak_temple",
        name: "Siddhivinayak Ganapati Temple",
        district: "lower_parel",
        category: "religious",
        x: -320,
        y: 5.5,
        z: -450,
        gps: { lat: 19.016800, lon: 72.830200 },
        footprint: { width: 55, depth: 55, height: 32 },
        description: "Famed six-tier multi-angular gold-plated temple dome venerating Lord Ganesha."
    },
    {
        id: "dadar_interchange",
        name: "Dadar Mega-Interchange Railway Station",
        district: "dadar",
        category: "transit",
        x: -120,
        y: 6.0,
        z: -320,
        gps: { lat: 19.017800, lon: 72.843200 },
        footprint: { width: 190, depth: 120, height: 22 },
        description: "The primary railway crossroad connecting Western Railway and Central Railway (15 platforms)."
    },
    {
        id: "shivaji_park",
        name: "Shivaji Park & Cricket Ground",
        district: "dadar",
        category: "sports",
        x: -380,
        y: 5.0,
        z: -280,
        gps: { lat: 19.026500, lon: 72.838500 },
        footprint: { width: 280, depth: 280, height: 4 },
        description: "28-acre cradle of Indian cricket, surrounded by walking tracks, rain trees, and colonial gymkhanas."
    },
    {
        id: "chaityabhoomi",
        name: "Chaityabhoomi Memorial",
        district: "dadar",
        category: "heritage",
        x: -520,
        y: 3.5,
        z: -260,
        gps: { lat: 19.027500, lon: 72.833500 },
        footprint: { width: 45, depth: 45, height: 16 },
        description: "Stupa memorial dedicated to Dr. B.R. Ambedkar fronting the Dadar shoreline."
    },
    {
        id: "dadar_flower_market",
        name: "Dadar Phool Galli (Flower Market)",
        district: "dadar",
        category: "commercial",
        x: -80,
        y: 6.0,
        z: -290,
        gps: { lat: 19.019500, lon: 72.844500 },
        footprint: { width: 40, depth: 180, height: 10 },
        description: "Teeming wholesale dawn market vibrant with marigolds, roses, and fragrant jasmine under the flyover."
    },
    {
        id: "mahim_dargah",
        name: "Makhdoom Ali Mahimi Dargah",
        district: "mahim",
        category: "religious",
        x: -420,
        y: 5.0,
        z: 80,
        gps: { lat: 19.039000, lon: 72.841500 },
        footprint: { width: 65, depth: 65, height: 28 },
        description: "15th-century Sufi shrine with ornate green dome and minarets; cultural landmark of Mahim."
    },
    {
        id: "mahim_fort",
        name: "Mahim Fort",
        district: "mahim",
        category: "heritage",
        x: -580,
        y: 6.0,
        z: 120,
        gps: { lat: 19.041500, lon: 72.837500 },
        footprint: { width: 50, depth: 40, height: 14 },
        description: "Historic strategic coastal fort overlooking the Mithi River mouth into Mahim Bay."
    },
    {
        id: "mahim_stn",
        name: "Mahim Railway Station & Junction",
        district: "mahim",
        category: "transit",
        x: -320,
        y: 6.0,
        z: 150,
        gps: { lat: 19.041000, lon: 72.844000 },
        footprint: { width: 130, depth: 60, height: 18 },
        description: "Suburban railway junction where Harbour Line diverges from Western Railway mainline."
    },
    {
        id: "sion_fort",
        name: "Sion Hill Fort",
        district: "sion",
        category: "heritage",
        x: 420,
        y: 28.0, // Conical hill summit
        z: 70,
        gps: { lat: 19.046500, lon: 72.865500 },
        footprint: { width: 70, depth: 50, height: 15 },
        description: "1669 British stone watchtower atop a rugged basalt knoll marking historic boundary of Bombay island."
    },
    {
        id: "sion_hospital",
        name: "Lokmanya Tilak Hospital (Sion)",
        district: "sion",
        category: "medical",
        x: 320,
        y: 8.0,
        z: 120,
        gps: { lat: 19.038500, lon: 72.860000 },
        footprint: { width: 130, depth: 110, height: 35 },
        description: "Major civic emergency trauma hospital and municipal medical college."
    },
    {
        id: "sion_circle",
        name: "Sion Circle & Fountain",
        district: "sion",
        category: "civic",
        x: 380,
        y: 8.0,
        z: 40,
        gps: { lat: 19.037000, lon: 72.862000 },
        footprint: { width: 60, depth: 60, height: 8 },
        description: "Key traffic roundabout connecting Ambedkar Road to the Eastern Express Highway."
    },

    // --- WESTERN SUBURBS ---
    {
        id: "mount_mary",
        name: "Mount Mary Basilica",
        district: "bandra",
        category: "religious",
        x: -1400,
        y: 38.0, // Mountain ridge
        z: 480,
        gps: { lat: 19.046000, lon: 72.822000 },
        footprint: { width: 70, depth: 45, height: 36 },
        description: "1904 neo-Gothic stone church atop Mount Mary hill ridge near Bandstand, venue of annual Bandra Fair."
    },
    {
        id: "bandstand_promenade",
        name: "Bandra Bandstand & Walk of Stars",
        district: "bandra",
        category: "waterfront",
        x: -1420,
        y: 4.0,
        z: 420,
        gps: { lat: 19.042500, lon: 72.818000 },
        footprint: { width: 30, depth: 1200, height: 4 },
        description: "Rocky sea coast beneath Mount Mary with celebrity seaside mansions and crashing waves."
    },
    {
        id: "bandra_stn",
        name: "Bandra Heritage Railway Station",
        district: "bandra",
        category: "transit",
        x: -680,
        y: 7.0,
        z: 480,
        gps: { lat: 19.054500, lon: 72.840500 },
        footprint: { width: 120, depth: 70, height: 18 },
        description: "Heritage Victorian railway station featuring ornate wooden fretwork gables and brick clock arches."
    },
    {
        id: "bkc_diamond_bourse",
        name: "Bharat Diamond Bourse (BKC)",
        district: "bandra",
        category: "commercial",
        x: 80,
        y: 8.0,
        z: 540,
        gps: { lat: 19.066000, lon: 72.866000 },
        footprint: { width: 280, depth: 240, height: 45 },
        description: "World's largest diamond trading complex, high-security multi-tower financial complex."
    },
    {
        id: "bkc_jio_centre",
        name: "Jio World Centre & Convention Park",
        district: "bandra",
        category: "commercial",
        x: 150,
        y: 8.5,
        z: 480,
        gps: { lat: 19.062000, lon: 72.868000 },
        footprint: { width: 210, depth: 160, height: 55 },
        description: "Monumental glass international convention center, performing arts theater, and musical fountain."
    },
    {
        id: "juhu_beach",
        name: "Juhu Beach Promenade",
        district: "santacruz_vileparle",
        category: "waterfront",
        x: -1350,
        y: 2.0,
        z: 1050,
        gps: { lat: 19.088000, lon: 72.826000 },
        footprint: { width: 90, depth: 1500, height: 4 },
        description: "Expansive sandy suburban beach with pavilion stalls, kite runners, and sunset horizon."
    },
    {
        id: "mithibai_college",
        name: "Mithibai College & NMIMS Campus",
        district: "santacruz_vileparle",
        category: "academic",
        x: -880,
        y: 8.0,
        z: 1180,
        gps: { lat: 19.102500, lon: 72.837500 },
        footprint: { width: 110, depth: 90, height: 40 },
        description: "Multi-disciplinary educational campus in Vile Parle West with dense student plazas."
    },
    {
        id: "csmia_terminal_1",
        name: "CSMIA Domestic Airport (Terminal 1)",
        district: "santacruz_vileparle",
        category: "aviation",
        x: -120,
        y: 10.0,
        z: 1120,
        gps: { lat: 19.088500, lon: 72.853500 },
        footprint: { width: 220, depth: 140, height: 25 },
        description: "Domestic passenger terminal complex in Santacruz East."
    },
    {
        id: "csmia_terminal_2",
        name: "CSMIA International Airport (Terminal 2)",
        district: "andheri_csmia",
        category: "aviation",
        x: 350,
        y: 15.0,
        z: 1400,
        gps: { lat: 19.097500, lon: 72.874500 },
        footprint: { width: 340, depth: 260, height: 48 },
        description: "Iconic international airport terminal featuring peacock-motif coffered roof canopy and aerobridge fingers."
    },
    {
        id: "csmia_runway",
        name: "CSMIA Main Cross Runways (09/27 & 14/32)",
        district: "andheri_csmia",
        category: "infrastructure",
        x: 200,
        y: 12.0,
        z: 1300,
        gps: { lat: 19.090000, lon: 72.865000 },
        footprint: { width: 3400, depth: 60, height: 1 },
        description: "Main asphalt aviation runways handling non-stop international aircraft operations."
    },
    {
        id: "andheri_metro",
        name: "Andheri Railway & Metro Interchange",
        district: "andheri_csmia",
        category: "transit",
        x: -650,
        y: 8.0,
        z: 1550,
        gps: { lat: 19.119700, lon: 72.846500 },
        footprint: { width: 160, depth: 80, height: 28 },
        description: "Skywalk interchange linking suburban rail platforms to elevated Versova-Ghatkopar Metro Line 1."
    },
    {
        id: "lokhandwala_market",
        name: "Lokhandwala High Street Market",
        district: "andheri_csmia",
        category: "commercial",
        x: -1200,
        y: 7.0,
        z: 1650,
        gps: { lat: 19.141500, lon: 72.825000 },
        footprint: { width: 30, depth: 600, height: 20 },
        description: "Trendy fashion boutiques, celebrity cafes, and busy retail pedestrian strip."
    },
    {
        id: "film_city",
        name: "Dadasaheb Phalke Film City Studios",
        district: "goregaon",
        category: "entertainment",
        x: -150,
        y: 25.0, // Foothill terrain
        z: 2050,
        gps: { lat: 19.162000, lon: 72.887000 },
        footprint: { width: 450, depth: 400, height: 22 },
        description: "520-acre film production studio complex with outdoor architectural set facades and soundstages."
    },
    {
        id: "nesco_expo",
        name: "Bombay Exhibition Centre (NESCO)",
        district: "goregaon",
        category: "commercial",
        x: -420,
        y: 12.0,
        z: 1920,
        gps: { lat: 19.153000, lon: 72.854000 },
        footprint: { width: 280, depth: 200, height: 24 },
        description: "Multi-hall trade exhibition complex flanking the Western Express Highway."
    },
    {
        id: "mindspace_malad",
        name: "Mindspace Malad IT Business Park",
        district: "malad_kandivali",
        category: "tech",
        x: -1150,
        y: 6.0,
        z: 2240,
        gps: { lat: 19.182000, lon: 72.834000 },
        footprint: { width: 240, depth: 190, height: 60 },
        description: "Suburban high-tech IT towers bordering western tidal mangrove creeks."
    },
    {
        id: "borivali_terminus",
        name: "Borivali Railway Terminus",
        district: "borivali",
        category: "transit",
        x: -520,
        y: 14.0,
        z: 2480,
        gps: { lat: 19.229000, lon: 72.857000 },
        footprint: { width: 210, depth: 110, height: 20 },
        description: "10-platform railway terminal handling both suburban local trains and long-distance outstation expresses."
    },
    {
        id: "gorai_pagoda",
        name: "Global Vipassana Pagoda",
        district: "borivali",
        category: "monument",
        x: -1850,
        y: 15.0,
        z: 2450,
        gps: { lat: 19.230000, lon: 72.805500 },
        footprint: { width: 95, depth: 95, height: 96 },
        description: "World's largest hollow stone dome with golden spire, set across Gorai Creek."
    },

    // --- EASTERN SUBURBS ---
    {
        id: "kurla_junction",
        name: "Kurla Railway Junction",
        district: "kurla",
        category: "transit",
        x: 580,
        y: 8.0,
        z: 480,
        gps: { lat: 19.065500, lon: 72.879500 },
        footprint: { width: 180, depth: 100, height: 20 },
        description: "Major dual-level junction connecting Central Railway main line to Harbour suburban branch line."
    },
    {
        id: "phoenix_marketcity",
        name: "Phoenix Marketcity Mall Kurla",
        district: "kurla",
        category: "commercial",
        x: 480,
        y: 9.0,
        z: 580,
        gps: { lat: 19.086000, lon: 72.889000 },
        footprint: { width: 240, depth: 210, height: 40 },
        description: "One of India's largest shopping megaplexes spanning 2.1 million square feet on LBS Marg."
    },
    {
        id: "sclr_flyover",
        name: "Santacruz-Chembur Link Road Flyover",
        district: "kurla",
        category: "infrastructure",
        x: 520,
        y: 16.0,
        z: 380,
        gps: { lat: 19.072000, lon: 72.885000 },
        footprint: { width: 18, depth: 1200, height: 18 },
        description: "Double-decker arterial flyover bridging western and eastern corridors over the Central rail tracks."
    },
    {
        id: "diamond_garden",
        name: "Chembur Diamond Garden",
        district: "chembur",
        category: "park",
        x: 880,
        y: 9.0,
        z: -40,
        gps: { lat: 19.055000, lon: 72.901000 },
        footprint: { width: 110, depth: 110, height: 4 },
        description: "Octagonal green garden with historic MiG-21 fighter aircraft memorial display."
    },
    {
        id: "ghatkopar_metro",
        name: "Ghatkopar Railway & Metro Terminal",
        district: "ghatkopar",
        category: "transit",
        x: 680,
        y: 10.0,
        z: 1020,
        gps: { lat: 19.086500, lon: 72.908000 },
        footprint: { width: 150, depth: 80, height: 26 },
        description: "Eastern terminus of Metro Line 1 with integrated elevated transfer concourse to Central suburban platforms."
    },
    {
        id: "r_city_mall",
        name: "R City Mall Ghatkopar",
        district: "ghatkopar",
        category: "commercial",
        x: 590,
        y: 11.0,
        z: 1150,
        gps: { lat: 19.099000, lon: 72.916000 },
        footprint: { width: 210, depth: 170, height: 42 },
        description: "Massive suburban shopping and family leisure destination on LBS Marg."
    },
    {
        id: "godrej_campus",
        name: "Godrej & Boyce Industrial Complex",
        district: "vikhroli_bhandup",
        category: "industrial",
        x: 760,
        y: 12.0,
        z: 1480,
        gps: { lat: 19.102000, lon: 72.928000 },
        footprint: { width: 300, depth: 250, height: 35 },
        description: "Advanced engineering manufacturing campus and green building complex bordering eastern mangrove reserve."
    },
    {
        id: "jvlr_east",
        name: "JVLR Eastern Cloverleaf Interchange",
        district: "vikhroli_bhandup",
        category: "infrastructure",
        x: 720,
        y: 14.0,
        z: 1620,
        gps: { lat: 19.124000, lon: 72.932000 },
        footprint: { width: 80, depth: 80, height: 18 },
        description: "Cloverleaf highway junction connecting Jogeshwari-Vikhroli Link Road to the Eastern Express Highway."
    },
    {
        id: "powai_lake",
        name: "Powai Lake & Promenade",
        district: "vikhroli_bhandup",
        category: "natural",
        x: 300,
        y: 24.0, // Valley elevation
        z: 1650,
        gps: { lat: 19.125000, lon: 72.905000 },
        footprint: { width: 750, depth: 500, height: 12 },
        description: "Scenic inland lake surrounded by Hiranandani neo-classical residential spires and lush foothills."
    },
    {
        id: "iit_bombay",
        name: "Indian Institute of Technology Bombay (IIT-B)",
        district: "vikhroli_bhandup",
        category: "academic",
        x: 420,
        y: 26.0,
        z: 1720,
        gps: { lat: 19.133000, lon: 72.915000 },
        footprint: { width: 260, depth: 220, height: 32 },
        description: "India's premier engineering research campus with wooded avenues bordering Powai Lake."
    },
    {
        id: "mulund_stn",
        name: "Mulund Railway Station",
        district: "mulund",
        category: "transit",
        x: 790,
        y: 14.0,
        z: 2040,
        gps: { lat: 19.172500, lon: 72.956000 },
        footprint: { width: 140, depth: 60, height: 16 },
        description: "Suburban railway hub connecting the residential high-rises of Mulund to the Mumbai core."
    },

    // --- NORTHERN HIGHLANDS & NATIONAL PARK ---
    {
        id: "kanheri_caves",
        name: "Kanheri Caves Buddhist Rock Sanctuary",
        district: "sgnp_highlands",
        category: "heritage",
        x: 600,
        y: 95.0, // High basalt massif
        z: 2300,
        gps: { lat: 19.206000, lon: 72.906000 },
        footprint: { width: 250, depth: 180, height: 40 },
        description: "109 rock-cut Buddhist basalt cave temples dating back to 1st century BCE in the heart of SGNP."
    },
    {
        id: "vihar_lake",
        name: "Vihar Lake Dam & Reservoir",
        district: "sgnp_highlands",
        category: "natural",
        x: 450,
        y: 45.0, // Mountain lake
        z: 1600,
        gps: { lat: 19.141000, lon: 72.902000 },
        footprint: { width: 900, depth: 700, height: 20 },
        description: "Historical 1860 freshwater lake reservoir supplying Mumbai, nestled in dense tropical forest."
    },

    // --- THANE DISTRICT ---
    {
        id: "thane_junction",
        name: "Thane Mega Railway Junction",
        district: "thane_city",
        category: "transit",
        x: 1180,
        y: 15.0,
        z: 2380,
        gps: { lat: 19.186000, lon: 72.975500 },
        footprint: { width: 230, depth: 130, height: 24 },
        description: "Historic junction station where India's first train terminated in 1853; 10 platforms connecting to Kalyan and Navi Mumbai."
    },
    {
        id: "talao_pali",
        name: "Talao Pali Lake & Boating Pavilion",
        district: "thane_city",
        category: "natural",
        x: 1120,
        y: 16.0,
        z: 2440,
        gps: { lat: 19.193000, lon: 72.973000 },
        footprint: { width: 180, depth: 150, height: 6 },
        description: "Scenic city lake in Old Thane with central Shivaji statue island, water sports, and illuminated promenade."
    },
    {
        id: "viviana_mall",
        name: "Viviana Mall Thane",
        district: "thane_city",
        category: "commercial",
        x: 1050,
        y: 16.0,
        z: 2480,
        gps: { lat: 19.209000, lon: 72.972000 },
        footprint: { width: 240, depth: 200, height: 38 },
        description: "Premier shopping mall in Thane with Cinepolis IMAX megaplex along the Eastern Express Highway."
    },

    // --- NAVI MUMBAI DISTRICT (ACROSS THANE CREEK) ---
    {
        id: "airoli_stn",
        name: "Airoli Railway Station",
        district: "airoli",
        category: "transit",
        x: 1700,
        y: 12.0,
        z: 1420,
        gps: { lat: 19.158000, lon: 72.993000 },
        footprint: { width: 130, depth: 60, height: 18 },
        description: "Trans-Harbour corridor station serving DMCE College students and Mindspace tech employees."
    },
    {
        id: "mindspace_airoli",
        name: "Mindspace Airoli Knowledge Park",
        district: "airoli",
        category: "tech",
        x: 1750,
        y: 13.0,
        z: 1350,
        gps: { lat: 19.153000, lon: 72.998000 },
        footprint: { width: 280, depth: 220, height: 55 },
        description: "50-acre Special Economic Zone IT campus housing international software research operations."
    },
    {
        id: "airoli_bridge_east",
        name: "Airoli Bridge East Landfall",
        district: "airoli",
        category: "infrastructure",
        x: 1650,
        y: 16.0,
        z: 1400,
        gps: { lat: 19.155000, lon: 72.985000 },
        footprint: { width: 30, depth: 80, height: 18 },
        description: "Eastern bridge abutment connecting Mulund across Thane Creek directly into DMCE College avenue."
    },
    {
        id: "airoli_bridge_west",
        name: "Airoli Bridge West Landfall",
        district: "mulund",
        category: "infrastructure",
        x: 950,
        y: 16.0,
        z: 1400,
        gps: { lat: 19.155000, lon: 72.955000 },
        footprint: { width: 30, depth: 80, height: 18 },
        description: "Western bridge landfall connecting Eastern Express Highway to the Airoli creek span."
    },
    {
        id: "vashi_stn_complex",
        name: "Vashi Railway Station & Infotech Complex",
        district: "vashi",
        category: "transit",
        x: 1720,
        y: 8.0,
        z: -120,
        gps: { lat: 19.064500, lon: 72.998500 },
        footprint: { width: 220, depth: 140, height: 40 },
        description: "Monumental station building with six integrated commercial office towers bridging rail lines."
    },
    {
        id: "inorbit_vashi",
        name: "Inorbit Mall Vashi",
        district: "vashi",
        category: "commercial",
        x: 1760,
        y: 9.0,
        z: -80,
        gps: { lat: 19.066500, lon: 73.001000 },
        footprint: { width: 180, depth: 140, height: 32 },
        description: "Major retail destination in Sector 30A next to Vashi station."
    },
    {
        id: "apmc_market",
        name: "APMC Wholesale Agricultural Market",
        district: "vashi",
        category: "commercial",
        x: 1920,
        y: 8.0,
        z: -160,
        gps: { lat: 19.073000, lon: 73.011000 },
        footprint: { width: 350, depth: 280, height: 20 },
        description: "Asia's largest wholesale agricultural trade produce terminal with grains, fruits, and spices."
    },
    {
        id: "vashi_bridge_east",
        name: "Vashi Bridge East Landfall & Toll Plaza",
        district: "vashi",
        category: "infrastructure",
        x: 1550,
        y: 14.0,
        z: -400,
        gps: { lat: 19.060000, lon: 72.982000 },
        footprint: { width: 45, depth: 90, height: 16 },
        description: "10-lane expressway bridge landing connecting Mankhurd across Thane Creek into Vashi."
    },
    {
        id: "sanpada_stn",
        name: "Sanpada Railway Station",
        district: "sanpada_juinagar",
        category: "transit",
        x: 1780,
        y: 9.0,
        z: 320,
        gps: { lat: 19.068000, lon: 73.012000 },
        footprint: { width: 130, depth: 55, height: 16 },
        description: "Suburban railway station at junction of Harbour and Trans-Harbour corridors."
    },
    {
        id: "juinagar_carshed",
        name: "Juinagar EMU Rail Maintenance Car Shed",
        district: "sanpada_juinagar",
        category: "industrial",
        x: 1840,
        y: 10.0,
        z: 550,
        gps: { lat: 19.055000, lon: 73.019000 },
        footprint: { width: 320, depth: 140, height: 18 },
        description: "Central Railway suburban EMU train depot, railyards, and overhead catenary maintenance sheds."
    },
    {
        id: "dy_patil_stadium",
        name: "D.Y. Patil International Sports Stadium",
        district: "nerul",
        category: "sports",
        x: 1900,
        y: 10.0,
        z: 1100,
        gps: { lat: 19.043500, lon: 73.025500 },
        footprint: { width: 220, depth: 200, height: 44 },
        description: "55,000-seat world-class stadium with distinctive cantilevered roof canopy for cricket and football."
    },
    {
        id: "nerul_balaji",
        name: "Nerul Sri Venkateswara Balaji Temple",
        district: "nerul",
        category: "religious",
        x: 1980,
        y: 24.0, // Hill knoll
        z: 950,
        gps: { lat: 19.034000, lon: 73.021000 },
        footprint: { width: 65, depth: 50, height: 28 },
        description: "Replica of the famous Tirupati Balaji Temple set atop a rocky knoll with a towering gopuram."
    },
    {
        id: "cidco_bhavan",
        name: "CIDCO Bhavan & Administrative HQ",
        district: "cbd_belapur",
        category: "civic",
        x: 1950,
        y: 14.0,
        z: -850,
        gps: { lat: 19.018000, lon: 73.040000 },
        footprint: { width: 160, depth: 110, height: 52 },
        description: "Headquarters of the City and Industrial Development Corporation in CBD Belapur."
    },
    {
        id: "panvel_terminus",
        name: "Panvel Junction Railway Terminus",
        district: "panvel",
        category: "transit",
        x: 2400,
        y: 12.0,
        z: -2100,
        gps: { lat: 18.989000, lon: 73.121500 },
        footprint: { width: 240, depth: 110, height: 22 },
        description: "Southern suburban terminal and gateway to Konkan Railway express trains towards Goa and Kerala."
    },

    // --- WATERWAY BRIDGES & MARITIME MONUMENTS ---
    {
        id: "sea_link_north",
        name: "Bandra-Worli Sea Link (North Pylon)",
        district: "bandra",
        category: "monument",
        x: -1150,
        y: 82.0,
        z: 250,
        gps: { lat: 19.035000, lon: 72.818000 },
        footprint: { width: 24, depth: 24, height: 82 },
        description: "Cable-stayed concrete diamond pylon supporting the main suspension cables across Mahim Bay."
    },
    {
        id: "sea_link_south",
        name: "Bandra-Worli Sea Link (South Pylon)",
        district: "worli",
        category: "monument",
        x: -1000,
        y: 82.0,
        z: -150,
        gps: { lat: 19.022000, lon: 72.816000 },
        footprint: { width: 24, depth: 24, height: 82 },
        description: "Southern cable-stayed diamond pylon on the Worli approach span."
    }
];

// ============================================================================
// 5. NATURAL WATER BODIES SPECIFICATION
// ============================================================================
export const WATER_BODIES = {
    arabianSea: {
        id: "arabian_sea",
        name: "Arabian Sea",
        type: "ocean",
        surfaceElevation: 0.0,
        bounds: { minX: -2500, maxX: -1100, minZ: -2500, maxZ: 2500 },
        shorelinePoints: [
            { x: -1100, z: -2500 }, // Colaba South
            { x: -850, z: -2000 },  // Nariman Point
            { x: -950, z: -1300 },  // Chowpatty
            { x: -1100, z: -900 },  // Worli South
            { x: -980, z: -500 },   // Worli Point
            { x: -1420, z: 420 },   // Bandstand
            { x: -1350, z: 1050 },  // Juhu Beach
            { x: -1250, z: 1800 },  // Versova
            { x: -1200, z: 2500 }   // Gorai Creek
        ],
        waveHeight: 0.8,
        waveFrequency: 0.18
    },

    mahimBay: {
        id: "mahim_bay",
        name: "Mahim Bay",
        type: "bay",
        surfaceElevation: 0.0,
        bounds: { minX: -1400, maxX: -600, minZ: -300, maxZ: 500 },
        seaLinkSpan: {
            northAbutment: { x: -1250, y: 18.0, z: 450 },
            southAbutment: { x: -900, y: 18.0, z: -500 },
            deckHeight: 18.0,
            pylonHeight: 82.0
        },
        mithiDischarge: { x: -650, z: 150 }
    },

    thaneCreek: {
        id: "thane_creek",
        name: "Thane Creek Tidal Estuary",
        type: "tidal_estuary",
        surfaceElevation: 0.0,
        bounds: { minX: 900, maxX: 1650, minZ: -2500, maxZ: 2500 },
        crossings: [
            {
                id: "airoli_bridge",
                name: "Airoli Bridge",
                westNode: { x: 950, y: 16.0, z: 1400 },
                eastNode: { x: 1650, y: 16.0, z: 1400 },
                lanes: 6,
                deckHeight: 16.0
            },
            {
                id: "vashi_bridge",
                name: "Vashi Bridge (Sion-Panvel Expressway)",
                westNode: { x: 850, y: 14.0, z: -400 },
                eastNode: { x: 1550, y: 14.0, z: -400 },
                lanes: 10,
                deckHeight: 14.0
            }
        ],
        mangroveFringes: true
    },

    backBay: {
        id: "back_bay",
        name: "Back Bay (Marine Drive Arc)",
        type: "bay",
        surfaceElevation: 0.0,
        bounds: { minX: -1200, maxX: -650, minZ: -2200, maxZ: -1400 }
    },

    mithiRiver: {
        id: "mithi_river",
        name: "Mithi River Corridor",
        type: "river",
        surfaceElevation: 2.0,
        waypoints: [
            { x: 450, z: 1600, y: 45.0, name: "Vihar Lake Overflow" },
            { x: 500, z: 1100, y: 15.0, name: "Saki Naka" },
            { x: 550, z: 500, y: 8.0, name: "Kurla" },
            { x: 150, z: 200, y: 5.0, name: "BKC Border" },
            { x: 0, z: 100, y: 4.0, name: "Dharavi North" },
            { x: -400, z: 120, y: 2.0, name: "Mahim Causeway" },
            { x: -650, z: 150, y: 0.0, name: "Mahim Bay Outlet" }
        ]
    },

    lakes: [
        { id: "vihar_lake", name: "Vihar Lake", x: 450, z: 1600, radius: 450, surfaceElevation: 45.0 },
        { id: "powai_lake", name: "Powai Lake", x: 300, z: 1650, radius: 320, surfaceElevation: 24.0 },
        { id: "talao_pali", name: "Talao Pali Lake (Thane)", x: 1120, z: 2440, radius: 90, surfaceElevation: 16.0 }
    ]
};

// ============================================================================
// 6. MATHEMATICAL TERRAIN & ELEVATION ENGINE
// ============================================================================
export const TERRAIN_HILLS = [
    // Fr. Agnel Technical High School Bandra West Ridge
    {
        id: "hill_agnel_bandra",
        name: "Mount Mary & Bandstand Ridge (School Promontory)",
        centerX: -1380,
        centerZ: 520,
        peakElevation: 34.0,
        sigmaX: 180,
        sigmaZ: 220
    },
    // Malabar Hill & Hanging Gardens
    {
        id: "hill_malabar",
        name: "Malabar Hill & Walkeshwar Promontory",
        centerX: -850,
        centerZ: -1400,
        peakElevation: 44.0,
        sigmaX: 220,
        sigmaZ: 320
    },
    // Worli Fort Knoll
    {
        id: "hill_worli",
        name: "Worli Fort Knoll",
        centerX: -850,
        centerZ: -600,
        peakElevation: 22.0,
        sigmaX: 120,
        sigmaZ: 150
    },
    // Sion Hill Fort
    {
        id: "hill_sion",
        name: "Sion Fort Basalt Rock",
        centerX: 420,
        centerZ: 70,
        peakElevation: 28.0,
        sigmaX: 110,
        sigmaZ: 110
    },
    // Sanjay Gandhi National Park / Kanheri Caves Massif
    {
        id: "hill_sgnp_kanheri",
        name: "Kanheri Mountain Massif (SGNP)",
        centerX: 650,
        centerZ: 2350,
        peakElevation: 125.0,
        sigmaX: 450,
        sigmaZ: 550
    },
    // Parsik Hill Ridge (Navi Mumbai / Belapur)
    {
        id: "hill_parsik",
        name: "Parsik Hill Ridge (Belapur/Nerul)",
        centerX: 2150,
        centerZ: -650,
        peakElevation: 75.0,
        sigmaX: 200,
        sigmaZ: 600
    },
    // Trombay Hill (BARC / Chembur)
    {
        id: "hill_trombay",
        name: "Trombay Hill",
        centerX: 1250,
        centerZ: -450,
        peakElevation: 48.0,
        sigmaX: 250,
        sigmaZ: 300
    }
];

/**
 * Computes deterministic terrain elevation Y at any Cartesian coordinate (x, z).
 * Accounts for baseline ground, natural hill features, and water clamping.
 *
 * @param {number} x - East/West coordinate in meters
 * @param {number} z - North/South coordinate in meters
 * @returns {number} Elevation in meters above sea level
 */
export function getTerrainElevation(x, z) {
    // 1. Water plane clamp (Arabian Sea, Back Bay, Thane Creek deep channel)
    if (x < -1350 && z > -2500 && z < 2500) {
        // Deep western Arabian sea
        if (x < -1450) return 0.0;
    }
    if (x > 1050 && x < 1550 && z > -2200 && z < 2200) {
        // Center of Thane Creek channel
        return 0.0;
    }
    if (x < -750 && z > -2200 && z < -1400) {
        // Back Bay sea surface
        if (x < -950) return 0.0;
    }

    // 2. Base terrain baseline
    let baseElevation = 5.0; // Standard Mumbai coastal plain average

    // Gradual rise towards northern Salsette hinterland
    if (z > 500) {
        baseElevation += ((z - 500) / 2000.0) * 8.0;
    }

    // 3. Multi-hill Gaussian accumulation
    let hillContribution = 0.0;
    for (let i = 0; i < TERRAIN_HILLS.length; i++) {
        const hill = TERRAIN_HILLS[i];
        const dx = (x - hill.centerX) / hill.sigmaX;
        const dz = (z - hill.centerZ) / hill.sigmaZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < 9.0) { // Calculate within 3 sigmas
            hillContribution += hill.peakElevation * Math.exp(-0.5 * distSq);
        }
    }

    const totalY = baseElevation + hillContribution;
    return parseFloat(Math.max(0.0, totalY).toFixed(2));
}

export const getElevationAt = getTerrainElevation;

/**
 * Determines whether a given coordinate (x, z) is over water.
 * @param {number} x
 * @param {number} z
 * @returns {{ isWater: boolean, body: string|null }}
 */
export function isWater(x, z) {
    // Arabian Sea
    if (x < -1450) {
        return { isWater: true, body: "arabian_sea" };
    }
    // Mahim Bay
    if (x >= -1350 && x <= -700 && z >= -250 && z <= 350) {
        return { isWater: true, body: "mahim_bay" };
    }
    // Back Bay
    if (x >= -1200 && x <= -900 && z >= -2100 && z <= -1450) {
        return { isWater: true, body: "back_bay" };
    }
    // Thane Creek
    if (x >= 1050 && x <= 1550 && z >= -2000 && z <= 2200) {
        return { isWater: true, body: "thane_creek" };
    }
    // Freshwater lakes
    for (const lake of WATER_BODIES.lakes) {
        const dx = x - lake.x;
        const dz = z - lake.z;
        if (dx * dx + dz * dz <= lake.radius * lake.radius) {
            return { isWater: true, body: lake.id };
        }
    }

    return { isWater: false, body: null };
}

// ============================================================================
// 7. DISTRICT & LANDMARK QUERY UTILITIES
// ============================================================================

/**
 * Finds the district containing coordinate (x, z).
 * @param {number} x
 * @param {number} z
 * @returns {object|null} District object or null if outside bounds
 */
export function getDistrictAt(x, z) {
    for (const key in DISTRICTS) {
        const d = DISTRICTS[key];
        if (x >= d.bounds.minX && x <= d.bounds.maxX &&
            z >= d.bounds.minZ && z <= d.bounds.maxZ) {
            return d;
        }
    }
    return null;
}

/**
 * Finds the nearest landmark to coordinate (x, z).
 * @param {number} x
 * @param {number} z
 * @returns {{ landmark: object, distance: number }}
 */
export function getNearestLandmark(x, z) {
    let best = null;
    let minDist = Infinity;

    for (let i = 0; i < LANDMARKS.length; i++) {
        const l = LANDMARKS[i];
        const dx = x - l.x;
        const dz = z - l.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) {
            minDist = dist;
            best = l;
        }
    }

    return {
        landmark: best,
        distance: Math.round(minDist)
    };
}

/**
 * Gets all landmarks belonging to a specific district.
 * @param {string} districtId
 * @returns {Array<object>}
 */
export function getLandmarksByDistrict(districtId) {
    return LANDMARKS.filter(l => l.district === districtId);
}

/**
 * Gets all landmarks of a given category (e.g. 'academic', 'transit', 'heritage').
 * @param {string} category
 * @returns {Array<object>}
 */
export function getLandmarksByCategory(category) {
    return LANDMARKS.filter(l => l.category === category);
}

/**
 * Computes straight-line Euclidean distance between two points in meters.
 * @param {{x: number, z: number}} ptA
 * @param {{x: number, z: number}} ptB
 * @returns {number}
 */
export function getDistance(ptA, ptB) {
    const dx = ptA.x - ptB.x;
    const dz = ptA.z - ptB.z;
    return Math.round(Math.sqrt(dx * dx + dz * dz));
}

// ============================================================================
// 8. UNIFIED EXPORTS & BROWSER / NODE COMPATIBILITY
// ============================================================================
const MumbaiGeography = {
    WORLD_CONFIG,
    GPS_ANCHOR,
    DISTRICTS,
    LANDMARKS,
    WATER_BODIES,
    TERRAIN_HILLS,
    worldToGps,
    gpsToWorld,
    getTerrainElevation,
    isWater,
    getDistrictAt,
    getNearestLandmark,
    getLandmarksByDistrict,
    getLandmarksByCategory,
    getDistance
};

// Browser global compatibility
if (typeof window !== 'undefined') {
    window.MumbaiGeography = MumbaiGeography;
}

export default MumbaiGeography;
