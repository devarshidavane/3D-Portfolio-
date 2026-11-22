// src/ui/mobileController.js
// ==========================================
// OPEN-WORLD MOBILE MULTI-TOUCH CONTROLLER
// High-performance pointer-tracked touch interface
// 1. Dynamic floating joystick (left 45%, deadzone, 50px clamp, >85% sprint threshold)
// 2. Right-half swipe camera look with inertia & configurable sensitivity
// 3. Thumb-arc on-foot action cluster (Jump, Sprint toggle, Context Interact, Context Vehicle)
// 4. In-vehicle cluster auto-swap (Steer buttons/tilt, Gas/Brake pedals, Handbrake, Horn, Exit)
// 5. Iron Man flight cluster (Boost, Ascend, Descend/Air-brake, Land)
// 6. Safe-area insets, haptics, left-handed mode & dynamic scale/opacity
// ==========================================

import * as THREE from 'three';

// ------------------------------------------
// DEFAULT CONFIGURATION & SETTINGS
// ------------------------------------------
const STORAGE_KEY_1 = 'mumbai3d_mobile_settings';
const STORAGE_KEY_2 = 'mumbai_mobile_settings';

export const mobileSettings = {
    buttonSize: 'normal',       // 'small' (0.85), 'normal' (1.0), 'large' (1.18)
    opacity: 0.85,              // 0.30 to 1.00
    leftHanded: false,          // swaps joystick and action clusters
    cameraSensitivity: 1.0,     // 0.2 to 3.0 multiplier
    steeringMode: 'buttons',    // 'buttons' or 'tilt'
    hapticsEnabled: true,       // navigator.vibrate(15)
    haptics: true,              // alias for mobileSettings.js compatibility
    steerAssist: true,          // lane-centering / auto-steering assist
    customPositions: {}         // saved button coordinates if customized
};

// Load persisted settings
try {
    const saved = localStorage.getItem(STORAGE_KEY_1) || localStorage.getItem(STORAGE_KEY_2);
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.opacity > 1) parsed.opacity = parsed.opacity / 100; // normalize percentage
        if (parsed.haptics !== undefined) parsed.hapticsEnabled = !!parsed.haptics;
        Object.assign(mobileSettings, parsed);
    }
} catch (e) {}

export function getMobileSettings() {
    return { ...mobileSettings };
}

export function setMobileSettings(newSettings) {
    if (newSettings.opacity > 1) newSettings.opacity = newSettings.opacity / 100;
    if (newSettings.haptics !== undefined) newSettings.hapticsEnabled = !!newSettings.haptics;
    if (newSettings.hapticsEnabled !== undefined) newSettings.haptics = !!newSettings.hapticsEnabled;

    Object.assign(mobileSettings, newSettings);
    try {
        localStorage.setItem(STORAGE_KEY_1, JSON.stringify(mobileSettings));
        localStorage.setItem(STORAGE_KEY_2, JSON.stringify(mobileSettings));
    } catch (e) {}
    applySettingsToDOM();
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mobile-settings-changed', { detail: mobileSettings }));
    }
}

// Listen to settings events from mobileSettings.js
if (typeof window !== 'undefined') {
    window.addEventListener('mobilesettingschanged', (e) => {
        if (e.detail) {
            const d = { ...e.detail };
            if (d.opacity > 1) d.opacity = d.opacity / 100;
            if (d.haptics !== undefined) d.hapticsEnabled = !!d.haptics;
            Object.assign(mobileSettings, d);
            applySettingsToDOM();
        }
    });
}

// ------------------------------------------
// CONTROL STATES
// ------------------------------------------
export const controlStates = {
    active: false,
    mode: 'foot', // 'foot', 'vehicle', 'bike', 'flight', 'disabled'
    isTouchDevice: false,
    joystick: {
        active: false,
        originX: 0,
        originY: 0,
        currentX: 0,
        currentY: 0,
        dx: 0,
        dy: 0,
        distance: 0,
        normX: 0,
        normY: 0,
        isSprinting: false
    },
    analogMovement: {
        x: 0,
        y: 0,
        distance: 0,
        angle: 0,
        isSprinting: false
    },
    cameraLook: {
        active: false,
        deltaYaw: 0,
        deltaPitch: 0,
        velYaw: 0,
        velPitch: 0
    },
    actions: {
        jump: false,
        sprintToggle: false,
        interact: false,
        vehicleMount: false,
        gas: false,
        gasPressure: 0,
        brake: false,
        brakePressure: 0,
        handbrake: false,
        steerLeft: false,
        steerRight: false,
        steerAssist: true,
        horn: false,
        flightBoost: false,
        flightUp: false,
        flightDown: false
    }
};

export function getMobileControlState() {
    return controlStates;
}

export function getSteerAssistEnabled() {
    return mobileSettings.steerAssist;
}

export function setSteerAssistEnabled(enabled) {
    mobileSettings.steerAssist = !!enabled;
    controlStates.actions.steerAssist = mobileSettings.steerAssist;
    updateAssistButtonVisual();
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mobileSettings));
    } catch (e) {}
}

// ------------------------------------------
// INTERNAL STATE & CONSTANTS
// ------------------------------------------
const JOYSTICK_MAX_RADIUS = 50;  // 50px clamp radius
const JOYSTICK_DEAD_ZONE = 8;    // 8px dead-zone
const JOYSTICK_SPRINT_RATIO = 0.85; // >85% triggers sprint (42.5px)

let optionsRef = {
    canvas: null,
    camera: null,
    characterGroup: null,
    keys: null,
    onInteraction: null,
    onVehicleMount: null,
    onFlightToggle: null,
    getActiveVehicle: null,
    getIsFlightMode: null,
    playSound: null
};

// Pointer tracking
const activePointers = new Map(); // pointerId -> { role, startX, startY, currentX, currentY, time }
let joystickPointerId = null;
let cameraPointerId = null;
let lastCameraX = 0;
let lastCameraY = 0;
let lastCameraTime = 0;

// Camera orbit accumulator
let cameraOrbitYaw = 0;
let cameraOrbitPitch = 0;

// Tilt steering state
let tiltAngle = 0;
let tiltListenerActive = false;

// DOM references
let rootEl = null;
let joystickBaseEl = null;
let joystickKnobEl = null;
let footClusterEl = null;
let vehicleClusterEl = null;
let flightClusterEl = null;
let btnInteractEl = null;
let btnVehicleEl = null;
let btnSprintEl = null;
let btnAssistEl = null;
let gasPedalEl = null;
let brakePedalEl = null;

// Context proximity cache
let lastProximityCheck = 0;

