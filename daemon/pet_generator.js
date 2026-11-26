'use strict';

/**
 * Generates an 8x11 (1536x2288, 192x208 cell) transparent WebP companion pet
 * spritesheet matching the Neito112/desktop-agent_pet v2 contract.
 * Uses Antigravity CLI (`agy -p` + `image-generator` subagent) + Python Pillow
 * chroma-key removal, edge spill suppression, and 8x11 atlas validation.
 * Cleanly falls back to `assets/pets/rocky.webp` on any failure.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const USER_MEDIA_DIR = path.join(ROOT_DIR, 'themes', 'user_media');
const FALLBACK_SPRITE_URL = 'assets/pets/rocky.webp';

const ATLAS_COLS = 8;
const ATLAS_ROWS = 11;
const CELL_W = 192;
const CELL_H = 208;
const ATLAS_W = ATLAS_COLS * CELL_W; // 1536
const ATLAS_H = ATLAS_ROWS * CELL_H; // 2288
const LOGO_SIZE = 256;

function slugifyPetName(name) {
    const base = String(name || 'companion')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32);
    return base || 'companion';
}

function resolveSourceImagePath(rawPath) {
    if (typeof rawPath !== 'string' || !rawPath.trim()) return '';
    try {
        const resolved = path.resolve(rawPath.trim());
        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
            return resolved;
        }
    } catch (_) {}
    return '';
}

function findPython() {
    for (const cmd of process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python']) {
        const res = spawnSync(cmd, ['-c', 'import PIL; print(1)'], { windowsHide: true, encoding: 'utf8' });
        if (res.status === 0 && String(res.stdout).trim() === '1') return cmd;
    }
    return null;
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
    return 'agy';
}

function buildPetSpritePrompt(petDirective, rawSheetPath, sourceImagePath = '') {
    const d = petDirective && typeof petDirective === 'object' ? petDirective : {};
    const name = d.petName || 'Companion';
    const concept = d.personifiedConcept || 'Cute chibi pixel mascot';
    const prop = d.prop ? `holding or wearing a consistent ${d.prop}` : 'with a consistent small signature accessory';
    const style = d.style || 'pixel';
    const palette = Array.isArray(d.palette) && d.palette.length ? d.palette.join(', ') : '#7dd3fc, #f472b6, #1e1b4b';
    const action = d.signatureAction || 'cheerful wave';
    const customPrompt = d.spritePrompt ? `\nCharacter & pose specification: ${d.spritePrompt}` : '';
    const hasChar = Boolean(d.hasCharacter);
    const sourceObject = d.sourceObject || concept;

    const sourceInstructions = sourceImagePath ? [
        `SOURCE INPUT IMAGE ON DISK: "${sourceImagePath}"`,
        `1. First inspect "${sourceImagePath}" using \`read_file\` if needed, AND pass the exact reference image path "${sourceImagePath}" directly in your prompt to \`image-generator\` so the subagent looks directly at the original artwork.`,
        hasChar
            ? `2. CHARACTER SYNC MODE (hasCharacter: true): \`image-generator\` MUST closely match the actual character/creature in "${sourceImagePath}" — preserve their exact hairstyle/ears/horns, eye color, facial vibe, outfit/armor colors, silhouette, and signature prop (${prop}) while adapting them into a cute chibi/pixel 8x11 sprite sheet.`
            : `2. OBJECT PERSONIFICATION MODE (hasCharacter: false): \`image-generator\` MUST look directly at the prominent object ("${sourceObject}") in "${sourceImagePath}" and personify that exact object into a cohesive, expressive chibi/pixel mascot (${concept}, ${prop}) in the 8x11 sprite sheet, keeping the object's signature silhouette, colors, and materials.`,
        ''
    ] : [];

    return [
        `You are a pixel/chibi game sprite artist. Call \`invoke_subagent\` with \`TypeName: "image-generator"\` and \`Role: "2D Sprite Sheet Artist"\` to generate a single 8-column by 11-row sprite sheet PNG saved to "${rawSheetPath}".`,
        'Do not run shell commands (`run_command`), do not edit workspace source files.',
        '',
        ...sourceInstructions,
        'STRICT SPRITE SHEET LAYOUT (8 columns x 11 rows, aspect ratio 1536x2288 / 3:4.46, uniform grid, NO gridlines, NO labels, NO text):',
        `- Subject: "${name}" — ${concept}, ${prop}.`,
        `- Style: crisp ${style} mascot art, clean dark outline, readable silhouette at small sizes. Palette: ${palette}.${customPrompt}`,
        '- Background: SOLID FLAT CHROMA-KEY BRIGHT GREEN (#00FF00) with NO gradients, NO shadows on the floor, NO checkerboard, NO text, NO borders.',
        '- Every character frame must be centered inside its invisible grid cell with generous padding so adjacent cells never touch or clip.',
        '- Row 0 (cols 0-5): idle breathing/blinking loop (cols 6-7 empty green).',
        '- Row 1 (cols 0-7): running-right 8-frame cycle.',
        '- Row 2 (cols 0-7): running-left 8-frame cycle.',
        `- Row 3 (cols 0-3): waving / ${action} 4-frame loop (cols 4-7 empty green).`,
        '- Row 4 (cols 0-4): jumping 5-frame arc (cols 5-7 empty green).',
        '- Row 5 (cols 0-7): failed / deflated 8-frame reaction.',
        '- Row 6 (cols 0-5): waiting / expectant pose (cols 6-7 empty green).',
        '- Row 7 (cols 0-5): active working / typing / focused pose (cols 6-7 empty green).',
        '- Row 8 (cols 0-5): reviewing output pose (cols 6-7 empty green).',
        '- Row 9 (cols 0-7): 8 clockwise look poses (0° up through 157.5°).',
        '- Row 10 (cols 0-7): 8 clockwise look poses (180° down through 337.5°).',
        '',
        `Return ONLY JSON: {"generatedSheetPath": "${rawSheetPath}"}`
    ].join('\n');
}

/**
 * Uses Python Pillow to chroma-key #00FF00 (if opaque), suppress green edge spill,
 * normalize to exact 1536x2288 (8x11 of 192x208 cells), validate 8x11 grid occupancy,
 * and save as transparent WebP.
 */
