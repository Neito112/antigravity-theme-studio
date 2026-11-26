'use strict';

/**
 * Asks the Antigravity CLI (`agy -p`, using the user's own Antigravity quota/login)
 * to look at a reference image and design a full theme preset, the same way the
 * antigravity-custom-theme skill does by hand. No API key needed.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { generatePetSprite, buildFallbackResult, FALLBACK_SPRITE_URL } = require('./pet_generator');

const ROOT_DIR = path.resolve(__dirname, '..');
const THEMES_JSON = path.join(ROOT_DIR, 'themes', 'themes.json');
const USER_MEDIA_DIR = path.join(ROOT_DIR, 'themes', 'user_media');
const DEFAULT_SIGIL_SVG_INNER = '<path d="M12 2.5L14.8 9.2L21.5 12L14.8 14.8L12 21.5L9.2 14.8L2.5 12L9.2 9.2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/><path d="M12 6.5L16.5 12L12 17.5L7.5 12Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" fill="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.1" stroke-dasharray="3 4" fill="none"/>';

const TARGET_W = 3840;
const TARGET_H = 2160;
const TARGET_ASPECT = 16 / 9;

const STR = { type: 'string' };
const BOOL = { type: 'boolean' };
const NUM = { type: 'number' };

const FONT_VIBES = ['sans', 'mono', 'serif', 'display'];
const BORDER_STYLES = ['solid', 'double', 'dashed', 'glow-frame', 'chamfered'];
const SIDEBAR_STYLES = ['floating-cards', 'sleek-rail', 'framed-panel'];
const COMPOSER_STYLES = ['floating-dock', 'command-bar', 'hud-console'];
const CHAT_CARD_LAYOUTS = ['hud-panel', 'clean-sheet', 'terminal-block', 'floating-bubble'];
const DOCK_POSITIONS = ['right-vertical', 'bottom-right', 'top-right'];
const DOCK_SHAPES = ['circle', 'hex', 'pill', 'square'];
const PARTICLE_MOTIONS = ['fall', 'rise', 'float', 'orbit', 'pulse', 'drift'];
const SOUND_WAVEFORMS = ['sine', 'triangle', 'sawtooth', 'square'];

const VFX_SURFACE_MODES = ['smoked-glass', 'matte-tint', 'rail-accent'];
const VFX_DENSITIES = ['compact', 'balanced', 'spacious'];
const VFX_BORDER_HAIRLINES = ['subtle', 'accent-left', 'none'];
const VFX_CARD_STYLES = ['glass-card', 'editorial-sheet', 'hud-hairline'];
const VFX_TYPOGRAPHY_VIBES = ['sans', 'mono', 'serif'];
const VFX_CONTRAST_FLOORS = ['wcag-aa-dark', 'wcag-aa-light'];
const VFX_PANEL_MODES = ['unified-glass', 'clean-slate', 'split-accent'];
const VFX_SASH_GLOWS = ['subtle', 'crisp', 'none'];
const VFX_TAB_INDICATORS = ['underline', 'pill', 'dot'];
const VFX_MOTION_BUDGETS = ['calm', 'atmospheric', 'kinetic'];
const PET_STYLES = ['pixel', 'plush', 'sticker', 'vector'];

const ARCHETYPE_DEFAULTS = {
    'rpg-fantasy': {
        archetypeLabel: 'RPG Fantasy',
        particleStyle: 'crystals',
        hudRingStyle: 'magic-circle',
        soundProfile: 'crystalline',
        introTitle: 'CARDINAL SYSTEM // LINK START',
        introSubtitle: 'AETHERIC SYNC 100%',
        introChecks: ['VISUAL', 'AUDIO', 'AETHER', 'SYNC'],
        voiceWelcome: 'Link start. Welcome back, adventurer.',
        voiceSwitch: 'Realm synchronized.',
        uiDesign: {
            fontVibe: 'serif', cardRadiusPx: 12, borderStyle: 'double', accentGlowIntensity: 0.75,
            layoutPreset: 'floating-hud', sidebarStyle: 'floating-cards', composerStyle: 'hud-console',
            chatCardLayout: 'hud-panel', dockPosition: 'right-vertical', dockShape: 'hex',
            hudWidget: { badge: 'LVL 99', title: 'CARDINAL ONLINE', subtitle: 'AINCRAD SECTOR', statusText: 'SYNC 100%' },
            topBarPillText: 'CARDINAL // SYSTEM LOG'
        },
        particleShape: 'crystal-shard',
        particleMotion: 'float',
        particleCount: 12,
        soundSynth: { waveform: 'triangle', notes: [523.25, 659.25, 783.99, 1046.5], noteStepMs: 80, decayMs: 280 },
        voicePitch: 1.0,
        voiceRate: 0.98
    },
    'anime-celestial': {
        archetypeLabel: 'Anime Celestial',
        particleStyle: 'petals',
        hudRingStyle: 'orbital-halo',
        soundProfile: 'crystalline',
        introTitle: 'STARLIGHT NEXUS // AWAKEN',
        introSubtitle: 'CELESTIAL RESONANCE ACTIVE',
        introChecks: ['STARLIGHT', 'RESONANCE', 'AURA', 'READY'],
        voiceWelcome: 'Celestial nexus online. Welcome back.',
        voiceSwitch: 'Starlight aligned.',
        uiDesign: {
            fontVibe: 'display', cardRadiusPx: 16, borderStyle: 'glow-frame', accentGlowIntensity: 0.8,
            layoutPreset: 'floating-hud', sidebarStyle: 'floating-cards', composerStyle: 'floating-dock',
            chatCardLayout: 'floating-bubble', dockPosition: 'top-right', dockShape: 'circle',
            hudWidget: { badge: 'AURA MAX', title: 'STARLIGHT NEXUS', subtitle: 'CELESTIAL REALM', statusText: 'RESONANCE ON' },
            topBarPillText: 'STARLIGHT // CELESTIAL FEED'
        },
        particleShape: 'sakura-petal',
        particleMotion: 'fall',
        particleCount: 14,
        soundSynth: { waveform: 'sine', notes: [587.33, 739.99, 880, 1174.66], noteStepMs: 75, decayMs: 320 },
        voicePitch: 1.08,
        voiceRate: 1.0
    },
    'cyberpunk-sci-fi': {
        archetypeLabel: 'Cyberpunk HUD',
        particleStyle: 'sparks',
        hudRingStyle: 'cyber-radar',
        soundProfile: 'synth-chime',
        introTitle: 'NEURAL LINK // ONLINE',
        introSubtitle: 'BIOMETRIC SYNC 100%',
        introChecks: ['UPLINK', 'OPTICS', 'CIPHER', 'SYNC'],
        voiceWelcome: 'Neural interface online. Welcome back.',
        voiceSwitch: 'Uplink synchronized.',
        uiDesign: {
            fontVibe: 'mono', cardRadiusPx: 6, borderStyle: 'chamfered', accentGlowIntensity: 0.9,
            layoutPreset: 'orbital-dock', sidebarStyle: 'framed-panel', composerStyle: 'hud-console',
            chatCardLayout: 'terminal-block', dockPosition: 'right-vertical', dockShape: 'hex',
            hudWidget: { badge: 'NETRUN', title: 'NEURAL UPLINK', subtitle: 'NIGHT SECTOR 07', statusText: 'CIPHER LOCK' },
            topBarPillText: 'NEURAL // UPLINK STREAM'
        },
        particleShape: 'data-spark',
        particleMotion: 'rise',
        particleCount: 14,
        soundSynth: { waveform: 'sawtooth', notes: [329.63, 440, 659.25, 880], noteStepMs: 55, decayMs: 180 },
        voicePitch: 0.95,
        voiceRate: 1.06
    },
    'kaiju-mecha': {
        archetypeLabel: 'Kaiju Mecha',
        particleStyle: 'embers',
        hudRingStyle: 'cyber-radar',
        soundProfile: 'power-chord',
        introTitle: 'TITAN CORE // IGNITION',
        introSubtitle: 'REACTOR OUTPUT NOMINAL',
        introChecks: ['REACTOR', 'ARMOR', 'THRUST', 'LOCKED'],
        voiceWelcome: 'Reactor online. All systems nominal.',
        voiceSwitch: 'Core engaged.',
        uiDesign: {
            fontVibe: 'mono', cardRadiusPx: 4, borderStyle: 'chamfered', accentGlowIntensity: 0.95,
            layoutPreset: 'arcade-frame', sidebarStyle: 'framed-panel', composerStyle: 'hud-console',
            chatCardLayout: 'hud-panel', dockPosition: 'right-vertical', dockShape: 'square',
            hudWidget: { badge: 'CORE 99%', title: 'TITAN REACTOR', subtitle: 'HANGAR BAY 01', statusText: 'OUTPUT NOMINAL' },
            topBarPillText: 'TITAN // REACTOR TELEMETRY'
        },
        particleShape: 'reactor-ember',
        particleMotion: 'rise',
        particleCount: 15,
        soundSynth: { waveform: 'sawtooth', notes: [196, 293.66, 392, 587.33], noteStepMs: 65, decayMs: 260 },
        voicePitch: 0.85,
        voiceRate: 0.95
    },
    'minimal-office': {
        archetypeLabel: 'Minimal Office',
        particleStyle: 'grid-dots',
        hudRingStyle: 'minimal-arc',
        soundProfile: 'warm-bell',
        introTitle: 'FOCUS WORKSPACE // ONLINE',
        introSubtitle: 'AMBIENT DESK READY',
        introChecks: ['LAYOUT', 'FOCUS', 'AUDIO', 'READY'],
        voiceWelcome: 'Workspace ready. Have a focused session.',
        voiceSwitch: 'Workspace updated.',
        uiDesign: {
            fontVibe: 'sans', cardRadiusPx: 12, borderStyle: 'solid', accentGlowIntensity: 0.35,
            layoutPreset: 'minimal-rail', sidebarStyle: 'sleek-rail', composerStyle: 'command-bar',
            chatCardLayout: 'clean-sheet', dockPosition: 'bottom-right', dockShape: 'pill',
            hudWidget: { badge: 'DEEP WORK', title: 'FOCUS DESK', subtitle: 'AMBIENT OFFICE', statusText: 'FLOW READY' },
            topBarPillText: 'STUDIO // FOCUS SESSION'
        },
        particleShape: 'soft-dot',
        particleMotion: 'drift',
        particleCount: 8,
        soundSynth: { waveform: 'sine', notes: [392, 493.88, 587.33], noteStepMs: 110, decayMs: 360 },
        voicePitch: 1.0,
        voiceRate: 0.96
    },
    'nature-zen': {
        archetypeLabel: 'Nature Zen',
        particleStyle: 'leaves',
        hudRingStyle: 'minimal-arc',
        soundProfile: 'warm-bell',
        introTitle: 'SANCTUARY // BREATHE',
        introSubtitle: 'SERENE AMBIENCE ACTIVE',
        introChecks: ['FLORA', 'BREEZE', 'CHIME', 'CALM'],
        voiceWelcome: 'Sanctuary open. Breathe and begin.',
        voiceSwitch: 'Ambience shifted.',
        uiDesign: {
            fontVibe: 'serif', cardRadiusPx: 18, borderStyle: 'solid', accentGlowIntensity: 0.45,
            layoutPreset: 'editorial-glass', sidebarStyle: 'floating-cards', composerStyle: 'floating-dock',
            chatCardLayout: 'floating-bubble', dockPosition: 'bottom-right', dockShape: 'pill',
            hudWidget: { badge: 'ZEN MODE', title: 'SANCTUARY', subtitle: 'SERENE AMBIENCE', statusText: 'BREATHE 100%' },
            topBarPillText: 'SANCTUARY // AMBIENT LOG'
        },
        particleShape: 'leaf',
        particleMotion: 'drift',
        particleCount: 10,
        soundSynth: { waveform: 'triangle', notes: [349.23, 440, 523.25, 698.46], noteStepMs: 120, decayMs: 420 },
        voicePitch: 0.96,
        voiceRate: 0.9
    },
    'retro-arcade': {
        archetypeLabel: 'Retro Arcade',
        particleStyle: 'grid-dots',
        hudRingStyle: 'pixel-frame',
        soundProfile: 'retro-blip',
        introTitle: 'ARCADE OS // INSERT COIN',
        introSubtitle: 'PLAYER 1 READY',
        introChecks: ['VRAM', 'CHIPTUNE', 'STAGE', 'START'],
        voiceWelcome: 'Player one ready. Let us begin.',
        voiceSwitch: 'Stage selected.',
        uiDesign: {
            fontVibe: 'mono', cardRadiusPx: 4, borderStyle: 'dashed', accentGlowIntensity: 0.85,
            layoutPreset: 'arcade-frame', sidebarStyle: 'framed-panel', composerStyle: 'command-bar',
            chatCardLayout: 'terminal-block', dockPosition: 'top-right', dockShape: 'square',
            hudWidget: { badge: '1UP READY', title: 'ARCADE OS', subtitle: 'STAGE 01-A', statusText: 'HIGH SCORE' },
            topBarPillText: 'ARCADE // PLAYER 1 ACTIVE'
        },
        particleShape: 'pixel-block',
        particleMotion: 'pulse',
        particleCount: 12,
        soundSynth: { waveform: 'square', notes: [440, 554.37, 659.25, 880], noteStepMs: 50, decayMs: 140 },
        voicePitch: 1.1,
        voiceRate: 1.08
    },
    'cosmic-arcane': {
        archetypeLabel: 'Cosmic Arcane',
        particleStyle: 'stars',
        hudRingStyle: 'orbital-halo',
        soundProfile: 'crystalline',
        introTitle: 'ASTRAL OBSERVATORY // ACTIVE',
        introSubtitle: 'ORBITAL TELEMETRY LOCKED',
        introChecks: ['ORBIT', 'AETHER', 'TELEMETRY', 'SYNC'],
        voiceWelcome: 'Astral observatory online. Welcome back.',
        voiceSwitch: 'Orbit locked.',
        uiDesign: {
            fontVibe: 'display', cardRadiusPx: 14, borderStyle: 'glow-frame', accentGlowIntensity: 0.78,
            layoutPreset: 'orbital-dock', sidebarStyle: 'framed-panel', composerStyle: 'hud-console',
            chatCardLayout: 'hud-panel', dockPosition: 'right-vertical', dockShape: 'hex',
            hudWidget: { badge: 'ORBIT 01', title: 'ASTRAL NEXUS', subtitle: 'DEEP SPACE', statusText: 'TELEMETRY ON' },
            topBarPillText: 'OBSERVATORY // ORBITAL LOG'
        },
        particleShape: 'starlight',
        particleMotion: 'orbit',
        particleCount: 12,
        soundSynth: { waveform: 'sine', notes: [440, 523.25, 659.25, 987.77], noteStepMs: 90, decayMs: 340 },
        voicePitch: 1.0,
        voiceRate: 0.96
    }
};

const HUD_WIDGET_SCHEMA = {
    type: 'object',
    properties: {
        badge: STR,
        title: STR,
        subtitle: STR,
        statusText: STR
    },
    required: ['badge', 'title', 'subtitle', 'statusText']
};

const UI_DESIGN_SCHEMA = {
    type: 'object',
    properties: {
        fontVibe: { type: 'string', enum: FONT_VIBES },
        cardRadiusPx: NUM,
        borderStyle: { type: 'string', enum: BORDER_STYLES },
        accentGlowIntensity: NUM,
        layoutPreset: STR,
        sidebarStyle: { type: 'string', enum: SIDEBAR_STYLES },
        composerStyle: { type: 'string', enum: COMPOSER_STYLES },
        chatCardLayout: { type: 'string', enum: CHAT_CARD_LAYOUTS },
        dockPosition: { type: 'string', enum: DOCK_POSITIONS },
        dockShape: { type: 'string', enum: DOCK_SHAPES },
        hudWidget: HUD_WIDGET_SCHEMA,
        topBarPillText: STR
    },
    required: [
        'fontVibe', 'cardRadiusPx', 'borderStyle', 'accentGlowIntensity',
        'layoutPreset', 'sidebarStyle', 'composerStyle', 'chatCardLayout',
        'dockPosition', 'dockShape', 'hudWidget', 'topBarPillText'
    ]
};

const SOUND_SYNTH_SCHEMA = {
    type: 'object',
    properties: {
        waveform: { type: 'string', enum: SOUND_WAVEFORMS },
        notes: { type: 'array', items: NUM },
        noteStepMs: NUM,
        decayMs: NUM
    },
    required: ['waveform', 'notes', 'noteStepMs', 'decayMs']
};

const DYNAMIC_PACK_SCHEMA = {
    type: 'object',
    properties: {
        archetype: STR,
        archetypeLabel: STR,
        particleStyle: STR,
        hudRingStyle: STR,
        soundProfile: STR,
        introTitle: STR,
        introSubtitle: STR,
        introChecks: { type: 'array', items: STR },
        voiceWelcome: STR,
        voiceSwitch: STR,
        uiDesign: UI_DESIGN_SCHEMA,
        particleShape: STR,
        particleSvgInner: STR,
        particleMotion: { type: 'string', enum: PARTICLE_MOTIONS },
        particleCount: NUM,
        hudSvgInner: STR,
        soundSynth: SOUND_SYNTH_SCHEMA,
        voicePitch: NUM,
        voiceRate: NUM
    },
    required: [
        'archetype', 'archetypeLabel', 'particleStyle', 'hudRingStyle', 'soundProfile',
        'introTitle', 'introSubtitle', 'introChecks', 'voiceWelcome', 'voiceSwitch',
        'uiDesign', 'particleShape', 'particleMotion', 'particleCount',
        'soundSynth', 'voicePitch', 'voiceRate'
    ]
};

const VFX_SPEC_SCHEMA = {
    type: 'object',
    properties: {
        leftColumn: {
            type: 'object',
            properties: {
                surfaceMode: { type: 'string', enum: VFX_SURFACE_MODES },
                density: { type: 'string', enum: VFX_DENSITIES },
                borderHairline: { type: 'string', enum: VFX_BORDER_HAIRLINES },
                showOrnament: BOOL
            },
            required: ['surfaceMode', 'density', 'borderHairline', 'showOrnament']
        },
        centerStage: {
            type: 'object',
            properties: {
                cardStyle: { type: 'string', enum: VFX_CARD_STYLES },
                radiusPx: NUM,
                typographyVibe: { type: 'string', enum: VFX_TYPOGRAPHY_VIBES },
                contrastFloor: { type: 'string', enum: VFX_CONTRAST_FLOORS }
            },
            required: ['cardStyle', 'radiusPx', 'typographyVibe', 'contrastFloor']
        },
        rightColumn: {
            type: 'object',
            properties: {
                panelMode: { type: 'string', enum: VFX_PANEL_MODES },
                sashGlow: { type: 'string', enum: VFX_SASH_GLOWS },
                tabIndicator: { type: 'string', enum: VFX_TAB_INDICATORS }
            },
            required: ['panelMode', 'sashGlow', 'tabIndicator']
        },
        motionRules: {
            type: 'object',
            properties: {
                budget: { type: 'string', enum: VFX_MOTION_BUDGETS },
                particleCount: NUM,
                particleOpacity: { type: 'array', items: NUM }
            },
            required: ['budget', 'particleCount', 'particleOpacity']
        }
    },
    required: ['leftColumn', 'centerStage', 'rightColumn', 'motionRules']
};

const PET_DIRECTIVE_SCHEMA = {
    type: 'object',
    properties: {
        hasCharacter: BOOL,
        sourceObject: STR,
        petName: STR,
        personifiedConcept: STR,
        style: { type: 'string', enum: PET_STYLES },
        palette: { type: 'array', items: STR },
        idleMood: STR,
        prop: STR,
        signatureAction: STR,
        spritePrompt: STR,
        animationMood: STR
    },
    required: [
        'hasCharacter', 'sourceObject', 'petName', 'personifiedConcept',
        'style', 'palette', 'idleMood', 'prop', 'signatureAction',
        'spritePrompt', 'animationMood'
    ]
};

const WORK_IDENTITY_SCHEMA = {
    type: 'object',
    properties: {
        franchise: STR,
        characterName: STR,
        operator: STR,
        bootTagline: STR,
        secondary: STR,
        sigilSvgInner: STR,
        role: STR,
        badge: STR,
        tagline: STR,
        focusLabel: STR
    },
    required: [
        'franchise', 'characterName', 'operator', 'bootTagline', 'secondary', 'sigilSvgInner'
    ]
};

const BASE_PROPERTIES = {
    name: STR, concept: STR, primary: STR, secondary: STR, glow: STR, secondaryGlow: STR,
    bg: STR, frameBg: STR, textColor: STR, borderColor: STR, innerBorder: STR,
    overlayRgb: STR, bgPosition: STR,
    sidebarBg: STR, sidebarHoverBg: STR, sidebarEnhanceText: BOOL,
    aiCardBg: STR, aiCardBorder: STR, headerBg: STR, headerBorder: STR,
    btnBg: STR, inputGlassBg: STR, inputCardBg: STR,
    modalBg: STR, modalHeaderBg: STR, cardBg: STR, cardSelectedBg: STR,
    isLight: BOOL, uiTextColor: STR, uiMutedColor: STR,
    pillBg: STR, pillHoverBg: STR, pillTextColor: STR, pillBorder: STR,
    stickerW: NUM, stickerH: NUM, stickerTop: NUM, stickerRight: NUM,
    cornerSvgMarkup: STR, stickerSvgMarkup: STR,
    workIdentity: WORK_IDENTITY_SCHEMA,
    dynamicPack: DYNAMIC_PACK_SCHEMA,
    vfxSpec: VFX_SPEC_SCHEMA,
    petDirective: PET_DIRECTIVE_SCHEMA,
    generatedImagePath: STR
};

const BASE_REQUIRED = [
    'name', 'concept', 'primary', 'secondary', 'glow', 'secondaryGlow', 'bg', 'frameBg', 'textColor',
    'borderColor', 'innerBorder', 'overlayRgb', 'bgPosition', 'sidebarBg', 'sidebarHoverBg',
    'aiCardBg', 'aiCardBorder', 'headerBg', 'headerBorder', 'btnBg', 'inputGlassBg', 'inputCardBg',
    'modalBg', 'modalHeaderBg', 'cardBg', 'cardSelectedBg', 'isLight',
    'cornerSvgMarkup', 'stickerSvgMarkup', 'workIdentity', 'dynamicPack', 'vfxSpec', 'petDirective'
];

function buildSchema(needsAiPaint) {
    return {
        type: 'object',
        properties: BASE_PROPERTIES,
        required: needsAiPaint ? [...BASE_REQUIRED, 'generatedImagePath'] : BASE_REQUIRED
    };
}

const SCHEMA = buildSchema(false);

function findPython() {
    for (const cmd of process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python']) {
        const res = spawnSync(cmd, ['-c', 'import PIL; print(1)'], { windowsHide: true, encoding: 'utf8' });
        if (res.status === 0 && String(res.stdout).trim() === '1') return cmd;
    }
    return null;
}

function probeImageDimensions(filePath) {
    const py = findPython();
    if (!py) return null;
    const script = 'from PIL import Image, ImageOps; import sys, json; im=ImageOps.exif_transpose(Image.open(sys.argv[1])); print(json.dumps(im.size))';
    const res = spawnSync(py, ['-c', script, filePath], { windowsHide: true, encoding: 'utf8' });
    if (res.status !== 0) return null;
    try {
        const parsed = JSON.parse(String(res.stdout || '').trim());
        if (Array.isArray(parsed) && parsed.length === 2 && parsed[0] > 0 && parsed[1] > 0) {
            return { width: parsed[0], height: parsed[1] };
        }
    } catch (_) {}
    return null;
}

// Local palette fallback: Pillow-only, no agy / no network. Returns hex
// primary/secondary + dark overlay triplet, or null when Pillow is missing.
// Transparent pixels are composited over dark glass (10,14,24); grayscale
// images get a saturation-boosted accent instead of flat grey.
function extractPaletteViaPillow(filePath) {
    const py = findPython();
    if (!py) return null;
    const script = [
        'import json, sys, colorsys',
        'from PIL import Image, ImageOps',
        'im = ImageOps.exif_transpose(Image.open(sys.argv[1])).convert("RGBA")',
        'im.thumbnail((64, 64))',
        'px = list(im.getdata())',
        'n = max(1, len(px))',
        'ar = ag = ab = 0',
        'buckets = {}',
        'for r, g, b, a in px:',
        '    if a < 128:',
        '        ar += 10; ag += 14; ab += 24; continue',
        '    ar += r; ag += g; ab += b',
        '    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)',
        '    if s < 0.22 or v < 0.3: continue',
        '    k = int(h * 24) % 24',
        '    w = s * v * v',
        '    e = buckets.setdefault(k, [0, 0, 0, 0])',
        '    e[0] += w; e[1] += r*w; e[2] += g*w; e[3] += b*w',
        'avg = [round(ar/n), round(ag/n), round(ab/n)]',
        'ranked = sorted(buckets.items(), key=lambda kv: -kv[1][0])',
        'def hx(rgb): return "#%02x%02x%02x" % tuple(int(max(0, min(255, round(c)))) for c in rgb)',
        'def tune(rgb, smin, vmin, vmax):',
        '    h, s, v = colorsys.rgb_to_hsv(rgb[0]/255, rgb[1]/255, rgb[2]/255)',
        '    s = max(s, smin); v = min(vmax, max(v, vmin))',
        '    r, g, b = colorsys.hsv_to_rgb(h, s, v)',
        '    return [round(r*255), round(g*255), round(b*255)]',
        'if ranked:',
        '    w, r, g, b = ranked[0][1]',
        '    prim = tune([r/w, g/w, b/w], 0.45, 0.75, 0.98)',
        '    sec = None',
        '    for k, (w2, r2, g2, b2) in ranked[1:]:',
        '        d = abs(k - ranked[0][0]); d = min(d, 24-d)',
        '        if d >= 3: sec = tune([r2/w2, g2/w2, b2/w2], 0.35, 0.70, 0.96); break',
        '    if sec is None:',
        '        h, s, v = colorsys.rgb_to_hsv(prim[0]/255, prim[1]/255, prim[2]/255)',
        '        r, g, b = colorsys.hsv_to_rgb((h+35/360) % 1, s*0.8, v)',
        '        sec = [round(r*255), round(g*255), round(b*255)]',
        'else:',
        '    h, s, v = colorsys.rgb_to_hsv(avg[0]/255, avg[1]/255, avg[2]/255)',
        '    if s < 0.08: h = 210/360  # near-grey has no real hue; use slate blue, not red',
        '    r, g, b = colorsys.hsv_to_rgb(h, max(s, 0.45), min(0.98, max(v, 0.75)))',
        '    prim = [round(r*255), round(g*255), round(b*255)]',
        '    r, g, b = colorsys.hsv_to_rgb((h+40/360) % 1, max(s, 0.35), min(0.96, max(v, 0.7)))',
        '    sec = [round(r*255), round(g*255), round(b*255)]',
        'ov = [max(4, min(22, round(c*0.1))) for c in avg]',
        'print(json.dumps({"primary": hx(prim), "secondary": hx(sec), "overlayRgb": ", ".join(str(c) for c in ov)}))'
    ].join('\n');
    const res = spawnSync(py, ['-c', script, filePath], { windowsHide: true, encoding: 'utf8' });
    if (res.status !== 0) return null;
    try {
        const p = JSON.parse(String(res.stdout || '').trim());
        if (p && /^#[0-9a-f]{6}$/i.test(p.primary) && /^#[0-9a-f]{6}$/i.test(p.secondary)) return p;
    } catch (_) {}
    return null;
}

function buildLocalTheme(pal) {
    const p = pal || { primary: '#94a3b8', secondary: '#cbd5e1', overlayRgb: '7, 13, 22' };
    const theme = {
        name: 'Auto Palette',
        concept: 'Auto Palette • Local fallback, no AI',
        primary: p.primary,
        secondary: p.secondary,
        overlayRgb: p.overlayRgb,
        isLight: false
    };
    theme.dynamicPack = normalizeDynamicPack(theme);
    theme.vfxSpec = normalizeVfxSpec(theme);
    theme.petDirective = normalizePetDirective(theme);
    theme.workIdentity = normalizeWorkIdentity(theme);
    const petFb = buildFallbackResult(theme.petDirective, 'local-fallback');
    theme.petSpriteUrl = petFb.petSpriteUrl;
    theme.petId = petFb.petId;
    theme.petMeta = petFb.petMeta;
    return theme;
}

function readExemplar() {
    try {
        const all = JSON.parse(fs.readFileSync(THEMES_JSON, 'utf8'));
        const key = Object.keys(all)[0];
        const t = { ...all[key] };
        delete t.wallpaper;
        const readSvg = (rel) => {
            try { return fs.readFileSync(path.join(ROOT_DIR, 'themes', rel), 'utf8'); } catch (_) { return ''; }
        };
        t.cornerSvgMarkup = readSvg(t.cornerSvg || '');
        t.stickerSvgMarkup = readSvg(t.sticker || '');
        delete t.cornerSvg; delete t.sticker; delete t.isOrnament; delete t.clearBackdrop;
        delete t.unifiedGlass; delete t.sidebarBlur; delete t.headerBlur;
        return { name: key, theme: t };
    } catch (_) {
        return null;
    }
}

function buildPrompt(absImagePath, { srcW, srcH, needsAiPaint }) {
    const ex = readExemplar();
    let schemaDoc = '';
    try { schemaDoc = fs.readFileSync(path.join(ROOT_DIR, 'references', 'theme-schema.md'), 'utf8'); } catch (_) {}
    const sizeText = (srcW && srcH) ? `${srcW}x${srcH}` : 'unknown dimensions';
    const paintInstructions = needsAiPaint ? [
        `1. First, inspect the reference wallpaper image at "${absImagePath}" (${sizeText}) using your file-reading tool (\`read_file\`).`,
        `2. MANDATORY 16:9 WIDESCREEN GENERATIVE PAINTING ("vẽ mới / vẽ bù"): You MUST call \`invoke_subagent\` with \`TypeName: "image-generator"\` and \`Role: "4K 16:9 Wallpaper Artist"\` to paint a brand-new, seamless, ultra-sharp 16:9 widescreen (4K / 3840x2160) desktop wallpaper faithful to the subject, theme, lighting, and art style of "${absImagePath}".`,
        `   In your prompt to \`image-generator\`, include the exact reference image path "${absImagePath}" AND a vivid, detailed description of the subject, characters, pose, clothing/features, composition, color palette, lighting, and artistic style of the original image, and explicitly require:`,
        '   - DO NOT simply crop or zoom into the original image! Recompose/paint a complete 16:9 widescreen scene so the full subject/character and a newly painted, richly detailed thematic environment fill the entire 16:9 frame naturally.',
        '   - Keep the exact original subject, characters, theme, lighting, color identity, and artistic style completely intact without distorting anatomy/proportions.',
        '   - STRICTLY FORBIDDEN: NO blurred sidebars or blurred background padding, NO solid or gradient bars, NO letterbox/pillarbox borders, NO picture frames, NO split screens, NO UI elements, NO text or watermarks.',
        '   - Request 16:9 widescreen aspect ratio and crisp 4K detail.',
        '3. Wait for `image-generator` to finish, inspect the saved image path it returns to design a harmonious palette, and set `generatedImagePath` in your final JSON output to that exact absolute file path on disk.'
    ] : [
        `1. Inspect the reference wallpaper image at "${absImagePath}" (${sizeText}) using your file-reading tool (\`read_file\`).`,
        '2. Set `generatedImagePath` to "".'
    ];

    return [
        'You are a UI theme designer and art director for the Antigravity desktop app (glassmorphic wallpaper themes).',
        ...paintInstructions,
        'Do not run shell commands (`run_command`), do not edit or create workspace source files. Your ONLY final output is the JSON object matching the provided JSON schema.',
        '',
        'Design one complete, cohesive theme preset for this artwork, with the same quality and care as the hand-made reference preset below:',
        '- ALWAYS USE DARK SMOKED GLASS (`"isLight": false`) for ALL wallpapers (even bright, daytime, pastel, or colorful images — just like "Luminous Grotto") because Antigravity runs in Dark Mode with dark-mode code tokens and dark-mode UI.',
        '- Extract the real dominant and accent colors of THIS image for `primary`, `secondary`, `glow`, `secondaryGlow`, and deep darkened glass tints:',
        '  * `overlayRgb`: deep darkened hue harmonized from the image (each R, G, B channel <= 28, relative luminance < 0.08, e.g. `"6, 16, 22"`).',
        '  * `aiCardBg`: dark tinted glass with alpha >= 0.88 (e.g. `"rgba(7, 15, 24, 0.90)"`).',
        '  * `sidebarBg` and `headerBg`: dark tinted glass with alpha >= 0.64 (e.g. `"rgba(7, 15, 24, 0.66)"`).',
        '  * `inputGlassBg`: dark tinted glass with alpha >= 0.82; `pillBg`: dark tinted glass with alpha >= 0.84; `modalBg`: alpha >= 0.96.',
        '  * `uiTextColor`: `"#f8fafc"`, `uiMutedColor`: `"#cbd5e1"`, `textColor`: `"#f8fafc"`, `pillTextColor`: `"#f8fafc"`, `sidebarEnhanceText`: `true`.',
        '- The final wallpaper is 4K 16:9 (3840x2160) fitted cleanly to the workspace window; set bgPosition to "center center".',
        '- Design TWO bespoke SVG ornaments themed on what is actually in the image (subject, motifs, mood), using the palette colors: cornerSvgMarkup (viewBox 0 0 44 44, a corner flourish in the top-left, 1-3 elements) and stickerSvgMarkup (viewBox 0 0 128 38, a small decorative strip that sits above the chat composer). Raw inline SVG markup only: <svg xmlns="http://www.w3.org/2000/svg" ...>. No <script>, no event handlers, no external references, no <image>, no <foreignObject>. Use unique gradient ids.',
        '- stickerW 96, stickerH 30, stickerTop -15, stickerRight 14 unless the design needs otherwise.',
        '- name: a short evocative 2-3 word title for the preset (max 24 chars).',
        '- Colors must be valid CSS (hex or rgba()). overlayRgb is "R, G, B".',
        '- Design an open-ended, image-specific `dynamicPack` tailored to THIS image\'s exact subject, mood, atmosphere, and genre (DO NOT force it into a generic preset if it has a more fitting vibe like "lofi-rainy-cafe", "abyssal-submarine", "gothic-library", "cyberpunk-netrunner", "minimal-desk", etc.):',
        '  * `archetype`: open kebab-case genre/vibe slug (e.g. "lofi-rainy-cafe", "abyssal-submarine", "gothic-library", "cyberpunk-netrunner", "rpg-fantasy", "minimal-desk").',
        '  * `archetypeLabel`: short evocative display label (e.g. "Lofi Rainy Cafe", "Abyssal Submarine", "Gothic Library").',
        '  * `particleStyle`: open descriptive particle motif name (e.g. "raindrops", "bubbles", "dust-motes", "crystals", "petals", "embers", "sparks", "none").',
        '  * `hudRingStyle`: open descriptive HUD/ring motif name (e.g. "sonar-rings", "clockwork-gears", "coffee-steam", "magic-circle", "cyber-radar", "none").',
        '  * `soundProfile`: open descriptive audio profile name (e.g. "lofi-rhodes", "sonar-ping", "crystalline", "warm-bell", "synth-chime").',
        '  * `uiDesign`: full IDE layout & HUD composition tailored to THIS image\'s genre (RPG, anime, office, sci-fi, lofi, etc.):',
        '    - `fontVibe`: `"sans" | "mono" | "serif" | "display"`',
        '    - `cardRadiusPx`: number (`4..22`)',
        '    - `borderStyle`: `"solid" | "double" | "dashed" | "glow-frame" | "chamfered"`',
        '    - `accentGlowIntensity`: number (`0.2..1.0`)',
        '    - `layoutPreset`: open string layout name fitting the image (e.g. `"floating-hud"`, `"orbital-dock"`, `"editorial-glass"`, `"arcade-frame"`, `"minimal-rail"`, `"lofi-desk"`)',
        '    - `sidebarStyle`: `"floating-cards" | "sleek-rail" | "framed-panel"`',
        '    - `composerStyle`: `"floating-dock" | "command-bar" | "hud-console"`',
        '    - `chatCardLayout`: `"hud-panel" | "clean-sheet" | "terminal-block" | "floating-bubble"`',
        '    - `dockPosition`: `"right-vertical" | "bottom-right" | "top-right"`',
        '    - `dockShape`: `"circle" | "hex" | "pill" | "square"`',
        '    - `hudWidget`: `{ badge: string, title: string, subtitle: string, statusText: string }` (e.g. `{ badge: "LVL 99", title: "CARDINAL ONLINE", subtitle: "AINCRAD SECTOR", statusText: "SYNC 100%" }` or `{ badge: "DEEP WORK", title: "FOCUS DESK", subtitle: "AMBIENT OFFICE", statusText: "FLOW READY" }`)',
        '    - `topBarPillText`: short uppercase pill text (e.g. `"CARDINAL // SYSTEM LOG"` or `"LOFI // RAINY SESSION"`)',
        '  * `particleShape`: open shape name (e.g. "raindrop", "bubble", "maple-leaf", "rune-shard").',
        '  * `particleSvgInner`: optional custom inline SVG primitives (`<path>`, `<circle>`, `<ellipse>`, `<rect>`, `<polygon>`, `<polyline>`, `<line>`, `<g>`) designed for a `0 0 24 24` viewBox using `currentColor` (NO `<svg>` wrapper, NO `<script>`, NO `<foreignObject>`, NO `<style>`, NO `on*` attributes, NO `javascript:` URLs).',
        '  * `particleMotion`: one of `"fall"`, `"rise"`, `"float"`, `"orbit"`, `"pulse"`, `"drift"`.',
        '  * `particleCount`: integer between `6` and `18`.',
        '  * `hudSvgInner`: optional custom inline SVG primitives designed for a `0 0 200 200` viewBox tailored to the image (e.g. sonar rings, clockwork gears, coffee steam curves, rune circle, circuit traces; same strict SVG safety rules: primitives only, no `<svg>` wrapper, no `<script>`, no `<foreignObject>`, no `on*` attrs).',
        '  * `soundSynth`: `{ waveform: "sine"|"triangle"|"sawtooth"|"square", notes: [3 to 5 Hz numbers between 150 and 1600], noteStepMs: number (45..160), decayMs: number (120..500) }` — compose a 3–5 note motif fitting the image\'s mood.',
        '  * `voicePitch`: number (`0.8..1.25`).',
        '  * `voiceRate`: number (`0.85..1.15`).',
        '  * `introTitle`: short uppercase boot title matching the image (e.g. "RAINY CAFE // BREWING", "ABYSSAL SUB // SONAR LOCK").',
        '  * `introSubtitle`: short uppercase status line (e.g. "LOFI AMBIENCE 100%", "DEPTH 4200M NOMINAL").',
        '  * `introChecks`: array of 3-4 short uppercase check labels (e.g. ["ESPRESSO", "RAIN", "VINYL", "WARMTH"]).',
        '  * `voiceWelcome`: short 4-8 word English spoken greeting matching the theme (e.g. "Rain on the glass. Welcome back.").',
        '  * `voiceSwitch`: short 2-5 word English spoken confirmation (e.g. "Ambience tuned.").',
        '- Design `vfxSpec` (matching `skills/ui-vfx-director/SKILL.md` — clean 1px hairline borders, NO thick double/dashed clutter, ZERO live backdrop-filter blur, ZERO `:has()`):',
        '  * `leftColumn`: `{ surfaceMode: "smoked-glass"|"matte-tint"|"rail-accent", density: "compact"|"balanced"|"spacious", borderHairline: "subtle"|"accent-left"|"none", showOrnament: boolean }`',
        '  * `centerStage`: `{ cardStyle: "glass-card"|"editorial-sheet"|"hud-hairline", radiusPx: number (8..16), typographyVibe: "sans"|"mono"|"serif", contrastFloor: "wcag-aa-dark"|"wcag-aa-light" }`',
        '  * `rightColumn`: `{ panelMode: "unified-glass"|"clean-slate"|"split-accent", sashGlow: "subtle"|"crisp"|"none", tabIndicator: "underline"|"pill"|"dot" }`',
        '  * `motionRules`: `{ budget: "calm"|"atmospheric"|"kinetic", particleCount: number (0 for calm, 6..8 for atmospheric/kinetic), particleOpacity: [min, max] within [0.22, 0.42] }`',
        '- Design `workIdentity` so the 1-click Boot Intro (`boot.js`) and IDE top-left brand emblem replace the default Antigravity logo with one bespoke identity derived from THIS image:',
        '  * `franchise`: short evocative work/world/theme title matching the image (e.g. "SAO // AINCRAD", "STARLIGHT CONCERTO", "RAINY CAFE") — NEVER "ANTIGRAVITY".',
        '  * `characterName`: main character name or personified object/subject title visible in the image (e.g. "Asuna", "Violinist", "Mocha Spirit").',
        '  * `operator`: short operator callsign/role fitting the image (e.g. "SWORDSMAN", "MAESTRO", "BARISTA", "SENSEI").',
        '  * `bootTagline`: concise evocative 4-10 word boot tagline for this artwork.',
        '  * `secondary`: valid CSS hex color harmonized with the theme\'s `secondary` accent.',
        '  * `sigilSvgInner`: MANDATORY bespoke brand logo/emblem used in BOTH the Boot HUD (Splash, Morph stroke-trace + gradient fill, Welcome) AND the IDE top-left corner logo. Output 3 to 7 distinct, crisp, iconic vector primitives (`<path>`, `<circle>`, `<ellipse>`, `<rect>`, `<polygon>`, `<polyline>`, `<line>`, `<g>`) crafted specifically for `viewBox="0 0 24 24"` (coordinates padded within 2..22) depicting the signature crest, silhouette, or iconic motif of THIS image. STRICTLY FORBIDDEN: a single plain circle/square or generic placeholder! Use `stroke="currentColor"` `stroke-width="1.4"`–`"1.7"` `stroke-linecap="round"` `stroke-linejoin="round"` `fill="none"` (plus at most 1–2 small focal dots/gems with `fill="currentColor"` `stroke="none"`), NO `<svg>` wrapper, NO `<script>`, NO `<image>`, NO `<foreignObject>`, NO `<style>`, NO `on*` handlers, NO `javascript:` or external references.',
        '- Design `petDirective` for the synchronized `Neito112/desktop-agent_pet` v2 8x11 companion:',
        '  * If the input image depicts a character or creature: set `hasCharacter: true`, `sourceObject: ""`, and write `spritePrompt` describing that character adapted into a crisp 8x11 pixel/chibi mascot atlas (silhouette, hair/ears/horns, outfit colors, signature prop).',
        '  * If the input image has NO character (scenery, cafe, mecha, architecture, abstract): set `hasCharacter: false`, identify 1 iconic main object (`sourceObject`, e.g. "steaming ceramic espresso cup"), personify it (`personifiedConcept`, e.g. "Tiny Cozy Latte Spirit with a whipped-cream beret and warm amber eyes"), and write `spritePrompt` describing that mascot in a crisp 8x11 pixel/chibi atlas.',
        '  * Include `petName` (1-2 words), `style` ("pixel"|"plush"|"sticker"|"vector"), `palette` (3-4 hex colors), `idleMood`, `prop` (consistent across all 11 rows), `signatureAction`, and `animationMood`.',
        '',
        'Theme schema reference:',
        schemaDoc,
        '',
        ex ? `Hand-made reference preset "${ex.name}" (for the same black-sun/orbit wallpaper). Match its level of polish, not its colors:` : '',
        ex ? JSON.stringify(ex.theme, null, 2) : ''
    ].join('\n');
}

function findAgy() {
    if (process.env.AGY_BIN && fs.existsSync(process.env.AGY_BIN)) return process.env.AGY_BIN;
    const candidates = [];
    if (process.platform === 'win32') {
        const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        candidates.push(path.join(local, 'agy', 'bin', 'agy.exe'));
    } else {
        candidates.push(path.join(os.homedir(), '.local', 'bin', 'agy'), '/usr/local/bin/agy', '/opt/homebrew/bin/agy');
    }
    for (const c of candidates) if (fs.existsSync(c)) return c;
    return 'agy'; // fall back to PATH
}

function cleanCandidatePath(rawPath, jobDir) {
    if (typeof rawPath !== 'string') return '';
    let s = rawPath.trim().replace(/^["']+|["']+$/g, '');
    if (!s) return '';
    if (/^file:\/\//i.test(s)) {
        try {
            const u = new URL(s);
            s = decodeURIComponent(u.pathname || '');
            if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(s)) s = s.slice(1);
        } catch (_) {
            s = s.replace(/^file:\/\/\/?/i, '');
        }
    }
    if (!path.isAbsolute(s)) s = path.resolve(jobDir, s);
    return s;
}

function resolveGeneratedImagePath(theme, envResponse, jobDir, imageFile) {
    const candidates = [];
    if (theme && typeof theme.generatedImagePath === 'string' && theme.generatedImagePath.trim()) {
        candidates.push(cleanCandidatePath(theme.generatedImagePath, jobDir));
    }
    try {
        const files = fs.readdirSync(jobDir);
        for (const f of files) {
            if (f !== imageFile && /\.(png|webp|jpe?g)$/i.test(f)) {
                candidates.push(path.join(jobDir, f));
            }
        }
    } catch (_) {}
    if (typeof envResponse === 'string') {
        const re = /(?:file:\/\/\/)?(?:[A-Za-z]:[\\/][^\s"'`<>|]+?\.(?:png|webp|jpe?g)|\/[^\s"'`<>|]+?\.(?:png|webp|jpe?g))/gi;
        const matches = envResponse.match(re) || [];
        for (const m of matches) {
            const cleaned = cleanCandidatePath(m, jobDir);
            if (path.basename(cleaned) !== imageFile) candidates.push(cleaned);
        }
    }
    for (const c of candidates) {
        try {
            if (c && fs.existsSync(c) && fs.statSync(c).isFile()) return c;
        } catch (_) {}
    }
    return '';
}

function normalizeTo4k16x9Webp(inputPath, outWebpPath, expectWidescreen) {
    const py = findPython();
    if (py) {
        const script = [
            'import json, sys',
            'from PIL import Image, ImageOps, ImageFilter',
            'in_path, out_path, expect_wide = sys.argv[1], sys.argv[2], sys.argv[3] == "1"',
            'im = ImageOps.exif_transpose(Image.open(in_path))',
            'if im.mode != "RGB": im = im.convert("RGB")',
            'w, h = im.size',
            'if expect_wide and (w / float(max(1, h))) < 1.45:',
            '    raise RuntimeError(f"Generated image is not widescreen ({w}x{h})")',
            'target_w, target_h = 3840, 2160',
            'target_ar = target_w / float(target_h)',
            'cur_ar = w / float(max(1, h))',
            'if cur_ar > target_ar:',
            '    crop_w = max(1, int(round(h * target_ar)))',
            '    left = max(0, (w - crop_w) // 2)',
            '    im = im.crop((left, 0, left + crop_w, h))',
            'elif cur_ar < target_ar:',
            '    crop_h = max(1, int(round(w / target_ar)))',
            '    top = max(0, (h - crop_h) // 2)',
            '    im = im.crop((0, top, w, top + crop_h))',
            'cw, ch = im.size',
            'resample = getattr(getattr(Image, "Resampling", Image), "LANCZOS")',
            'if cw != target_w or ch != target_h:',
            '    im = im.resize((target_w, target_h), resample)',
            'if cw < target_w or ch < target_h:',
            '    im = im.filter(ImageFilter.UnsharpMask(radius=1.15, percent=68, threshold=3))',
            'im.save(out_path, format="WEBP", quality=90, method=4)',
            'print(json.dumps({"srcW": w, "srcH": h, "width": target_w, "height": target_h}))'
        ].join('\n');
        const res = spawnSync(py, ['-c', script, inputPath, outWebpPath, expectWidescreen ? '1' : '0'], {
            windowsHide: true,
            encoding: 'utf8'
        });
        if (res.status === 0 && fs.existsSync(outWebpPath)) {
            const raw = fs.readFileSync(outWebpPath);
            return `data:image/webp;base64,${raw.toString('base64')}`;
        }
        const errMsg = String(res.stderr || res.stdout || '').trim();
        if (expectWidescreen && errMsg.includes('not widescreen')) {
            throw new Error(errMsg.split(/\r?\n/).pop());
        }
    }

    const ext = path.extname(inputPath).toLowerCase();
    const mime = ext === '.webp' ? 'image/webp' : (ext === '.png' ? 'image/png' : 'image/jpeg');
    return `data:${mime};base64,${fs.readFileSync(inputPath).toString('base64')}`;
}

const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * @param {string} dataUrl  data:image/...;base64,... (original uncropped reference image)
 * @param {{timeoutMs?: number, log?: Function, width?: number, height?: number}} opts
 * @returns {Promise<{theme: object, wallpaperDataUrl: string, wpMeta: {width: number, height: number, aiOutpainted: boolean}}>}
 */