// ------------------------------------------
// HAPTIC FEEDBACK
// ------------------------------------------
export function triggerHaptic(duration = 15) {
    if (!mobileSettings.hapticsEnabled && !mobileSettings.haptics) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
            navigator.vibrate(duration);
        } catch (e) {}
    }
}

// ------------------------------------------
// CSS STYLES INJECTION
// ------------------------------------------
function injectStyles() {
    if (document.getElementById('mumbai-mobile-controller-styles')) return;

    const style = document.createElement('style');
    style.id = 'mumbai-mobile-controller-styles';
    style.textContent = `
        :root {
            --mobile-btn-scale: 1.0;
            --mobile-opacity: 0.85;
            --mobile-accent: #0284c7;
            --mobile-accent-glow: #38bdf8;
            --mobile-sprint-glow: #f59e0b;
            --mobile-gas-glow: #10b981;
            --mobile-brake-glow: #ef4444;
        }

        #mobile-controller-root {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 8500;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            overflow: hidden;
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            opacity: var(--mobile-opacity);
            transition: opacity 0.2s ease;
        }

        /* Show when touch active or forced */
        body.touch-active #mobile-controller-root,
        #mobile-controller-root.active {
            display: block;
        }

        /* All interactive mobile buttons enable pointer events */
        .mobile-touch-btn,
        .mobile-pedal,
        .mobile-joystick-base {
            pointer-events: auto;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        /* ---------------- Floating Joystick ---------------- */
        .mobile-joystick-base {
            position: absolute;
            left: max(80px, env(safe-area-inset-left, 80px));
            bottom: max(75px, env(safe-area-inset-bottom, 75px));
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(15, 23, 42, 0.72) 0%, rgba(2, 6, 23, 0.85) 100%);
            border: 2px solid rgba(56, 189, 248, 0.45);
            box-shadow: 0 0 16px rgba(56, 189, 248, 0.25), inset 0 0 12px rgba(56, 189, 248, 0.15);
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.45;
            transition: opacity 0.2s ease-out, transform 0.2s ease-out;
            pointer-events: none;
            z-index: 8510;
        }

        .mobile-joystick-base.visible,
        .mobile-joystick-base.active {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }

        #mobile-controller-root.left-handed .mobile-joystick-base {
            left: auto;
            right: max(80px, env(safe-area-inset-right, 80px));
        }

        /* Dead-zone & Sprint Guide Rings */
        .mobile-joystick-base::before {
            content: '';
            position: absolute;
            top: 50%; left: 50%;
            width: 85px; height: 85px; /* 85% sprint threshold ring */
            border-radius: 50%;
            border: 1px dashed rgba(245, 158, 11, 0.35);
            transform: translate(-50%, -50%);
            pointer-events: none;
        }

        .mobile-joystick-base::after {
            content: '';
            position: absolute;
            top: 50%; left: 50%;
            width: 16px; height: 16px; /* 8px radius deadzone ring */
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.18);
            transform: translate(-50%, -50%);
            pointer-events: none;
        }

        .mobile-joystick-knob {
            position: absolute;
            top: 50%; left: 50%;
            width: 44px; height: 44px;
            margin-top: -22px; margin-left: -22px;
            border-radius: 50%;
            background: radial-gradient(circle at 35% 35%, #38bdf8 0%, #0284c7 65%, #0369a1 100%);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5), 0 0 14px rgba(56, 189, 248, 0.5);
            border: 2px solid #e0f2fe;
            pointer-events: none;
            transition: box-shadow 0.15s ease, background 0.15s ease;
        }

        .mobile-joystick-base.sprint-active .mobile-joystick-knob {
            background: radial-gradient(circle at 35% 35%, #fbbf24 0%, #f59e0b 65%, #d97706 100%);
            border-color: #fef3c7;
            box-shadow: 0 0 22px rgba(245, 158, 11, 0.9), 0 2px 10px rgba(0,0,0,0.5);
        }

        /* ---------------- Control Clusters ---------------- */
        .mobile-cluster {
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: 0;
            transform: scale(0.96);
            transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
            display: none;
        }

        .mobile-cluster.active {
            display: block;
            opacity: 1;
            transform: scale(1);
        }

        /* Standard round touch button */
        .mobile-touch-btn {
            position: absolute;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%);
            border: 1.5px solid rgba(255, 255, 255, 0.22);
            color: #f8fafc;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.5px;
            transform: scale(var(--mobile-btn-scale));
            transform-origin: center center;
            transition: transform 0.08s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .mobile-touch-btn:active,
        .mobile-touch-btn.is-pressed {
            transform: scale(calc(var(--mobile-btn-scale) * 0.92));
            background: radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%);
            border-color: #38bdf8;
            box-shadow: 0 0 18px rgba(56, 189, 248, 0.6);
        }

        .mobile-btn-icon {
            font-size: 22px;
            line-height: 1;
            pointer-events: none;
        }

        .mobile-btn-label {
            font-size: 10px;
            text-transform: uppercase;
            margin-top: 2px;
            pointer-events: none;
            opacity: 0.9;
        }

        /* Primary Accent: Jump button */
        .mobile-btn-primary {
            background: radial-gradient(circle, #0284c7 0%, #0369a1 100%);
            border: 2px solid #7dd3fc;
            box-shadow: 0 4px 18px rgba(2, 132, 199, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .mobile-btn-primary:active,
        .mobile-btn-primary.is-pressed {
            background: radial-gradient(circle, #0ea5e9 0%, #0284c7 100%);
            box-shadow: 0 0 24px rgba(56, 189, 248, 0.85);
        }

        /* Sprint toggle active */
        .mobile-btn-toggle.toggled-on {
            background: radial-gradient(circle, #d97706 0%, #b45309 100%);
            border-color: #fde68a;
            box-shadow: 0 0 18px rgba(245, 158, 11, 0.7);
        }

        /* ---------------- On-Foot Arc Cluster ---------------- */
        #mobile-foot-cluster {
            bottom: max(16px, env(safe-area-inset-bottom, 16px));
            right: max(16px, env(safe-area-inset-right, 16px));
        }

        /* Thumb arc positioning (Right-handed default) */
        #mobile-btn-jump {
            width: 64px; height: 64px;
            bottom: 30px; right: 30px;
        }

        #mobile-btn-sprint {
            width: 56px; height: 56px;
            bottom: 105px; right: 18px;
        }

        #mobile-btn-interact {
            width: 60px; height: 60px;
            bottom: 22px; right: 108px;
            border-color: #38bdf8;
            display: none; /* context sensitive */
            animation: mobile-pulse-glow 1.6s infinite ease-in-out;
        }

        #mobile-btn-vehicle {
            width: 60px; height: 60px;
            bottom: 96px; right: 90px;
            border-color: #f59e0b;
            display: none; /* context sensitive */
            animation: mobile-pulse-glow 1.6s infinite ease-in-out;
        }

        #mobile-btn-cam-view {
            width: 48px; height: 48px;
            bottom: 172px; right: 24px;
            background: rgba(15, 23, 42, 0.75);
        }

        @keyframes mobile-pulse-glow {
            0%, 100% { box-shadow: 0 0 10px rgba(56, 189, 248, 0.3); }
            50% { box-shadow: 0 0 22px rgba(56, 189, 248, 0.85); border-color: #7dd3fc; }
        }

        /* ---------------- In-Vehicle Controls ---------------- */
        /* Steering buttons on bottom-left */
        .mobile-steer-group {
            position: absolute;
            bottom: max(20px, env(safe-area-inset-bottom, 20px));
            left: max(20px, env(safe-area-inset-left, 20px));
            display: flex;
            gap: 16px;
            align-items: center;
        }

        #mobile-btn-steer-left,
        #mobile-btn-steer-right {
            width: 64px; height: 64px;
            position: relative;
            background: radial-gradient(circle, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
            border: 2px solid rgba(56, 189, 248, 0.4);
            font-size: 26px;
        }

        #mobile-btn-steer-assist {
            position: absolute;
            bottom: max(96px, env(safe-area-inset-bottom, 96px));
            left: max(32px, env(safe-area-inset-left, 32px));
            width: 52px; height: 52px;
            border-radius: 50%;
            border-color: #10b981;
            font-size: 11px;
        }

        #mobile-btn-steer-assist.assist-on {
            border-color: #34d399;
            box-shadow: 0 0 14px rgba(16, 185, 129, 0.6);
        }

        /* Driving pedals on bottom-right */
        .mobile-pedals-group {
            position: absolute;
            bottom: max(16px, env(safe-area-inset-bottom, 16px));
            right: max(16px, env(safe-area-inset-right, 16px));
            display: flex;
            align-items: flex-end;
            gap: 16px;
        }

        .mobile-pedal {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            padding: 12px 6px;
            border-radius: 14px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transform: scale(var(--mobile-btn-scale));
            transform-origin: bottom center;
            transition: transform 0.08s ease, box-shadow 0.12s ease;
            box-sizing: border-box;
        }

        .mobile-pedal:active,
        .mobile-pedal.is-pressed {
            transform: scale(calc(var(--mobile-btn-scale) * 0.95));
        }

        /* Pressure ridges */
        .mobile-pedal-treads {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: 80%;
            pointer-events: none;
        }

        .mobile-pedal-tread {
            height: 4px;
            background: rgba(255, 255, 255, 0.25);
            border-radius: 2px;
        }

        /* Gas Pedal: Tall & Green */
        #mobile-pedal-gas {
            width: 72px;
            height: 120px;
            background: linear-gradient(180deg, rgba(16, 185, 129, 0.85) 0%, rgba(5, 150, 105, 0.95) 100%);
            border-color: #6ee7b7;
        }

        #mobile-pedal-gas:active,
        #mobile-pedal-gas.is-pressed {
            box-shadow: 0 0 24px rgba(16, 185, 129, 0.9);
        }

        /* Brake Pedal: Wider & Red */
        #mobile-pedal-brake {
            width: 66px;
            height: 96px;
            background: linear-gradient(180deg, rgba(239, 68, 68, 0.85) 0%, rgba(185, 28, 28, 0.95) 100%);
            border-color: #fca5a5;
        }

        #mobile-pedal-brake:active,
        #mobile-pedal-brake.is-pressed {
            box-shadow: 0 0 24px rgba(239, 68, 68, 0.9);
        }

        .mobile-pedal-label {
            font-size: 11px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 0.5px;
            text-shadow: 0 1px 3px rgba(0,0,0,0.6);
            pointer-events: none;
        }

        /* Secondary vehicle buttons */
        #mobile-btn-handbrake {
            width: 56px; height: 56px;
            bottom: max(136px, env(safe-area-inset-bottom, 136px));
            right: max(112px, env(safe-area-inset-right, 112px));
            border-color: #f59e0b;
        }

        #mobile-btn-horn {
            width: 52px; height: 52px;
            bottom: max(148px, env(safe-area-inset-bottom, 148px));
            right: max(32px, env(safe-area-inset-right, 32px));
        }

        #mobile-btn-exit-vehicle {
            position: absolute;
            bottom: max(215px, env(safe-area-inset-bottom, 215px));
            right: max(24px, env(safe-area-inset-right, 24px));
            height: 48px;
            padding: 0 18px;
            border-radius: 24px;
            background: radial-gradient(circle, rgba(220, 38, 38, 0.85) 0%, rgba(153, 27, 27, 0.95) 100%);
            border: 1.5px solid #fca5a5;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 800;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }

        /* ---------------- Flight (Iron Man) Cluster ---------------- */
        #mobile-flight-cluster {
            bottom: max(16px, env(safe-area-inset-bottom, 16px));
            right: max(16px, env(safe-area-inset-right, 16px));
        }

        #mobile-btn-flight-boost {
            width: 64px; height: 64px;
            bottom: 30px; right: 30px;
            background: radial-gradient(circle, #f59e0b 0%, #b45309 100%);
            border: 2px solid #fef08a;
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
        }

        #mobile-btn-flight-up {
            width: 58px; height: 58px;
            bottom: 106px; right: 20px;
            border-color: #38bdf8;
        }

        #mobile-btn-flight-down {
            width: 58px; height: 58px;
            bottom: 22px; right: 106px;
            border-color: #94a3b8;
        }

        #mobile-btn-flight-land {
            width: 56px; height: 56px;
            bottom: 96px; right: 90px;
            background: radial-gradient(circle, #dc2626 0%, #991b1b 100%);
            border-color: #fca5a5;
        }

        /* ---------------- Left-Handed Mirroring ---------------- */
        #mobile-controller-root.left-handed #mobile-foot-cluster,
        #mobile-controller-root.left-handed #mobile-flight-cluster,
        #mobile-controller-root.left-handed .mobile-pedals-group {
            right: auto;
            left: max(16px, env(safe-area-inset-left, 16px));
        }

        #mobile-controller-root.left-handed .mobile-steer-group {
            left: auto;
            right: max(20px, env(safe-area-inset-right, 20px));
        }

        #mobile-controller-root.left-handed #mobile-btn-steer-assist {
            left: auto;
            right: max(32px, env(safe-area-inset-right, 32px));
        }

        #mobile-controller-root.left-handed #mobile-btn-exit-vehicle {
            right: auto;
            left: max(24px, env(safe-area-inset-left, 24px));
        }
    `;
    document.head.appendChild(style);
}

