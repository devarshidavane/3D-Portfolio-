/**
 * src/ui/mobileSettings.js
 * Mobile Platform & HUD Controls Settings Engine
 * 
 * Provides:
 * - Controls Sheet modal (Sliders: Button Size, Opacity, Camera Sensitivity; Toggles: Left-Handed, Steering Mode, Haptics)
 * - "Edit HUD Layout" drag mode (drag movable HUD items with touch/pointer, save positions to localStorage)
 * - Persistent storage with localStorage fallback
 * - Event dispatching & global window.mobileSettings API for mobileController / mobilePerformance
 */

const STORAGE_KEY_SETTINGS = 'mumbai3d_mobile_settings';
const STORAGE_KEY_LAYOUT = 'mumbai3d_hud_layout';

const DEFAULT_SETTINGS = {
    buttonSize: 'normal', // 'small' (48px / 0.85x), 'normal' (56px / 1.0x), 'large' (68px / 1.2x)
    opacity: 85,          // 30 to 100 (%)
    leftHanded: false,    // true = joystick on right, action buttons on left
    cameraSensitivity: 1.0, // 0.4 to 2.5
    steeringMode: 'buttons', // 'buttons' | 'tilt'
    haptics: true
};

let currentSettings = { ...DEFAULT_SETTINGS };
let isEditLayoutMode = false;
let activeDragEl = null;
let dragStartX = 0;
let dragStartY = 0;
let elInitialLeft = 0;
let elInitialTop = 0;

/**
 * Load settings from localStorage with validation
 */
export function loadMobileSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (raw) {
            const parsed = JSON.parse(raw);
            currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.warn('[MobileSettings] Failed to parse localStorage settings:', e);
        currentSettings = { ...DEFAULT_SETTINGS };
    }
    return currentSettings;
}

/**
 * Save current settings to localStorage
 */
export function saveMobileSettings() {
    try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(currentSettings));
    } catch (e) {
        console.warn('[MobileSettings] Failed to save settings to localStorage:', e);
    }
}

/**
 * Get current settings snapshot
 */
export function getMobileSettings() {
    return { ...currentSettings };
}

/**
 * Get single setting value
 */
export function getMobileSetting(key) {
    return currentSettings[key];
}

/**
 * Update single setting and apply
 */
export function setMobileSetting(key, value) {
    currentSettings[key] = value;
    saveMobileSettings();
    applyMobileSettings();
    dispatchSettingsChange();
}

/**
 * Trigger mobile haptic feedback if enabled
 */
export function triggerHaptic(duration = 15) {
    if (currentSettings.haptics && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(duration);
        } catch (e) {}
    }
}

/**
 * Apply settings to DOM and CSS custom properties
 */
export function applyMobileSettings() {
    const root = document.documentElement;
    if (!root) return;

    // 1. Opacity
    const opacityVal = Math.max(0.3, Math.min(1.0, currentSettings.opacity / 100));
    root.style.setProperty('--mobile-controls-opacity', opacityVal.toString());

    const touchControls = document.getElementById('mobile-touch-controls');
    if (touchControls) {
        touchControls.style.opacity = opacityVal.toString();
    }

    // 2. Button Size
    let sizeScale = 1.0;
    let btnDimension = 56;
    let joystickBaseDim = 110;
    if (currentSettings.buttonSize === 'small') {
        sizeScale = 0.85;
        btnDimension = 48;
        joystickBaseDim = 95;
    } else if (currentSettings.buttonSize === 'large') {
        sizeScale = 1.2;
        btnDimension = 68;
        joystickBaseDim = 125;
    }
    root.style.setProperty('--touch-btn-scale', sizeScale.toString());
    root.style.setProperty('--touch-btn-size', `${btnDimension}px`);
    root.style.setProperty('--touch-joystick-size', `${joystickBaseDim}px`);

    // 3. Left-handed mode: swap joystick and action clusters
    if (touchControls) {
        if (currentSettings.leftHanded) {
            touchControls.classList.add('left-handed');
            touchControls.style.flexDirection = 'row-reverse';
        } else {
            touchControls.classList.remove('left-handed');
            touchControls.style.flexDirection = 'row';
        }
    }

    // Apply saved custom layout positions
    applySavedHUDLayout();
}