const ARCHETYPE_KEYWORDS = [
    ['kaiju-mecha', /\b(kaiju|mecha|gundam|evangelion|titan|reactor|mech|armor|pacific)\b/i],
    ['rpg-fantasy', /\b(rpg|fantasy|sword|sao|aincrad|cardinal|dungeon|knight|magic|dragon|blade|guild|wizard)\b/i],
    ['cyberpunk-sci-fi', /\b(cyber|neon|sci-?fi|hud|matrix|neural|synth|blade\s*runner|hacker|city|future|chrome)\b/i],
    ['retro-arcade', /\b(retro|arcade|pixel|8-?bit|16-?bit|vaporwave|crt|gameboy|synthwave|chiptune)\b/i],
    ['nature-zen', /\b(nature|zen|forest|grotto|flora|leaf|leaves|sakura|garden|mountain|ocean|bamboo|botanical)\b/i],
    ['minimal-office', /\b(minimal|office|desk|studio|obsidian|clean|mono|workspace|nord|slate|focus)\b/i],
    ['anime-celestial', /\b(anime|wlop|violin|concerto|manga|celestial|idol|petal|shrine|sky)\b/i],
    ['cosmic-arcane', /\b(cosmic|eclipse|orbit|astral|nebula|galaxy|black\s*sun|starlight|arcane|void|space)\b/i]
];