// ------------------------------------------
// DOM TEMPLATE & CREATION
// ------------------------------------------
function buildDOM() {
    if (document.getElementById('mobile-controller-root')) return;

    injectStyles();

    rootEl = document.createElement('div');
    rootEl.id = 'mobile-controller-root';
    rootEl.innerHTML = `
        <!-- Floating Dynamic Joystick Base -->
        <div id="mobile-joystick-base" class="mobile-joystick-base">
            <div id="mobile-joystick-knob" class="mobile-joystick-knob"></div>
        </div>

        <!-- 1. On-Foot Action Cluster -->
        <div id="mobile-foot-cluster" class="mobile-cluster active">
            <button id="mobile-btn-jump" class="mobile-touch-btn mobile-btn-primary" data-action="jump" title="Jump / Hover Boost">
                <span class="mobile-btn-icon">⤴️</span>
                <span class="mobile-btn-label">JUMP</span>
            </button>
            <button id="mobile-btn-sprint" class="mobile-touch-btn mobile-btn-toggle" data-action="sprint" title="Toggle Sprint">
                <span class="mobile-btn-icon">🏃</span>
                <span class="mobile-btn-label">SPRINT</span>
            </button>
            <button id="mobile-btn-interact" class="mobile-touch-btn" data-action="interact" title="Interact [E]">
                <span class="mobile-btn-icon">💬</span>
                <span class="mobile-btn-label" id="mobile-interact-label">INTERACT</span>
            </button>
            <button id="mobile-btn-vehicle" class="mobile-touch-btn" data-action="vehicleMount" title="Enter Vehicle [F]">
                <span class="mobile-btn-icon">🚗</span>
                <span class="mobile-btn-label" id="mobile-vehicle-label">ENTER</span>
            </button>
            <button id="mobile-btn-cam-view" class="mobile-touch-btn" data-action="camView" title="Change Camera View [V]">
                <span class="mobile-btn-icon">👁️</span>
                <span class="mobile-btn-label">CAM</span>
            </button>
        </div>

        <!-- 2. In-Vehicle Driving Cluster -->
        <div id="mobile-vehicle-cluster" class="mobile-cluster">
            <!-- Steering Controls (Left) -->
            <div class="mobile-steer-group">
                <button id="mobile-btn-steer-left" class="mobile-touch-btn" data-action="steerLeft" title="Steer Left">◀</button>
                <button id="mobile-btn-steer-right" class="mobile-touch-btn" data-action="steerRight" title="Steer Right">▶</button>
            </div>
            <button id="mobile-btn-steer-assist" class="mobile-touch-btn assist-on" data-action="steerAssist" title="Toggle Auto-Steering Assist">
                <span class="mobile-btn-icon">🛣️</span>
                <span class="mobile-btn-label">ASSIST</span>
            </button>

            <!-- Driving Pedals (Right) -->
            <div class="mobile-pedals-group">
                <div id="mobile-pedal-brake" class="mobile-pedal" data-action="brake" title="Brake / Reverse">
                    <span class="mobile-pedal-label">BRAKE</span>
                    <div class="mobile-pedal-treads">
                        <div class="mobile-pedal-tread"></div>
                        <div class="mobile-pedal-tread"></div>
                        <div class="mobile-pedal-tread"></div>
                    </div>
                    <span class="mobile-pedal-label">REV 🛑</span>
                </div>
                <div id="mobile-pedal-gas" class="mobile-pedal" data-action="gas" title="Accelerate (Gas)">
                    <span class="mobile-pedal-label">GAS</span>
                    <div class="mobile-pedal-treads">
                        <div class="mobile-pedal-tread"></div>
                        <div class="mobile-pedal-tread"></div>
                        <div class="mobile-pedal-tread"></div>
                        <div class="mobile-pedal-tread"></div>
                    </div>
                    <span class="mobile-pedal-label">⚡ ACCEL</span>
                </div>
            </div>

            <!-- Handbrake, Horn & Exit -->
            <button id="mobile-btn-handbrake" class="mobile-touch-btn" data-action="handbrake" title="Handbrake">
                <span class="mobile-btn-icon">🅿️</span>
                <span class="mobile-btn-label">HANDBRAKE</span>
            </button>
            <button id="mobile-btn-horn" class="mobile-touch-btn" data-action="horn" title="Horn">
                <span class="mobile-btn-icon">📢</span>
                <span class="mobile-btn-label">HORN</span>
            </button>
            <button id="mobile-btn-exit-vehicle" class="mobile-touch-btn" data-action="exitVehicle" title="Exit Vehicle">
                <span>🚪</span>
                <span>EXIT VEHICLE</span>
            </button>
        </div>

        <!-- 3. Iron Man Flight Cluster -->
        <div id="mobile-flight-cluster" class="mobile-cluster">
            <button id="mobile-btn-flight-boost" class="mobile-touch-btn" data-action="flightBoost" title="Supersonic Boost [Shift]">
                <span class="mobile-btn-icon">🚀</span>
                <span class="mobile-btn-label">BOOST</span>
            </button>
            <button id="mobile-btn-flight-up" class="mobile-touch-btn" data-action="flightUp" title="Ascend [Space]">
                <span class="mobile-btn-icon">🔼</span>
                <span class="mobile-btn-label">ASCEND</span>
            </button>
            <button id="mobile-btn-flight-down" class="mobile-touch-btn" data-action="flightDown" title="Descend / Air Brake [C]">
                <span class="mobile-btn-icon">🔽</span>
                <span class="mobile-btn-label">BRAKE</span>
            </button>
            <button id="mobile-btn-flight-land" class="mobile-touch-btn" data-action="flightLand" title="Superhero Landing [G]">
                <span class="mobile-btn-icon">🛬</span>
                <span class="mobile-btn-label">LAND</span>
            </button>
        </div>
    `;

    document.body.appendChild(rootEl);

    // Cache elements
    joystickBaseEl = document.getElementById('mobile-joystick-base');
    joystickKnobEl = document.getElementById('mobile-joystick-knob');
    footClusterEl = document.getElementById('mobile-foot-cluster');
    vehicleClusterEl = document.getElementById('mobile-vehicle-cluster');
    flightClusterEl = document.getElementById('mobile-flight-cluster');
    btnInteractEl = document.getElementById('mobile-btn-interact');
    btnVehicleEl = document.getElementById('mobile-btn-vehicle');
    btnSprintEl = document.getElementById('mobile-btn-sprint');
    btnAssistEl = document.getElementById('mobile-btn-steer-assist');
    gasPedalEl = document.getElementById('mobile-pedal-gas');
    brakePedalEl = document.getElementById('mobile-pedal-brake');

    applySettingsToDOM();
}

