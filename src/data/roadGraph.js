/**
 * ==============================================================================
 * MUMBAI METROPOLITAN OPEN-WORLD ROAD NETWORK GRAPH
 * ==============================================================================
 * 5km x 5km Navigable Directed Road Network for Mumbai 3D World (expandable to 10km).
 * Coordinate bounds: X in [-2500, +2500], Z in [-2500, +2500] (in meters).
 * Centered around Dharavi Koliwada (Mahim East) at (0, 8.0, 0).
 *
 * Geographical Alignment with MUMBAI_MASTER_GEOGRAPHY & map_pack/03_road_district_connectivity:
 * - Western Corridor (Coastal Road & WEH):
 *   Colaba (-450, -2150) -> Marine Drive (-850, -1700) -> Worli (-900, -500) ->
 *   Bandra-Worli Sea Link -> Bandra (-1250, 450) -> Fr. Agnel School (-1350, 32.0, 520) ->
 *   Santacruz (-650, 600) -> Andheri (-650, 1150) -> Borivali (-650, 2350).
 * - Central & Eastern Corridor (Eastern Express Highway & Eastern Freeway):
 *   Fort / CSMT (-450, -1800) -> Dadar (50, -350) -> Sion (150, 50) ->
 *   Kurla (450, 500) -> Ghatkopar (550, 850) -> Vikhroli (680, 1350) ->
 *   Mulund (880, 1400) -> Thane (980, 2250).
 * - East-West Connectors:
 *   - SCLR (Santacruz-Chembur Link Road): WEH Santacruz <-> Kurla <-> EEH Amar Mahal
 *   - JVLR (Jogeshwari-Vikhroli Link Road): WEH Jogeshwari <-> Powai Lake <-> EEH Vikhroli
 *   - AGLR (Andheri-Ghatkopar Link Road): WEH Andheri <-> Sakinaka / Airport <-> EEH Ghatkopar
 *   - BKC Chunabhatti Elevated Connector: BKC <-> EEH Priyadarshini
 * - Navi Mumbai & Harbour Connectors:
 *   - Vashi Bridge (Sion-Panvel Highway): Mankhurd (850, -400) -> Vashi (1550, -400) ->
 *     Nerul -> Belapur -> Panvel (-2200).
 *   - Airoli Bridge (Mulund-Airoli Road): Mulund (950, 1400) -> Airoli (1650, 1400) ->
 *     DMCE College of Engineering (1850, 12.0, 1450).
 * - Local Street Meshes:
 *   - South Mumbai Heritage grid (Colaba Causeway, Gateway waterfront, Flora Fountain)
 *   - Bandra West coastal hill mesh (Bandstand, Mt. Mary ridge, Hill Road, Linking Road)
 *   - Central Nexus (Dharavi 90ft/60ft roads, Home HQ Plaza at 0, 140)
 *   - Airoli DMCE Academic Campus & Tech Park Grid
 *
 * Technical Specifications:
 * - Full Directed Graph with Nodes & Edges
 * - Lanes (2 to 8 lanes), Speed Limits (20 to 100 km/h), Road Widths, Surfaces & Elevation
 * - Traffic Signal Junction mappings for Simulation AI (aligned with main.js trafficSignals array)
 * - Dijkstra & A* Pathfinding Engine for In-Game Minimap GPS & Traffic AI
 * ==============================================================================
 */

export const ROAD_CORRIDORS = {
    WESTERN_CORRIDOR: 'western_corridor',
    EASTERN_CORRIDOR: 'central_eastern_corridor',
    EAST_WEST_CONNECTORS: 'east_west_connector',
    NAVI_MUMBAI_CONNECTORS: 'navi_mumbai_connector',
    LOCAL_MESH: 'local_mesh'
};

export const ROAD_SURFACES = {
    ASPHALT: 'asphalt',
    CONCRETE: 'concrete',
    SEA_BRIDGE: 'sea_bridge',
    FLYOVER: 'flyover',
    PAVED_ALLEY: 'paved_alley'
};

export const DISTRICTS = {
    SOUTH_MUMBAI: 'south_mumbai',
    WORLI_LOWER_PAREL: 'worli_lower_parel',
    BANDRA: 'bandra',
    WESTERN_SUBURBS: 'western_suburbs',
    DHARAVI_SION: 'dharavi_sion',
    EASTERN_SUBURBS: 'eastern_suburbs',
    THANE: 'thane',
    NAVI_MUMBAI: 'navi_mumbai'
};