/**
 * Dispatch custom event when settings change
 */
function dispatchSettingsChange() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mobilesettingschanged', {
            detail: { ...currentSettings }
        }));
    }
}

/**
 * Apply saved HUD Layout positions from localStorage
 */
export function applySavedHUDLayout() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LAYOUT);
        if (!raw) return;
        const layout = JSON.parse(raw);
        if (!layout || typeof layout !== 'object') return;

        for (const [id, pos] of Object.entries(layout)) {
            const el = document.getElementById(id);
            if (el && pos) {
                if (pos.left !== undefined) el.style.left = pos.left;
                if (pos.top !== undefined) el.style.top = pos.top;
                if (pos.right !== undefined) el.style.right = pos.right;
                if (pos.bottom !== undefined) el.style.bottom = pos.bottom;
                if (pos.transform !== undefined) el.style.transform = pos.transform;
            }
        }
    } catch (e) {
        console.warn('[MobileSettings] Failed to apply custom HUD layout:', e);
    }
}

/**
 * Reset HUD layout to factory default positions
 */
export function resetHUDLayout() {
    try {
        localStorage.removeItem(STORAGE_KEY_LAYOUT);
    } catch (e) {}

    const movableIds = ['joystick-zone', 'touch-action-buttons', 'gta-radar-card', 'tachometer-card', 'mobile-top-bar'];
    movableIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.left = '';
            el.style.top = '';
            el.style.right = '';
            el.style.bottom = '';
            el.style.transform = '';
        }
    });

    applyMobileSettings();
}

/**
 * Toggle layout drag edit mode
 */