function applySettingsToDOM() {
    if (!rootEl) return;

    // Scale
    let scaleVal = 1.0;
    if (mobileSettings.buttonSize === 'small') scaleVal = 0.85;
    else if (mobileSettings.buttonSize === 'large') scaleVal = 1.18;
    rootEl.style.setProperty('--mobile-btn-scale', scaleVal);

    // Opacity
    rootEl.style.setProperty('--mobile-opacity', Math.max(0.3, Math.min(1.0, mobileSettings.opacity)));

    // Left-handed layout toggle
    rootEl.classList.toggle('left-handed', !!mobileSettings.leftHanded);

    // Steer Assist state
    updateAssistButtonVisual();
}

function updateAssistButtonVisual() {
    if (btnAssistEl) {
        btnAssistEl.classList.toggle('assist-on', !!mobileSettings.steerAssist);
    }
}

// ------------------------------------------
// POINTER TRACKING & MULTI-TOUCH ENGINE
// ------------------------------------------
function setupPointerListeners() {
    window.addEventListener('pointerdown', handlePointerDown, { passive: false });
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
    window.addEventListener('pointercancel', handlePointerCancel, { passive: false });

    // Handle touch device auto-activation
    window.addEventListener('touchstart', (e) => {
        controlStates.isTouchDevice = true;
        document.body.classList.add('touch-active');
        if (rootEl) rootEl.classList.add('active');
    }, { passive: true, capture: true });
}