// ==============================================================================
// 1. ROAD NODES
// ==============================================================================
export const ROAD_NODES = {
    // --------------------------------------------------------------------------
    // SOUTH MUMBAI CORRIDOR (-Z)
    // --------------------------------------------------------------------------
    'node_colaba_south': {
        id: 'node_colaba_south',
        name: 'Colaba Navy Nagar Roundabout',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -750, y: 2.0, z: -2450,
        type: 'arterial_intersection',
        trafficSignalId: null
    },
    'node_colaba_causeway': {
        id: 'node_colaba_causeway',
        name: 'Colaba Causeway Bazaar Junction',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -600, y: 2.5, z: -2300,
        type: 'local_junction',
        trafficSignalId: 30
    },
    'node_gateway_waterfront': {
        id: 'node_gateway_waterfront',
        name: 'Gateway of India Waterfront Plaza',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -350, y: 2.5, z: -2250,
        type: 'local_junction',
        trafficSignalId: null
    },
    'node_gateway_junction': {
        id: 'node_gateway_junction',
        name: 'Gateway of India & Regal Circle Junction',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -450, y: 2.5, z: -2150,
        type: 'arterial_intersection',
        trafficSignalId: 31
    },
    'node_nariman_point': {
        id: 'node_nariman_point',
        name: 'Nariman Point Financial Plaza',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -820, y: 3.0, z: -1950,
        type: 'arterial_intersection',
        trafficSignalId: 32
    },
    'node_marine_drive_south': {
        id: 'node_marine_drive_south',
        name: "Marine Drive South Promenade (Queen's Necklace)",
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -850, y: 3.5, z: -1700,
        type: 'arterial_intersection',
        trafficSignalId: null
    },
    'node_marine_drive_mid': {
        id: 'node_marine_drive_mid',
        name: 'Marine Drive (Wankhede Stadium Curve)',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -870, y: 3.0, z: -1600,
        type: 'arterial_intersection',
        trafficSignalId: 33
    },
    'node_marine_drive_chowpatty': {
        id: 'node_marine_drive_chowpatty',
        name: 'Girgaon Chowpatty Junction',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -920, y: 2.5, z: -1350,
        type: 'arterial_intersection',
        trafficSignalId: 34
    },
    'node_churchgate_stn': {
        id: 'node_churchgate_stn',
        name: 'Churchgate Station East Concourse Road',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -700, y: 2.5, z: -1750,
        type: 'local_junction',
        trafficSignalId: 35
    },
    'node_fort_csmt': {
        id: 'node_fort_csmt',
        name: 'CSMT Station & Fort Heritage Crossway',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -450, y: 2.5, z: -1800,
        type: 'arterial_intersection',
        trafficSignalId: 36
    },
    'node_flora_fountain': {
        id: 'node_flora_fountain',
        name: 'Flora Fountain / Hutatma Chowk',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -550, y: 2.5, z: -1800,
        type: 'arterial_intersection',
        trafficSignalId: 37
    },
    'node_p_dmello_south': {
        id: 'node_p_dmello_south',
        name: "P. D'Mello Road Port Docks Corridor",
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -300, y: 2.5, z: -1700,
        type: 'arterial_intersection',
        trafficSignalId: null
    },
    'node_eastern_freeway_start': {
        id: 'node_eastern_freeway_start',
        name: 'Eastern Freeway South Ramp (Wadi Bunder)',
        district: DISTRICTS.SOUTH_MUMBAI,
        x: -250, y: 6.0, z: -1400,
        type: 'highway_interchange',
        trafficSignalId: null
    },

    // --------------------------------------------------------------------------
    // CENTRAL & WORLI / LOWER PAREL DISTRICT (-Z to 0)
    // --------------------------------------------------------------------------
    'node_coastal_road_tunnel': {
        id: 'node_coastal_road_tunnel',
        name: 'Coastal Road Marine Tunnel Entrance (Priyadarshini Park)',
        district: DISTRICTS.WORLI_LOWER_PAREL,
        x: -880, y: 2.0, z: -1200,
        type: 'highway_interchange',
        trafficSignalId: null
    },
    'node_haji_ali_junction': {
        id: 'node_haji_ali_junction',
        name: 'Haji Ali Dargah Traffic Interchange',
        district: DISTRICTS.WORLI_LOWER_PAREL,
        x: -850, y: 2.5, z: -950,
        type: 'arterial_intersection',
        trafficSignalId: 38
    },
    'node_lower_parel_sb_marg': {
        id: 'node_lower_parel_sb_marg',
        name: 'Senapati Bapat Marg (Phoenix Mills / High Street)',
        district: DISTRICTS.WORLI_LOWER_PAREL,
        x: -450, y: 4.0, z: -800,
        type: 'arterial_intersection',
        trafficSignalId: 39
    },
    'node_byculla_junction': {
        id: 'node_byculla_junction',
        name: 'Byculla Fire Station & Dr. Ambedkar Road',
        district: DISTRICTS.WORLI_LOWER_PAREL,
        x: -250, y: 4.0, z: -1150,
        type: 'arterial_intersection',
        trafficSignalId: 40
    },
    'node_sewri_freeway_ramp': {
        id: 'node_sewri_freeway_ramp',
        name: 'Sewri Elevated Freeway Interchange',
        district: DISTRICTS.WORLI_LOWER_PAREL,
        x: -100, y: 8.0, z: -750,
        type: 'highway_interchange',
        trafficSignalId: null
    },
    'node_worli_sea_face_south': {
        id: 'node_worli_sea_face_south',
        name: 'Worli Sea Face South Entrance',
        district: DISTRICTS.WORLI_LOWER_PAREL,
        x: -880, y: 3.0, z: -700,
        type: 'arterial_intersection',
        trafficSignalId: null
    },
    'node_worli_sea_face_mid': {
        id: 'node_worli_sea_face_mid',
        name: 'Worli Sea Face Promenade',
        district: DISTRICTS.WORLI_LOWER_PAREL,
        x: -850, y: 3.0, z: -550,
        type: 'arterial_intersection',
        trafficSignalId: null
    },
    'node_worli_bwsl_ramp': {
        id: 'node_worli_bwsl_ramp',
        name: 'Worli Sea Link South Abutment Ramp',
        district: DISTRICTS.WORLI_LOWER_PAREL,
        x: -900, y: 18.0, z: -500,
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_dadar_tt_circle': {
        id: 'node_dadar_tt_circle',
        name: 'Dadar TT Circle (Khodadad Circle)',
        district: DISTRICTS.WORLI_LOWER_PAREL,
        x: +50, y: 6.0, z: -350,
        type: 'arterial_intersection',
        trafficSignalId: 41
    },
    'node_wadala_anik_interchange': {
        id: 'node_wadala_anik_interchange',
        name: 'Wadala Anik Freeway & Monorail Interchange',
        district: DISTRICTS.WORLI_LOWER_PAREL,
        x: 0, y: 8.0, z: -350,
        type: 'highway_interchange',
        trafficSignalId: null
    },

    // --------------------------------------------------------------------------
    // BANDRA-WORLI SEA LINK (BWSL) OVER MAHIM BAY & ARABIAN SEA
    // --------------------------------------------------------------------------
    'node_bwsl_cable_south': {
        id: 'node_bwsl_cable_south',
        name: 'BWSL South Cable-Stayed Pylon Deck',
        district: DISTRICTS.BANDRA,
        x: -1000, y: 20.0, z: -150,
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_bwsl_cable_mid': {
        id: 'node_bwsl_cable_mid',
        name: 'BWSL North Cable-Stayed Pylon Deck',
        district: DISTRICTS.BANDRA,
        x: -1150, y: 22.0, z: 250,
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_bwsl_toll_plaza': {
        id: 'node_bwsl_toll_plaza',
        name: 'BWSL North Abutment & Bandra Toll Plaza',
        district: DISTRICTS.BANDRA,
        x: -1250, y: 18.0, z: 450,
        type: 'toll_plaza',
        trafficSignalId: null
    },

    // --------------------------------------------------------------------------
    // BANDRA WEST & FR. AGNEL TECHNICAL HIGH SCHOOL RIDGE
    // --------------------------------------------------------------------------
    'node_bandstand_south': {
        id: 'node_bandstand_south',
        name: "Bandstand Promenade South (Mannat / Galaxy Curve)",
        district: DISTRICTS.BANDRA,
        x: -1400, y: 5.0, z: 350,
        type: 'arterial_intersection',
        trafficSignalId: null
    },
    'node_fr_agnel_school_gate': {
        id: 'node_fr_agnel_school_gate',
        name: 'Fr. Agnel Technical High School Main Entrance (Bandstand Ridge)',
        district: DISTRICTS.BANDRA,
        x: -1350, y: 32.0, z: 520, // Perfectly aligned with school_fr_agnel
        type: 'campus_entrance',
        trafficSignalId: null
    },
    'node_mt_mary_ridge': {
        id: 'node_mt_mary_ridge',
        name: 'Mount Mary Basilica Hill Ridge Overlook',
        district: DISTRICTS.BANDRA,
        x: -1300, y: 36.0, z: 560,
        type: 'local_junction',
        trafficSignalId: null
    },
    'node_bandstand_carter_connector': {
        id: 'node_bandstand_carter_connector',
        name: 'Bandstand to Carter Road Seafront Connector',
        district: DISTRICTS.BANDRA,
        x: -1350, y: 12.0, z: 750,
        type: 'arterial_intersection',
        trafficSignalId: null
    },
    'node_carter_road_promenade': {
        id: 'node_carter_road_promenade',
        name: 'Carter Road Sunset Promenade',
        district: DISTRICTS.BANDRA,
        x: -1300, y: 4.0, z: 950,
        type: 'arterial_intersection',
        trafficSignalId: null
    },
    'node_hill_road_shopping': {
        id: 'node_hill_road_shopping',
        name: 'Hill Road Shopping Avenue & St. Peters',
        district: DISTRICTS.BANDRA,
        x: -1100, y: 3.0, z: 450,
        type: 'local_junction',
        trafficSignalId: 42
    },
    'node_linking_road_bandra': {
        id: 'node_linking_road_bandra',
        name: 'Linking Road Fashion District & KFC Junction',
        district: DISTRICTS.BANDRA,
        x: -900, y: 2.0, z: 450,
        type: 'arterial_intersection',
        trafficSignalId: 43
    },
    'node_kalanagar_junction': {
        id: 'node_kalanagar_junction',
        name: 'Kalanagar WEH Flyover & BKC Gateway Interchange',
        district: DISTRICTS.BANDRA,
        x: -650, y: 4.0, z: 350,
        type: 'highway_interchange',
        trafficSignalId: 44
    },
    'node_bkc_g_block': {
        id: 'node_bkc_g_block',
        name: 'BKC G-Block Boulevard (NSE / MCA Club)',
        district: DISTRICTS.BANDRA,
        x: -250, y: 5.0, z: 380,
        type: 'arterial_intersection',
        trafficSignalId: 45
    },
    'node_bkc_central': {
        id: 'node_bkc_central',
        name: 'BKC Central Avenue (Jio World Centre & US Consulate)',
        district: DISTRICTS.BANDRA,
        x: 0, y: 5.0, z: 400,
        type: 'arterial_intersection',
        trafficSignalId: 46
    },

    // --------------------------------------------------------------------------
    // CENTRAL NEXUS: DHARAVI KOLIWADA / MAHIM EAST / HOME HQ
    // --------------------------------------------------------------------------
    'node_dharavi_koliwada_nexus': {
        id: 'node_dharavi_koliwada_nexus',
        name: 'Dharavi Koliwada (Central World Origin 0,0)',
        district: DISTRICTS.DHARAVI_SION,
        x: 0, y: 8.0, z: 0, // Aligned with home_hq_dharavi
        type: 'arterial_intersection',
        trafficSignalId: 0
    },
    'node_homehq_plaza': {
        id: 'node_homehq_plaza',
        name: 'Home HQ Plaza & Stark Tower Ceremonial Roundabout',
        district: DISTRICTS.DHARAVI_SION,
        x: 0, y: 8.6, z: 140, // Matches main.js starkPedestal at (0, 140)
        type: 'arterial_intersection',
        trafficSignalId: 2
    },
    'node_dharavi_90ft_west': {
        id: 'node_dharavi_90ft_west',
        name: 'Dharavi 90-Feet Road West (Mahim Phatak)',
        district: DISTRICTS.DHARAVI_SION,
        x: -180, y: 7.5, z: 42,
        type: 'local_junction',
        trafficSignalId: 11
    },
    'node_dharavi_90ft_central': {
        id: 'node_dharavi_90ft_central',
        name: 'Dharavi 90-Feet Road Central Market',
        district: DISTRICTS.DHARAVI_SION,
        x: 0, y: 8.0, z: 42,
        type: 'arterial_intersection',
        trafficSignalId: 1
    },
    'node_dharavi_90ft_east': {
        id: 'node_dharavi_90ft_east',
        name: 'Dharavi 90-Feet Road East (Kumbharwada Crafts Sector)',
        district: DISTRICTS.DHARAVI_SION,
        x: +180, y: 8.0, z: 42,
        type: 'local_junction',
        trafficSignalId: 47
    },
    'node_dharavi_60ft_west': {
        id: 'node_dharavi_60ft_west',
        name: 'Dharavi 60-Feet Road West (Transit Avenue)',
        district: DISTRICTS.DHARAVI_SION,
        x: -180, y: 7.5, z: 140,
        type: 'local_junction',
        trafficSignalId: 12
    },
    'node_dharavi_60ft_east': {
        id: 'node_dharavi_60ft_east',
        name: 'Dharavi 60-Feet Road East (Recycling & Leather Hub)',
        district: DISTRICTS.DHARAVI_SION,
        x: +180, y: 8.0, z: 140,
        type: 'local_junction',
        trafficSignalId: 17
    },
    'node_mahim_causeway': {
        id: 'node_mahim_causeway',
        name: 'Mahim Causeway Bridge (Connecting South Mumbai to Bandra/Dharavi)',
        district: DISTRICTS.DHARAVI_SION,
        x: -450, y: 5.0, z: 100,
        type: 'arterial_intersection',
        trafficSignalId: 48
    },
    'node_sion_circle': {
        id: 'node_sion_circle',
        name: 'Sion Circle (EEH / LBS Marg / Dharavi Gateway)',
        district: DISTRICTS.DHARAVI_SION,
        x: +150, y: 8.0, z: 50,
        type: 'arterial_intersection',
        trafficSignalId: 49
    },
    'node_dharavi_north_gate': {
        id: 'node_dharavi_north_gate',
        name: 'Campus Cross Avenue & North Hub',
        district: DISTRICTS.DHARAVI_SION,
        x: 0, y: 8.0, z: 240,
        type: 'arterial_intersection',
        trafficSignalId: 3
    },
    'node_chawls_south': {
        id: 'node_chawls_south',
        name: 'Residential Chawls South Sector',
        district: DISTRICTS.DHARAVI_SION,
        x: 0, y: 8.0, z: 380,
        type: 'local_junction',
        trafficSignalId: 4
    },

    // --------------------------------------------------------------------------
    // WESTERN SUBURBS ARTERIAL SPINE (WEH: SANTACRUZ -> ANDHERI -> BORIVALI)
    // --------------------------------------------------------------------------
    'node_weh_santacruz': {
        id: 'node_weh_santacruz',
        name: 'WEH Santacruz Interchange (SCLR West Terminus)',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -650, y: 6.0, z: 600,
        type: 'highway_interchange',
        trafficSignalId: 50
    },
    'node_santacruz_station_road': {
        id: 'node_santacruz_station_road',
        name: 'Santacruz West SV Road Junction',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -850, y: 4.0, z: 600,
        type: 'arterial_intersection',
        trafficSignalId: 51
    },
    'node_weh_vile_parle': {
        id: 'node_weh_vile_parle',
        name: 'WEH Vile Parle Flyover & Domestic Terminal 1 Access',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -650, y: 5.0, z: 850,
        type: 'arterial_intersection',
        trafficSignalId: 52
    },
    'node_csmia_terminal_1': {
        id: 'node_csmia_terminal_1',
        name: 'CSMIA Terminal 1 Domestic Airport Departure Loop',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -450, y: 5.0, z: 850,
        type: 'local_junction',
        trafficSignalId: null
    },
    'node_csmia_terminal_2': {
        id: 'node_csmia_terminal_2',
        name: 'CSMIA Terminal 2 International Flyover Viaduct',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -150, y: 14.0, z: 950,
        type: 'highway_interchange',
        trafficSignalId: 53
    },
    'node_airport_parkway_east': {
        id: 'node_airport_parkway_east',
        name: 'Far North Airport Parkway',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: 650, y: 6.0, z: 1250,
        type: 'highway_interchange',
        trafficSignalId: 19
    },
    'node_weh_andheri_gundavali': {
        id: 'node_weh_andheri_gundavali',
        name: 'WEH Andheri Gundavali Junction (AGLR West Terminus)',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -650, y: 6.0, z: 1150,
        type: 'highway_interchange',
        trafficSignalId: 54
    },
    'node_andheri_sv_road': {
        id: 'node_andheri_sv_road',
        name: 'Andheri West SV Road & Station Concourse',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -880, y: 4.0, z: 1150,
        type: 'arterial_intersection',
        trafficSignalId: 55
    },
    'node_andheri_midc': {
        id: 'node_andheri_midc',
        name: 'Andheri East MIDC Central Cross Road',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -350, y: 5.0, z: 1250,
        type: 'local_junction',
        trafficSignalId: 56
    },
    'node_weh_jogeshwari_jvlr': {
        id: 'node_weh_jogeshwari_jvlr',
        name: 'WEH Jogeshwari Interchange (JVLR West Terminus)',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -650, y: 6.0, z: 1450,
        type: 'highway_interchange',
        trafficSignalId: 57
    },
    'node_weh_goregaon_hub': {
        id: 'node_weh_goregaon_hub',
        name: 'WEH Goregaon Hub & Aarey Colony Road Entrance',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -650, y: 6.0, z: 1750,
        type: 'arterial_intersection',
        trafficSignalId: 58
    },
    'node_goregaon_sv_road': {
        id: 'node_goregaon_sv_road',
        name: 'Goregaon West SV Road (Inorbit Mall Link)',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -850, y: 4.0, z: 1750,
        type: 'arterial_intersection',
        trafficSignalId: 59
    },
    'node_weh_malad_kandivali': {
        id: 'node_weh_malad_kandivali',
        name: 'WEH Malad - Kandivali Pushpa Park Flyover',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -650, y: 6.0, z: 2050,
        type: 'arterial_intersection',
        trafficSignalId: 60
    },
    'node_weh_borivali_sgnp': {
        id: 'node_weh_borivali_sgnp',
        name: 'WEH Borivali SGNP Main Gate & Flyover',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -650, y: 6.0, z: 2350,
        type: 'arterial_intersection',
        trafficSignalId: 61
    },
    'node_borivali_station_west': {
        id: 'node_borivali_station_west',
        name: 'Borivali West Station Concourse Road',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -850, y: 4.0, z: 2350,
        type: 'arterial_intersection',
        trafficSignalId: 62
    },
    'node_weh_north_boundary': {
        id: 'node_weh_north_boundary',
        name: 'WEH Dahisar Check Naka (5km North World Limit)',
        district: DISTRICTS.WESTERN_SUBURBS,
        x: -650, y: 5.0, z: 2480,
        type: 'highway_interchange',
        trafficSignalId: null
    },

    // --------------------------------------------------------------------------
    // EASTERN SUBURBS ARTERIAL SPINE (EEH: SION -> KURLA -> MULUND -> THANE)
    // --------------------------------------------------------------------------
    'node_eeh_priyadarshini': {
        id: 'node_eeh_priyadarshini',
        name: 'EEH Priyadarshini Circle & BKC Elevated Connector Ramp',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +350, y: 8.0, z: 250,
        type: 'highway_interchange',
        trafficSignalId: 63
    },
    'node_bkc_elevated_connector': {
        id: 'node_bkc_elevated_connector',
        name: 'BKC - Chunabhatti Elevated Flyover Span',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +220, y: 12.0, z: 320,
        type: 'flyover',
        trafficSignalId: null
    },
    'node_eeh_kurla_sclr': {
        id: 'node_eeh_kurla_sclr',
        name: 'EEH Kurla / Amar Mahal SCLR East Interchange',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +450, y: 8.0, z: 500,
        type: 'highway_interchange',
        trafficSignalId: 64
    },
    'node_sclr_ltt_junction': {
        id: 'node_sclr_ltt_junction',
        name: 'SCLR Lokmanya Tilak Terminus (LTT) Ramp',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +300, y: 12.0, z: 510,
        type: 'highway_interchange',
        trafficSignalId: null
    },
    'node_sclr_kurla_flyover': {
        id: 'node_sclr_kurla_flyover',
        name: 'SCLR Double-Decker Flyover over Central Railway',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +150, y: 16.0, z: 530,
        type: 'flyover',
        trafficSignalId: null
    },
    'node_sclr_kurla_west': {
        id: 'node_sclr_kurla_west',
        name: 'SCLR Kurla West & LBS Marg Crossroads',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: -50, y: 8.0, z: 550,
        type: 'arterial_intersection',
        trafficSignalId: 65
    },
    'node_sclr_kalina_university': {
        id: 'node_sclr_kalina_university',
        name: 'SCLR Kalina Mumbai University Entrance',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: -300, y: 7.0, z: 570,
        type: 'arterial_intersection',
        trafficSignalId: 66
    },
    'node_eeh_ghatkopar_aglr': {
        id: 'node_eeh_ghatkopar_aglr',
        name: 'EEH Ghatkopar Ramabai Nagar (AGLR East Terminus)',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +550, y: 8.0, z: 850,
        type: 'highway_interchange',
        trafficSignalId: 67
    },
    'node_aglr_asalpha': {
        id: 'node_aglr_asalpha',
        name: 'AGLR Asalpha Metro Station Viaduct',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +250, y: 10.0, z: 950,
        type: 'arterial_intersection',
        trafficSignalId: 68
    },
    'node_aglr_sakinaka': {
        id: 'node_aglr_sakinaka',
        name: 'Sakinaka Metro Junction Crossroads',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: -50, y: 8.0, z: 1050,
        type: 'arterial_intersection',
        trafficSignalId: 69
    },
    'node_aglr_jb_nagar': {
        id: 'node_aglr_jb_nagar',
        name: 'AGLR JB Nagar & Chakala Commercial Corridor',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: -350, y: 7.0, z: 1100,
        type: 'arterial_intersection',
        trafficSignalId: 70
    },
    'node_eeh_vikhroli_jvlr': {
        id: 'node_eeh_vikhroli_jvlr',
        name: 'EEH Vikhroli Godrej Flyover (JVLR East Terminus)',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +680, y: 8.0, z: 1350,
        type: 'highway_interchange',
        trafficSignalId: 71
    },
    'node_jvlr_kanjurmarg': {
        id: 'node_jvlr_kanjurmarg',
        name: 'JVLR Kanjurmarg West Crossroads',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +450, y: 10.0, z: 1380,
        type: 'arterial_intersection',
        trafficSignalId: 72
    },
    'node_jvlr_powai_lake': {
        id: 'node_jvlr_powai_lake',
        name: 'JVLR Powai Lake Promontory & Hiranandani Gate',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +150, y: 14.0, z: 1400,
        type: 'arterial_intersection',
        trafficSignalId: 73
    },
    'node_jvlr_iit_bombay': {
        id: 'node_jvlr_iit_bombay',
        name: 'IIT Bombay Main Gate & Academic Boulevard',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: -50, y: 12.0, z: 1410,
        type: 'campus_entrance',
        trafficSignalId: 74
    },
    'node_jvlr_seepz': {
        id: 'node_jvlr_seepz',
        name: 'JVLR SEEPZ Gate & MIDC Industrial Entry',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: -300, y: 9.0, z: 1430,
        type: 'arterial_intersection',
        trafficSignalId: 75
    },
    'node_eeh_bhandup': {
        id: 'node_eeh_bhandup',
        name: 'EEH Bhandup Sonapur Flyover',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +780, y: 8.0, z: 1250,
        type: 'arterial_intersection',
        trafficSignalId: 76
    },
    'node_eeh_mulund_airoli_interchange': {
        id: 'node_eeh_mulund_airoli_interchange',
        name: 'EEH Mulund Check Naka (Airoli Bridge West Terminus)',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +880, y: 10.0, z: 1400,
        type: 'highway_interchange',
        trafficSignalId: 77
    },

    // --------------------------------------------------------------------------
    // THANE DISTRICT (+X, +Z)
    // --------------------------------------------------------------------------
    'node_thane_teen_hath_naka': {
        id: 'node_thane_teen_hath_naka',
        name: 'Thane Teen Hath Naka Flyover Crossroads',
        district: DISTRICTS.THANE,
        x: +980, y: 8.0, z: 2250,
        type: 'highway_interchange',
        trafficSignalId: 78
    },
    'node_thane_cadbury_junction': {
        id: 'node_thane_cadbury_junction',
        name: 'Thane Cadbury Junction & Eastern Expressway',
        district: DISTRICTS.THANE,
        x: +1020, y: 8.0, z: 2380,
        type: 'arterial_intersection',
        trafficSignalId: 79
    },
    'node_thane_ghodbunder_split': {
        id: 'node_thane_ghodbunder_split',
        name: 'Ghodbunder Road North Split (To Borivali/Ahmedabad)',
        district: DISTRICTS.THANE,
        x: +1060, y: 6.0, z: 2480,
        type: 'highway_interchange',
        trafficSignalId: null
    },

    // --------------------------------------------------------------------------
    // NAVI MUMBAI & HARBOUR CONNECTORS: VASHI BRIDGE & SION-PANVEL HIGHWAY
    // --------------------------------------------------------------------------
    'node_chembur_cmlr': {
        id: 'node_chembur_cmlr',
        name: 'Chembur - Mankhurd Link Road (Sion-Panvel Entry)',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +550, y: 8.0, z: -350,
        type: 'arterial_intersection',
        trafficSignalId: 80
    },
    'node_mankhurd_toll_plaza': {
        id: 'node_mankhurd_toll_plaza',
        name: 'Mankhurd Octroi & Vashi Bridge West Abutment',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +850, y: 14.0, z: -400, // Matches vashi_bridge.westNode in geography
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_vashi_creek_bridge_west': {
        id: 'node_vashi_creek_bridge_west',
        name: 'Vashi Creek Bridge West Water Span',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1050, y: 18.0, z: -400,
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_vashi_creek_bridge_mid': {
        id: 'node_vashi_creek_bridge_mid',
        name: 'Vashi Bridge Central Marine Navigation Span (Thane Creek)',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1300, y: 22.0, z: -400,
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_vashi_creek_bridge_east': {
        id: 'node_vashi_creek_bridge_east',
        name: 'Vashi Bridge East Landfall & Toll Plaza',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1550, y: 14.0, z: -400, // Matches vashi_bridge_east in geography
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_vashi_toll_plaza': {
        id: 'node_vashi_toll_plaza',
        name: 'Navi Mumbai Vashi Toll Plaza & Palm Beach Interchange',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1620, y: 10.0, z: -380,
        type: 'toll_plaza',
        trafficSignalId: null
    },
    'node_vashi_sector_17': {
        id: 'node_vashi_sector_17',
        name: 'Vashi Sector 17 Commercial Hub & Shivaji Chowk',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1720, y: 8.0, z: -300,
        type: 'arterial_intersection',
        trafficSignalId: 81
    },
    'node_sanpada_junction': {
        id: 'node_sanpada_junction',
        name: 'Sanpada Junction & Turbhe Flyover Underpass',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1780, y: 8.0, z: -550,
        type: 'arterial_intersection',
        trafficSignalId: 82
    },
    'node_nerul_lp_junction': {
        id: 'node_nerul_lp_junction',
        name: 'Nerul LP Junction & DY Patil Stadium Flyover',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1880, y: 9.0, z: -950,
        type: 'arterial_intersection',
        trafficSignalId: 83
    },
    'node_belapur_cbd_flyover': {
        id: 'node_belapur_cbd_flyover',
        name: 'CBD Belapur Konkan Bhavan Flyover Interchange',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1980, y: 12.0, z: -1400,
        type: 'highway_interchange',
        trafficSignalId: 84
    },
    'node_kharghar_hiranandani': {
        id: 'node_kharghar_hiranandani',
        name: 'Kharghar Utsav Chowk & Central Park Avenue',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +2080, y: 8.0, z: -1800,
        type: 'arterial_intersection',
        trafficSignalId: 85
    },
    'node_panvel_city_circle': {
        id: 'node_panvel_city_circle',
        name: 'Panvel City Circle (Mumbai-Pune Expressway Gateway)',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +2180, y: 7.0, z: -2200,
        type: 'highway_interchange',
        trafficSignalId: 86
    },

    // --------------------------------------------------------------------------
    // NAVI MUMBAI & AIROLI BRIDGE: DMCE COLLEGE OF ENGINEERING GATEWAY
    // --------------------------------------------------------------------------
    'node_mulund_airoli_approach': {
        id: 'node_mulund_airoli_approach',
        name: 'Mulund - Airoli Road Eastbound Approach (Airoli Bridge West Landfall)',
        district: DISTRICTS.EASTERN_SUBURBS,
        x: +950, y: 16.0, z: 1400, // Matches airoli_bridge_west in geography
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_airoli_bridge_west': {
        id: 'node_airoli_bridge_west',
        name: 'Airoli Creek Bridge West Span (Over Thane Creek)',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1100, y: 18.0, z: 1400,
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_airoli_bridge_mid': {
        id: 'node_airoli_bridge_mid',
        name: 'Airoli Bridge Central Creek Navigation Arch',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1350, y: 22.0, z: 1400,
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_airoli_bridge_east': {
        id: 'node_airoli_bridge_east',
        name: 'Airoli Creek Bridge East Landfall (Across Thane Creek)',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1650, y: 16.0, z: 1400, // Matches airoli_bridge_east in geography
        type: 'bridge_anchor',
        trafficSignalId: null
    },
    'node_airoli_toll_plaza': {
        id: 'node_airoli_toll_plaza',
        name: 'Airoli Toll Plaza & Sector 3 Gateway',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1720, y: 12.0, z: 1420,
        type: 'toll_plaza',
        trafficSignalId: null
    },
    'node_airoli_thane_belapur_cross': {
        id: 'node_airoli_thane_belapur_cross',
        name: 'Airoli Junction at Thane-Belapur Highway Spine',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1780, y: 10.0, z: 1440,
        type: 'arterial_intersection',
        trafficSignalId: 87
    },
    'node_dmce_main_gate': {
        id: 'node_dmce_main_gate',
        name: 'DMCE College of Engineering Grand Entrance & Roundabout (Airoli)',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1850, y: 12.0, z: 1450, // Perfectly aligned with college_dmce
        type: 'campus_entrance',
        trafficSignalId: 18
    },
    'node_dmce_campus_workshop': {
        id: 'node_dmce_campus_workshop',
        name: 'DMCE Engineering Workshops & Robotics Labs Complex',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1910, y: 12.0, z: 1500,
        type: 'local_junction',
        trafficSignalId: null
    },
    'node_dmce_canteen_adda': {
        id: 'node_dmce_canteen_adda',
        name: 'DMCE Engineering Canteen & Student Plaza Adda',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1880, y: 12.0, z: 1400,
        type: 'local_junction',
        trafficSignalId: null
    },
    'node_airoli_mindspace_park': {
        id: 'node_airoli_mindspace_park',
        name: 'Airoli Mindspace Tech Park & Knowledge Corridor',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1950, y: 9.0, z: 1420,
        type: 'arterial_intersection',
        trafficSignalId: 88
    },
    'node_airoli_station_boulevard': {
        id: 'node_airoli_station_boulevard',
        name: 'Airoli Railway Station Concourse Boulevard',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1780, y: 8.0, z: 1560,
        type: 'arterial_intersection',
        trafficSignalId: 89
    },
    'node_thane_belapur_south': {
        id: 'node_thane_belapur_south',
        name: 'Thane-Belapur Road Southbound (To Rabale & Ghansoli)',
        district: DISTRICTS.NAVI_MUMBAI,
        x: +1780, y: 8.0, z: 1100,
        type: 'arterial_intersection',
        trafficSignalId: 90
    }
};