function processAndValidateAtlas(inputPath, outWebpPath) {
    const py = findPython();
    if (!py) return { ok: false, reason: 'python-pil-missing' };

    const script = [
        'import json, math, sys',
        'from PIL import Image, ImageFilter',
        'in_path, out_path = sys.argv[1], sys.argv[2]',
        `COLS, ROWS, CELL_W, CELL_H = ${ATLAS_COLS}, ${ATLAS_ROWS}, ${CELL_W}, ${CELL_H}`,
        'TARGET_W, TARGET_H = COLS * CELL_W, ROWS * CELL_H',
        'im = Image.open(in_path).convert("RGBA")',
        'resample = getattr(getattr(Image, "Resampling", Image), "NEAREST", Image.NEAREST)',
        'if im.size != (TARGET_W, TARGET_H):',
        '    im = im.resize((TARGET_W, TARGET_H), resample)',
        'px = list(im.getdata())',
        'alpha_hist = im.getchannel("A").histogram()',
        'has_transparency = sum(alpha_hist[:250]) > (TARGET_W * TARGET_H * 0.15)',
        'if not has_transparency:',
        '    # Sample corner chroma key (expected #00FF00 or dominant border color)',
        '    corners = [px[0], px[TARGET_W - 1], px[(TARGET_H - 1) * TARGET_W], px[-1]]',
        '    kr = sum(c[0] for c in corners) / 4.0',
        '    kg = sum(c[1] for c in corners) / 4.0',
        '    kb = sum(c[2] for c in corners) / 4.0',
        '    cleaned = []',
        '    for r, g, b, a in px:',
        '        dist = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)',
        '        if dist < 52.0:',
        '            cleaned.append((0, 0, 0, 0))',
        '        elif dist < 86.0:',
        '            t = (dist - 52.0) / 34.0',
        '            na = int(round(a * t))',
        '            # Despill green channel on soft edge',
        '            ng = min(g, max(r, b) + 12) if kg > max(kr, kb) + 40 else g',
        '            cleaned.append((r, ng, b, na))',
        '        else:',
        '            cleaned.append((r, g, b, a))',
        '    im.putdata(cleaned)',
        'else:',
        '    # Zero RGB on fully transparent pixels',
        '    cleaned = [(0, 0, 0, 0) if a == 0 else (r, g, b, a) for (r, g, b, a) in px]',
        '    im.putdata(cleaned)',
        '',
        '# Edge-local green spill suppression along transparent boundary',
        'alpha = im.getchannel("A")',
        'visible = [v > 0 for v in alpha.getdata()]',
        'trans = Image.new("L", im.size)',
        'trans.putdata([0 if v else 255 for v in visible])',
        'expanded = trans.filter(ImageFilter.MaxFilter(5))',
        'rgba = list(im.getdata())',
        'despilled = []',
        'for (r, g, b, a), vis, near in zip(rgba, visible, expanded.getdata()):',
        '    if vis and near > 0 and g > max(r, b) + 18:',
        '        g = max(r, b) + 8',
        '    despilled.append((r, g, b, a))',
        'im.putdata(despilled)',
        '',
        '# Validate 8x11 grid: check transparency & key rows have visible sprite pixels',
        'used_rows = 0',
        'nonempty_cells = 0',
        'for row in range(ROWS):',
        '    row_used = False',
        '    for col in range(COLS):',
        '        cell = im.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H))',
        '        ca = cell.getchannel("A")',
        '        nz = sum(ca.histogram()[16:])',
        '        if nz >= 40:',
        '            nonempty_cells += 1',
        '            row_used = True',
        '    if row_used:',
        '        used_rows += 1',
        '',
        'alpha_total = sum(im.getchannel("A").histogram()[16:])',
        'transparent_total = sum(im.getchannel("A").histogram()[:16])',
        'if used_rows < 8 or nonempty_cells < 32 or transparent_total < (TARGET_W * TARGET_H * 0.25) or alpha_total < 2000:',
        '    print(json.dumps({"ok": False, "reason": f"invalid-grid(rows={used_rows},cells={nonempty_cells},alpha={alpha_total})"}))',
        '    sys.exit(0)',
        '',
        'im.save(out_path, format="WEBP", lossless=True, quality=90)',
        'print(json.dumps({"ok": True, "width": TARGET_W, "height": TARGET_H, "rows": used_rows, "cells": nonempty_cells}))'
    ].join('\n');

    const res = spawnSync(py, ['-c', script, inputPath, outWebpPath], {
        windowsHide: true,
        encoding: 'utf8',
        timeout: 45000
    });
    if (res.status !== 0) {
        return { ok: false, reason: String(res.stderr || res.stdout || 'pillow-error').trim().slice(0, 180) };
    }
    try {
        const parsed = JSON.parse(String(res.stdout || '').trim().split(/\r?\n/).pop() || '{}');
        return parsed && typeof parsed === 'object' ? parsed : { ok: false, reason: 'bad-validator-json' };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
}

function buildFallbackResult(petDirective, reason) {
    const d = petDirective && typeof petDirective === 'object' ? petDirective : {};
    return {
        petSpriteUrl: FALLBACK_SPRITE_URL,
        petId: 'rocky',
        petMeta: {
            petName: d.petName || 'Rocky',
            hasCharacter: Boolean(d.hasCharacter),
            sourceObject: d.sourceObject || '',
            personifiedConcept: d.personifiedConcept || 'Loyal desktop companion',
            style: d.style || 'pixel',
            palette: Array.isArray(d.palette) ? d.palette : [],
            idleMood: d.idleMood || 'calm-focus',
            prop: d.prop || '',
            signatureAction: d.signatureAction || 'wave',
            animationMood: d.animationMood || d.idleMood || 'calm-focus',
            spriteVersionNumber: 2,
            fallback: true,
            fallbackReason: reason || 'unavailable'
        }
    };
}

function buildBrandLogoPrompt(workIdentity, petDirective, rawLogoPath, sourceImagePath = '') {
    const wi = workIdentity && typeof workIdentity === 'object' ? workIdentity : {};
    const pd = petDirective && typeof petDirective === 'object' ? petDirective : {};
    const brandTitle = wi.brandTitle || wi.franchise || pd.petName || 'Custom Studio';
    const subject = wi.characterName || pd.sourceObject || pd.personifiedConcept || brandTitle;
    const palette = Array.isArray(pd.palette) && pd.palette.length
        ? pd.palette.join(', ')
        : (wi.secondary ? `${wi.secondary}, #f8fafc, #0f172a` : '#7dd3fc, #f472b6, #0f172a');
    const hasChar = Boolean(pd.hasCharacter);

    const sourceInstructions = sourceImagePath ? [
        `SOURCE INPUT IMAGE ON DISK: "${sourceImagePath}"`,
        `1. Inspect "${sourceImagePath}" using \`read_file\` if needed, AND pass the exact reference image path "${sourceImagePath}" directly in your prompt to \`image-generator\` so the subagent looks directly at the original artwork.`,
        hasChar
            ? `2. CHARACTER / CREATURE EMBLEM MODE: Extract the unmistakable silhouette, head/crest, horns/dorsal fins, headgear, or signature insignia of "${subject}" directly from "${sourceImagePath}" (for example: roaring Kaiju head & jagged dorsal fins, character's signature crest/hairpin/hat, or iconic mecha visor).`
            : `2. OBJECT / SCENE EMBLEM MODE: Extract the iconic central subject ("${subject}") directly from "${sourceImagePath}" and stylize it into a bold, recognizable emblem/logo mark faithful to its silhouette, materials, and colors.`,
        ''
    ] : [];

    return [
        `You are a senior game/app brand emblem designer. Call \`invoke_subagent\` with \`TypeName: "image-generator"\` and \`Role: "Brand Emblem & Icon Artist"\` to generate a single crisp 512x512 square brand logo/emblem PNG saved to "${rawLogoPath}".`,
        'Do not run shell commands (`run_command`), do not edit workspace source files.',
        '',
        ...sourceInstructions,
        'STRICT BRAND LOGO / EMBLEM SPECIFICATION (512x512 square, centered icon, replaces the default Antigravity app logo):',
        `- Brand / Theme: "${brandTitle}" — Subject motif: ${subject}.`,
        `- Visual style: ultra-crisp, iconic vector-grade crest / stylized emblem with bold clean silhouette, sharp edges, rich focal detail, readable both at 24x24 topbar icon size and 128x128 boot splash size. Palette: ${palette}.`,
        '- Background: SOLID FLAT CHROMA-KEY BRIGHT GREEN (#00FF00) edge-to-edge with NO gradients, NO drop shadows on the background, NO floor shadow, NO checkerboard, NO outer frame or box.',
        '- Leave ~10% clean solid #00FF00 breathing margin around the emblem so nothing clips at the borders.',
        '- STRICTLY FORBIDDEN: NO text, NO letters, NO words, NO "Antigravity" branding, NO generic unrelated star/circle/triangle placeholder, NO busy scenic background.',
        '',
        `Return ONLY JSON: {"generatedLogoPath": "${rawLogoPath}"}`
    ].join('\n');
}

/**
 * Uses Python Pillow to chroma-key #00FF00 (if opaque), suppress green edge spill,
 * auto-trim visible alpha bounds, center in a square canvas with 8% padding,
 * and resize with LANCZOS to crisp 256x256 transparent WebP.
 */
function processAndValidateLogo(inputPath, outWebpPath) {
    const py = findPython();
    if (!py) return { ok: false, reason: 'python-pil-missing' };

    const script = [
        'import json, math, sys',
        'from PIL import Image, ImageFilter',
        'in_path, out_path = sys.argv[1], sys.argv[2]',
        `TARGET = ${LOGO_SIZE}`,
        'im = Image.open(in_path).convert("RGBA")',
        'if max(im.size) > 1024:',
        '    resample_down = getattr(getattr(Image, "Resampling", Image), "LANCZOS", Image.LANCZOS)',
        '    im.thumbnail((1024, 1024), resample_down)',
        'w, h = im.size',
        'px = list(im.getdata())',
        'alpha_hist = im.getchannel("A").histogram()',
        'has_transparency = sum(alpha_hist[:250]) > (w * h * 0.12)',
        'if not has_transparency:',
        '    corners = [px[0], px[w - 1], px[(h - 1) * w], px[-1]]',
        '    kr = sum(c[0] for c in corners) / 4.0',
        '    kg = sum(c[1] for c in corners) / 4.0',
        '    kb = sum(c[2] for c in corners) / 4.0',
        '    cleaned = []',
        '    for r, g, b, a in px:',
        '        dist = math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)',
        '        if dist < 54.0:',
        '            cleaned.append((0, 0, 0, 0))',
        '        elif dist < 90.0:',
        '            t = (dist - 54.0) / 36.0',
        '            na = int(round(a * t))',
        '            ng = min(g, max(r, b) + 12) if kg > max(kr, kb) + 40 else g',
        '            cleaned.append((r, ng, b, na))',
        '        else:',
        '            cleaned.append((r, g, b, a))',
        '    im.putdata(cleaned)',
        'else:',
        '    cleaned = [(0, 0, 0, 0) if a == 0 else (r, g, b, a) for (r, g, b, a) in px]',
        '    im.putdata(cleaned)',
        '',
        'alpha = im.getchannel("A")',
        'visible = [v > 0 for v in alpha.getdata()]',
        'trans = Image.new("L", im.size)',
        'trans.putdata([0 if v else 255 for v in visible])',
        'expanded = trans.filter(ImageFilter.MaxFilter(5))',
        'rgba = list(im.getdata())',
        'despilled = []',
        'for (r, g, b, a), vis, near in zip(rgba, visible, expanded.getdata()):',
        '    if vis and near > 0 and g > max(r, b) + 18:',
        '        g = max(r, b) + 8',
        '    despilled.append((r, g, b, a))',
        'im.putdata(despilled)',
        '',
        'alpha_after = im.getchannel("A")',
        'alpha_total = sum(alpha_after.histogram()[16:])',
        'transparent_total = sum(alpha_after.histogram()[:16])',
        'bbox = alpha_after.getbbox()',
        'if not bbox or alpha_total < 250 or transparent_total < (w * h * 0.08):',
        '    print(json.dumps({"ok": False, "reason": f"invalid-logo(alpha={alpha_total},trans={transparent_total})"}))',
        '    sys.exit(0)',
        '',
        'trimmed = im.crop(bbox)',
        'tw, th = trimmed.size',
        'side = max(tw, th)',
        'pad = max(8, int(round(side * 0.08)))',
        'canvas_side = side + pad * 2',
        'square = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))',
        'square.paste(trimmed, ((canvas_side - tw) // 2, (canvas_side - th) // 2), trimmed)',
        'resample = getattr(getattr(Image, "Resampling", Image), "LANCZOS", Image.LANCZOS)',
        'out_im = square.resize((TARGET, TARGET), resample)',
        'out_im.save(out_path, format="WEBP", lossless=True, quality=92)',
        'print(json.dumps({"ok": True, "width": TARGET, "height": TARGET, "trimmed": [tw, th]}))'
    ].join('\n');

    const res = spawnSync(py, ['-c', script, inputPath, outWebpPath], {
        windowsHide: true,
        encoding: 'utf8',
        timeout: 45000
    });
    if (res.status !== 0) {
        return { ok: false, reason: String(res.stderr || res.stdout || 'pillow-error').trim().slice(0, 180) };
    }
    try {
        const parsed = JSON.parse(String(res.stdout || '').trim().split(/\r?\n/).pop() || '{}');
        return parsed && typeof parsed === 'object' ? parsed : { ok: false, reason: 'bad-logo-validator-json' };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
}

function buildLogoFallbackResult(workIdentity, reason) {
    const wi = workIdentity && typeof workIdentity === 'object' ? workIdentity : {};
    return {
        brandLogoUrl: '',
        logoId: '',
        logoMeta: {
            brandTitle: wi.brandTitle || wi.franchise || '',
            franchise: wi.franchise || '',
            fallback: true,
            fallbackReason: reason || 'unavailable'
        }
    };
}

/**
 * Shared runner for agy -p + image-generator jobs (pet spritesheets and brand logos).
 * Resolves `{ ok: true, candidatePath, cleanup }` or `{ ok: false, reason }`.
 */
function runAgyImageJob({ prefix, schemaObj, outputKey, prompt, rawOutPath, sourceImagePath, timeoutMs }) {
    const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    const schemaFile = path.join(jobDir, 'schema.json');
    const cleanup = () => { try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch (_) {} };
    const absRawOut = path.isAbsolute(rawOutPath) ? rawOutPath : path.join(jobDir, rawOutPath);

    fs.writeFileSync(schemaFile, JSON.stringify(schemaObj));

    const args = ['-p', prompt(absRawOut), '--mode', 'accept-edits', '--output-format', 'json', '--json-schema', schemaFile, '--disable-slash-commands', '--add-dir', jobDir];
    if (sourceImagePath) {
        const sourceDir = path.dirname(sourceImagePath);
        if (path.resolve(sourceDir) !== path.resolve(jobDir)) {
            args.push('--add-dir', sourceDir);
        }
    }
    if (process.env.AGY_THEME_MODEL) args.push('--model', process.env.AGY_THEME_MODEL);
    const bin = findAgy();

    return new Promise((resolve) => {
        let settled = false;
        const finishErr = (reason) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            cleanup();
            resolve({ ok: false, reason });
        };

        let child;
        try {
            child = spawn(bin, args, { cwd: jobDir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        } catch (err) {
            finishErr(`spawn-error: ${err.message}`);
            return;
        }

        let out = '';
        child.stdout.on('data', (chunk) => { out += chunk; });
        const timer = setTimeout(() => {
            try { child.kill(); } catch (_) {}
            finishErr('timeout');
        }, timeoutMs);

        child.on('error', (err) => finishErr(`agy-error: ${err.message}`));
        child.on('close', (code) => {
            if (settled) return;
            clearTimeout(timer);
            try {
                let env;
                try { env = JSON.parse(out.trim().split(/\r?\n/).filter(Boolean).pop()); } catch (_) {}
                let candidatePath = absRawOut;
                if (env && env.structured_output && typeof env.structured_output[outputKey] === 'string') {
                    const p = env.structured_output[outputKey].trim();
                    if (p && fs.existsSync(p)) candidatePath = p;
                }
                if (!fs.existsSync(candidatePath)) {
                    const files = fs.readdirSync(jobDir).filter((f) => /\.(png|webp|jpe?g)$/i.test(f));
                    if (files.length) candidatePath = path.join(jobDir, files[0]);
                }
                if (!fs.existsSync(candidatePath)) {
                    finishErr(`no-image-generated(exit=${code})`);
                    return;
                }
                settled = true;
                resolve({ ok: true, candidatePath, cleanup });
            } catch (err) {
                finishErr(err.message || 'agy-image-job-exception');
            }
        });
    });
}

/**
 * Generates an 8x11 pet spritesheet for `petDirective` and saves it to
 * `themes/user_media/pet_<slug>.webp`. Never rejects — falls back cleanly to
 * `assets/pets/rocky.webp` if generation or validation fails.
 *
 * @param {object} petDirective
 * @param {{timeoutMs?: number, log?: Function, slugHint?: string, sourceImagePath?: string}} opts
 * @returns {Promise<{petSpriteUrl: string, petId: string, petMeta: object}>}
 */
async function generatePetSprite(petDirective, opts = {}) {
    const log = opts.log || (() => {});
    const timeoutMs = opts.timeoutMs || 180000;
    const d = petDirective && typeof petDirective === 'object' ? petDirective : {};

    if (process.env.AGY_DISABLE_PET_GEN === '1') {
        return buildFallbackResult(d, 'disabled-by-env');
    }
    if (!findPython()) {
        log('Pet generator: Python Pillow unavailable, using fallback rocky.webp');
        return buildFallbackResult(d, 'python-pil-missing');
    }

    const sourceImagePath = resolveSourceImagePath(opts.sourceImagePath);
    const slug = slugifyPetName(opts.slugHint || d.petName || 'companion');
    const uniqueSlug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const job = await runAgyImageJob({
        prefix: 'agy-pet-',
        schemaObj: {
            type: 'object',
            properties: { generatedSheetPath: { type: 'string' } },
            required: ['generatedSheetPath']
        },
        outputKey: 'generatedSheetPath',
        rawOutPath: 'raw_sheet.png',
        sourceImagePath,
        timeoutMs,
        prompt: (rawSheetPath) => buildPetSpritePrompt(d, rawSheetPath, sourceImagePath)
    });

    if (!job.ok) {
        log(`Pet generator fallback (${job.reason}) -> ${FALLBACK_SPRITE_URL}`);
        return buildFallbackResult(d, job.reason);
    }

    try {
        fs.mkdirSync(USER_MEDIA_DIR, { recursive: true });
        const outFilename = `pet_${uniqueSlug}.webp`;
        const outWebpPath = path.join(USER_MEDIA_DIR, outFilename);
        const val = processAndValidateAtlas(job.candidatePath, outWebpPath);
        if (!val.ok || !fs.existsSync(outWebpPath)) {
            try { if (fs.existsSync(outWebpPath)) fs.unlinkSync(outWebpPath); } catch (_) {}
            const reason = val.reason || 'atlas-validation-failed';
            log(`Pet generator fallback (${reason}) -> ${FALLBACK_SPRITE_URL}`);
            return buildFallbackResult(d, reason);
        }

        log(`Pet spritesheet generated: ${outFilename} (${val.rows}x8 grid, ${val.cells} cells)`);
        return {
            petSpriteUrl: `user_media/${outFilename}`,
            petId: uniqueSlug,
            petMeta: {
                petName: d.petName || 'Companion',
                hasCharacter: Boolean(d.hasCharacter),
                sourceObject: d.sourceObject || '',
                personifiedConcept: d.personifiedConcept || '',
                style: d.style || 'pixel',
                palette: Array.isArray(d.palette) ? d.palette : [],
                idleMood: d.idleMood || 'calm-focus',
                prop: d.prop || '',
                signatureAction: d.signatureAction || 'wave',
                animationMood: d.animationMood || d.idleMood || 'calm-focus',
                sourceImageUsed: Boolean(sourceImagePath),
                spriteVersionNumber: 2,
                fallback: false
            }
        };
    } catch (err) {
        const reason = err.message || 'pet-gen-exception';
        log(`Pet generator fallback (${reason}) -> ${FALLBACK_SPRITE_URL}`);
        return buildFallbackResult(d, reason);
    } finally {
        job.cleanup();
    }
}

/**
 * Generates a 256x256 transparent WebP brand logo/emblem derived directly from
 * `opts.sourceImagePath` + `workIdentity` + `petDirective`, saved to
 * `themes/user_media/logo_<slug>.webp`. Never rejects — returns `brandLogoUrl: ''` on failure.
 *
 * @param {object} workIdentity
 * @param {object} petDirective
 * @param {{timeoutMs?: number, log?: Function, slugHint?: string, sourceImagePath?: string}} opts
 * @returns {Promise<{brandLogoUrl: string, logoId: string, logoMeta: object}>}
 */
async function generateBrandLogo(workIdentity, petDirective, opts = {}) {
    const log = opts.log || (() => {});
    const timeoutMs = opts.timeoutMs || 180000;
    const wi = workIdentity && typeof workIdentity === 'object' ? workIdentity : {};
    const pd = petDirective && typeof petDirective === 'object' ? petDirective : {};

    if (process.env.AGY_DISABLE_LOGO_GEN === '1' || process.env.AGY_DISABLE_PET_GEN === '1') {
        return buildLogoFallbackResult(wi, 'disabled-by-env');
    }
    if (!findPython()) {
        log('Brand logo generator: Python Pillow unavailable, skipping custom logo');
        return buildLogoFallbackResult(wi, 'python-pil-missing');
    }

    const sourceImagePath = resolveSourceImagePath(opts.sourceImagePath);
    const slug = slugifyPetName(opts.slugHint || wi.brandTitle || wi.franchise || pd.petName || 'brand');
    const uniqueSlug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const job = await runAgyImageJob({
        prefix: 'agy-logo-',
        schemaObj: {
            type: 'object',
            properties: { generatedLogoPath: { type: 'string' } },
            required: ['generatedLogoPath']
        },
        outputKey: 'generatedLogoPath',
        rawOutPath: 'raw_logo.png',
        sourceImagePath,
        timeoutMs,
        prompt: (rawLogoPath) => buildBrandLogoPrompt(wi, pd, rawLogoPath, sourceImagePath)
    });

    if (!job.ok) {
        log(`Brand logo generator fallback (${job.reason}) -> ''`);
        return buildLogoFallbackResult(wi, job.reason);
    }

    try {
        fs.mkdirSync(USER_MEDIA_DIR, { recursive: true });
        const outFilename = `logo_${uniqueSlug}.webp`;
        const outWebpPath = path.join(USER_MEDIA_DIR, outFilename);
        const val = processAndValidateLogo(job.candidatePath, outWebpPath);
        if (!val.ok || !fs.existsSync(outWebpPath)) {
            try { if (fs.existsSync(outWebpPath)) fs.unlinkSync(outWebpPath); } catch (_) {}
            const reason = val.reason || 'logo-validation-failed';
            log(`Brand logo generator fallback (${reason}) -> ''`);
            return buildLogoFallbackResult(wi, reason);
        }

        log(`Brand logo generated: ${outFilename} (${val.width}x${val.height})`);
        return {
            brandLogoUrl: `user_media/${outFilename}`,
            logoId: uniqueSlug,
            logoMeta: {
                brandTitle: wi.brandTitle || wi.franchise || '',
                franchise: wi.franchise || '',
                sourceImageUsed: Boolean(sourceImagePath),
                width: val.width || LOGO_SIZE,
                height: val.height || LOGO_SIZE,
                fallback: false
            }
        };
    } catch (err) {
        const reason = err.message || 'logo-gen-exception';
        log(`Brand logo generator fallback (${reason}) -> ''`);
        return buildLogoFallbackResult(wi, reason);
    } finally {
        job.cleanup();
    }
}

module.exports = {
    generatePetSprite,
    generateBrandLogo,
    buildPetSpritePrompt,
    buildBrandLogoPrompt,
    processAndValidateAtlas,
    processAndValidateLogo,
    buildFallbackResult,
    buildLogoFallbackResult,
    slugifyPetName,
    USER_MEDIA_DIR,
    FALLBACK_SPRITE_URL,
    ATLAS_COLS,
    ATLAS_ROWS,
    CELL_W,
    CELL_H,
    ATLAS_W,
    ATLAS_H,
    LOGO_SIZE
};