function isInsideElement(x, y, el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
}

function handlePointerDown(e) {
    // Detect touch
    if (e.pointerType === 'touch') {
        controlStates.isTouchDevice = true;
        document.body.classList.add('touch-active');
        if (rootEl) rootEl.classList.add('active');
    }

    // Only process when touch mode is active or when touching on our controls
    const isTouchMode = controlStates.isTouchDevice || (rootEl && rootEl.classList.contains('active')) || document.body.classList.contains('touch-active');
    if (!isTouchMode && e.pointerType === 'mouse') {
        return; // Normal desktop mouse clicks unchanged
    }

    // 1. Check if hit any mobile button or pedal
    const target = e.target;
    const btn = (target && typeof target.closest === 'function') ?
        target.closest('.mobile-touch-btn, .mobile-pedal') : null;

    if (btn && rootEl && rootEl.contains(btn)) {
        const action = btn.dataset?.action || btn.getAttribute('data-action');
        activePointers.set(e.pointerId, {
            role: 'button',
            element: btn,
            action: action,
            startX: e.clientX,
            startY: e.clientY
        });
        btn.classList.add('is-pressed');
        handleButtonDown(action, btn, e);
        triggerHaptic(15);
        if (typeof e.preventDefault === 'function') e.preventDefault();
        return;
    }

    // 2. Check if touching outside controls (e.g. Minimap, Top Header, Dialogs)
    const hudInteractive = (target && typeof target.closest === 'function') ?
        target.closest('#gta-radar-card, .top-bar, .modal, #cyber-phone-overlay, #flight-hud, #landmark-modal, #interactive-modal') : null;
    if (hudInteractive) {
        // Let event proceed to HUD handlers
        return;
    }

    // 3. Screen half partitioning for Joystick vs Camera Look
    const screenWidth = window.innerWidth;
    const isLeftHanded = mobileSettings.leftHanded;

    const isJoystickZone = isLeftHanded ?
        (e.clientX > screenWidth * 0.55) : // Right 45% if left-handed
        (e.clientX < screenWidth * 0.45);  // Left 45% default

    if (isJoystickZone) {
        // Dynamic floating joystick
        if (joystickPointerId === null) {
            joystickPointerId = e.pointerId;
            activePointers.set(e.pointerId, {
                role: 'joystick',
                startX: e.clientX,
                startY: e.clientY
            });
            spawnJoystick(e.clientX, e.clientY);
            e.preventDefault();
        }
    } else {
        // Right 55% camera orbit look
        if (cameraPointerId === null) {
            cameraPointerId = e.pointerId;
            activePointers.set(e.pointerId, {
                role: 'camera',
                startX: e.clientX,
                startY: e.clientY
            });
            startCameraLook(e.clientX, e.clientY);
            e.preventDefault();
        }
    }
}

function handlePointerMove(e) {
    const record = activePointers.get(e.pointerId);
    if (!record) return;

    if (record.role === 'joystick' && e.pointerId === joystickPointerId) {
        updateJoystickPosition(e.clientX, e.clientY);
        e.preventDefault();
    } else if (record.role === 'camera' && e.pointerId === cameraPointerId) {
        updateCameraLook(e.clientX, e.clientY);
        e.preventDefault();
    } else if (record.role === 'button') {
        // Check pressure on pedals
        if (record.action === 'gas' || record.action === 'brake') {
            updatePedalPressure(record.action, record.element, e.clientY);
        }
        e.preventDefault();
    }
}

function handlePointerUp(e) {
    const record = activePointers.get(e.pointerId);
    if (!record) return;

    if (record.role === 'joystick' && e.pointerId === joystickPointerId) {
        releaseJoystick();
        joystickPointerId = null;
    } else if (record.role === 'camera' && e.pointerId === cameraPointerId) {
        endCameraLook();
        cameraPointerId = null;
    } else if (record.role === 'button') {
        if (record.element) record.element.classList.remove('is-pressed');
        handleButtonUp(record.action, record.element);
    }

    activePointers.delete(e.pointerId);
}

function handlePointerCancel(e) {
    handlePointerUp(e);
}

// ------------------------------------------
// DYNAMIC FLOATING JOYSTICK ENGINE
// ------------------------------------------
function spawnJoystick(x, y) {
    controlStates.joystick.active = true;
    controlStates.joystick.originX = x;
    controlStates.joystick.originY = y;
    controlStates.joystick.currentX = x;
    controlStates.joystick.currentY = y;
    controlStates.joystick.dx = 0;
    controlStates.joystick.dy = 0;
    controlStates.joystick.distance = 0;
    controlStates.joystick.normX = 0;
    controlStates.joystick.normY = 0;
    controlStates.joystick.isSprinting = false;

    if (joystickBaseEl) {
        joystickBaseEl.style.left = `${x}px`;
        joystickBaseEl.style.top = `${y}px`;
        joystickBaseEl.classList.add('visible', 'active');
        joystickBaseEl.classList.remove('sprint-active');
    }
    if (joystickKnobEl) {
        joystickKnobEl.style.transform = `translate(0px, 0px)`;
    }
}