function sanitizeSvgFragment(raw, maxLen = 2400) {
    if (typeof raw !== 'string') return '';
    let s = raw.trim();
    if (!s) return '';
    s = s.replace(/<!--[\s\S]*?-->/g, '');
    s = s.replace(/<\s*(script|foreignObject|style|iframe|object|embed|image|use)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    s = s.replace(/<\s*(script|foreignObject|style|iframe|object|embed|image|use)\b[^>]*\/?\s*>/gi, '');
    const ALLOWED_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'g']);
    s = s.replace(/<\s*(\/?)\s*([a-zA-Z0-9:-]+)([^>]*)>/g, (_match, slash, tag, attrs) => {
        const lower = tag.toLowerCase();
        if (!ALLOWED_TAGS.has(lower)) return '';
        if (slash) return `</${lower}>`;
        const cleanAttrs = attrs
            .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/\s+(?:xlink:)?href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/\s+src\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/javascript\s*:|data\s*:|url\s*\(/gi, '');
        return `<${lower}${cleanAttrs}>`;
    });
    return s.trim().slice(0, maxLen);
}

function clampNum(val, min, max, fallback, round = false) {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    const clamped = Math.min(max, Math.max(min, n));
    return round ? Math.round(clamped) : Number(clamped.toFixed(3));
}

