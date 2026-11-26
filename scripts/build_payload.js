#!/usr/bin/env node
'use strict';

/**
 * Pure Node.js (>= 22) compiler: themes/themes.json + engine/core.js -> dist/theme_payload.js.
 * Keeps assets/... and user_media/... as relative paths for Lazy HTTP Media Server
 * instead of inlining large .mp4/.mp3/.webp/.jpg files into theme_payload.js.
 */

const fs = require('fs');
const path = require('path');

const ASSET_KEYS = ['wallpaper', 'wallpaperVideo', 'posterUrl', 'sticker', 'cornerSvg', 'userAvatar', 'agentAvatar'];
const PLACEHOLDER = '/*__THEMES_PLACEHOLDER__*/{}';
const BOOT_ASSETS_PLACEHOLDER = '/*__BOOT_ASSETS_PLACEHOLDER__*/{}';
const BUILD_VER_PLACEHOLDER = '/*__BUILD_VER_PLACEHOLDER__*/"dev"';

const DEFAULT_BOOT_ASSETS = {
    starfieldBg: 'assets/starfield-boot-bg.jpg',
    agyColorIcon: 'assets/agy-icon-color.png',
    voice1: 'assets/voice/tawa_voice1.mp3',
    voice2: 'assets/voice/tawa_voice2.mp3',
    voice3: 'assets/voice/tawa_voice3.mp3',
    voice4: 'assets/voice/tawa_voice4.mp3',
    greetingFontVi: 'assets/fonts/mali-500-vi.woff2',
    greetingFontLatinExt: 'assets/fonts/mali-500-latin-ext.woff2',
    greetingFontLatin: 'assets/fonts/mali-500-latin.woff2',
};

const MIME_MAP = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
};

function encodeSvg(svgPath) {
    const svgText = fs.readFileSync(svgPath, 'utf8');
    return 'data:image/svg+xml,' + encodeURIComponent(svgText);
}

function encodeRaster(imgPath) {
    const ext = path.extname(imgPath).toLowerCase();
    const mime = MIME_MAP[ext] || 'image/png';
    const raw = fs.readFileSync(imgPath);
    return `data:${mime};base64,${raw.toString('base64')}`;
}

function resolveAssetValue(value, themesDir, repoRoot) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (
        !trimmed ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://')
    ) {
        return trimmed;
    }

    const cleanRel = trimmed.replace(/^\.\//, '').replace(/^\/+/, '');
    if (cleanRel.startsWith('assets/') || cleanRel.startsWith('user_media/')) {
        const repoAssetPath = path.resolve(themesDir, cleanRel);
        if (path.extname(repoAssetPath).toLowerCase() === '.svg' && fs.existsSync(repoAssetPath) && fs.statSync(repoAssetPath).isFile()) {
            return encodeSvg(repoAssetPath);
        }
        return cleanRel;
    }

    const assetPath = path.isAbsolute(trimmed)
        ? trimmed
        : path.resolve(themesDir, trimmed);

    if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
        throw new Error(`Theme asset not found: ${trimmed} (resolved: ${assetPath})`);
    }

    if (path.extname(assetPath).toLowerCase() === '.svg') {
        return encodeSvg(assetPath);
    }
    return encodeRaster(assetPath);
}

function buildPayload(themesPath, enginePath, outPath) {
    if (!fs.existsSync(themesPath)) {
        throw new Error(`themes.json not found: ${themesPath}`);
    }
    if (!fs.existsSync(enginePath)) {
        throw new Error(`core.js not found: ${enginePath}`);
    }

    const themesRaw = JSON.parse(fs.readFileSync(themesPath, 'utf8'));
    if (!themesRaw || typeof themesRaw !== 'object' || Array.isArray(themesRaw) || Object.keys(themesRaw).length === 0) {
        throw new Error('themes.json must be a non-empty JSON object keyed by theme name.');
    }

    const themesDir = path.dirname(themesPath);
    const repoRoot = path.resolve(themesDir, '..');
    const resolvedThemes = {};
    for (const [name, cfg] of Object.entries(themesRaw)) {
        if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
            throw new Error(`Theme '${name}' must be a JSON object.`);
        }
        const copied = { ...cfg };
        for (const key of ASSET_KEYS) {
            if (Object.prototype.hasOwnProperty.call(copied, key)) {
                copied[key] = resolveAssetValue(copied[key], themesDir, repoRoot);
            }
        }
        resolvedThemes[name] = copied;
    }

    const engineSrc = fs.readFileSync(enginePath, 'utf8');
    const parts = engineSrc.split(PLACEHOLDER);
    if (parts.length !== 2) {
        throw new Error(`Expected exactly 1 '${PLACEHOLDER}' placeholder in ${enginePath}, found ${parts.length - 1}.`);
    }

    let compiled = parts[0] + JSON.stringify(resolvedThemes) + parts[1];
    if (compiled.includes(BOOT_ASSETS_PLACEHOLDER)) {
        compiled = compiled.split(BOOT_ASSETS_PLACEHOLDER).join(JSON.stringify(DEFAULT_BOOT_ASSETS));
    }
    if (compiled.includes(BUILD_VER_PLACEHOLDER)) {
        compiled = compiled.split(BUILD_VER_PLACEHOLDER).join(JSON.stringify(String(Date.now())));
    }

    const bootPath = path.join(path.dirname(enginePath), 'boot.js');
    if (fs.existsSync(bootPath)) {
        const bootSrc = fs.readFileSync(bootPath, 'utf8').trimEnd();
        compiled = [
            bootSrc + ';',
            'try {',
            compiled,
            '} catch (__agyEarlyInitErr) {',
            '  if (typeof document !== "undefined" && document.body) throw __agyEarlyInitErr;',
            '} finally {',
            '  if (typeof window !== "undefined" && typeof window.__AGY_LAZY_BOOT__ === "function") {',
            '    window.__AGY_LOADED_MODS__ = window.__AGY_LOADED_MODS__ || {};',
            '    window.__AGY_LOADED_MODS__.boot = true;',
            '  }',
            '}',
        ].join('\n');
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, compiled, 'utf8');

    const sizeKb = fs.statSync(outPath).size / 1024;
    const names = Object.keys(resolvedThemes);
    console.log(`[build_payload] Built ${outPath} (${sizeKb.toFixed(1)} KB) with ${names.length} theme(s): ${names.join(', ')}`);
}

function parseArgs(argv) {
    const repoRoot = path.resolve(__dirname, '..');
    const opts = {
        themes: path.join(repoRoot, 'themes', 'themes.json'),
        engine: path.join(repoRoot, 'engine', 'core.js'),
        out: path.join(repoRoot, 'dist', 'theme_payload.js'),
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--themes' && argv[i + 1]) opts.themes = path.resolve(argv[++i]);
        else if (arg === '--engine' && argv[i + 1]) opts.engine = path.resolve(argv[++i]);
        else if (arg === '--out' && argv[i + 1]) opts.out = path.resolve(argv[++i]);
    }
    return opts;
}

if (require.main === module) {
    try {
        const opts = parseArgs(process.argv.slice(2));
        buildPayload(opts.themes, opts.engine, opts.out);
    } catch (err) {
        console.error(`[build_payload] Error: ${err.message}`);
        process.exit(1);
    }
}

module.exports = { buildPayload };
