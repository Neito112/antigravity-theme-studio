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
    generatedImagePath: STR
};

const BASE_REQUIRED = [
    'name', 'concept', 'primary', 'secondary', 'glow', 'secondaryGlow', 'bg', 'frameBg', 'textColor',
    'borderColor', 'innerBorder', 'overlayRgb', 'bgPosition', 'sidebarBg', 'sidebarHoverBg',
    'aiCardBg', 'aiCardBorder', 'headerBg', 'headerBorder', 'btnBg', 'inputGlassBg', 'inputCardBg',
    'modalBg', 'modalHeaderBg', 'cardBg', 'cardSelectedBg', 'isLight',
    'cornerSvgMarkup', 'stickerSvgMarkup'
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

module.exports = { designTheme, SCHEMA, buildSchema };

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