function updateJoystickPosition(currentX, currentY) {
    const js = controlStates.joystick;
    js.currentX = currentX;
    js.currentY = currentY;

    const rawDx = currentX - js.originX;
    const rawDy = currentY - js.originY;
    const dist = Math.hypot(rawDx, rawDy);

    const maxRadius = JOYSTICK_MAX_RADIUS; // 50px clamp radius
    const deadZone = JOYSTICK_DEAD_ZONE;   // 8px dead-zone
    const sprintThreshold = maxRadius * JOYSTICK_SPRINT_RATIO; // 42.5px (>85%)

    if (dist < deadZone) {
        js.dx = 0;
        js.dy = 0;
        js.distance = 0;
        js.normX = 0;
        js.normY = 0;
        js.isSprinting = false;
        if (joystickKnobEl) joystickKnobEl.style.transform = `translate(0px, 0px)`;
        if (joystickBaseEl) joystickBaseEl.classList.remove('sprint-active');
    } else {
        const angle = Math.atan2(rawDy, rawDx);
        const clampedDist = Math.min(dist, maxRadius);
        const normFactor = (clampedDist - deadZone) / (maxRadius - deadZone);

        js.dx = Math.cos(angle) * clampedDist;
        js.dy = Math.sin(angle) * clampedDist;
        js.distance = clampedDist;
        js.normX = Math.cos(angle) * normFactor;
        js.normY = Math.sin(angle) * normFactor;
        js.isSprinting = (dist >= sprintThreshold);

        if (joystickKnobEl) {
            joystickKnobEl.style.transform = `translate(${js.dx}px, ${js.dy}px)`;
        }
        if (joystickBaseEl) {
            joystickBaseEl.classList.toggle('sprint-active', js.isSprinting);
        }
    }

    // Update analog movement values
    controlStates.analogMovement.x = js.normX;
    controlStates.analogMovement.y = -js.normY; // Forward is +Y in 2D space
    controlStates.analogMovement.distance = js.distance / maxRadius;
    controlStates.analogMovement.angle = Math.atan2(-js.normY, js.normX);
    controlStates.analogMovement.isSprinting = js.isSprinting;

    // Feed keyboard keys object
    applyJoystickToKeys();
}

function releaseJoystick() {
    const js = controlStates.joystick;
    js.active = false;
    js.dx = 0;
    js.dy = 0;
    js.distance = 0;
    js.normX = 0;
    js.normY = 0;
    js.isSprinting = false;

    controlStates.analogMovement.x = 0;
    controlStates.analogMovement.y = 0;
    controlStates.analogMovement.distance = 0;
    controlStates.analogMovement.isSprinting = false;

    if (joystickBaseEl) {
        joystickBaseEl.classList.remove('visible', 'active', 'sprint-active');
        joystickBaseEl.style.left = '';
        joystickBaseEl.style.top = '';
    }
    if (joystickKnobEl) {
        joystickKnobEl.style.transform = `translate(0px, 0px)`;
    }

    // Reset directional keys
    const keys = optionsRef.keys || (typeof window !== 'undefined' ? window.__keys : null);
    if (keys) {
        keys.w = false;
        keys.s = false;
        keys.a = false;
        keys.d = false;
        keys.shift = controlStates.actions.sprintToggle;
    }
}

function applyJoystickToKeys() {
    const keys = optionsRef.keys || (typeof window !== 'undefined' ? window.__keys : null);
    if (!keys) return;

    const js = controlStates.joystick;
    const threshold = 0.28;

    if (controlStates.mode === 'foot' || controlStates.mode === 'flight') {
        keys.w = (js.normY < -threshold);
        keys.s = (js.normY > threshold);
        keys.a = (js.normX < -threshold);
        keys.d = (js.normX > threshold);
        keys.shift = js.isSprinting || controlStates.actions.sprintToggle;
    } else if (controlStates.mode === 'vehicle' || controlStates.mode === 'bike') {
        // In vehicle mode, joystick can steer if buttons not pressed
        if (!controlStates.actions.steerLeft && !controlStates.actions.steerRight) {
            keys.a = (js.normX < -threshold);
            keys.d = (js.normX > threshold);
        }
    }
}

// ------------------------------------------
// RIGHT-HALF CAMERA LOOK & INERTIA
// ------------------------------------------
function startCameraLook(x, y) {
    controlStates.cameraLook.active = true;
    lastCameraX = x;
    lastCameraY = y;
    lastCameraTime = performance.now();
    controlStates.cameraLook.velYaw = 0;
    controlStates.cameraLook.velPitch = 0;
}

function updateCameraLook(currentX, currentY) {
    const now = performance.now();
    const dt = Math.max(0.001, (now - lastCameraTime) * 0.001);

    const dX = currentX - lastCameraX;
    const dY = currentY - lastCameraY;

    const sens = 0.0036 * mobileSettings.cameraSensitivity;
    const deltaYaw = dX * sens;
    const deltaPitch = dY * sens;

    controlStates.cameraLook.deltaYaw += deltaYaw;
    controlStates.cameraLook.deltaPitch += deltaPitch;

    // Filter velocity for smooth inertia
    const instVelYaw = deltaYaw / dt;
    const instVelPitch = deltaPitch / dt;
    controlStates.cameraLook.velYaw = THREE.MathUtils.lerp(controlStates.cameraLook.velYaw, instVelYaw, 0.4);
    controlStates.cameraLook.velPitch = THREE.MathUtils.lerp(controlStates.cameraLook.velPitch, instVelPitch, 0.4);

    cameraOrbitYaw += deltaYaw;
    cameraOrbitPitch = Math.max(-0.45, Math.min(0.85, cameraOrbitPitch + deltaPitch));

    lastCameraX = currentX;
    lastCameraY = currentY;
    lastCameraTime = now;
}

function endCameraLook() {
    controlStates.cameraLook.active = false;
}

export function getCameraLookDelta() {
    return {
        deltaYaw: controlStates.cameraLook.deltaYaw,
        deltaPitch: controlStates.cameraLook.deltaPitch,
        orbitYaw: cameraOrbitYaw,
        orbitPitch: cameraOrbitPitch
    };
}

export function applyCameraLook(camera, targetPosition, distance = 14.0, height = 7.5) {
    if (!camera || !targetPosition) return;

    const yaw = cameraOrbitYaw;
    const pitch = cameraOrbitPitch;

    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);

    const camX = targetPosition.x - sinYaw * cosPitch * distance;
    const camZ = targetPosition.z - cosYaw * cosPitch * distance;
    const camY = targetPosition.y + height + sinPitch * distance;

    camera.position.set(camX, camY, camZ);
    camera.lookAt(targetPosition.x, targetPosition.y + 2.0, targetPosition.z);
}