export function enterEditLayoutMode() {
    if (isEditLayoutMode) return;
    isEditLayoutMode = true;
    closeMobileSettings();

    let banner = document.getElementById('hud-edit-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'hud-edit-banner';
        banner.className = 'hud-edit-banner';
        banner.innerHTML = `
            <div class="hud-edit-info">
                <strong>🛠️ EDIT HUD LAYOUT</strong>
                <span>Drag elements to customize positions</span>
            </div>
            <div class="hud-edit-actions">
                <button id="btn-hud-reset" class="hud-edit-btn reset">↺ RESET</button>
                <button id="btn-hud-save" class="hud-edit-btn save">💾 SAVE</button>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('btn-hud-save')?.addEventListener('click', () => exitEditLayoutMode(true));
        document.getElementById('btn-hud-reset')?.addEventListener('click', () => {
            resetHUDLayout();
            exitEditLayoutMode(false);
        });
    }
    banner.style.display = 'flex';

    // Mark draggable items
    const draggableIds = ['joystick-zone', 'touch-action-buttons', 'gta-radar-card', 'tachometer-card'];
    draggableIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hud-draggable-active');
            el.addEventListener('pointerdown', onDragPointerDown);
        }
    });
}

export function exitEditLayoutMode(save = true) {
    if (!isEditLayoutMode) return;
    isEditLayoutMode = false;

    const banner = document.getElementById('hud-edit-banner');
    if (banner) banner.style.display = 'none';

    const draggableIds = ['joystick-zone', 'touch-action-buttons', 'gta-radar-card', 'tachometer-card'];
    const layout = {};

    draggableIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('hud-draggable-active');
            el.removeEventListener('pointerdown', onDragPointerDown);

            if (save) {
                layout[id] = {
                    left: el.style.left || '',
                    top: el.style.top || '',
                    right: el.style.right || '',
                    bottom: el.style.bottom || ''
                };
            }
        }
    });

    if (save) {
        try {
            localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(layout));
        } catch (e) {}
    }
    triggerHaptic(25);
}

function onDragPointerDown(e) {
    if (!isEditLayoutMode) return;
    e.stopPropagation();
    activeDragEl = e.currentTarget;
    activeDragEl.setPointerCapture?.(e.pointerId);

    const rect = activeDragEl.getBoundingClientRect();
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    elInitialLeft = rect.left;
    elInitialTop = rect.top;

    activeDragEl.style.position = 'fixed';
    activeDragEl.style.left = `${rect.left}px`;
    activeDragEl.style.top = `${rect.top}px`;
    activeDragEl.style.right = 'auto';
    activeDragEl.style.bottom = 'auto';

    window.addEventListener('pointermove', onDragPointerMove);
    window.addEventListener('pointerup', onDragPointerUp);
    window.addEventListener('pointercancel', onDragPointerUp);
    triggerHaptic(10);
}

function onDragPointerMove(e) {
    if (!activeDragEl) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    const newLeft = Math.max(10, Math.min(window.innerWidth - activeDragEl.offsetWidth - 10, elInitialLeft + dx));
    const newTop = Math.max(10, Math.min(window.innerHeight - activeDragEl.offsetHeight - 10, elInitialTop + dy));

    activeDragEl.style.left = `${newLeft}px`;
    activeDragEl.style.top = `${newTop}px`;
}

function onDragPointerUp(e) {
    if (activeDragEl) {
        window.removeEventListener('pointermove', onDragPointerMove);
        window.removeEventListener('pointerup', onDragPointerUp);
        window.removeEventListener('pointercancel', onDragPointerUp);
        activeDragEl = null;
        triggerHaptic(15);
    }
}

/**
 * Open Controls & HUD Settings sheet modal
 */
export function openMobileSettings() {
    let sheet = document.getElementById('mobile-settings-sheet');
    if (!sheet) {
        buildSettingsSheetDOM();
        sheet = document.getElementById('mobile-settings-sheet');
    }
    syncSheetUI();
    if (sheet) sheet.classList.add('open');
    triggerHaptic(15);
}

/**
 * Close Controls & HUD Settings sheet modal
 */
export function closeMobileSettings() {
    const sheet = document.getElementById('mobile-settings-sheet');
    if (sheet) sheet.classList.remove('open');
}

/**
 * Toggle Controls & HUD Settings sheet modal
 */
export function toggleMobileSettings() {
    const sheet = document.getElementById('mobile-settings-sheet');
    if (sheet && sheet.classList.contains('open')) {
        closeMobileSettings();
    } else {
        openMobileSettings();
    }
}

/**
 * Sync UI controls with currentSettings state
 */
function syncSheetUI() {
    // Button Size
    const sizeRadios = document.querySelectorAll('input[name="mob-btn-size"]');
    sizeRadios.forEach(radio => {
        radio.checked = (radio.value === currentSettings.buttonSize);
    });

    // Opacity
    const opacitySlider = document.getElementById('mob-setting-opacity');
    const opacityValLabel = document.getElementById('mob-val-opacity');
    if (opacitySlider) opacitySlider.value = currentSettings.opacity;
    if (opacityValLabel) opacityValLabel.textContent = `${currentSettings.opacity}%`;

    // Left Handed
    const leftHandedToggle = document.getElementById('mob-setting-lefthanded');
    if (leftHandedToggle) leftHandedToggle.checked = !!currentSettings.leftHanded;

    // Cam Sensitivity
    const camSlider = document.getElementById('mob-setting-camsens');
    const camValLabel = document.getElementById('mob-val-camsens');
    if (camSlider) camSlider.value = currentSettings.cameraSensitivity;
    if (camValLabel) camValLabel.textContent = `${currentSettings.cameraSensitivity.toFixed(1)}x`;

    // Steering Mode
    const steerRadios = document.querySelectorAll('input[name="mob-steering-mode"]');
    steerRadios.forEach(radio => {
        radio.checked = (radio.value === currentSettings.steeringMode);
    });

    // Haptics
    const hapticsToggle = document.getElementById('mob-setting-haptics');
    if (hapticsToggle) hapticsToggle.checked = !!currentSettings.haptics;
}

/**
 * Dynamically construct the Settings Sheet HTML if not already in document
 */
function buildSettingsSheetDOM() {
    if (document.getElementById('mobile-settings-sheet')) return;

    const sheet = document.createElement('div');
    sheet.id = 'mobile-settings-sheet';
    sheet.className = 'mobile-settings-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Mobile Controls & HUD Settings');

    sheet.innerHTML = `
        <div class="mob-sheet-backdrop" id="mob-sheet-backdrop"></div>
        <div class="mob-sheet-container">
            <div class="mob-sheet-header">
                <div class="mob-sheet-title">
                    <span class="mob-sheet-icon">⚙️</span>
                    <h3>CONTROLS & HUD SETTINGS</h3>
                </div>
                <button class="mob-sheet-close" id="mob-sheet-close-btn" aria-label="Close Settings">✕</button>
            </div>

            <div class="mob-sheet-body">
                <!-- 1. Button Size -->
                <div class="mob-setting-group">
                    <label class="mob-setting-label">BUTTON SIZE</label>
                    <div class="mob-segmented-control">
                        <label class="mob-seg-opt">
                            <input type="radio" name="mob-btn-size" value="small">
                            <span>Small</span>
                        </label>
                        <label class="mob-seg-opt">
                            <input type="radio" name="mob-btn-size" value="normal" checked>
                            <span>Normal</span>
                        </label>
                        <label class="mob-seg-opt">
                            <input type="radio" name="mob-btn-size" value="large">
                            <span>Large</span>
                        </label>
                    </div>
                </div>

                <!-- 2. Controls Opacity -->
                <div class="mob-setting-group">
                    <div class="mob-setting-row">
                        <label class="mob-setting-label" for="mob-setting-opacity">HUD OPACITY</label>
                        <span class="mob-setting-val" id="mob-val-opacity">85%</span>
                    </div>
                    <input type="range" id="mob-setting-opacity" min="30" max="100" step="5" value="85" class="mob-slider">
                </div>

                <!-- 3. Left-Handed Layout -->
                <div class="mob-setting-group">
                    <div class="mob-setting-row">
                        <div>
                            <label class="mob-setting-label" for="mob-setting-lefthanded">LEFT-HANDED LAYOUT</label>
                            <div class="mob-setting-sub">Swaps joystick to right and action cluster to left</div>
                        </div>
                        <label class="mob-switch">
                            <input type="checkbox" id="mob-setting-lefthanded">
                            <span class="mob-switch-slider"></span>
                        </label>
                    </div>
                </div>

                <!-- 4. Camera Sensitivity -->
                <div class="mob-setting-group">
                    <div class="mob-setting-row">
                        <label class="mob-setting-label" for="mob-setting-camsens">CAMERA SENSITIVITY</label>
                        <span class="mob-setting-val" id="mob-val-camsens">1.0x</span>
                    </div>
                    <input type="range" id="mob-setting-camsens" min="0.4" max="2.5" step="0.1" value="1.0" class="mob-slider">
                </div>

                <!-- 5. Vehicle Steering Mode -->
                <div class="mob-setting-group">
                    <label class="mob-setting-label">VEHICLE STEERING</label>
                    <div class="mob-segmented-control">
                        <label class="mob-seg-opt">
                            <input type="radio" name="mob-steering-mode" value="buttons" checked>
                            <span>Buttons</span>
                        </label>
                        <label class="mob-seg-opt">
                            <input type="radio" name="mob-steering-mode" value="tilt">
                            <span>Tilt (Gyro)</span>
                        </label>
                    </div>
                </div>

                <!-- 6. Haptic Feedback -->
                <div class="mob-setting-group">
                    <div class="mob-setting-row">
                        <div>
                            <label class="mob-setting-label" for="mob-setting-haptics">HAPTIC FEEDBACK</label>
                            <div class="mob-setting-sub">Vibrate on button taps and impacts</div>
                        </div>
                        <label class="mob-switch">
                            <input type="checkbox" id="mob-setting-haptics" checked>
                            <span class="mob-switch-slider"></span>
                        </label>
                    </div>
                </div>

                <!-- 7. Custom Drag Layout Mode -->
                <div class="mob-setting-group hud-layout-action-group">
                    <button class="mob-btn-action" id="mob-btn-edit-layout">
                        <span>🛠️</span>
                        <strong>EDIT HUD LAYOUT (DRAG MODE)</strong>
                    </button>
                    <button class="mob-btn-secondary" id="mob-btn-reset-layout">
                        <span>↺</span>
                        <span>Reset Default Layout</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(sheet);

    // Event listeners
    document.getElementById('mob-sheet-close-btn')?.addEventListener('click', closeMobileSettings);
    document.getElementById('mob-sheet-backdrop')?.addEventListener('click', closeMobileSettings);

    // Button size changes
    sheet.querySelectorAll('input[name="mob-btn-size"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            setMobileSetting('buttonSize', e.target.value);
            triggerHaptic(10);
        });
    });

    // Opacity changes
    const opacitySlider = document.getElementById('mob-setting-opacity');
    opacitySlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        document.getElementById('mob-val-opacity').textContent = `${val}%`;
        setMobileSetting('opacity', val);
    });

    // Left-handed toggle
    const leftHandedToggle = document.getElementById('mob-setting-lefthanded');
    leftHandedToggle?.addEventListener('change', (e) => {
        setMobileSetting('leftHanded', e.target.checked);
        triggerHaptic(15);
    });

    // Cam sensitivity changes
    const camSlider = document.getElementById('mob-setting-camsens');
    camSlider?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('mob-val-camsens').textContent = `${val.toFixed(1)}x`;
        setMobileSetting('cameraSensitivity', val);
    });

    // Steering mode
    sheet.querySelectorAll('input[name="mob-steering-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            setMobileSetting('steeringMode', e.target.value);
            triggerHaptic(10);
        });
    });

    // Haptics toggle
    const hapticsToggle = document.getElementById('mob-setting-haptics');
    hapticsToggle?.addEventListener('change', (e) => {
        setMobileSetting('haptics', e.target.checked);
        if (e.target.checked) triggerHaptic(20);
    });

    // Edit Layout Button
    document.getElementById('mob-btn-edit-layout')?.addEventListener('click', () => {
        enterEditLayoutMode();
    });

    // Reset Layout Button
    document.getElementById('mob-btn-reset-layout')?.addEventListener('click', () => {
        resetHUDLayout();
        triggerHaptic(20);
    });
}

/**
 * Initialize Mobile Settings subsystem
 */
export function initMobileSettings() {
    loadMobileSettings();
    applyMobileSettings();
    buildSettingsSheetDOM();

    // Hook settings button if present in DOM
    const btnSettings = document.getElementById('btn-mobile-settings');
    if (btnSettings) {
        btnSettings.addEventListener('click', toggleMobileSettings);
    }

    // Expose global API
    if (typeof window !== 'undefined') {
        window.openMobileSettings = openMobileSettings;
        window.closeMobileSettings = closeMobileSettings;
        window.setMobileSetting = setMobileSetting;
        window.getMobileSetting = getMobileSetting;
        window.mobileSettings = {
            get: getMobileSetting,
            getAll: getMobileSettings,
            set: setMobileSetting,
            open: openMobileSettings,
            close: closeMobileSettings,
            toggle: toggleMobileSettings,
            haptic: triggerHaptic,
            enterEditLayout: enterEditLayoutMode,
            resetLayout: resetHUDLayout
        };
    }

    return currentSettings;
}