// Helper: Calculate exact 3D distance between two nodes
function getDistance(nodeA, nodeB) {
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    const dz = nodeA.z - nodeB.z;
    return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
}

// ==============================================================================
// 2. ROAD EDGES
// ==============================================================================
const rawEdges = [
    // --------------------------------------------------------------------------
    // SOUTH MUMBAI & MARINE DRIVE
    // --------------------------------------------------------------------------
    {
        id: 'edge_colaba_1',
        from: 'node_colaba_south',
        to: 'node_colaba_causeway',
        lanes: 2,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Colaba Causeway',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_colaba_2',
        from: 'node_colaba_causeway',
        to: 'node_gateway_junction',
        lanes: 2,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Regal Cinema Reach',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_gateway_waterfront_1',
        from: 'node_gateway_junction',
        to: 'node_gateway_waterfront',
        lanes: 2,
        speedLimitKmh: 30,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'Apollo Bunder Waterfront Road',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_nariman_regal',
        from: 'node_gateway_junction',
        to: 'node_nariman_point',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Madame Cama Road',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_nariman_md_south',
        from: 'node_nariman_point',
        to: 'node_marine_drive_south',
        lanes: 4,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: "Marine Drive (Queen's Necklace South Curve)",
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_md_south_to_mid',
        from: 'node_marine_drive_south',
        to: 'node_marine_drive_mid',
        lanes: 4,
        speedLimitKmh: 70,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'Netaji Subhash Chandra Bose Road',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_md_mid_to_chowpatty',
        from: 'node_marine_drive_mid',
        to: 'node_marine_drive_chowpatty',
        lanes: 4,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'Marine Drive Chowpatty Arc',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_churchgate_connector',
        from: 'node_marine_drive_mid',
        to: 'node_churchgate_stn',
        lanes: 3,
        speedLimitKmh: 45,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Veer Nariman Road',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_churchgate_flora',
        from: 'node_churchgate_stn',
        to: 'node_flora_fountain',
        lanes: 2,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Hutatma Chowk Approach',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_flora_to_csmt',
        from: 'node_flora_fountain',
        to: 'node_fort_csmt',
        lanes: 3,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Dadabhai Naoroji Road (Heritage Arcade)',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },
    {
        id: 'edge_csmt_to_p_dmello',
        from: 'node_fort_csmt',
        to: 'node_p_dmello_south',
        lanes: 3,
        speedLimitKmh: 45,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Carnac Bunder Road',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },
    {
        id: 'edge_p_dmello_to_freeway',
        from: 'node_p_dmello_south',
        to: 'node_eastern_freeway_start',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: "P. D'Mello Freeway Approach",
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },

    // --------------------------------------------------------------------------
    // COASTAL ROAD & WORLI SEA FACE & BWSL
    // --------------------------------------------------------------------------
    {
        id: 'edge_coastal_tunnel_1',
        from: 'node_marine_drive_chowpatty',
        to: 'node_coastal_road_tunnel',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'Mumbai Coastal Road Undersea Tunnel',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_coastal_tunnel_to_haji_ali',
        from: 'node_coastal_road_tunnel',
        to: 'node_haji_ali_junction',
        lanes: 4,
        speedLimitKmh: 70,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'Coastal Road Haji Ali Reclamation',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_haji_ali_to_sea_face',
        from: 'node_haji_ali_junction',
        to: 'node_worli_sea_face_south',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Khan Abdul Ghaffar Khan Road',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_haji_ali_to_lower_parel',
        from: 'node_haji_ali_junction',
        to: 'node_lower_parel_sb_marg',
        lanes: 3,
        speedLimitKmh: 45,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Dr. E. Moses Road',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_worli_sea_face_promenade',
        from: 'node_worli_sea_face_south',
        to: 'node_worli_sea_face_mid',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Worli Sea Face Promenade',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_worli_to_bwsl_ramp',
        from: 'node_worli_sea_face_mid',
        to: 'node_worli_bwsl_ramp',
        lanes: 4,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'Worli Cloverleaf Sea Link Flyover',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_bwsl_span_1',
        from: 'node_worli_bwsl_ramp',
        to: 'node_bwsl_cable_south',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.SEA_BRIDGE,
        oneWay: false,
        name: 'Bandra-Worli Sea Link (South Cable Stayed Span)',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_bwsl_span_2',
        from: 'node_bwsl_cable_south',
        to: 'node_bwsl_cable_mid',
        lanes: 4,
        speedLimitKmh: 90,
        surface: ROAD_SURFACES.SEA_BRIDGE,
        oneWay: false,
        name: 'Bandra-Worli Sea Link (Mahim Bay Center Span)',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_bwsl_span_3',
        from: 'node_bwsl_cable_mid',
        to: 'node_bwsl_toll_plaza',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.SEA_BRIDGE,
        oneWay: false,
        name: 'Bandra-Worli Sea Link (North Ramp to Toll Plaza)',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },

    // --------------------------------------------------------------------------
    // BANDRA WEST & FR. AGNEL TECHNICAL HIGH SCHOOL RIDGE
    // --------------------------------------------------------------------------
    {
        id: 'edge_bwsl_to_bandstand',
        from: 'node_bwsl_toll_plaza',
        to: 'node_bandstand_south',
        lanes: 2,
        speedLimitKmh: 45,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Bandra Fort Coastal Road',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_bandstand_to_fr_agnel',
        from: 'node_bandstand_south',
        to: 'node_fr_agnel_school_gate',
        lanes: 2,
        speedLimitKmh: 35,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'Fr. Agnel Hill Ascent Road (Bandstand Ridge)',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_fr_agnel_to_mt_mary',
        from: 'node_fr_agnel_school_gate',
        to: 'node_mt_mary_ridge',
        lanes: 2,
        speedLimitKmh: 30,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'Mount Mary Hill Ridge Way',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_mt_mary_to_hill_road',
        from: 'node_mt_mary_ridge',
        to: 'node_hill_road_shopping',
        lanes: 2,
        speedLimitKmh: 30,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'St. John Baptist Road',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_fr_agnel_to_carter_connector',
        from: 'node_fr_agnel_school_gate',
        to: 'node_bandstand_carter_connector',
        lanes: 2,
        speedLimitKmh: 35,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Kane Road Sea Ridge Descender',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_carter_connector_to_promenade',
        from: 'node_bandstand_carter_connector',
        to: 'node_carter_road_promenade',
        lanes: 2,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Carter Road Coastal Promenade',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_hill_road_to_linking',
        from: 'node_hill_road_shopping',
        to: 'node_linking_road_bandra',
        lanes: 2,
        speedLimitKmh: 35,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Hill Road Shopping Avenue',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_linking_to_kalanagar',
        from: 'node_linking_road_bandra',
        to: 'node_kalanagar_junction',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Bandra Reclamation Arterial (SV Road to WEH)',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_bwsl_to_kalanagar',
        from: 'node_bwsl_toll_plaza',
        to: 'node_kalanagar_junction',
        lanes: 4,
        speedLimitKmh: 70,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'Bandra Reclamation Superhighway Link',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_kalanagar_to_bkc_g',
        from: 'node_kalanagar_junction',
        to: 'node_bkc_g_block',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'BKC Boulevard West Gate',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_bkc_g_to_bkc_central',
        from: 'node_bkc_g_block',
        to: 'node_bkc_central',
        lanes: 4,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'BKC Central Avenue (Financial Centre)',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_bkc_central_to_flyover',
        from: 'node_bkc_central',
        to: 'node_bkc_elevated_connector',
        lanes: 2,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'BKC Chunabhatti Elevated Ramp',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_bkc_flyover_to_eeh',
        from: 'node_bkc_elevated_connector',
        to: 'node_eeh_priyadarshini',
        lanes: 2,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'Chunabhatti Flyover to EEH',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },

    // --------------------------------------------------------------------------
    // CENTRAL NEXUS (DHARAVI & MAHIM & HOME HQ PLAZA AT 0, 140)
    // --------------------------------------------------------------------------
    {
        id: 'edge_kalanagar_to_dharavi_nexus',
        from: 'node_kalanagar_junction',
        to: 'node_dharavi_koliwada_nexus',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Sion-Bandra Link Road',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_dharavi_nexus_to_homehq',
        from: 'node_dharavi_koliwada_nexus',
        to: 'node_homehq_plaza',
        lanes: 3,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'Home HQ Avenue of Arc',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_homehq_to_north_gate',
        from: 'node_homehq_plaza',
        to: 'node_dharavi_north_gate',
        lanes: 3,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Central Spine North Gateway',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_north_gate_to_chawls',
        from: 'node_dharavi_north_gate',
        to: 'node_chawls_south',
        lanes: 3,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Terminal Way Spine',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_dharavi_90ft_w_to_c',
        from: 'node_dharavi_90ft_west',
        to: 'node_dharavi_90ft_central',
        lanes: 3,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Dharavi 90-Feet Road (West Reach)',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_dharavi_90ft_c_to_e',
        from: 'node_dharavi_90ft_central',
        to: 'node_dharavi_90ft_east',
        lanes: 3,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Dharavi 90-Feet Road (Kumbharwada Reach)',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_dharavi_60ft_w_to_hq',
        from: 'node_dharavi_60ft_west',
        to: 'node_homehq_plaza',
        lanes: 2,
        speedLimitKmh: 35,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Dharavi 60-Feet Road (West)',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_homehq_to_60ft_e',
        from: 'node_homehq_plaza',
        to: 'node_dharavi_60ft_east',
        lanes: 2,
        speedLimitKmh: 35,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Dharavi 60-Feet Road (East)',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_mahim_causeway_to_nexus',
        from: 'node_mahim_causeway',
        to: 'node_dharavi_koliwada_nexus',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Mahim Causeway Corridor',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_dharavi_to_sion_circle',
        from: 'node_dharavi_koliwada_nexus',
        to: 'node_sion_circle',
        lanes: 3,
        speedLimitKmh: 45,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Sion-Dharavi Connector',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_sion_circle_to_priyadarshini',
        from: 'node_sion_circle',
        to: 'node_eeh_priyadarshini',
        lanes: 4,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Eastern Express Highway Sion Entry',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },

    // --------------------------------------------------------------------------
    // CORRIDOR 1 (CONTINUED): WESTERN EXPRESS HIGHWAY (WEH / NH-48)
    // --------------------------------------------------------------------------
    {
        id: 'edge_weh_kalanagar_to_santacruz',
        from: 'node_kalanagar_junction',
        to: 'node_weh_santacruz',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'WEH Kalanagar to Santacruz Flyover',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_santacruz_station_link',
        from: 'node_weh_santacruz',
        to: 'node_santacruz_station_road',
        lanes: 2,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Santacruz Station Cross Road',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_weh_santacruz_to_vile_parle',
        from: 'node_weh_santacruz',
        to: 'node_weh_vile_parle',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'WEH Santacruz - Vile Parle Expressway',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_vile_parle_to_terminal_1',
        from: 'node_weh_vile_parle',
        to: 'node_csmia_terminal_1',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Domestic Airport Terminal 1 Access Road',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_weh_vile_parle_to_andheri',
        from: 'node_weh_vile_parle',
        to: 'node_weh_andheri_gundavali',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'WEH Parle to Andheri Flyover',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_andheri_weh_to_sv_road',
        from: 'node_weh_andheri_gundavali',
        to: 'node_andheri_sv_road',
        lanes: 3,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Andheri Station West Link',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_andheri_weh_to_midc',
        from: 'node_weh_andheri_gundavali',
        to: 'node_andheri_midc',
        lanes: 2,
        speedLimitKmh: 45,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'MIDC Central Avenue',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_weh_andheri_to_jogeshwari',
        from: 'node_weh_andheri_gundavali',
        to: 'node_weh_jogeshwari_jvlr',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'WEH Andheri to Jogeshwari Expressway',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_weh_jogeshwari_to_goregaon',
        from: 'node_weh_jogeshwari_jvlr',
        to: 'node_weh_goregaon_hub',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'WEH Jogeshwari to Goregaon Hub Flyover',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_goregaon_weh_to_sv',
        from: 'node_weh_goregaon_hub',
        to: 'node_goregaon_sv_road',
        lanes: 3,
        speedLimitKmh: 45,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Goregaon West Inorbit Link Road',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_weh_goregaon_to_malad',
        from: 'node_weh_goregaon_hub',
        to: 'node_weh_malad_kandivali',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'WEH Goregaon to Malad Pushpa Park Expressway',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_weh_malad_to_borivali',
        from: 'node_weh_malad_kandivali',
        to: 'node_weh_borivali_sgnp',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'WEH Kandivali to Borivali SGNP Flyover',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },
    {
        id: 'edge_borivali_weh_to_stn',
        from: 'node_weh_borivali_sgnp',
        to: 'node_borivali_station_west',
        lanes: 3,
        speedLimitKmh: 45,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Borivali Station West Connector',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_weh_borivali_to_north_border',
        from: 'node_weh_borivali_sgnp',
        to: 'node_weh_north_boundary',
        lanes: 4,
        speedLimitKmh: 90,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Western Express Highway (Dahisar Check Naka Exit)',
        corridor: ROAD_CORRIDORS.WESTERN_CORRIDOR
    },

    // --------------------------------------------------------------------------
    // CORRIDOR 3: EAST-WEST TRANS-CITY CONNECTORS (SCLR, JVLR, AGLR)
    // --------------------------------------------------------------------------
    // SCLR (Santacruz-Chembur Link Road)
    {
        id: 'edge_sclr_1',
        from: 'node_weh_santacruz',
        to: 'node_sclr_kalina_university',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'SCLR West Ramp (Santacruz to Kalina)',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_sclr_2',
        from: 'node_sclr_kalina_university',
        to: 'node_sclr_kurla_west',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'SCLR CST Road Elevated Corridor',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_sclr_3',
        from: 'node_sclr_kurla_west',
        to: 'node_sclr_kurla_flyover',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'SCLR Double-Decker Central Rail Overbridge',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_sclr_4',
        from: 'node_sclr_kurla_flyover',
        to: 'node_sclr_ltt_junction',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'SCLR Lokmanya Tilak Terminus Flyover',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_sclr_5',
        from: 'node_sclr_ltt_junction',
        to: 'node_eeh_kurla_sclr',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'SCLR East Ramp to Amar Mahal / EEH',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },

    // JVLR (Jogeshwari-Vikhroli Link Road)
    {
        id: 'edge_jvlr_1',
        from: 'node_weh_jogeshwari_jvlr',
        to: 'node_jvlr_seepz',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'JVLR Jogeshwari to SEEPZ Arterial',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_jvlr_2',
        from: 'node_jvlr_seepz',
        to: 'node_jvlr_iit_bombay',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'JVLR MIDC - IIT Bombay Academic Corridor',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_jvlr_3',
        from: 'node_jvlr_iit_bombay',
        to: 'node_jvlr_powai_lake',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'JVLR Powai Lake Promontory Promenade',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_jvlr_4',
        from: 'node_jvlr_powai_lake',
        to: 'node_jvlr_kanjurmarg',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'JVLR Powai to Kanjurmarg Arterial',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_jvlr_5',
        from: 'node_jvlr_kanjurmarg',
        to: 'node_eeh_vikhroli_jvlr',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'JVLR Vikhroli EEH Cloverleaf Flyover',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },

    // AGLR (Andheri-Ghatkopar Link Road & Metro Line 1 Corridor)
    {
        id: 'edge_aglr_1',
        from: 'node_weh_andheri_gundavali',
        to: 'node_aglr_jb_nagar',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'AGLR Andheri Kurla Road (Chakala Reach)',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_aglr_2',
        from: 'node_aglr_jb_nagar',
        to: 'node_aglr_sakinaka',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'AGLR JB Nagar to Sakinaka Metro Spine',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_aglr_3',
        from: 'node_aglr_sakinaka',
        to: 'node_aglr_asalpha',
        lanes: 2,
        speedLimitKmh: 45,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'AGLR Sakinaka to Asalpha Hills',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_aglr_4',
        from: 'node_aglr_asalpha',
        to: 'node_eeh_ghatkopar_aglr',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'AGLR Ghatkopar West to EEH Ramabai Nagar',
        corridor: ROAD_CORRIDORS.EAST_WEST_CONNECTORS
    },
    {
        id: 'edge_sakinaka_airport_t2',
        from: 'node_aglr_sakinaka',
        to: 'node_csmia_terminal_2',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'Sahar Elevated Airport International Flyover',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },

    // --------------------------------------------------------------------------
    // CORRIDOR 2: EASTERN EXPRESS HIGHWAY (EEH: SION -> KURLA -> MULUND -> THANE)
    // --------------------------------------------------------------------------
    {
        id: 'edge_eeh_priyadarshini_to_kurla',
        from: 'node_eeh_priyadarshini',
        to: 'node_eeh_kurla_sclr',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'EEH Chunabhatti to Kurla Amar Mahal Express',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },
    {
        id: 'edge_eeh_kurla_to_ghatkopar',
        from: 'node_eeh_kurla_sclr',
        to: 'node_eeh_ghatkopar_aglr',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'EEH Amar Mahal to Ghatkopar Expressway',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },
    {
        id: 'edge_eeh_ghatkopar_to_vikhroli',
        from: 'node_eeh_ghatkopar_aglr',
        to: 'node_eeh_vikhroli_jvlr',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'EEH Ghatkopar to Vikhroli Godrej Flyover',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },
    {
        id: 'edge_eeh_vikhroli_to_bhandup',
        from: 'node_eeh_vikhroli_jvlr',
        to: 'node_eeh_bhandup',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'EEH Vikhroli to Bhandup Sonapur Flyover',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },
    {
        id: 'edge_eeh_bhandup_to_mulund',
        from: 'node_eeh_bhandup',
        to: 'node_eeh_mulund_airoli_interchange',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'EEH Bhandup to Mulund Check Naka',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },
    {
        id: 'edge_eeh_mulund_to_thane',
        from: 'node_eeh_mulund_airoli_interchange',
        to: 'node_thane_teen_hath_naka',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'EEH Mulund to Thane Teen Hath Naka Flyover',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },
    {
        id: 'edge_thane_teen_hath_to_cadbury',
        from: 'node_thane_teen_hath_naka',
        to: 'node_thane_cadbury_junction',
        lanes: 4,
        speedLimitKmh: 70,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'Thane Cadbury Junction Expressway',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },
    {
        id: 'edge_thane_cadbury_to_ghodbunder',
        from: 'node_thane_cadbury_junction',
        to: 'node_thane_ghodbunder_split',
        lanes: 4,
        speedLimitKmh: 75,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Ghodbunder Road Arterial Spine',
        corridor: ROAD_CORRIDORS.EASTERN_CORRIDOR
    },

    // --------------------------------------------------------------------------
    // CORRIDOR 4: NAVI MUMBAI - VASHI BRIDGE & SION-PANVEL HIGHWAY
    // --------------------------------------------------------------------------
    {
        id: 'edge_eeh_to_chembur_cmlr',
        from: 'node_eeh_priyadarshini',
        to: 'node_chembur_cmlr',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Chembur Mankhurd Link Road (CMLR West)',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_cmlr_to_mankhurd_toll',
        from: 'node_chembur_cmlr',
        to: 'node_mankhurd_toll_plaza',
        lanes: 3,
        speedLimitKmh: 70,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'CMLR Mankhurd Approach',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_vashi_bridge_span_1',
        from: 'node_mankhurd_toll_plaza',
        to: 'node_vashi_creek_bridge_west',
        lanes: 5,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.SEA_BRIDGE,
        oneWay: false,
        name: 'Vashi Bridge West Marine Span (Over Thane Creek)',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_vashi_bridge_span_2',
        from: 'node_vashi_creek_bridge_west',
        to: 'node_vashi_creek_bridge_mid',
        lanes: 5,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.SEA_BRIDGE,
        oneWay: false,
        name: 'Vashi Bridge Central Marine Navigation Span',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_vashi_bridge_span_3',
        from: 'node_vashi_creek_bridge_mid',
        to: 'node_vashi_creek_bridge_east',
        lanes: 5,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.SEA_BRIDGE,
        oneWay: false,
        name: 'Vashi Bridge East Marine Span',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_vashi_bridge_to_toll',
        from: 'node_vashi_creek_bridge_east',
        to: 'node_vashi_toll_plaza',
        lanes: 5,
        speedLimitKmh: 70,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Navi Mumbai Vashi Toll Plaza Entry',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_vashi_toll_to_sec17',
        from: 'node_vashi_toll_plaza',
        to: 'node_vashi_sector_17',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Vashi Sector 17 Palm Beach Road Link',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_vashi_toll_to_sanpada',
        from: 'node_vashi_toll_plaza',
        to: 'node_sanpada_junction',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Sion-Panvel Highway (Vashi to Sanpada)',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_sanpada_to_nerul',
        from: 'node_sanpada_junction',
        to: 'node_nerul_lp_junction',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Sion-Panvel Highway (Sanpada to Nerul LP)',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_nerul_to_belapur',
        from: 'node_nerul_lp_junction',
        to: 'node_belapur_cbd_flyover',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'Sion-Panvel Highway (Nerul to CBD Belapur)',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_belapur_to_kharghar',
        from: 'node_belapur_cbd_flyover',
        to: 'node_kharghar_hiranandani',
        lanes: 4,
        speedLimitKmh: 80,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Sion-Panvel Highway (Belapur to Kharghar)',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_kharghar_to_panvel',
        from: 'node_kharghar_hiranandani',
        to: 'node_panvel_city_circle',
        lanes: 4,
        speedLimitKmh: 90,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Sion-Panvel Highway (Kharghar to Panvel Circle)',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },

    // --------------------------------------------------------------------------
    // CORRIDOR 4: NAVI MUMBAI - AIROLI BRIDGE & DMCE COLLEGE ARTERIAL
    // --------------------------------------------------------------------------
    {
        id: 'edge_mulund_to_airoli_approach',
        from: 'node_eeh_mulund_airoli_interchange',
        to: 'node_mulund_airoli_approach',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.FLYOVER,
        oneWay: false,
        name: 'Mulund-Airoli Elevated Creek Approach',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_airoli_bridge_span_1',
        from: 'node_mulund_airoli_approach',
        to: 'node_airoli_bridge_west',
        lanes: 3,
        speedLimitKmh: 70,
        surface: ROAD_SURFACES.SEA_BRIDGE,
        oneWay: false,
        name: 'Airoli Bridge West Span (Over Thane Creek)',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_airoli_bridge_span_2',
        from: 'node_airoli_bridge_west',
        to: 'node_airoli_bridge_mid',
        lanes: 3,
        speedLimitKmh: 75,
        surface: ROAD_SURFACES.SEA_BRIDGE,
        oneWay: false,
        name: 'Airoli Bridge Central Marine Navigation Arch',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_airoli_bridge_span_3',
        from: 'node_airoli_bridge_mid',
        to: 'node_airoli_bridge_east',
        lanes: 3,
        speedLimitKmh: 70,
        surface: ROAD_SURFACES.SEA_BRIDGE,
        oneWay: false,
        name: 'Airoli Bridge East Span',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_airoli_bridge_to_toll',
        from: 'node_airoli_bridge_east',
        to: 'node_airoli_toll_plaza',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Airoli Creek Toll Plaza Reach',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_airoli_toll_to_cross',
        from: 'node_airoli_toll_plaza',
        to: 'node_airoli_thane_belapur_cross',
        lanes: 3,
        speedLimitKmh: 50,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Airoli Sector 3 Gateway Link',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    },
    {
        id: 'edge_airoli_cross_to_dmce',
        from: 'node_airoli_thane_belapur_cross',
        to: 'node_dmce_main_gate',
        lanes: 3,
        speedLimitKmh: 40,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'Datta Meghe College Boulevard (DMCE Avenue)',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_dmce_gate_to_workshop',
        from: 'node_dmce_main_gate',
        to: 'node_dmce_campus_workshop',
        lanes: 2,
        speedLimitKmh: 25,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'DMCE Engineering Workshops Access Ring',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_dmce_gate_to_canteen',
        from: 'node_dmce_main_gate',
        to: 'node_dmce_canteen_adda',
        lanes: 2,
        speedLimitKmh: 20,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'DMCE Campus Canteen & Adda Promenade',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_dmce_to_mindspace',
        from: 'node_dmce_main_gate',
        to: 'node_airoli_mindspace_park',
        lanes: 2,
        speedLimitKmh: 35,
        surface: ROAD_SURFACES.CONCRETE,
        oneWay: false,
        name: 'Airoli Mindspace Tech Corridor',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_airoli_cross_to_stn',
        from: 'node_airoli_thane_belapur_cross',
        to: 'node_airoli_station_boulevard',
        lanes: 3,
        speedLimitKmh: 45,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Thane-Belapur Road to Airoli Railway Station',
        corridor: ROAD_CORRIDORS.LOCAL_MESH
    },
    {
        id: 'edge_airoli_cross_to_tb_south',
        from: 'node_airoli_thane_belapur_cross',
        to: 'node_thane_belapur_south',
        lanes: 3,
        speedLimitKmh: 60,
        surface: ROAD_SURFACES.ASPHALT,
        oneWay: false,
        name: 'Thane-Belapur Road South (Airoli to Rabale)',
        corridor: ROAD_CORRIDORS.NAVI_MUMBAI_CONNECTORS
    }
];

// Compute exact mathematical distance for each edge
export const ROAD_EDGES = rawEdges.map(edge => {
    const nodeA = ROAD_NODES[edge.from];
    const nodeB = ROAD_NODES[edge.to];
    const distance = (nodeA && nodeB) ? getDistance(nodeA, nodeB) : 100;
    return {
        ...edge,
        distance
    };
});

// ==============================================================================
// 3. GRAPH ENGINE: ADJACENCY LIST & DIJKSTRA / A* PATHFINDING ALGORITHMS
// ==============================================================================

export class MumbaiRoadGraph {
    constructor(nodes = ROAD_NODES, edges = ROAD_EDGES) {
        this.nodes = nodes;
        this.edges = edges;
        this.adjacency = {};
        this._buildAdjacency();
    }

    _buildAdjacency() {
        for (const nodeId of Object.keys(this.nodes)) {
            this.adjacency[nodeId] = [];
        }

        for (const edge of this.edges) {
            if (!this.nodes[edge.from] || !this.nodes[edge.to]) {
                console.warn(`[RoadGraph] Invalid edge connecting undefined node: ${edge.id}`);
                continue;
            }

            // Forward direction
            this.adjacency[edge.from].push({
                targetId: edge.to,
                edgeId: edge.id,
                distance: edge.distance,
                lanes: edge.lanes,
                speedLimitKmh: edge.speedLimitKmh,
                corridor: edge.corridor,
                surface: edge.surface,
                timeSeconds: (edge.distance / (edge.speedLimitKmh * 1000 / 3600))
            });

            // Backward direction if bidirectional
            if (!edge.oneWay) {
                this.adjacency[edge.to].push({
                    targetId: edge.from,
                    edgeId: edge.id,
                    distance: edge.distance,
                    lanes: edge.lanes,
                    speedLimitKmh: edge.speedLimitKmh,
                    corridor: edge.corridor,
                    surface: edge.surface,
                    timeSeconds: (edge.distance / (edge.speedLimitKmh * 1000 / 3600))
                });
            }
        }
    }

    /**
     * Finds nearest navigable node in the network to a given (x, z) world position.
     * @param {number} x World X coordinate
     * @param {number} z World Z coordinate
     * @param {number} maxRadius Search radius in meters
     * @returns {Object|null} Node object with Euclidean distance
     */
    findNearestNode(x, z, maxRadius = 1500) {
        let nearestNode = null;
        let minDistSq = maxRadius * maxRadius;

        for (const [id, node] of Object.entries(this.nodes)) {
            const dx = node.x - x;
            const dz = node.z - z;
            const distSq = dx * dx + dz * dz;
            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearestNode = { ...node, distance: Math.sqrt(distSq) };
            }
        }
        return nearestNode;
    }

    /**
     * Compute shortest path between two nodes using Dijkstra's Algorithm.
     * Supports optimization for distance or travel time.
     *
     * @param {string} startNodeId Origin node ID
     * @param {string} targetNodeId Destination node ID
     * @param {'distance'|'time'} criteria Optimization goal
     * @returns {Object|null} Path result containing node path, edge list, total distance and travel time.
     */
    findShortestPath(startNodeId, targetNodeId, criteria = 'distance') {
        if (!this.nodes[startNodeId] || !this.nodes[targetNodeId]) {
            return null;
        }

        if (startNodeId === targetNodeId) {
            const node = this.nodes[startNodeId];
            return {
                found: true,
                totalDistance: 0,
                totalTimeSeconds: 0,
                totalTimeMinutes: "0.0",
                pathNodeIds: [startNodeId],
                pathEdges: [],
                waypoints: [{ x: node.x, y: node.y, z: node.z, name: node.name }]
            };
        }

        const distances = {};
        const previous = {};
        const visited = new Set();
        const priorityQueue = [];

        for (const id of Object.keys(this.nodes)) {
            distances[id] = Infinity;
            previous[id] = null;
        }

        distances[startNodeId] = 0;
        priorityQueue.push({ id: startNodeId, cost: 0 });

        while (priorityQueue.length > 0) {
            // Sort by lowest cost
            priorityQueue.sort((a, b) => a.cost - b.cost);
            const { id: currentId, cost: currentCost } = priorityQueue.shift();

            if (visited.has(currentId)) continue;
            visited.add(currentId);

            if (currentId === targetNodeId) break;

            const neighbors = this.adjacency[currentId] || [];
            for (const neighbor of neighbors) {
                if (visited.has(neighbor.targetId)) continue;

                const edgeWeight = criteria === 'time' ? neighbor.timeSeconds : neighbor.distance;
                const newCost = currentCost + edgeWeight;

                if (newCost < distances[neighbor.targetId]) {
                    distances[neighbor.targetId] = newCost;
                    previous[neighbor.targetId] = {
                        fromId: currentId,
                        edgeId: neighbor.edgeId,
                        distance: neighbor.distance,
                        timeSeconds: neighbor.timeSeconds
                    };
                    priorityQueue.push({ id: neighbor.targetId, cost: newCost });
                }
            }
        }

        if (distances[targetNodeId] === Infinity) {
            return null; // No route found
        }

        // Reconstruct path backwards
        const pathNodeIds = [];
        const pathEdges = [];
        let curr = targetNodeId;
        let totalDistance = 0;
        let totalTimeSeconds = 0;

        while (curr !== null) {
            pathNodeIds.unshift(curr);
            const prevObj = previous[curr];
            if (prevObj) {
                pathEdges.unshift(prevObj.edgeId);
                totalDistance += prevObj.distance;
                totalTimeSeconds += prevObj.timeSeconds;
                curr = prevObj.fromId;
            } else {
                curr = null;
            }
        }

        const waypoints = pathNodeIds.map(id => {
            const n = this.nodes[id];
            return { id: n.id, name: n.name, x: n.x, y: n.y, z: n.z, district: n.district };
        });

        return {
            found: true,
            totalDistance: Math.round(totalDistance),
            totalTimeSeconds: Math.round(totalTimeSeconds),
            totalTimeMinutes: (totalTimeSeconds / 60).toFixed(1),
            pathNodeIds,
            pathEdges,
            waypoints
        };
    }

    /**
     * Get all nodes and edges belonging to a district.
     */
    getDistrictRoads(district) {
        const districtNodes = Object.values(this.nodes).filter(n => n.district === district);
        const nodeIds = new Set(districtNodes.map(n => n.id));
        const districtEdges = this.edges.filter(e => nodeIds.has(e.from) || nodeIds.has(e.to));
        return { nodes: districtNodes, edges: districtEdges };
    }

    /**
     * Get all edges belonging to a given arterial corridor.
     */
    getCorridorEdges(corridor) {
        return this.edges.filter(e => e.corridor === corridor);
    }

    /**
     * Return all signalized intersections for traffic light simulations.
     */
    getSignalizedIntersections() {
        return Object.values(this.nodes)
            .filter(n => n.trafficSignalId !== null)
            .map(n => ({
                signalId: n.trafficSignalId,
                nodeId: n.id,
                name: n.name,
                x: n.x,
                y: n.y,
                z: n.z,
                district: n.district,
                connectedApproaches: (this.adjacency[n.id] || []).length
            }));
    }
}

// Instantiate default singleton instance
export const mumbaiRoadNetwork = new MumbaiRoadGraph();

// Universal export for Node / ES module / Browser window global
if (typeof window !== 'undefined') {
    window.ROAD_CORRIDORS = ROAD_CORRIDORS;
    window.ROAD_SURFACES = ROAD_SURFACES;
    window.DISTRICTS = DISTRICTS;
    window.ROAD_NODES = ROAD_NODES;
    window.ROAD_EDGES = ROAD_EDGES;
    window.MumbaiRoadGraph = MumbaiRoadGraph;
    window.mumbaiRoadNetwork = mumbaiRoadNetwork;
}