// ------------------------------------------
// BUTTON ACTIONS & CONTEXT HANDLING
// ------------------------------------------
function handleButtonDown(action, el, e) {
    const keys = optionsRef.keys || (typeof window !== 'undefined' ? window.__keys : null);

    switch (action) {
        case 'jump':
            controlStates.actions.jump = true;
            if (keys) keys.space = true;
            break;

        case 'sprint':
            // Toggle sprint state
            controlStates.actions.sprintToggle = !controlStates.actions.sprintToggle;
            if (btnSprintEl) {
                btnSprintEl.classList.toggle('toggled-on', controlStates.actions.sprintToggle);
            }
            if (keys) {
                keys.shift = controlStates.actions.sprintToggle || controlStates.joystick.isSprinting;
            }
            break;

        case 'interact':
            controlStates.actions.interact = true;
            if (typeof optionsRef.onInteraction === 'function') {
                optionsRef.onInteraction();
            } else if (typeof window !== 'undefined' && typeof window.handleInteraction === 'function') {
                window.handleInteraction();
            } else {
                dispatchKeyboardEvent('e');
            }
            break;

        case 'vehicleMount':
        case 'exitVehicle':
            controlStates.actions.vehicleMount = true;
            if (typeof optionsRef.onVehicleMount === 'function') {
                optionsRef.onVehicleMount();
            } else if (typeof window !== 'undefined' && typeof window.toggleVehicleMount === 'function') {
                window.toggleVehicleMount();
            } else {
                dispatchKeyboardEvent('f');
            }
            break;

        case 'camView':
            if (typeof window !== 'undefined') {
                dispatchKeyboardEvent('v');
            }
            break;

        case 'steerLeft':
            controlStates.actions.steerLeft = true;
            if (keys) keys.a = true;
            break;

        case 'steerRight':
            controlStates.actions.steerRight = true;
            if (keys) keys.d = true;
            break;

        case 'steerAssist':
            setSteerAssistEnabled(!mobileSettings.steerAssist);
            break;

        case 'gas':
            controlStates.actions.gas = true;
            if (keys) keys.w = true;
            if (el && e) updatePedalPressure('gas', el, e.clientY);
            break;

        case 'brake':
            controlStates.actions.brake = true;
            if (keys) keys.s = true;
            if (el && e) updatePedalPressure('brake', el, e.clientY);
            break;

        case 'handbrake':
            controlStates.actions.handbrake = true;
            if (keys) keys.space = true;
            break;

        case 'horn':
            controlStates.actions.horn = true;
            if (typeof optionsRef.playSound === 'function') {
                optionsRef.playSound('engine');
            } else if (typeof window !== 'undefined' && typeof window.playSound === 'function') {
                window.playSound('engine');
            }
            break;

        case 'flightBoost':
            controlStates.actions.flightBoost = true;
            if (keys) keys.shift = true;
            break;

        case 'flightUp':
            controlStates.actions.flightUp = true;
            if (keys) keys.space = true;
            break;

        case 'flightDown':
            controlStates.actions.flightDown = true;
            if (keys) keys.c = true;
            break;

        case 'flightLand':
            if (typeof optionsRef.onFlightToggle === 'function') {
                optionsRef.onFlightToggle();
            } else if (typeof window !== 'undefined' && typeof window.toggleFlightMode === 'function') {
                window.toggleFlightMode();
            } else {
                dispatchKeyboardEvent('g');
            }
            break;
    }
}

function handleButtonUp(action, el) {
    const keys = optionsRef.keys || (typeof window !== 'undefined' ? window.__keys : null);

    switch (action) {
        case 'jump':
            controlStates.actions.jump = false;
            if (keys) keys.space = false;
            break;

        case 'steerLeft':
            controlStates.actions.steerLeft = false;
            if (keys) keys.a = false;
            break;

        case 'steerRight':
            controlStates.actions.steerRight = false;
            if (keys) keys.d = false;
            break;

        case 'gas':
            controlStates.actions.gas = false;
            controlStates.actions.gasPressure = 0;
            if (keys) keys.w = false;
            break;

        case 'brake':
            controlStates.actions.brake = false;
            controlStates.actions.brakePressure = 0;
            if (keys) keys.s = false;
            break;

        case 'handbrake':
            controlStates.actions.handbrake = false;
            if (keys) keys.space = false;
            break;

        case 'flightBoost':
            controlStates.actions.flightBoost = false;
            if (keys) keys.shift = false;
            break;

        case 'flightUp':
            controlStates.actions.flightUp = false;
            if (keys) keys.space = false;
            break;

        case 'flightDown':
            controlStates.actions.flightDown = false;
            if (keys) keys.c = false;
            break;
    }
}

function updatePedalPressure(type, pedalEl, clientY) {
    if (!pedalEl) return;
    const rect = pedalEl.getBoundingClientRect();
    const progress = Math.max(0.2, Math.min(1.0, (rect.bottom - clientY) / rect.height));
    if (type === 'gas') {
        controlStates.actions.gasPressure = progress;
    } else if (type === 'brake') {
        controlStates.actions.brakePressure = progress;
    }
}

function dispatchKeyboardEvent(key) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
    }, 80);
}

// ------------------------------------------
// CONTEXT PROXIMITY DETECTION
// ------------------------------------------
let proximityTimer = 0;

function updateContextPrompts(dt = 0.016) {
    proximityTimer += dt;
    if (proximityTimer < 0.08) return; // run @ ~12Hz
    proximityTimer = 0;

    const promptEl = document.getElementById('interaction-prompt');
    const keyEl = document.getElementById('interaction-key');
    const labelEl = document.getElementById('interaction-label');

    let showInteract = false;
    let showVehicle = false;
    let interactLabel = 'INTERACT';
    let vehicleLabel = 'ENTER';

    if (promptEl && promptEl.style.display !== 'none' && promptEl.offsetParent !== null) {
        const key = keyEl ? keyEl.textContent.trim().toUpperCase() : '';
        const text = labelEl ? labelEl.textContent.trim() : '';

        if (key === 'E' || /Inspect|Access|Order|Talk|Terminal/i.test(text)) {
            showInteract = true;
            if (/School/i.test(text)) interactLabel = 'SCHOOL 🏫';
            else if (/College|DMCE/i.test(text)) interactLabel = 'COLLEGE 🎓';
            else if (/HQ|Terminal/i.test(text)) interactLabel = 'HQ 💻';
            else if (/Gateway/i.test(text)) interactLabel = 'GATEWAY 🏛️';
            else if (/Vada/i.test(text)) interactLabel = 'VADA PAV 🍔';
        }

        if (key === 'F' || /Ride|Drive|Enter|Board|Vehicle|Bike|Car|Auto|Train/i.test(text)) {
            showVehicle = true;
            if (/Bike/i.test(text)) vehicleLabel = 'BIKE 🏍️';
            else if (/Auto/i.test(text)) vehicleLabel = 'AUTO 🛺';
            else if (/Car/i.test(text)) vehicleLabel = 'CAR 🏎️';
            else if (/Train/i.test(text)) vehicleLabel = 'TRAIN 🚆';
        }
    }

    if (btnInteractEl) {
        btnInteractEl.style.display = showInteract ? 'flex' : 'none';
        const txtEl = document.getElementById('mobile-interact-label');
        if (txtEl) txtEl.textContent = interactLabel;
    }

    if (btnVehicleEl) {
        btnVehicleEl.style.display = showVehicle ? 'flex' : 'none';
        const txtEl = document.getElementById('mobile-vehicle-label');
        if (txtEl) txtEl.textContent = vehicleLabel;
    }
}