function titleCaseSlug(slug) {
    return String(slug || '')
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .slice(0, 36);
}

function inferArchetype(theme) {
    const raw = theme && theme.dynamicPack && typeof theme.dynamicPack.archetype === 'string'
        ? theme.dynamicPack.archetype.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '')
        : '';
    if (raw) return raw.slice(0, 48);
    const text = `${(theme && theme.name) || ''} ${(theme && theme.concept) || ''}`;
    for (const [arch, re] of ARCHETYPE_KEYWORDS) {
        if (re.test(text)) return arch;
    }
    const primary = String((theme && theme.primary) || '').toLowerCase();
    if (/^#(f9|ef|ea|dc|fb|f5)/.test(primary)) return 'kaiju-mecha';
    if (/^#(10|22|2e|34|4a)/.test(primary)) return 'nature-zen';
    if (/^#(94|64|cb|e2)/.test(primary)) return 'minimal-office';
    return 'cosmic-arcane';
}

function inferMotion(particleStyle, fallbackMotion) {
    const s = String(particleStyle || '').toLowerCase();
    if (/rain|snow|petal|drop|fall/.test(s)) return 'fall';
    if (/ember|spark|bubble|steam|rise/.test(s)) return 'rise';
    if (/star|orbit|planet|ring/.test(s)) return 'orbit';
    if (/pixel|pulse|beat|glow/.test(s)) return 'pulse';
    if (/leaf|leaves|dust|dot|mist|drift/.test(s)) return 'drift';
    return fallbackMotion || 'float';
}

function normalizeDynamicPack(theme) {
    const raw = (theme && theme.dynamicPack && typeof theme.dynamicPack === 'object') ? theme.dynamicPack : {};
    const archetype = inferArchetype(theme);
    const def = ARCHETYPE_DEFAULTS[archetype] || ARCHETYPE_DEFAULTS['cosmic-arcane'];
    const pick = (val, allowed, fallback) => (typeof val === 'string' && allowed.includes(val.trim().toLowerCase()) ? val.trim().toLowerCase() : fallback);
    const str = (val, fallback, maxLen) => {
        const s = typeof val === 'string' ? val.trim() : '';
        return s ? s.slice(0, maxLen) : fallback;
    };
    const checks = Array.isArray(raw.introChecks)
        ? raw.introChecks.map((c) => String(c || '').trim().toUpperCase()).filter(Boolean).slice(0, 4)
        : [];
    const defaultLabel = ARCHETYPE_DEFAULTS[archetype] ? def.archetypeLabel : titleCaseSlug(archetype);
    const particleStyle = str(raw.particleStyle, def.particleStyle, 36);
    const rawUi = (raw.uiDesign && typeof raw.uiDesign === 'object') ? raw.uiDesign : {};
    const rawHud = (rawUi.hudWidget && typeof rawUi.hudWidget === 'object') ? rawUi.hudWidget : {};
    const defUi = def.uiDesign;
    const themeTitleUpper = (theme && typeof theme.name === 'string' && theme.name.trim())
        ? theme.name.trim().toUpperCase().slice(0, 28)
        : '';
    const isUnknownArch = !ARCHETYPE_DEFAULTS[archetype];
    const fallbackTitle = (isUnknownArch && themeTitleUpper) ? themeTitleUpper : defUi.hudWidget.title;
    const fallbackPill = (isUnknownArch && themeTitleUpper) ? `${themeTitleUpper} // LIVE` : defUi.topBarPillText;
    const uiDesign = {
        fontVibe: pick(rawUi.fontVibe, FONT_VIBES, defUi.fontVibe),
        cardRadiusPx: clampNum(rawUi.cardRadiusPx, 4, 22, defUi.cardRadiusPx, true),
        borderStyle: pick(rawUi.borderStyle, BORDER_STYLES, defUi.borderStyle),
        accentGlowIntensity: clampNum(rawUi.accentGlowIntensity, 0.2, 1.0, defUi.accentGlowIntensity),
        layoutPreset: str(rawUi.layoutPreset, defUi.layoutPreset, 36).toLowerCase(),
        sidebarStyle: pick(rawUi.sidebarStyle, SIDEBAR_STYLES, defUi.sidebarStyle),
        composerStyle: pick(rawUi.composerStyle, COMPOSER_STYLES, defUi.composerStyle),
        chatCardLayout: pick(rawUi.chatCardLayout, CHAT_CARD_LAYOUTS, defUi.chatCardLayout),
        dockPosition: pick(rawUi.dockPosition, DOCK_POSITIONS, defUi.dockPosition),
        dockShape: pick(rawUi.dockShape, DOCK_SHAPES, defUi.dockShape),
        hudWidget: {
            badge: str(rawHud.badge, defUi.hudWidget.badge, 20).toUpperCase(),
            title: str(rawHud.title, fallbackTitle, 32).toUpperCase(),
            subtitle: str(rawHud.subtitle, defUi.hudWidget.subtitle, 36).toUpperCase(),
            statusText: str(rawHud.statusText, defUi.hudWidget.statusText, 24).toUpperCase()
        },
        topBarPillText: str(rawUi.topBarPillText, fallbackPill, 40).toUpperCase()
    };
    const rawSynth = (raw.soundSynth && typeof raw.soundSynth === 'object') ? raw.soundSynth : {};
    const rawNotes = Array.isArray(rawSynth.notes)
        ? rawSynth.notes.map((n) => clampNum(n, 150, 1600, NaN)).filter((n) => Number.isFinite(n)).slice(0, 5)
        : [];
    const soundSynth = {
        waveform: pick(rawSynth.waveform, SOUND_WAVEFORMS, def.soundSynth.waveform),
        notes: rawNotes.length >= 3 ? rawNotes : def.soundSynth.notes.slice(),
        noteStepMs: clampNum(rawSynth.noteStepMs, 45, 160, def.soundSynth.noteStepMs, true),
        decayMs: clampNum(rawSynth.decayMs, 120, 500, def.soundSynth.decayMs, true)
    };
    const particleSvgInner = sanitizeSvgFragment(raw.particleSvgInner, 2400);
    const hudSvgInner = sanitizeSvgFragment(raw.hudSvgInner, 4000);

    return {
        archetype,
        archetypeLabel: str(raw.archetypeLabel, defaultLabel || def.archetypeLabel, 36),
        particleStyle,
        hudRingStyle: str(raw.hudRingStyle, def.hudRingStyle, 36),
        soundProfile: str(raw.soundProfile, def.soundProfile, 36),
        introTitle: str(raw.introTitle, def.introTitle, 48).toUpperCase(),
        introSubtitle: str(raw.introSubtitle, def.introSubtitle, 48).toUpperCase(),
        introChecks: checks.length >= 3 ? checks : def.introChecks.slice(),
        voiceWelcome: str(raw.voiceWelcome, def.voiceWelcome, 96),
        voiceSwitch: str(raw.voiceSwitch, def.voiceSwitch, 64),
        uiDesign,
        particleShape: str(raw.particleShape, particleStyle || def.particleShape, 36),
        particleSvgInner,
        particleMotion: pick(raw.particleMotion, PARTICLE_MOTIONS, inferMotion(particleStyle, def.particleMotion)),
        particleCount: clampNum(raw.particleCount, 6, 18, def.particleCount, true),
        hudSvgInner,
        soundSynth,
        voicePitch: clampNum(raw.voicePitch, 0.8, 1.25, def.voicePitch),
        voiceRate: clampNum(raw.voiceRate, 0.85, 1.15, def.voiceRate)
    };
}

function normalizeVfxSpec(theme) {
    const raw = (theme && theme.vfxSpec && typeof theme.vfxSpec === 'object') ? theme.vfxSpec : {};
    const pick = (val, allowed, fallback) => (typeof val === 'string' && allowed.includes(val.trim().toLowerCase()) ? val.trim().toLowerCase() : fallback);
    const lc = (raw.leftColumn && typeof raw.leftColumn === 'object') ? raw.leftColumn : {};
    const cs = (raw.centerStage && typeof raw.centerStage === 'object') ? raw.centerStage : {};
    const rc = (raw.rightColumn && typeof raw.rightColumn === 'object') ? raw.rightColumn : {};
    const mr = (raw.motionRules && typeof raw.motionRules === 'object') ? raw.motionRules : {};

    const budget = pick(mr.budget, VFX_MOTION_BUDGETS, 'atmospheric');
    const defaultCount = budget === 'calm' ? 0 : (budget === 'kinetic' ? 8 : 7);
    const particleCount = budget === 'calm' ? 0 : clampNum(mr.particleCount, 6, 8, defaultCount, true);
    const rawOp = Array.isArray(mr.particleOpacity) && mr.particleOpacity.length >= 2 ? mr.particleOpacity : [0.22, 0.38];
    const opMin = clampNum(rawOp[0], 0.15, 0.35, 0.22);
    const opMax = clampNum(rawOp[1], opMin, 0.45, 0.38);

    const dpUi = theme && theme.dynamicPack && theme.dynamicPack.uiDesign;
    const rawTypo = dpUi && VFX_TYPOGRAPHY_VIBES.includes(dpUi.fontVibe) ? dpUi.fontVibe : 'sans';

    return {
        leftColumn: {
            surfaceMode: pick(lc.surfaceMode, VFX_SURFACE_MODES, 'smoked-glass'),
            density: pick(lc.density, VFX_DENSITIES, 'balanced'),
            borderHairline: pick(lc.borderHairline, VFX_BORDER_HAIRLINES, 'subtle'),
            showOrnament: typeof lc.showOrnament === 'boolean' ? lc.showOrnament : true
        },
        centerStage: {
            cardStyle: pick(cs.cardStyle, VFX_CARD_STYLES, 'glass-card'),
            radiusPx: clampNum(cs.radiusPx, 8, 16, dpUi ? clampNum(dpUi.cardRadiusPx, 8, 16, 12, true) : 12, true),
            typographyVibe: pick(cs.typographyVibe, VFX_TYPOGRAPHY_VIBES, rawTypo),
            contrastFloor: pick(cs.contrastFloor, VFX_CONTRAST_FLOORS, theme && theme.isLight ? 'wcag-aa-light' : 'wcag-aa-dark')
        },
        rightColumn: {
            panelMode: pick(rc.panelMode, VFX_PANEL_MODES, 'unified-glass'),
            sashGlow: pick(rc.sashGlow, VFX_SASH_GLOWS, 'subtle'),
            tabIndicator: pick(rc.tabIndicator, VFX_TAB_INDICATORS, 'underline')
        },
        motionRules: {
            budget,
            particleCount,
            particleOpacity: [opMin, opMax]
        }
    };
}

function normalizePetDirective(theme) {
    const raw = (theme && theme.petDirective && typeof theme.petDirective === 'object') ? theme.petDirective : {};
    const str = (val, fallback, maxLen) => {
        const s = typeof val === 'string' ? val.trim() : '';
        return s ? s.slice(0, maxLen) : fallback;
    };
    const pick = (val, allowed, fallback) => (typeof val === 'string' && allowed.includes(val.trim().toLowerCase()) ? val.trim().toLowerCase() : fallback);
    const hasCharacter = Boolean(raw.hasCharacter);
    const sourceObject = hasCharacter ? '' : str(raw.sourceObject, 'glowing spirit crystal', 64);
    const petName = str(raw.petName, 'Rocky', 24);
    const personifiedConcept = str(
        raw.personifiedConcept,
        hasCharacter
            ? `${petName} chibi companion adapted from the wallpaper character`
            : `Tiny personified ${sourceObject} mascot with expressive eyes`,
        160
    );
    const palette = Array.isArray(raw.palette) && raw.palette.length
        ? raw.palette.filter((c) => typeof c === 'string' && c.trim()).slice(0, 4)
        : [theme && theme.primary ? theme.primary : '#7dd3fc', theme && theme.secondary ? theme.secondary : '#f472b6', '#0f172a'];
    const idleMood = str(raw.idleMood, 'calm-focus', 36);
    const prop = str(raw.prop, hasCharacter ? 'signature charm' : 'tiny halo', 48);
    const signatureAction = str(raw.signatureAction, 'cheerful wave', 64);
    const animationMood = str(raw.animationMood, idleMood, 36);
    const spritePrompt = str(
        raw.spritePrompt,
        `8x11 pixel chibi mascot sprite atlas of ${petName}: ${personifiedConcept}, holding ${prop}, ${animationMood} mood`,
        320
    );

    return {
        hasCharacter,
        sourceObject,
        petName,
        personifiedConcept,
        style: pick(raw.style, PET_STYLES, 'pixel'),
        palette,
        idleMood,
        prop,
        signatureAction,
        spritePrompt,
        animationMood
    };
}

function isSafeCssColor(val) {
    if (typeof val !== 'string') return false;
    const s = val.trim();
    if (!s || s.length > 64 || /url\s*\(|expression|javascript|;/i.test(s)) return false;
    return /^#[0-9a-f]{3,8}$/i.test(s) || /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(s);
}

function normalizeWorkIdentity(theme) {
    const raw = (theme && theme.workIdentity && typeof theme.workIdentity === 'object') ? theme.workIdentity : {};
    const str = (val, fallback, maxLen) => {
        const s = typeof val === 'string' ? val.trim() : '';
        return s ? s.slice(0, maxLen) : fallback;
    };
    const dp = (theme && theme.dynamicPack && typeof theme.dynamicPack === 'object') ? theme.dynamicPack : {};
    const dpUi = (dp.uiDesign && typeof dp.uiDesign === 'object') ? dp.uiDesign : {};
    const dpHud = (dpUi.hudWidget && typeof dpUi.hudWidget === 'object') ? dpUi.hudWidget : {};
    const pd = (theme && theme.petDirective && typeof theme.petDirective === 'object') ? theme.petDirective : {};

    const franchise = str(raw.franchise, (theme && theme.name) || dp.archetypeLabel || 'CUSTOM STUDIO', 40);
    const characterName = str(raw.characterName || raw.role, pd.petName || (theme && theme.name) || 'Companion', 40);
    const operator = str(raw.operator, 'SENSEI', 32);
    const bootTagline = str(raw.bootTagline || raw.tagline, dp.introSubtitle || (theme && theme.concept) || 'NEURAL INTERFACE SYNCED', 80);
    const secondary = isSafeCssColor(raw.secondary)
        ? raw.secondary.trim()
        : (isSafeCssColor(theme && theme.secondary) ? theme.secondary.trim() : '#f472b6');
    const cleanSigil = sanitizeSvgFragment(raw.sigilSvgInner, 2400);
    const hasSigilShape = /<(path|circle|ellipse|rect|polygon|polyline|line)\b/i.test(cleanSigil);
    const sigilSvgInner = hasSigilShape ? cleanSigil : DEFAULT_SIGIL_SVG_INNER;

    return {
        franchise,
        characterName,
        operator,
        bootTagline,
        secondary,
        sigilSvgInner,
        role: str(raw.role, characterName, 48),
        badge: str(raw.badge, dpHud.badge || franchise, 28).toUpperCase(),
        tagline: str(raw.tagline, bootTagline, 80),
        focusLabel: str(raw.focusLabel, dpHud.statusText || 'SYNC ACTIVE', 32).toUpperCase()
    };
}

function slugifyMediaName(name, fallback = 'theme') {
    const base = String(name || fallback)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32);
    return base || fallback;
}

function persistWallpaperToUserMedia(webpPath, nameHint) {
    if (!webpPath || !fs.existsSync(webpPath)) return '';
    try {
        const stat = fs.statSync(webpPath);
        if (!stat.isFile() || stat.size === 0) return '';
        fs.mkdirSync(USER_MEDIA_DIR, { recursive: true });
        const slug = `${slugifyMediaName(nameHint, 'wallpaper')}-${Date.now().toString(36).slice(-4)}`;
        const filename = `wp_${slug}.webp`;
        const destPath = path.join(USER_MEDIA_DIR, filename);
        fs.copyFileSync(webpPath, destPath);
        return `user_media/${filename}`;
    } catch (_) {
        return '';
    }
}

function designTheme(dataUrl, opts = {}) {
    const timeoutMs = opts.timeoutMs || 420000;
    const log = opts.log || (() => {});
    return new Promise((resolve, reject) => {
        const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(String(dataUrl || ''));
        if (!m) return reject(new Error('Invalid reference image'));
        const ext = MIME_EXT[m[1].toLowerCase()] || 'jpg';
        const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-theme-'));
        const imageFile = `reference.${ext}`;
        const absImagePath = path.join(jobDir, imageFile);
        const schemaFile = path.join(jobDir, 'schema.json');
        const cleanup = () => { try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch (_) {} };

        fs.writeFileSync(absImagePath, Buffer.from(m[2], 'base64'));
        const probed = probeImageDimensions(absImagePath);
        const srcW = (probed && probed.width) || Number(opts.width) || 0;
        const srcH = (probed && probed.height) || Number(opts.height) || 0;
        const needsAiPaint = true;

        fs.writeFileSync(schemaFile, JSON.stringify(buildSchema(needsAiPaint)));

        const prompt = buildPrompt(absImagePath, { srcW, srcH, needsAiPaint });
        const args = ['-p', prompt, '--mode', 'accept-edits', '--output-format', 'json', '--json-schema', schemaFile, '--disable-slash-commands', '--add-dir', jobDir];
        if (process.env.AGY_THEME_MODEL) args.push('--model', process.env.AGY_THEME_MODEL);
        const bin = findAgy();
        log(`Designing theme via ${bin} (job ${jobDir}, src=${srcW}x${srcH}, aiOutpaint=${needsAiPaint})`);
        let settled = false;
        const localFallback = (reason) => {
            if (settled) return false;
            settled = true;
            clearTimeout(timer);
            try {
                const outWebpPath = path.join(jobDir, 'wallpaper_4k.webp');
                let wallpaperDataUrl = '';
                try { wallpaperDataUrl = normalizeTo4k16x9Webp(absImagePath, outWebpPath, false); }
                catch (_) { wallpaperDataUrl = `data:image/jpeg;base64,${fs.readFileSync(absImagePath).toString('base64')}`; }
                const pal = extractPaletteViaPillow(absImagePath);
                const theme = buildLocalTheme(pal);
                log(`AI design unavailable (${reason}) — local palette fallback applied`);
                // normalizeTo4k16x9Webp writes a real 3840x2160 WebP when
                // Pillow is present; without Pillow it returns the original
                // image, so report the source size in that case.
                const is4k = fs.existsSync(outWebpPath);
                const wallpaperUrl = is4k ? persistWallpaperToUserMedia(outWebpPath, theme.name || 'local-palette') : '';
                resolve({
                    theme,
                    wallpaperDataUrl,
                    wallpaperUrl,
                    wpMeta: { width: is4k ? TARGET_W : (srcW || TARGET_W), height: is4k ? TARGET_H : (srcH || TARGET_H), aiOutpainted: false, wallpaperUrl },
                    petSpriteUrl: theme.petSpriteUrl || FALLBACK_SPRITE_URL,
                    petId: theme.petId || 'rocky',
                    petMeta: theme.petMeta || null
                });
                return true;
            } catch (fbErr) {
                reject(new Error(`AI design failed (${reason}) and local fallback failed: ${fbErr.message || fbErr}`));
                return true;
            } finally {
                cleanup();
            }
        };
        const child = spawn(bin, args, { cwd: jobDir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '', err = '';
        child.stdout.on('data', (d) => { out += d; });
        child.stderr.on('data', (d) => { err += d; });
        const timer = setTimeout(() => { try { child.kill(); } catch (_) {} }, timeoutMs);
        child.on('error', (e) => { localFallback(`Cannot run agy: ${e.message}`); });
        child.on('close', async (code) => {
            clearTimeout(timer);
            try {
                let env;
                try { env = JSON.parse(out.trim().split(/\r?\n/).filter(Boolean).pop()); } catch (_) {}
                if (!env) { localFallback(`agy gave no result (exit ${code})`); return; }
                if (env.status !== 'SUCCESS') { localFallback(env.error || `agy status ${env.status}`); return; }
                let theme = env.structured_output;
                if (!theme) { try { theme = JSON.parse(env.response); } catch (_) {} }
                if (!theme || typeof theme !== 'object') { localFallback('agy returned no structured theme'); return; }

                let chosenImagePath = resolveGeneratedImagePath(theme, env.response, jobDir, imageFile);
                if (needsAiPaint && !chosenImagePath) {
                    localFallback('AI image-generator did not produce a 16:9 image'); return;
                }
                if (!chosenImagePath) chosenImagePath = absImagePath;

                const outWebpPath = path.join(jobDir, 'wallpaper_4k.webp');
                const wallpaperDataUrl = normalizeTo4k16x9Webp(chosenImagePath, outWebpPath, needsAiPaint);
                delete theme.generatedImagePath;
                theme.dynamicPack = normalizeDynamicPack(theme);
                theme.vfxSpec = normalizeVfxSpec(theme);
                theme.petDirective = normalizePetDirective(theme);
                theme.workIdentity = normalizeWorkIdentity(theme);
                const wallpaperUrl = persistWallpaperToUserMedia(outWebpPath, theme.name || theme.workIdentity.franchise);

                let petRes;
                try {
                    petRes = await generatePetSprite(theme.petDirective, {
                        log,
                        timeoutMs: opts.petTimeoutMs || 180000,
                        slugHint: theme.petDirective.petName || theme.name,
                        sourceImagePath: absImagePath
                    });
                } catch (petErr) {
                    petRes = buildFallbackResult(theme.petDirective, petErr.message || 'pet-error');
                }
                theme.petSpriteUrl = petRes.petSpriteUrl;
                theme.petId = petRes.petId;
                theme.petMeta = petRes.petMeta;

                log(`Theme designed in ${env.duration_seconds}s (4K 16:9, aiOutpainted=${needsAiPaint}, wp=${wallpaperUrl || 'inline'}, pet=${theme.petSpriteUrl})`);
                settled = true;
                resolve({
                    theme,
                    wallpaperDataUrl,
                    wallpaperUrl,
                    wpMeta: { width: TARGET_W, height: TARGET_H, aiOutpainted: needsAiPaint, wallpaperUrl },
                    petSpriteUrl: theme.petSpriteUrl,
                    petId: theme.petId,
                    petMeta: theme.petMeta
                });
            } catch (procErr) {
                localFallback(procErr.message || String(procErr));
            } finally {
                cleanup();
            }
        });
    });
}

module.exports = {
    designTheme,
    normalizeDynamicPack,
    normalizeVfxSpec,
    normalizePetDirective,
    normalizeWorkIdentity,
    sanitizeSvgFragment,
    SCHEMA,
    buildSchema,
    WORK_IDENTITY_SCHEMA,
    ARCHETYPE_DEFAULTS,
    USER_MEDIA_DIR,
    buildLocalTheme,
    extractPaletteViaPillow
};

if (require.main === module) {
    const argv = process.argv.slice(2);
    let file = '';
    let outPath = '';
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--out' && argv[i + 1]) {
            outPath = path.resolve(argv[++i]);
        } else if (!file) {
            file = argv[i];
        }
    }
    if (!file) {
        console.error('Usage: node theme_designer.js <inputImage> [--out <previewOutWebp>]');
        process.exit(1);
    }
    const buf = fs.readFileSync(file);
    const ext = path.extname(file).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');
    designTheme(`data:${mime};base64,${buf.toString('base64')}`, { log: console.error })
        .then((res) => {
            if (outPath && res.wallpaperDataUrl) {
                const b64 = res.wallpaperDataUrl.split(',')[1] || '';
                fs.mkdirSync(path.dirname(outPath), { recursive: true });
                fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
                console.error(`Wrote 4K 16:9 wallpaper to ${outPath}`);
            }
            console.log(JSON.stringify({
                name: res.theme && res.theme.name,
                wpMeta: res.wpMeta,
                wallpaperKB: Math.round((res.wallpaperDataUrl || '').length * 0.75 / 1024),
                theme: res.theme
            }, null, 2));
        })
        .catch((e) => { console.error(e.message); process.exit(1); });
}
