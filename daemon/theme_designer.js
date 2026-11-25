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

const ROOT_DIR = path.resolve(__dirname, '..');
const THEMES_JSON = path.join(ROOT_DIR, 'themes', 'themes.json');

const TARGET_W = 3840;
const TARGET_H = 2160;
const TARGET_ASPECT = 16 / 9;

const STR = { type: 'string' };
const BOOL = { type: 'boolean' };
const NUM = { type: 'number' };

const FONT_VIBES = ['sans', 'mono', 'serif', 'display'];
const BORDER_STYLES = ['solid', 'double', 'dashed', 'glow-frame', 'chamfered'];
const PARTICLE_MOTIONS = ['fall', 'rise', 'float', 'orbit', 'pulse', 'drift'];
const SOUND_WAVEFORMS = ['sine', 'triangle', 'sawtooth', 'square'];

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
        uiDesign: { fontVibe: 'serif', cardRadiusPx: 12, borderStyle: 'double', accentGlowIntensity: 0.75 },
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
        uiDesign: { fontVibe: 'display', cardRadiusPx: 16, borderStyle: 'glow-frame', accentGlowIntensity: 0.8 },
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
        uiDesign: { fontVibe: 'mono', cardRadiusPx: 6, borderStyle: 'chamfered', accentGlowIntensity: 0.9 },
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
        uiDesign: { fontVibe: 'mono', cardRadiusPx: 4, borderStyle: 'chamfered', accentGlowIntensity: 0.95 },
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
        uiDesign: { fontVibe: 'sans', cardRadiusPx: 12, borderStyle: 'solid', accentGlowIntensity: 0.35 },
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
        uiDesign: { fontVibe: 'serif', cardRadiusPx: 18, borderStyle: 'solid', accentGlowIntensity: 0.45 },
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
        uiDesign: { fontVibe: 'mono', cardRadiusPx: 4, borderStyle: 'dashed', accentGlowIntensity: 0.85 },
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
        uiDesign: { fontVibe: 'display', cardRadiusPx: 14, borderStyle: 'glow-frame', accentGlowIntensity: 0.78 },
        particleShape: 'starlight',
        particleMotion: 'orbit',
        particleCount: 12,
        soundSynth: { waveform: 'sine', notes: [440, 523.25, 659.25, 987.77], noteStepMs: 90, decayMs: 340 },
        voicePitch: 1.0,
        voiceRate: 0.96
    }
};

const UI_DESIGN_SCHEMA = {
    type: 'object',
    properties: {
        fontVibe: { type: 'string', enum: FONT_VIBES },
        cardRadiusPx: NUM,
        borderStyle: { type: 'string', enum: BORDER_STYLES },
        accentGlowIntensity: NUM
    },
    required: ['fontVibe', 'cardRadiusPx', 'borderStyle', 'accentGlowIntensity']
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
    dynamicPack: DYNAMIC_PACK_SCHEMA,
    generatedImagePath: STR
};

const BASE_REQUIRED = [
    'name', 'concept', 'primary', 'secondary', 'glow', 'secondaryGlow', 'bg', 'frameBg', 'textColor',
    'borderColor', 'innerBorder', 'overlayRgb', 'bgPosition', 'sidebarBg', 'sidebarHoverBg',
    'aiCardBg', 'aiCardBorder', 'headerBg', 'headerBorder', 'btnBg', 'inputGlassBg', 'inputCardBg',
    'modalBg', 'modalHeaderBg', 'cardBg', 'cardSelectedBg', 'isLight',
    'cornerSvgMarkup', 'stickerSvgMarkup', 'dynamicPack'
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
        '  * `uiDesign`: `{ fontVibe: "sans"|"mono"|"serif"|"display", cardRadiusPx: number (4..22), borderStyle: "solid"|"double"|"dashed"|"glow-frame"|"chamfered", accentGlowIntensity: number (0.2..1.0) }` — pick typography, corner radius, border geometry, and glow intensity that match the image.',
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
    s = s.replace(/<\s*(script|foreignObject|style|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    s = s.replace(/<\s*(script|foreignObject|style|iframe|object|embed)\b[^>]*\/?\s*>/gi, '');
    const ALLOWED_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'g']);
    s = s.replace(/<\s*(\/?)\s*([a-zA-Z0-9:-]+)([^>]*)>/g, (_match, slash, tag, attrs) => {
        const lower = tag.toLowerCase();
        if (!ALLOWED_TAGS.has(lower)) return '';
        if (slash) return `</${lower}>`;
        const cleanAttrs = attrs
            .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
            .replace(/(href|xlink:href|src)\s*=\s*(?:"\s*(?:javascript|data):[^"]*"|'\s*(?:javascript|data):[^']*')/gi, '')
            .replace(/javascript\s*:/gi, '');
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
    const uiDesign = {
        fontVibe: pick(rawUi.fontVibe, FONT_VIBES, def.uiDesign.fontVibe),
        cardRadiusPx: clampNum(rawUi.cardRadiusPx, 4, 22, def.uiDesign.cardRadiusPx, true),
        borderStyle: pick(rawUi.borderStyle, BORDER_STYLES, def.uiDesign.borderStyle),
        accentGlowIntensity: clampNum(rawUi.accentGlowIntensity, 0.2, 1.0, def.uiDesign.accentGlowIntensity)
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
        const child = spawn(bin, args, { cwd: jobDir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '', err = '';
        child.stdout.on('data', (d) => { out += d; });
        child.stderr.on('data', (d) => { err += d; });
        const timer = setTimeout(() => { try { child.kill(); } catch (_) {} }, timeoutMs);
        child.on('error', (e) => { clearTimeout(timer); cleanup(); reject(new Error(`Cannot run agy: ${e.message}`)); });
        child.on('close', (code) => {
            clearTimeout(timer);
            try {
                let env;
                try { env = JSON.parse(out.trim().split(/\r?\n/).filter(Boolean).pop()); } catch (_) {}
                if (!env) return reject(new Error(`agy gave no result (exit ${code}). ${err.trim().slice(-300)}`));
                if (env.status !== 'SUCCESS') return reject(new Error(env.error || `agy status ${env.status}`));
                let theme = env.structured_output;
                if (!theme) { try { theme = JSON.parse(env.response); } catch (_) {} }
                if (!theme || typeof theme !== 'object') return reject(new Error('agy returned no structured theme'));

                let chosenImagePath = resolveGeneratedImagePath(theme, env.response, jobDir, imageFile);
                if (needsAiPaint && !chosenImagePath) {
                    return reject(new Error('AI image-generator did not produce a 16:9 image'));
                }
                if (!chosenImagePath) chosenImagePath = absImagePath;

                const outWebpPath = path.join(jobDir, 'wallpaper_4k.webp');
                const wallpaperDataUrl = normalizeTo4k16x9Webp(chosenImagePath, outWebpPath, needsAiPaint);
                delete theme.generatedImagePath;
                theme.dynamicPack = normalizeDynamicPack(theme);

                log(`Theme designed in ${env.duration_seconds}s (4K 16:9, aiOutpainted=${needsAiPaint})`);
                resolve({
                    theme,
                    wallpaperDataUrl,
                    wpMeta: { width: TARGET_W, height: TARGET_H, aiOutpainted: needsAiPaint }
                });
            } catch (procErr) {
                reject(procErr);
            } finally {
                cleanup();
            }
        });
    });
}

module.exports = { designTheme, normalizeDynamicPack, SCHEMA, buildSchema, ARCHETYPE_DEFAULTS };

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