// ------------------------------------------
// CONTROL MODE SWITCHING (200ms transition)
// ------------------------------------------
export function setMobileControlMode(mode) {
    if (controlStates.mode === mode) return;
    controlStates.mode = mode;

    if (!footClusterEl || !vehicleClusterEl || !flightClusterEl) return;

    // Reset cluster visibility
    footClusterEl.classList.remove('active');
    vehicleClusterEl.classList.remove('active');
    flightClusterEl.classList.remove('active');

    if (mode === 'foot') {
        footClusterEl.classList.add('active');
    } else if (mode === 'vehicle' || mode === 'car' || mode === 'bike' || mode === 'rickshaw' || mode === 'train') {
        vehicleClusterEl.classList.add('active');
    } else if (mode === 'flight') {
        flightClusterEl.classList.add('active');
    }
}

// ------------------------------------------
// TILT STEERING CONTROLLER
// ------------------------------------------
function handleOrientation(e) {
    if (mobileSettings.steeringMode !== 'tilt') return;
    if (controlStates.mode !== 'vehicle' && controlStates.mode !== 'bike') return;

    // In landscape mode, beta (or gamma) indicates steering angle
    const angle = window.orientation === 90 ? -e.beta : (window.orientation === -90 ? e.beta : e.gamma);
    tiltAngle = angle || 0;

    const deadzone = 5.0; // 5 degrees
    const keys = optionsRef.keys || (typeof window !== 'undefined' ? window.__keys : null);
    if (!keys) return;

    if (tiltAngle < -deadzone) {
        keys.a = true;
        keys.d = false;
    } else if (tiltAngle > deadzone) {
        keys.d = true;
        keys.a = false;
    } else {
        if (!controlStates.actions.steerLeft) keys.a = false;
        if (!controlStates.actions.steerRight) keys.d = false;
    }
}

export function enableTiltSteering() {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        if (!tiltListenerActive) {
            window.addEventListener('deviceorientation', handleOrientation);
            tiltListenerActive = true;
        }
    }
}

export function disableTiltSteering() {
    if (tiltListenerActive && typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation);
        tiltListenerActive = false;
    }
}

// ------------------------------------------
// AUTO-STEERING / LANE CENTERING ASSIST
// ------------------------------------------
function updateSteerAssist(delta) {
    if (!mobileSettings.steerAssist) return;
    if (controlStates.mode !== 'vehicle' && controlStates.mode !== 'bike') return;
    if (controlStates.actions.steerLeft || controlStates.actions.steerRight) return;

    const curVehicle = (typeof optionsRef.getActiveVehicle === 'function') ?
        optionsRef.getActiveVehicle() :
        (typeof window !== 'undefined' && window.__getActiveVehicle ? window.__getActiveVehicle() : null);

    if (!curVehicle || !curVehicle.mesh || Math.abs(curVehicle.speed) < 3.0) return;

    // Gently damp micro-oscillations to keep vehicle tracking straight
    if (curVehicle.angularVelocity) {
        curVehicle.angularVelocity *= Math.pow(0.85, delta * 60);
    }
}

// ------------------------------------------
// MAIN UPDATE LOOP (Called every frame from animate())
// ------------------------------------------
export function updateMobileControls(delta) {
    const dt = Math.min(delta || (1 / 60), 0.1);

    // 1. Camera Inertia Decay when not dragging
    if (!controlStates.cameraLook.active) {
        const decay = Math.pow(0.88, dt * 60);
        controlStates.cameraLook.deltaYaw += controlStates.cameraLook.velYaw * dt;
        controlStates.cameraLook.deltaPitch += controlStates.cameraLook.velPitch * dt;

        cameraOrbitYaw += controlStates.cameraLook.velYaw * dt;
        cameraOrbitPitch = Math.max(-0.45, Math.min(0.85, cameraOrbitPitch + controlStates.cameraLook.velPitch * dt));

        controlStates.cameraLook.velYaw *= decay;
        controlStates.cameraLook.velPitch *= decay;

        if (Math.abs(controlStates.cameraLook.velYaw) < 0.0001) controlStates.cameraLook.velYaw = 0;
        if (Math.abs(controlStates.cameraLook.velPitch) < 0.0001) controlStates.cameraLook.velPitch = 0;
    }

    // Reset single-frame deltas after consumption
    controlStates.cameraLook.deltaYaw = 0;
    controlStates.cameraLook.deltaPitch = 0;

    // 2. Context prompts check (shows/hides Interact and Enter Vehicle buttons)
    if (controlStates.mode === 'foot') {
        updateContextPrompts(dt);
    }

    // 3. Auto-Steering Assist
    updateSteerAssist(dt);
}

// ------------------------------------------
// INITIALIZATION
// ------------------------------------------
export function initMobileControls(options = {}) {
    optionsRef = { ...optionsRef, ...options };

    buildDOM();
    setupPointerListeners();

    if (options.forceTouch || mobileSettings.steeringMode === 'tilt') {
        enableTiltSteering();
    }

    const isTouchCapable = (typeof window !== 'undefined') && (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0) ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    );

    if (options.forceTouch || isTouchCapable) {
        controlStates.isTouchDevice = true;
        document.body.classList.add('touch-active');
        if (rootEl) rootEl.classList.add('active');
    }

    controlStates.active = true;

    // Attach to global window for inspector, verifier & CDP tests
    if (typeof window !== 'undefined') {
        window.setMobileControlMode = setMobileControlMode;
        window.__mobileController = {
            init: initMobileControls,
            update: updateMobileControls,
            setMode: setMobileControlMode,
            getState: getMobileControlState,
            getSettings: getMobileSettings,
            setSettings: setMobileSettings,
            setSteerAssist: setSteerAssistEnabled,
            getSteerAssist: getSteerAssistEnabled,
            applyCameraLook,
            getCameraLookDelta,
            triggerHaptic
        };
    }

    return {
        rootEl,
        controlStates,
        setMobileControlMode,
        updateMobileControls
    };
}
